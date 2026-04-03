# I built a one-click installer for OpenClaw AI agent

> Target: Reddit (r/selfhosted, r/opensource), Hacker News (Show HN), DEV.to

---

If you've ever tried setting up [OpenClaw](https://github.com/openclaw/openclaw) — the open-source AI agent that runs on Telegram — you know the drill: install Node.js, run a bunch of npm commands, configure API keys in JSON files, set up a gateway process, figure out why it won't start...

I kept seeing people in the community give up halfway through the setup. So I built **VoidClaw** — a desktop app that handles the entire installation in three clicks.

## What it does

**Download → Run → Enter your API key.** That's the whole process.

VoidClaw automatically:

- Detects your environment (Node.js version, WSL on Windows, etc.)
- Installs missing dependencies
- Configures OpenClaw with your AI provider (Anthropic, Google Gemini, OpenAI, MiniMax, or GLM)
- Sets up a Telegram bot so you can chat with your AI agent from your phone
- Runs the gateway process in the background with a system tray icon

## The interesting technical challenges

### Cross-platform WSL automation (Windows)

On macOS, the setup is fairly straightforward — install Node.js, run npm. But Windows doesn't have a native Unix environment, so OpenClaw runs inside WSL (Windows Subsystem for Linux).

Automating WSL installation from an Electron app turned out to be surprisingly tricky:

- **WSL state machine**: WSL can be in 6 different states (`not_available` → `not_installed` → `needs_reboot` → `no_distro` → `not_initialized` → `ready`). Each state needs different handling.
- **Reboot persistence**: WSL installation requires a system reboot. The app saves wizard state to a JSON file with a 24-hour expiry, so users can pick up right where they left off after rebooting.
- **IPv6 issues**: WSL defaults to IPv6 DNS resolution which breaks some network calls. We force `NODE_OPTIONS=--dns-result-order=ipv4first` when running the gateway.

### Electron lifecycle quirks

The app lives in the system tray. Closing the window doesn't quit the app — it just hides it. The gateway keeps running in the background and polls for status every 10 seconds. "Quit" is only available from the tray menu.

Auto-start on login was another challenge: the app needs to start hidden (no window), just spinning up the gateway silently.

### 7-step wizard with conditional flow

The installation wizard has 7 steps, but not all are shown to every user:

- WSL setup only appears on Windows when WSL isn't ready
- The install step is skipped if everything is already installed
- A troubleshooting step is accessible from the final screen but not in the normal flow

We built a custom `useWizard` hook with history tracking for back navigation and `goTo()` for skipping steps.

## Stack

- **Electron + electron-vite** for the desktop shell
- **React 19 + Tailwind CSS 4** for the UI
- **TypeScript** throughout
- **electron-builder + GitHub Actions** for CI/CD
- **Apple Notarization** for macOS code signing
- **i18n** support for Korean, English, Japanese, and Chinese

## Screenshots

![Welcome](https://raw.githubusercontent.com/VoidLight00/voidclaw/main/docs/screenshots/welcome.png)
![Environment Check](https://raw.githubusercontent.com/VoidLight00/voidclaw/main/docs/screenshots/env-check.png)
![Done](https://raw.githubusercontent.com/VoidLight00/voidclaw/main/docs/screenshots/done.png)

## Try it out

- **Download**: [macOS (.dmg)](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw.dmg) | [Windows (.exe)](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw-setup.exe)
- **GitHub**: [github.com/VoidLight00/voidclaw](https://github.com/VoidLight00/voidclaw)
- **Website**: [voidclaw.vercel.app](https://voidclaw.vercel.app)

It's MIT licensed and fully open source. Contributions welcome!

Would love to hear your feedback. What AI providers would you like to see supported next?
