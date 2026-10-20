---
tags: [ai, llm, transformer, inference]
status: done
verified_at: 2026-10-20
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

Tokenizer는 문자열을 단어, subword나 문자 단위의 Token ID로 바꾼다. **Token Embedding**은 각 ID를 모델 내부 계산에 쓸 벡터로 변환한다. 위치 표현이나 순서를 제한하는 mask가 없는 self-attention은 토큰 순서를 별도로 표현하지 않는다. 원 논문의 sinusoidal encoding 외에도 학습형 위치 embedding과 회전 위치 표현 등 구현은 모델마다 다르다.

Transformer 원 논문(Vaswani et al., 2017)이 sinusoidal을 고른 근거는 두 가설이다(3.5절). 고정된 거리 k마다 `PE(pos+k)`를 `PE(pos)`의 선형 함수로 나타낼 수 있어 모델이 상대 위치로 attend하는 법을 쉽게 배울 것이라는 점과, 학습 때보다 긴 시퀀스로 외삽할 수 있으리라는 점이다. 실험으로 보인 것은 학습형 위치 embedding으로 바꿔도 결과가 거의 같았다는 점이다(표 3 E행, 영어-독일어 번역 개발 세트 BLEU 25.7 대 base 25.8). 이 비교는 같은 개발 세트의 품질만 쟀으므로 상대 위치 가설과 외삽 가설을 모두 확인하지 않고, 위치 표현 방식의 일반적인 우열 근거도 아니다.

#### Sinusoidal과 RoPE가 위치를 넣는 지점

2026-10-21 원 논문 두 편의 위치 표현 절을 대조한 범위다. 아래 수식은 구조 설명이며 특정 서비스 모델이 이 설정을 쓴다는 뜻은 아니다.

- **Sinusoidal**: 원 Transformer는 `PE(pos, 2i) = sin(pos / 10000^(2i/d_model))`, `PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))`를 쓴다. 서로 다른 주파수의 sine/cosine 쌍으로 위치 벡터를 만들고, 같은 차원의 token embedding에 더한다. 위치 0의 벡터는 `[0, 1, 0, 1, ...]`이다.
- **RoPE**: RoFormer는 Query와 Key의 성분을 2차원 쌍으로 묶고 위치에 따른 회전을 적용한다. 위치 m, n의 회전 행렬을 `R_m`, `R_n`이라 하면 `(R_m q)ᵀ(R_n k) = qᵀR_(n-m)k`가 되어 위치의 영향이 상대 거리로 들어간다. 점수 전체가 거리만으로 정해지는 것은 아니며 q와 k의 내용에도 의존한다.
- **해석의 한계**: sine/cosine을 사용한다는 공통점만으로 두 방법을 같은 연산으로 보지 않는다. 입력에 위치 벡터를 더하는 것과 Q/K를 회전하는 것은 다르다. 큰 위치의 수식을 계산할 수 있다는 사실도 그 길이에서의 과제 품질을 보장하지 않는다.

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

Transformer 원 논문의 주 실험은 영어-독일어, 영어-프랑스어 번역용 encoder-decoder이고(영어 구문 분석에도 따로 적용했다), 표 3은 영어-독일어 번역 개발 세트(newstest2013)에서 base 모델의 일부 설정만 바꿔 잰 결과다. 아래의 표 3 수치는 이 조건의 결과이므로 현재 LLM의 기본값으로 옮기지 않는다. 표 3은 반복 실행 수나 분산을 보고하지 않으므로 행 사이 차이가 잡음보다 큰지 표만으로는 판단할 수 없고, E행의 0.1이나 32개 헤드의 0.4 하락처럼 작은 차이일수록 설계 결론의 근거로 약하다.

- **√dₖ로 나누는 이유**: 내적 attention은 이론상 복잡도가 additive attention과 비슷하지만 최적화된 행렬곱으로 구현해 실제로 더 빠르고 메모리를 덜 쓴다. 다만 원 논문이 인용한 선행 연구에서는(원 논문의 서술 기준이며 선행 연구 원문은 이 문서에서 대조하지 않았다) dₖ가 크면 스케일링 없는 내적 attention이 additive attention보다 성능이 낮았다. 그 원인을 내적의 크기가 커져 softmax가 기울기가 매우 작은 영역으로 밀리는 데서 찾아 √dₖ로 나눈다(3.2.1절). 이 원인은 측정이 아니라 추정(we suspect)이다. 각주는 q와 k의 성분이 평균 0, 분산 1인 독립 확률변수라고 가정하면 둘의 내적이 평균 0, 분산 dₖ가 된다는 예시 계산이며, 스케일링을 뺀 비교는 표 3에 없다
- **헤드 수와 차원**: 헤드를 나누면 서로 다른 표현 부분공간의 정보를 여러 위치에서 함께 볼 수 있고, 단일 헤드에서는 평균이 이를 막는다는 것이 설계 이유다. base는 h=8에 `dₖ = dᵥ = d_model/h = 64`를 써서 헤드마다 차원을 줄였으므로 총 계산 비용이 전체 차원의 단일 헤드 attention과 비슷하다(3.2.2절). 계산량을 고정하고 헤드 수와 차원을 바꾼 표 3 A행에서 단일 헤드(dₖ=512)는 최적 설정보다 BLEU가 0.9 낮았고(24.9 대 25.8), 16개는 base와 같은 25.8, 32개(dₖ=16)는 25.4였다. 여러 헤드의 이점은 표에 보고된 단일 헤드 설정 하나와 여러 헤드 설정들의 비교(0.5~0.9 BLEU 차이)에 기대며, 각 설정의 반복 실행 횟수는 보고되지 않았다. 이 과제의 결과만으로 다른 규모의 모델에 맞는 헤드 수를 정할 수 없다
- **층당 계산량**: 표 1의 층당 계산은 self-attention O(n²d), recurrent O(nd²)이고 순차 연산과 최대 경로 길이는 O(1) 대 O(n)이다(n은 시퀀스 길이, d는 표현 차원). 따라서 계산 복잡도로는 n이 d보다 작으면 self-attention 층이 recurrent 층보다 빠르고, 당시 기계 번역의 word-piece와 BPE 문장 표현은 대개 이 조건에 들었다(4절). 매우 긴 시퀀스에는 각 출력 위치를 중심으로 한 크기 r의 이웃만 보는 restricted self-attention(층당 O(rnd), 최대 경로 O(n/r))이 향후 과제로 제안됐다. 제곱 비용을 줄이는 커널 기반 접근은 [[Linear-Attention|선형 어텐션]]에서 다룬다

### Transformer Block

대표적인 Block은 Attention과 position-wise FFN을 반복하고 residual connection과 normalization으로 신호 흐름을 안정화한다. FFN은 각 위치의 표현을 비선형 변환한다. normalization 위치와 activation, attention 구현은 모델에 따라 달라질 수 있다.

Transformer 원 논문의 base는 encoder와 decoder가 각 6층(N=6), `d_model = 512`이고 FFN 내부 차원 `d_ff = 2048`은 `d_model`의 4배다(3.1절, 3.3절). 파라미터는 영어-독일어 설정(공유 BPE 어휘 약 37,000개) 기준 base 6500만 개, big 2억 1300만 개이고(표 3, 5.1절), P100 GPU 8장을 단 머신 한 대에서 base는 10만 step(12시간), big은 30만 step(3.5일) 학습했다(5.2절). 2017년 번역 모델의 구성이므로 decoder-only LLM의 층 수, 차원이나 학습 비용의 기준으로 쓰지 않는다.

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
6. 원 논문이 √dₖ로 나누고 sinusoidal 위치 표현을 고른 이유 가운데 실험으로 확인한 것과 가설로 남은 것은 무엇인가?

## 출처

- [Attention Is All You Need — Vaswani et al.](https://arxiv.org/abs/1706.03762)
- [RoFormer: Enhanced Transformer with Rotary Position Embedding — Su et al.](https://arxiv.org/abs/2104.09864) — 2026-10-21 위치 회전과 상대 거리 수식 대조. 기존 토크나이저와 API 과금 절의 확인일은 유지한다.
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
- [[LLM-Generation-Mechanics-Analogies|비개발자 설명용 비유와 한계]] — 온도와 top-p, 층과 로짓, KV 캐시 비유가 깨지는 지점
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 같은 디코드가 하드웨어에서 왜 느려지는지
- [[LLM-Prompt-Caching|LLM 프롬프트 캐싱]] — 벤더별 캐시 단가
- [[LLM-Failure-Handling-Response-Validation|LLM 실패 처리]] — 보내기 전 토큰 계산과 `max_tokens` 잘림
- [[OpenSearch-Korean-Text-Analysis|OpenSearch 한국어 텍스트 분석]] — 형태소 기반 검색 토큰화와 BPE의 차이
