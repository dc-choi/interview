---
tags: [database, vector, ann, ivf, k-means, mips, retrieval]
status: done
verified_at: 2026-11-16
category: "데이터&저장소(Data&Storage)"
aliases: ["IVF Clustering and Routing", "IVF 중심점 학습과 라우팅", "e-means", "Learned Routing", "Amortized MIPS", "SupportNet", "KeyNet"]
---

# IVF 인덱스: 중심점 학습과 질의 라우팅

IVF는 벡터를 k개 클러스터로 나눠 두고, 질의를 일부 클러스터로 보내 그 안만 전수 비교한다. 클러스터 크기가 고르면 두 번째 단계의 비교 대상은 약 n/k개라 전체 비교보다 약 k배 적다. 품질과 비용은 두 지점에서 갈린다. 인덱스를 만들 때 중심점을 얼마나 잘 학습했는지, 검색할 때 질의를 어느 클러스터로 보내는지다. `nlist`, `nprobes`와 재학습 시점 같은 기본 조정은 [[Vector-Similarity-Search|벡터 유사도 검색]]이 다룬다.

## 중심점 학습: k-means를 어떻게 반복하는가

k-means는 고정된 데이터셋에서 각 점과 가장 가까운 중심점 사이의 평균제곱거리(MSE)를 최소화하는 k개 중심점을 찾는다. 아래 세 방식은 클러스터마다 점의 합 `S`와 개수 `N`을 두고 중심점을 `S / N`으로 계산하는 점은 같고, 이번 배치에서 할당된 합 `s`와 개수 `n`을 반영하는 방식이 다르다.

| 방식 | 통계 갱신 | 성질 |
|---|---|---|
| Lloyd | 매 반복 전체 데이터로 `S = s`, `N = n`을 새로 계산 | 반복마다 전체를 훑고, 손실이 늘지 않는 방향으로만 움직여 이미 찾은 지역 최솟값에 머물기 쉽다 |
| MacQueen 미니배치 | `S = S + s`, `N = N + n`으로 계속 누적 | 학습 초기의 부정확한 할당도 같은 가중치로 남는다 |
| e-means | `S = (1 - a) * S + a * s`, `N = (1 - a) * N + a * n` | 지수이동평균(EMA)으로 오래된 할당을 잊고 최근 할당을 따른다 |

e-means는 Meta FAIR와 ENPC 연구진이 2026년에 공개한 방법으로, 위 EMA 갱신에 다음을 더한다. 배치를 데이터 전체로, `a`를 1로 두고 스케줄을 끄면 한 반복이 Lloyd와 같아지므로 Lloyd는 그 특수한 경우다.

- **자동 설정:** 배치 크기와 초기 스텝을 점 수, 클러스터 수, 에포크 수로 계산하는 경험식(스케일링 법칙)을 쓰고 스텝은 코사인 스케줄로 줄인다. 경험식은 실험 데이터셋에 맞춰 적합한 것이므로 다른 분포에서는 손실 곡선을 확인한다.
- **비활성 클러스터 복구:** 미니배치는 할당이 없는 클러스터가 생기기 쉬워 실제로 쓰이는 코드북이 줄어든다. 활성 클러스터를 크기에 비례한 확률로 골라 둘로 나누는 Faiss의 방식(proportional split)을 쓴다. 100만 벡터, k=16,384, 5에포크, 시드 5개 평균에서 비활성 비율은 DEEP이 분할 0.3%, 배치 재표본 14.3%, 복구 없음 26.3%였고 SIFT는 0.1%, 4.6%, 12.7%였다.
- **마무리:** 마지막 에포크의 할당으로 각 클러스터의 정확한 평균을 다시 계산해 중심점을 정한다.

보고된 효과는 Lloyd 25에포크보다 낮은 테스트 손실에 1.2~3에포크로 도달하고, 같은 테스트 오차까지의 벽시계 시간이 GPU에서 Flash-KMeans 대비 10~45배, CPU에서 Faiss 대비 8~15배 짧다는 것이다. 기준선의 크기를 보면 H100에서 1,000만 벡터, k=65,536의 25에포크에 일반 PyTorch Lloyd가 142~155초, Flash-KMeans가 14~22초 걸렸다. 구현은 Faiss의 `faiss/contrib/e_means`에 있고 기본 학습 예산은 5에포크다. 저자 측정이며 재현하지 않았다.

한계도 함께 읽는다. 대상은 정적 데이터셋이며, EMA가 경사하강법보다 안정적인 이유(중심점이 할당된 점들의 볼록 껍질 안에 남는다)는 저자의 추정이다. GeekNews가 옮긴 Hacker News 의견에는 미니배치 EMA 갱신 자체는 오래된 기법이라는 지적, 여러 작업자에 나누면 all-reduce 통신이 병목이 될 수 있는데 그 확장성은 측정하지 않았다는 지적, 데이터 없이 중심을 정확히 계산할 수 있는 기하 문제에서는 표본 잡음만 더해 더 나빴다는 사용 경험이 있다(검증하지 않음).

## 질의 라우팅: 중심점 거리 대신 학습한 점수

중심점 라우팅은 정확하지 않다. 중심점은 클러스터 안 키의 분포를 담지 못해, 자기 중심점에서 먼 키가 질의와는 가장 잘 맞을 수 있다. 그 클러스터의 중심점 점수가 낮으면 탐색에서 빠지고 최적 키를 놓친다. RAG처럼 짧은 질문이 질의이고 길게 정제된 문서가 키인 경우 둘의 분포가 크게 다르지만, 일반 인덱스는 키의 기하만 보고 질의 분포를 쓰지 않는다.

Apple의 ICML 2026 논문(2026-11-05 연구 소개)은 최대 내적 탐색(MIPS)에서 질의를 키 집합의 최대 내적으로 보내는 함수가 볼록해석의 지지 함수(support function)이고, 질의 위치에서 그 기울기가 최적 키라는 점을 이용한다. 알려진 질의 분포에서 표본을 뽑아 전수 탐색으로 정답을 만든 뒤 작은 신경망에 회귀로 저장하는 방식이다(amortized MIPS).

| 모델 | 하는 일 | Natural Questions 결과 (약 260만 문단) |
|---|---|---|
| SupportNet | 클러스터마다 그 안 최적 키의 점수를 예측해 중심점 라우팅을 대신한다. 제약을 느슨하게 둔 입력 볼록 신경망(ICNN) | 클러스터 128개 기준. 신경망 실행을 포함해 라우팅 재현율 95%에 소형 모델 1.74ms, 중심점 3.36ms(같은 1.74ms에 대형은 97%). 데이터베이스 5% 탐색 시 재현율 약 90~93%, 중심점 87.5% |
| KeyNet | 질의를 최적 키 근처의 벡터로 바꿔 기존 FAISS IVF에 넘긴다. 인덱스는 그대로 둔다 | 변환 시간을 포함해 재현율 99%에 대형 모델 0.23ms, 원 질의 1.8ms. 99%에 필요한 탐색 비율 0.009%, 원 질의 0.10%. 이 실험의 IVF 인덱스 설정은 연구 소개에 없다 |

모델 크기 XS, S, M, L은 데이터베이스 크기의 1%, 5%, 10%, 20%이고 모두 16층이다. 추론 속도가 병목이고 최적 키의 근사로 충분하면 KeyNet, 재순위나 문턱에 쓸 보정된 점수가 필요하거나 계산 자원이 빠듯하면 SupportNet을 권하고, 키 집합이 매우 크면 SupportNet 라우터와 클러스터별 KeyNet을 함께 쓰는 구성을 제안한다. 공개 글에는 하드웨어와 임베딩 차원이 없고, 수치는 Natural Questions의 것이며 다른 데이터셋은 같은 추세라고만 적는다.

## 적용 조건과 점검

- **전제:** 키 집합이 고정되고 질의 분포가 안정적인 서비스여야 학습 비용을 상각한다. 키를 자주 추가하거나 지우는 corpus는 라우터와 변환기를 다시 학습해야 한다(고정 키 전제에서 도출). 완만한 질의 분포 변화에 비교적 견고하다는 주장은 있으나 큰 변화는 평가되지 않았다.
- **학습 비용:** k-means 에포크와 벽시계 시간, 학습 라우터의 정답 라벨을 만드는 전수 탐색, 데이터베이스 크기에 비례하는 모델 메모리를 함께 센다.
- **측정:** exact 결과를 기준으로 Recall@k를 재고, 라우터와 질의 변환 시간을 지연에 포함한다. 학습에 쓴 질의 표본과 실제 질의의 분포 차이를 추적한다.
- **규모:** 비교 대상이 적으면 exact 비교나 기본 IVF로 충분할 수 있다. 학습 기반 라우팅은 조정할 모델과 재학습 경로를 하나 더 두는 선택이다.

## 출처

- [e-means: outperforming k-means (in one-tenth the epochs) — Meta FAIR, ENPC](https://e-means.github.io/) — 2026-11-16 갱신 규칙, 비활성 클러스터 복구 비교, 실행 시간과 Faiss 구현 경로 대조
- [Faster Retrieval for Better, More Efficient RAG — Apple Machine Learning Research](https://machinelearning.apple.com/research/faster-retrieval) — 2026-11-05 게시, 2026-11-16 SupportNet과 KeyNet의 구조, 실험 조건과 결과 대조. ICML 2026 논문 Amortizing Maximum Inner Product Search with Learned Support Functions의 소개 글
- [e-means - 같은 테스트 오차에 약 10배 빠른 k-means — GeekNews](https://news.hada.io/topic?id=36907) — 소개 글과 Hacker News 의견 번역
- [더 나은, 더 효율적인 RAG를 위한 빠른 검색 — GeekNews](https://news.hada.io/topic?id=37031)

## 관련 문서

- [[Vector-Similarity-Search|벡터 유사도 검색]] — exact와 ANN 선택, HNSW와 IVF의 기본 조정
- [[pg-vectorsearch-PRISM|pg_vectorsearch PRISM]] — 클러스터 탐색과 양자화를 쓰는 다른 인덱스
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
- [[Recommendation-System-Serving-Operations|추천 서빙과 embedding/index lifecycle]]
