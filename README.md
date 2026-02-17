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
  <a href="https://github.com/openclaw/openclaw"><img src="https://img.shields.io/badge/based%20on-OpenClaw-blue?style=flat-square" alt="Based on OpenClaw"></a>
  <a href="https://easyclaw.kr"><img src="https://img.shields.io/badge/website-easyclaw.kr-8b5cf6?style=flat-square" alt="Website"></a>
</p>

<p align="center">
  <a href="https://easyclaw.kr">홈페이지</a> · <a href="https://github.com/ybgwon96/easy-claw/releases/latest">다운로드</a> · <a href="https://github.com/openclaw/openclaw">OpenClaw</a>
</p>

---

## 소개

EasyClaw는 [OpenClaw](https://github.com/openclaw/openclaw) AI 에이전트를 **복잡한 터미널 작업 없이** 설치할 수 있는 데스크톱 인스톨러입니다.

다운로드 → 실행 → API 키 입력, 3단계면 끝.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **원클릭 설치** | WSL, Node.js, OpenClaw 등 필요한 환경을 자동 감지 및 설치 |
| **AI 에이전트** | OpenClaw 기반 AI 에이전트와 자연어로 대화 |
| **텔레그램 연동** | 텔레그램 봇을 통해 어디서든 AI 에이전트 사용 |
| **크로스 플랫폼** | macOS / Windows 지원 |

## 다운로드

| OS | 파일 | 링크 |
|----|------|------|
| macOS | `.dmg` | [다운로드](https://github.com/ybgwon96/easy-claw/releases/latest) |
| Windows | `.exe` | [다운로드](https://github.com/ybgwon96/easy-claw/releases/latest) |

또는 [easyclaw.kr](https://easyclaw.kr)에서 OS에 맞는 파일이 자동으로 선택됩니다.

## 설치 시 보안 경고 안내

코드 서명 전이라 OS 보안 경고가 나타날 수 있습니다. **바이러스가 아니며**, 아래에서 직접 확인할 수 있습니다.

> - 🔍 [VirusTotal 검사 결과](https://www.virustotal.com/gui/url/800de679ba1d63c29023776989a531d27c4510666a320ae3b440c7785b2ab149) — 94개 백신 엔진에서 탐지 0건
> - 📂 [소스코드 전체 공개](https://github.com/ybgwon96/easy-claw) — 누구나 코드를 직접 검증 가능
> - 🔨 GitHub Actions CI/CD로 빌드 — 빌드 과정이 투명하게 공개

<details>
<summary><b>Windows — "Windows의 PC 보호" 경고</b></summary>

1. **"추가 정보"** 클릭
2. **"실행"** 클릭

</details>

<details>
<summary><b>macOS — "Apple이 악성 소프트웨어가 없는지 확인할 수 없습니다" 경고</b></summary>

1. **"확인"** 을 눌러 창을 닫기
2. **시스템 설정 → 개인정보 보호 및 보안** 이동
3. 하단 **"확인 없이 열기"** 클릭

또는 터미널에서:
```bash
xattr -cr /Applications/EasyClaw.app
```

</details>

## 개발

```bash
# 설치
npm install

# 개발 모드
npm run dev

# 빌드
npm run build:win   # Windows
npm run build:mac   # macOS
```

## 크레딧

이 프로젝트는 [OpenClaw](https://github.com/openclaw/openclaw) (MIT License)를 기반으로 합니다.
OpenClaw는 [openclaw](https://github.com/openclaw) 팀이 개발한 오픈소스 AI 에이전트입니다.

## 라이선스

OpenClaw의 원본 라이선스는 [여기](https://github.com/openclaw/openclaw/blob/main/LICENSE)에서 확인할 수 있습니다.
