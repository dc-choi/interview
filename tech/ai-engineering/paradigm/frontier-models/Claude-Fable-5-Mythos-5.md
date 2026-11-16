---
tags: [ai, llm, claude, api, availability]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Claude Fable 5", "Claude Mythos 5", "Fable 5", "Mythos 5", "적응형 사고", "거부 폴백 과금", "모델 가용성 리스크", "defense in depth"]
verified_at: 2026-09-03
---

# Claude Fable 5, Mythos 5

Claude Fable 5는 가장 널리 출시된 라인 중 최상위 성능 모델로, 까다로운 추론과 장기 에이전트 작업을 겨냥한다. Claude Mythos 5는 같은 기능을 공유하되 안전 분류기가 없고, 출시 때는 Project Glasswing 승인 고객에게만 제한 제공됐다(2026-10 기준 제공 조건은 아래에 적는다). 두 모델은 사양과 가격이 같고, 기존 Claude 모델과 다른 몇 가지 새 API 동작을 도입했다.

2026-07-21 공식 문서 기준 Fable 5 접근은 복구돼 일반 제공 중이고, Mythos 5는 제한된 고객에게 제공된다. 아래 접근 중단 사례는 현재 상태가 아니라 2026-06의 일시적 사건 기록이다.

2026-09-30 공식 모델 개요 기준 당시 최상위 모델은 후속인 Fable 5.1(2026-09-01 출시, 같은 입출력 가격, 캐시 읽기 단가 4분의 1)과 Project Glasswing 한정 Mythos 5.1이었고, Fable 5는 legacy로 제공됐다. 이 문서는 Fable 5 기준 기록이며 5.1로 옮길 때의 변경점은 공식 마이그레이션 가이드를 따른다. 2026-11-09 나온 5.2 세대의 변경점은 아래 [[#5.2 세대의 변경점 (2026-11-16 확인)|별도 절]]에 적는다.

2026-10-06 Anthropic은 Cyber Verification Program을 세 가지 접근 등급으로 넓혀 각 등급에 Mythos 5.1을 포함하고, 기존 Project Glasswing 참여 조직을 Specialized Access 등급으로 옮긴다고 밝혔다. 2026-10-27 공식 모델 페이지는 Mythos 5와 Mythos 5.1을 이런 Anthropic 검증 프로그램을 통과한 조직에만 제공한다고 적고, 두 모델의 상태를 Active로 표시한다.

## 모델 라인업

| 모델 | API ID | 위치 |
|---|---|---|
| Claude Fable 5 | `claude-fable-5` | 일반 출시 플래그십, 최고 성능, 안전 분류기 포함 |
| Claude Mythos 5 | `claude-mythos-5` | Fable 5와 같은 기능, 안전 분류기 없음, 출시 때 Project Glasswing 한정(2026-10 기준 Anthropic 검증 프로그램 통과 조직), Mythos Preview 후속 |

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

거부는 4xx/5xx 예외가 아니라 정상 응답의 한 종료 사유다. 따라서 에러 핸들러가 아니라 응답 분기 로직에서 처리한다. 기존 통합이 `stop_reason`을 `end_turn`, `tool_use` 정도만 분기했다면 `refusal` 케이스를 새로 추가해야 한다.

### 폴백 (fallback)

거부된 요청은 보통 다른 Claude 모델이 처리할 수 있다. 재시도 경로는 세 가지다.

| 방식 | 동작 | 비고 |
|---|---|---|
| 서버 측 | `fallbacks` 파라미터를 넘기면 API가 대신 재시도 | Claude API 베타 (Bedrock, Vertex, Foundry 미지원) |
| 클라이언트 측 | SDK 미들웨어로 클라이언트에서 재시도 | 모든 Anthropic SDK. 공식 예제는 Python, TypeScript, C#, Go, Java, PHP와 Ruby |
| 수동 | 직접 재시도 구현 | 모든 플랫폼, 모든 언어 |

### 과금 (billing)

출력이 생성되기 전에 거부되면 과금되지 않는다. 다른 모델로 재시도할 때는 폴백 크레딧이 전환에 따른 프롬프트 캐시 비용을 환불해 같은 비용을 두 번 내지 않게 한다.

## 적응형 사고 상시 적용

적응형 사고(adaptive thinking)가 Fable 5와 Mythos 5의 유일한 사고 모드다. `thinking` 파라미터를 주지 않아도 항상 적용되고, `thinking: {"type": "disabled"}`는 지원하지 않는다. 사고 깊이와 비용은 `effort` 파라미터로 제어한다. (이 절은 Fable 5, Mythos 5 전용이며, 2026-06 출시 시점의 Opus 4.x, Sonnet, Haiku의 Messages API 동작은 바뀌지 않았다. 이후 출시된 [[Claude-Opus-5|Opus 5]]는 사고 기본 켜짐 등 자체 변경을 도입했다.)

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

## 모델 가용성은 외생 리스크다

모델의 가용성은 기술적 안정성과 별개로 규제, 정책, 벤더 결정 같은 외생 변수에 노출된다. 한 frontier 모델이 수출 통제나 안전 이슈로 전 고객에게서 동시에 회수될 수 있고, 이는 프로덕션 통합에서 단일 모델 하드 의존을 운영 리스크로 만든다.

회수만이 아니라 접근, 과금 조건도 외생적이다. 벤더가 과금 모델이나 사용 경로를 바꾸면 같은 모델이라도 비용과 통합 방식이 흔들린다. 2026-06 Claude 구독으로 쓰던 Agent SDK와 claude -p, Agent SDK 기반 서드파티 앱(예: Conductor)을 전용 월간 크레딧으로 분리하려던 과금 변경이 시행 직전 무기한 보류된 적이 있다. 같은 모델이라도 접근과 과금 조건은 벤더 정책에 묶여 있다는 신호다.

설계 함의:

- 모델 추상화 계층을 둬서 모델 ID를 코드 전반에 직접 박지 않는다
- 폴백 사다리(서버 측, 클라이언트 측, 수동)를 비용 절감만이 아니라 가용성 연속성 차원에서도 정당화한다
- 멀티 프로바이더(Claude API, AWS Claude Platform, Bedrock, Vertex AI, Microsoft Foundry)로 단일 통제점 리스크를 분산한다

### jailbreak 대응 — defense in depth

안전 분류기의 강도와 jailbreak 대응은 완벽한 차단이 불가능하다는 전제에서 설계된다. 가드레일(특정 주제를 거부하는 분류기)은 숙련된 공격자에겐 보안 경계가 아니라 과속 방지턱에 가깝다 — 미숙한 다수를 늦출 뿐 결연한 적을 막지는 못한다. 그래서 가드레일 강도를 단일 방어선으로 신뢰하지 않고 다층으로 감싼다. 전략은 세 가지다. 공격 경로를 매우 좁고 생산 비용이 높게 만들고, 모니터링으로 빠르게 탐지하고 완화하며, 일정 기간 데이터 보존(Fable 30일)으로 사후 연구를 가능케 한다. 출시 전에는 정부, 영국 AISI, 제3자 기관과 수천 시간의 red-team을 거친다. 같은 보안 철학이 [[Production-Agent-Architecture-Guardrails#Defense in Depth (4겹 안전망)|프로덕션 에이전트 아키텍처]]의 Defense in Depth 4겹, [[LLM-Eval-Strategy|LLM 평가 전략]]의 red-team에 흐른다.

사례:

- 2026-06 Fable 5가 정부의 수출 통제 지시로 전 고객 접근이 일시 중단됐다. Fable 5는 사이버, 생물, 화학 영역 가드레일을 얹은 Mythos이므로, 그 가드레일을 우회하면 사실상 가드레일 없는 Mythos의 공격적 사이버 역량에 닿는다는 게 규제 측 우려였다. 벤더와 다수 보안 연구자는 비슷한 수준의 역량이 다른 파운데이션, 오픈소스 모델에도 있어 이 모델 하나만 막아도 실질 위험은 줄지 않고 방어자(레드팀, 보안 감사)에게서 도구만 뺏는다고 반박했다. 이후 접근은 복구됐고 Fable 5는 일반 제공 상태가 됐다. 이 사건의 핵심은 현재 가용성이 아니라 frontier 모델의 접근이 기술 결함 외 규제와 벤더 결정으로도 일시 중단될 수 있다는 운영 리스크다.

## 5.2 세대의 변경점 (2026-11-16 확인)

2026-11-09 Claude Fable 5.2(`claude-fable-5-2`)와 Claude Mythos 5.2(`claude-mythos-5-2`)가 나왔다. 아래는 발표문, 모델 개요, 가격표, 릴리스 노트와 fast mode 문서를 대조한 내용이며 이 문서의 나머지 절은 다시 검증하지 않았다.

- **두 모델의 관계**: 같은 기반 모델이다. Fable 5.2는 사이버보안과 생물학 오용을 막는 안전장치를 달아 모든 플랜과 플랫폼에 제공하고, Mythos 5.2는 그 일부가 없는 상태로 Anthropic 검증 프로그램(Cyber Verification, Life Sciences Verification)을 통과한 조직에만 제공한다.
- **사양과 가격**: 두 모델 모두 100만 토큰 컨텍스트, 최대 출력 128k, 적응형 사고 상시 적용이다. 가격은 100만 토큰당 입력 $8, 출력 $40으로 5.1($10, $50)보다 내렸고 Opus 5.5($4, $20)의 2배다. 캐시 읽기는 $0.20이다. API의 기본 effort는 high이고 Claude 앱과 Claude Code의 기본은 medium이다.
- **속도**: 출력 생성이 5.1보다 최대 30% 빠르다고 발표했다. fast mode는 출력 토큰 속도를 최대 2.5배로 올리고 단가는 기본의 2배(입력 $16, 출력 $80)다. API에서는 `speed: "fast"`로 켜며 Batch API와 함께 쓸 수 없다.
- **차단과 폴백**: Fable 5.2의 분류기는 침투 테스트, 익스플로잇 생성 같은 고위험 사이버 작업과 생물학 연구 과제 대부분을 막는다. 막힌 질의는 사이버보안이면 Opus 4.8, 생물학이면 Opus 5로 넘어가고 API 고객은 Fallback API로 이를 설정한다. 차단은 5.1보다 약 55% 줄었다고 발표했다.
- **의도적으로 낮춘 영역**: 가속기 커널 최적화와 LLM 아키텍처 개선 같은 AI 연구개발 영역에서는 두 모델 모두 Opus 5.5 수준으로 동작하도록 제한했다.
- **다중 에이전트 역할**: 하위 모델이 자문을 구하는 Advisor와 단순 작업을 하위 모델에 넘기는 Orchestrator 두 역할을 안내한다([[LLM-Model-Tiers#티어별 역할 분리와 상호 검토|티어별 역할 분리]]).
- **구독 요금제의 포함 범위**: 2026-11-16 도움말 기준 Free에서는 쓸 수 없다. Max, Ultra, Team과 좌석제 Enterprise의 premium 좌석은 주간 한도의 최대 50%를 Fable에 쓸 수 있는데, 한도가 50% 늘어나는 것이 아니라 다른 모델과 같은 한도를 나눠 쓰며 Fable이 한도를 더 빨리 소진한다. Pro, Team과 좌석제 Enterprise의 standard 좌석은 처음부터 사용량 크레딧으로, 사용량 기반 Enterprise와 API는 API 단가로 과금한다. 발표문은 출시 주간의 추가 사용량으로 구독 기간에 따라 Fable 리셋 1~3회를 주고 Pro와 Team standard 좌석에도 주간 한도의 최대 50%를 포함한다고 적으므로, 이 부분은 한시 출시 프로모션으로 읽는다(이 문서의 해석). Claude Code는 2.1.321 이상이 필요하다.
- **제3자 지수**: 2026-11-16 Artificial Analysis(Intelligence Index v5.0.1)에서 Max 설정이 65점으로 81개 모델 중 1위였고, 과업당 비용은 $26.54로 5.1 Max($12.99)의 약 2배였다. 단가를 내렸는데 과업당 비용이 오른 이유와 추론 강도별 토큰 차이는 [[Model-Release-Claims#비용 절감률은 단가, 토큰 수, 과업당 비용으로 나눈다|모델 발표 수치 읽기]]에 적었다.

발표문의 장기 실행 사례는 공급사 자체 보고로 읽는다. 서브에이전트 1,000개 이상을 8일간 조율해 노트북에서 부팅되는 운영체제 프로토타입을 만들었고, 에이전트 1,000개가 페르마의 마지막 정리를 30시간에 형식화했으며 같은 구성의 Opus 5.5는 18시간에 26%를 끝냈다는 내용이다. 비용, 시도 횟수와 사람의 개입 범위는 이 요약에서 확인하지 못했다. 벤치마크도 FrontierCode 2.0의 49.1%(Xhigh, Opus 5.5는 45.5%)처럼 앞선 지표와 AA-Briefcase, AutomationBench처럼 1위가 아닌 지표가 함께 실려 있다. 발표문은 영국 AI Security Institute와 METR 등 외부 기관의 시험을 거쳤다고 적으면서, 각주에서 이 기관들이 발표문과 시스템 카드를 검토하지 않았고 그 주장에 동의한다는 뜻도 아니라고 밝힌다. 추론 강도를 낮춰 Opus 5.5의 최고 점수와 맞춘 비용 비교는 [[Model-Release-Claims#비용 절감률은 단가, 토큰 수, 과업당 비용으로 나눈다|모델 발표 수치 읽기]]에 둔다.

공개된 시연 영상(게임, 비개발자가 대화만으로 만들었다는 대형 프로젝트, 설계 규칙 검사(DRC)를 통과했다는 기판 설계)은 그런 결과가 한 번은 나왔다는 주장으로 읽는다. 영상은 설계 규칙 검사 통과까지만 말하며, 기판을 실제로 제조했거나 제조 검사를 거쳤다고는 말하지 않는다. 프롬프트 원문, 사람이 고친 범위, 시도 횟수, 쓴 토큰과 비용, 실제로 실행해 본 범위가 공개되지 않으면 재현성과 품질의 근거로 쓰지 않는다([[Model-Release-Claims|모델 발표 수치 읽기]]).

2026-11-10 공개된 개인 글은 조건을 더 밝힌 사례다. 작성자는 조카의 캐릭터 그림과 설계 문서(영웅 5명, 보스 12명, 대략의 줄거리)를 주고 게임을 끝내되 최대한 재미있게 만들고 진행하며 커밋하라는 큰 프롬프트 하나를 잠들기 전에 실행했고, 다음 날 12스테이지 횡스크롤 게임을 받았다. 모델은 6월에 만든 초기 판 코드 대부분을 버리고 다시 썼고, 요청하지 않은 컷신과 엔딩을 더했으며, 헤드리스 브라우저에서 모든 스테이지를 도는 자동 플레이 봇을 스스로 만들어 스크린샷으로 문제를 점검했다(작성자가 사고 기록으로 확인한 내용). 이후 사람이 지시한 수정으로 캐릭터 18명과 4인 플레이까지 늘렸고, 이미지와 음향은 다른 회사의 생성 모델로 만들었다. 한 번의 요청은 첫 실행만 가리키며 프로젝트 전체에는 이틀간 요청 약 600회가 들었다. effort, 요금제, 비용과 첫 실행의 소요 시간은 밝히지 않았고, Opus 5.5로는 시험하지 않아 5.2에서 처음 가능해졌는지는 모른다고 작성자가 적었다. 공개된 토큰 구성과 API 단가 환산은 [[LLM-Prompt-Caching#단가 변경은 워크로드의 토큰 구성으로 환산한다|프롬프트 캐싱]]에 둔다.

## 면접, 적용 포인트

- 거부를 성공 응답의 한 종료 사유로 처리하는 설계 — 가용성과 회복력 관점에서 에러 처리와 분리해 응답 분기에 둔다.
- 폴백 사다리(서버 측, 클라이언트 측, 수동)와 폴백 크레딧 = 비용 이중 지불 없는 모델 전환. [[Production-Agent-Architecture-Eval-and-Operations|고가용성 워커 풀]]에서 리밋, API 에러 시 워커를 교체하는 것과 같은 결.
- `effort` 하나로 사고 깊이와 비용을 동시에 조절하는 단일 손잡이 — 루프 통제와 토큰 경제학의 접점.
- 모델 가용성은 외생 리스크 — LLM 통합에 추상화 계층과 폴백을 두는 근거는 비용만이 아니라 가용성 연속성이다. 규제로 특정 모델이 갑자기 회수되거나 벤더가 과금, 접근 경로를 바꿀 수 있어, 단일 모델 하드 의존을 피하고 멀티 프로바이더로 통제점을 분산한다.

## 관련 문서

- [[Claude-Opus-5|Claude Opus 5 (하위 티어 — 절반 가격에 근접 성능, 같은 refusal 처리 패턴)]]
- [[LLM-Abstention|LLM Abstention (모른다고 말하는 능력 — refusal과 층위 구분)]]
- [[Production-Agent-Architecture-Eval-and-Operations|프로덕션 에이전트 아키텍처 (폴백 = 고가용성 워커 풀)]]
- [[Harness-Engineering|하네스 엔지니어링 (effort, task budget = 루프 통제 손잡이)]]
- [[Context-Engineering|컨텍스트 엔지니어링 (압축, 컨텍스트 편집)]]
- [[LLM-Eval-Strategy|LLM 평가 전략 (red-team, 안전 게이트 평가)]]
- [[연령신원검증(AgeIdentityVerification)|연령/신원 검증 (사용자 신원 게이팅 — 접근 제어의 또 다른 외생 리스크)]]
- [[Evaluator-Guided-Program-Search|평가기 주도 프로그램 탐색 (Mythos 5의 양자 회로 설계 연구 사례)]]

## 출처

- [Claude Fable 5 및 Claude Mythos 5 소개 — Anthropic](https://platform.claude.com/docs/ko/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
- [Refusals and fallback — Anthropic](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
- [Fable 5와 Mythos 5 접근에 관하여 — Anthropic](https://www.anthropic.com/news/fable-mythos-access)
- [Anthropic Is Still at Odds With the White House Over Claude Fable 5 — WIRED](https://www.wired.com/story/anthropic-is-still-at-odds-with-the-white-house-over-claude-fable-5/)
- [Claude Fable 5.1 — Anthropic](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Models overview — Anthropic](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Claude Mythos 5 — Anthropic](https://platform.claude.com/docs/en/models/mythos-5/overview) — 2026-10-27 제공 조건과 상태
- [Claude Mythos 5.1 — Anthropic](https://platform.claude.com/docs/en/models/mythos-5-1/overview) — 2026-10-27 제공 조건과 상태
- [Introducing Claude Fable 5.2 and Claude Mythos 5.2 — Anthropic](https://www.anthropic.com/claude-fable-and-mythos-5-2) — 2026-11-09 발표(11-11 수정), 2026-11-16 두 모델의 관계, 안전장치와 폴백, 장기 실행 사례와 벤치마크 대조
- [Release notes — Anthropic](https://platform.claude.com/docs/en/release-notes/overview) — 2026-11-09 항목의 모델 ID, 컨텍스트와 출력 한도
- [Pricing — Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) — 2026-11-16 5.2 단가, 캐시 읽기와 fast mode 단가
- [Fast mode — Claude Code Docs](https://code.claude.com/docs/en/fast-mode) — 2026-11-16 지원 모델과 속도 표기
- [Claude Fable 5.2의 놀라운 능력 — YouTube, Play with AI Lab](https://www.youtube.com/watch?v=CEhHU78dlQE) — 2026-11-14 공개, 2026-11-16 음성 인식 전사 전체 확인. 시연 열 건의 소개이며(한 건은 공급사의 로보틱스 랩으로 소개) 개별 시연의 수치와 제작 과정은 대조하지 못해 반영하지 않았다
- [Project Glasswing — Anthropic](https://www.anthropic.com/glasswing) — 2026-10-06 Cyber Verification Program 개편과 Glasswing 참여 조직의 등급 이전
- [Claude Fable models on your plan — Claude Help Center](https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan) — 2026-11-16 요금제별 포함 범위, 크레딧 과금과 Claude Code 최소 판 확인. 발표문의 출시 주간 프로모션 문구와 함께 대조
- [Claude Fable 5.2 (Max, Default Fallback) Intelligence, Performance & Price Analysis — Artificial Analysis](https://artificialanalysis.ai/models/claude-fable-5-2) — 2026-11-16 열람, 지수, 순위와 과업당 비용
- [Fable 5.2 One-Shotted My Nephew's Dream Game — Notes by Lex](https://notesbylex.com/fable-5-2-one-shotted-my-nephews-dream-game) — 2026-11-10, 시작 조건, 자동 플레이 점검, 요청 수와 토큰, 밝히지 않은 조건 대조
- [Claude Fable 5.2와 Mythos 5.2 - 복잡한 코딩과 과학 연구 역량을 강화한 AI 모델 — GeekNews](https://news.hada.io/topic?id=36896) — 학습 계기. 5.2 절은 이미 발표문으로 대조돼 있어 외부 기관 각주와 요금제 문구만 더 대조했다
- [Fable 5.2, 조카가 꿈꾸던 게임을 한 번의 요청으로 구현 — GeekNews](https://news.hada.io/topic?id=36929) — 학습 계기
