---
tags: [senior, ai, llm, claude, api]
status: done
category: "시니어역량(SeniorEngineer)"
aliases: ["Claude Fable 5", "Claude Mythos 5", "Fable 5", "Mythos 5", "적응형 사고", "거부 폴백 과금"]
---

# Claude Fable 5, Mythos 5

Claude Fable 5는 가장 널리 출시된 라인 중 최상위 성능 모델로, 까다로운 추론과 장기 에이전트 작업을 겨냥한다. Claude Mythos 5는 동일한 기능을 공유하되 안전 분류기가 없고 Project Glasswing 승인 고객에게만 제한 제공된다. 두 모델은 사양과 가격이 같고, 기존 Claude 모델과 다른 몇 가지 새 API 동작을 도입했다.

## 모델 라인업

| 모델 | API ID | 위치 |
|---|---|---|
| Claude Fable 5 | `claude-fable-5` | 일반 출시 플래그십, 최고 성능, 안전 분류기 포함 |
| Claude Mythos 5 | `claude-mythos-5` | Fable 5와 동일 기능, 안전 분류기 없음, Project Glasswing 한정, Mythos Preview 후속 |

## 사양과 가격 (두 모델 공통)

| 항목 | 값 |
|---|---|
| 컨텍스트 윈도우 | 100만 토큰 (기본) |
| 최대 출력 | 요청당 128k 토큰 |
| 입력 가격 | 100만 토큰당 $10 |
| 출력 가격 | 100만 토큰당 $50 |
| 데이터 보존 | 30일 (Zero Data Retention 불가, Covered Models 지정) |
| 가용 시작 | 2026-06-09 (Claude API, AWS Claude Platform, Amazon Bedrock, Vertex AI, Microsoft Foundry) |

## 거부, 폴백, 과금 (Fable 5 한정)

Fable 5에는 특정 요청을 거부하는 안전 분류기가 들어 있다. Mythos 5에는 없어 이 절은 Fable 5에만 적용된다. Fable 5를 통합에 붙이면 세 가지를 새로 설계해야 한다.

### 거부 (refusal)

분류기가 요청을 거부하면 Messages API는 에러가 아니라 HTTP 200 성공 응답으로 `stop_reason: "refusal"`을 반환한다. 어떤 분류기가 막았는지도 응답에 함께 보고된다.

핵심은 거부가 4xx/5xx 예외가 아니라 정상 응답의 한 종료 사유라는 점이다. 따라서 에러 핸들러가 아니라 응답 분기 로직에서 처리한다. 기존 통합이 `stop_reason`을 `end_turn`, `tool_use` 정도만 분기했다면 `refusal` 케이스를 새로 추가해야 한다.

### 폴백 (fallback)

거부된 요청은 보통 다른 Claude 모델이 처리할 수 있다. 재시도 경로는 세 가지다.

| 방식 | 동작 | 비고 |
|---|---|---|
| 서버 측 | `fallbacks` 파라미터를 넘기면 API가 대신 재시도 | Claude API, AWS Claude Platform 베타 |
| 클라이언트 측 | SDK 미들웨어로 클라이언트에서 재시도 | TypeScript, Python, Go, Java, C# |
| 수동 | 직접 재시도 구현 | 모든 플랫폼, 모든 언어 |

### 과금 (billing)

출력이 생성되기 전에 거부되면 과금되지 않는다. 다른 모델로 재시도할 때는 폴백 크레딧이 전환에 따른 프롬프트 캐시 비용을 환불해 같은 비용을 두 번 내지 않게 한다.

## 적응형 사고 항상 켜짐

적응형 사고(adaptive thinking)가 Fable 5와 Mythos 5의 유일한 사고 모드다. `thinking` 파라미터를 주지 않아도 항상 적용되고, `thinking: {"type": "disabled"}`는 지원하지 않는다. 사고 깊이와 비용은 `effort` 파라미터로 제어한다. (Opus, Sonnet, Haiku의 Messages API 동작은 변하지 않으며 이 절은 Fable 5, Mythos 5 전용이다.)

## 원시 사고는 반환되지 않음

원시 사고 과정은 절대 반환되지 않는다. `thinking.display` 설정이 사고 블록에 담기는 내용을 정한다.

- `summarized` — 추론의 읽기 쉬운 요약을 담은 사고 블록
- `omitted` (기본값) — `thinking` 필드가 빈 사고 블록

같은 모델로 멀티턴 대화를 이어갈 때는 사고 블록을 바꾸지 말고 그대로 다시 전달한다.

## 지원 기능 (출시 시점)

Effort, 작업 예산(task budgets, 베타 헤더 `task-budgets-2026-03-13`), 메모리 도구, 코드 실행, 프로그래밍 방식 도구 호출, 컨텍스트 편집(도구 결과 지우기, 베타 헤더 `context-management-2025-06-27`), 압축(compaction), 비전.

## abstention과 refusal 구분

용어가 비슷해 헷갈리기 쉬우나 층위가 다르다.

- abstention은 모델이 모르거나 근거가 부족해 스스로 답을 유보하는 역량 차원의 문제다 ([[LLM-Abstention]]). 정확도와 독립이며 alignment, 보상 설계로 다룬다.
- refusal은 안전 분류기가 정책상 요청을 차단하는 별개 레이어다. `stop_reason: "refusal"`로 표면화되고, 폴백으로 다른 모델에 재시도할 수 있다.

하나는 모델의 인식론적 한계, 하나는 안전 게이트라는 점에서 원인과 대응이 다르다.

## 면접, 적용 포인트

- 거부를 성공 응답의 한 종료 사유로 처리하는 설계 — 가용성과 회복력 관점에서 에러 처리와 분리해 응답 분기에 둔다.
- 폴백 사다리(서버 측, 클라이언트 측, 수동)와 폴백 크레딧 = 비용 이중 지불 없는 모델 전환. [[Production-Agent-Architecture|고가용성 워커 풀]]에서 리밋, API 에러 시 워커를 교체하는 것과 같은 결.
- `effort` 하나로 사고 깊이와 비용을 동시에 조절하는 단일 손잡이 — 루프 통제와 토큰 경제학의 접점.

## 관련 문서

- [[LLM-Abstention|LLM Abstention (모른다고 말하는 능력 — refusal과 층위 구분)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (폴백 = 고가용성 워커 풀)]]
- [[Harness-Engineering|하네스 엔지니어링 (effort, task budget = 루프 통제 손잡이)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (압축, 컨텍스트 편집)]]

## 출처

- [Claude Fable 5 및 Claude Mythos 5 소개 — Anthropic](https://platform.claude.com/docs/ko/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
