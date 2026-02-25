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

| 파일                | 역할                                                          |
| ------------------- | ------------------------------------------------------------- |
| `wsl-utils.ts`      | WSL 상태 감지, WSL 내 명령 실행/파일 읽기쓰기 헬퍼            |
| `env-checker.ts`    | Node.js/OpenClaw/WSL 설치 여부 및 버전 감지                   |
| `installer.ts`      | Node.js, WSL, OpenClaw 자동 설치 (플랫폼별 분기)              |
| `onboarder.ts`      | `openclaw onboard` CLI 실행 (API 키 설정, 텔레그램 채널 추가) |
| `gateway.ts`        | OpenClaw gateway(로컬 서버) start/stop/status 관리            |
| `path-utils.ts`     | macOS용 PATH 확장 + 바이너리 탐색 헬퍼                        |
| `tray-manager.ts`   | 시스템 트레이 아이콘 + 10초 폴링으로 Gateway 상태 모니터링    |
| `updater.ts`        | `electron-updater` 기반 자동 업데이트 (체크→다운로드→설치)    |
| `troubleshooter.ts` | 포트 점유 확인, `openclaw doctor --fix` 실행 등 진단 도구     |

### IPC 통신 패턴

1. `ipc-handlers.ts`에서 `ipcMain.handle()` 등록
2. `preload/index.ts`에서 `contextBridge.exposeInMainWorld('electronAPI', ...)` 로 renderer에 노출
3. renderer에서 `window.electronAPI.xxx()` 호출
4. 설치 진행 상황은 `install:progress` / `install:error` 이벤트로 main→renderer 단방향 전송

IPC 채널 추가 시: `ipc-handlers.ts` 핸들러 → `preload/index.ts` electronAPI 객체 → `preload/index.d.ts` 타입 선언 3곳을 함께 수정해야 한다.

### 앱 라이프사이클

- 창 닫기 ≠ 앱 종료: `close` 이벤트를 가로채서 창만 숨기고 트레이에 유지
- 실제 종료: 트레이 메뉴 "종료" → `isQuitting = true` → `app.quit()`
- 자동 시작: `app.setLoginItemSettings({ openAtLogin, openAsHidden: true })`. 자동 시작 시 창 표시 건너뛰고 Gateway만 자동 실행
- 자동 업데이트: 앱 시작 5초 후 업데이트 체크. `update:available` → 사용자 클릭 → `update:progress` → `update:downloaded` → 재시작. `autoInstallOnAppQuit: true`

### Renderer 위자드 플로우

`useWizard` 훅이 스텝 네비게이션을 관리. 순서:

`welcome` → `envCheck` → (`wslSetup`) → (`install`) → `apiKeyGuide` → `telegramGuide` → `config` → `done`

- `troubleshoot` 스텝은 STEPS 배열에 미포함, `DoneStep`에서 `goTo('troubleshoot')`로 직접 진입
- `wslSetup` 스텝은 Windows + WSL 미준비 시에만 진입
- `install` 스텝은 환경 체크 결과에 따라 조건부 진입
- `goTo()`로 스텝 건너뛰기 가능, `history` ref로 뒤로가기 지원
- 각 Step 컴포넌트는 `src/renderer/src/steps/`에 위치, `onNext`/`onDone` 콜백으로 전환
- 지원 Provider: `anthropic | google | openai | deepseek | glm`

### Windows 지원 방식 (WSL 모드)

Windows에서는 WSL(Windows Subsystem for Linux) Ubuntu 내에서 Node.js/OpenClaw를 실행.

- **`wsl-utils.ts`**: 모든 WSL 명령의 기반. `wsl -d Ubuntu -u root` 패턴으로 사용자 설정 프롬프트를 건너뜀
  - `checkWslState()`: WSL 상태 판별 (`not_available` → `not_installed` → `needs_reboot` → `no_distro` → `ready`)
  - `runInWsl(script)`: `bash -lc`로 nvm PATH 포함하여 WSL 내 명령 실행
  - `readWslFile(path)` / `writeWslFile(path, content)`: WSL 내 파일 읽기/쓰기
- **WSL 설치 플로우**: `installWsl()` → 재부팅 → `installNodeWsl()` (nvm + LTS) → `installOpenClawWsl()` (npm -g)
- **리부트 복원**: `wizard-state.json` (`app.getPath('userData')`)에 상태 저장, 24시간 만료, done 도달 시 삭제
- **IPC 채널**: `wsl:check`, `wsl:install`, `wizard:save-state`, `wizard:load-state`, `wizard:clear-state`
- WSL 내 config 경로: `/root/.openclaw/openclaw.json`

### 릴리즈 배포

코드는 `ybgwon96/easyclaw` (private), 바이너리는 `ybgwon96/easyclaw-releases` (public)에 분리.

**릴리즈 절차:**

1. `package.json` 버전 bump (`npm version patch --no-git-tag-version`)
2. 커밋 & 푸시
3. `gh release create vX.Y.Z` 로 private 저장소에 릴리즈 생성
4. GitHub Actions가 자동으로: macOS/Windows 빌드 → `easyclaw-releases`에 릴리즈 + 바이너리 업로드

**워크플로우 구조** (`.github/workflows/release.yml`):

- `build-mac` (macos-latest): `build:mac-local` → artifact 업로드
- `build-win` (windows-latest): `build:win-local` → artifact 업로드
- `publish` (ubuntu-latest): 두 빌드 완료 후 `easyclaw-releases` 저장소에 `gh release create`

**시크릿**: `RELEASE_TOKEN` (fine-grained PAT, `easyclaw-releases` 저장소 Contents Read/Write 권한)

**다운로드 URL** (버전 무관, 항상 최신):

- macOS: `https://github.com/ybgwon96/easyclaw-releases/releases/latest/download/easy-claw.dmg`
- Windows: `https://github.com/ybgwon96/easyclaw-releases/releases/latest/download/easy-claw-setup.exe`

**빌드 파일명**: `electron-builder.yml`에서 버전 없이 고정 (`easy-claw.dmg`, `easy-claw-setup.exe`)

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

## 하드코딩 값

변경 시 관련 파일 모두 확인 필요:

| 항목               | 값        | 주요 위치                                                   |
| ------------------ | --------- | ----------------------------------------------------------- |
| Node.js 최소 버전  | `22.12.0` | `env-checker.ts`                                            |
| Gateway 포트       | `18789`   | `troubleshooter.ts`, `onboarder.ts`, `TroubleshootStep.tsx` |
| 리부트 복원 만료   | 24시간    | `ipc-handlers.ts`                                           |
| 트레이 폴링 간격   | 10초      | `tray-manager.ts`                                           |
| 업데이트 체크 지연 | 5초       | `index.ts`                                                  |

## 주의사항

- `onboarder.ts`는 큰 함수로 IPv6 fix, plist 패치, Telegram 409 해결 등 복잡한 로직 포함. 수정 시 macOS/Windows(WSL) 양쪽 경로를 모두 확인할 것
- macOS: `getPathEnv()` / `findBin()` (`path-utils.ts`)로 NVM/Volta/npm-global PATH를 확장하는 패턴 사용
- Windows: 모든 WSL 명령은 `wsl-utils.ts`의 헬퍼를 통해 실행. 셸 인젝션 방지를 위해 인자는 반드시 싱글쿼트 이스케이프 적용 (`'${arg.replace(/'/g, "'\\''")}'` 패턴)
- `WslState` 타입이 `wsl-utils.ts`, `preload/index.d.ts`, renderer 컴포넌트(`App.tsx`)에 각각 선언됨. 상태값 변경 시 모두 동기화 필요
- WSL에서 IPv6 우선 사용 방지: Gateway 실행 시 `NODE_OPTIONS=--dns-result-order=ipv4first` 설정
