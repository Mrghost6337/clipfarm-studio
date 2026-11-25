import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

/**
 * Where the app keeps its data. On Windows: %LOCALAPPDATA%\Clipfarm, never the
 * install folder. `CLIPFARM_DATA_DIR` overrides it (tests use a temp folder).
 */
export function dataRoot() {
  if (process.env.CLIPFARM_DATA_DIR) return path.resolve(process.env.CLIPFARM_DATA_DIR)
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local'), 'Clipfarm')
  if (process.platform === 'darwin') return path.join(homedir(), 'Library', 'Application Support', 'Clipfarm')
  return path.join(process.env.XDG_DATA_HOME || path.join(homedir(), '.local', 'share'), 'Clipfarm')
}

export type Dirs = ReturnType<typeof makeDirs>

function makeDirs(root: string) {
  return {
    root,
    /** Chromium profile (cookies are never used for the account; tokens live in vault/). */
    profile: path.join(root, 'app'),
    pipeline: path.join(root, 'pipeline'),
    models: path.join(root, 'models'),
    fonts: path.join(root, 'fonts'),
    logs: path.join(root, 'logs'),
    secrets: path.join(root, 'secrets'),
    vault: path.join(root, 'vault'),
    downloads: path.join(root, 'downloads'),
    state: path.join(root, 'state.json'),
  }
}

let dirs: Dirs | null = null

/** Must run before app 'ready' so Chromium uses the same folder. */
export function configurePaths(): Dirs {
  const root = dataRoot()
  dirs = makeDirs(root)
  for (const folder of [dirs.root, dirs.profile, dirs.logs]) mkdirSync(folder, { recursive: true })
  app.setPath('userData', dirs.profile)
  app.setAppLogsPath(dirs.logs)
  return dirs
}

export function getDirs(): Dirs {
  if (!dirs) throw new Error('configurePaths() has not run')
  return dirs
}

/**
 * The app folder (desktop/ in development, resources/app.asar when packaged).
 * Never use __dirname: the bundler bakes in the build machine's path.
 */
export const appRoot = () => app.getAppPath()

/** Repository root when running from source (desktop/ → repo). */
export const repoRoot = () => path.resolve(appRoot(), '..')

/** The bundled pipeline runtime: packaged under resources/sidecar, or the repo in development. */
export function sidecarLayout() {
  const win = process.platform === 'win32'
  if (app.isPackaged) {
    const root = path.join(process.resourcesPath, 'sidecar')
    return {
      root,
      python: win ? path.join(root, 'python', 'python.exe') : path.join(root, 'python', 'bin', 'python3'),
      cwd: path.join(root, 'app'),
      bin: path.join(root, 'bin'),
      fonts: path.join(root, 'fonts'),
      faceModel: path.join(root, 'models', 'face_detection_yunet_2023mar.onnx'),
      manifest: path.join(root, 'manifest.json'),
    }
  }
  const repo = repoRoot()
  const venvPython = win ? path.join(repo, '.venv', 'Scripts', 'python.exe') : path.join(repo, '.venv', 'bin', 'python')
  return {
    root: repo,
    python: process.env.CLIPFARM_PYTHON || venvPython,
    cwd: repo,
    bin: path.join(repo, '.tools'),
    fonts: path.join(repo, 'assets', 'fonts'),
    faceModel: path.join(repo, 'models', 'face_detection_yunet_2023mar.onnx'),
    manifest: path.join(repo, 'desktop', 'build', 'sidecar-manifest.json'),
  }
}

/** The renderer build served on app://clipfarm. */
export function rendererRoot() {
  return path.join(appRoot(), 'dist', 'renderer')
}
