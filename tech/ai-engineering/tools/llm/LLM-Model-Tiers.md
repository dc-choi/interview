---
tags: [ai, llm, cost, model-selection]
status: done
verified_at: 2026-09-30
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Model Tiers", "모델 티어 선택", "모델 라우팅", "Model Routing"]
---

# LLM 모델 티어 선택 (Model Tiers & Routing)

같은 모델 패밀리가 성능과 단가가 다른 여러 티어로 나뉘어 출시되는 구조, 그리고 작업마다 어느 티어로 보낼지 고르는 엔지니어링 결정. LLM으로 프로덕션을 만들 때 비용의 대부분이 여기서 갈린다. 가장 비싼 모델을 모든 호출에 쓰는 것은 거의 항상 과지출이다.

## 티어가 수렴하는 기본 3단 구조

주요 벤더의 모델 라인업은 대체로 세 층을 기본형으로 수렴하고 그 위에 최상위 티어가 얹히는 벤더도 있다.

| 티어 | 성격 | 쓰는 곳 |
|---|---|---|
| 플래그십 | 가장 강한 추론, 장기 계획, 에이전트 | 어려운 추론, 멀티스텝 에이전트, 정확도가 비용보다 중요한 경로 |
| 균형형 | 일상 업무용, 플래그십 대비 큰 폭 저렴 | 대부분의 프로덕션 트래픽, 일반 생성, 요약 |
| 저비용형 | 가장 빠르고 가장 싼 | 분류, 추출, 라우팅, 단순 변환, 대량 배치 |

벤더별 매핑 예: 2026-09-29 Codex 모델 문서 기준 OpenAI는 GPT-6 Astra를 가장 강한 모델로, GPT-6 Sol(복잡한 코딩과 에이전트 작업)과 GPT-6 Luna(범위가 분명한 대량 반복 작업)를 권장 모델로 안내한다. 이전 세대 GPT-5.6 Sol, Terra, Luna는 롤아웃 기간 동안 유지된다. Anthropic은 Opus, Sonnet, Haiku에 더해 2026년부터 Opus 위에 Fable/Mythos 최상위 티어가 생겨 4층이 됐다 ([[Claude-Fable-5-Mythos-5|Fable 5, Mythos 5]]). [[Claude-Opus-5|Opus 5]]가 Fable 5의 절반 단가로 근접 성능을 내는 것은 한 티어 아래가 윗 티어를 따라잡는 단가 패턴의 실측 사례다. 2026-09-30 공식 모델 개요 기준 현재 모델은 Fable 5.1(100만 토큰당 입력 $10, 출력 $50), Opus 5.5($4, $20), Sonnet 5.5($2, $10), Haiku 4.5($1, $5)이고 컨텍스트는 Haiku 4.5만 200K, 나머지는 1M이다. 공식 안내는 대부분의 작업을 Opus 5.5로 시작하고, 어려운 추론과 장기 에이전트 작업이나 Opus 5.5를 높은 effort로 돌려도 eval이 모자랄 때 Fable 5.1을 쓰라는 것이다. 대부분의 작업에서 Opus 5.5가 Fable 5.1 수준이라는 벤더 발표도 같은 패턴을 잇는다. Google은 Gemini Pro, Flash 계열. 이름은 달라도 capability/cost 축에서 같은 자리를 차지한다.

## 티어 간 트레이드오프

- **단가**: 상위 티어보다 하위 티어가 저렴하지만 가격 차이는 벤더와 세대마다 다르다. 티어 이름만 보고 절반이라고 가정하지 말고, 선택 시점의 공식 단가와 eval 결과를 함께 비교한다.
- **지연**: 작은 티어일수록 빠르다. 사용자 대면 실시간 경로(자동완성, 채팅 첫 토큰)는 지연이 품질만큼 중요하다.
- **능력 게이팅**: 최상위 추론 강도(max reasoning effort)나 특수 모드는 플래그십에서만 열리는 경우가 있다. 즉 일부 능력은 돈을 더 낸다고 아무 티어에서나 살 수 없고, 티어 자체를 올려야 한다.
- **재작업 비용**: 호출 단가만 보면 하위 티어가 싸지만, 복잡한 작업에서는 근거 없는 내용을 사실처럼 쓰거나 스스로 점검하지 못하고 중간에 멈춰 사람이 뒷수습하는 비용이 붙는다. 반대로 스펙이 확정된 단순 반복 구현(CRUD, 정해진 양식의 보고서)에 상위 티어를 쓰면 비용만 늘고 결과가 더 좋지도 않다. 초기 오류를 막는 일이 중요하고 디버깅이 비싼 작업은 상위 티어와 높은 effort를, 스펙이 분명하고 속도가 중요한 작업은 하위 티어를 먼저 고른다. 경험칙이므로 같은 과업의 품질, 시간, 비용으로 확인한다.
- **effort는 두 번째 손잡이**: 같은 모델 안에서도 effort가 사고뿐 아니라 텍스트와 도구 호출을 포함한 출력 토큰 전체의 성향을 바꾼다. 적응형 사고(adaptive thinking)는 모델이 요청마다 생각할지와 얼마나 생각할지를 스스로 정하는 방식이고 effort가 그 성향을 조절한다. 공식 문서는 낮은 effort를 서브에이전트처럼 단순하고 빠른 작업에 권하고, effort를 엄격한 예산이 아닌 행동 신호로 설명한다. 티어를 내리기 전에 effort를 먼저 조정해 볼 수 있다.

## 모델 라우팅 (티어 선택 패턴)

엔지니어링 결정에서는 작업 난이도에 따라 티어를 분기하는 데 초점을 둔다.

- **난이도 기반 라우팅**: 쉬운 작업(분류, 추출, 포맷 변환)은 저비용형, 일반 작업은 균형형, 어려운 추론, 장기 계획, 도구 다수를 쓰는 에이전트만 플래그십.
- **단계 내 혼합**: 한 파이프라인 안에서도 단계마다 티어를 다르게. 예를 들어 라우터, 의도 분류는 저비용형으로 거르고, 최종 답변 생성만 상위 티어로.
- **에스컬레이션**: 저비용형으로 먼저 시도하고 신뢰도, 검증 실패 시에만 상위 티어로 재시도. 평균 비용은 싼 티어에 수렴하고 어려운 경우만 비싸게 푼다.
- **폴백**: 상위 티어가 가용성, 레이트리밋에 걸리면 하위 티어로 강등해 가용성을 지킨다.

라우팅의 전제는 측정이다. "플래그십이 항상 낫다"를 가정하지 말고, 우리 과업의 [[LLM-Eval-Strategy|eval]]로 하위 티어가 합격선을 넘는지 확인한 뒤 가장 싼 합격 티어로 내린다. 능력이 남는 티어를 쓰는 것은 [[Productivity-Business-Ceiling|영양과다 비타민]]과 같은 낭비다.

## 프런티어 모델의 단계적 출시

최상위(프런티어) 모델은 전체 공개 전에 제한적으로 먼저 푸는 패턴이 자리 잡았다.

- **한정 프리뷰**: 출시 초기에는 API, 코딩 도구를 통해 소수의 신뢰 파트너, 조직(수십 곳 규모)에만 먼저 개방하고 수 주 뒤 일반 공개.
- **정부 협력**: 능력과 출시 계획을 사전 공유하고 그 요청에 따라 제한 프리뷰로 시작하기도 한다. 사이버 보안, 에이전트 능력이 오를수록 오남용 리스크 관리가 출시 절차에 들어온다.
- **출시 전 안전 평가**: 인적 레드팀과 대규모 자동 보안 테스트(수십만 시간 규모)를 출시 전에 돌리고 그 수치를 공개해 신뢰를 확보한다.
- **다층 안전장치와 이중 용도 오탐**: 모델 학습 안전장치 + 실시간 오용 분류기(고위험 시 생성 일시 중단 후 상위 모델 검토) + 계정 수준 검토 + 차등화된 액세스를 겹쳐 운영한다. 부작용으로 프리뷰 기간에는 **정당한 방어 목적 보안 작업(코드 검토, 취약점 연구, 패치 개발)도 간헐적으로 차단되거나 응답이 지연될 수 있다** — 공격과 방어가 처음엔 비슷해 보이는 이중 용도 영역의 구조적 한계.

엔지니어 관점의 함의: 최신 플래그십은 발표 직후 곧바로 프로덕션에 못 쓸 수 있다(프리뷰 게이팅). 모델 가용성, 접근 등급을 의존성으로 보고, 미가용 시 직전 세대나 하위 티어로 돌아갈 폴백 경로를 미리 둔다. 보안 도메인 워크로드는 안전장치 오탐에 의한 차단과 지연도 가용성 변수로 계산에 넣는다.

## 티어별 역할 분리와 상호 검토

코딩 에이전트에서는 라우팅이 호출 단위가 아니라 역할 단위로 나타난다. 상위 티어가 요구사항 해석, 계획, 최종 리뷰와 통합을 맡고, 하위 티어가 코드 탐색, 구현, 테스트와 자료 조사처럼 범위가 좁고 반복적인 일을 맡는다. 질문이 어떤 모델이 가장 좋은가에서 어떤 일을 어떤 모델에 맡기는가로 바뀐다.

- **구성 수단(Codex 기준)**: 커스텀 에이전트는 `~/.codex/agents/`(개인)나 `.codex/agents/`(프로젝트)에 TOML 파일 하나당 하나씩 정의하고, 파일 안에 `model`, `model_reasoning_effort`, `sandbox_mode`를 둘 수 있다. 전역 기본값은 `config.toml`의 `[agents]`(`default_subagent_model`, `default_subagent_reasoning_effort`)이고, 아무것도 지정하지 않으면 서브에이전트는 부모의 모델과 추론 수준을 상속한다. 언제 위임할지는 AGENTS.md나 SKILL.md에 적어 두면 Codex가 따른다. 공식 예시도 읽기 전용 탐색 에이전트에 `gpt-6-luna`, 리뷰 에이전트에 `gpt-6-sol`을 배정하며, 같은 문서는 GPT-6 Sol과 GPT-6 Luna를 기본 선택지로 안내하고 GPT-5.6 계열은 롤아웃 기간 동안 유지한다고 밝힌다(2026-09-29 공식 문서 확인)
- **구성 수단(Claude Code 기준)**: `opusplan` 별칭은 plan 모드에서 Opus, 실행에서 Sonnet으로 자동 전환해 계획과 구현의 모델을 나눈다. 공식 도움말은 Opus가 턴당 Sonnet의 몇 배를 쓰고 Sonnet은 Haiku보다 많이 쓴다며 계획은 Opus, 실행은 Sonnet을 권한다. 2026-09-30 API 단가로는 Opus 5.5가 Sonnet 5.5의 2배, Fable 5.1이 Opus 5.5의 2.5배이고, 실제 소비는 effort와 사고 토큰에 따라 달라진다. 서브에이전트는 정의 파일의 `model` 필드로 따로 고른다([[Claude-Code-Extension-Reference|확장 메커니즘]])
- **상위 지휘, 하위 실행**: 공개된 오케스트레이터 사례는 탐색, 구현, 조사, 테스트를 하위 티어 에이전트가 차례로 맡고, 독립 리뷰와 최종 통합을 상위 티어가 맡는 순서를 쓴다. 역할 파일, AGENTS.md와 호출용 스킬을 한 묶음으로 배포하는 형태다
- **서로 다른 모델의 교차 검토**: 한 모델이 계획을 쓰면 다른 벤더 모델이 승인할 때까지 계획을 검토하고, 저가 모델이 구현한 뒤 계획 작성 모델이 변경분 전체를 읽고 고친다. 마지막에 검토 모델이 계획 대비 코드를 승인할 때까지 다시 본다. 프레임워크나 MCP 없이 CLI를 부르는 셸 스크립트 하나로 만든 사례가 있고, 효과의 원천은 도구 개수보다 서로 검토하게 만드는 구성이라는 주장이다. 구현과 리뷰를 서로 다른 에이전트 제품에 나눠 맡기는 경험칙도 같은 계열이다
- **반대 방향 조합**: 최상위 모델의 사용량이 제한될 때 한 단계 아래 모델로 스펙, 구현 계획, 테스트 계획 문서까지 만들고, 그 문서를 상위 모델에 넣어 구현만 맡긴다. 비싼 토큰을 문서로 확정한 결정의 실행에만 쓰는 방식이다

한계와 반론:

- 서브에이전트는 각자 모델과 도구를 돌리므로 같은 작업의 단일 에이전트 실행보다 토큰을 더 쓴다(공식 문서). 병렬 쓰기 작업은 충돌과 조정 비용이 커서 공식 문서도 탐색, 테스트, 요약 같은 읽기 위주 작업부터 병렬화하도록 권한다
- 모델이 바뀌는 경계마다 프롬프트 캐시를 이어 쓰기 어렵고, 하위 티어 결과를 상위 티어가 다시 정리하는 부담이 커서 단일 모델을 중간 추론 수준으로 쓰는 편이 실제로 빠르고 효율적이었다는 사용자 경험도 많다
- 위 효과는 모두 개별 사례의 주장이고 측정 조건이 공개되지 않았다. 도입 전에 같은 과업에서 단일 모델 대비 품질, 시간과 비용을 [[LLM-Eval-Strategy|eval]]로 비교한다

역할과 검토 루프를 모델 밖의 구조로 고정하는 관점은 [[Harness-Engineering|하네스 엔지니어링]], 서브에이전트가 도구 호출 루프 위에서 도는 방식은 [[Codex-Agent-Execution-Model|Codex 동작 원리]]에서 다룬다.

## 체크포인트

- 모든 호출을 플래그십으로 보내고 있지 않은가. 작업 난이도별로 티어를 나눴는가.
- 하위 티어가 우리 eval 합격선을 넘는지 측정했는가, 아니면 막연히 비싼 걸 쓰는가.
- 사용자 대면 실시간 경로에서 지연 예산을 티어 선택에 반영했는가.
- 상위 티어 미가용, 레이트리밋 시 강등, 폴백 경로가 있는가.
- 쓰려는 최신 모델이 일반 공개됐는가, 아직 한정 프리뷰인가.
- 역할별로 티어를 나눴다면 단일 모델 대비 이득을 같은 과업으로 측정했는가, 캐시 손실과 결과 정리 비용까지 셈했는가.

## 사례

2026년 6월 OpenAI는 GPT-5.6 세대를 Sol(플래그십), Terra(균형형, 직전 세대 수준 성능을 약 2배 싸게), Luna(저비용형)의 3티어로 공개했다. 출시 초기에는 미국 정부와 계획을 공유한 뒤 약 20곳의 신뢰 파트너에게만 API, 코딩 도구로 한정 개방하고, 출시 전 70만 A100 시간 이상의 자동 레드팀 테스트를 거쳤다고 밝혔다. 3단 티어 구조와 프런티어 단계적 출시가 함께 나타난 사례다. 세 모델 모두 `none`부터 `max`까지 같은 추론 수준을 지원하므로 Sol을 구분하는 것은 추론 강도 게이팅이 아니라 성능과 단가다. `ultra`는 GPT-5.6 API 기능이 아니라 Codex 실행 모드다.

- **명명 체계 명시화**: 숫자 = 모델 세대, Sol/Terra/Luna = 독립 개발 주기를 갖는 지속적 성능 등급 — 티어 구조가 브랜드 규칙으로 고정됨
- **출시 당시 가격 (2026-06, 1M 토큰)**: Sol 입력 $5 / 출력 $30, Terra $2.50 / $15, Luna $1 / $6. 이후 가격은 바뀔 수 있는 출시 스냅샷이다.
- **현재 공식 가격 (2026-09-04 확인, 1M 토큰)**: Sol 입력 $4 / 출력 $20, Terra $2 / $12, Luna $0.20 / $1.20. Luna처럼 티어 간 차이가 절반보다 훨씬 큰 경우도 있으므로 공식 가격을 다시 확인한다.
- **추론과 실행 모드**: `max` 추론과 Responses API의 Multi-agent 베타는 Sol, Terra와 Luna 모두 지원한다. 품질 우선의 별도 API 실행 모드는 `reasoning.mode: "pro"`이고 Codex의 `ultra`와 구분한다
- **캐싱 요금 구조 변화**: 명시적 캐시 중단 지점 + 최소 30분 유지, **캐시 쓰기가 기본 입력의 1.25배 과금**(읽기는 90% 할인 유지) — 캐시를 쓸수록 무조건 이득이 아니라 재사용률이 손익분기를 정하는 구조로
- **서드파티 고속 서빙**: 전용 하드웨어 사업자(Cerebras)를 통한 초당 750토큰 제공 — 서빙 속도가 별도 경쟁 축으로 분리

## 관련 문서

- [[LLM-Eval-Strategy|LLM Eval 전략]] — 어느 티어가 합격선을 넘는지 측정
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]] — 단계별 모델 분기, 데이터 vs 모델
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]] — Lazy Load, 고가용성, 폴백
- [[LLM-Market-Landscape|생성형 AI 시장 경쟁 구도]] — 벤더 구도, 가격 경쟁
- [[Harness-Engineering|하네스 엔지니어링]] — 역할 분리와 검토 루프의 구조화
- [[Codex-Agent-Execution-Model|Codex 동작 원리]] — 서브에이전트와 도구 호출 루프

## 출처

- [오픈AI, 차세대 AI 'GPT-5.6' 공개, 정부 승인 파트너만 우선 사용 — 리드경제](https://www.leadeconomy.co.kr/news/articleView.html?idxno=8339)
- [Previewing GPT-5.6 Sol: a next-generation model — OpenAI](https://openai.com/index/previewing-gpt-5-6-sol/)
- [차세대 모델 GPT-5.6 Sol 미리 살펴보기 (한국어판) — OpenAI](https://openai.com/ko-KR/index/previewing-gpt-5-6-sol/)
- [OpenAI API, Compare models](https://developers.openai.com/api/docs/models/compare) (2026-09-04 가격 확인)
- [OpenAI API, Models](https://developers.openai.com/api/docs/models) (2026-09-04 플래그십 확인)
- [OpenAI API, GPT-5.6 모델 가이드](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI API, GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [Anthropic Platform Docs, Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) (Anthropic 라인업, 티어별 가격, 2026-09-30 현재 모델 확인)
- [Anthropic Platform Docs, Effort](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Anthropic Platform Docs, Steering thinking](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost)
- [Introducing Claude Opus 5.5 — Anthropic](https://www.anthropic.com/claude-opus-5-5)
- [Claude Code Docs, Model configuration](https://code.claude.com/docs/en/model-config) (opusplan 확인)
- [Claude Help Center, Models, usage, and limits in Claude Code](https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code)
- [OpenAI Codex, Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) (2026-09-29 커스텀 에이전트 설정 확인)
- [OpenAI Codex, Models](https://learn.chatgpt.com/docs/models) (2026-09-29 GPT-6 Sol, Luna 확인)
- [Codex 역할 분리 오케스트레이터 소개 — Threads, vibe.itji](https://www.threads.com/@vibe.itji/post/Dc-WSSBD9Os)
- [서로 검토하는 멀티 모델 코딩 파이프라인 — Threads, claudical_official](https://www.threads.com/@claudical_official/post/Daw9YLkD3qu)
- [기획은 하위 모델, 구현은 상위 모델 — Threads, dev.inniverse](https://www.threads.com/@dev.inniverse/post/Dac6StsCbgH)
- [인프런, 널널한 개발자, 앤트로픽 AI 모델별 특징](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498589)
