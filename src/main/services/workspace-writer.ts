import { platform, homedir } from 'os'
import { join } from 'path'
import { mkdirSync, writeFileSync } from 'fs'
import { runInWsl, writeWslFile } from './wsl-utils'

interface AgentConfig {
  userName: string
  useCase: string
  agentName: string
  agentEmoji: string
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'Unknown'
  }
}

function generateSoulMd(config: AgentConfig): string {
  return `# SOUL.md - Who You Are

Be genuinely helpful, not performatively helpful.
Have opinions. Be resourceful before asking.
Earn trust through competence.

## Your Human
- Name: ${config.userName}
- Primary use: ${config.useCase}

## Vibe
Be the assistant you'd actually want to talk to.
Concise when needed, thorough when it matters.

_This file is yours to evolve._
`
}

function generateUserMd(config: AgentConfig): string {
  return `# USER.md - About Your Human

- **Name:** ${config.userName}
- **Primary use:** ${config.useCase}
- **Timezone:** ${getTimezone()}
`
}

function generateIdentityMd(config: AgentConfig): string {
  return `# IDENTITY.md

- **Name:** ${config.agentName}
- **Role:** AI Assistant
- **Emoji:** ${config.agentEmoji}
`
}

export async function writeWorkspaceFiles(
  config: AgentConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const isWin = platform() === 'win32'

    if (isWin) {
      const wsDir = '/root/.openclaw/workspace'
      await runInWsl(`mkdir -p '${wsDir}'`)
      await writeWslFile(join(wsDir, 'SOUL.md'), generateSoulMd(config))
      await writeWslFile(join(wsDir, 'USER.md'), generateUserMd(config))
      await writeWslFile(join(wsDir, 'IDENTITY.md'), generateIdentityMd(config))
    } else {
      const wsDir = join(homedir(), '.openclaw', 'workspace')
      mkdirSync(wsDir, { recursive: true })
      writeFileSync(join(wsDir, 'SOUL.md'), generateSoulMd(config))
      writeFileSync(join(wsDir, 'USER.md'), generateUserMd(config))
      writeFileSync(join(wsDir, 'IDENTITY.md'), generateIdentityMd(config))
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}
