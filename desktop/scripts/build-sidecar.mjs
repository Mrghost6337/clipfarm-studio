// Builds the self-contained pipeline runtime that ships inside the app:
//
//   desktop/build/sidecar/
//     python/      a Python 3.12+ runtime with the pinned packages
//     app/pipeline the pipeline source (no tests, no data)
//     bin/         ffmpeg, ffprobe (with libass) and deno
//     models/      YuNet face model
//     fonts/       caption fonts (OFL)
//     licenses/    third-party licences
//     manifest.json  size + SHA-256 of every file, checked on first run
//
// Windows (CI):  node scripts/build-sidecar.mjs --python-home "$env:pythonLocation"
// Linux (dev):   node scripts/build-sidecar.mjs --python /usr/bin/python3 --tools ../.tools
//
// The Windows runtime is a copy of an official CPython install (relocatable on
// Windows). The Linux build is for local testing of the packaged layout only.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const desktop = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.resolve(desktop, '..')
const out = path.join(desktop, 'build', 'sidecar')
const win = process.platform === 'win32'
const exe = win ? '.exe' : ''

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1]]] : pairs), []),
)

const URLS = {
  ffmpeg: win
    ? 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip'
    : 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz',
  deno: win
    ? 'https://github.com/denoland/deno/releases/download/v2.5.6/deno-x86_64-pc-windows-msvc.zip'
    : 'https://github.com/denoland/deno/releases/download/v2.5.6/deno-x86_64-unknown-linux-gnu.zip',
  yunet: 'https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx',
}
const YUNET_SHA256 = '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4'

const log = (message) => console.log(`[sidecar] ${message}`)
const run = (cmd, argv, opts = {}) => execFileSync(cmd, argv, { stdio: 'inherit', ...opts })

async function download(url, file) {
  log(`downloading ${url}`)
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`download failed ${response.status} ${url}`)
  writeFileSync(file, Buffer.from(await response.arrayBuffer()))
  return file
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(file)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

function walk(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

function findSitePackages(pyDir) {
  const found = walk(pyDir).find((file) => /[\\/]site-packages[\\/]fastapi[\\/]__init__\.py$/.test(file))
  if (!found) throw new Error('site-packages not found')
  return path.dirname(path.dirname(found))
}

function findFile(dir, name) {
  return walk(dir).find((file) => path.basename(file).toLowerCase() === name.toLowerCase())
}

function extract(archive, dest, python) {
  mkdirSync(dest, { recursive: true })
  if (archive.endsWith('.zip')) run(python, ['-c', 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', archive, dest])
  else run('tar', ['-xJf', archive, '-C', dest])
}

async function main() {
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const work = path.join(tmpdir(), `clipfarm-sidecar-${Date.now()}`)
  mkdirSync(work, { recursive: true })

  // 1. Python runtime
  const pyDir = path.join(out, 'python')
  let python
  if (win) {
    const home = args['python-home']
    if (!home || !existsSync(path.join(home, 'python.exe'))) throw new Error('--python-home must point at a CPython install (folder with python.exe)')
    log(`copying CPython from ${home}`)
    cpSync(home, pyDir, { recursive: true, filter: (src) => !/[\\/](__pycache__|test|tests|idlelib|tkinter|turtledemo)([\\/]|$)/i.test(src.slice(home.length)) })
    python = path.join(pyDir, 'python.exe')
  } else {
    const base = args.python || 'python3'
    log(`creating a venv with copies from ${base} (local layout test only)`)
    run(base, ['-m', 'venv', '--copies', pyDir])
    python = path.join(pyDir, 'bin', 'python3')
  }
  run(python, ['-m', 'pip', 'install', '--disable-pip-version-check', '--no-cache-dir', '--no-warn-script-location', '-r', path.join(desktop, 'requirements-desktop.txt')])
  // Trim: only the YouTube API description is used (publish.py), and the
  // managed runtime never installs packages, so pip goes too.
  const site = findSitePackages(pyDir)
  const docs = path.join(site, 'googleapiclient', 'discovery_cache', 'documents')
  if (existsSync(docs)) for (const name of readdirSync(docs)) if (name !== 'youtube.v3.json') rmSync(path.join(docs, name), { force: true })
  for (const name of readdirSync(site)) if (/^pip(-|$)/.test(name)) rmSync(path.join(site, name), { recursive: true, force: true })
  run(python, ['-c', 'import fastapi, uvicorn, faster_whisper, cv2, yt_dlp, numpy, googleapiclient.discovery; print("runtime imports ok")'])

  // 2. Pipeline source
  log('copying pipeline source')
  cpSync(path.join(repo, 'pipeline'), path.join(out, 'app', 'pipeline'), {
    recursive: true,
    filter: (src) => !/[\\/](tests|data|__pycache__)([\\/]|$)/.test(path.relative(repo, src)) && !src.endsWith('.pyc'),
  })

  // 3. Tools
  const bin = path.join(out, 'bin')
  mkdirSync(bin, { recursive: true })
  if (args.tools) {
    for (const name of ['ffmpeg', 'ffprobe', 'deno']) cpSync(path.join(args.tools, `${name}${exe}`), path.join(bin, `${name}${exe}`))
  } else {
    const ff = await download(URLS.ffmpeg, path.join(work, path.basename(URLS.ffmpeg)))
    extract(ff, path.join(work, 'ffmpeg'), python)
    // The shared build: ffmpeg.exe and ffprobe.exe use the same DLLs, about half the size.
    const ffBin = path.dirname(findFile(path.join(work, 'ffmpeg'), `ffmpeg${exe}`))
    for (const name of readdirSync(ffBin)) {
      if (name === `ffmpeg${exe}` || name === `ffprobe${exe}` || name.toLowerCase().endsWith('.dll') || name.endsWith('.so') || /\.so\./.test(name)) cpSync(path.join(ffBin, name), path.join(bin, name))
    }
    const licence = findFile(path.join(work, 'ffmpeg'), 'LICENSE.txt')
    if (licence) cpSync(licence, path.join(out, 'licenses', 'ffmpeg-LICENSE.txt'))
    const deno = await download(URLS.deno, path.join(work, 'deno.zip'))
    extract(deno, path.join(work, 'deno'), python)
    cpSync(findFile(path.join(work, 'deno'), `deno${exe}`), path.join(bin, `deno${exe}`))
  }
  const filters = execFileSync(path.join(bin, `ffmpeg${exe}`), ['-hide_banner', '-filters']).toString()
  if (!/\sass\s/.test(filters)) throw new Error('the bundled ffmpeg has no libass')
  const ffVersion = execFileSync(path.join(bin, `ffmpeg${exe}`), ['-version']).toString().split('\n')[0]
  log(ffVersion)

  // 4. Face model
  const models = path.join(out, 'models')
  mkdirSync(models, { recursive: true })
  const yunet = path.join(models, 'face_detection_yunet_2023mar.onnx')
  const local = path.join(repo, 'models', 'face_detection_yunet_2023mar.onnx')
  if (existsSync(local) && (await sha256(local)) === YUNET_SHA256) cpSync(local, yunet)
  else await download(URLS.yunet, yunet)
  if ((await sha256(yunet)) !== YUNET_SHA256) throw new Error('YuNet model hash mismatch')

  // 5. Fonts
  cpSync(path.join(repo, 'assets', 'fonts'), path.join(out, 'fonts'), { recursive: true, filter: (src) => statSync(src).isDirectory() || src.endsWith('.ttf') })

  // 6. Licences
  const licences = path.join(out, 'licenses')
  mkdirSync(licences, { recursive: true })
  const pyLicence = findFile(pyDir, 'LICENSE.txt')
  if (pyLicence) cpSync(pyLicence, path.join(licences, 'python-LICENSE.txt'))
  writeFileSync(
    path.join(licences, 'THIRD-PARTY.txt'),
    [
      'Third-party software in the Clipfarm Studio pipeline runtime',
      '',
      `FFmpeg (${ffVersion}) — GPL v3 build from https://github.com/BtbN/FFmpeg-Builds.`,
      '  Corresponding source: https://github.com/FFmpeg/FFmpeg and the build scripts at https://github.com/BtbN/FFmpeg-Builds.',
      'Deno 2.5.6 — MIT, https://github.com/denoland/deno',
      'CPython — Python Software Foundation License (python-LICENSE.txt)',
      'YuNet face detection model — MIT, https://github.com/opencv/opencv_zoo',
      'Caption fonts Anton, Bebas Neue, Noto Sans — SIL Open Font License 1.1',
      `Python packages — see python/ site-packages *.dist-info/LICENSE files: ${readFileSync(path.join(desktop, 'requirements-desktop.txt'), 'utf8').split('\n').filter((line) => line && !line.startsWith('#')).join(', ')}`,
      '',
    ].join('\n'),
  )

  // 7. Manifest
  log('hashing files')
  const files = []
  for (const file of walk(out)) {
    const relative = path.relative(out, file).split(path.sep).join('/')
    if (relative === 'manifest.json' || relative.endsWith('.pyc') || relative.includes('__pycache__')) continue
    files.push({ path: relative, size: statSync(file).size, sha256: await sha256(file) })
  }
  const version = JSON.parse(readFileSync(path.join(desktop, 'package.json'), 'utf8')).version
  writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ version, files }, null, 0))
  const total = files.reduce((sum, file) => sum + file.size, 0)
  log(`done: ${files.length} files, ${(total / 1024 / 1024).toFixed(0)} MB`)
  rmSync(work, { recursive: true, force: true })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
