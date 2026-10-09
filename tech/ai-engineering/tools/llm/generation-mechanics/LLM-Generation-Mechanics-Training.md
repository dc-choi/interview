---
tags: [ai, llm, training]
status: done
verified_at: 2026-10-06
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

## 사전학습 데이터와 재현 가능한 공개 범위

가중치를 내려받을 수 있다는 사실만으로 학습을 재현할 수 있는 것은 아니다. 데이터 출처와 전처리, tokenizer, 학습 코드, hyperparameter, 로그와 checkpoint의 공개 범위를 함께 확인한다. 공개된 각 구성요소의 사용 조건도 별도 확인 대상이다.

데이터 선별에서는 노이즈 제거, 중복 제거와 품질 평가가 서로 다른 역할을 한다. KORMo의 2025년 기술 보고서는 한국어 웹 데이터에 이 세 단계를 적용한 사례다. 특정 품질 점수의 상위 데이터만 고르는 규칙을 모든 언어와 과업에 그대로 적용하지 않고, 남은 데이터 규모와 실제 과업 성능을 함께 비교한다.

실험 설계에서는 다음 항목을 분리해 기록하는 편이 유용하다.

- 원시 데이터와 필터 뒤 데이터의 양, 출처와 언어 비율
- tokenizer 구성과 토큰화 효율, 비교 학습에 사용한 토큰 예산
- 합성 데이터의 생성 방식과 비율, 중복 제거와 품질 필터 조건
- 학습 loss와 학습에 쓰지 않은 평가 데이터의 과업 성능

이는 재현과 비교를 위한 점검 제안이다. 한 모델의 합성 데이터 실험 결과를 다른 데이터 분포에서도 성능 저하가 없다는 보장으로 확대하지 않는다. 보고서의 데이터 공개와 필터링 범위를 2026-10-07 대조했으며, 모델을 직접 학습해 결과를 재현한 것은 아니다.

### 데이터셋의 수집과 사용 조건을 함께 기록한다

데이터 양과 품질 점수만으로 수집 경위와 사용 조건을 설명할 수는 없다. 데이터셋 문서에는 생성 목적, 구성, 수집 과정, 전처리, 권장 용도, 배포와 유지보수 정보를 연결한다. 다운로드 가능 여부와 사용 조건의 확인은 별도 항목이다.

| 기록할 경계 | 확인할 내용 |
|---|---|
| 수집 | 원천, 수집 방법과 기간, 표본 범위, 동의가 필요한 경우의 절차 |
| 전처리 | 필터링, 중복 제거와 라벨링 과정, 원시 자료와 처리 코드의 접근 조건 |
| 사용과 배포 | 의도한 용도와 부적합한 용도, 라이선스와 이용약관, 제3자가 부과한 제한 |
| 유지보수 | 수정과 삭제의 전달 방식, 보존 기간 제한, 이전 버전의 지원과 폐기 안내 |

학습 실행에 적용할 때는 사용한 데이터셋 버전과 전처리 설정을 모델 체크포인트에 연결해 추적하는 방식을 검토한다. 이는 위 문서화 항목에서 도출한 실험 관리 제안이다. 데이터셋 설명서를 작성했다는 사실만으로 사용의 적법성이나 모든 위험의 해소를 입증하지는 못한다.

2026-10-10 데이터셋 문서화의 원 논문과 대조했다. 특정 기업의 수집 행위, 소송 당사자의 주장이나 판결 결과를 확인한 내용은 아니다.

## 사전학습 이후의 조정

| 단계 | 학습 신호 | 목적 |
|---|---|---|
| **Pretraining** | 대규모 데이터의 Token 예측 | 언어와 코드의 일반 패턴 학습 |
| **SFT** | 사람이 작성하거나 승인한 입력과 응답 예시 | 지시 형식과 원하는 응답 행동 학습 |
| **RLHF** | 응답 비교로 학습한 Reward Model과 강화학습 | 사람의 선호에 가까운 행동 강화 |
| **DPO** | 선호 응답과 비선호 응답의 쌍 | 별도 강화학습 루프 없이 선호를 직접 최적화 |

이는 가능한 대표 단계이지 모든 모델의 필수 고정 순서가 아니다. 데이터 구성, 목적 함수와 선호 최적화 방식은 모델 계열마다 다르다. 후속 학습은 행동을 조정하지만 사실 정확성을 자동으로 보장하지 않는다.

## LoRA와 QLoRA: 바꾸는 파라미터와 저장 정밀도

SFT와 RLHF가 학습 신호와 목적을 구분한다면, LoRA와 QLoRA는 모델을 적응시키는 파라미터 구성과 메모리 사용 방식을 다룬다. SFT를 LoRA로 수행할 수 있으므로 서로 대체하는 같은 층위의 선택지가 아니다.

**LoRA(Low-Rank Adaptation)**는 기존 가중치 행렬을 고정하고 저랭크 행렬 두 개의 곱으로 변화량을 학습한다. 원 논문의 스케일링을 포함하면 출력은 다음과 같다.

$$h = W_0x + (\alpha/r)BAx$$

- $W_0$는 $d \times k$의 고정 가중치, $A$는 $r \times k$, $B$는 $d \times r$의 학습 행렬이다.
- 한 행렬의 학습 파라미터 수는 $dk$ 대신 $r(k+d)$가 된다. $r$이 작으면 줄어들지만 기반 모델의 계산과 저장 자체가 사라지지는 않는다.
- 원 논문의 초기화는 $A$를 무작위, $B$를 0으로 두어 초기 변화량을 0으로 만든다. rank와 적용할 행렬의 선택은 적응 용량과 비용을 함께 바꾼다.
- 일반 LoRA의 변화량은 기반 가중치에 합쳐 별도 어댑터 연산 없이 추론할 수 있다. 어댑터만 저장한 경우에는 대응하는 기반 모델도 필요하다.

**QLoRA**는 고정된 기반 가중치를 주로 4비트로 저장하고 LoRA 파라미터를 학습한다. 원 논문은 연산 시 BFloat16으로 역양자화하며, NF4, 양자화 상수를 다시 양자화하는 double quantization, 메모리 급증을 다루는 paged optimizer를 결합한다. 저장 비트 수와 연산 정밀도는 다르다.

메모리 절감이 같은 비율의 학습 속도 향상을 뜻하지 않는다. 기반 가중치를 고정해도 어댑터 학습을 위한 순전파와 역전파가 필요하다. 논문에서 비교한 과업의 성능 회복을 모든 모델과 데이터의 무손실 보장으로 확대하지 않는다.

실무에서는 프롬프트 기준선과 비교할 평가 데이터를 먼저 고정하고, 학습 데이터와 분리한 예제로 목적 과업과 기존 능력의 회귀를 확인한다. 배포할 기반 체크포인트, 어댑터, 양자화와 병합 구성을 함께 고정해 다시 평가한다. 최신 정보 제공과 출처 추적은 [[LLM-Generation-Mechanics-Context-and-Agent|Context와 RAG]]의 책임과 별도로 판단한다.

## 출처

- [Datasheets for Datasets — Gebru et al.](https://arxiv.org/html/1803.09010v8)
- [KORMo: Korean Open Reasoning Model for Everyone — KAIST MLP Lab et al.](https://arxiv.org/html/2510.09426v1) — 공개 범위, tokenizer와 데이터 구성, 4.1.3절의 필터링
- [LoRA: Low-Rank Adaptation of Large Language Models — Hu et al.](https://arxiv.org/abs/2106.09685)
- [QLoRA: Efficient Finetuning of Quantized LLMs — Dettmers et al.](https://arxiv.org/abs/2305.14314)

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
