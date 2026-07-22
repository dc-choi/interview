---
tags: [growth, learning, mathematics, recommendation-system, devops]
status: active
verified_at: 2026-07-21
category: "Growth - 학습"
aliases: ["2026 하반기 수학 추천 DevOps 로드맵", "수학부터 시작하는 추천 시스템 로드맵"]
---

# 2026 하반기 수학, 추천 시스템, DevOps 로드맵

현재 순서는 **수학 기초 보강 → 검색과 추천 산출물 → DevOps 실전 보강**이다. 수학이 DevOps의 일반적인 선행 조건이라서가 아니라, 지금 맡은 검색과 추천 시스템을 제대로 판단하려면 통계, 선형대수와 평가 지식의 공백을 먼저 닫아야 하기 때문이다. 코딩 테스트는 이 로드맵에서 제외한다.

## 현재 위치

문서 수나 `status: done`을 숙련도로 계산하지 않고, 저장소에서 확인되는 실무 사례와 아직 없는 산출물을 구분한다.

| 영역 | 현재 판단 | 직접 근거 또는 확인 방법 |
|---|---|---|
| DB, 동시성, 캐시 | 강점으로 재사용 | [[My-Tech-Cards-Data]], [[My-Tech-Cards-Ops]]의 Lock, 인덱스, Cache-Aside 사례 |
| 이벤트와 비동기 처리 | 강점으로 재사용 | EventBridge, SQS, DLQ, 멱등성과 상태 머신 설계 사례 |
| 컨테이너와 운영 관측 | 강점으로 재사용 | ECS Fargate 전환, Docker 경량화, Grafana/Prometheus/Loki 운영 사례 |
| 수학과 통계 | 우선 보강 | 벡터 점수, 확률, 추정과 실험 결과를 문서 없이 계산하는 산출물이 필요 |
| 추천 모델과 랭킹 평가 | 우선 보강 | implicit feedback, 시간 분할, Recall/NDCG, OPE를 같은 데이터에서 재현해야 함 |
| DevOps | 범위보다 실전 증거 보강 | Terraform lifecycle, K8s 운영 계약, 배포 rollback과 장애 훈련 산출물이 필요 |

마지막 두 행은 실제 역량이 없다는 단정이 아니다. 현재 vault에서 검토 가능한 아웃풋이 부족하다는 뜻이며, 아래 gate로 다시 판정한다.

## 두 교재의 역할

### 주교재: 개발자를 위한 필수 수학

추천과 실험에 바로 연결되는 미적분, 확률, 통계, 선형대수, 회귀와 분류가 한 흐름에 있다. 먼저 이 책을 세로축으로 사용한다. 아래 추천 시스템 연결 열은 출판사가 보장한 책의 범위가 아니라, 각 장에 공식 자료와 실습으로 덧붙일 학습 과제를 포함한다.

| 순서 | 범위 | 추천 시스템 연결 |
|---|---|---|
| 1 | 1장 함수, 로그, 미분 | sigmoid, log loss, gradient |
| 2 | 4장 선형대수 | vector, 내적, cosine, matrix와 embedding |
| 3 | 2장 확률 | 조건부확률, Bayes, 분포와 implicit feedback |
| 4 | 3장 기술/추론 통계 | 분산, 표본 편향, 신뢰구간과 A/B test |
| 5 | 5장 선형 회귀 | loss, 과적합, 정규화와 train/test 분리 |
| 6 | 6장 로지스틱 회귀와 분류 | CTR baseline, BCE, calibration과 ranking의 차이 |
| 나중 | 7장 신경망 | baseline을 완성한 뒤 embedding 학습 이해용으로 훑기 |
| 선택 | 8장 진로 | 현재 기술 학습 gate와 직접 관계가 없어 선택 |

책 목차에서 직접 다루지 않는 BCE 구현, L1/L2, calibration과 Top K 평가는 [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 기초]]의 출처와 실습으로 보강한다.

### 보조교재: 컴퓨팅 사고력을 키우는 이산수학 3판

처음부터 652쪽을 순서대로 완독하지 않는다. 주교재에서 막히는 개념과 추천/검색에 연결되는 장을 골라 쓴다.

| 우선순위 | 범위 | 쓰임 |
|---|---|---|
| 필수 | 4장 집합, 7장 함수 | candidate universe, eligibility, mapping 계약 |
| 필수 | 5장 행렬 | 선형대수 진입 전 연산 복습 |
| 필수 | 11장 순열, 조합, 확률 | 표본 공간, 확률분포와 실험 직관 |
| 선택 | 6장 관계 | user-item 관계와 taxonomy 구조화 |
| 선택 | 8장 그래프, 9장 트리 | graph recommendation이나 taxonomy 계층을 다룰 때 |
| 선택 | 2장 논리, 3장 증명 | 식과 알고리즘 가정을 엄밀히 설명할 때 |
| 뒤로 | 1장 수 표현, 10장 부울대수, 12장 전체 | 현재 추천 모델링 공백과 직접 연결되는 부분만 참조 |

이산수학의 행렬 장은 연산 입문이다. Matrix Factorization과 embedding을 이해하는 데 필요한 벡터 공간, 고윳값과 최적화는 주교재 4장과 별도 실습으로 보강한다. 출판사 페이지에는 2026-06-12 등록된 공개용 답안이 있으나, 모든 문제의 상세 해설을 보장하는 자료로 가정하지 않는다.

## 1단계: 수학 기반, 2026-07-22부터 2026-08-31

주 7시간 안팎으로 책 읽기 40%, 손계산 20%, Python notebook 40%를 배분한다. 별도 퀴즈는 하지 않고 매주 하나의 계산 결과를 남긴다.

1. 함수, 로그와 미분을 sigmoid와 BCE에 연결한다.
2. vector norm, 내적과 cosine으로 작품 5개의 유사도를 계산한다.
3. 조건부확률과 Bayes로 `P(click | impression, position)`의 분모를 설명한다.
4. 평균, 분산, 표준 오차와 신뢰구간을 작은 노출 로그에 계산한다.
5. 선형 회귀와 로지스틱 회귀의 loss, regularization과 과적합을 비교한다.
6. 버퍼 주에 막힌 장을 복습하고 하나의 notebook으로 합친다.

### 수학 완료 gate

- [ ] 내적과 cosine의 순위가 달라지는 예를 직접 만들고 norm의 역할을 설명한다.
- [ ] 조건부확률, 기대값, 분산과 신뢰구간을 작은 표본에서 계산한다.
- [ ] BCE, gradient descent와 L1/L2가 모델 학습에서 하는 일을 수식과 말로 연결한다.
- [ ] 분류 정확도와 Top K ranking metric이 왜 다른지 예제로 보인다.
- [ ] 계산, 가정과 결과를 담은 재현 가능한 notebook 하나를 검토받는다.

## 2단계: 검색과 추천 산출물, 2026-09-01부터 2026-10-18

[[Search-Recommendation-Discovery-Learning-Path|검색과 추천 디스커버리 학습 경로]]의 0단계부터 6단계까지만 먼저 수행한다. 읽기보다 다음 네 산출물이 우선이다.

1. MovieLens 시간 분할에서 popularity, item-item CF와 Matrix Factorization 비교
2. Recall@10, NDCG@10과 사용자 활동량/item 인기도 slice 보고서
3. OTT taxonomy schema, gold set과 candidate source별 incremental recall 표
4. impression/propensity가 있는 작은 예제로 IPS, SNIPS와 DR 계산

### 추천 완료 gate

- [ ] 같은 protocol에서 세 baseline을 재현하고 데이터 누수 검사를 남긴다.
- [ ] 검색, 추천과 browse의 candidate, label과 primary metric 차이를 한 장으로 설명한다.
- [ ] offline 개선이 온라인 인과 효과가 아닌 이유와 실험 승급 조건을 설명한다.
- [ ] Redis/API 서빙 결과와 model quality를 별도 지표로 검증한다.

## 3단계: DevOps 실전 보강, 2026-10-19부터 2026-12-20

이전 [[DevOps-Prep-2026-09|DevOps 지원 준비 로드맵]]의 자격증 중심 일정을 그대로 재개하지 않는다. 이미 강한 ECS, SQS, 캐시와 관측 경험 위에 아직 검증되지 않은 운영 lifecycle을 올린다.

| 우선순위 | 보강 영역 | 요구 산출물 |
|---|---|---|
| P0 | Linux와 네트워크 진단 | process/FD/socket/DNS/cgroup을 `ss`, `lsof`, `strace`, `tcpdump`, `dig`로 좁힌 장애 기록 |
| P0 | Terraform state lifecycle | remote state, lock, plan review, drift 탐지, import와 rollback 기록 |
| P0 | Kubernetes 핵심 운영 | Deployment/Service, probe, request/limit, HPA와 PDB가 있는 sandbox |
| P1 | 안전한 배포 | CI에서 test/scan/build, 단계적 rollout과 실패 rollback 재현 |
| P1 | SRE와 장애 대응 | SLI/SLO, error budget, alert와 postmortem, RTO/RPO가 있는 runbook |
| P1 | 보안과 공급망 | 최소 권한, secret 주입, image/SBOM scan과 credential rotation |
| P2 | 자격증 | 실습 공백이 닫힌 뒤 SAA/CloudOps 필요성을 다시 판단 |

### DevOps 완료 gate

- [ ] Terraform으로 작은 환경을 만들고 변경, drift, 복구와 destroy를 재현한다.
- [ ] DNS, socket 고갈이나 container memory 중 한 장애를 Linux 도구로 좁혀 증거와 판단 순서를 남긴다.
- [ ] 동일 샘플 앱을 ECS 기준선과 K8s sandbox에 배포하고 선택 기준을 비용/운영 복잡도로 비교한다.
- [ ] readiness 실패, worker backlog, 잘못된 배포 중 두 가지를 주입해 탐지와 rollback 시간을 기록한다.
- [ ] dashboard, alert, runbook과 postmortem이 같은 SLO를 가리킨다.
- [ ] production EKS 전환 없이 sandbox 비용과 삭제 확인 절차를 자동화한다.

## 운영 규칙

- 날짜보다 gate를 우선한다. 수학 gate가 열리지 않으면 추천 단계에서 필요한 장만 보충하고 전체 일정을 무한 연장하지 않는다.
- 추천 완료 gate가 열리지 않으면 2026-10-19이라는 날짜만으로 DevOps 주축을 시작하지 않는다. 미통과 산출물의 범위를 줄여 먼저 완성하고 DevOps 시작일을 다시 잡는다.
- 퇴근 후에는 notebook, 설계도와 실습처럼 검토 가능한 아웃풋을 만들고, 짜투리 시간에는 책과 공식 문서를 읽는다.
- Transformer, GNN, 강화학습과 bandit은 baseline 증분 가치가 필요한 시점까지 보류한다.
- DevOps에서는 AWS 서비스 목록과 자격증 문제를 반복하기보다 lifecycle, failure와 rollback을 훈련한다.
- 실제 키노라이츠 내부 데이터, 아키텍처와 운영 조건을 확인하기 전에는 공개 정보 기반 가설로 표시한다.

## 관련 문서

- [[Recommendation-System-Modeling-Foundations|추천 시스템 모델링 기초]]
- [[Recommendation-System-Architecture|추천 시스템 지식 지도]]
- [[Recommendation-System-Online-Experimentation-Statistics|온라인 실험 통계]]
- [[인프라&클라우드(Infrastructure&Cloud)|인프라와 클라우드 학습 지도]]
- [[CICD&배포(CICD&Delivery)|CI/CD와 배포 학습 지도]]

## 출처

- [컴퓨팅 사고력을 키우는 이산수학 3판 - 알라딘](https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=286268266)
- [컴퓨팅 사고력을 키우는 이산수학 3판 - 한빛아카데미](https://www.hanbit.co.kr/store/books/look.php?p_code=B1836224274)
- [개발자를 위한 필수 수학 - 알라딘](https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=340346630)
- [개발자를 위한 필수 수학 - 한빛미디어](https://www.hanbit.co.kr/store/books/look.php?p_code=B6844303854)
