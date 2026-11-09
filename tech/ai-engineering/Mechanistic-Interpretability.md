---
tags: [ai, interpretability, neural-networks, superposition]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Mechanistic Interpretability", "기계적 해석가능성", "Weight-Space Programming", "가중치 공간 프로그래밍"]
---

# 신경망의 기계적 해석가능성

기계적 해석가능성은 신경망 내부의 활성값, 가중치와 연결을 조사해 출력이 만들어지는 계산을 설명하려는 접근이다. 출력에 그럴듯한 설명을 붙이는 것과 내부 계산에 대한 가설을 실험하는 것은 구분한다.

## 뉴런, 특성, 회로를 나누어 본다

| 단위 | 살펴보는 대상 | 주의할 점 |
|---|---|---|
| 뉴런 | 특정 위치의 활성값과 입력에 따른 반응 | 사람의 개념 하나와 일대일로 대응한다고 가정하지 않는다 |
| 특성(feature) | 표현 공간에서 해석 가능한 패턴이나 방향 | 개별 뉴런뿐 아니라 여러 뉴런의 선형 결합으로 표현될 수 있다 |
| 회로(circuit) | 특성과 가중치 연결로 이루어진 계산 부분 그래프 | 한 뉴런의 이름만 붙이지 말고 앞뒤 계산과 출력에 미치는 영향을 확인한다 |

예를 들어 곡선 검출기라는 설명은 강하게 반응한 사진 몇 장만으로 끝나지 않는다. 곡률과 방향을 바꾼 합성 입력, 실제 데이터의 반응, 앞선 특성의 조합과 뒤쪽 연결을 함께 확인한다. 서로 다른 검사에서 같은 설명이 유지되는지 보는 방식이다.

## 다의미성과 중첩은 같은 명제가 아니다

다의미성(polysemanticity)은 한 뉴런이 서로 무관해 보이는 여러 패턴에 반응하는 관측이다. 중첩(superposition)은 표현 차원 수보다 많은 특성을 겹쳐 담는 표현 방식이다. 무관해 보이는 반응만으로 그 원인이 중첩이라고 확정할 수는 없다.

2022년의 합성 데이터 실험은 작은 ReLU 신경망에서 희소한 특성을 차원 수보다 많이 표현할 수 있음을 보였다. 간섭을 허용하고 비선형 연산으로 걸러 내는 조건을 분석한 결과다. 이 실험에서 중첩이 나타났다는 사실과 모든 대형 모델의 다의미성을 중첩으로 설명할 수 있다는 주장은 다르다. 연구 자체도 실제 신경망으로의 일반화 범위를 미해결로 남긴다.

## 뉴런 직접 조사와 사전(dictionary) 학습을 통한 분해

원래 뉴런과 회로를 직접 조사하거나, 활성값을 별도 특성 집합으로 분해해 조사할 수 있다. 여기서 사전(dictionary) 학습은 언어모델의 사전학습(pretraining)과 다른 뜻이다.

2023년 Anthropic의 작은 Transformer 실험은 512개 뉴런의 층을 4,000개 이상의 특성으로 분해했다. DNA 서열, HTTP 요청 등 개별 뉴런만으로 잘 드러나지 않던 패턴을 분석 단위로 얻은 사례다. 분해된 특성을 얻었다는 결과를 모든 뉴런이 무의미하다거나 전체 모델이 해석됐다는 뜻으로 확대하지 않는다.

## 관측의 재해석과 작업 가설

2026-11-03 확인한 Goodfire의 연구 에세이는 **작업 가설**이다. InceptionV1의 `4e:55`가 고양이 얼굴과 자동차 앞부분에 반응하는 현상을 공통의 뾰족한 양측 형태로 재해석한다. 10월 30일 수정 설명은 이를 단순한 V자 검출기로 축약한 이전 표현이 지나쳤다고 밝힌다. 상류의 고양이, 여우와 자동차 검출기를 실제로 입력받으며, 쟁점은 그 대상들이 묶이는 이유다.

에세이의 Qwen3-32B 예비 조사에서 neuron pole 약 90%가 주된 역할 하나를 가진다는 수치는 전체 신경망 이해율이 아니다. 약한 활성값을 포함하는 문턱, 층의 깊이와 관련 역할을 하나로 세는 기준에 따라 달라지는 추정이다. 양의 반응과 음의 반응도 살펴본다.

Recursive generalization은 처음의 패턴이 관련된 다른 패턴으로 확장된다는 설명 가설이다. 이를 모든 다의미성의 확정 원인이나 중첩 연구 전체의 반증으로 기록하지 않는다. 비전 모델의 관측, 언어모델의 예비 조사와 후속 기술 논문 예고를 구분한다.

## 모델이 다른 모델의 가중치를 읽고 고친 실험의 범위

MIT CSAIL 연구진이 2026-11-02 공개한 연구 글은 GPT-6 Astra에 신경망 가중치를 건네 읽기, 작성, 수정 과제를 맡겼다. 실험마다 입력과 허용한 도구가 달라 결과를 하나의 능력으로 묶어 읽지 않는다. 아래 수치는 연구진의 보고값이며 이 문서에서 재현하지 않았다.

| 과제 | 입력과 허용 도구 | 보고 결과 | 함께 볼 조건 |
|---|---|---|---|
| 게임 식별 | 같은 구조(입력 500, 출력 5)의 PPO 정책망 4개, 각 가중치 17,253개를 텍스트로. 도구 없음 | Breakout, Pong, Pac-Man, Freeway를 모두 맞힘 | 입력 채널이 게임 화면의 격자 칸에 대응해 첫 층 가중치 크기만 그려도 Breakout 패들 줄 같은 구조가 보인다는 반론이 있다. 노트북의 Qwen 3.8 27B(Q4_K_M, 17GB)도 도구 없이 4개 중 3개를 맞혔고 한 게임에 46분에서 65분이 걸렸다 |
| 가중치 작성 | MinAtar 정책망(입력 600, 출력 6)을 데이터, 손실, 기울기와 실행 없이 응답 한 번으로 작성 | Breakout 517.4점으로 PPO 1억 스텝 15.8, 5억 스텝 25.3보다 높음. Seaquest 53.1(PPO 1억 스텝 5.6, 5억 스텝 88.9), Asterix 53.2(25.8, 55.2) | 5억 스텝 PPO를 모든 게임에서 넘지는 않았다 |
| 아첨 모델 식별 | Gemma 3 270M의 아첨 학습 모델과 정직한 모델 | 가중치만으로는 4번 모두 구분하지 못했고, 어텐션 패턴 도구를 주자 3쌍을 모두 맞힘 | 가중치 읽기와 실행 중 활성값 관찰은 다른 조건이다 |
| Qwen3.5-0.8B 수정 | Python으로 가중치 분석, forward pass 예산 최대 50회(1회에 문제 최대 512개), 연습 문제는 GSM8K와 MATH 학습셋에서 선택 | 15층과 19층 MLP가 쓰는 한 방향을 각 64개 출력 열에서 빼(131,072개, 0.016%) MATH-500 7.9%에서 48.1%, IFEval 21.0%에서 62.3% | 예산 10회와 25회에서는 MATH-500 12.3%, 14.1%였다. Gemma 3 270M에는 같은 시도로 1점 넘는 개선이 없었다 |

### 막힌 능력을 푼 것과 새 능력을 더한 것은 다르다

- 수정 전 Qwen3.5-0.8B는 같은 내용을 반복하다 답에 이르지 못해 첫 연습 답 96개 중 85개가 32,768토큰 한도에 닿았고, 수정 뒤 MATH-500에서 한도에 닿은 비율은 93.0%에서 33.1%로 줄었다. 연구진도 가중치 편집은 능력을 가리던 장애를 없앨 수 있어도 없던 능력을 더하지는 못했다고 정리한다.
- 모델 카드는 이 모델이 다른 Qwen3.5 모델보다 thinking loop에 빠지기 쉽다고 이미 적고 presence_penalty 조정과 비정상 생성의 감지와 중단을 권한다. 알려진 실패를 고친 사례로 읽는다.
- 연구의 생성 설정(temperature 0.6, presence penalty 1.5)은 모델 카드가 thinking 모드의 텍스트 과업에 권하는 temperature 1.0과 다르다. 개선 폭을 옮겨 쓸 때는 기준선을 권장 설정에서 쟀는지 확인한다(이 문서의 대조).

### 도구 없는 읽기와 코드로 하는 분석을 나눈다

- 도구 없이 원시 가중치를 읽은 실험은 17K~172K개 가중치의 작은 망에 한정되고, Qwen 수정은 Python과 모델 실행을 허용한 조건이다. 두 결과를 합쳐 큰 모델을 숫자만 보고 이해하고 고친다고 읽지 않는다.
- 연구 글 본문은 방향을 찾은 절차를 자세히 적지 않는다. 비판 글은 Astra가 반복하는 추론과 그렇지 않은 추론의 글 네 쌍을 만들어 반복에 기여하는 가중치를 재고 줄였다고 설명하며, 이를 스티어링과 거절 방향 제거(abliteration)에 가까운 방법이자 숙련된 ML 연구자도 할 수 있는 일로 본다.
- 가중치 직접 편집은 컴파일된 바이너리를 패치하는 일에 가깝고 모델 개선의 주된 경로는 학습이라는 시각도 있다. 가중치가 공개된 모델은 제작사 밖에서도 같은 버전으로 원본과 수정본을 같은 설정에서 비교할 수 있으므로, 수정 주장은 그 비교 결과로 확인한다(적용 제안). 공개 가중치의 검증 가치와 한계는 [[AI-Frontier-Regulation-Debate#오픈 웨이트와 허가 없는 검증|오픈 웨이트와 허가 없는 검증]]에서 다룬다.

## 설명을 검증할 때의 점검 제안

1. 모델, 층, 뉴런과 조사한 입력 집합을 고정한다.
2. 강한 활성 예시 외에 약한 반응, 음의 반응과 반례를 찾는다.
3. 물체 이름 목록만 붙이지 말고 모양, 문맥과 계산상 역할이라는 대안 설명을 비교한다.
4. 입력이나 활성값을 바꾸는 개입 실험으로 설명이 예측한 반응과 실제 반응을 대조한다.
5. 설명 가능한 특성의 비율, 특정 행동의 원인 설명과 전체 모델의 안전성을 서로 다른 결과로 보고한다.
6. 가중치 편집 결과는 허용 도구, 실행 예산, 연습셋과 평가셋의 분리, 기준선의 생성 설정을 함께 기록하고, 길이 한도나 반복 같은 알려진 실패의 해소인지 새 능력인지 나눈다.

이 목록은 위 연구를 읽고 적용할 검사 기준이다. 이번 문서 작성에서 모델 실행, 뉴런 개입, 가중치 편집이나 보고된 비율의 독립 재현은 하지 않았다.

## 출처

- [Zoom In: An Introduction to Circuits — Distill](https://distill.pub/2020/circuits/zoom-in/) — 특성과 회로, 곡선 검출기의 여러 검증 방법.
- [Toy Models of Superposition — Transformer Circuits](https://transformer-circuits.pub/2022/toy_model/index.html) — 합성 데이터의 중첩 실험과 실제 모델로의 일반화 한계.
- [Towards monosemanticity: Decomposing language models with dictionary learning — Anthropic](https://www.anthropic.com/research/towards-monosemanticity-decomposing-language-models-with-dictionary-learning) — 512개 뉴런 층의 특성 분해에 대한 연구기관의 공개 요약. 상세 논문 전체는 대조하지 않았다.
- [Neural Networks Are Already Clean — Goodfire, Nick Cammarata](https://already-clean.goodfire.com/) — 작업 가설, `4e:55`의 수정 설명과 Qwen3-32B 예비 조사의 한계.
- [Sparks of Weight-Space Programming: LLMs can natively read & write neural network weights — MIT CSAIL, Rikiya Takehi 외](https://rikiyat.github.io/blog/weight-space-programming/) — 2026-11-02. 2026-11-09 실험별 입력, 허용 도구, forward pass 예산, 생성 설정과 결과 대조.
- [LLMs are not superhuman at reading and writing neural network weights — Sean Goedecke](https://www.seangoedecke.com/llms-are-not-superhuman-at-reading-and-writing-neural-network-weights/) — 2026-11-03. 첫 층 가중치로 게임을 추정하는 단서, Qwen 수정 방법의 해석.
- [The 'Astra can read and write weights to improve Qwen' post is misleading — Matthew Honnibal](https://honnibal.dev/blog/astra-read-write-misleading) — 2026-11-03. 도구 없는 읽기 실험의 범위와 실패 사례.
- [Qwen 3.8 27B on my laptop can interpret model weights, too — Simon Willison](https://simonwillison.net/2026/Nov/3/qwen-can-interpret-model-weights/) — 2026-11-03. 로컬 모델의 게임 식별 결과와 소요 시간.
- [Qwen/Qwen3.5-0.8B — Hugging Face, Qwen](https://huggingface.co/Qwen/Qwen3.5-0.8B) — 2026-11-09 thinking loop 경고와 권장 샘플링 값 대조.

## 관련 문서

- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]]
- [[Latent-Reasoning|잠재 추론]]
- [[Neural-Circuit-Interpretability|뉴런과 회로의 관찰과 인과 검증]]
- [[AI-Frontier-Regulation-Debate|프론티어 AI 규제 논쟁]] — 공개 가중치로 하는 외부 검증
