---
tags: [ai, llm, decision-model, classification, calibration]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Decision Models Mechanics", "결정 모델 동작 원리", "결정 모델 질문 스키마", "System One Models"]
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
| `noul` | 예, 아니오 | `noul`: 예일 확률 0~1, `confidence` 없음 | `criteria`로 true와 false의 의미 보강 |
| `choice` | 정의한 선택지 중 하나 | `choice`, 선택지별 `probabilities`, `confidence` | 선택지 최대 255개 |
| `score` | 순서 있는 척도 위의 위치 | 0부터 매긴 단계 번호의 확률 가중 평균 `score`, `legend`, `probabilities`, `confidence` | 단계 2~10개 |

Jev 문서 기준으로 같은 요청의 질문은 서로 독립적으로, 병렬로 평가되므로 질문을 더하거나 빼도 다른 질문의 답은 바뀌지 않고 응답 시간도 대개 크게 늘지 않는다. 쓸지 모르는 질문까지 한 번에 보내고 필요한 답만 코드가 고르는 Speculative fan-out이 이 성질을 쓴다. 한 답에 따라 다음 질문을 바꾸는 조건 흐름은 코드가 맡는다.

### 왜 빠르고 싸게 나오는가

Clef는 Qwen 기반 모델을 고정한 채 라우팅 헤드와 rank-256 LoRA 어댑터를 학습한 구조로, 입력을 한 번 처리(prefill)한 뒤 스키마가 허용한 선택지를 병렬로 채점한다. 결정 단계가 비자기회귀(non-autoregressive)라 토큰을 하나씩 만드는 디코드가 없다. 모델은 질문마다 허용된 선택지 하나당 logit 하나를 내고, 질문별 softmax로 확률을 만든다. 출력 길이만큼 늘어나는 디코드 구간([[LLM-Inference-Bottlenecks#프리필과 디코드는 병목이 다르다|프리필과 디코드]])을 건너뛰므로 비용과 지연은 주로 입력 크기를 따른다. 2026-10-06 확인 기준 Jev는 출력 토큰을 과금하지 않고, Workers AI 가격표도 Clef에 입력 토큰 단가만 둔다.

### 확률과 confidence 읽기

- 보정(calibration)된 확률은 0.8을 받은 결과들이 약 80% 실제로 일어난다는 집단 수준의 성질이며 개별 답을 보장하지 않는다. TypeSafe는 보정된 확률을 내도록 학습하는 방법으로 RLCD(Reinforcement Learning for Calibrated Decisions)를 들고, Cloudflare는 유효한 스키마 출력을 label smoothing을 건 cross-entropy로 학습하고 Brier loss로 보정을 다듬으며, RLCD를 인접한 순서 선택지에 부분 점수를 주는 보조 최적화 목표로 쓴다. 이름은 같아도 두 학습에서 맡는 역할이 다르다. 그래도 보정은 학습 목표일 뿐이므로 자기 도메인에서 다시 측정한다([[LLM-Abstention|LLM Abstention]]).
- Choice의 `confidence`는 최고 확률이 균등 분포 `1/n`보다 얼마나 위에 있는지를 0(균등)부터 1(확실)로 잰 `(p_max - 1/n) / (1 - 1/n)`이다. 선택지 3개에서 (0.6, 0.3, 0.1)과 (0.6, 0.2, 0.2)는 둘 다 0.4이므로 2등 후보와의 차이가 중요하면 `probabilities`를 직접 본다.
- Score의 `confidence`는 가장 가능성 높은 단계에서 먼 단계에 실린 확률일수록 더 많이 깎인다. Noul은 `confidence`를 주지 않으며 필요하면 `|2p - 1|`을 쓰도록 안내한다.

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
- [TypeSafe Docs, Noul](https://docs.typesafe.ai/primitives/noul)
- [TypeSafe Docs, Score](https://docs.typesafe.ai/primitives/score)
- [TypeSafe Docs, Confidence](https://docs.typesafe.ai/confidence)
- [TypeSafe Docs, AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer)
- [TypeSafe Docs, How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
- [TypeSafe Docs, Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out)

## 관련 문서

- [[LLM-Decision-Models|결정 모델 (묶음 인덱스)]]
- [[LLM-Decision-Models-Use-Cases|활용 예시]]
- [[LLM-Decision-Models-Comparison|모델 비교, 한계와 운영 체크포인트]]
- [[LLM-Generation-Mechanics-Decoding|LLM 추론과 디코딩]] — Logit과 softmax, 토큰 분포와 확신도의 구분
- [[LLM-Decision-Models-Calibration-Cases|토큰 제한 실험과 확률 보정 사례]]
