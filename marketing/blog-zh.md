# 我做了一个 OpenClaw AI 代理的一键安装工具

> 目标平台：V2EX、掘金 (Juejin)

---

## 背景

[OpenClaw](https://github.com/openclaw/openclaw) 是一个开源 AI 代理，可以通过 Telegram 与 AI 对话。但安装过程需要手动安装 Node.js、运行 npm 命令、编辑配置文件等操作，对于不熟悉终端的用户来说门槛不低。

社区里经常有人反馈"安装太麻烦了"，所以我做了 **VoidClaw** —— 一个桌面安装器，三步完成所有配置。

## VoidClaw 是什么

**下载 → 运行 → 输入 API 密钥**，整个过程就是这么简单。

VoidClaw 自动完成以下工作：

- 检测运行环境（Node.js 版本、Windows 上的 WSL 状态等）
- 安装缺少的依赖
- 配置 AI 提供商（支持 Anthropic、Google Gemini、OpenAI、MiniMax、GLM）
- 设置 Telegram 机器人
- 在后台运行网关进程（系统托盘常驻）

## 技术亮点

### Windows 上的 WSL 自动化

macOS 上安装比较简单，但 Windows 上 OpenClaw 需要在 WSL（Windows Subsystem for Linux）中运行。

从 Electron 应用自动化 WSL 安装比想象中复杂得多：

- **WSL 状态机**：WSL 有 6 种状态（`not_available` → `not_installed` → `needs_reboot` → `no_distro` → `not_initialized` → `ready`），每种状态需要不同的处理逻辑
- **重启恢复**：WSL 安装需要系统重启。应用将向导状态保存到 JSON 文件（24 小时过期），重启后可以从中断处继续
- **IPv6 问题**：WSL 默认使用 IPv6 DNS 解析，会导致部分网络请求失败。我们在网关启动时强制设置 `NODE_OPTIONS=--dns-result-order=ipv4first`

### 条件分支的 7 步向导

安装向导有 7 个步骤，但并非所有步骤都会展示给每个用户：

- WSL 设置步骤仅在 Windows 上 WSL 未就绪时显示
- 如果环境已经就绪，跳过安装步骤
- 故障排除步骤从完成页面进入，不在常规流程中

通过自定义 `useWizard` Hook 实现了历史记录追踪和步骤跳转。

### Electron 生命周期

应用常驻系统托盘。关闭窗口不会退出应用，只是隐藏窗口。网关在后台持续运行，每 10 秒轮询状态。只有通过托盘菜单的"退出"才能真正关闭应用。

## 技术栈

| 领域     | 技术                              |
| -------- | --------------------------------- |
| 桌面框架 | Electron + electron-vite          |
| UI       | React 19 + Tailwind CSS 4         |
| 语言     | TypeScript                        |
| CI/CD    | electron-builder + GitHub Actions |
| 代码签名 | Apple Notarization (macOS)        |
| 国际化   | 中文、英文、韩文、日文            |

## 下载

- **macOS**: [voidclaw.dmg](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw.dmg)
- **Windows**: [voidclaw-setup.exe](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw-setup.exe)
- **GitHub**: [github.com/VoidLight00/voidclaw](https://github.com/VoidLight00/voidclaw)
- **官网**: [voidclaw.vercel.app](https://voidclaw.vercel.app)

MIT 开源协议，欢迎提 Issue 和 PR！

有任何问题或建议，欢迎在评论区交流。
