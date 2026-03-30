<p align="center">
  <img src="resources/icon.png" width="120" alt="VoidClaw Logo">
</p>

<h1 align="center">VoidClaw</h1>

<p align="center">
  <strong>OpenClaw AIエージェントをワンクリックでインストール</strong>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.zh.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/VoidLight00/voidclaw/releases/latest"><img src="https://img.shields.io/github/v/release/VoidLight00/voidclaw?color=f97316&style=flat-square" alt="Release"></a>
  <a href="https://github.com/VoidLight00/voidclaw/releases"><img src="https://img.shields.io/github/downloads/VoidLight00/voidclaw/total?color=34d399&style=flat-square" alt="Downloads"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue?style=flat-square" alt="Platform">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=flat-square" alt="License"></a>
</p>

<p align="center">
  <a href="https://voidclaw.vercel.app">ウェブサイト</a> · <a href="https://github.com/VoidLight00/voidclaw/releases/latest">ダウンロード</a> · <a href="https://github.com/openclaw/openclaw">OpenClaw</a>
</p>

---

<p align="center">
  <img src="docs/screenshots/welcome.png" width="270" alt="ようこそ">
  &nbsp;&nbsp;
  <img src="docs/screenshots/env-check.png" width="270" alt="環境チェック">
  &nbsp;&nbsp;
  <img src="docs/screenshots/done.png" width="270" alt="完了">
</p>

## VoidClawとは？

VoidClawは、[OpenClaw](https://github.com/openclaw/openclaw) AIエージェントを**ターミナル操作なしで**セットアップできるデスクトップインストーラーです。

**ダウンロード → 実行 → APIキー入力** — たった3ステップで完了。

## 主な機能

- **ワンクリックインストール** — WSL、Node.js、OpenClawを自動検出・インストール
- **複数のAIプロバイダー** — Anthropic、Google Gemini、OpenAI、MiniMax、GLMに対応
- **Telegram連携** — Telegramボットを通じてどこからでもAIエージェントを利用
- **クロスプラットフォーム** — macOS（Intel + Apple Silicon）/ Windows対応

## ダウンロード

| OS      | ファイル | リンク                                                                                            |
| ------- | -------- | ------------------------------------------------------------------------------------------------- |
| macOS   | `.dmg`   | [ダウンロード](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw.dmg)       |
| Windows | `.exe`   | [ダウンロード](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw-setup.exe) |

[voidclaw.vercel.app](https://voidclaw.vercel.app)からもOSに合わせたファイルを自動選択できます。

## Windowsセキュリティに関するお知らせ

現在、Windowsコード署名証明書の取得手続きを進めています。インストール時にセキュリティ警告が表示される場合があります。

> - [VirusTotalスキャン結果](https://www.virustotal.com/gui/url/800de679ba1d63c29023776989a531d27c4510666a320ae3b440c7785b2ab149) — 94のウイルス対策エンジンで検出0件
> - 完全オープンソース — 誰でもコードを確認可能
> - GitHub Actions CI/CDでビルド — ビルドプロセスが透明に公開

<details>
<summary><b>「WindowsによってPCが保護されました」と表示された場合</b></summary>

1. **「詳細情報」** をクリック
2. **「実行」** をクリック

</details>

## 技術スタック

| 領域           | 技術                                                    |
| -------------- | ------------------------------------------------------- |
| フレームワーク | Electron + electron-vite                                |
| フロントエンド | React 19 + Tailwind CSS 4                               |
| 言語           | TypeScript                                              |
| ビルド/CI      | electron-builder + GitHub Actions                       |
| コード署名     | Apple Notarization (macOS) / SignPath (Windows, 準備中) |

## 開発

```bash
npm install    # 依存関係のインストール
npm run dev    # 開発モード (electron-vite dev)
npm run build  # 型チェック + ビルド
npm run lint   # ESLint
npm run format # Prettier
```

プラットフォーム別パッケージング：

```bash
npm run build:mac-local  # macOS ローカルビルド
npm run build:win-local  # Windows ローカルビルド
```

## コントリビュート

コントリビュートを歓迎します！ [CONTRIBUTING.md](CONTRIBUTING.md)をご参照ください。

## クレジット

[OpenClaw](https://github.com/openclaw/openclaw)（MITライセンス）ベース — [openclaw](https://github.com/openclaw)チーム開発

## ライセンス

[MIT](LICENSE)
