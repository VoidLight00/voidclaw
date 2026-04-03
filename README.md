<p align="center">
  <img src="resources/icon-v2.png" width="120" alt="VoidClaw Logo">
</p>

<h1 align="center">VoidClaw</h1>

<p align="center">
  <strong>One-click installer for OpenClaw AI agent</strong>
</p>

<p align="center">
  <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/VoidLight00/voidclaw/releases/latest"><img src="https://img.shields.io/github/v/release/VoidLight00/voidclaw?color=f97316&style=flat-square" alt="Release"></a>
  <a href="https://github.com/VoidLight00/voidclaw/releases"><img src="https://img.shields.io/github/downloads/VoidLight00/voidclaw/total?color=34d399&style=flat-square" alt="Downloads"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue?style=flat-square" alt="Platform">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=flat-square" alt="License"></a>
</p>

<p align="center">
  <a href="https://github.com/VoidLight00/voidclaw/releases/latest">Download</a> · <a href="https://github.com/openclaw/openclaw">OpenClaw</a>
</p>

---

## What is VoidClaw?

VoidClaw is a desktop installer that sets up [OpenClaw](https://github.com/openclaw/openclaw) AI agent **without any terminal commands**.

**Download → Run → Sign in** — that's it. Three steps.

---

## ✨ Upgraded from EasyClaw

VoidClaw is a complete redesign based on EasyClaw.

| Feature | EasyClaw | **VoidClaw** |
| ------- | :------: | :----------: |
| Setup wizard | 7 steps | **5 steps (streamlined)** |
| AI login | Manual API key entry | **🔑 OAuth one-click sign-in** |
| Agent personalization | ❌ | **✅ Auto-generates SOUL.md / USER.md / IDENTITY.md** |
| Telegram bot verification | ❌ | **✅ Real-time token validation** |
| Agent name & personality | ❌ | **✅ Configure during setup** |

> No more copying API keys — just click sign in and you're ready.

---

## Features

- **One-Click Install** — Automatically detects and installs WSL, Node.js, and OpenClaw
- **OAuth Sign-In** — One-click authentication for Anthropic, Google Gemini, OpenAI, and Qwen — no API key needed
- **Agent Personalization** — Set your agent's name, personality, and user info right during setup
- **Telegram Integration** — Use your AI agent anywhere through a Telegram bot
- **Cross-Platform** — macOS (Intel + Apple Silicon) and Windows

## Download

| OS      | File   | Link                                                                                          |
| ------- | ------ | --------------------------------------------------------------------------------------------- |
| macOS   | `.dmg` | [Download](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw.dmg)       |
| Windows | `.exe` | [Download](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw-setup.exe) |

## Windows Security Notice

We're in the process of obtaining a Windows code signing certificate. You may see a security warning during installation.

> - [VirusTotal scan result](https://www.virustotal.com/gui/url/800de679ba1d63c29023776989a531d27c4510666a320ae3b440c7785b2ab149) — 0 detections across 94 antivirus engines
> - Fully open source — anyone can inspect the code
> - Built with GitHub Actions CI/CD — transparent build process

<details>
<summary><b>If you see "Windows protected your PC"</b></summary>

1. Click **"More info"**
2. Click **"Run anyway"**

</details>

## Tech Stack

| Area      | Technology                                               |
| --------- | -------------------------------------------------------- |
| Framework | Electron + electron-vite                                 |
| Frontend  | React 19 + Tailwind CSS 4                                |
| Language  | TypeScript                                               |
| Build/CI  | electron-builder + GitHub Actions                        |
| Code Sign | Apple Notarization (macOS) / SignPath (Windows, pending) |

## Development

```bash
npm install    # Install dependencies
npm run dev    # Development mode (electron-vite dev)
npm run build  # Type check + build
npm run lint   # ESLint
npm run format # Prettier
```

Platform-specific packaging:

```bash
npm run build:mac-local  # macOS local build
npm run build:win-local  # Windows local build
```

> **Note**: macOS code signing requires `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`, `CSC_LINK`, `CSC_KEY_PASSWORD` environment variables. Without them, the app will be built unsigned.

## Project Structure

```
src/
├── main/             # Main process (Node.js)
│   ├── services/     # Env check, installer, onboarding, gateway
│   └── ipc-handlers  # IPC channel router
├── preload/          # contextBridge (IPC API bridge)
└── renderer/         # React UI (7-step wizard)
api/                  # Vercel serverless functions
docs/                 # Landing page (voidclaw.vercel.app)
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before getting started.

## Credits

Built on [OpenClaw](https://github.com/openclaw/openclaw) (MIT License) by the [openclaw](https://github.com/openclaw) team.

## License

[MIT](LICENSE)
