import { spawn } from 'child_process'
import { StringDecoder } from 'string_decoder'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync
} from 'fs'
import { tmpdir, homedir } from 'os'
import { join } from 'path'
import https from 'https'
import { BrowserWindow } from 'electron'
import { getNativeEnv, findNodeExe, findNpmCli } from './path-utils'

type ProgressCallback = (msg: string) => void

interface RunError extends Error {
  lines?: string[]
}

const sendProgress = (win: BrowserWindow, msg: string): void => {
  win.webContents.send('install:progress', msg)
}

const downloadFile = (url: string, dest: string, maxRedirects = 5): Promise<void> =>
  new Promise((resolve, reject) => {
    let redirectCount = 0
    const follow = (u: string): void => {
      https
        .get(u, (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.resume()
            if (++redirectCount > maxRedirects) {
              reject(new Error('Too many redirects'))
              return
            }
            follow(res.headers.location)
            return
          }
          if (!res.statusCode || res.statusCode >= 400) {
            res.resume()
            reject(new Error(`HTTP ${res.statusCode}`))
            return
          }
          const file = createWriteStream(dest)
          res.pipe(file)
          file.on('finish', () => {
            file.close()
            resolve()
          })
          file.on('error', reject)
        })
        .on('error', reject)
    }
    follow(url)
  })

const runWithLog = (
  cmd: string,
  args: string[],
  onLog: ProgressCallback,
  options?: { shell?: boolean; env?: NodeJS.ProcessEnv; cwd?: string }
): Promise<string[]> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: options?.shell ?? false,
      env: options?.env ?? process.env,
      cwd: options?.cwd
    })

    const lines: string[] = []
    const outDecoder = new StringDecoder('utf8')
    const errDecoder = new StringDecoder('utf8')
    child.stdout.on('data', (d) => {
      outDecoder
        .write(d)
        .split('\n')
        .filter(Boolean)
        .forEach((l) => {
          onLog(l)
          lines.push(l)
        })
    })
    child.stderr.on('data', (d) => {
      errDecoder
        .write(d)
        .split('\n')
        .filter(Boolean)
        .forEach((l) => {
          onLog(l)
          lines.push(l)
        })
    })
    child.on('close', (code) => {
      if (code === 0) resolve(lines)
      else {
        const err: RunError = new Error(`Command failed: ${cmd} ${args.join(' ')} (exit ${code})`)
        err.lines = lines
        reject(err)
      }
    })
    child.on('error', reject)
  })

export const installNodeNative = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)
  const url = 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi'
  const dest = join(tmpdir(), 'node-installer.msi')

  log('Node.js 22 다운로드 중...')
  await downloadFile(url, dest)
  log('Node.js 설치 중...')
  await runWithLog('msiexec', ['/i', dest, '/passive', '/norestart'], log, { shell: true })
  // MSI가 PATH를 추가하지만 현재 프로세스에는 미반영 → 직접 추가
  const nodePath = 'C:\\Program Files\\nodejs'
  const npmGlobalBin = join(process.env.APPDATA ?? '', 'npm')
  for (const dir of [nodePath, npmGlobalBin]) {
    if (dir && !process.env.PATH?.includes(dir)) {
      process.env.PATH = `${dir};${process.env.PATH}`
    }
  }
  log('Node.js 설치 완료!')
}

const logNpmDebug = (log: ProgressCallback): void => {
  try {
    const logsDir = join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_logs')
    if (!existsSync(logsDir)) return
    const files = readdirSync(logsDir).sort().reverse()
    const latest = files.find((f) => f.endsWith('-debug-0.log'))
    if (!latest) return
    const allLines = readFileSync(join(logsDir, latest), 'utf-8').split('\n')
    // 마지막 ENOENT 발생 지점 전후 15줄 캡처 (verbose path/dest/syscall 포함)
    let lastIdx = -1
    for (let i = allLines.length - 1; i >= 0; i--) {
      if (/\benoent\b/i.test(allLines[i])) {
        lastIdx = i
        break
      }
    }
    if (lastIdx === -1) return
    const start = Math.max(0, lastIdx - 15)
    const end = Math.min(allLines.length, lastIdx + 3)
    allLines
      .slice(start, end)
      .filter((l) => l.trim())
      .forEach((l) => log(`[npm] ${l.trim()}`))
  } catch {
    /* ignore */
  }
}

/** openclaw package.json의 bin 엔트리를 읽어 .cmd shim을 수동 생성 */
const createOpenclawShim = (
  pkgDir: string,
  shimDir: string,
  nodeExe: string,
  log: ProgressCallback
): void => {
  try {
    const pkgPath = join(pkgDir, 'package.json')
    if (!existsSync(pkgPath)) return
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const binMap: Record<string, string> =
      typeof pkg.bin === 'string' ? { [pkg.name]: pkg.bin } : (pkg.bin ?? {})
    if (!existsSync(shimDir)) mkdirSync(shimDir, { recursive: true })
    for (const [name, relPath] of Object.entries(binMap)) {
      const entryAbs = join(pkgDir, relPath)
      writeFileSync(join(shimDir, `${name}.cmd`), `@"${nodeExe}" "${entryAbs}" %*\r\n`)
    }
    log('[진단] openclaw.cmd shim 수동 생성 완료')
  } catch (e) {
    log(`[진단] shim 생성 실패: ${(e as Error).message}`)
  }
}

/** npm 레지스트리에서 패키지 메타데이터(버전, tarball URL) 가져오기 */
const fetchPackageMeta = (
  pkg: string,
  version?: string
): Promise<{ version: string; tarball: string }> =>
  new Promise((resolve, reject) => {
    const url = version
      ? `https://registry.npmjs.org/${pkg}/${version}`
      : `https://registry.npmjs.org/${pkg}/latest`
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`npm registry HTTP ${res.statusCode}`))
          return
        }
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            resolve({ version: json.version, tarball: json.dist.tarball })
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })

/** Git이 없으면 MinGit(경량 Git) 자동 설치 — openclaw 의존성 중 git 호스팅 패키지가 있음 */
const ensureGitAvailable = async (log: ProgressCallback): Promise<void> => {
  const gitOk = await new Promise<boolean>((resolve) => {
    const child = spawn('git', ['--version'], { shell: true, env: getNativeEnv() })
    child.on('close', (code) => resolve(code === 0))
    child.on('error', () => resolve(false))
  })
  if (gitOk) return

  const mingitDir = join(homedir(), '.openclaw', 'mingit')
  const mingitCmd = join(mingitDir, 'cmd')

  // 이전에 이미 설치한 MinGit이 있으면 PATH에 추가만
  if (existsSync(join(mingitCmd, 'git.exe'))) {
    if (!process.env.PATH?.includes(mingitCmd)) {
      process.env.PATH = `${mingitCmd};${process.env.PATH}`
    }
    return
  }

  log('Git 설치 중 (openclaw 의존성에 필요)...')

  // GitHub API로 최신 MinGit 다운로드 URL 조회
  const url = await new Promise<string>((resolve, reject) => {
    https
      .get(
        'https://api.github.com/repos/git-for-windows/git/releases/latest',
        { headers: { 'User-Agent': 'EasyClaw' } },
        (res) => {
          let data = ''
          res.on('data', (chunk) => (data += chunk))
          res.on('end', () => {
            try {
              const json = JSON.parse(data)
              const asset = json.assets?.find(
                (a: { name: string }) =>
                  a.name.startsWith('MinGit-') && a.name.endsWith('-64-bit.zip')
              )
              if (asset?.browser_download_url) resolve(asset.browser_download_url)
              else reject(new Error('MinGit asset not found'))
            } catch (e) {
              reject(e)
            }
          })
        }
      )
      .on('error', reject)
  })

  const zipPath = join(tmpdir(), 'mingit.zip')
  log('MinGit 다운로드 중...')
  await downloadFile(url, zipPath)

  log('MinGit 추출 중...')
  mkdirSync(mingitDir, { recursive: true })
  await runWithLog(
    'powershell',
    ['-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${mingitDir}' -Force`],
    log,
    { shell: true }
  )

  if (!process.env.PATH?.includes(mingitCmd)) {
    process.env.PATH = `${mingitCmd};${process.env.PATH}`
  }
  log('Git 설치 완료!')
}

export const installOpenClawNative = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)
  log('OpenClaw 설치 중...')

  const nodeExe = findNodeExe()
  const npmCli = findNpmCli()
  log(`[진단] node.exe: ${nodeExe ?? 'not found'}`)
  log(`[진단] npm-cli.js: ${npmCli ?? 'not found'}`)

  if (!nodeExe || !npmCli) {
    throw new Error(
      'Node.js 설치를 찾을 수 없습니다. Node.js가 올바르게 설치되었는지 확인해 주세요.'
    )
  }

  // Git이 없으면 MinGit 자동 설치 (openclaw 의존성 중 git URL 패키지가 있음)
  await ensureGitAvailable(log)

  const npmGlobalDir = join(process.env.APPDATA ?? '', 'npm')
  for (const dir of [npmGlobalDir, join(npmGlobalDir, 'node_modules')]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
  if (!process.env.PATH?.includes(npmGlobalDir)) {
    process.env.PATH = `${npmGlobalDir};${process.env.PATH}`
  }

  // npm 캐시 정리 (손상된 캐시가 ENOENT 원인일 수 있음)
  log('[진단] npm 캐시 정리 중...')
  try {
    await runWithLog(nodeExe, [npmCli, 'cache', 'clean', '--force'], log, {
      shell: false,
      env: getNativeEnv()
    })
  } catch {
    /* ignore */
  }

  // 짧은 캐시/임시 경로 (Windows 260자 경로 제한 + 안티바이러스 파일 잠금 우회)
  const shortCache = join(homedir(), '.oc-nc')
  const shortTmp = join(homedir(), '.oc-tmp')
  mkdirSync(shortCache, { recursive: true })
  mkdirSync(shortTmp, { recursive: true })

  // 1차: npm install -g (짧은 캐시/TMP 적용)
  try {
    const gEnv = getNativeEnv({
      npm_config_prefix: npmGlobalDir,
      TMP: shortTmp,
      TEMP: shortTmp
    })
    await runWithLog(
      nodeExe,
      [
        npmCli,
        'install',
        '-g',
        '--no-bin-links',
        '--ignore-scripts',
        '--cache',
        shortCache,
        'openclaw@2026.2.21'
      ],
      log,
      { shell: false, env: gEnv, cwd: homedir() }
    )
    createOpenclawShim(join(npmGlobalDir, 'node_modules', 'openclaw'), npmGlobalDir, nodeExe, log)
    log('OpenClaw 설치 완료!')
    return
  } catch {
    logNpmDebug(log)
    log('npm 설치 실패, 직접 다운로드로 전환...')
  }

  // 2차: npm 우회 — tarball 직접 다운로드 + tar 추출
  const meta = await fetchPackageMeta('openclaw', '2026.2.21')
  log(`OpenClaw v${meta.version} 직접 다운로드 중...`)

  const cliDir = join(homedir(), '.openclaw', 'cli')
  const openclawDir = join(cliDir, 'node_modules', 'openclaw')
  if (!existsSync(cliDir)) mkdirSync(cliDir, { recursive: true })
  const pkgJson = join(cliDir, 'package.json')
  if (!existsSync(pkgJson)) writeFileSync(pkgJson, '{"private":true}')

  if (existsSync(openclawDir)) rmSync(openclawDir, { recursive: true, force: true })
  mkdirSync(openclawDir, { recursive: true })

  const tarball = join(tmpdir(), `openclaw-${meta.version}.tgz`)
  await downloadFile(meta.tarball, tarball)

  log('패키지 추출 중...')
  await runWithLog('tar', ['-xzf', tarball, '-C', openclawDir, '--strip-components=1'], log, {
    shell: true,
    env: getNativeEnv()
  })

  // 의존성이 번들되지 않은 경우에만 npm install 실행
  const depsExist = existsSync(join(openclawDir, 'node_modules'))
  if (!depsExist) {
    log('의존성 설치 중...')
    const depsEnv = getNativeEnv({ TMP: shortTmp, TEMP: shortTmp })
    try {
      await runWithLog(
        nodeExe,
        [
          npmCli,
          'install',
          '--production',
          '--no-bin-links',
          '--ignore-scripts',
          '--cache',
          shortCache
        ],
        log,
        { shell: false, env: depsEnv, cwd: openclawDir }
      )
    } catch {
      logNpmDebug(log)
      throw new Error('OpenClaw 의존성 설치에 실패했습니다.')
    }
  }

  // .cmd shim 수동 생성
  const binDir = join(cliDir, 'node_modules', '.bin')
  createOpenclawShim(openclawDir, binDir, nodeExe, log)
  if (!process.env.PATH?.includes(binDir)) {
    process.env.PATH = `${binDir};${process.env.PATH}`
  }

  log('OpenClaw 설치 완료!')
}

export const installNodeMac = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)
  const url = `https://nodejs.org/dist/v22.14.0/node-v22.14.0.pkg`
  const dest = join(tmpdir(), 'node-installer.pkg')

  log('Node.js 22 다운로드 중...')
  await downloadFile(url, dest)
  log('Node.js 설치 창을 열고 있습니다...')
  await runWithLog('open', ['-W', dest], log)
  log('Node.js 설치 완료!')
}

const getPathEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    process.env.NVM_BIN ?? '',
    `${process.env.HOME}/.volta/bin`,
    `${process.env.HOME}/.npm-global/bin`,
    process.env.PATH ?? ''
  ]
    .filter(Boolean)
    .join(':')
})

const isXcodeCliInstalled = (): Promise<boolean> =>
  new Promise((resolve) => {
    const child = spawn('xcode-select', ['-p'])
    child.on('close', (code) => resolve(code === 0))
    child.on('error', () => resolve(false))
  })

const ensureXcodeCli = async (log: ProgressCallback): Promise<void> => {
  if (await isXcodeCliInstalled()) return

  log('Xcode Command Line Tools 설치 창을 열고 있습니다...')
  spawn('xcode-select', ['--install'])

  log('설치 팝업에서 "설치"를 눌러 주세요. 완료될 때까지 기다립니다...')
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    if (await isXcodeCliInstalled()) {
      log('Xcode Command Line Tools 설치 완료!')
      return
    }
  }
  throw new Error(
    'Xcode Command Line Tools 설치 시간 초과. 터미널에서 xcode-select --install을 실행해 주세요.'
  )
}

export const installOpenClaw = async (win: BrowserWindow): Promise<void> => {
  const log = (msg: string): void => sendProgress(win, msg)
  log('OpenClaw 설치 중...')

  // macOS: Xcode Command Line Tools 필요 — 없으면 설치 팝업 띄움
  await ensureXcodeCli(log)
  // macOS: ~/.npm 권한 문제 방지 — sudo npm 이력이 있으면 소유권 복원
  const npmCacheDir = join(homedir(), '.npm')
  if (existsSync(npmCacheDir)) {
    const uid = process.getuid?.() ?? 501
    const gid = process.getgid?.() ?? 20
    await runWithLog('chown', ['-R', `${uid}:${gid}`, npmCacheDir], log).catch(() => {})
  }
  // macOS: /usr/local 권한 문제 방지 — npm prefix를 사용자 홈으로 변경
  const npmGlobalDir = join(homedir(), '.npm-global')
  if (!existsSync(npmGlobalDir)) mkdirSync(npmGlobalDir, { recursive: true })
  await runWithLog('npm', ['config', 'set', 'prefix', npmGlobalDir], log, {
    shell: true,
    env: getPathEnv()
  })
  await runWithLog('npm', ['install', '-g', 'openclaw@2026.2.21'], log, {
    shell: true,
    env: getPathEnv()
  })

  log('OpenClaw 설치 완료!')
}
