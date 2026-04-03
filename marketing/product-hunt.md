# Product Hunt Launch

## Basic Info

- **Name**: VoidClaw
- **Tagline**: Install OpenClaw AI agent with one click
- **Website**: https://voidclaw.vercel.app
- **GitHub**: https://github.com/VoidLight00/voidclaw

## Description (Short)

VoidClaw is a free, open-source desktop app that installs OpenClaw AI agent in three steps: download, run, and enter your API key. No terminal commands needed. Supports macOS and Windows.

## Description (Full)

Setting up an AI agent shouldn't require a CS degree. OpenClaw is a powerful open-source AI agent that runs on Telegram, but its installation involves Node.js, npm, config files, and gateway processes.

VoidClaw eliminates all that complexity. It's a desktop installer that:

✅ **Auto-detects your environment** — checks Node.js, WSL (Windows), and existing installations
✅ **Installs everything automatically** — one click handles Node.js, WSL, and OpenClaw setup
✅ **Supports 5 AI providers** — Anthropic, Google Gemini, OpenAI, MiniMax, GLM
✅ **Sets up Telegram integration** — chat with your AI agent from your phone
✅ **Runs in the background** — system tray icon with auto-start on login

Built with Electron, React 19, TypeScript, and Tailwind CSS 4. Fully open source under MIT license.

Available in English, Korean, Japanese, and Chinese.

## Topics/Tags

- Artificial Intelligence
- Open Source
- Developer Tools
- Telegram
- Desktop Apps

## Maker Comment (First Comment)

Hi Product Hunt! 👋

I'm the maker of VoidClaw. I built this because I kept seeing people in the OpenClaw community struggle with the installation process — especially on Windows, where you need WSL set up properly.

The hardest technical challenge was automating WSL installation on Windows. WSL has 6 different states, and the installation requires a system reboot. We save the wizard state so users can pick up right where they left off after rebooting.

Some things I'm proud of:

- The entire setup takes under 2 minutes
- It works on both macOS (Intel + Apple Silicon) and Windows
- It's fully open source — you can inspect every line of code
- Built-in troubleshooting when things go wrong

I'd love your feedback! What features would make this more useful for you?

## Gallery Images (5)

1. Welcome screen — clean, minimal UI showing the app's purpose
2. Environment check — auto-detecting Node.js, WSL, OpenClaw status
3. API key setup — choosing your AI provider and entering credentials
4. Telegram setup — connecting your Telegram bot
5. Done screen — everything running, gateway status indicator
