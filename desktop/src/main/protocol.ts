import { net, protocol } from 'electron'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { log } from './log'

export const APP_ORIGIN = 'app://clipfarm'

/**
 * The renderer's Content Security Policy. Everything is bundled, so scripts,
 * styles, fonts and workers come from the app itself; `connect-src 'self'`
 * holds because the account API and the pipeline are reached through the
 * same-origin proxies below. WebAssembly (MediaPipe, ONNX Runtime) needs
 * 'wasm-unsafe-eval'; inline styles are needed for motion's style attributes.
 * Images may be https (YouTube/Twitch thumbnails and avatars from the API).
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com https://player.twitch.tv https://clips.twitch.tv',
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.tflite': 'application/octet-stream',
  '.onnx': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
}

export type ProxyHooks = {
  siteOrigin: () => string
  /** The desktop session token, or null when signed out. */
  accountToken: () => string | null
  /** Called when the Worker says the token is no longer valid. */
  onAccountUnauthorized: () => void
  /** Called after each account API answer, so the app knows it is online. */
  onAccountReachable: (reachable: boolean) => void
  pipelinePort: () => number | null
  pipelineToken: () => string
  /** Folder the web Whisper weights are served from (/models/web/...). */
  webModelsDir: () => string
}

/** Must run before app 'ready'. */
export function registerScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
  ])
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

/** Headers the renderer may pass through. Cookies and auth never come from the page. */
const FORWARD_HEADERS = ['content-type', 'accept', 'range', 'if-none-match', 'if-modified-since', 'x-pair-secret', 'last-event-id']

function forwardHeaders(request: Request) {
  const headers = new Headers()
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  return headers
}

function withBody(request: Request, headers: Headers): RequestInit {
  const method = request.method.toUpperCase()
  const init: RequestInit & { duplex?: 'half' } = { method, headers, redirect: 'manual' }
  if (method !== 'GET' && method !== 'HEAD' && request.body) {
    init.body = request.body
    init.duplex = 'half'
  }
  return init
}

async function proxyAccount(request: Request, url: URL, hooks: ProxyHooks) {
  const target = `${hooks.siteOrigin()}${url.pathname}${url.search}`
  const headers = forwardHeaders(request)
  const token = hooks.accountToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await net.fetch(target, { ...withBody(request, headers), bypassCustomProtocolHandlers: true } as RequestInit)
  } catch (error) {
    hooks.onAccountReachable(false)
    log('proxy: account API unreachable', String(error))
    return json(503, { error: 'You appear to be offline. Check your connection and try again.', offline: true })
  }
  hooks.onAccountReachable(true)
  if (response.status === 401 && token) hooks.onAccountUnauthorized()
  const out = new Headers(response.headers)
  out.delete('set-cookie')
  out.set('cache-control', 'no-store')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: out })
}

async function proxyPipeline(request: Request, url: URL, hooks: ProxyHooks) {
  const port = hooks.pipelinePort()
  if (!port) return json(503, { detail: 'The pipeline is starting. Try again in a moment.' })
  const target = `http://127.0.0.1:${port}${url.pathname.replace(/^\/pipeline-api/, '') || '/'}${url.search}`
  const headers = forwardHeaders(request)
  headers.set('authorization', `Bearer ${hooks.pipelineToken()}`)
  try {
    const response = await net.fetch(target, withBody(request, headers))
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers })
  } catch (error) {
    log('proxy: pipeline unreachable', String(error))
    return json(503, { detail: 'The pipeline stopped answering. It restarts automatically; try again in a moment.' })
  }
}

async function serveFile(root: string, relative: string, request: Request, fallbackToIndex: boolean) {
  const decoded = decodeURIComponent(relative)
  const file = path.resolve(root, `.${decoded}`)
  if (!file.startsWith(path.resolve(root) + path.sep)) return json(403, { error: 'Forbidden' })
  let target = file
  if (!existsSync(target) || statSync(target).isDirectory()) {
    if (!fallbackToIndex || path.extname(decoded)) return new Response('Not found', { status: 404 })
    target = path.join(root, 'desktop.html')
  }
  const response = await net.fetch(pathToFileURL(target).toString(), { headers: request.headers.get('range') ? { range: request.headers.get('range')! } : undefined })
  const headers = new Headers(response.headers)
  const ext = path.extname(target).toLowerCase()
  headers.set('content-type', MIME[ext] ?? 'application/octet-stream')
  headers.set('x-content-type-options', 'nosniff')
  if (ext === '.html') {
    headers.set('content-security-policy', CSP)
    headers.set('cache-control', 'no-store')
  }
  return new Response(response.body, { status: response.status, headers })
}

export function handleProtocol(rendererRoot: string, hooks: ProxyHooks) {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url)
    if (url.host !== 'clipfarm') return json(404, { error: 'Not found' })
    if (url.pathname.startsWith('/api/')) return proxyAccount(request, url, hooks)
    if (url.pathname.startsWith('/pipeline-api/') || url.pathname === '/pipeline-api') return proxyPipeline(request, url, hooks)
    if (url.pathname.startsWith('/models/web/')) return serveFile(hooks.webModelsDir(), url.pathname.replace(/^\/models\/web/, ''), request, false)
    return serveFile(rendererRoot, url.pathname === '/' ? '/desktop.html' : url.pathname, request, true)
  })
}
