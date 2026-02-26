---
name: thread-writer
description: Convert URLs, text, or topics into viral X (Twitter) threads. Use when a user asks to create a thread, write a Twitter thread, convert an article/blog to a thread, or generate thread content from a topic/keyword. Triggers on phrases like "스레드 만들어", "스레드로 변환", "트윗 스레드", "thread from URL", "write a thread about".
---

# Thread Writer

URL, 텍스트, 키워드를 X(트위터) 바이럴 스레드로 변환하는 에이전트.

## Input Modes

### 1. URL mode

URL이 주어지면 `summarize`로 콘텐츠를 추출한 뒤 스레드를 생성한다.

```bash
summarize "URL" --length long --model google/gemini-3-flash-preview
```

추출 실패 시 `curl -sL "URL" | head -c 50000` 으로 fallback.

### 2. Text mode

사용자가 텍스트를 직접 붙여넣으면 해당 텍스트를 기반으로 스레드를 생성한다.

### 3. Topic mode

키워드/주제만 주어지면 웹 검색으로 최신 정보를 수집한 뒤 스레드를 생성한다.

## Thread Generation Rules

### 구조 (필수)

1. **Hook tweet (1/N)**: 첫 트윗은 스크롤을 멈추게 하는 훅. 질문, 대담한 주장, 놀라운 통계 중 하나를 사용한다.
2. **Body tweets (2~N-1)**: 핵심 내용을 한 트윗에 하나의 포인트로 전달한다.
3. **CTA tweet (N/N)**: 마지막 트윗은 반드시 행동 유도(CTA)로 마무리한다. 리트윗 요청, 팔로우 유도, 링크 공유 중 택1.

### 작성 규칙

- 트윗당 **최대 270자** (여유분 10자 확보)
- 한 트윗에 **하나의 아이디어**만 담는다
- 기본 스레드 길이: **7개 트윗**. 사용자 요청 시 3~15개로 조절
- 각 트윗 앞에 `N/` 번호를 붙인다 (예: `1/`)
- 빈 줄로 트윗 간 가독성을 높인다
- 이모지는 포인트 강조에만 절제해서 사용 (트윗당 0~2개)
- 해시태그는 마지막 CTA 트윗에만 1~3개

### 톤 가이드

- 대화체, 친근하지만 전문적
- 짧은 문장 선호. 한 문장이 두 줄을 넘지 않도록
- "~입니다" 체가 아닌 "~임", "~함" 등 간결체 사용
- 원문의 핵심 인사이트를 살리되 단순 요약이 아닌 재구성

## Output Format

스레드 생성 후 아래 형식으로 출력한다:

```
📌 스레드 미리보기 (N개 트윗)

1/ [hook tweet]

2/ [body tweet]

...

N/ [CTA tweet]
```

출력 후 사용자에게 묻는다:
- "이대로 X에 포스팅할까요? 수정할 부분이 있으면 말씀해주세요."

## Posting to X

사용자가 포스팅을 승인하면 `xurl`로 스레드를 게시한다.

### 포스팅 절차

1. 첫 트윗 게시:
```bash
xurl post "첫 트윗 내용"
```

2. 응답에서 `id`를 추출하여 다음 트윗을 reply로 연결:
```bash
xurl reply PREVIOUS_POST_ID "다음 트윗 내용"
```

3. 모든 트윗이 게시될 때까지 반복한다.

### 에러 처리

- 429 (Rate limit): 30초 대기 후 재시도
- 403 (Auth): `xurl auth status` 확인 안내
- 기타 오류: 에러 메시지와 함께 실패한 트윗 번호를 안내하고 이어서 게시할지 묻는다

## Thread Patterns Reference

다양한 스레드 패턴과 훅 예시는 [references/thread-patterns.md](references/thread-patterns.md)를 참고한다.
