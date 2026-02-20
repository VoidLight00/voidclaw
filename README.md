<p align="center">
  <img src="resources/icon.png" width="120" alt="EasyClaw Logo">
</p>

<h1 align="center">EasyClaw</h1>

<p align="center">
  <strong>OpenClaw AI 에이전트를 원클릭으로 설치하세요</strong>
</p>

<p align="center">
  <a href="https://github.com/ybgwon96/easy-claw/releases/latest"><img src="https://img.shields.io/github/v/release/ybgwon96/easy-claw?color=f97316&style=flat-square" alt="Release"></a>
  <a href="https://github.com/ybgwon96/easy-claw/releases"><img src="https://img.shields.io/github/downloads/ybgwon96/easy-claw/total?color=34d399&style=flat-square" alt="Downloads"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue?style=flat-square" alt="Platform">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=flat-square" alt="License"></a>
</p>

<p align="center">
  <a href="https://easyclaw.kr">홈페이지</a> · <a href="https://github.com/ybgwon96/easy-claw/releases/latest">다운로드</a> · <a href="https://open.kakao.com/o/gbBkPehi">커뮤니티</a> · <a href="https://github.com/openclaw/openclaw">OpenClaw</a>
</p>

---

<p align="center">
  <img src="docs/screenshots/welcome.png" width="270" alt="시작 화면">
  &nbsp;&nbsp;
  <img src="docs/screenshots/env-check.png" width="270" alt="환경 검사">
  &nbsp;&nbsp;
  <img src="docs/screenshots/done.png" width="270" alt="설치 완료">
</p>

## 소개

[OpenClaw](https://github.com/openclaw/openclaw) AI 에이전트를 **복잡한 터미널 작업 없이** 설치할 수 있는 데스크톱 인스톨러입니다.

**다운로드 → 실행 → API 키 입력**, 3단계면 끝.

## 주요 기능

- **원클릭 설치** — WSL, Node.js, OpenClaw 등 필요한 환경을 자동 감지 및 설치
- **AI 제공사 선택** — Anthropic, Google Gemini, OpenAI 중 선택 가능
- **텔레그램 연동** — 텔레그램 봇을 통해 어디서든 AI 에이전트 사용
- **크로스 플랫폼** — macOS (Intel + Apple Silicon) / Windows 지원

## 다운로드

| OS      | 파일   | 링크                                                              |
| ------- | ------ | ----------------------------------------------------------------- |
| macOS   | `.dmg` | [다운로드](https://github.com/ybgwon96/easy-claw/releases/latest) |
| Windows | `.exe` | [다운로드](https://github.com/ybgwon96/easy-claw/releases/latest) |

[easyclaw.kr](https://easyclaw.kr)에서도 OS에 맞는 파일이 자동으로 선택됩니다.

## Windows 보안 경고 안내

Windows 코드 서명 인증서 발급을 진행 중입니다. 현재는 설치 시 보안 경고가 나타날 수 있습니다.

> - 🔍 [VirusTotal 검사 결과](https://www.virustotal.com/gui/url/800de679ba1d63c29023776989a531d27c4510666a320ae3b440c7785b2ab149) — 94개 백신 엔진에서 탐지 0건
> - 📂 [소스코드 전체 공개](https://github.com/ybgwon96/easy-claw) — 누구나 코드를 직접 검증 가능
> - 🔨 GitHub Actions CI/CD로 빌드 — 빌드 과정이 투명하게 공개

<details>
<summary><b>"Windows의 PC 보호" 경고가 나타나면</b></summary>

1. **"추가 정보"** 클릭
2. **"실행"** 클릭

</details>

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프레임워크 | Electron + electron-vite |
| 프론트엔드 | React 19 + Tailwind CSS 4 |
| 언어 | TypeScript |
| 빌드/배포 | electron-builder + GitHub Actions |
| 코드 서명 | Apple Notarization (macOS) / SignPath (Windows, 진행 중) |

## 개발

```bash
npm install    # 의존성 설치
npm run dev    # 개발 모드 (electron-vite dev)
npm run build  # 타입 체크 + 빌드
npm run lint   # ESLint
npm run format # Prettier
```

플랫폼별 패키징:

```bash
npm run build:mac-local  # macOS 로컬 빌드
npm run build:win-local  # Windows 로컬 빌드
```

## 프로젝트 구조

```
src/
├── main/             # Main process (Node.js)
│   ├── services/     # 환경 체크, 설치, 온보딩, 게이트웨이
│   └── ipc-handlers  # IPC 채널 라우터
├── preload/          # contextBridge (IPC API 노출)
└── renderer/         # React UI (7단계 위자드)
api/                  # Vercel 서버리스 함수
docs/                 # 랜딩 페이지 (easyclaw.kr)
```

## 크레딧

[OpenClaw](https://github.com/openclaw/openclaw) (MIT License) 기반 — [openclaw](https://github.com/openclaw) 팀 개발

## 라이선스

[MIT](LICENSE)
