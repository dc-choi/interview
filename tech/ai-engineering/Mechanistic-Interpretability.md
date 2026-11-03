---
tags: [ai, interpretability, neural-networks, superposition]
status: done
verified_at: 2026-11-03
category: "AI엔지니어링(AIEngineering)"
aliases: ["Mechanistic Interpretability", "기계적 해석가능성"]
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

## 설명을 검증할 때의 점검 제안

1. 모델, 층, 뉴런과 조사한 입력 집합을 고정한다.
2. 강한 활성 예시 외에 약한 반응, 음의 반응과 반례를 찾는다.
3. 물체 이름 목록만 붙이지 말고 모양, 문맥과 계산상 역할이라는 대안 설명을 비교한다.
4. 입력이나 활성값을 바꾸는 개입 실험으로 설명이 예측한 반응과 실제 반응을 대조한다.
5. 설명 가능한 특성의 비율, 특정 행동의 원인 설명과 전체 모델의 안전성을 서로 다른 결과로 보고한다.

이 목록은 위 연구를 읽고 적용할 검사 기준이다. 이번 문서 작성에서 모델 실행, 뉴런 개입이나 보고된 비율의 독립 재현은 하지 않았다.

## 출처

- [Zoom In: An Introduction to Circuits — Distill](https://distill.pub/2020/circuits/zoom-in/) — 특성과 회로, 곡선 검출기의 여러 검증 방법.
- [Toy Models of Superposition — Transformer Circuits](https://transformer-circuits.pub/2022/toy_model/index.html) — 합성 데이터의 중첩 실험과 실제 모델로의 일반화 한계.
- [Towards monosemanticity: Decomposing language models with dictionary learning — Anthropic](https://www.anthropic.com/research/towards-monosemanticity-decomposing-language-models-with-dictionary-learning) — 512개 뉴런 층의 특성 분해에 대한 연구기관의 공개 요약. 상세 논문 전체는 대조하지 않았다.
- [Neural Networks Are Already Clean — Goodfire, Nick Cammarata](https://already-clean.goodfire.com/) — 작업 가설, `4e:55`의 수정 설명과 Qwen3-32B 예비 조사의 한계.

## 관련 문서

- [[Deep-Learning-Foundations-and-Practice|딥러닝 기초와 실습]]
- [[Latent-Reasoning|잠재 추론]]
