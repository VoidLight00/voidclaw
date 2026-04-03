# OpenClaw AIエージェントをワンクリックでインストールできるツールを作りました

> 対象: Zenn, Qiita

---

## はじめに

[OpenClaw](https://github.com/openclaw/openclaw)というオープンソースのAIエージェントをご存知でしょうか？Telegramを通じてAIとやり取りできる便利なツールですが、セットアップにはNode.jsのインストール、npmコマンドの実行、設定ファイルの編集など、いくつかのステップが必要です。

コミュニティで「セットアップが面倒で諦めた」という声を何度か見かけたので、**VoidClaw**というデスクトップインストーラーを作りました。

## VoidClawとは

**ダウンロード → 実行 → APIキーを入力** — この3ステップだけでOpenClawの環境構築が完了します。

VoidClawが自動で行うこと：

- 環境の自動検出（Node.jsバージョン、WindowsのWSL状態など）
- 必要な依存関係のインストール
- AIプロバイダーの設定（Anthropic、Google Gemini、OpenAI、MiniMax、GLM対応）
- Telegramボットのセットアップ
- ゲートウェイプロセスのバックグラウンド実行（システムトレイ常駐）

## 技術的に面白かったポイント

### WindowsでのWSL自動化

macOSではNode.jsをインストールしてnpmを実行するだけですが、WindowsではWSL（Windows Subsystem for Linux）内でOpenClawを動かす必要があります。

ElectronアプリからWSLのインストールを自動化するのは予想以上に大変でした：

- **WSLの状態管理**: WSLには6つの状態があり（`not_available` → `not_installed` → `needs_reboot` → `no_distro` → `not_initialized` → `ready`）、それぞれ異なる処理が必要
- **再起動後の復元**: WSLのインストールにはシステム再起動が必要。ウィザードの状態をJSONファイルに保存し、再起動後に途中から再開できるようにしました
- **IPv6の問題**: WSLはデフォルトでIPv6のDNS解決を使用するため、一部のネットワーク呼び出しが失敗します。ゲートウェイ実行時に`NODE_OPTIONS=--dns-result-order=ipv4first`を強制しています

### 条件分岐付き7ステップウィザード

インストールウィザードは7ステップありますが、すべてのユーザーにすべてが表示されるわけではありません：

- WSLセットアップはWindowsでWSLが未準備の場合のみ表示
- すでにインストール済みならインストールステップはスキップ
- トラブルシューティングは完了画面からのみアクセス可能

カスタムの`useWizard`フックで、履歴追跡による戻るナビゲーションと`goTo()`によるスキップを実装しました。

## 技術スタック

| 領域         | 技術                              |
| ------------ | --------------------------------- |
| デスクトップ | Electron + electron-vite          |
| UI           | React 19 + Tailwind CSS 4         |
| 言語         | TypeScript                        |
| CI/CD        | electron-builder + GitHub Actions |
| コード署名   | Apple Notarization (macOS)        |
| 多言語       | 日本語・英語・韓国語・中国語対応  |

## ダウンロード

- **macOS**: [voidclaw.dmg](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw.dmg)
- **Windows**: [voidclaw-setup.exe](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw-setup.exe)
- **GitHub**: [github.com/VoidLight00/voidclaw](https://github.com/VoidLight00/voidclaw)
- **ウェブサイト**: [voidclaw.vercel.app](https://voidclaw.vercel.app)

MITライセンスのオープンソースです。Issue やPRもお待ちしています！

ご質問やフィードバックがあれば、お気軽にコメントください。
