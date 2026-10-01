---
tags: [ai, llm, transformer, inference]
status: done
verified_at: 2026-09-30
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Generation Mechanics Decoding", "LLM 추론과 디코딩", "Transformer Attention과 Decoding"]
---

# LLM 동작 원리: 추론과 디코딩

추론 단계에서 현재 컨텍스트와 가중치로 다음 토큰 하나가 어떻게 선택되는지를 다룬다. 토큰과 위치 표현, Q, K, V Attention, Transformer Block, Logit에서 샘플링까지다. 상위: [[LLM-Generation-Mechanics|LLM 동작 원리]].

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

### Token 단위가 만드는 운영상의 차이

- **토크나이저는 모델마다 다르다**: 같은 문장도 모델 세대에 따라 토큰 수가 달라진다. Anthropic은 Opus 4.7부터 새 토크나이저를 쓰며, 1M 토큰에 들어가는 영어가 이전 약 75만 단어에서 약 55.5만 단어(약 250만 Unicode 문자)로 줄었다고 안내한다(2026-09-30 모델 개요). 모델을 바꾸면 같은 입력의 비용과 컨텍스트 여유를 다시 잰다
- **언어마다 환산이 다르다**: 토큰당 문자 수는 언어에 따라 달라진다. 한국어가 영어보다 토큰을 더 쓴다는 설명이 흔하지만 차이는 토크나이저 어휘 구성에 좌우되고 공식 배율은 없으므로, 비용 추정은 토큰 카운팅 API로 대표 문서를 직접 재서 정한다
- **문자 단위 작업에 약하다**: 모델은 문자열이 아니라 Token ID 배열을 받는다. 글자 수 세기, 철자 뒤집기, 특정 위치의 문자처럼 토큰 경계와 어긋나는 질문은 틀리기 쉬우므로 정확한 값은 코드 실행으로 계산하게 한다
- **과금과 한도의 단위**: 입력, 출력, 사고가 모두 토큰으로 계산되고 컨텍스트 윈도도 토큰으로 잰다. 사고 토큰은 화면에 요약만 보여도 전부 출력 토큰으로 과금된다

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

선택한 Token을 다시 입력에 붙이고 EOS, stop 조건이나 Runtime의 길이 제한을 만날 때까지 반복한다. 한 토큰씩 붙여 가며 만들기 때문에 응답을 완성 전에 흘려보내는 스트리밍이 가능하고, 첫 토큰까지의 시간(TTFT)과 전체 생성 시간이 따로 재는 지표가 된다. Greedy decoding도 틀릴 수 있으므로 환각을 Sampling만의 문제로 보면 안 된다.

## 이해 점검

1. Q, K와 V 중 Attention weight로 섞이는 실제 정보는 무엇인가?
2. Temperature를 낮춰도 사실 정확성이 보장되지 않는 이유는 무엇인가?
3. 모델이 단어의 글자 수를 자주 틀리는 이유와 대신 쓸 방법은 무엇인가?

## 출처

- [Attention Is All You Need — Vaswani et al.](https://arxiv.org/abs/1706.03762)
- [Attention Is Not Explanation — Jain and Wallace](https://arxiv.org/abs/1902.10186)
- [The Curious Case of Neural Text Degeneration — Holtzman et al.](https://arxiv.org/abs/1904.09751)
- [Anthropic Platform Docs, Glossary](https://platform.claude.com/docs/en/about-claude/glossary)
- [Anthropic Platform Docs, Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Anthropic Platform Docs, Steering thinking](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost)
- [인프런, 널널한 개발자, LLM 서비스, 토큰, 컨텍스트](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498588)

## 관련 문서

- [[LLM-Generation-Mechanics|LLM 동작 원리 (묶음 인덱스)]]
- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]]
- [[LLM-Generation-Mechanics-Context-and-Agent|Context, 환각과 에이전트]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 같은 디코드가 하드웨어에서 왜 느려지는지
