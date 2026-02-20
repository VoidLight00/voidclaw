import { existsSync } from 'fs'
import { platform } from 'os'
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

export const findBin = (name: string): string => {
  if (platform() === 'win32') return name
  for (const dir of PATH_DIRS) {
    const p = join(dir, name)
    if (existsSync(p)) return p
  }
  return name
}
