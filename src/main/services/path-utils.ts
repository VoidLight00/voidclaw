import { existsSync } from 'fs'
import { platform, homedir } from 'os'
import { join } from 'path'

export const PATH_DIRS = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  process.env.NVM_BIN ?? '',
  `${process.env.HOME}/.volta/bin`,
  `${process.env.HOME}/.npm-global/bin`
].filter(Boolean)

export const getPathEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: [...PATH_DIRS, process.env.PATH ?? ''].join(':')
})

export const decodeWslOutput = (buf: Buffer): string => {
  // UTF-16 LE: ASCII 문자 뒤에 null 바이트(0x00)가 존재
  if (buf.length >= 2 && buf.includes(0)) {
    return buf.toString('utf16le').replace(/\0/g, '').trim()
  }
  // UTF-8 또는 시스템 코드페이지
  return buf.toString('utf8').trim()
}

/** Windows 네이티브 모드용 PATH 확장 (로컬 cli bin + npm 글로벌 bin + Node.js 포함) */
export const getNativeEnv = (extra?: Record<string, string>): NodeJS.ProcessEnv => {
  const localCliBin = join(homedir(), '.openclaw', 'cli', 'node_modules', '.bin')
  const npmGlobalBin = join(process.env.APPDATA ?? '', 'npm')
  const nodePath = 'C:\\Program Files\\nodejs'
  const dirs = [localCliBin, npmGlobalBin, nodePath, process.env.PATH ?? ''].filter(Boolean)
  return { ...process.env, PATH: dirs.join(';'), ...extra }
}

export const findBin = (name: string): string => {
  if (platform() === 'win32') return name
  for (const dir of PATH_DIRS) {
    const p = join(dir, name)
    if (existsSync(p)) return p
  }
  return name
}
