---
tags: [ai, llm, transformer, inference]
status: done
verified_at: 2026-10-06
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Generation Mechanics Decoding", "LLM 추론과 디코딩", "Transformer Attention과 Decoding"]
---

# LLM 동작 원리: 추론과 디코딩

추론 단계에서 현재 컨텍스트와 가중치로 다음 토큰 하나가 어떻게 선택되는지를 다룬다. 토큰과 위치 표현, 토크나이저가 어휘를 만드는 방식(BPE), Q, K, V Attention, Transformer Block, Logit에서 샘플링까지다. 상위: [[LLM-Generation-Mechanics|LLM 동작 원리]].

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

### 토크나이저는 빈도로 어휘를 만든다 (BPE)

- **학습**: 바이트 수준 BPE는 256개 바이트를 기본 토큰으로 두고, 학습 말뭉치에서 가장 자주 이웃하는 두 조각을 새 토큰으로 더하는 일을 목표 어휘 크기까지 반복한다. 어휘 크기는 초기 기호 수에 병합 횟수를 더한 값이다. 원 논문도 단어 경계를 넘는 쌍은 세지 않으며 병합 횟수를 유일한 하이퍼파라미터로 둔다. tiktoken의 학습 함수는 그 단어 경계를 정하는 정규식(`pat_str`)을 따로 받고, 병합은 정규식이 나눈 조각 안에서만 일어난다
- **결과**: 자주 나오는 문자열은 한 토큰이 되고 드문 조합은 여러 조각으로 남는다. 경계를 문법이나 형태소가 아니라 학습 말뭉치의 빈도와 단어를 먼저 나누는 정규식으로 정하므로 사람 눈에는 어색하게 잘릴 수 있다. 문서와 검색어를 형태소로 자르는 검색 분석기와는 목적이 다르다([[OpenSearch-Korean-Text-Analysis|Nori 형태소 분석]])
- **인코딩**: 입력에는 학습 때 먼저 만들어진(순위가 낮은) 병합부터 적용하고, 각 조각을 고유한 토큰 ID로 바꿔 모델에 넣는다. 바이트에서 출발하므로 학습에 없던 텍스트도 표현할 수 있고 원문으로 손실 없이 되돌릴 수 있다
- **공백**: 공백은 보통 다음 단어의 시작과 한 조각으로 묶인다(앞 공백이 붙은 ` is` 같은 조각). 그래서 앞 공백이 있는 조각과 없는 조각은 서로 다른 토큰이다
- **세대 차이**: 같은 문자열도 인코딩 세대마다 토큰 수가 다르다. OpenAI 쿡북의 일본어 예 お誕生日おめでとう는 r50k_base와 p50k_base에서 14개, cl100k_base에서 9개, o200k_base에서 8개다. GPT-6 계열이 어느 인코딩을 쓰는지는 2026-10-06 공식 문서에서 확인하지 못했으므로 이 수치를 현재 모델의 토큰 수로 옮기지 않는다

### Token 단위가 만드는 운영상의 차이

- **토크나이저는 모델마다 다르다**: 같은 문장도 모델 세대에 따라 토큰 수가 달라진다. Anthropic은 Opus 4.7부터 새 토크나이저를 쓰며, 1M 토큰에 들어가는 영어가 이전 약 75만 단어에서 약 55.5만 단어(약 250만 Unicode 문자)로 줄었다고 안내한다(2026-09-30 모델 개요). 모델을 바꾸면 같은 입력의 비용과 컨텍스트 여유를 다시 잰다
- **언어마다 환산이 다르다**: 영어에는 토큰당 약 4자라는 경험칙이 있다(Anthropic 가격 FAQ는 약 4자 또는 0.75단어, Gemini 문서는 100토큰당 60~80단어, tiktoken README는 평균 약 4바이트로 설명한다). 그러나 경험칙은 토크나이저 세대를 반영하지 않는다. 2026-10-06 기준 같은 Anthropic 가격 문서는 Claude 4.7 이후 토크나이저가 같은 텍스트에 약 30% 더 많은 토큰을 만들고 정확한 증가폭은 내용과 작업 형태에 따라 다르다고 밝히며, 모델 개요 기준 현재 토크나이저의 1M 토큰은 약 250만 문자(토큰당 약 2.5자)다. 토큰당 문자 수는 언어에 따라 달라진다. 한국어가 영어보다 토큰을 더 쓴다는 설명이 흔하지만 차이는 토크나이저 어휘 구성에 좌우되고 공식 배율은 없으므로, 비용 추정은 토큰 카운팅 API로 대표 문서를 직접 재서 정한다
- **문자 단위 작업에 약하다**: 모델은 문자열이 아니라 Token ID 배열을 받는다. 글자 수 세기, 철자 뒤집기, 특정 위치의 문자처럼 토큰 경계와 어긋나는 질문은 틀리기 쉬우므로 정확한 값은 코드 실행으로 계산하게 한다
- **이미지도 토큰으로 환산된다**: 2026-10-06 벤더 문서 기준으로 Anthropic은 28×28px 패치를 시각 토큰으로 보고 ⌈너비/28⌉×⌈높이/28⌉로 센다. Claude 4.7 이후 모델은 고해상도 등급(긴 변 2576px, 최대 4784토큰), 나머지 모델은 표준 등급(1568px, 1568토큰)이다. 한도를 넘는 이미지는 기본적으로 비율을 유지한 채 줄여서 처리하므로 이미지당 비용에 상한이 생긴다(1920×1080은 표준 1560토큰, 고해상도 2691토큰). OpenAI는 이미지 토큰을 입력으로 과금하고 TPM 한도에도 넣는다. GPT-6 Astra와 GPT-5.6 계열 등은 32×32px 패치 수(⌈너비/32⌉×⌈높이/32⌉)에 모델별 배수를 곱해 과금 토큰을 세고, GPT-4o 같은 일부 이전 모델은 타일 단위로 센다. Gemini 3 계열은 `media_resolution` 수준이 이미지에 배정할 최대 토큰을 정한다(low 280, medium 560, high 1120, ultra high 2240, 이미지 기본 1120). 그래서 비용 레버도 다르다. 패치 방식에서는 작업에 필요한 해상도로 줄여 보내거나 OpenAI의 `detail` 수준을 고르고, Gemini 3에서는 `media_resolution` 수준을 고른다. Anthropic도 고해상도 충실도가 필요 없으면 줄여 보내라고 권한다
- **과금과 한도의 단위**: 입력, 출력, 사고가 모두 토큰으로 계산되고 컨텍스트 윈도도 토큰으로 잰다. 사고 토큰은 화면에 요약만 보여도 전부 출력 토큰으로 과금된다. 2026-10-06 벤더 문서 기준으로 Anthropic은 `display` 설정과 무관하게 생성된 사고 전체를 과금하고, OpenAI 추론 토큰은 API로 보이지 않지만 컨텍스트를 차지하며 출력으로 과금되고, Gemini 가격표의 출력 단가는 사고 토큰을 포함한다. 사고는 출력 상한(Anthropic `max_tokens`, OpenAI Responses API `max_output_tokens`)도 함께 쓰므로 상한이 작으면 보이는 답 없이 입력과 사고 비용만 낼 수 있다. 상한은 사고와 답을 함께 담을 크기로 잡는다(OpenAI는 처음 실험할 때 추론과 출력에 25,000토큰 이상을 남기라고 권한다). 사고 비중은 `usage.output_tokens_details`의 `thinking_tokens`(Anthropic)와 `reasoning_tokens`(OpenAI)로 본다

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
4. BPE 토크나이저가 한국어 단어를 문법과 다른 위치에서 자르는 이유는 무엇인가?
5. 출력 상한을 작게 잡은 추론 요청이 보이는 답 없이 비용만 낼 수 있는 이유는 무엇인가?

## 출처

- [Attention Is All You Need — Vaswani et al.](https://arxiv.org/abs/1706.03762)
- [Attention Is Not Explanation — Jain and Wallace](https://arxiv.org/abs/1902.10186)
- [The Curious Case of Neural Text Degeneration — Holtzman et al.](https://arxiv.org/abs/1904.09751)
- [Neural Machine Translation of Rare Words with Subword Units — Sennrich et al.](https://arxiv.org/abs/1508.07909)
- [Anthropic Platform Docs, Glossary](https://platform.claude.com/docs/en/about-claude/glossary)
- [Anthropic Platform Docs, Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Anthropic Platform Docs, Steering thinking](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost)
- [Anthropic Platform Docs, Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Anthropic Platform Docs, Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- [OpenAI API Docs, Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)
- [OpenAI API Docs, Images and vision](https://developers.openai.com/api/docs/guides/images-vision)
- [Gemini API Docs, Understand and count tokens](https://ai.google.dev/gemini-api/docs/tokens)
- [Gemini API Docs, Media resolution](https://ai.google.dev/gemini-api/docs/media-resolution)
- [Gemini API Docs, Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [tiktoken — GitHub, openai](https://github.com/openai/tiktoken)
- [tiktoken/_educational.py — GitHub, openai](https://github.com/openai/tiktoken/blob/main/tiktoken/_educational.py)
- [How to count tokens with tiktoken — OpenAI Cookbook](https://developers.openai.com/cookbook/examples/how_to_count_tokens_with_tiktoken)
- [인프런, 널널한 개발자, LLM 서비스, 토큰, 컨텍스트](https://www.inflearn.com/courses/lecture?courseId=344484&unitId=498588)

## 관련 문서

- [[LLM-Generation-Mechanics|LLM 동작 원리 (묶음 인덱스)]]
- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]]
- [[LLM-Generation-Mechanics-Context-and-Agent|Context, 환각과 에이전트]]
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 같은 디코드가 하드웨어에서 왜 느려지는지
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]] — 벤더별 캐시 단가
- [[LLM-Failure-Handling|LLM 실패 처리]] — 보내기 전 토큰 계산과 `max_tokens` 잘림
- [[OpenSearch-Korean-Text-Analysis|OpenSearch 한국어 텍스트 분석]] — 형태소 기반 검색 토큰화와 BPE의 차이
