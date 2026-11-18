---
tags: [ai, machine-learning, unsupervised-learning, clustering, k-means, scikit-learn, learning]
status: done
verified_at: 2026-11-18
category: "AI엔지니어링(AIEngineering)"
aliases: ["비지도 학습과 k-means 군집화", "K-Means Clustering", "k-평균 군집화", "비지도 학습", "Unsupervised Learning", "군집화", "Clustering"]
---

# 비지도 학습과 k-means 군집화

비지도 학습(unsupervised learning)은 라벨 없이 입력 데이터만으로 패턴을 찾는다. 대표 과업인 군집화(clustering)는 비슷한 대상이 같은 그룹에 들도록 데이터를 나눈다. 비슷한 유전자끼리 묶는 분석, 이미지의 픽셀을 영역별로 나누는 분할, 광고 대상을 정하려고 고객을 나누는 시장 세분화가 예다. 라벨로 경계를 배우는 지도학습은 [[Supervised-Learning-Models|지도학습 기본 모델과 손실 함수]]에 있다.

## k-means의 반복

k-means는 데이터를 k개 군집으로 나누고, 각 군집을 중심점(centroid), 곧 군집에 속한 점들의 평균으로 대표한다.

1. k를 정하고 중심점 k개를 초기화한다. 가장 단순한 방법은 공간에 무작위로 두거나 데이터에서 표본 k개를 고르는 것이다.
2. 각 점을 가장 가까운 중심점의 군집에 할당한다.
3. 각 중심점을 자기 군집에 할당된 점들의 평균 위치로 옮긴다.
4. 2와 3을 반복한다. 다시 할당해도 어느 점도 군집을 바꾸지 않으면 멈춘다. 구현은 보통 중심점의 이동이 허용 오차보다 작아지면 멈춘다.

중심점을 옮기면 일부 점이 다른 중심점에 더 가까워져 할당이 바뀌고, 바뀐 할당이 다시 중심점을 옮긴다. 이 반복은 각 점과 가장 가까운 중심점 사이 거리 제곱의 합인 inertia(within-cluster sum of squares)를 줄이는 방향으로 진행되며, Lloyd 알고리즘이라고도 부른다.

예를 들어 1차원 점 `[1, 2, 10, 11, 12]`에 k = 2, 초기 중심점 1과 2를 두면 첫 할당은 `{1}`과 `{2, 10, 11, 12}`이고 중심점은 1과 8.75로 옮겨진다. 다시 할당하면 2가 첫 군집으로 넘어가 `{1, 2}`와 `{10, 11, 12}`가 되고 중심점은 1.5와 11이 된다. 그다음 할당은 바뀌지 않으므로 멈춘다.

## 한계와 운영 점검

- **지역 최솟값:** 반복은 언제나 수렴하지만 그 결과가 지역 최솟값일 수 있고, 초기 중심점에 크게 좌우된다. 그래서 초기화를 바꿔 여러 번 실행하고 inertia가 가장 작은 결과를 쓴다. scikit-learn 1.9.1 `KMeans`의 기본 초기화 `init='k-means++'`는 점들이 전체 inertia에 기여하는 정도에 따른 확률로 초기 중심점을 뽑아 수렴을 빠르게 한다. 1.4부터 기본값인 `n_init='auto'`는 k-means++면 1번, `init='random'`이면 10번 실행하므로, 여러 번 실행해 비교하려면 `n_init`을 직접 지정한다.
- **k는 직접 정한다:** 알고리즘이 k를 정해 주지 않는다. 여러 k로 실행해 결과를 비교하고, 군집을 쓸 업무 목적(예: 관리할 수 있는 고객 세그먼트 수)과 함께 판단한다.
- **군집 모양의 가정:** inertia는 군집이 볼록하고 모든 방향으로 고르게 퍼져 있다(isotropic)고 가정한다. 길쭉하거나 불규칙한 모양의 군집에는 잘 맞지 않는다.
- **inertia는 정규화된 지표가 아니다:** 낮을수록 좋고 0이 최적이라는 것만 알 수 있다. 데이터나 특징 구성이 다른 결과끼리 inertia 값만으로 군집 품질을 비교하지 않는다.
- **거리와 차원:** 유클리드 거리 제곱을 쓰므로 범위가 큰 특징이 할당을 좌우한다. 특징 단위를 먼저 맞추고, 매우 높은 차원에서는 거리가 부풀어 오르므로 PCA 같은 차원 축소를 먼저 하면 문제를 덜고 계산도 빨라진다.
- **대규모 데이터:** 매 반복 전체 데이터를 훑는 비용이 크면 미니배치로 중심점을 갱신한다. 벡터 색인의 중심점 학습에 쓰는 미니배치와 지수이동평균 갱신 변형은 [[IVF-Clustering-and-Routing|IVF 인덱스의 중심점 학습]]에 있다.

## 이해 확인

1. 위 1차원 예에서 초기 중심점을 10과 11로 바꿔 반복하고 결과를 비교한다.
2. 초기화를 바꿔 여러 번 실행해야 하는 이유와, scikit-learn 기본값에서 실제 실행 횟수가 초기화 방식에 따라 다른 점을 설명한다.
3. 나이(세)와 연간 구매액(원)을 그대로 넣은 고객 군집화가 어떤 특징에 좌우되는지 설명한다.

## 출처

- [YouTube, Harvard CS50's Artificial Intelligence with Python, Learning](https://www.youtube.com/watch?v=5NgNicANyqM&t=32256s) — freeCodeCamp.org 채널, 2023-08-10 공개. 2026-11-18 8:57:36부터의 비지도 학습과 k-means 부분을 사람이 단 영어 자막으로 대조했다.
- [Harvard, CS50's Introduction to Artificial Intelligence with Python, Lecture 4 Learning Notes](https://cs50.harvard.edu/ai/2020/notes/4/) — 이전 판으로 표시된 공식 노트. 2026-11-18 비지도 학습과 군집화의 정의, k-means의 반복과 멈춤 조건을 대조했다.
- [scikit-learn, Clustering](https://scikit-learn.org/stable/modules/clustering.html) — 1.9.1 문서. inertia 정의와 가정, Lloyd 알고리즘의 단계와 멈춤 기준, 지역 최솟값과 초기화, 고차원 거리와 PCA.
- [scikit-learn, KMeans](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.KMeans.html) — 1.9.1 문서. `init='k-means++'`의 표본 추출 방식, `n_init='auto'`의 실행 횟수와 1.4의 기본값 변경.

## 관련 문서

- [[ml-foundations|머신러닝 기초]]
- [[Supervised-Learning-Models|지도학습 기본 모델과 손실 함수]]
- [[IVF-Clustering-and-Routing|IVF 인덱스: 중심점 학습과 질의 라우팅]]
- [[Vector-Similarity-Search|벡터 유사도 검색]]
