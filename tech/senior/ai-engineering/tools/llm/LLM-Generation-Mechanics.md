---
tags: [senior, ai, llm, transformer, training, inference]
status: done
verified_at: 2026-08-22
category: "Senior - AI 엔지니어링"
aliases: ["LLM Generation Mechanics", "LLM 동작 원리", "대규모 언어 모델 동작 원리"]
---

# LLM 동작 원리: 학습부터 생성과 에이전트까지

LLM은 학습 단계에서 데이터의 통계적 패턴을 가중치에 반영하고, 추론 단계에서 현재 컨텍스트와 가중치로 다음 토큰의 분포를 계산한다. 에이전트는 이 모델에 Runtime, 도구, 상태와 검증 정책을 붙인 시스템이다.

아래 흐름은 GPT 계열과 같은 **decoder-only 자기회귀 텍스트 LLM**을 중심으로 한 학습용 모델이다. 모든 언어 모델이 같은 구조와 학습 단계를 쓰는 것은 아니며, 멀티모달 모델과 encoder-decoder 모델은 입력 표현과 생성 구조가 다를 수 있다.

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

## 추론에서 다음 Token을 만드는 과정

```text
지침 + 대화 + 파일 + 도구 설명
→ Context 조립과 직렬화
→ Tokenizer → Token ID
→ Token Embedding + 위치 정보
→ Transformer Block × N
→ Vocabulary Projection → Logit
→ Softmax와 Decoding
→ 선택한 Token을 입력 뒤에 붙여 반복
```

### Token과 위치 표현

Tokenizer는 문자열을 단어, subword나 문자 단위의 Token ID로 바꾼다. **Token Embedding**은 각 ID를 모델 내부 계산에 쓸 벡터로 변환한다. Attention 자체에는 순서 개념이 없으므로 위치 정보를 주입한다. 원 논문의 sinusoidal encoding 외에도 학습형 위치 embedding과 회전 위치 표현 등 구현은 모델마다 다르다.

### Q, K와 V로 관계 계산

각 층은 현재 표현에서 Query, Key와 Value를 만든다.

| 벡터 | 학습용 직관 |
|---|---|
| **Query** | 현재 위치가 어떤 관계를 계산할지 나타내는 표현 |
| **Key** | 다른 위치가 Query와 얼마나 맞는지 비교할 표현 |
| **Value** | Attention weight에 따라 실제로 섞을 정보 |

```text
Attention(Q, K, V) = softmax(QKᵀ / √dₖ)V
```

**Causal Mask**는 아직 생성하지 않은 미래 위치를 보지 못하게 한다. **Multi-Head Attention**은 서로 다른 projection을 병렬로 사용해 여러 관계를 계산하고 결과를 합친다. Attention weight는 내부 계산값이지 모델 판단을 완전하게 설명하는 충실한 근거는 아니다.

### Transformer Block

대표적인 Block은 Attention과 position-wise FFN을 반복하고 residual connection과 normalization으로 신호 흐름을 안정화한다. FFN은 각 위치의 표현을 비선형 변환한다. normalization 위치와 activation, attention 구현은 모델에 따라 달라질 수 있다.

### Logit에서 Token 선택까지

마지막 표현을 vocabulary 크기의 **Logit**으로 투영하고 Softmax로 다음 토큰에 대한 모델 분포를 만든다. 이 분포는 다음 토큰의 모델 점수이지 사실일 확률이나 정직한 확신도가 아니다.

| 방식 | 역할 | 주의점 |
|---|---|---|
| **Greedy** | 가장 높은 점수의 Token 선택 | 같은 logit에서 보수적으로 고르지만 사실성을 보장하지 않음 |
| **Sampling** | 분포에서 확률적으로 선택 | 다양성과 출력 변동이 생김 |
| **Temperature** | 분포의 뾰족함을 조절 | 지원 범위와 해석은 API, 모델별 확인 필요 |
| **Top-k** | 상위 k개 후보로 제한 | 고정 개수라 분포 모양을 반영하지 못할 수 있음 |
| **Top-p** | 누적 확률 p를 채우는 후보 집합에서 선택 | 입력마다 후보 수가 달라짐 |

선택한 Token을 다시 입력에 붙이고 EOS, stop 조건이나 Runtime의 길이 제한을 만날 때까지 반복한다. Greedy decoding도 틀릴 수 있으므로 환각을 Sampling만의 문제로 보면 안 된다.

## Weight, Context, RAG와 Memory는 다르다

| 층 | 담는 것 | 언제 바뀌는가 |
|---|---|---|
| **Weight** | 학습된 통계적 패턴과 연관 | Training이나 별도 model update |
| **Context** | 이번 요청의 지침, 대화와 읽어 온 자료 | 추론 호출마다 조립 |
| **RAG와 Tool Result** | 외부 저장소와 시스템에서 가져온 현재 근거 | 조회 후 Context에 추가 |
| **Memory** | Host가 이후 호출에 다시 제공하도록 보존한 정보 | 제품과 설정의 저장, 선택 정책에 따라 다름 |

모델 내부의 Token Embedding은 Token ID를 Transformer 공간에 넣는 표현이다. 검색용 Embedding은 query와 문서 chunk를 유사도 공간에 놓고 외부 자료를 찾는 표현이다. 둘 다 벡터지만 학습 목적, pooling, 공간과 소비자 계약을 확인하지 않고 직접 대체할 수 없다.

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

## 자주 헷갈리는 점

- 파일을 읽었다고 모델이 즉시 재학습한 것은 아니다. 고정 가중치 추론에서는 Context만 달라진다.
- Attention은 외부 검색이나 사실 조회가 아니라 현재 sequence 표현을 섞는 내부 계산이다.
- Context Window는 Weight나 장기 Memory와 같지 않다.
- 유창한 문장, 긴 reasoning과 높은 모델 점수는 검증된 사실의 증거가 아니다.
- RAG와 Tool Calling은 모델의 지식을 늘리는 학습이 아니라 외부 근거와 행동 수단을 연결한다.

## 이해 점검

1. 문서를 읽은 직후 달라지는 것은 Weight인가, Context인가?
2. Q, K와 V 중 Attention weight로 섞이는 실제 정보는 무엇인가?
3. Token Embedding과 검색용 Embedding은 각각 누가 무엇을 위해 사용하는가?
4. Temperature를 낮춰도 사실 정확성이 보장되지 않는 이유는 무엇인가?

## 관련 문서

- [[Codex-Agent-Execution-Model|Codex 에이전트 실행 원리]]
- [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 기초]]
- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[Vector-Similarity-Search|벡터 유사도 검색]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[LLM-Workflow-Patterns|LLM 워크플로우 패턴]]
- [[LLM-Abstention|LLM 응답 보류와 캘리브레이션]]
- [[LLM-Eval-Strategy|LLM 평가 전략]]

## 출처

- [Introduction to Large Language Models — Google Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/llm)
- [Neural Networks: Training Using Backpropagation — Google Machine Learning Crash Course](https://developers.google.com/machine-learning/crash-course/neural-networks/backpropagation)
- [Attention Is All You Need — Vaswani et al.](https://arxiv.org/abs/1706.03762)
- [Attention Is Not Explanation — Jain and Wallace](https://arxiv.org/abs/1902.10186)
- [Language Models are Few-Shot Learners — Brown et al.](https://arxiv.org/abs/2005.14165)
- [Training Language Models to Follow Instructions with Human Feedback — Ouyang et al.](https://arxiv.org/abs/2203.02155)
- [Direct Preference Optimization — Rafailov et al.](https://arxiv.org/abs/2305.18290)
- [The Curious Case of Neural Text Degeneration — Holtzman et al.](https://arxiv.org/abs/1904.09751)
- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks — Lewis et al.](https://arxiv.org/abs/2005.11401)
- [Function Calling — OpenAI API](https://developers.openai.com/api/docs/guides/function-calling)
