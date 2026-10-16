---
tags: [ai, llm, training]
status: done
verified_at: 2026-10-11
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

현재 대화에서 파일을 읽거나 RAG로 문서를 가져오는 일은 보통 재학습이 아니다. 이번 추론의 Context가 늘어나는 것이다. 학습 때 정해지는 수량과 요청마다 고르는 설정의 구분, 비개발자에게 설명할 때 쓰는 비유와 그 한계는 [[LLM-Generation-Mechanics-Analogies|설명용 비유와 한계]]에 둔다.

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

### 역전파 없이 기울기를 추정하는 0차 방법

역전파는 망이 미분 가능해야 쓸 수 있다. 진화 전략과 Dust는 기울기를 직접 계산하지 않고 섭동에 따른 목적 함수 값의 변화로 기울기를 추정하는 0차(zeroth-order) 방법이다.

- **진화 전략(Evolution Strategies, ES)**: 자연 진화 전략(NES) 계열의 한 형태는 파라미터에 가우스 잡음을 더한 후보 여러 개의 목적 함수 값을 구하고, 각 잡음을 그 값으로 가중 평균해 기울기를 추정한다. 단순한 가중치 공간 ES는 후보마다 섭동한 가중치 사본과 순전파가 따로 필요해 집단을 키울수록 비싸다. EGGROLL은 섭동을 저랭크 행렬로 구성해 GPU 배치 행렬곱의 산술 강도를 높인 ES다.
- **Dust**: 가중치 대신 각 선형 층의 출력에 토큰마다 독립적인 가우스 잡음을 더하는 활성값 섭동(node perturbation)이다. 각 토큰이 가상 집단(virtual population)의 구성원이 되므로 순전파 한 번이 구성원 하나가 아니라 시퀀스의 토큰 수만큼을 평가한다. 각 토큰의 잡음에는 그 토큰의 손실 감소에 더해 감쇠 계수 γ로 줄인 뒤쪽 토큰들의 손실 감소까지 보상으로 준다. γ가 0이면 자기 토큰만 반영하고, key와 value처럼 뒤 토큰에 영향을 주는 위치에는 1에 가까운 γ를 쓴다. 보상으로 가중한 잡음을 여러 번의 잡음 추출(draw)에 걸쳐 평균해 층 출력의 오차로 추정한다. 이 오차와 층 입력의 외적이 가중치 기울기다. 역전파도 같은 외적을 만들고 출력 오차를 chain rule로 얻는다는 점만 다르다. 추정한 기울기로는 SGD 같은 옵티마이저가 가중치를 갱신한다.

아래 결과는 Q Labs의 2026년 10월 연구 페이지와 부록 기준이며 학회나 저널 게재 표시는 없고, 최소 구현 코드가 공개돼 있다. FineWeb으로 학습한 GPT 계열 transformer(기본 8층, 폭 512)의 test loss(세 seed 평균)를 같은 토큰 예산에서 모멘텀 SGD로 학습한 역전파와 비교하면, 10만 토큰 예산에서 수백 draw, 100만 토큰에서 약 1,000 draw 이상이면 역전파보다 낮았다. 최선 측정값의 차이는 10만 토큰에서 0.051, 100만 토큰에서 0.025이고, 연산량을 맞춘 비교는 아니다. 1,000만, 2,000만 토큰에서는 학습 비교의 최대 집단(16k draw)도 역전파보다 높았다. 집단을 키울수록 격차는 줄었지만 1,000만 토큰에서는 감소가 완만해져 거듭제곱 외삽값도 역전파보다 약간 높았다. 연구진이 같은 transformer 구조로 구현한 EGGROLL(EGGROLL-Transformer)은 Dust 최소 집단(64 draw)의 256배 집단에서도 그 결과에 미치지 못했다(집단 크기는 Dust는 draw, EGGROLL은 배치 순전파 수 기준). 1,000만 토큰 고정 비교에서는 256 draw 이상의 같은 집단일 때 200만에서 3,800만 파라미터까지 클수록 loss가 낮았고, 가장 큰 2억 4,300만은 그보다 약간 높았다. 섭동하는 차원이 늘수록 추정 분산이 커져 0차 방법은 큰 망에 불리하다고 여겨져 왔는데, 연구진은 이 결과를 그 통념과 반대되는 근거로 제시했다.

다만 역전파에 근접하려면 큰 집단, 즉 훨씬 많은 연산이 필요하고, 연구진도 현재 연산 수준에서 역전파의 실용적인 대안이 되려면 연산 효율이 자릿수 단위로 좋아져야 한다고 밝혔다. 망이 끝까지 미분 가능하지 않아도 된다는 성질은 외부 프로그램이 계산 루프에 들어간 망에, backward pass가 없다는 점은 시간 역전파(BPTT)로 학습하기 어려운 여러 단계 반복 transformer에 적용할 여지를 주지만, 두 구조는 이 연구에서 학습하지 않은 후속 과제로 남았다. 2억 4,300만 파라미터 모델은 1,000만 토큰, 2,000만 토큰 학습은 기본 3,770만 파라미터 모델까지의 결과이므로 대규모 사전학습에서 역전파를 대체한다는 근거로 확대하지 않는다.

2026-10-11 연구 페이지와 부록, 코드 README, ES 논문의 알고리즘과 EGGROLL 논문 초록을 대조했다. 실험을 재현하거나 코드를 실행하지는 않았다.

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

## 분산 학습의 ZeRO는 학습 상태를 나눠 보관한다

LoRA는 학습할 파라미터를 줄이고 양자화는 저장 정밀도를 낮춘다. DeepSpeed의 ZeRO는 데이터 병렬 프로세스마다 중복 보관하던 학습 상태를 분할한다. 서로 다른 메모리 절감 수단이므로 같은 기능으로 취급하지 않는다.

| ZeRO 단계 | 프로세스 사이에 분할하는 상태 |
|---|---|
| 1 | 옵티마이저 상태 |
| 2 | 옵티마이저 상태와 그래디언트 |
| 3 | 옵티마이저 상태, 그래디언트와 모델 파라미터 |

ZeRO-3는 순전파와 역전파 중 필요한 파라미터를 모으고 다시 분할한다. CPU 오프로딩도 상태 종류를 나눠 설정한다. `offload_optimizer`의 CPU 설정은 ZeRO 1, 2, 3에서 쓸 수 있고, `offload_param`은 ZeRO-3에서 사용한다. 분할은 저장 책임을 나누는 일이고 오프로딩은 저장 위치를 옮기는 일이다.

실험에서는 모델, 입력 길이, 배치, 정밀도와 장비 조건을 고정한 뒤 최대 GPU 메모리, 단계별 시간과 최종 평가 성능을 함께 비교한다. 이는 검증 설계 제안이다. GPU 메모리에 들어간다는 결과를 일정 배수의 속도 향상이나 모든 LoRA, 양자화 조합의 호환성으로 확대하지 않는다.

2026-10-10 DeepSpeed 공식 튜토리얼과 설정 문서에서 위 단계와 CPU 오프로딩 범위를 확인했다. 특정 SageMaker 이미지, 장비 조합이나 분산 학습 실행은 검증하지 않았다.

## 출처

- [DeepSpeed, Zero Redundancy Optimizer](https://www.deepspeed.ai/tutorials/zero/)
- [DeepSpeed, JSON Configuration: ZeRO optimizations](https://github.com/deepspeedai/DeepSpeed/blob/master/docs/_pages/config-json.md)
- [AI No Longer Needs Backpropagation — Better Stack](https://www.youtube.com/watch?v=SYVPCSnLhcY) — 2026-10-10, Dust 소개 영상
- [Datasheets for Datasets — Gebru et al.](https://arxiv.org/html/1803.09010v8)
- [Dust: Pretraining Transformers Without Backpropagation — Dahal et al.](https://qlabs.sh/research/dust) — Q Labs 연구 페이지, 방법, 실험 조건과 결론
- [Dust: Pretraining Transformers Without Backpropagation, Appendix — Dahal et al.](https://qlabs.sh/research/dust/appendix.html) — Table 1의 토큰 예산별 test loss
- [Evolution Strategies as a Scalable Alternative to Reinforcement Learning — Salimans et al.](https://arxiv.org/abs/1703.03864) — 2절과 Algorithm 1
- [Evolution Strategies at the Hyperscale — Sarkar et al.](https://arxiv.org/abs/2511.16652)
- [KORMo: Korean Open Reasoning Model for Everyone — KAIST MLP Lab et al.](https://arxiv.org/html/2510.09426v1) — 공개 범위, tokenizer와 데이터 구성, 4.1.3절의 필터링
- [LoRA: Low-Rank Adaptation of Large Language Models — Hu et al.](https://arxiv.org/abs/2106.09685)
- [qlabs-eng/dust — GitHub](https://github.com/qlabs-eng/dust)
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
- [[LLM-Generation-Mechanics-Analogies|비개발자 설명용 비유와 한계]]
- [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 기초]]
