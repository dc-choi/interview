---
tags: [ai, deep-learning, keras, learning]
status: done
verified_at: 2026-10-22
category: "AI엔지니어링(AIEngineering)"
aliases: ["딥러닝 기초와 실습", "Deep Learning Foundations and Practice"]
---

# 딥러닝 기초와 실습

딥러닝 입문에서는 모델 이름을 많이 아는 것과 문제를 데이터, 학습, 평가로 옮길 수 있는 능력을 구분한다. 작은 예제를 실행한 뒤 각 단계의 입력과 결과를 설명하는 방식으로 이해를 확인할 수 있다.

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

## 출처

- [Deep Learning with Python, Third Edition — Manning, François Chollet, Matthew Watson](https://www.manning.com/books/deep-learning-with-python-third-edition) — 출판사 소개, 독자 전제와 개발 흐름.
- [Deep Learning with Python, Third Edition — Simon & Schuster](https://www.simonandschuster.com/books/Deep-Learning-with-Python-Third-Edition/Francois-Chollet/9781638357773) — 공식 배급사 목차.
- [Keras, Getting started with Keras](https://keras.io/getting_started/) — Keras 3와 백엔드 설치 관계.
- [Keras, Training and evaluation with the built-in methods](https://keras.io/guides/training_with_built_in_methods/) — 학습, 평가, 추론과 검증 데이터의 역할.

## 관련 문서

- [[AI엔지니어링(AIEngineering)|AI 엔지니어링 지도]]
- [[Time-Series-Forecast-Evaluation|시계열 예측 평가]]
