/**
 * Desktop application boot for `dsh desktop`.
 * @module @deepseek-ai/dsh/desktop-boot
 */

import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'

/** Options for {@link runDesktop}. */
export interface RunDesktopOptions {
  /** The profile name to run with desktop. */
  profile: string
  /** `--patch` overlay paths, in argv order. */
  patchFiles: readonly string[]
  /** Arguments forwarded to the electron application. */
  args: readonly string[]
}

/**
 * Boot the Electron desktop application.
 * @param options - Profile name, patch overlays, and forwarded electron arguments.
 */
export async function runDesktop(options: RunDesktopOptions): Promise<void> {
  const cliDir = fileURLToPath(new URL('..', import.meta.url))
  const repositoryRoot = resolve(cliDir, '..', '..')
  const appRoot = join(repositoryRoot, 'apps', 'desktop')
  const hostDir = join(repositoryRoot, 'apps', 'desktop-host')
  const buildRoot = join(appRoot, '.desktop-build')
  const developmentRoot = join(buildRoot, 'development')

  let electron: string | undefined
  try {
    const req = createRequire(join(appRoot, 'package.json'))
    const el = req('electron') as unknown
    if (typeof el === 'string') electron = el
  } catch {}

  if (electron === undefined) {
    throw new Error('dsh desktop: electron executable is unavailable; run pnpm install')
  }

  const home = resolve(process.env.DSH_HOME ?? resolveDshHome())
  const userData = join(developmentRoot, 'electron-user-data')
  const projectDir = join(developmentRoot, 'project')

  // Prepare development project if in development mode
  const devProjectModule = pathToFileURL(join(appRoot, 'scripts', 'development-project.ts')).href
  const hostProtocolModule = pathToFileURL(join(appRoot, 'src', 'host-protocol.ts')).href
  const { prepareDevelopmentProject } = await import(devProjectModule)
  const { DESKTOP_HOST_PROTOCOL_VERSION } = await import(hostProtocolModule)
  const manifest = JSON.parse(readFileSync(join(appRoot, 'package.json'), 'utf8')) as { version?: string }
  const pnpmManifest = JSON.parse(readFileSync(join(appRoot, 'node_modules', 'pnpm', 'package.json'), 'utf8')) as { version?: string }

  prepareDevelopmentProject({
    projectDir,
    cliDir,
    hostDir,
    dependencyDir: join(repositoryRoot, 'node_modules', '.pnpm', 'node_modules'),
    release: {
      schemaVersion: 1,
      version: manifest.version ?? '0.1.3-alpha.2',
      hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
      nodeVersion: process.versions.node,
      pnpmVersion: pnpmManifest.version ?? '11.7.0',
    },
  })

  const hostPort = process.env.DSH_DESKTOP_HOST_INSPECT_PORT ?? '9230'
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    DSH_HOME: home,
    DSH_DESKTOP_PROFILE: options.profile,
    DSH_DESKTOP_DEV_PROJECT_DIR: projectDir,
    DSH_DESKTOP_HOST_INSPECT_PORT: hostPort,
    DSH_DESKTOP_NODE_BINARY: process.execPath,
    ELECTRON_ENABLE_LOGGING: process.env.ELECTRON_ENABLE_LOGGING ?? '1',
  }

  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(electron!, [
      `--user-data-dir=${userData}`,
      appRoot,
      ...options.args,
    ], {
      cwd: appRoot,
      env: environment,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0 || code === null) resolvePromise()
      else process.exitCode = code
    })
  })
}
