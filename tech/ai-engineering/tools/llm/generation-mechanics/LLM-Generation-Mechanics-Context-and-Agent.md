---
tags: [ai, llm, inference, rag, agent]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Generation Mechanics Context and Agent", "LLM Context와 환각", "LLM 에이전트 전환 지점", "프롬프트 RAG 파인튜닝 선택"]
---

# LLM 동작 원리: Context, 환각과 에이전트

모델 밖의 정보가 어떻게 응답에 들어오고 어디서 환각이 생기며 언제 모델이 에이전트가 되는지를 다룬다. Weight, Context, RAG, Memory의 구분, 프롬프트, RAG와 파인튜닝의 선택과 자주 헷갈리는 점까지다. 상위: [[LLM-Generation-Mechanics|LLM 동작 원리]].

## Weight, Context, RAG와 Memory는 다르다

| 층 | 담는 것 | 언제 바뀌는가 |
|---|---|---|
| **Weight** | 학습된 통계적 패턴과 연관 | Training이나 별도 model update |
| **Context** | 이번 요청의 지침, 대화와 읽어 온 자료 | 추론 호출마다 조립 |
| **RAG와 Tool Result** | 외부 저장소와 시스템에서 가져온 현재 근거 | 조회 후 Context에 추가 |
| **Memory** | Host가 이후 호출에 다시 제공하도록 보존한 정보 | 제품과 설정의 저장, 선택 정책에 따라 다름 |

모델 내부의 Token Embedding은 Token ID를 Transformer 공간에 넣는 표현이다. 검색용 Embedding은 query와 문서 chunk를 유사도 공간에 놓고 외부 자료를 찾는 표현이다. 둘 다 벡터지만 학습 목적, pooling, 공간과 소비자 계약을 확인하지 않고 직접 대체할 수 없다.

## 프롬프트, RAG와 파인튜닝은 바꿀 대상으로 고른다

세 방식은 바꾸는 층이 다르다. 프롬프트와 RAG는 이번 요청의 Context를 바꾸고, 파인튜닝은 Weight나 어댑터를 바꾼다. OpenAI의 정확도 최적화 가이드도 모델이 알아야 할 것을 채우는 Context 최적화와 모델이 행동하는 방식을 맞추는 LLM 최적화를 나누고, 프롬프트에서 시작해 필요하면 둘을 함께 쓰라고 안내한다(2026-10-12 확인).

| 방식 | 바꾸는 것 | 맞는 문제 | 맞지 않는 문제 |
|---|---|---|---|
| 프롬프트와 지침 | 이번 요청의 지시, 예시와 도구 설명 | 형식, 역할과 절차를 지시로 맞출 수 있는 대부분의 작업 | 크고 자주 바뀌는 근거 자료, 대량 반복에서 같은 긴 지시를 매번 보내는 비용 |
| RAG | 질문마다 검색해 넣는 근거 | 자주 바뀌거나 출처가 필요한 지식, 한 번에 넣기에 크거나 길게 넣으면 활용이 떨어지는 자료([[RAG-Retrieval-Engineering\|전체 투입과 검색 비교]]) | 형식과 말투가 흔들리는 문제. 검색이 빗나가면 근거도 빗나간다 |
| 파인튜닝 | Weight 또는 어댑터 | 같은 형식과 행동을 대량으로 반복해 지시를 줄이거나 작은 모델로 내리려는 경우 | 자주 바뀌는 사실의 반영과 출처 제시. 데이터가 바뀌면 재학습과 재평가가 다시 필요하다 |

- **순서**: 평가 기준과 프롬프트 기준선을 먼저 만든다. 지식이 모자라면 RAG를, 행동이 흔들리면 파인튜닝을 검토하며 둘은 함께 쓸 수 있다. RAG 원 논문은 검색 색인을 교체하는 것만으로 재학습 없이 지식을 갱신할 수 있음을 보였다.
- **형식 문제는 구조화 출력부터**: 정해진 JSON 형식을 지키게 하는 일은 스키마를 강제하는 구조화 출력으로 먼저 푼다. 구조화 출력은 형식만 보장하므로 값은 따로 검증한다([[LLM-Failure-Handling-Response-Validation#구조화 출력은 형식만 보장한다|구조화 출력]]).
- **비용 비교**: 파인튜닝의 비용 이득은 매 요청의 긴 지시와 예시를 빼거나 더 작은 모델로 같은 정확도를 낼 때 생긴다. 예를 들어 2,000토큰의 고정 지시를 하루 100만 번 보내면 지시에만 하루 20억 입력 토큰을 쓴다(설명용 산술 예시). 학습 데이터 준비, 학습과 재평가, 기반 모델이 바뀔 때의 재학습 비용을 함께 계산하고, 반복되는 앞부분의 비용은 [[LLM-Prompt-Caching|프롬프트 캐싱]]으로, 토큰 단가는 [[LLM-Model-Tiers|모델 티어 조정]]으로 줄일 수 있는지 비교한다.
- **제공 범위**: 2026-10-12 기준 OpenAI는 셀프서비스 파인튜닝을 줄이고 있다. 2026-05-07부터 파인튜닝 이력이 없는 조직이, 2026-07-02부터는 최근 60일 동안 파인튜닝 모델로 추론하지 않은 조직이 새 학습 작업을 만들 수 없고, 활성 기존 고객도 2027-01-06부터 만들 수 없다. 이미 만든 모델은 기반 모델이 지원 종료될 때까지 추론에 쓸 수 있다. 파인튜닝을 검토하면 벤더의 지원 여부와 기간부터 확인하고, 오픈 가중치 모델은 [[LLM-Generation-Mechanics-Training#LoRA와 QLoRA: 바꾸는 파라미터와 저장 정밀도|LoRA]] 경로를 본다.

## Context Window와 대화 누적

Context Window는 모델이 한 번 응답할 때 참조하는 작업 기억이다. 학습 데이터와는 별개이고, 시스템 프롬프트, 도구 정의, 지금까지의 대화, 도구 결과, 이번 출력(사고 포함)이 모두 이 한도 안에 들어간다.

- **대화는 매 턴 다시 들어간다**: Messages API 기준으로 각 턴의 입력은 이전 대화 전체와 새 메시지이고, 응답은 다음 턴 입력의 일부가 된다. 대화가 길수록 요청마다 처리하는 입력 토큰이 쌓인다. 사고를 쓰는 모델은 컨텍스트에 남은 이전 턴의 사고 블록도 다시 입력 토큰으로 과금된다(Anthropic은 모델별 보존 기본값에 따라 모든 턴 또는 마지막 턴의 사고를 남긴다). 프롬프트 캐싱은 반복되는 앞부분의 요금을 줄일 뿐 윈도를 차지하는 양은 줄이지 않는다 ([[LLM-Prompt-Caching|프롬프트 캐싱]])
- **길수록 좋은 것은 아니다**: Anthropic 문서는 토큰이 늘수록 정확도와 회수가 떨어지는 context rot를 명시한다. 윈도 크기보다 무엇을 넣을지 고르는 일이 품질을 가른다 ([[Context-Engineering|컨텍스트 엔지니어링]])
- **한도에서 일어나는 일**: 입력만으로 윈도를 넘으면 요청이 거부되고, Claude 4.5 이후 모델은 생성 중 한도에 닿으면 `model_context_window_exceeded`로 멈춘다. 긴 에이전트 작업은 이전 대화를 요약하는 압축(compaction)이나 오래된 도구 결과 정리로 이어 간다
- **규모**: 2026-10-12 기준 Anthropic 현재 모델 네 개(Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5)는 모두 1M이고, 레거시로 남은 이전 모델에는 Haiku 4.5처럼 200K인 것도 있다. 1M 토큰은 현재 토크나이저에서 영어 약 55.5만 단어다 ([[LLM-Generation-Mechanics-Decoding|토크나이저 차이]])
- **윈도 크기와 단가 구간은 별개다**: 2026-10-12 공식 가격표 기준으로 Claude 4.6 이후 모델은 Haiku 5.5를 빼면 1M 윈도 전체를 같은 단가로 받는다(900K 요청도 9K 요청과 토큰당 단가가 같다). 2026-10-07 출시된 Haiku 5.5는 프롬프트가 10만 토큰을 넘는 요청 전체에 입력과 출력 모두 5배 단가를 매기고, 이 길이에는 캐시 읽기와 쓰기 토큰도 들어간다([[LLM-Model-Tiers#저비용형으로 내릴 때 확인할 조건|Haiku 5.5 단가 구간]]). 2026-10-06 공식 가격표 기준으로 OpenAI GPT-6 계열도 입력이 272K를 넘는 요청에 긴 컨텍스트 단가가 따로 있다(GPT-6.1 Sol은 100만 토큰당 입력 $2 → $4, 출력 $10 → $15). Gemini 3.1 Pro Preview도 200K를 넘는 프롬프트에 높은 단가를 매긴다(100만 토큰당 입력 $2 → $4, 출력 $12 → $18). 약 20만 토큰짜리 문서를 통째로 넣는 설계라면 윈도에 들어가는지와 함께 어느 단가 구간에 걸리는지도 확인한다
- **실무 함의**: 주제가 바뀌면 세션을 새로 열고, 이어 가야 할 결정과 상태는 파일로 남긴다. 새 세션도 지침 파일과 기록을 읽으면 같은 맥락에서 일을 이어 갈 수 있다 ([[Claude-Code-Fundamentals|Claude Code 컨텍스트 관리]])

## 대화 요약과 별도 기록의 경계

긴 작업을 이어 가는 방법에는 대화를 압축해 다음 컨텍스트로 넘기는 방식과 필요한 사실을 컨텍스트 밖에 기록했다가 읽는 방식이 있다.

| 방식 | 남기는 것 | 주의점 |
|---|---|---|
| 대화 압축 | 이전 대화의 핵심 결정과 미해결 문제 | 과도한 압축은 나중에 필요한 세부를 버릴 수 있음 |
| 구조화된 작업 기록 | 목표, 진행 상태와 의존관계 같은 지속 정보 | 저장만으로 모델에 전달되지 않으며 이후 호출에서 읽어야 함 |

압축은 기존 내용을 줄이는 과정이고 별도 기록은 재사용할 상태를 외부에 보존하는 과정이다. 둘 다 가중치 학습이 아니며, 파일이나 데이터베이스의 저장 용량이 커져도 한 요청의 컨텍스트 한도가 커지지는 않는다.

설계 적용 예로 확정 결정, 미해결 문제와 다음 행동을 따로 기록할 수 있다. 요약이 원문을 대체하는 정본이 되지 않도록 근거 위치를 함께 남기고 중요한 판단에서는 다시 대조한다.

## 왜 환각하는가

다음 Token loss는 학습 분포에 맞는 연속을 보상하지, 생성한 claim의 출처와 사실성을 직접 검증하지 않는다. 다음 조건이 함께 오류를 만든다.

- 학습 데이터가 부정확하거나 오래되고 서로 충돌한다.
- 질문이 애매하거나 Context에 필요한 근거가 없다.
- Weight가 패턴을 일반화하는 과정에서 존재하지 않는 세부를 그럴듯하게 조합한다.
- Retrieval, context packing, Tool Result와 인용 연결이 실패한다.
- Decoding이 낮은 확률 후보를 선택한다. 다만 Greedy도 사실 검증기는 아니다.

RAG, 구조화 Tool 조회, 출처 추적, 결정론적 validator, Eval과 Abstention은 위험을 줄이는 시스템 장치다. RAG도 검색 결과를 Context에 넣을 뿐 Weight를 바꾸지 않으며, 검색 점수가 근거의 진실성을 보장하지 않는다.

## 모델이 에이전트가 되는 지점

```text
Model
├─ Final Answer
└─ Tool Call → Runtime → Tool Result → Context → Model
```

Tool Call은 모델이 생성한 구조화 출력이다. Runtime이 권한을 확인하고 파일, 셸과 외부 API에서 실제 행동을 수행한다. 한 턴에는 도구 호출이 없거나 하나 또는 여러 개일 수 있다.

검증은 기본 LLM이 내장한 성공 보장이 아니다. 지침, 테스트, 출처 확인과 하네스가 별도 정책으로 요구해야 한다. 에이전트 루프는 정상 답변 외에도 오류, 승인 거절, 호출 한도, 예산 상한과 진전 없음으로 끝날 수 있다.

### 숫자 생성과 계산 도구 실행은 다르다

도구 없이 자기회귀 언어 모델이 산술 답을 출력할 때는 풀이와 숫자를 토큰으로 생성한다. 학습한 계산 절차로 맞힐 수 있지만, 내부에서 수많은 행렬 연산을 한다는 사실이 질문의 수식을 계산기로 실행했다는 뜻은 아니다. 산술 능력의 한계와 계산기 API 활용은 Toolformer 연구가 다룬 구분이며, 모든 모델이 산술을 못한다는 결론은 아니다.

계산 도구를 연결하면 모델이 식과 인자를 만들고, Runtime이 계산을 실행한 뒤 결과를 Context로 돌려준다. 아래는 이 경계에 적용할 검증 기준이다.

- **식과 입력:** 원문 수치, 단위와 연산이 질문에 맞는지 확인한다. 도구는 잘못 전달된 식도 그대로 계산할 수 있다.
- **실행 증거:** 도구를 사용했다는 설명과 실제 호출 결과를 구분한다. 호출 실패를 모델이 추정한 숫자로 채우지 않는다.
- **결과 전달:** 도구 출력과 최종 답의 값, 단위와 반올림 조건을 대조한다.

예를 들어 `347 × 28 = 9716`은 설명용 산술 예시다. 특정 모델의 오답 사례나 성능 측정값이 아니다. 정답 숫자만으로 계산 도구 사용 여부를 판단할 수 없다.

### 계산 계획을 검토 가능한 데이터로 둔다

복잡한 계산에서는 모델이 최종 숫자 대신 변수, 연산과 의존관계를 담은 계획을 만들고 실행기가 그 계획을 계산하도록 분리할 수 있다. 사람이 읽는 상위 계획과 기계가 실행할 계산 그래프를 함께 남기면, 요청 해석 오류와 계산 실행 오류를 나눠 조사하기 쉽다.

적용 예로 다음 세 경계를 둔다.

1. **요청에서 계획으로:** 입력값, 기간, 단위와 변경할 변수를 명시한다. 설명 문장과 실행 그래프가 같은 계산을 뜻하는지 대조한다.
2. **계획에서 실행으로:** 허용한 연산과 변수 참조를 검사하고, 실행 결과를 남긴다. 계산 도구가 성공해도 잘못된 산식은 별도 오류다.
3. **실행에서 설명으로:** 보고서가 실행 결과와 같은 값, 단위와 가정을 전달하는지 확인한다. 시나리오 계산을 미래 관측값의 정확성 보장으로 바꾸지 않는다.

핀다의 AWS 공개 발표자료 35~37쪽은 PRism이라는 도메인 특화 표현으로 사용자 시나리오를 계산 함수와 그래프로 옮기는 사례다. 위 검증 경계는 그 구조에 적용한 설계 기준이며 발표 시스템의 전체 구현이나 예측 정확도를 검증한 결과는 아니다. 단순 계산이면 기존 함수와 구조화된 인자로 시작할 수 있고, 별도 언어는 반복되는 도메인 규칙과 검토 필요가 있을 때 검토한다.

## 자주 헷갈리는 점

- 파일을 읽었다고 모델이 즉시 재학습한 것은 아니다. 고정 가중치 추론에서는 Context만 달라진다.
- Attention은 외부 검색이나 사실 조회가 아니라 현재 sequence 표현을 섞는 내부 계산이다.
- Context Window는 Weight나 장기 Memory와 같지 않다.
- 유창한 문장, 긴 reasoning과 높은 모델 점수는 검증된 사실의 증거가 아니다.
- RAG와 Tool Calling은 모델의 지식을 늘리는 학습이 아니라 외부 근거와 행동 수단을 연결한다.
- 모델이 나를 이해하고 기억하는 것처럼 느껴지는 것은 대화 기록과 메모리가 매 요청 Context로 다시 들어가고 그 위에서 다음 토큰을 이어 가기 때문이다. 공감하는 말투는 이해의 증거가 아니고, 모델은 주어진 목표를 향해 사람이 예상하지 못한 경로를 택할 수 있으므로 행동 권한과 검증은 시스템으로 묶는다 ([[Agent-Coding-Guardrails|LLM 코딩 가드레일]]).

## 이해 점검

1. 문서를 읽은 직후 달라지는 것은 Weight인가, Context인가?
2. Token Embedding과 검색용 Embedding은 각각 누가 무엇을 위해 사용하는가?
3. 대화가 길어질수록 요청당 비용과 품질이 함께 나빠질 수 있는 이유는 무엇인가?
4. 자주 바뀌는 사내 규정을 답에 반영해야 할 때 파인튜닝보다 RAG를 먼저 검토하는 이유는 무엇인가?

## 출처

- [Project Taylor: 핀다가 만드는 스타트업 전용 AI CFO, 발표자료 — AWS](https://mkt-kr.s3.ap-northeast-2.amazonaws.com/2025+AI+x+Industry+Week/%EB%B0%9C%ED%91%9C%EC%9E%90%EB%A3%8C/Day3_Track3/D3T3S4_%EA%B3%B5%EC%9C%A0%EC%9A%A9+%EC%B5%9C%EC%A2%85.pdf)
- [Toolformer: Language Models Can Teach Themselves to Use Tools — Schick et al.](https://arxiv.org/abs/2302.04761)
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks — Lewis et al.](https://arxiv.org/abs/2005.11401)
- [Function Calling — OpenAI API](https://developers.openai.com/api/docs/guides/function-calling)
- [Optimizing LLM Accuracy — OpenAI API](https://developers.openai.com/api/docs/guides/optimizing-llm-accuracy)
- [Model optimization — OpenAI API](https://developers.openai.com/api/docs/guides/model-optimization)
- [Deprecations — OpenAI API](https://developers.openai.com/api/docs/deprecations) — Update to OpenAI's self-serve fine-tuning
- [Context windows — Anthropic Platform Docs](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Models overview — Anthropic Platform Docs](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Pricing — Anthropic Platform Docs](https://platform.claude.com/docs/en/about-claude/pricing)
- [Steering thinking — Anthropic Platform Docs](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost)
- [Pricing — OpenAI API](https://developers.openai.com/api/docs/pricing)
- [Gemini Developer API pricing — Google AI for Developers](https://ai.google.dev/gemini-api/docs/pricing)
- [인프런, 널널한 개발자, LLM 서비스, 토큰, 컨텍스트](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498588)
- [인프런, 널널한 개발자, AI도구 설치](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498586)
- [YouTube, 양실장의 바이브코딩대학, LLM 신경망 학습부터 추론 원리 전체를 비개발자 15명에게 설명하는 강의](https://www.youtube.com/watch?v=geY4UO23QA8)

## 관련 문서

- [[LLM-Generation-Mechanics|LLM 동작 원리 (묶음 인덱스)]]
- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]]
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]
- [[LLM-Generation-Mechanics-Analogies|비개발자 설명용 비유와 한계]]
- [[LLM-Failure-Handling-Response-Validation|LLM 실패 처리]] — 구조화 출력이 보장하는 범위
- [[Codex-Agent-Execution-Model|Codex 에이전트 실행 원리]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[Vector-Similarity-Search|벡터 유사도 검색]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]]
- [[LLM-Abstention|LLM 응답 보류와 캘리브레이션]]
- [[LLM-Hallucination-Verification|LLM 환각 유형과 검증]]
- [[LLM-Eval-Strategy|LLM 평가 전략]]
- [[LLM-Model-Tiers|LLM 모델 티어 선택 (벤더별 단가)]]
