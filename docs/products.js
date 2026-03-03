var PRODUCTS = {
  claw: {
    name: 'EasyClaw',
    slug: 'claw',
    accent: '#f97316',
    accentHover: '#fb923c',
    accentLight: '#fdba74',
    accentGlow: 'rgba(249, 115, 22, 0.35)',
    accentDark: '#ea580c',
    github: 'ybgwon96/easyclaw',
    dmg: 'easy-claw.dmg',
    exe: 'easy-claw-setup.exe',
    iconTemplate: 'icon-claw',
    path: '/',
    openChat: 'https://open.kakao.com/o/gbBkPehi',
    demoGif: 'demo.gif',
    productHunt:
      'https://www.producthunt.com/products/easyclaw-3?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-easyclaw-4',
    productHuntImg:
      'https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1088478&theme=light&t=1772460170834',
    i18nPrefix: '',
    features: [
      { color: 'orange', i18n: 'features.oneclick', icon: 'check' },
      { color: 'violet', i18n: 'features.agent', icon: 'mic' },
      { color: 'cyan', i18n: 'features.telegram', icon: 'chat' }
    ],
    steps: ['steps.download', 'steps.install', 'steps.chat']
  },
  code: {
    name: 'EasyCode',
    slug: 'code',
    accent: '#da7756',
    accentHover: '#e8956f',
    accentLight: '#f0b89e',
    accentGlow: 'rgba(218, 119, 86, 0.35)',
    accentDark: '#c2613d',
    github: 'ybgwon96/easycode',
    dmg: 'easy-code.dmg',
    exe: 'easy-code-setup.exe',
    iconTemplate: 'icon-code',
    path: '/easycode',
    openChat: 'https://open.kakao.com/o/gbBkPehi',
    demoGif: null,
    productHunt: null,
    productHuntImg: null,
    i18nPrefix: 'easycode.',
    features: [
      { color: 'orange', i18n: 'easycode.features.oneclick', icon: 'check' },
      { color: 'violet', i18n: 'easycode.features.envcheck', icon: 'search' },
      { color: 'cyan', i18n: 'easycode.features.i18n', icon: 'globe' }
    ],
    steps: ['easycode.steps.download', 'easycode.steps.install', 'easycode.steps.start']
  }
}
