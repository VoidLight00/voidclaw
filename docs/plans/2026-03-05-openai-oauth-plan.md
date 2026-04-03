# OpenAI OAuth (Codex) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add OAuth login option for OpenAI ChatGPT Plus/Pro subscribers so they can use OpenClaw without a separate API key.

**Architecture:** Hybrid approach — VoidClaw opens Electron BrowserWindow for OAuth login, delegates token management to OpenClaw CLI (`openclaw models auth login --provider openai-codex`). UI adds auth method toggle in OpenAI provider tab.

**Tech Stack:** Electron (BrowserWindow, ipcMain), React, OpenClaw CLI, OAuth 2.0 PKCE

---

### Task 1: Data Model — Add OAuth fields to ProviderConfig

**Files:**

- Modify: `src/renderer/src/constants/providers.ts`

**Step 1: Add AuthMethod type and extend ProviderConfig**

Add `AuthMethod` type export and optional fields to `ProviderConfig`. Add `oauthModels` and `authMethods` to the OpenAI entry.

```typescript
// Add after line 1 (after Provider type)
export type AuthMethod = 'api-key' | 'oauth'

// Add to ProviderConfig interface (after models field, line 15)
  oauthModels?: ModelOption[]
  authMethods?: AuthMethod[]
```

Add to the OpenAI provider config object (after the existing `models` array closes, around line 111):

```typescript
    oauthModels: [
      {
        id: 'openai-codex/gpt-5.3-codex',
        name: 'GPT-5.3 Codex',
        desc: 'Latest Coding (Recommended)',
        price: 'Subscription'
      },
      {
        id: 'openai-codex/gpt-5.2-codex',
        name: 'GPT-5.2 Codex',
        desc: 'Stable Coding',
        price: 'Subscription'
      },
      {
        id: 'openai-codex/gpt-5.1-codex',
        name: 'GPT-5.1 Codex',
        desc: 'Legacy',
        price: 'Subscription'
      }
    ],
    authMethods: ['api-key', 'oauth']
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (no errors related to providers.ts)

**Step 3: Commit**

```bash
git add src/renderer/src/constants/providers.ts
git commit -m "feat: add OAuth model config and AuthMethod type to providers"
```

---

### Task 2: i18n — Add all translation keys

**Files:**

- Modify: `src/shared/i18n/locales/en/steps.json`
- Modify: `src/shared/i18n/locales/ko/steps.json`
- Modify: `src/shared/i18n/locales/ja/steps.json`
- Modify: `src/shared/i18n/locales/zh/steps.json`
- Modify: `src/shared/i18n/locales/en/providers.json`
- Modify: `src/shared/i18n/locales/ko/providers.json`
- Modify: `src/shared/i18n/locales/ja/providers.json`
- Modify: `src/shared/i18n/locales/zh/providers.json`
- Modify: `src/shared/i18n/locales/en/management.json`
- Modify: `src/shared/i18n/locales/ko/management.json`
- Modify: `src/shared/i18n/locales/ja/management.json`
- Modify: `src/shared/i18n/locales/zh/management.json`

**Step 1: Add i18n keys to steps.json (all 4 languages)**

Add to `apiKeyGuide` section:

```json
"authMethod": {
  "oauth": "ChatGPT Login",
  "apiKey": "API Key"
},
"oauthDesc": "Sign in with your ChatGPT Plus/Pro subscription"
```

Add to `config` section:

```json
"oauthLogin": "Sign in with OpenAI",
"oauthLoggingIn": "Signing in...",
"oauthSuccess": "Login Successful",
"oauthError": "Login failed. Please try again.",
"oauthCancelled": "Login was cancelled."
```

Korean (`ko/steps.json`):

```json
"authMethod": {
  "oauth": "ChatGPT 로그인",
  "apiKey": "API 키"
},
"oauthDesc": "ChatGPT Plus/Pro 구독으로 로그인하세요"
```

```json
"oauthLogin": "OpenAI로 로그인",
"oauthLoggingIn": "로그인 중...",
"oauthSuccess": "로그인 완료",
"oauthError": "로그인에 실패했습니다. 다시 시도해 주세요.",
"oauthCancelled": "로그인이 취소되었습니다."
```

Japanese (`ja/steps.json`):

```json
"authMethod": {
  "oauth": "ChatGPTログイン",
  "apiKey": "APIキー"
},
"oauthDesc": "ChatGPT Plus/Proサブスクリプションでログイン"
```

```json
"oauthLogin": "OpenAIでログイン",
"oauthLoggingIn": "ログイン中...",
"oauthSuccess": "ログイン完了",
"oauthError": "ログインに失敗しました。もう一度お試しください。",
"oauthCancelled": "ログインがキャンセルされました。"
```

Chinese (`zh/steps.json`):

```json
"authMethod": {
  "oauth": "ChatGPT 登录",
  "apiKey": "API 密钥"
},
"oauthDesc": "使用 ChatGPT Plus/Pro 订阅登录"
```

```json
"oauthLogin": "使用 OpenAI 登录",
"oauthLoggingIn": "登录中...",
"oauthSuccess": "登录成功",
"oauthError": "登录失败，请重试。",
"oauthCancelled": "登录已取消。"
```

**Step 2: Add Codex model descriptions to providers.json (all 4 languages)**

Add to `desc` object in each language:

English:

```json
"openai-codex/gpt-5.3-codex": "Latest Coding (Recommended)",
"openai-codex/gpt-5.2-codex": "Stable Coding",
"openai-codex/gpt-5.1-codex": "Legacy"
```

Korean:

```json
"openai-codex/gpt-5.3-codex": "최신 코딩 (추천)",
"openai-codex/gpt-5.2-codex": "안정 코딩",
"openai-codex/gpt-5.1-codex": "레거시"
```

Japanese:

```json
"openai-codex/gpt-5.3-codex": "最新コーディング（推奨）",
"openai-codex/gpt-5.2-codex": "安定コーディング",
"openai-codex/gpt-5.1-codex": "レガシー"
```

Chinese:

```json
"openai-codex/gpt-5.3-codex": "最新编程（推荐）",
"openai-codex/gpt-5.2-codex": "稳定编程",
"openai-codex/gpt-5.1-codex": "旧版"
```

**Step 3: Add OAuth-related keys to management.json (all 4 languages)**

Add to `providerSwitch` section:

English:

```json
"authMethod": "Auth Method",
"oauthLogin": "Sign in with OpenAI",
"oauthLoggingIn": "Signing in...",
"oauthSuccess": "Login Successful",
"oauthApiKey": "API Key"
```

Korean:

```json
"authMethod": "인증 방식",
"oauthLogin": "OpenAI로 로그인",
"oauthLoggingIn": "로그인 중...",
"oauthSuccess": "로그인 완료",
"oauthApiKey": "API 키"
```

Japanese:

```json
"authMethod": "認証方法",
"oauthLogin": "OpenAIでログイン",
"oauthLoggingIn": "ログイン中...",
"oauthSuccess": "ログイン完了",
"oauthApiKey": "APIキー"
```

Chinese:

```json
"authMethod": "认证方式",
"oauthLogin": "使用 OpenAI 登录",
"oauthLoggingIn": "登录中...",
"oauthSuccess": "登录成功",
"oauthApiKey": "API 密钥"
```

**Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/i18n/
git commit -m "feat: add i18n keys for OpenAI OAuth support"
```

---

### Task 3: IPC Layer — oauth channel + type declarations

**Files:**

- Modify: `src/preload/index.d.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/ipc-handlers.ts`

**Step 1: Add OAuth types to preload/index.d.ts**

Add to `ElectronAPI` interface (after `onboard` section, around line 42):

```typescript
oauth: {
  loginCodex: () => Promise<{ success: boolean; error?: string }>
}
```

Update `onboard.run` config type to accept optional `apiKey` and add `authMethod`:

```typescript
onboard: {
  run: (config: {
    provider: 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'
    apiKey?: string
    authMethod?: 'api-key' | 'oauth'
    telegramBotToken?: string
    modelId?: string
  }) => Promise<{ success: boolean; error?: string; botUsername?: string }>
}
```

Update `config.switchProvider` to accept optional `apiKey` and add `authMethod`:

```typescript
switchProvider: (config: {
  provider: 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'
  apiKey?: string
  authMethod?: 'api-key' | 'oauth'
  modelId?: string
}) => Promise<{ success: boolean; error?: string }>
```

**Step 2: Add OAuth to preload/index.ts**

Add `oauth` namespace to `electronAPI` object (after `onboard` section, around line 46):

```typescript
  oauth: {
    loginCodex: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('oauth:openai-codex')
  },
```

Update `onboard.run` config parameter: make `apiKey` optional, add `authMethod`:

```typescript
  onboard: {
    run: (config: {
      provider: 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'
      apiKey?: string
      authMethod?: 'api-key' | 'oauth'
      telegramBotToken?: string
      modelId?: string
    }): Promise<{ success: boolean; error?: string; botUsername?: string }> =>
      ipcRenderer.invoke('onboard:run', config)
  },
```

Update `config.switchProvider` similarly: make `apiKey` optional, add `authMethod`.

**Step 3: Add OAuth IPC handler stub to ipc-handlers.ts**

Add import at top:

```typescript
import { loginOpenAICodex } from './services/oauth'
```

Add handler (after the `onboard:run` handler, around line 192):

```typescript
ipcMain.handle('oauth:openai-codex', async () => {
  try {
    await loginOpenAICodex(win())
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
})
```

Update `onboard:run` handler config type: make `apiKey` optional, add `authMethod`:

```typescript
  ipcMain.handle(
    'onboard:run',
    async (
      _e,
      config: {
        provider: 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'
        apiKey?: string
        authMethod?: 'api-key' | 'oauth'
        telegramBotToken?: string
        modelId?: string
      }
    ) => {
```

Update `config:switch-provider` handler similarly.

**Step 4: Create stub oauth.ts so typecheck passes**

Create `src/main/services/oauth.ts`:

```typescript
import { BrowserWindow } from 'electron'

export const loginOpenAICodex = async (_win: BrowserWindow): Promise<void> => {
  throw new Error('Not implemented')
}
```

**Step 5: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/preload/index.d.ts src/preload/index.ts src/main/ipc-handlers.ts src/main/services/oauth.ts
git commit -m "feat: add OAuth IPC channel and type declarations"
```

---

### Task 4: OAuth Service — BrowserWindow + OpenClaw CLI integration

**Files:**

- Modify: `src/main/services/oauth.ts`

**Step 1: Implement loginOpenAICodex**

Replace the stub with full implementation:

```typescript
import { BrowserWindow, shell } from 'electron'
import { spawn } from 'child_process'
import { platform } from 'os'
import { StringDecoder } from 'string_decoder'
import { findBin } from './path-utils'
import { runInWsl } from './wsl-utils'

const AUTH_URL_PATTERN = /https:\/\/auth\.openai\.com\/[^\s]+/

const parseAuthUrl = (output: string): string | null => {
  const match = output.match(AUTH_URL_PATTERN)
  return match ? match[0] : null
}

export const loginOpenAICodex = async (win: BrowserWindow): Promise<void> => {
  const isWindows = platform() === 'win32'

  return new Promise((resolve, reject) => {
    let cmd: string
    let args: string[]

    if (isWindows) {
      const script = 'openclaw models auth login --provider openai-codex'
      cmd = 'wsl'
      args = ['-d', 'Ubuntu', '-u', 'root', '--', 'bash', '-lc', script]
    } else {
      cmd = findBin('openclaw')
      args = ['models', 'auth', 'login', '--provider', 'openai-codex']
    }

    const child = spawn(cmd, args, {
      env: isWindows
        ? process.env
        : { ...process.env, PATH: findBin('').replace(/\/[^/]*$/, '') + ':' + process.env.PATH }
    })

    const decoder = new StringDecoder('utf8')
    let authWindow: BrowserWindow | null = null
    let resolved = false
    let urlFound = false

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        child.kill()
        authWindow?.close()
        reject(new Error('timeout'))
      }
    }, 60_000)

    const handleOutput = (data: Buffer): void => {
      const text = decoder.write(data)
      if (urlFound) return

      const url = parseAuthUrl(text)
      if (!url) return
      urlFound = true

      // Open auth URL in Electron BrowserWindow
      authWindow = new BrowserWindow({
        width: 800,
        height: 700,
        parent: win,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      authWindow.loadURL(url)

      // Fallback: if BrowserWindow fails to load, open in system browser
      authWindow.webContents.on('did-fail-load', () => {
        shell.openExternal(url)
      })

      authWindow.on('closed', () => {
        authWindow = null
        // If child process is still running, user closed the window
        if (!resolved && child.exitCode === null) {
          resolved = true
          clearTimeout(timeout)
          child.kill()
          reject(new Error('cancelled'))
        }
      })
    }

    child.stdout.on('data', handleOutput)
    child.stderr.on('data', handleOutput)

    child.on('close', (code) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      authWindow?.close()

      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`OAuth login failed with exit code ${code}`))
      }
    })

    child.on('error', (err) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      authWindow?.close()
      reject(err)
    })
  })
}
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/main/services/oauth.ts
git commit -m "feat: implement OpenAI Codex OAuth login via BrowserWindow"
```

---

### Task 5: Onboarder — Add openai-codex auth path

**Files:**

- Modify: `src/main/services/onboarder.ts`

**Step 1: Update OnboardConfig and authFlags in runOnboard**

Update `OnboardConfig` interface (line 11-16):

```typescript
interface OnboardConfig {
  provider: 'anthropic' | 'google' | 'openai' | 'minimax' | 'glm'
  apiKey?: string
  authMethod?: 'api-key' | 'oauth'
  telegramBotToken?: string
  modelId?: string
}
```

Update `authFlags` in `runOnboard` (around line 207). Add OAuth branch:

```typescript
const authFlags: Record<string, string[]> = {
  anthropic: ['--auth-choice', 'apiKey', '--anthropic-api-key', config.apiKey!],
  google: ['--auth-choice', 'gemini-api-key', '--gemini-api-key', config.apiKey!],
  openai: ['--auth-choice', 'openai-api-key', '--openai-api-key', config.apiKey!],
  minimax: ['--auth-choice', 'minimax-api', '--minimax-api-key', config.apiKey!],
  glm: ['--auth-choice', 'zai-api-key', '--zai-api-key', config.apiKey!]
}

// OAuth: use pre-stored tokens, no API key needed
const effectiveProvider = config.authMethod === 'oauth' ? 'openai-codex' : config.provider
const effectiveAuthFlags =
  config.authMethod === 'oauth' ? ['--auth-choice', 'openai-codex'] : authFlags[config.provider]
```

Replace `...authFlags[config.provider]` with `...effectiveAuthFlags` in `openclawArgs` (line 221).

Update `defaultModels` to include `openai-codex` key (around line 271):

```typescript
const defaultModels: Record<string, string> = {
  anthropic: 'anthropic/claude-sonnet-4-6',
  google: 'google/gemini-3-flash',
  openai: 'openai/gpt-5.2',
  'openai-codex': 'openai-codex/gpt-5.3-codex',
  minimax: 'minimax/MiniMax-M2.5',
  glm: 'zai/glm-5'
}
```

Use `effectiveProvider` when looking up `defaultModels`:

```typescript
ocConfig.agents.defaults.model = {
  ...ocConfig.agents.defaults.model,
  primary: config.modelId || defaultModels[effectiveProvider]
}
```

**Step 2: Update switchProvider to accept authMethod**

Update `switchProvider` function signature (around line 444):

```typescript
export const switchProvider = async (
  win: BrowserWindow,
  config: {
    provider: OnboardConfig['provider']
    apiKey?: string
    authMethod?: 'api-key' | 'oauth'
    modelId?: string
  }
): Promise<void> => {
```

Apply the same `effectiveProvider` / `effectiveAuthFlags` pattern inside `switchProvider` (around line 529).

**Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/main/services/onboarder.ts
git commit -m "feat: add openai-codex OAuth auth path to onboarder"
```

---

### Task 6: ApiKeyGuideStep — Auth method toggle UI

**Files:**

- Modify: `src/renderer/src/steps/ApiKeyGuideStep.tsx`

**Step 1: Add authMethod prop and toggle UI**

Update `Props` interface:

```typescript
interface Props {
  provider: Provider
  onSelectProvider: (p: Provider) => void
  authMethod: 'api-key' | 'oauth'
  onSelectAuthMethod: (m: 'api-key' | 'oauth') => void
  modelId?: string
  onSelectModel: (id: string) => void
  onNext: () => void
}
```

Add destructured props: `authMethod`, `onSelectAuthMethod`.

Compute the active model list based on auth method:

```typescript
const activeModels =
  provider === 'openai' && authMethod === 'oauth'
    ? (providerConfig.oauthModels ?? providerConfig.models)
    : providerConfig.models
```

Add auth method toggle JSX (after provider tabs, before model selection). Only show when `providerConfig.authMethods` exists:

```tsx
{
  providerConfig.authMethods && (
    <div className="flex rounded-lg border border-glass-border overflow-hidden bg-bg-card mt-2">
      {providerConfig.authMethods.map((m) => (
        <button
          key={m}
          onClick={() => {
            onSelectAuthMethod(m)
            onSelectModel(
              m === 'oauth'
                ? (providerConfig.oauthModels?.[0]?.id ?? providerConfig.models[0].id)
                : providerConfig.models[0].id
            )
          }}
          className={`flex-1 py-2 text-center text-xs font-bold transition-colors duration-200 cursor-pointer ${
            authMethod === m ? 'bg-primary/15 text-primary' : 'hover:bg-white/5 text-text-muted'
          }`}
        >
          {t(`apiKeyGuide.authMethod.${m}`)}
        </button>
      ))}
    </div>
  )
}

{
  provider === 'openai' && authMethod === 'oauth' && (
    <p className="text-xs text-text-muted mt-1">{t('apiKeyGuide.oauthDesc')}</p>
  )
}
```

Replace `providerConfig.models.map` with `activeModels.map` in the model list rendering.

Hide the "Get API Key" link when OAuth is selected:

```tsx
{!(provider === 'openai' && authMethod === 'oauth') && (
  <a href={meta.consoleUrl} ...> ... </a>
)}
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: FAIL — App.tsx doesn't pass new props yet (expected, fixed in Task 8)

**Step 3: Commit**

```bash
git add src/renderer/src/steps/ApiKeyGuideStep.tsx
git commit -m "feat: add auth method toggle UI to ApiKeyGuideStep"
```

---

### Task 7: ConfigStep — OAuth login button

**Files:**

- Modify: `src/renderer/src/steps/ConfigStep.tsx`

**Step 1: Add authMethod prop and OAuth login UI**

Update `Props`:

```typescript
interface Props {
  provider: Provider
  authMethod?: 'api-key' | 'oauth'
  modelId?: string
  onDone: (botUsername?: string) => void
}
```

Add OAuth state:

```typescript
const [oauthDone, setOauthDone] = useState(false)
const [oauthLoading, setOauthLoading] = useState(false)
const isOAuth = authMethod === 'oauth'
```

Add OAuth login handler:

```typescript
const handleOAuthLogin = async (): Promise<void> => {
  setOauthLoading(true)
  setError(null)
  try {
    const result = await window.electronAPI.oauth.loginCodex()
    if (result.success) {
      setOauthDone(true)
    } else {
      setError(result.error === 'cancelled' ? t('config.oauthCancelled') : t('config.oauthError'))
    }
  } catch {
    setError(t('config.oauthError'))
  } finally {
    setOauthLoading(false)
  }
}
```

Update `canSave` logic:

```typescript
const canSave = isOAuth
  ? oauthDone && botTokenValid && !saving
  : apiKeyValid && botTokenValid && !saving
```

In the JSX, conditionally render API key input OR OAuth button:

```tsx
{isOAuth ? (
  <div className="space-y-1.5">
    <label className="text-sm font-bold">
      OpenAI {t('apiKeyGuide.authMethod.oauth')}
    </label>
    {oauthDone ? (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/30 rounded-xl">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-sm font-medium text-success">{t('config.oauthSuccess')}</span>
      </div>
    ) : (
      <button
        onClick={handleOAuthLogin}
        disabled={oauthLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-glass-border rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
      >
        {oauthLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {t('config.oauthLoggingIn')}
          </>
        ) : (
          t('config.oauthLogin')
        )}
      </button>
    )}
  </div>
) : (
  /* existing API key input JSX */
)}
```

Update `handleSave` to pass `authMethod` and omit `apiKey` for OAuth:

```typescript
const result = await window.electronAPI.onboard.run({
  provider,
  ...(isOAuth ? {} : { apiKey }),
  authMethod: authMethod ?? 'api-key',
  telegramBotToken: botToken || undefined,
  modelId
})
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: FAIL — App.tsx doesn't pass `authMethod` yet (expected, fixed in Task 8)

**Step 3: Commit**

```bash
git add src/renderer/src/steps/ConfigStep.tsx
git commit -m "feat: add OAuth login button to ConfigStep"
```

---

### Task 8: App.tsx — Wire authMethod state through wizard

**Files:**

- Modify: `src/renderer/src/App.tsx`

**Step 1: Add authMethod state and pass to steps**

Add state (after `modelId` state, around line 69):

```typescript
const [authMethod, setAuthMethod] = useState<'api-key' | 'oauth'>('api-key')
```

Update `ApiKeyGuideStep` props (around line 151):

```tsx
<ApiKeyGuideStep
  provider={provider}
  onSelectProvider={(p) => {
    setProvider(p)
    setModelId(undefined)
    setAuthMethod('api-key')
  }}
  authMethod={authMethod}
  onSelectAuthMethod={setAuthMethod}
  modelId={modelId}
  onSelectModel={setModelId}
  onNext={next}
/>
```

Update `ConfigStep` props (around line 163):

```tsx
<ConfigStep provider={provider} authMethod={authMethod} modelId={modelId} onDone={handleDone} />
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Verify lint passes**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

**Step 4: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: wire authMethod state through wizard steps"
```

---

### Task 9: ProviderSwitchModal — OAuth support for provider change

**Files:**

- Modify: `src/renderer/src/components/ProviderSwitchModal.tsx`

**Step 1: Add authMethod state and toggle**

Add state and imports:

```typescript
import { providerConfigs, type Provider, type AuthMethod } from '../constants/providers'
// ...
const [authMethod, setAuthMethod] = useState<AuthMethod>('api-key')
const [oauthDone, setOauthDone] = useState(false)
const [oauthLoading, setOauthLoading] = useState(false)
```

Reset auth state when provider changes:

```typescript
const handleProviderChange = (id: Provider): void => {
  setProvider(id)
  setApiKey('')
  setAuthMethod('api-key')
  setOauthDone(false)
  const cfg = providerConfigs.find((p) => p.id === id)!
  setModelId(cfg.models[0].id)
}
```

Compute active models:

```typescript
const activeModels =
  provider === 'openai' && authMethod === 'oauth'
    ? (selected.oauthModels ?? selected.models)
    : selected.models
```

Add auth method toggle (after provider tabs, before model list). Only show when `selected.authMethods` exists:

```tsx
{
  selected.authMethods && (
    <div className="flex rounded-lg border border-glass-border overflow-hidden bg-bg-card">
      {selected.authMethods.map((m) => (
        <button
          key={m}
          onClick={() => {
            setAuthMethod(m)
            setOauthDone(false)
            const models =
              m === 'oauth' ? (selected.oauthModels ?? selected.models) : selected.models
            setModelId(models[0].id)
          }}
          className={`flex-1 py-1.5 text-center text-xs font-bold transition-colors duration-200 cursor-pointer ${
            authMethod === m ? 'bg-primary/15 text-primary' : 'hover:bg-white/5 text-text-muted'
          }`}
        >
          {t(`providerSwitch.${m === 'oauth' ? 'oauthLogin' : 'oauthApiKey'}`)}
        </button>
      ))}
    </div>
  )
}
```

Replace `selected.models.map` with `activeModels.map` in model list.

Conditionally render API key input or OAuth button:

```tsx
{provider === 'openai' && authMethod === 'oauth' ? (
  <div className="space-y-1.5">
    {oauthDone ? (
      <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/30 rounded-lg">
        <span className="text-xs font-medium text-success">{t('providerSwitch.oauthSuccess')}</span>
      </div>
    ) : (
      <button
        onClick={handleOAuthLogin}
        disabled={oauthLoading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 border border-glass-border rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
      >
        {oauthLoading ? t('providerSwitch.oauthLoggingIn') : t('providerSwitch.oauthLogin')}
      </button>
    )}
  </div>
) : (
  /* existing API key input */
)}
```

Add OAuth login handler:

```typescript
const handleOAuthLogin = async (): Promise<void> => {
  setOauthLoading(true)
  try {
    const result = await window.electronAPI.oauth.loginCodex()
    if (result.success) setOauthDone(true)
  } catch {
    /* ignore */
  } finally {
    setOauthLoading(false)
  }
}
```

Update validation and handleSwitch:

```typescript
const isOAuth = provider === 'openai' && authMethod === 'oauth'
const canSwitch = isOAuth ? oauthDone : apiKeyValid
```

```typescript
const handleSwitch = async (): Promise<void> => {
  // ...
  const result = await window.electronAPI.config.switchProvider({
    provider,
    ...(isOAuth ? {} : { apiKey }),
    authMethod,
    modelId
  })
  // ...
}
```

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/renderer/src/components/ProviderSwitchModal.tsx
git commit -m "feat: add OAuth support to ProviderSwitchModal"
```

---

### Task 10: Final verification

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

**Step 3: Run dev mode**

Run: `npm run dev`
Expected: App starts, navigate to OpenAI provider tab, verify:

- Auth method toggle appears (ChatGPT Login / API Key)
- Toggling switches model list
- OAuth button appears in ConfigStep
- Other providers unaffected

**Step 4: Manual test OAuth flow (if OpenClaw installed)**

1. Select OpenAI → ChatGPT Login → select model → Next
2. In ConfigStep, click "Sign in with OpenAI"
3. BrowserWindow should open with OpenAI login page
4. After login, button should show "Login Successful"
5. Enter Telegram token → Save → should proceed to Done

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: add OpenAI OAuth (Codex) authentication support"
```

---

## Task Dependency Graph

```
Task 1 (providers.ts) ──┐
Task 2 (i18n) ──────────┤
Task 3 (IPC + types) ───┤
                         ├─→ Task 6 (ApiKeyGuideStep)
Task 4 (oauth.ts) ──────┤   Task 7 (ConfigStep)
Task 5 (onboarder.ts) ──┤        │
                         │        ▼
                         ├─→ Task 8 (App.tsx) ─→ Task 10 (verify)
                         │
                         └─→ Task 9 (ProviderSwitchModal)
```

Tasks 1-5 are independent and can be parallelized.
Tasks 6, 7 depend on Task 1 + 2 + 3.
Task 8 depends on Tasks 6 + 7.
Task 9 depends on Tasks 1 + 2 + 3 + 4.
Task 10 depends on all previous tasks.
