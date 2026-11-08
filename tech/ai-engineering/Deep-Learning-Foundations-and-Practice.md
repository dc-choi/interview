---
tags: [ai, deep-learning, keras, learning]
status: done
verified_at: 2026-10-22
category: "AI엔지니어링(AIEngineering)"
aliases: ["딥러닝 기초와 실습", "Deep Learning Foundations and Practice"]
---

# 딥러닝 기초와 실습

딥러닝 입문에서는 모델 이름을 많이 아는 것과 문제를 데이터, 학습, 평가로 옮길 수 있는 능력을 구분한다. 작은 예제를 실행한 뒤 각 단계의 입력과 결과를 설명하는 방식으로 이해를 확인할 수 있다.

## 서로 다른 과업을 공통 학습 절차로 다룬다

이미지, 음성, 텍스트는 입력 표현과 출력 과업이 다르다. 신경망은 이를 수치 표현으로 바꾸고, 손실을 계산하고, 역전파로 기울기를 구해 파라미터를 갱신하는 공통 절차를 제공한다. 공통 학습 절차가 있다는 사실은 모든 과업에 같은 구조, 데이터와 평가 지표가 맞는다는 뜻은 아니다.

경사하강법은 손실을 줄이는 방향으로 파라미터를 갱신한다. 미분값 자체가 가장 작아지도록 만드는 과정으로 설명하지 않는다. 지도학습은 정답 라벨을 쓰고, 자기지도학습은 데이터에서 예측 목표를 구성한다. 강화학습은 행동 후 보상을 바탕으로 정책을 개선한다([[Reinforcement-Learning-from-Experience|경험 기반 강화학습]]).

2012년 대규모 비지도학습 연구는 1,000대의 장비에서 모델 병렬성과 비동기 SGD로 특징을 학습했고, 얼굴과 고양이 얼굴 등에 반응하는 특징을 얻었다. 이는 사람처럼 고양이 개념 전체를 이해했다는 증거가 아니다. 후속 분류 평가에는 라벨을 사용했으므로 비지도 특징 학습과 지도 분류를 구분한다. 분산 시스템의 가치는 모델과 데이터를 더 크게 다룰 수 있게 하는 데 있으며, 규모 증가의 효과는 과업별 결과로 확인한다.

## 순환 모델과 Transformer의 병렬성

순환 신경망은 이전 은닉 상태를 계산해야 다음 상태로 진행할 수 있어 학습 시 시퀀스 방향의 병렬화에 제약이 있다. Transformer는 attention으로 위치 사이의 정보를 결합하며 학습 시 여러 위치를 병렬 계산하기 쉽다. 모든 과거 정보를 하나의 벡터에 넣는 설명은 단순한 순환 모델의 직관이며, attention을 쓴 이전 모델까지 같은 구조로 단정하지 않는다.

| 학습 또는 실행 방식 | 사용할 수 있는 문맥 | 구분할 점 |
|---|---|---|
| 자기회귀 언어 모델 | 현재 위치보다 앞선 토큰 | 학습에서는 여러 위치를 병렬 처리할 수 있어도 생성 시에는 새 토큰을 순차적으로 이어 간다 |
| BERT의 masked language modeling | 가려진 위치 양쪽의 문맥 | 빈칸 복원 학습이며 같은 방식의 순차 생성과 다르다 |
| 멀티모달 모델 | 텍스트 외 이미지, 음성, 영상 등의 표현 | 입력을 받는 능력과 각 과업의 정확도는 별도 평가한다 |

2017년 Transformer 논문은 번역 과업에서 병렬성과 학습 시간 개선을 보였다. 강연의 학습 계산량 10~100배 감소라는 설명을 모든 모델, 과업과 하드웨어에 적용하는 보장으로 사용하지 않는다. 학습 비용은 데이터량, 품질 목표, 연산량과 실제 소요 시간을 함께 비교한다. 추론 하드웨어 수요와 에너지 문제는 [[HBM-Stack-and-Base-Die|HBM과 메모리 계층]], 과학 응용은 [[AI-Scientific-Discovery-Loops|AI 과학 발견 루프]]로 연결한다.

## 순차 학습과 파괴적 망각

한 신경망을 과업 A로 학습한 뒤 과업 B의 데이터만으로 이어서 학습하면 A의 성능이 크게 떨어질 수 있다. 이를 파괴적 망각(catastrophic forgetting)이라 한다. 여러 과업을 차례로 학습할 때 A에 중요한 가중치가 B의 목표에 맞춰 바뀌기 때문이며, 이 현상은 연결주의 모델에 피할 수 없는 성질로 널리 여겨졌다.

| 대응 | 원리 | 확인할 비용 |
|---|---|---|
| 함께 학습 | 여러 과업의 데이터를 섞어 학습해 모든 과업에 맞게 가중치를 함께 최적화한다 | 모든 과업의 데이터를 학습 시점에 확보해야 한다 |
| 리플레이 | 저장한 이전 데이터나 생성 모델이 만든 과거 표본, 내부 표현을 다시 학습에 넣는다 | 저장할 기억이 과업 수에 비례해 늘 수 있고, 생성 방식은 생성기 학습이 필요하다 |
| 가중치 보호 | 이전 과업에 중요한 가중치의 학습을 그 중요도에 따라 늦춘다 | 어떤 가중치가 중요한지 추정해야 한다 |

- Kirkpatrick 외(2017)는 가중치 보호 방식의 알고리즘으로 elastic weight consolidation(EWC)을 제안했다. 이전 과업의 해 근처에 중요한 가중치를 묶어 두는 이차 벌점을 쓰고, MNIST 기반 분류 과업들과 여러 Atari 2600 게임을 차례로 학습하는 실험으로 효과를 보였다.
- 생성 리플레이는 작은 예제에서는 시험 때 과업 정보 없이 지금까지 본 모든 클래스 중에서 골라야 하는 class-incremental 설정에서도 망각을 막지만, 과업이 많거나 입력이 복잡하면 규모를 키우기 어렵다. van de Ven 외(2020)는 입력 대신 신경망 내부의 은닉 표현을 재생하고, 그 표현을 신경망 자신의 context-modulated feedback 연결로 생성하는 방식을 제안했다. 초록 기준으로 데이터를 저장하지 않고 CIFAR-100 class-incremental(마지막에는 100개 클래스 중 선택) 같은 벤치마크에서 당시 최고 수준 성능을 보고했으며, 비교 대상과 실험 조건은 본문에서 확인한다.
- Tadros 외(2022)는 국소 비지도 Hebbian 가소성 규칙과 잡음 입력으로 오프라인 학습하는 수면 유사 단계를 넣었다. MNIST, Fashion MNIST, CUB-200, CIFAR10의 증분 학습으로 시험했고, 초록은 이 단계가 새 과업 학습 뒤 잊힌 이전 과업을 회복시켰다고 보고한다. 데이터셋별 결과, 계산 비용과 한계는 초록과 결과 절 도입부의 확인 범위 밖이다.

새 데이터로 모델을 이어서 갱신하는 운영에서는 계속 맞춰야 하는 이전 과업이나 분포의 고정 평가 세트를 함께 남겨 망각 여부를 확인하는 방안을 검토한다(평가 제안). 관심이 바뀌는 concept drift에서는 낡은 구간의 성능 하락이 의도한 적응일 수 있으므로 망각과 구분해 해석한다. 회귀를 막는 평가 관문은 [[Eval-Golden-Set-and-Deploy-Gates|골든셋과 배포 관문]], 추천시스템의 online 학습과 concept drift는 [[Recommendation-System-Industry-Large-Scale-ML|대규모 추천 모델의 학습과 서빙]]에서 다룬다.

## 개념에서 과업으로 이어지는 학습 범위

다음은 입문 교재의 구성과 공식 실습 문서를 연결한 학습 제안이다. 개인의 확정 진도나 전체 교재 학습 완료를 뜻하지 않는다.

| 범위 | 익힐 대상 | 이해 확인 질문 |
|---|---|---|
| 수학과 표현 | 텐서, 신경망의 연산과 학습에 필요한 수학 | 입력과 출력의 형태를 설명할 수 있는가? |
| 학습 과정 | 모델, 손실, 최적화와 평가 지표 | 무엇을 줄이도록 학습하고 무엇으로 결과를 판단하는가? |
| 작은 과업 | 분류와 회귀 | 같은 예제를 새 입력에 적용하고 오류를 설명할 수 있는가? |
| 개발 흐름 | 문제 정의, 모델 개발, 배포와 관찰 | 학습 결과와 실제 사용 중 성능을 어떻게 구분하는가? |
| 응용 탐색 | 비전, 시계열, 텍스트와 생성 모델 | 해결할 과업에 맞는 예제를 고를 수 있는가? |

## Keras의 학습, 평가와 추론

Keras 공식 가이드는 내장 API의 역할을 나눈다.

- `Model.fit()`: 학습을 실행한다. `validation_data`로 검증 데이터를 전달해 검증 손실과 지표를 확인할 수 있다.
- `Model.evaluate()`: 주어진 데이터에서 손실과 평가 지표를 계산한다.
- `Model.predict()`: 입력의 예측값을 만든다. 예측값이 생성됐다는 사실과 정답에 가까운지는 다른 확인이다.

Keras 3를 사용할 때는 TensorFlow, PyTorch 또는 JAX 같은 백엔드 프레임워크도 필요하다. 세 프레임워크를 모두 익힌 뒤에야 입문할 수 있다는 뜻은 아니다. 예제의 백엔드와 환경을 하나로 정하고, 실행한 버전과 데이터 조건을 남기는 방식으로 시작할 수 있다.

## 교재와 실습 자료의 확인 범위

《Deep Learning with Python, Third Edition》은 François Chollet와 Matthew Watson의 입문 자료 후보다. 출판사 소개와 공식 배급사 목차에서 수학 기초, 프레임워크, 분류와 회귀, 머신러닝 기본과 개발 흐름, 비전, 시계열, 언어 모델과 생성 과업을 확인했다. 출판사 안내는 중급 Python 지식을 전제로 하며 머신러닝과 선형대수의 사전 경험은 요구하지 않는다고 설명한다.

교재 목차를 확인한 것과 교재 본문을 학습하거나 예제를 재현한 것은 다르다. 여기서는 전체 본문, 한국어 번역판의 대응 관계와 코드 실행 결과를 검증하지 않았다. 특정 예제가 현재 최고 성능이라는 주장도 하지 않는다. 실습 중에는 선택한 버전의 공식 가이드로 API를 다시 대조한다.

## 적용 연습

1. 작은 분류 예제 하나를 고르고 입력, 정답과 평가 지표를 적는다.
2. 학습, 평가와 예측을 구분해 실행하고 각 결과의 의미를 설명한다.
3. 환경이나 설정을 바꿀 때는 이전 결과와 비교할 조건을 고정한다.

이는 이해 확인 절차의 제안이다. 실행 성공만으로 데이터 품질이나 배포 적합성까지 검증됐다고 판단하지 않는다.

2026-11-03 추가 대조 범위는 대규모 특징 학습 연구와 Transformer/BERT의 구조 차이다. 기존 교재와 Keras API는 앞서 기록한 확인 범위를 유지하며 이번에 예제를 실행하지 않았다. 2026-11-08에는 파괴적 망각의 대응 연구 세 편을 초록과 아래 출처 줄에 적은 절의 범위에서만 대조했다.

## 출처

- [Deep Learning with Python, Third Edition — Manning, François Chollet, Matthew Watson](https://www.manning.com/books/deep-learning-with-python-third-edition) — 출판사 소개, 독자 전제와 개발 흐름.
- [Deep Learning with Python, Third Edition — Simon & Schuster](https://www.simonandschuster.com/books/Deep-Learning-with-Python-Third-Edition/Francois-Chollet/9781638357773) — 공식 배급사 목차.
- [Keras, Getting started with Keras](https://keras.io/getting_started/) — Keras 3와 백엔드 설치 관계.
- [Keras, Training and evaluation with the built-in methods](https://keras.io/guides/training_with_built_in_methods/) — 학습, 평가, 추론과 검증 데이터의 역할.

- [EBS, 넥스트 비전, 15. 제프 딘 <AI 혁명의 과거와 미래> - AI의 역사를 만들다](https://www.ebssw.kr/edc/cultursens/cultursensMvpView.do?alctcrSn=59337&cntntsSn=33496&stepSn=58322&lctreSn=1879197&pageIndex=1) — 2026-11-03 전체 음성 전사 대조. 분산 신경망 학습, 입력 영역의 통합, 대화 모델의 사실성과 제품화 판단.
- [EBS, 넥스트 비전, 16. 제프 딘 <AI 혁명의 과거와 미래> - 혁명의 핵심 기술](https://www.ebssw.kr/edc/cultursens/cultursensMvpView.do?alctcrSn=59337&cntntsSn=33498&stepSn=58322&lctreSn=1879204&pageIndex=1) — 2026-11-03 전체 음성 전사 대조. 자기회귀 예측, Transformer와 BERT, 학습 병렬성과 추론 수요.
- [Building high-level features using large scale unsupervised learning — Google Research](https://research.google/pubs/building-high-level-features-using-large-scale-unsupervised-learning/) — 2026-11-03 논문 초록의 학습 규모와 특징/분류 단계 대조.
- [Attention Is All You Need — Vaswani 외](https://arxiv.org/abs/1706.03762) — 2026-11-03 원 논문의 병렬성과 번역 과업 범위 대조.
- [BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding — Devlin 외](https://arxiv.org/abs/1810.04805) — 2026-11-03 양방향 문맥 학습 대조.
- [Overcoming catastrophic forgetting in neural networks — Kirkpatrick 외](https://arxiv.org/abs/1612.00796) — 2026-11-08 arXiv v2의 초록, 1절 서론과 2절 EWC 정의 대조. 관련 DOI 10.1073/pnas.1611835114.
- [Brain-inspired replay for continual learning with artificial neural networks — van de Ven 외](https://pmc.ncbi.nlm.nih.gov/articles/PMC7426273/) — 2026-11-08 Nature Communications 11, 4069의 PMC 초록과 학습 시나리오 정의 대조.
- [Sleep-like unsupervised replay reduces catastrophic forgetting in artificial neural networks — Tadros 외](https://pmc.ncbi.nlm.nih.gov/articles/PMC9755223/) — 2026-11-08 Nature Communications 13, 7742의 PMC 초록과 결과 절의 데이터셋 대조.

## 관련 문서

- [[AI엔지니어링(AIEngineering)|AI 엔지니어링 지도]]
- [[Time-Series-Forecast-Evaluation|시계열 예측 평가]]
- [[Recommendation-System-Industry-Large-Scale-ML|대규모 추천 모델의 학습과 서빙]]
