# OpenAI OAuth (Codex) Authentication Support

## Summary

Add OAuth login option for OpenAI ChatGPT Plus/Pro subscribers in VoidClaw, allowing them to use OpenClaw without a separate API key.

## Background

- OpenAI Codex supports OAuth 2.0 PKCE flow for ChatGPT subscribers
- OpenClaw already supports `--auth-choice openai-codex` CLI flag
- VoidClaw currently only supports API key input for OpenAI

## Design

### Approach: Auth Method Toggle in OpenAI Tab

When user selects OpenAI provider in `ApiKeyGuideStep`, show a toggle:

- **ChatGPT Login (OAuth)** — for Plus/Pro subscribers
- **API Key** — existing flow

OAuth selection switches model list to Codex-specific models (`openai-codex/*` prefix).

### Data Model Changes

```typescript
// providers.ts
type AuthMethod = 'api-key' | 'oauth'

interface ProviderConfig {
  id: Provider
  label: string
  placeholder: string
  pattern: RegExp
  models: ModelOption[]
  oauthModels?: ModelOption[] // shown when OAuth selected
  authMethods?: AuthMethod[] // undefined = api-key only
}
```

OpenAI `oauthModels`:

- `openai-codex/gpt-5.3-codex` — Latest Coding (Recommended)
- `openai-codex/gpt-5.2-codex` — Stable Coding
- `openai-codex/gpt-5.1-codex` — Legacy

### OAuth Flow (Hybrid: OpenClaw CLI + Electron BrowserWindow)

VoidClaw delegates token management to OpenClaw CLI:

1. Main process spawns `openclaw models auth login --provider openai-codex`
2. Parse auth URL from stdout
3. Open URL in Electron `BrowserWindow` (800x700, nodeIntegration: false)
4. OpenClaw's own localhost:1455 server receives callback, handles token exchange
5. Child process completes -> success

Windows (WSL): OAuth login happens on Windows host (BrowserWindow). OpenClaw CLI runs in WSL. WSL2 forwards localhost ports by default, so localhost:1455 redirect reaches WSL. Fallback: `shell.openExternal()` if BrowserWindow redirect fails.

### UI Flow

**ApiKeyGuideStep**: OpenAI tab gains auth method toggle. Other providers unchanged.

**ConfigStep**: When `authMethod === 'oauth'`:

- API key input hidden
- "Login with OpenAI" button shown instead
- Click triggers `oauth:openai-codex` IPC call
- Success: button changes to "Login Complete" state
- Telegram bot token input remains

### IPC Channels

New channel: `oauth:openai-codex`

```
Renderer -> Main: oauth:openai-codex
Main -> Renderer: { success: boolean, error?: string }
```

### onboarder.ts Changes

`OnboardConfig.provider` extended: `'openai-codex'` added.
`OnboardConfig.authMethod`: `'api-key' | 'oauth'` added.

When `authMethod === 'oauth'`:

- `authFlags` uses `['--auth-choice', 'openai-codex']` (no API key flags)
- OpenClaw reads pre-stored OAuth tokens

`switchProvider()` also receives `authMethod` parameter.

### Error Handling

- User closes login window: `{ success: false, error: 'cancelled' }`
- Auth URL parse timeout (10s): `{ success: false, error: 'timeout' }`
- No subscription: OpenClaw onboard fails, existing error display used
- WSL localhost unreachable: fallback to `shell.openExternal()`

## File Changes

### New Files (1)

| File                         | Purpose                                                   |
| ---------------------------- | --------------------------------------------------------- |
| `src/main/services/oauth.ts` | OpenClaw CLI execution + auth URL parsing + BrowserWindow |

### Modified Files (9)

| File                                                  | Changes                                               |
| ----------------------------------------------------- | ----------------------------------------------------- |
| `src/renderer/src/constants/providers.ts`             | Add `oauthModels`, `authMethods` to ProviderConfig    |
| `src/renderer/src/steps/ApiKeyGuideStep.tsx`          | Auth method toggle UI for OpenAI                      |
| `src/renderer/src/steps/ConfigStep.tsx`               | OAuth login button branch                             |
| `src/renderer/src/components/ProviderSwitchModal.tsx` | OAuth toggle (interface ready)                        |
| `src/renderer/src/App.tsx`                            | `authMethod` state management                         |
| `src/main/services/onboarder.ts`                      | `openai-codex` auth flags + switchProvider authMethod |
| `src/main/ipc-handlers.ts`                            | `oauth:openai-codex` handler                          |
| `src/preload/index.ts`                                | `electronAPI.oauth.loginCodex()`                      |
| `src/preload/index.d.ts`                              | Type declarations                                     |

### i18n Keys (4 languages: ko, en, ja, zh)

- `apiKeyGuide.authMethod.oauth` / `apiKeyGuide.authMethod.apiKey`
- `config.oauthLogin` / `config.oauthSuccess` / `config.oauthError`

## Not In Scope

- Wizard step order changes
- Other provider modifications
- Token refresh UI (OpenClaw handles automatically)

## Risks

1. **WSL localhost port forwarding** may not work in all environments — mitigated by `shell.openExternal()` fallback
2. **OpenClaw CLI auth URL format** may change — parse logic should be resilient
3. **OpenAI may change Codex OAuth policy** — low risk, currently explicitly allows third-party tools
