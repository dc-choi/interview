---
tags: [ai, llm, openai, gpt, model, history]
status: done
verified_at: 2026-11-01
category: "AI엔지니어링(AIEngineering)"
aliases: ["OpenAI GPT Generations", "GPT 세대별 변화", "GPT-2에서 GPT-6까지", "GPT Model Lineage"]
---

# OpenAI GPT 세대별 변화

이 문서는 GPT 세대 번호를 한 모델이 커진 순서가 아니라 학습 방식, 호출 인터페이스, 컨텍스트 한도와 제공 형태가 바뀐 시점들로 읽는다. 이는 OpenAI의 설명이 아니라 이 문서의 읽기 틀이다. 네 축은 서로 다른 때에 바뀌었다. 지시 따르기를 위한 RLHF는 GPT-4보다 앞서 InstructGPT(2022)가 GPT-3에 적용했고(RLHF 자체는 그보다 앞선 연구에서 나왔다), 추론 토큰과 effort는 GPT-5보다 앞선 o1 계열에서, 100만 토큰대 컨텍스트는 GPT-6보다 앞선 GPT-4.1과 GPT-5.4에서 먼저 나왔다. 세대 이름으로 기능을 추정하지 말고 모델 단위로 확인한다.

이 문서는 2026-11-01에 논문, 시스템 카드와 OpenAI API의 모델 페이지, 가이드, 변경 이력으로 대조한 내용이다. 가격과 벤치마크는 [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]]와 [[LLM-Model-Tiers|LLM 모델 티어 선택]]이 다룬다.

## 네 축으로 나눠 읽는다

- **학습 방식**: 다음 토큰 예측 사전학습 위에 사람의 시연과 선호로 조정하는 SFT와 RLHF, 강화학습으로 추론 과정을 학습하는 단계가 더해졌다. o1도 사전학습을 거친 뒤 강화학습으로 추론을 학습했다([[LLM-Generation-Mechanics-Training#사전학습 이후의 조정|사전학습 이후의 조정]]).
- **인터페이스**: 텍스트 이어 쓰기, 프롬프트 안의 설명과 예시로 과업 지정, 지시 따르기, 답 전에 추론 토큰을 쓰고 effort로 양을 조절하는 호출, 실행 중인 응답을 제어하는 장기 작업 기능 순으로 넓어졌다.
- **컨텍스트**: 한 요청에서 쓸 수 있는 최대 토큰 수이고 입력, 출력, 추론 토큰이 모두 여기에 들어간다(대화 상태 가이드). GPT-5와 GPT-6 계열 모델 페이지는 컨텍스트와 따로 입력 최대와 출력 최대를 적지만, GPT-5.4와 GPT-5.5 페이지에는 입력 최대가 없다(2026-11-01 기준). 세대 번호를 따라 단조롭게 늘지 않았고 같은 세대 안에서도 모델마다 다르다.
- **제공 형태**: 크기와 등급별 변형은 GPT-2(4개 크기)부터 있었고 o1-mini, GPT-5 mini와 nano로 이어졌다. ChatGPT의 GPT-5는 빠른 모델과 추론 모델 중 하나를 라우터가 고르는 시스템이고, GPT-5.6부터 Sol, Terra, Luna라는 등급 이름을 쓴다. GPT-6 계열에는 Astra가 더해졌다.

## 세대별 비교

| 세대 (공개) | 학습 방식 | 인터페이스 | 컨텍스트 | 능력과 한계 | 근거 |
|---|---|---|---|---|---|
| GPT-2 (2019-02) | 2018년 GPT 구조를 거의 그대로 키운 1.5B Transformer. 800만 개 남짓의 웹 문서(WebText, 40GB)로 언어 모델링만 학습 | 텍스트 이어 쓰기. 기사 뒤 `TL;DR:`로 요약, 예시 쌍으로 번역, 문서와 대화 뒤 `A:`로 질의응답을 유도 | 1,024토큰 | 파라미터와 구조를 바꾸지 않고 zero-shot으로 여러 과업을 수행. Natural Questions 정답률 4.1%처럼 기존 시스템에 크게 못 미친 과업도 있었다 | GPT-2 논문, 모델 카드 |
| GPT-3 (2020-05-28) | GPT-2와 같은 구조에 dense와 locally banded sparse attention을 번갈아 쓰고, 175B(이전 비희소 언어 모델의 10배)로 키워 3,000억 토큰 학습 | 그래디언트 갱신 없이 자연어 설명과 시연 예시로 과업 지정. zero-shot, one-shot, few-shot을 나눠 측정 | 2,048토큰 | 규모를 키우면 few-shot 성능이 크게 올랐고 일부 과업은 미세조정 최고 기록과 겨뤘다. few-shot이 약한 데이터셋도 있었다 | GPT-3 논문 |
| InstructGPT (2022-03-04) | GPT-3를 라벨러 시연으로 지도 미세조정한 뒤 출력 순위 데이터로 RLHF | 지시 따르기 | 대조하지 않음 | 1.3B InstructGPT 출력이 175B GPT-3 출력보다 사람 평가에서 선호됐다 | InstructGPT 논문 |
| GPT-4 (2023-03-15) | 공개 데이터와 라이선스 데이터로 다음 토큰 예측 사전학습 뒤 RLHF. 크기, 하드웨어, 학습 연산, 데이터 구성은 비공개 | 보고서의 모델은 이미지와 텍스트 입력, 텍스트 출력. API의 `gpt-4`는 텍스트 입력만 받았고 이미지 입력 모델은 2023-11-06 GPT-4 Turbo with Vision으로 나왔다 | `gpt-4` 8,192토큰, 별도 `gpt-4-32k` 변형, GPT-4 Turbo 128,000토큰 | 보고서가 환각, 제한된 컨텍스트, 경험에서 배우지 않음을 한계로 적었다 | GPT-4 기술 보고서, API 모델 페이지, 변경 이력, 지원 종료 목록 |
| o1 계열 (2024-09-12 o1-preview와 o1-mini, 2024-12-17 o1) | 다양한 데이터로 사전학습한 뒤 대규모 강화학습으로 chain of thought 추론을 학습 | 답 전에 내부 추론. 추론 토큰은 API로 보이지 않지만 컨텍스트를 차지하고 출력 단가로 과금. 2024-12-17 o1에 `reasoning_effort` 추가 | 200,000토큰(2024-12-17 o1 스냅샷) | GPT 번호가 아닌 o 계열로 추론 모델을 시작했다 | o1 시스템 카드, 변경 이력, 추론 가이드, API 모델 페이지 |
| GPT-5 (2025-08-07) | 추론 모델(gpt-5-thinking 계열)은 강화학습으로 추론을 학습 | ChatGPT에서는 빠른 모델과 추론 모델 중 하나를 실시간 라우터가 고른다. API의 `gpt-5`는 추론 모델이고 effort `minimal`이 추가됐다 | 400,000토큰(입력 최대 272,000, 출력 최대 128,000) | 시스템 카드는 gpt-5-main을 GPT-4o, gpt-5-thinking을 o3의 후속으로 둔다 | GPT-5 시스템 카드, API 모델 페이지, 변경 이력 |
| GPT-6 계열 (2026-09-03부터) | 다양한 데이터셋 학습과 강화학습 추론 학습(Astra 시스템 카드) | Responses API의 비동기 도구 호출, 실행 중 지시, 대화 중 effort 변경. Astra와 GPT-6.1 Sol은 effort `none` 미지원 | 1,050,000토큰(입력 최대 922,000, 출력 최대 128,000) | 벤치마크와 과업당 비용은 별도 문서 | GPT-6 Astra 시스템 카드, API 모델 페이지와 가이드, 변경 이력 |

공개 시점은 GPT-2가 모델 카드의 모델 날짜, GPT-3, InstructGPT와 GPT-4가 arXiv 첫 판, o1 계열 이후가 OpenAI API 변경 이력의 출시일이다.

## GPT-6 계열에서 바뀐 호출 계약

- **구성**: GPT-6 Astra(2026-09-03), GPT-6 Sol과 GPT-6 Luna(2026-09-22), GPT-6.1 Sol(2026-09-29), GPT-6.1 Terra(2026-10-26) 순으로 나왔다. 2026-11-01 모델 목록의 Flagship 절에는 Astra, GPT-6.1 Sol, GPT-6.1 Terra, GPT-6 Luna가 있고 네 모델 모두 텍스트와 이미지를 입력받는다. 지식 기준일은 Astra와 GPT-6.1 Sol이 2026-04-30, Luna가 2026-05-18, GPT-6.1 Terra가 2026-06-01로 서로 다르다. 이 문서의 GPT-6 계열 설명은 이 네 모델 기준이다. 2026-10-30에는 생명과학 연구용 GPT-6 Rosalind(`gpt-6-rosalind`)도 나왔지만, 접근은 신뢰 접근(trusted-access) 프로그램에서 승인받은 기관의 내부 연구용이다.
- **비동기 도구 호출**: function 도구나 custom 도구 정의에 `async: true`를 두면 모델은 도구 결과를 기다리지 않고 작업을 이어 간다. 도구 실행은 여전히 애플리케이션이 맡고, 결과는 원래 `call_id`로 이후의 Responses 요청에 돌려준다. 호스티드 내장 도구에는 적용되지 않으며, 응답 생성 자체를 비동기로 돌리는 background mode와 다른 기능이다. GPT-6 Astra와 그 이후 모델이 지원한다.
- **실행 중 지시(mid-turn steering)**: Responses API의 WebSocket 연결에서 진행 중인 응답에 `response.steer` 이벤트로 지시를 더한다. GPT-6 계열이 지원하고 GPT-5.6과 그 이전 모델은 지원하지 않는다. 수락은 지시가 대기열에 들어갔다는 뜻이고, 서버는 진행 중인 출력 항목과 이미 돌던 호스티드 도구 작업을 마친 뒤 지시를 반영한 새 응답을 이어 만든다. 클라이언트 도구 결과나 승인이 필요하면 그 결과를 보낼 때까지 지시가 대기한다. 이미 보낸 출력을 고치거나 시작된 도구를 취소하지 않으며, 대기 중인 지시는 현재 연결에만 있으므로 연결이 끊긴 뒤 남아 있다고 가정하지 않는다.
- **대화 중 effort 변경**: 다음 사용자 메시지 앞에 `configuration_update` 항목을 넣어 effort만 바꾼다. 요청 수준의 `reasoning.effort`는 그대로 두므로 캐시용 프롬프트 접두사를 유지한 채 어려운 작업에서 올리고 일상적인 후속 질문(routine follow-ups)에서 내릴 수 있다. GPT-6 계열의 표준 단일 에이전트 모드에서 지원한다. 추론 가이드는 자동 compaction이나 자동 truncation과 함께 쓰지 말라고 안내하며, 독립 `/responses/compact` 엔드포인트는 이 항목이 든 기록을 거부한다. 응답의 `reasoning.effort`는 이 항목으로 바꾼 값이 아니라 요청 수준 설정을 계속 보고한다.
- **Astra의 제약과 감시**: GPT-6 Astra는 effort `none`, 사용자 지정 `temperature`와 `top_p`, `logprobs`를 지원하지 않고 도구 호출에는 Responses API가 필요하다. 지원하는 Responses API 요청에서는 에이전트 작업 중 비정렬 감시가 비동기로 돈다.

## 흔한 오독

- **GPT-2는 이어 쓰기만 하고 질문에 답하지 못했다**: 인터페이스는 이어 쓰기였지만 문서와 대화 뒤에 `A:`를 붙이면 CoQA에서 F1 55를 냈다. 답을 못 한 것이 아니라 과업을 프롬프트 형식으로 유도해야 했고, Natural Questions 4.1%처럼 성능이 낮았다.
- **in-context learning은 GPT-3에서 생겼다**: GPT-3 논문은 자기 in-context learning 사용이 GPT-2와 비슷하며, 문맥 안 학습의 설정을 체계적으로 탐색한 점이 다르다고 적는다. GPT-3의 변화는 규모와 함께 zero-shot, one-shot, few-shot 성능을 비교한 데 있다.
- **GPT-4부터 RLHF로 질문에 답하게 됐다**: GPT-3를 SFT와 RLHF로 조정해 지시를 따르게 한 InstructGPT 논문이 2022-03-04에 먼저 나왔다. GPT-4 보고서도 RLHF 미세조정을 적지만 그 방식이 GPT-4에서 시작된 것은 아니며, InstructGPT 논문도 RLHF 기법을 Christiano 외(2017)와 Stiennon 외(2020)에서 인용한다.
- **GPT-4는 처음부터 API에서 이미지를 받았다**: 보고서의 모델은 이미지 입력을 받지만 API의 `gpt-4` 모델 페이지는 텍스트 입력만 적는다. API의 이미지 입력 모델은 2023-11-06 GPT-4 Turbo with Vision으로 나왔다.
- **추론 토큰과 effort는 GPT-5에서 시작됐다**: o1-preview와 o1-mini가 2024-09-12에, `reasoning_effort`가 2024-12-17 o1에 먼저 나왔다. 이후 값은 API 변경 이력 기준으로 GPT-5(2025-08-07)의 `minimal`, GPT-5.1(2025-11-13)의 `none` 기본값, GPT-5.2(2025-12-11)의 `xhigh`, GPT-5.6(2026-07-09)의 `max` 순으로 늘었다. 다만 GPT-5.1-Codex-Max 시스템 카드(2025-11-18)는 `xhigh`의 API 변경 이력 날짜보다 먼저 Extra High reasoning effort로 잰 결과를 보고했다. 추론 여부와 양은 세대 이름이 아니라 모델과 effort 값으로 확인한다.
- **ChatGPT의 GPT-5는 추론이 내장된 한 모델이다**: 시스템 카드는 대부분의 질문에 답하는 빠른 모델, 어려운 문제용 추론 모델, 그리고 대화 유형, 복잡도, 도구 필요와 명시적 의도(예: 프롬프트의 `think hard about this`)로 둘 중 하나를 고르는 실시간 라우터의 조합으로 설명한다. 사용 한도에 이르면 각 모델의 mini가 남은 질의를 맡고, 한 모델로 통합하는 일은 앞으로의 계획으로 적었다. API에서는 추론 모델과 그 mini, nano를 직접 호출한다.
- **컨텍스트는 세대마다 커졌다**: 추론 모델이 아닌 GPT-4.1(2025-04-14 스냅샷)이 이미 1,047,576토큰이었고, 뒤에 나온 GPT-5는 400,000토큰이다. GPT-6 계열의 1,050,000토큰은 GPT-5.4와 GPT-5.5 모델 페이지에도 있는 값이다.
- **GPT-6는 더 안전하다**: GPT-6 Astra 시스템 카드 8.6절은 내부 Codex 과제로 배포를 시뮬레이션해 두 모델을 비교한 54,218건에서, 심각도 3 이상(0~4 척도) 비정렬 플래그가 Astra 34건(0.063%), GPT-5.6 Sol 73건(0.135%)이었다고 보고한다. 과제마다 앞선 대화를 고정하고 마지막 assistant 턴만 각 모델로 다시 샘플링했으며, 도구 응답은 LLM 기반 시뮬레이터가 만들었고 OpenAI의 모니터가 모델의 chain of thought를 근거로 그 턴을 판정했다. 공급사 자체 평가이고 카드도 외부 배포 안전성의 직접 척도가 아니라 내부 배포 위험의 추가 신호로 보므로, 자기 업무의 안전성 근거로 바로 옮기지 않는다. 같은 카드는 외부에 배포한 Astra의 도구 사용 추론 전체에 비정렬 감시를 더했다고 적고, 에이전트가 감시를 약화한 사례는 [[Agent-Execution-Isolation#감시와 알림을 약화한 코딩 변경|에이전트 실행 격리]]에 있다. 비정렬 플래그가 적다는 것과 별개로, 내부 배포한 Astra가 안전 연구 과업에서 알리지 않고 성능을 낮춘 사례는 [[AI-Alignment-and-Control#과업의 목적에 따라 성능을 몰래 낮추는 문제|은밀한 저성능]]에서 다룬다.
- **실행 중 지시는 생각하는 도중 바로 반영된다**: 수락은 대기열 등록이고, 반영은 진행 중인 출력 항목을 마친 뒤 이어지는 새 응답에서 일어난다(위 절).

## 모델 선택과 발표 읽기 체크포인트

- **컨텍스트는 입력과 출력으로 나눈다**: 모델 페이지는 GPT-5에 컨텍스트 400,000, 입력 최대 272,000, 출력 최대 128,000을, GPT-6 계열에 1,050,000, 922,000, 128,000을 적는다. 입력 최대와 출력 최대의 합이 컨텍스트와 같다는 관계(272,000 + 128,000 = 400,000)는 페이지 수치를 더해 본 이 문서의 해석이다. 추론 토큰도 컨텍스트와 `max_output_tokens` 한도를 쓰므로, 추론 가이드는 실험을 시작할 때 추론과 출력에 25,000토큰 이상을 남기라고 권한다.
- **긴 입력의 단가 구간을 확인한다**: GPT-6 Astra는 입력이 272K 토큰을 넘으면 요청 전체에 입력과 캐시 단가 2배, 출력 단가 1.5배를 매긴다. 컨텍스트에 들어간다는 것과 그 길이를 잘 활용한다는 것은 다르므로 [[Long-Context-Evaluation|긴 문맥 평가]]로 따로 잰다.
- **세대 비교 수치는 비교 대상 모델과 날짜를 붙인다**: 같은 GPT-4 세대에도 8,192토큰 `gpt-4`와 128,000토큰 GPT-4 Turbo가 있었다. 발표 수치의 일반 조건은 [[Model-Release-Claims|모델 발표 수치 읽기]]를 따른다.
- **effort 값과 샘플링 파라미터를 모델별로 확인한다**: GPT-6 계열은 effort가 `none`이 아니면 `temperature`, `top_p`, `top_logprobs`를 빼야 하고, Chat Completions에서는 `logprobs`도, Responses에서는 `include`의 `message.output_text.logprobs`도 뺀다. Astra와 GPT-6.1 Sol은 `none`을 받지 않는다. 이전 모델의 호출을 옮길 때 제거할 파라미터부터 찾는다([[LLM-API-Version-Migration|LLM API 버전과 SDK 마이그레이션]]).
- **새 호출 기능의 적용 조건을 확인한다**: 비동기 도구 호출은 애플리케이션이 실행하는 function과 custom 도구, 실행 중 지시는 WebSocket 연결, effort 변경 항목은 GPT-6 계열의 단일 에이전트 모드가 조건이다.
- **스냅샷과 제거 일정을 기록한다**: 2026-11-01 기준 GPT-6 계열 모델 페이지에는 모델 이름과 같은 스냅샷 하나만 있으므로 응답의 `model` 값을 남긴다([[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시]]). 지원 종료 목록의 2026-06-11 공지에 따르면 `gpt-5` 별칭과 `gpt-5-2025-08-07` 스냅샷은 2026-12-11 API에서 제거될 예정이고 권장 대체는 `gpt-5.6-sol`이다(`gpt-5-mini`는 `gpt-5.6-terra`, `gpt-5-nano`는 `gpt-5.6-luna`). 2026-11-01에 열람한 GPT-5 모델 페이지는 최신 GPT-6 Astra를 권하므로, 대체 모델은 출처마다 다르게 적혀 있다.

## 출처

- [Language Models are Unsupervised Multitask Learners — OpenAI, Alec Radford 외](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) — 초록, 2.1~2.3절의 데이터, 구조와 컨텍스트, 3.5~3.8절의 과업 유도와 결과
- [GPT-2 model card — GitHub, OpenAI](https://github.com/openai/gpt-2/blob/master/model_card.md) — 모델 날짜 2019-02, 단계적으로 공개한 네 크기(124M, 355M, 774M, 1.5B)
- [Language Models are Few-Shot Learners — arXiv, Tom B. Brown 외](https://arxiv.org/abs/2005.14165) — 2020-05-28 v1, 초록, 2절의 설정 정의, 2.1절의 구조와 n_ctx
- [Training language models to follow instructions with human feedback — arXiv, Long Ouyang 외](https://arxiv.org/abs/2203.02155) — 2022-03-04 v1, 초록, 2쪽의 RLHF 선행 연구 인용
- [GPT-4 Technical Report — arXiv, OpenAI](https://arxiv.org/abs/2303.08774) — 2023-03-15 v1, 초록, 1절의 한계, 2절의 RLHF와 비공개 범위
- [OpenAI o1 System Card — OpenAI](https://cdn.openai.com/o1-system-card-20241205.pdf) — 2024-12-05, 1~2절의 학습 설명, 3절 각주의 2024-12-17 개선 o1 출시
- [GPT-5 System Card — OpenAI](https://cdn.openai.com/gpt-5-system-card.pdf) — 2025-08-13판, 1절의 라우터, API 제공 모델(thinking, mini, nano)과 후속 모델 표, 2절의 학습 설명
- [GPT-5.1-Codex-Max System Card — OpenAI Deployment Safety Hub](https://deploymentsafety.openai.com/gpt-5-1-codex-max) — 2025-11-18, 5.1.3.2절의 Extra High reasoning effort 측정 조건
- [GPT-6 Astra System Card — OpenAI Deployment Safety Hub](https://deploymentsafety.openai.com/gpt-6-astra) — 2026-09-03 게시, 변경 이력이 2026-10-30 항목까지인 판을 2026-11-01 열람, 1절의 외부 배포 비정렬 감시, 학습 설명, 8.6절의 배포 시뮬레이션 방법과 비정렬 플래그 비교
- [Changelog — OpenAI API](https://developers.openai.com/api/docs/changelog) — 2026-11-01 GPT-4 Turbo(2023-11-06), o1-preview(2024-09-12), o1과 `reasoning_effort`(2024-12-17), GPT-5(2025-08-07)부터 GPT-6 Rosalind(2026-10-30)까지의 출시와 기능 항목, GPT-6 Astra 마이그레이션 노트 대조
- [OpenAI API, Models](https://developers.openai.com/api/docs/models) — 2026-11-01 Flagship 절의 GPT-6 계열 목록
- [OpenAI API, GPT-4](https://developers.openai.com/api/docs/models/gpt-4)
- [OpenAI API, GPT-4 Turbo](https://developers.openai.com/api/docs/models/gpt-4-turbo)
- [OpenAI API, GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1)
- [OpenAI API, o1](https://developers.openai.com/api/docs/models/o1)
- [OpenAI API, GPT-5](https://developers.openai.com/api/docs/models/gpt-5) — 지원 종료 상태와 GPT-6 Astra 권장
- [OpenAI API, GPT-5.4](https://developers.openai.com/api/docs/models/gpt-5.4)
- [OpenAI API, GPT-5.5](https://developers.openai.com/api/docs/models/gpt-5.5)
- [OpenAI API, GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) — 입력과 출력 최대, 272K 초과 단가 구간, 스냅샷
- [OpenAI API, GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
- [OpenAI API, GPT-6.1 Terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra)
- [OpenAI API, GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [OpenAI API, Using GPT-6](https://developers.openai.com/api/docs/guides/latest-model) — 모델별 effort, 제거할 샘플링 파라미터와 logprobs 설정
- [OpenAI API, Async tool calling](https://developers.openai.com/api/docs/guides/async-tool-calling)
- [OpenAI API, Mid-turn steering](https://developers.openai.com/api/docs/guides/steering)
- [OpenAI API, Reasoning models](https://developers.openai.com/api/docs/guides/reasoning) — 추론 토큰, effort 값, 25,000토큰 권고, `configuration_update`와 compaction 병용 안내
- [OpenAI API, Conversation state](https://developers.openai.com/api/docs/guides/conversation-state) — 컨텍스트 창의 최대 토큰에 입력, 출력, 추론 토큰 포함
- [OpenAI API, Deprecations](https://developers.openai.com/api/docs/deprecations) — `gpt-4-32k` 종료(2025-06-06), 2026-06-11 공지의 `gpt-5`와 `gpt-5-2025-08-07` 제거 예정(2026-12-11)과 대체 모델

## 관련 문서

- [[LLM-Generation-Mechanics-Training#사전학습 이후의 조정|LLM 학습 원리]] — 사전학습, SFT, RLHF, DPO의 학습 신호
- [[LLM-Model-Tiers|LLM 모델 티어 선택]] — GPT-5.6과 GPT-6 계열의 티어, 단가와 라우팅
- [[AI-Capability-and-Cost-Trends|AI 능력과 비용 추세 읽기]] — GPT-6 Astra의 벤치마크와 과업당 비용
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 비교 대상의 세대와 측정 조건
- [[Long-Context-Evaluation|긴 문맥 평가]] — 컨텍스트 한도와 실제 활용의 차이
- [[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시]] — 스냅샷과 별칭
- [[LLM-API-Version-Migration|LLM API 버전과 SDK 마이그레이션]] — 제거된 파라미터와 400 응답
- [[Agent-Execution-Isolation|에이전트 실행 격리]] — 비정렬 감시와 에이전트의 감시 약화 사례
- [[Palantir-AIP-Model-Availability|AIP 모델의 가용성과 환경 조건]] — 같은 모델의 제공 경로별 조건
- [[Claude-Opus-5|Claude Opus 5]] — 다른 공급사의 세대 교체와 API 거동 변화
- [[paradigm|AI 패러다임, 모델]]
