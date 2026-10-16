---
tags: [ai, llm, training, inference, explanation]
status: done
verified_at: 2026-10-12
category: "AI엔지니어링(AIEngineering)"
aliases: ["LLM Generation Mechanics Analogies", "LLM 설명 비유", "비개발자용 LLM 설명", "LLM 비유의 한계"]
---

# LLM 동작 원리: 비개발자 설명용 비유와 한계

개발 배경이 없는 사람에게 LLM을 설명할 때 자주 쓰는 비유를 학습과 추론으로 나누고, 비유가 맞는 부분과 깨지는 지점을 함께 둔다. 비유는 처음 구조를 잡는 데 쓰고, 방식이나 비용을 판단할 때는 깨지는 지점과 정밀 문서로 다시 확인한다. 상위: [[LLM-Generation-Mechanics|LLM 동작 원리]].

## 학습 때 정해지는 것과 요청마다 고르는 것

학습은 가중치를 바꾸는 과정이고 추론은 고정된 가중치로 다음 토큰을 계산하는 과정이다. 학습도 예측을 계산하는 순전파를 먼저 거친 뒤 손실과 역전파로 가중치를 고치며, 추론은 순전파만 한다. 추론에서 층과 층 사이로 은닉 상태를 넘기는 일도 순전파이고 역전파를 거꾸로 한 것이 아니다.

| 항목 | 정해지는 시점 | 추론 요청으로 바꾸는가 |
|---|---|---|
| 어휘(토크나이저) | 모델 학습 전에 정한다(Llama 3는 tiktoken의 100K 토큰에 28K를 더했다) | 바꾸지 않는다 |
| 파라미터 수, 층 수, 어텐션 헤드 수 | 모델 설계 | 바꾸지 않는다 |
| 가중치 값 | 사전학습, 사후학습과 파인튜닝 | 바꾸지 않는다. 바꾸려면 다시 학습한다 |
| 최대 컨텍스트 길이 | 설계와 학습(위치 표현, 학습 시퀀스 길이) | 바꾸지 않는다. 장문 추가 학습으로 늘린 사례는 있다(Llama 3는 8K에서 6단계에 걸쳐 128K) |
| 지시, 대화, 검색 결과 | 요청마다 조립한다 | 바꾼다 |
| temperature, top-p, 출력 상한, 추론 강도 | 요청마다 지정한다 | 바꾼다. 받는 값은 모델과 API마다 다르고 샘플링 값을 받지 않는 모델도 있다([[Claude-Opus-5\|Claude Opus 5]]) |

같은 질문에 다른 답이 나와도 그 사이 모델이 배운 것이 아니다. 대화에서 고쳐 준 내용이 다음 답에 반영되는 것처럼 보이면 대화 기록이나 메모리가 다시 Context로 들어간 것이다([[LLM-Generation-Mechanics-Context-and-Agent#자주 헷갈리는 점|자주 헷갈리는 점]]).

## 자주 섞이는 네 가지 수량

토큰과 파라미터는 질문에서 한 덩어리로 섞이기 쉽지만 네 수량은 세는 대상이 다르다. 아래 예는 Llama 3 기술 보고서(2024)의 값이다.

| 수량 | 세는 것 | Llama 3 예 |
|---|---|---|
| 어휘 크기 | 토크나이저가 구분하는 토큰 종류 | 128K |
| 학습 토큰 수 | 사전학습에 쓴 데이터의 양 | 약 15T |
| 파라미터 수 | 학습으로 값이 정해지는 가중치의 개수 | 가장 큰 모델 405B |
| 컨텍스트 윈도 | 한 요청에서 입력과 출력을 합쳐 다루는 최대 토큰 수 | 최대 128K |

모델 이름의 70B는 파라미터가 약 700억(70 × 10억) 개라는 뜻이다. 파라미터 수는 필요한 메모리의 하한도 정해서 8B 모델을 16비트로 저장하면 가중치만 16 GB다([[LLM-Inference-Bottlenecks#로컬 추론의 용량과 지연을 따로 계산한다|용량 계산]]). 학습 토큰 수와 파라미터 수의 관계는 아래 학습 단계의 비유에서 다룬다.

## 학습 단계의 비유

| 비유 | 맞는 부분 | 깨지는 지점 |
|---|---|---|
| 인터넷 글을 한데 모은 글뭉치(말뭉치) | 사전학습은 별도 라벨 없이 원문의 다음 토큰을 정답으로 쓴다 | 모은 글을 그대로 넣지 않는다. Llama 3도 개인정보와 유해 콘텐츠 필터, 중복 제거와 품질 필터를 거친 데이터를 썼다([[LLM-Generation-Mechanics-Training#사전학습 데이터와 재현 가능한 공개 범위\|데이터 선별]]) |
| 반복되는 조각을 묶는 압축 단어집(토큰화) | BPE는 데이터 압축 기법에서 나왔고, 자주 붙어 나오는 조각을 한 기호로 묶어 시퀀스를 줄인다. 한글 음절 한 글자는 UTF-8에서 3바이트(점은 236, 160, 144)이고 바이트 수준 BPE는 이 바이트열에서 출발한다 | 원문으로 그대로 되돌릴 수 있어 손실 압축과 다르다. 어휘는 모델 학습 전에 고정되고, 토큰 경계는 단어나 형태소가 아니라 빈도로 정해진다([[LLM-Generation-Mechanics-Decoding#토크나이저는 빈도로 어휘를 만든다 (BPE)\|BPE]]) |
| 문장 끝을 가리고 맞히는 게임(다음 토큰 예측) | 앞선 토큰으로 다음 토큰의 확률을 높이는 것이 목표다 | 끝 하나만 맞히지 않는다. 미래 위치를 가리는 마스크를 두고 모든 위치의 다음 토큰 로그 확률을 합산하므로, 시퀀스 하나가 위치 수만큼의 문제가 된다 |
| DJ 믹서의 수많은 노브(파라미터) | 수십억 개 이상의 숫자 설정값이 출력을 정하고, 학습은 그 값을 맞추는 과정이다 | 노브 하나에 에코나 저음처럼 사람이 붙일 의미가 있지 않다. 지식은 여러 가중치에 분산된 수치로 들어가므로 데이터베이스의 행처럼 특정 사실을 찾아 고친다고 보장할 수 없다 |
| 틀린 뒤 누구 탓인지 따지는 반성문(역전파) | 손실에 각 파라미터가 얼마나 기여했는지 출력 쪽에서 입력 쪽으로 거슬러 계산한다 | 노브를 하나씩 돌려 보는 시행착오가 아니다. 연쇄법칙으로 모든 파라미터의 기울기를 한 번의 역방향 계산으로 구하고, 실제 값은 경사하강 계열의 옵티마이저가 조금씩 갱신한다 |
| 손실 그래프가 더 내려가지 않으면 멈춘다 | 학습은 손실을 줄이는 최적화이고 손실 곡선으로 진행을 본다 | 학습 데이터의 손실만 보면 과적합을 놓친다. 학습에 쓰지 않은 검증 데이터의 성능으로 판단한다 |
| 빨랫감(학습 토큰)과 세탁 코스(파라미터) | 학습 데이터의 양과 파라미터 수는 다른 수량이다 | 서로 무관하지 않다. 연산 예산이 정해지면 모델 크기와 학습 토큰 수를 같은 비율로 늘리는 편이 효율적이라는 결과가 있다(모델을 두 배로 키우면 학습 토큰도 두 배) |
| 눈치를 익히는 사회화(사후학습) | 다음 토큰만 잘 잇는 베이스 모델에 지시 형식과 응답 태도를 추가 학습으로 익힌다. 시연 데이터로 지도학습을 하고 응답 순위 데이터로 강화학습을 하는 방식이 대표적이다 | 행동과 형식이 바뀌어도 사실성은 보장되지 않는다. 자주 바뀌는 지식은 [[LLM-Generation-Mechanics-Context-and-Agent#프롬프트, RAG와 파인튜닝은 바꿀 대상으로 고른다\|RAG]]를 먼저 검토한다 |
| 잘한 개체만 살아남는 세대 교체(강화학습) | 보상이 높은 행동이 강화된다 | RLHF는 개체 집단을 세대마다 바꾸지 않는다. 사람이 선호한 응답을 예측하도록 학습한 보상 모델의 점수가 높아지도록 한 모델의 가중치를 갱신한다. 섭동한 후보 집단을 평가하는 방식은 [[LLM-Generation-Mechanics-Training#역전파 없이 기울기를 추정하는 0차 방법\|진화 전략]] 같은 별도 계열이다 |
| 본체에 꽂는 확장 키트(LoRA) | 기반 가중치를 고정하고 작은 추가 파라미터만 학습해 전체 재학습보다 싸다 | 모델 밖의 별도 장치가 아니라 각 층의 행렬에 더해지는 저랭크 변화량이다. 기반 가중치에 병합하면 추론 지연이 늘지 않고, 어댑터만으로는 동작하지 않는다 |

## 추론 단계의 비유

| 비유 | 맞는 부분 | 깨지는 지점 |
|---|---|---|
| 숫자 좌표에 자리 잡기(임베딩) | 토큰 ID마다 학습된 벡터를 꺼내 첫 층의 입력으로 쓴다. 위치 정보를 넣는 방식은 모델마다 다르다([[LLM-Generation-Mechanics-Decoding#Token과 위치 표현\|위치 표현]]) | 이 벡터는 문맥을 반영하기 전의 출발점이고 문맥은 이후 층에서 섞인다. RAG 검색용 임베딩은 질문과 문서의 유사도를 재려고 따로 만든 표현이라 모델 안의 토큰 임베딩과 바꿔 쓸 수 없다([[LLM-Generation-Mechanics-Context-and-Agent#Weight, Context, RAG와 Memory는 다르다\|임베딩 구분]]) |
| 문장 속 단어끼리 관계 점수 매기기(어텐션) | 각 위치가 앞선 위치들과의 관련도를 계산해 정보를 섞는다. "가게 대표 메뉴는 치킨이다. 그건 정말 맛있다"에서 뒤의 그건을 계산할 때 앞의 치킨 정보를 크게 반영하는 식이다 | 관계를 문법 규칙으로 정해 두지 않고 학습된 가중치로 계산한다. 여러 헤드가 서로 다른 관계를 병렬로 계산하며, 어텐션 가중치가 판단 이유의 충실한 설명은 아니다 |
| 순서대로 읽다 앞을 잊는 문제의 해결 | 순환 신경망은 위치를 차례로 처리해 먼 위치 사이의 경로가 길고 학습 예제 안에서 병렬화하기 어렵다. self-attention은 어느 두 위치든 한 단계로 잇는다 | 긴 입력을 고르게 쓴다는 뜻은 아니다. 길이와 위치에 따라 활용이 떨어질 수 있고([[Context-Engineering#Context Rot\|Context Rot]]), self-attention의 층당 계산량은 길이의 제곱에 비례해 입력이 길수록 비싸다 |
| 층을 지날 때마다 후보를 좁힌다 | 같은 구조의 층을 여러 번 거치며 각 위치의 표현을 다듬는다 | 층마다 후보 목록을 만들지 않는다. 각 층은 은닉 상태를 갱신하고, 어휘 크기의 점수(로짓)는 마지막 층 출력에서 한 번 계산한다. 층 수는 설계에서 고정되므로 추론 강도를 높여도 층이 늘지 않고, 답하기 전에 생성하는 사고 토큰의 양이 달라진다 |
| 점수표를 백분율로 바꾸기(로짓과 소프트맥스) | 로짓은 음수도 되는 후보별 점수이고, 소프트맥스가 합이 1인 분포로 바꾼다 | 이 확률은 다음 토큰에 대한 모델 점수이지 답이 사실일 확률이 아니다 |
| 온도가 높으면 넓게, 낮으면 위쪽만 | 온도를 낮추면 높은 확률의 후보로 선택이 몰리고 높이면 다양해진다 | 온도는 후보를 자르지 않는다. 로짓을 온도로 나눈 뒤 소프트맥스를 적용해 분포의 모양만 바꾼다. 후보를 자르는 것은 top-k(상위 k개)와 top-p(누적 확률이 p에 이르는 최소 집합)다 |
| 동전 던지기(샘플링)와 매번 다른 답 | 분포에서 확률적으로 고르므로 같은 입력에도 답이 달라질 수 있다 | 답이 달라진 것은 가중치가 바뀌어서가 아니다. 반대로 온도 0의 탐욕적 선택도 API에서 같은 답을 보장하지 않는다. 서버 부하에 따라 배치 크기가 바뀌면 연산 결과가 미세하게 달라질 수 있다([[Eval-Model-Drift-Monitoring\|드리프트 감시]]) |
| 생각 중 표시는 입력을 읽는 시간 | 첫 토큰 전에는 입력 전체를 한꺼번에 처리하는 프리필이 있다 | 추론 모델은 보이는 답 전에 사고 토큰을 생성하므로 대기 시간에 디코드도 들어 있다. 사고 토큰은 보이지 않아도 컨텍스트를 차지하고 출력으로 과금된다([[LLM-Generation-Mechanics-Decoding#Token 단위가 만드는 운영상의 차이\|사고 토큰 과금]]) |
| 앞부분 계산을 적어 두는 메모(KV 캐시) | 앞선 토큰의 key와 value를 저장해 새 토큰마다 같은 계산을 반복하지 않는다 | 응답을 저장했다가 돌려주는 웹 캐시가 아니라 이번 생성의 중간 계산값이다. 층마다 토큰 수만큼 쌓여(슬라이딩 윈도 층은 창 크기까지) GPU 메모리를 차지하고([[LLM-Inference-Bottlenecks\|추론 병목]]), 요청 사이에 같은 앞부분을 재사용하는 일은 [[LLM-Prompt-Caching\|프롬프트 캐싱]]이 맡는다 |
| 멈추는 것도 토큰 | 종료 토큰을 생성하면 생성이 끝난다 | 출력 상한이나 지정한 stop 조건으로도 멈춘다. 스스로 끝낸 답과 잘린 답은 응답의 종료 사유로 구분한다([[LLM-Failure-Handling-Response-Validation#200 응답은 stop_reason부터 확인한다\|stop_reason]]) |

2026-10-12 각 비유의 깨지는 지점을 아래 논문과 공식 문서로 대조했다. 비유와 예문은 설명 도구이고, Llama 3 수치는 2024년 보고서 기준이다.

비유 다음 단계로 실제 계산을 눈으로 따라가려면 GPT 계열 망을 3D로 그린 LLM Visualization(Brendan Bycroft)을 볼 수 있다. 저장소 README 기준 가중치가 들어 있는 첫 모델은 minGPT 데모에서 온 A, B, C 문자 정렬 망이고, GPT-2 크기 모델은 렌더러만 지원하며 가중치는 포함하지 않는다(2026-10-12 확인).

## 이해 점검

1. 같은 질문에 답이 달라졌을 때 바뀐 것은 가중치인가, 무엇인가?
2. 추론 강도를 높이면 바뀌는 것과 바뀌지 않는 것은 무엇인가?
3. 어휘 128K, 학습 토큰 15T, 파라미터 405B, 컨텍스트 128K는 각각 무엇을 세는가?
4. 온도와 top-p는 후보 분포에 각각 어떤 일을 하는가?
5. KV 캐시가 웹 서비스의 응답 캐시와 다른 점은 무엇인가?

## 출처

- [Attention Is All You Need — Vaswani et al.](https://arxiv.org/abs/1706.03762) — 1절의 순환 모델 병렬화, 3.1절의 마스킹, 3.2.2절의 멀티헤드, 표 1의 층당 계산량과 경로 길이
- [Improving Language Understanding by Generative Pre-Training — Radford et al.](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf) — 3.1절의 언어 모델 목적식과 마지막 층 출력의 분포
- [Neural Machine Translation of Rare Words with Subword Units — Sennrich et al.](https://arxiv.org/abs/1508.07909) — 3.2절 BPE의 압축 기원
- [RFC 3629, UTF-8, a transformation format of ISO 10646](https://www.rfc-editor.org/rfc/rfc3629)
- [The Llama 3 Herd of Models — Llama Team, AI @ Meta](https://arxiv.org/abs/2407.21783) — 3.1.1절 웹 데이터 정제, 어휘 구성, 학습 토큰, 파라미터와 장문 학습 단계
- [Training Compute-Optimal Large Language Models — Hoffmann et al.](https://arxiv.org/abs/2203.15556)
- [Training Language Models to Follow Instructions with Human Feedback — Ouyang et al.](https://arxiv.org/abs/2203.02155)
- [LoRA: Low-Rank Adaptation of Large Language Models — Hu et al.](https://arxiv.org/abs/2106.09685)
- [The Curious Case of Neural Text Degeneration — Holtzman et al.](https://arxiv.org/abs/1904.09751) — 3절의 nucleus, top-k와 temperature 샘플링
- [Defeating Nondeterminism in LLM Inference — Thinking Machines Lab, Horace He](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/)
- [OpenAI API Docs, Reasoning models](https://developers.openai.com/api/docs/guides/reasoning)
- [Hugging Face Transformers, Cache strategies](https://huggingface.co/docs/transformers/main/en/kv_cache)
- [LLM Visualization — Brendan Bycroft](https://bbycroft.net/llm)
- [llm-viz — GitHub, bbycroft](https://github.com/bbycroft/llm-viz)
- [YouTube, 양실장의 바이브코딩대학, LLM 신경망 학습부터 추론 원리 전체를 비개발자 15명에게 설명하는 강의](https://www.youtube.com/watch?v=geY4UO23QA8) — 2026-08-28, 비유의 출처. 사실 관계는 위 논문과 공식 문서로 대조

## 관련 문서

- [[LLM-Generation-Mechanics|LLM 동작 원리 (묶음 인덱스)]]
- [[LLM-Generation-Mechanics-Training|학습과 사전학습 이후 조정]]
- [[LLM-Generation-Mechanics-Decoding|추론과 디코딩]]
- [[LLM-Generation-Mechanics-Context-and-Agent|Context, 환각과 에이전트]] — 프롬프트, RAG와 파인튜닝의 선택
- [[LLM-Inference-Bottlenecks|LLM 추론 병목]] — 프리필과 디코드, KV 캐시 메모리
- [[Eval-Model-Drift-Monitoring|서빙 모델 드리프트 감시]] — 같은 모델 ID에서도 출력이 달라지는 경로
- [[Presentation-Delivery|발표 구성과 전달]] — 낯선 주제에서 익숙한 비유와 상위 모델을 먼저 보여 주는 이유
- [[2026-H2-Math-Roadmap|2026 하반기 수학 기초 로드맵]] — 로그, 미분, 내적과 행렬 곱, 회귀의 gradient와 확률 출력이 손실, 역전파, 어텐션과 소프트맥스의 바탕이다
