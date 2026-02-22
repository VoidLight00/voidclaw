const ko = {
  welcome: {
    tagline: '나만의 AI 에이전트, 클릭 한 번으로',
    description: 'OpenClaw를 쉽고 빠르게 설치하고\n텔레그램으로 AI와 대화하세요',
    start: '시작하기'
  },
  envCheck: {
    title: '환경 검사',
    checking: '시스템을 확인하고 있습니다...',
    os: '운영체제',
    wsl2: 'WSL2',
    runMode: '실행 모드',
    windowsNative: 'Windows 네이티브',
    installed: '설치됨',
    notInstalled: '미설치',
    initializing: '초기화 중...',
    checking2: '검사 중',
    nextStep: '다음 단계로',
    installNeeded: '필요한 것 설치하기',
    updating: '업데이트 중...',
    updateAvailable: 'v{{version}} 업데이트 가능'
  },
  install: {
    pcReboot: 'PC 재부팅 필요',
    done: '설치 완료!',
    failed: '설치 실패',
    installing: '설치 중...',
    ready: '설치 준비',
    rebootDesc: 'WSL2 활성화를 위해 재부팅 후 앱을 다시 실행해 주세요',
    pleaseWait: '잠시만 기다려 주세요',
    allReady: '모든 항목이 준비되었습니다',
    checkLogs: '로그를 확인해 주세요',
    itemsToInstall: '아래 항목을 설치합니다',
    retry: '다시 시도',
    startInstall: '설치 시작',
    nextStep: '다음 단계로',
    rebootNow: '지금 재부팅'
  },
  apiKey: {
    title: 'AI 제공사 선택',
    subtitle: '사용할 AI 제공사를 선택하고 API 키를 발급받으세요',
    ready: '키 준비 완료!',
    providers: {
      google: {
        consoleLabel: 'AI Studio 바로가기',
        steps: [
          {
            title: 'Google AI Studio 접속',
            desc: 'aistudio.google.com/apikey 에 접속하세요. 구글 계정으로 바로 로그인됩니다.'
          },
          {
            title: 'API 키 만들기',
            desc: 'Create API Key 버튼을 클릭하면 AIza... 로 시작하는 키가 즉시 생성됩니다.'
          },
          {
            title: '키 복사',
            desc: '생성된 키를 복사하세요. 나중에 다시 확인할 수 있지만, 지금 복사해 두는 게 편합니다.'
          }
        ]
      },
      openai: {
        consoleLabel: 'Platform 바로가기',
        steps: [
          {
            title: 'OpenAI Platform 접속',
            desc: 'platform.openai.com 에 접속하세요. 이메일로 간단히 가입할 수 있습니다.'
          },
          {
            title: '결제 수단 등록',
            desc: 'Settings → Billing 에서 신용카드를 등록하고 크레딧을 충전하세요. 최소 $5부터 시작!'
          },
          {
            title: 'API Keys 메뉴 이동',
            desc: 'API Keys 페이지로 이동하세요. 좌측 사이드바에서 찾을 수 있습니다.'
          },
          {
            title: '새 키 생성 및 복사',
            desc: 'Create new secret key → 이름 입력 → sk-... 로 시작하는 키를 복사하세요.'
          }
        ]
      },
      anthropic: {
        consoleLabel: '콘솔 바로가기',
        steps: [
          {
            title: 'Anthropic 콘솔 접속',
            desc: 'console.anthropic.com 에 접속하세요. 이메일로 간단히 가입할 수 있습니다.'
          },
          {
            title: '결제 수단 등록',
            desc: 'Settings → Billing 에서 신용카드를 등록하고 크레딧을 충전하세요. 최소 $5부터 시작!'
          },
          {
            title: 'API Keys 메뉴 이동',
            desc: 'Settings → API Keys 페이지로 이동하세요. 사이드바에서 열쇠 아이콘을 찾으면 됩니다.'
          },
          {
            title: '새 키 생성 및 복사',
            desc: 'Create Key 버튼 → 이름 입력 → sk-ant-... 로 시작하는 키를 복사하세요. '
          }
        ]
      },
      deepseek: {
        consoleLabel: 'Platform 바로가기',
        steps: [
          {
            title: 'DeepSeek Platform 접속',
            desc: 'platform.deepseek.com 에 접속하세요. 이메일 또는 휴대폰 번호로 가입할 수 있습니다.'
          },
          {
            title: '크레딧 충전',
            desc: 'Top Up 메뉴에서 크레딧을 충전하세요. 가격이 매우 저렴합니다!'
          },
          {
            title: 'API Keys 메뉴 이동',
            desc: 'API Keys 페이지로 이동하세요. 좌측 사이드바에서 찾을 수 있습니다.'
          },
          {
            title: '새 키 생성 및 복사',
            desc: 'Create new API key → 이름 입력 → sk-... 로 시작하는 키를 복사하세요.'
          }
        ]
      },
      glm: {
        consoleLabel: 'Z.AI 바로가기',
        steps: [
          {
            title: 'Z.AI 접속',
            desc: 'z.ai 에 접속하세요. 이메일 또는 휴대폰 번호로 가입할 수 있습니다.'
          },
          {
            title: '크레딧 충전',
            desc: '충전 메뉴에서 크레딧을 충전하세요. 신규 가입 시 무료 크레딧이 제공됩니다.'
          },
          {
            title: 'API Keys 메뉴 이동',
            desc: 'API 키 관리 페이지로 이동하세요.'
          },
          {
            title: '새 키 생성 및 복사',
            desc: 'API 키 생성 버튼 → 생성된 키를 복사하세요.'
          }
        ]
      }
    }
  },
  telegram: {
    title: '텔레그램 봇 만들기',
    subtitle: 'AI 에이전트와 대화할 텔레그램 봇을 만들어 봅시다',
    botFatherLink: 'BotFather 바로가기',
    ready: '토큰 준비 완료!',
    steps: [
      {
        title: 'BotFather 검색',
        desc: '텔레그램 앱에서 @BotFather를 검색하세요. 파란 체크 표시가 있는 공식 봇을 선택합니다.'
      },
      {
        title: '/newbot 명령 입력',
        desc: 'BotFather 대화에서 /newbot 을 입력하면 봇 이름을 물어봅니다.'
      },
      {
        title: '봇 표시 이름 입력',
        desc: '봇의 표시 이름을 입력하세요. 예: EASYCLAW'
      },
      {
        title: '봇 유저네임 정하기',
        desc: '_bot으로 끝나는 고유 ID를 입력하세요. 예: my_easyclaw_bot'
      },
      {
        title: '봇 토큰 복사',
        desc: '생성 완료! 123456:ABCDEF... 형태의 토큰을 꼭 복사해 두세요.'
      }
    ]
  },
  config: {
    title: 'API 키 설정',
    subtitle: '발급받은 키를 입력해 주세요',
    required: '필수',
    saving: '설정 중...',
    save: '설정 저장',
    defaultError: '설정 중 오류가 발생했습니다',
    unknownError: '알 수 없는 오류가 발생했습니다',
    botTokenFormat: '올바른 형식: 123456:ABCDEF...',
    providers: {
      anthropic: { label: 'Anthropic API 키', placeholder: 'sk-ant-...' },
      google: { label: 'Gemini API 키', placeholder: 'AIza...' },
      openai: { label: 'OpenAI API 키', placeholder: 'sk-...' },
      deepseek: { label: 'DeepSeek API 키', placeholder: 'sk-...' },
      glm: { label: 'Z.AI API 키', placeholder: 'API 키 입력' }
    }
  },
  done: {
    allReady: '모든 준비 완료!',
    starting: '시작하는 중...',
    gatewayStopped: '게이트웨이 중지됨',
    talkToAgent: '텔레그램에서 AI 에이전트와 대화하세요',
    canRestart: '다시 시작할 수 있습니다',
    gatewayRunning: 'Gateway 실행 중',
    gatewayStarting: '시작 중...',
    gatewayStopped2: 'Gateway 중지됨',
    openTelegram: '텔레그램 열기',
    restart: '재시작',
    stop: '중지',
    restartBtn: '다시 시작',
    hideLogs: '▼ 로그 숨기기',
    showLogs: '▶ 로그 보기',
    errorDetected: '● 오류 감지',
    communityChat: '카카오 오픈채팅방 참여하기',
    communityDesc: '사용법, 질문, 피드백을 나눠보세요',
    communityUrl: 'https://open.kakao.com/o/gbBkPehi'
  },
  steps: {
    labels: ['시작', '환경', '설치', 'API키', '텔레그램', '설정', '완료']
  },
  logViewer: {
    waiting: '대기 중...'
  },
  app: {
    back: '이전'
  }
} as const

export default ko
