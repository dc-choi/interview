---
tags: [ai, llm, training]
status: done
verified_at: 2026-08-22
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Generation Mechanics Training", "LLM 학습 원리", "LLM 사전학습과 정렬"]
---

# LLM 동작 원리: 학습과 사전학습 이후 조정

학습 단계에서 데이터의 통계적 패턴이 어떻게 가중치에 들어가는지를 다룬다. AI 전체 지도, Training과 Inference의 구분, 역전파와 사전학습, 그 뒤의 SFT, RLHF, DPO 조정까지다. 상위: [[LLM-Generation-Mechanics|LLM 동작 원리]].

## AI 전체 지도

```text
AI
├─ 규칙, 탐색과 계획으로 동작하는 시스템
└─ Machine Learning: 데이터에서 parameter를 학습
   └─ Deep Learning: 여러 층의 신경망을 사용
      └─ 현대의 Foundation Model과 생성 모델
         └─ LLM: 언어 Token 분포를 다루는 대규모 모델

LLM + Context + Runtime + Tool + State + Guardrail = LLM 기반 Agent
```

이 구조는 포함 관계를 이해하기 위한 실무용 지도다. Foundation Model과 생성 모델은 목적과 학습 방식에 따라 범위가 겹치며, Agent는 LLM보다 더 작은 모델 종류가 아니라 모델을 감싼 시스템 계층이다. 규칙 기반 시스템도 AI 범주에 포함될 수 있으므로 모든 AI가 학습하는 것은 아니다.

## Training과 Inference

| 구분 | 목적 | Weight 변경 | 대표 입력 |
|---|---|---|---|
| **Training** | 데이터의 패턴을 parameter에 반영 | 변경함 | 대규모 학습 데이터, 정답 예시, 선호 데이터 |
| **Inference** | 현재 입력에 대한 출력을 계산 | 고정 가중치 추론에서는 변경하지 않음 | Prompt, 대화, 파일, 검색 결과와 도구 명세 |

현재 대화에서 파일을 읽거나 RAG로 문서를 가져오는 일은 보통 재학습이 아니다. 이번 추론의 Context가 늘어나는 것이다.

## LLM은 어떻게 학습하는가

대표적인 자기회귀 사전학습은 앞선 토큰으로 다음 토큰을 예측한다.

```text
학습 Text → Token ID
→ Forward Pass로 다음 Token 예측
→ 정답 Token과 비교해 Cross-Entropy Loss 계산
→ Backpropagation으로 각 Parameter의 Gradient 계산
→ Optimizer가 Weight 갱신
→ 다음 Batch에서 반복
```

정답 토큰의 확률이 낮을수록 대표적인 loss는 커진다.

```text
loss = -log P(정답 Token | 앞선 Token들)
```

- **Forward Pass**: 현재 weight로 예측을 계산한다.
- **Loss**: 예측이 학습 목표에서 얼마나 벗어났는지 하나의 최적화 값으로 만든다.
- **Backpropagation**: chain rule로 각 parameter가 loss에 미친 기울기를 뒤에서 앞으로 계산한다.
- **Gradient Descent와 Optimizer**: loss가 작아지는 방향으로 parameter를 조금씩 갱신한다.
- **Train, Validation과 Test**: 학습, 선택과 일반화 평가를 분리한다. Train loss만 낮고 새 데이터 성능이 나쁘면 과적합을 의심한다.

Weight는 문장을 행 단위로 저장한 사실 데이터베이스가 아니다. 많은 예제에서 학습된 패턴과 연관이 분산된 수치로 들어가므로, 특정 사실을 정확히 조회하거나 출처를 그대로 복원한다고 보장할 수 없다.

## 사전학습 이후의 조정

| 단계 | 학습 신호 | 목적 |
|---|---|---|
| **Pretraining** | 대규모 데이터의 Token 예측 | 언어와 코드의 일반 패턴 학습 |
| **SFT** | 사람이 작성하거나 승인한 입력과 응답 예시 | 지시 형식과 원하는 응답 행동 학습 |
| **RLHF** | 응답 비교로 학습한 Reward Model과 강화학습 | 사람의 선호에 가까운 행동 강화 |
| **DPO** | 선호 응답과 비선호 응답의 쌍 | 별도 강화학습 루프 없이 선호를 직접 최적화 |

이는 가능한 대표 단계이지 모든 모델의 필수 고정 순서가 아니다. 데이터 구성, 목적 함수와 선호 최적화 방식은 모델 계열마다 다르다. 후속 학습은 행동을 조정하지만 사실 정확성을 자동으로 보장하지 않는다.

## 출처

- [Introduction to Large Language Models — Google Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/llm)
- [Neural Networks: Training Using Backpropagation — Google Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/neural-networks/backpropagation)
- [Language Models are Few-Shot Learners — Brown et al.](https://arxiv.org/abs/2005.14165)
- [Training Language Models to Follow Instructions with Human Feedback — Ouyang et al.](https://arxiv.org/abs/2203.02155)
- [Direct Preference Optimization — Rafailov et al.](https://arxiv.org/abs/2305.18290)

## 관련 문서

- [[LLM-Generation-Mechanics|LLM 동작 원리 (묶음 인덱스)]]
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]
- [[LLM-Generation-Mechanics-Context-and-Agent|Context, 환각과 에이전트]]
- [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 기초]]
