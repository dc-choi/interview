---
tags: [ai, llm, decision-model, classification, calibration]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Decision Models Mechanics", "결정 모델 동작 원리", "결정 모델 질문 스키마", "System One Models", "Flide", "Exact State Forking"]
---

# 결정 모델: 정의와 동작 원리

결정 모델이 받는 판단 대상과 질문 스키마, 디코드 없이 선택지를 채점하는 구조, 확률과 confidence를 읽는 법을 다룬다. 상위: [[LLM-Decision-Models|결정 모델]].

## 정의

결정 모델은 텍스트를 생성하지 않고, 판단 대상(`state`)과 미리 정한 질문을 받아 질문마다 허용된 선택지 각각의 확률을 돌려주는 모델이다. TypeSafe는 이 부류를 System One 모델이라 부르며, 소프트웨어가 바로 쓸 수 있는 빠르고 구조화된 결정을 내리도록 만든 모델로 설명한다. 2026-10-06 기준 구현 예는 TypeSafe의 Jev와 Cloudflare가 2026-10-01 공개한 Clef, Clef-flash이며, Cloudflare는 Clef가 Jev API와 호환된다고 밝힌다.
생성형 LLM으로 분류하면 답을 토큰으로 생성하며, 구조화 출력 기능을 쓰지 않으면 파싱과 형식 오류 처리도 맡아야 한다. 결정 모델은 출력이 스키마의 선택지로 닫혀 있고 디코드 없이 선택지별 확률을 응답 필드로 바로 주므로, 그 확률을 근거로 자동 처리, 확인 요청, 사람 검토를 코드에서 나눌 수 있다. 대신 새 라벨이나 설명, 근거 문장은 만들지 못하므로 디버깅은 질문 분해와 라벨 데이터로 한다.

## 동작 원리

### 입력: state와 질문 스키마

요청은 `state`(텍스트나 JSON)와, 직접 정한 ID를 키로 하는 `questions` 맵으로 이루어진다. 아래는 TypeSafe API에 보내는 요청 하나로 긴급도, 담당 팀, 심각도를 함께 묻는 예다.

```json
{
  "model": "jev-latest",
  "state": "Checkout has been failing for every customer for the last hour.",
  "questions": {
    "urgent": { "type": "noul", "instructions": "Is this support request urgent?" },
    "team": { "type": "choice", "instructions": "Which team should handle this request?",
              "criteria": { "billing": "Payments and refunds", "technical": "Outages and errors" } },
    "severity": { "type": "score", "instructions": "How severe is the customer impact?",
                  "criteria": ["No impact", "Minor", "Major", "Critical"] }
  }
}
```

응답의 `answers`는 같은 ID로 질문별 결과를 돌려준다.

| 타입 | 묻는 것 | 반환 (TypeSafe API 문서 기준) | 제약 (Jev) |
|---|---|---|---|
| `noul` | 예, 아니오 | `noul`: 예일 확률 0~1, `confidence` 없음 | `criteria`(선택)로 true와 false의 의미 보강 |
| `choice` | 정의한 선택지 중 하나 | `choice`, 선택지별 `probabilities`, `confidence` | 선택지 최대 255개 |
| `score` | 순서 있는 척도 위의 위치 | 0부터 매긴 단계 번호의 확률 가중 평균 `score`, `legend`, `probabilities`, `confidence` | 단계 2~10개 |

Jev 문서 기준으로 같은 요청의 질문은 서로 독립적으로, 병렬로 평가되므로 질문을 더하거나 빼도 다른 질문의 답은 바뀌지 않고 응답 시간도 대개 크게 늘지 않는다. 쓸지 모르는 질문까지 한 번에 보내고 필요한 답만 코드가 고르는 Speculative fan-out이 이 성질을 쓴다. 한 답에 따라 다음 질문을 바꾸는 조건 흐름은 코드가 맡는다.

### Score는 단계 사이의 위치를 준다

Choice의 답은 보통 가장 확률이 높은 선택지(argmax) 하나로 읽으므로, 확률이 이웃한 두 단계에 나뉜 답과 한 단계에 몰린 답이 같은 라벨로 보인다. Score는 순서 있는 단계 번호에 확률을 곱해 더한 기댓값이라 단계 사이의 위치가 연속값으로 드러난다. 단계 1과 2에 0.5씩 실리면 1.5다. 위급도나 감정의 세기처럼 정도가 있는 판단이면 같은 최빈 단계 안의 차이까지 받는다.

- **Choice로도 계산할 수 있다:** 순서를 코드에서 정해 둔 Choice의 `probabilities`에 같은 가중합을 적용할 수 있다. 다만 그 확률이 Score로 물었을 때의 확률과 같게 나온다는 보장은 확인한 문서에 없다.
- **기댓값만 보지 않는다:** 양 끝 단계로 갈린 분포도 아무도 고르지 않은 가운데 값이 된다. 5단계에서 0과 4에 0.5씩이면 `score`는 2.0이지만 TypeSafe의 Score confidence 식으로는 0이다(계산). `confidence`와 `probabilities`를 함께 본다.
- **타입 선택과 작성 권고(2026-11-18 TypeSafe Score, Noul, Confidence 문서 확인):** 순서 없는 고정 선택지에는 Choice, 척도 위의 위치에는 Score를 쓴다. Score의 단계는 약간, 보통 같은 정도어보다 그 단계에 해당하는 상황으로 설명한다. Noul의 `criteria`는 선택 사항이며 대개 `instructions`만으로 충분하다. 예와 아니오의 경계가 미묘할 때 더하고, 넣은 경우와 뺀 경우를 함께 시험한다.

### 왜 빠르고 싸게 나오는가

Clef는 Qwen 기반 모델을 고정한 채 라우팅 헤드와 rank-256 LoRA 어댑터를 학습한 구조로, 입력을 한 번 처리(prefill)한 뒤 스키마가 허용한 선택지를 병렬로 채점한다. 결정 단계가 비자기회귀(non-autoregressive)라 토큰을 하나씩 만드는 디코드가 없다. 모델은 질문마다 허용된 선택지 하나당 logit 하나를 내고, 질문별 softmax로 확률을 만든다. 출력 길이만큼 늘어나는 디코드 구간([[LLM-Inference-Bottlenecks#프리필과 디코드는 병목이 다르다|프리필과 디코드]])을 건너뛰므로 비용과 지연은 주로 입력 크기를 따른다. 2026-10-06 확인 기준 Jev는 출력 토큰을 과금하지 않고, Workers AI 가격표도 Clef에 입력 토큰 단가만 둔다.

### 자체 호스팅 엔진은 공통 state를 한 번만 처리한다

같은 `state`에 질문 여러 개를 붙이면 공통 입력의 프리필을 한 번 계산하고, 그 시점의 모델 상태에서 질문마다 갈라 답할 수 있다. 2026-11-16 확인한 Flide(Apache-2.0) README는 이를 exact state forking으로 구현하며, 각 답이 그 질문만 단독으로 받았을 때의 답과 같다고 밝힌다. 위의 질문 간 독립성을 엔진에서 지키는 방식이고, `flide verify`로 자기 모델과 요청에서 이 동일성을 확인한다. Jev 형식의 `/v1/systemone` API를 제공하며 질문당 선택지는 256개까지 받는다.

- **배수는 비교 기준과 모델마다 다르다:** 소개 문구는 vLLM과 SGLang보다 최대 9.5배 빠르다고 하지만, 성능표는 각 모델 배포본이 쓰던 엔진을 기준으로 H200 한 장에서 요청별 지연 중앙값을 비교한다. OneJev는 약 4.7~7.3배, Qwen3.5는 약 1.3~4.8배, Gemma 4와 Clef는 약 1.0~1.7배다. 같은 표에는 28.1배(Senova의 MultiRC)처럼 소개 문구보다 큰 값도 있어, 9.5배는 vLLM과 SGLang을 기준으로 한 값으로 읽는다. OneJev1.6-0.8B 예시는 이메일 1만 건에 질문 8개씩 답하는 데 28초가 걸렸다.
- **이득의 조건:** 공통 입력이 길고 질문이 많을수록 아끼는 계산이 커진다. 입력마다 같은 질문 하나를 던지는 작업은 공통 부분이 질문 쪽에 있어 이득이 작을 수 있다(구조에서 도출한 추론). 자기 작업 형태로 따로 잰다.
- **세션 캐시와 배치 불변 모드:** `--session-cache-gb`는 이전 요청의 상태를 보관해 에이전트의 다음 단계가 새로 붙은 부분만 읽게 한다. `--batch-invariant`는 함께 배치된 요청과 무관하게 같은 결과 비트를 내는 대신 속도를 일부 내준다. 확률 문턱을 회귀 시험하는 경로라면 켤지 정한다([[LLM-Inference-Serving-Engines#결정적 출력은 배치 불변성에서 출발한다|배치 불변성]]).

수치는 프로젝트 팀의 측정이며 재현하지 않았다.

### 확률과 confidence 읽기

- 보정(calibration)된 확률은 0.8을 받은 결과들이 약 80% 실제로 일어난다는 집단 수준의 성질이며 개별 답을 보장하지 않는다. TypeSafe는 보정된 확률을 내도록 학습하는 방법으로 RLCD(Reinforcement Learning for Calibrated Decisions)를 들고, Cloudflare는 유효한 스키마 출력을 label smoothing을 건 cross-entropy로 학습하고 Brier loss로 보정을 다듬으며, RLCD를 인접한 순서 선택지에 부분 점수를 주는 보조 최적화 목표로 쓴다. 이름은 같아도 두 학습에서 맡는 역할이 다르다. 그래도 보정은 학습 목표일 뿐이므로 자기 도메인에서 다시 측정한다([[LLM-Abstention|LLM Abstention]]).
- Choice의 `confidence`는 최고 확률이 균등 분포 `1/n`보다 얼마나 위에 있는지를 0(균등)부터 1(확실)로 잰 `(p_max - 1/n) / (1 - 1/n)`이다. 선택지 3개에서 (0.6, 0.3, 0.1)과 (0.6, 0.2, 0.2)는 둘 다 0.4이므로 2등 후보와의 차이가 중요하면 `probabilities`를 직접 본다.
- Score의 `confidence`는 가장 가능성 높은 단계에서 먼 단계에 실린 확률일수록 더 많이 깎인다. Noul은 `confidence`를 주지 않으며 필요하면 `|2p - 1|`을 쓰도록 안내한다.
- 같은 이름의 confidence도 제공자마다 정의가 다르다. Gemini Decisions API 문서(2026-11-16 확인)는 최상위 답이 맞을 확률의 추정치로 정의해 choice와 score는 최상위 확률을, noul은 `max(p, 1 - p)`를 쓴다. 선택지 3개의 (0.6, 0.3, 0.1)은 위 TypeSafe 식으로 0.4지만 Gemini 정의로는 0.6이다. 제공자를 바꾸면 문턱을 다시 정한다([[LLM-Decision-Models-Use-Cases#Gemini Decisions API는 같은 질문 타입에 다른 계약을 둔다|Gemini Decisions API]]).

## 출처

- [Introducing Clef: our open-source decision models, and new RL fine-tuning platform — Cloudflare Blog](https://blog.cloudflare.com/clef-decision-models/)
- [Introducing System One Models & Jev — TypeSafe](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [Cloudflare Workers AI, clef](https://developers.cloudflare.com/workers-ai/models/clef/)
- [Cloudflare Workers AI, clef-flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/)
- [Cloudflare Workers AI, Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Hugging Face, Cloudflare/clef](https://huggingface.co/Cloudflare/clef)
- [TypeSafe Docs, API reference](https://docs.typesafe.ai/api)
- [TypeSafe Docs, Models](https://docs.typesafe.ai/models)
- [TypeSafe Docs, Primitives](https://docs.typesafe.ai/primitives)
- [TypeSafe Docs, Noul](https://docs.typesafe.ai/primitives/noul) — 2026-11-18 `criteria`의 선택 여부와 작성 권고 대조
- [TypeSafe Docs, Score](https://docs.typesafe.ai/primitives/score) — 2026-11-18 기댓값 계산, Choice와의 구분과 단계 설명 권고 대조
- [TypeSafe Docs, Confidence](https://docs.typesafe.ai/confidence) — 2026-11-18 Score confidence 식 대조
- [TypeSafe Docs, AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer)
- [TypeSafe Docs, How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
- [TypeSafe Docs, Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out)
- [Flide — GitHub, OmniJev](https://github.com/OmniJev/Flide) — 2026-11-16 README의 state 분기, 성능표의 비교 기준, 세션 캐시와 배치 불변 옵션 대조
- [Gemini API, Decisions API](https://aistudio.google.com/docs/decisions-api) — 2026-11-16 confidence 정의 대조
- [Flide - Jev같은 의사결정 모델을 최대 9.5배 빠르게 실행 — GeekNews](https://news.hada.io/topic?id=36894)
- [LLM 엔지니어라면 — YouTube, ImcommIT](https://www.youtube.com/watch?v=RX773uJAIOw) — 2026-11-17, Jev의 Noul과 Score 타입을 해설한 영상. 타입 정의는 위 TypeSafe 문서로 대조했고, Noul 이름의 유래 추정과 감정 세기 예시 수치는 확인하지 못해 쓰지 않음

## 관련 문서

- [[LLM-Decision-Models|결정 모델 (묶음 인덱스)]]
- [[LLM-Decision-Models-Use-Cases|활용 예시]]
- [[LLM-Decision-Models-Comparison|모델 비교, 한계와 운영 체크포인트]]
- [[LLM-Generation-Mechanics-Decoding|LLM 추론과 디코딩]] — Logit과 softmax, 토큰 분포와 확신도의 구분
- [[LLM-Decision-Models-Calibration-Cases|토큰 제한 실험과 확률 보정 사례]]
