const ja = {
  welcome: {
    tagline: '自分だけのAIエージェント、ワンクリックで',
    description: 'OpenClawを簡単・素早くインストールして\nTelegramでAIと会話しましょう',
    start: 'はじめる'
  },
  envCheck: {
    title: '環境チェック',
    checking: 'システムを確認しています...',
    os: 'OS',
    wsl2: 'WSL2',
    runMode: '実行モード',
    windowsNative: 'Windowsネイティブ',
    installed: 'インストール済み',
    notInstalled: '未インストール',
    initializing: '初期化中...',
    checking2: 'チェック中',
    nextStep: '次のステップへ',
    installNeeded: '必要なものをインストール',
    updating: 'アップデート中...',
    updateAvailable: 'v{{version}} アップデート可能'
  },
  install: {
    pcReboot: 'PC再起動が必要',
    done: 'インストール完了！',
    failed: 'インストール失敗',
    installing: 'インストール中...',
    ready: 'インストール準備',
    rebootDesc: 'WSL2を有効にするため、再起動後にアプリを再度起動してください',
    pleaseWait: 'しばらくお待ちください',
    allReady: 'すべての項目が準備できました',
    checkLogs: 'ログを確認してください',
    itemsToInstall: '以下の項目をインストールします',
    retry: '再試行',
    startInstall: 'インストール開始',
    nextStep: '次のステップへ',
    rebootNow: '今すぐ再起動'
  },
  apiKey: {
    title: 'AIプロバイダー選択',
    subtitle: '使用するAIプロバイダーを選択してAPIキーを取得してください',
    ready: 'キー準備完了！',
    providers: {
      google: {
        consoleLabel: 'AI Studioへ',
        steps: [
          {
            title: 'Google AI Studioにアクセス',
            desc: 'aistudio.google.com/apikey にアクセスしてください。Googleアカウントで直接ログインできます。'
          },
          {
            title: 'APIキーを作成',
            desc: 'Create API Keyボタンをクリックすると、AIza...で始まるキーが即座に生成されます。'
          },
          {
            title: 'キーをコピー',
            desc: '生成されたキーをコピーしてください。後で確認できますが、今コピーしておくと便利です。'
          }
        ]
      },
      openai: {
        consoleLabel: 'Platformへ',
        steps: [
          {
            title: 'OpenAI Platformにアクセス',
            desc: 'platform.openai.com にアクセスしてください。メールで簡単に登録できます。'
          },
          {
            title: '支払い方法を登録',
            desc: 'Settings → Billing でクレジットカードを登録し、クレジットをチャージしてください。最低$5から！'
          },
          {
            title: 'API Keysメニューへ移動',
            desc: 'API Keysページに移動してください。左のサイドバーから見つけることができます。'
          },
          {
            title: '新しいキーを生成してコピー',
            desc: 'Create new secret key → 名前を入力 → sk-...で始まるキーをコピーしてください。'
          }
        ]
      },
      anthropic: {
        consoleLabel: 'コンソールへ',
        steps: [
          {
            title: 'Anthropicコンソールにアクセス',
            desc: 'console.anthropic.com にアクセスしてください。メールで簡単に登録できます。'
          },
          {
            title: '支払い方法を登録',
            desc: 'Settings → Billing でクレジットカードを登録し、クレジットをチャージしてください。最低$5から！'
          },
          {
            title: 'API Keysメニューへ移動',
            desc: 'Settings → API Keys ページに移動してください。サイドバーの鍵アイコンを探してください。'
          },
          {
            title: '新しいキーを生成してコピー',
            desc: 'Create Keyボタン → 名前を入力 → sk-ant-...で始まるキーをコピーしてください。'
          }
        ]
      },
      deepseek: {
        consoleLabel: 'Platformへ',
        steps: [
          {
            title: 'DeepSeek Platformにアクセス',
            desc: 'platform.deepseek.com にアクセスしてください。メールまたは電話番号で登録できます。'
          },
          {
            title: 'クレジットをチャージ',
            desc: 'Top Upメニューでクレジットをチャージしてください。料金はとてもお手頃です！'
          },
          {
            title: 'API Keysメニューへ移動',
            desc: 'API Keysページに移動してください。左のサイドバーから見つけることができます。'
          },
          {
            title: '新しいキーを生成してコピー',
            desc: 'Create new API key → 名前を入力 → sk-...で始まるキーをコピーしてください。'
          }
        ]
      },
      glm: {
        consoleLabel: 'Z.AIへ',
        steps: [
          {
            title: 'Z.AIにアクセス',
            desc: 'z.ai にアクセスしてください。メールまたは電話番号で登録できます。'
          },
          {
            title: 'クレジットをチャージ',
            desc: 'チャージメニューでクレジットをチャージしてください。新規登録で無料クレジットが付与されます。'
          },
          {
            title: 'API Keysメニューへ移動',
            desc: 'APIキー管理ページに移動してください。'
          },
          {
            title: '新しいキーを生成してコピー',
            desc: 'APIキー生成ボタン → 生成されたキーをコピーしてください。'
          }
        ]
      }
    }
  },
  telegram: {
    title: 'Telegramボットを作成',
    subtitle: 'AIエージェントと会話するTelegramボットを作りましょう',
    botFatherLink: 'BotFatherへ',
    ready: 'トークン準備完了！',
    steps: [
      {
        title: 'BotFatherを検索',
        desc: 'Telegramアプリで@BotFatherを検索してください。青いチェックマークの公式ボットを選択します。'
      },
      {
        title: '/newbotコマンドを入力',
        desc: 'BotFatherとの会話で/newbotと入力すると、ボット名を聞かれます。'
      },
      {
        title: 'ボットの表示名を入力',
        desc: 'ボットの表示名を入力してください。例：EASYCLAW'
      },
      {
        title: 'ボットのユーザー名を決める',
        desc: '_botで終わるユニークなIDを入力してください。例：my_easyclaw_bot'
      },
      {
        title: 'ボットトークンをコピー',
        desc: '作成完了！123456:ABCDEF...形式のトークンを必ずコピーしてください。'
      }
    ]
  },
  config: {
    title: 'APIキー設定',
    subtitle: '取得したキーを入力してください',
    required: '必須',
    saving: '設定中...',
    save: '設定を保存',
    defaultError: '設定中にエラーが発生しました',
    unknownError: '不明なエラーが発生しました',
    botTokenFormat: '正しい形式：123456:ABCDEF...',
    providers: {
      anthropic: { label: 'Anthropic APIキー', placeholder: 'sk-ant-...' },
      google: { label: 'Gemini APIキー', placeholder: 'AIza...' },
      openai: { label: 'OpenAI APIキー', placeholder: 'sk-...' },
      deepseek: { label: 'DeepSeek APIキー', placeholder: 'sk-...' },
      glm: { label: 'Z.AI APIキー', placeholder: 'APIキーを入力' }
    }
  },
  done: {
    allReady: 'すべて準備完了！',
    starting: '起動中...',
    gatewayStopped: 'ゲートウェイ停止中',
    talkToAgent: 'TelegramでAIエージェントと会話しましょう',
    canRestart: '再起動できます',
    gatewayRunning: 'Gateway 実行中',
    gatewayStarting: '起動中...',
    gatewayStopped2: 'Gateway 停止中',
    openTelegram: 'Telegramを開く',
    restart: '再起動',
    stop: '停止',
    restartBtn: '再起動',
    hideLogs: '▼ ログを非表示',
    showLogs: '▶ ログを表示',
    errorDetected: '● エラー検出',
    communityChat: 'Discordコミュニティに参加',
    communityDesc: '使い方、質問、フィードバックを共有しましょう',
    communityUrl: 'https://discord.gg/openclawai'
  },
  steps: {
    labels: ['開始', '環境', 'インストール', 'APIキー', 'Telegram', '設定', '完了']
  },
  logViewer: {
    waiting: '待機中...'
  },
  app: {
    back: '戻る'
  }
} as const

export default ja
