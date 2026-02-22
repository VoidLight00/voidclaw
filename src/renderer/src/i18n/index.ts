import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from './locales/ko'
import ja from './locales/ja'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof ko }
  }
}

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    ja: { translation: ja }
  },
  lng: 'ko',
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
})

export default i18n
