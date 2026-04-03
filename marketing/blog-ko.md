# OpenClaw AI 에이전트 원클릭 설치 도구를 만들었습니다

> 타겟: 긱뉴스, 커리어리

---

## 들어가며

[OpenClaw](https://github.com/openclaw/openclaw)는 텔레그램을 통해 AI와 대화할 수 있는 오픈소스 AI 에이전트입니다. 강력한 도구이지만, 설치 과정에서 Node.js 설치, npm 명령어 실행, 설정 파일 편집 등 여러 단계를 거쳐야 합니다.

커뮤니티에서 "설치가 너무 복잡해서 포기했다"는 이야기를 자주 접했고, 이 문제를 해결하고 싶어서 **VoidClaw**를 만들었습니다.

## VoidClaw란?

**다운로드 → 실행 → API 키 입력**, 3단계면 OpenClaw 설정이 완료됩니다.

VoidClaw가 자동으로 처리하는 것들:

- 환경 자동 감지 (Node.js 버전, Windows WSL 상태 등)
- 필요한 의존성 설치
- AI 제공사 설정 (Anthropic, Google Gemini, OpenAI, MiniMax, GLM 지원)
- 텔레그램 봇 셋업
- 게이트웨이 프로세스 백그라운드 실행 (시스템 트레이 상주)

## 기술적으로 재미있었던 부분

### Windows WSL 자동화

macOS에서는 Node.js 설치 후 npm 실행이면 끝이지만, Windows에서는 WSL(Windows Subsystem for Linux) 안에서 OpenClaw를 실행해야 합니다.

Electron 앱에서 WSL 설치를 자동화하는 건 예상보다 까다로웠습니다:

- **WSL 상태 머신**: WSL은 6가지 상태가 있고(`not_available` → `not_installed` → `needs_reboot` → `no_distro` → `not_initialized` → `ready`), 각 상태마다 다른 처리가 필요합니다
- **리부트 복원**: WSL 설치에는 시스템 재시작이 필요합니다. 위자드 상태를 JSON 파일에 저장(24시간 만료)하여 재시작 후 이어서 진행할 수 있게 했습니다
- **IPv6 문제**: WSL이 기본으로 IPv6 DNS를 사용하여 일부 네트워크 호출이 실패합니다. 게이트웨이 실행 시 `NODE_OPTIONS=--dns-result-order=ipv4first`를 강제 적용합니다

### 조건부 7단계 위자드

설치 위자드는 7단계이지만 모든 사용자에게 전부 표시되진 않습니다:

- WSL 셋업은 Windows에서 WSL 미준비 시에만 표시
- 이미 설치돼 있으면 설치 단계 스킵
- 트러블슈팅은 완료 화면에서만 접근 가능

커스텀 `useWizard` 훅으로 히스토리 기반 뒤로가기와 `goTo()` 스킵을 구현했습니다.

### Electron 라이프사이클

앱은 시스템 트레이에 상주합니다. 창을 닫아도 앱이 종료되지 않고, 게이트웨이가 백그라운드에서 계속 동작합니다. 10초마다 상태를 폴링하며, 트레이 메뉴의 "종료"로만 실제 종료됩니다.

## 기술 스택

| 영역      | 기술                              |
| --------- | --------------------------------- |
| 데스크톱  | Electron + electron-vite          |
| UI        | React 19 + Tailwind CSS 4         |
| 언어      | TypeScript                        |
| CI/CD     | electron-builder + GitHub Actions |
| 코드 서명 | Apple Notarization (macOS)        |
| 다국어    | 한국어·영어·일본어·중국어 지원    |

## 다운로드

- **macOS**: [voidclaw.dmg](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw.dmg)
- **Windows**: [voidclaw-setup.exe](https://github.com/VoidLight00/voidclaw/releases/latest/download/voidclaw-setup.exe)
- **GitHub**: [github.com/VoidLight00/voidclaw](https://github.com/VoidLight00/voidclaw)
- **웹사이트**: [voidclaw.vercel.app](https://voidclaw.vercel.app)

MIT 라이선스 오픈소스입니다. Issue나 PR 환영합니다!

피드백이나 궁금한 점이 있으시면 편하게 댓글 남겨주세요.
