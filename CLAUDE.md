# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

EasyClaw는 OpenClaw AI 에이전트를 원클릭으로 설치하는 **Electron 데스크톱 인스톨러**. electron-vite + React + Tailwind CSS 4 기반이며 macOS/Windows를 지원한다.

## 주요 명령어

```bash
npm run dev          # 개발 모드 (electron-vite dev)
npm run build        # typecheck + electron-vite build
npm run lint         # eslint (캐시 사용)
npm run format       # prettier
npm run typecheck    # node + web 타입 체크

# 플랫폼별 빌드
npm run build:mac       # macOS (publish always)
npm run build:win       # Windows (publish always)
npm run build:mac-local # macOS (로컬 빌드만)
npm run build:win-local # Windows (로컬 빌드만)
```

테스트 프레임워크는 없음. `npm run typecheck`과 `npm run lint`로 검증.

## 아키텍처

### 3-layer 구조 (Electron 표준)

```
src/main/        → Main process (Node.js, 시스템 접근)
src/preload/     → Preload (contextBridge로 IPC API 노출)
src/renderer/    → Renderer process (React UI)
```

- **tsconfig.node.json**: main + preload 대상
- **tsconfig.web.json**: renderer 대상, `@renderer/*` → `src/renderer/src/*` path alias

### Main process 서비스 (`src/main/services/`)

| 파일             | 역할                                                          |
| ---------------- | ------------------------------------------------------------- |
| `env-checker.ts` | Node.js/OpenClaw/WSL 설치 여부 및 버전 감지                   |
| `installer.ts`   | Node.js, WSL, OpenClaw 자동 설치 (플랫폼별 분기)              |
| `onboarder.ts`   | `openclaw onboard` CLI 실행 (API 키 설정, 텔레그램 채널 추가) |
| `gateway.ts`     | OpenClaw gateway(로컬 서버) start/stop/status 관리            |
| `path-utils.ts`  | NVM/Volta/npm-global 등 PATH 확장 + 바이너리 탐색 헬퍼        |

### IPC 통신 패턴

1. `ipc-handlers.ts`에서 `ipcMain.handle()` 등록
2. `preload/index.ts`에서 `contextBridge.exposeInMainWorld('electronAPI', ...)` 로 renderer에 노출
3. renderer에서 `window.electronAPI.xxx()` 호출
4. 설치 진행 상황은 `install:progress` / `install:error` 이벤트로 main→renderer 단방향 전송

IPC 채널 추가 시: `ipc-handlers.ts` 핸들러 → `preload/index.ts` electronAPI 객체 → `preload/index.d.ts` 타입 선언 3곳을 함께 수정해야 한다.

### Renderer 위자드 플로우

`useWizard` 훅이 스텝 네비게이션을 관리. 순서:

`welcome` → `envCheck` → (`install`) → `apiKeyGuide` → `telegramGuide` → `config` → `done`

- `install` 스텝은 환경 체크 결과에 따라 조건부 진입
- `goTo()`로 스텝 건너뛰기 가능, `history` ref로 뒤로가기 지원
- 각 Step 컴포넌트는 `src/renderer/src/steps/`에 위치, `onNext`/`onDone` 콜백으로 전환

### Windows 지원 방식

Windows에서는 WSL을 통해 Node.js/OpenClaw를 실행. `env-checker`, `installer`, `onboarder`, `gateway` 모두 `platform() === 'win32'`일 때 `wsl --` 프리픽스를 붙이는 패턴 사용.

### Vercel 배포 (docs/ + api/)

- `docs/`: 정적 마케팅 페이지 (easyclaw.kr)
- `api/newsletter.js`: 뉴스레터 구독 서버리스 함수
- `vercel.json`으로 설정, Electron 앱과는 독립적

## 코드 스타일

- Prettier: 싱글쿼트, 세미콜론 없음, 100자 폭, trailing comma 없음
- ESLint: `@electron-toolkit/eslint-config-ts` + React hooks/refresh 규칙
- 들여쓰기: 스페이스 2칸, LF 줄바꿈

## UI 테마

다크 모드 기반. 커스텀 색상은 `src/renderer/src/assets/main.css`의 `@theme` 블록에 정의:
- primary: `#f97316` (오렌지), bg: `#080c18` (다크)
- Tailwind에서 `text-primary`, `bg-bg-card`, `text-text-muted` 등으로 사용
- 배경: Aurora 그라디언트 + SVG 노이즈 그레인 + 버블 애니메이션

## 주의사항

- `onboarder.ts`는 376줄의 큰 함수로 IPv6 fix, plist 패치, Telegram 409 해결 등 복잡한 로직 포함. 수정 시 macOS/Windows 양쪽 경로를 모두 확인할 것
- Node.js 최소 버전(22.12.0), 게이트웨이 포트(18789) 등 하드코딩된 값이 여러 파일에 산재. 변경 시 `env-checker.ts`, `installer.ts`, `onboarder.ts`를 함께 확인
- `getPathEnv()` / `findBin()` (`path-utils.ts`)로 NVM/Volta/npm-global PATH를 확장하는 패턴이 서비스 전반에서 사용됨
