---
tags: [architecture, recommendation-system, ott, discovery, taxonomy, collaborative-filtering]
status: done
verified_at: 2026-07-21
category: "아키텍처&설계(Architecture&Design)"
aliases: ["OTT Recommendation Discovery Scenarios", "OTT 추천 시스템 구축 시나리오", "추천 시스템 가설 분기"]
---

# OTT 추천 시스템 구축 시나리오

택소노미 기반 콘텐츠 추천과 행동 기반 추천은 서로 배타적인 선택지가 아니다. 내부 taxonomy와 event의 실제 품질을 모르는 상태에서는 하나를 정답으로 고정하지 않고, 두 자산의 성숙도를 독립 축으로 검증해 surface별 시작점을 결정한다.

이 문서는 공개 제품 표면과 일반 설계 원칙으로 만든 discovery framework다. 키노라이츠 내부 taxonomy, 행동량, 현재 추천기와 조직 책임은 확인되지 않았으며 아래 분기는 구현 확정안이 아니다.

## 두 개의 독립 축

### Taxonomy 성숙도

- Surface에 필요한 작품을 충분히 덮는 concept와 assignment가 있는가
- 자유 문자열이 아니라 ID, 동의어, scope, 계층과 version이 관리되는가
- 편집 gold set에서 축별 precision, recall과 일관성을 측정할 수 있는가
- 새 작품 반영 시간, owner, 검수와 rollback 경로가 있는가

### Behavior 성숙도

- Request, response, 실제 impression, interaction과 outcome이 안정 ID로 연결되는가
- 평가, 찜, 보는 중, 봤어요, 상세 클릭과 OTT 이동의 의미가 정의됐는가
- Surface와 사용자 및 작품 slice별로 학습과 평가에 쓸 support가 있는가
- 이전 노출 정책, 위치, 지연 label과 point-in-time join을 복원할 수 있는가

트래픽 총량 하나로 성숙도를 판정하지 않는다. 홈에는 행동이 충분해도 신규 작품과 상세의 tail에는 부족할 수 있으므로 surface, 사용자와 작품 slice별로 평가한다.

## 2x2 시나리오

| Behavior / Taxonomy | 낮음 | 높음 |
|---|---|---|
| 낮음 | S0. Baseline과 계측 우선 | S1. Taxonomy-first |
| 높음 | S2. Behavior-first | S3. Hybrid |

같은 제품 안에서도 작품 상세는 S1, 개인화 홈은 S2 또는 S3, 신규 사용자 fallback은 S0일 수 있다. 전역으로 하나의 시나리오를 강제하지 않는다.

## S0. 둘 다 미성숙

```text
편집, 인기와 신작 baseline
  -> surface eligibility
  -> impression과 outcome 계측
  -> taxonomy와 behavior 품질 audit
```

- 목표는 고급 모델 출시가 아니라 비교 가능한 baseline과 신뢰할 수 있는 폐루프를 만드는 것이다.
- 작품 상세에는 공식 장르와 정형 metadata 기반의 단순 유사도를 사용할 수 있다.
- 홈은 OTT별 인기, 신작과 편집 module을 분리하고 각 source의 기여를 기록한다.
- Taxonomy 구축과 behavior 수집을 병렬 진행하되 불완전한 값을 production truth로 승격하지 않는다.

다음 단계 gate는 요청 단위 audit reconstruction, 가용성 오류와 underfill 기준, taxonomy gold set 또는 behavior support 중 하나의 검증이다.

## S1. Taxonomy-first

```text
Versioned 작품 taxonomy
  -> Item-to-item과 user tag affinity 후보
  -> 공통 ranker와 diversity reranker
```

적합한 조건은 작품 coverage와 할당 품질은 높지만 사용자 행동이 희소하거나 신작 비중이 큰 경우다.

- 작품 상세의 관련 작품은 seed와 taxonomy vector를 비교한다.
- 평가와 찜처럼 의미가 확인된 일부 신호가 있으면 user affinity를 만들고, 그 신호도 없으면 비개인화 item-to-item과 onboarding을 유지한다.
- 후보 이유를 검수된 concept 기여로 설명할 수 있다.
- 신규 작품도 assignment가 publish되면 행동을 기다리지 않고 후보에 들어갈 수 있다.

주요 위험은 tag 오류, 흔한 장르의 지배, 과도하게 비슷한 작품 반복과 편집 비용이다. [[Recommendation-System-Taxonomy-Content-Based|택소노미 계약]]의 relevance와 confidence 분리, version pinning과 overspecialization guardrail을 적용한다.

## S2. Behavior-first

```text
Impression과 interaction graph
  -> Co-engagement Item-to-item 또는 implicit CF
  -> 공통 ranker와 Cold Start fallback
```

적합한 조건은 행동 연결과 support는 충분하지만 taxonomy coverage, 일관성과 갱신 경로가 약한 경우다.

- 작품 상세에는 함께 상세 조회, 찜 또는 소비된 관계를 의미별로 분리해 사용한다.
- 홈에는 implicit matrix factorization이나 다른 행동 기반 후보를 baseline과 비교한다.
- Metadata가 표현하지 못한 latent 취향과 의외의 관계를 발견할 수 있다.
- Taxonomy가 정비되기 전에도 검증된 interaction으로 개선할 수 있다.

주요 위험은 신규 사용자와 신규 작품, 이전 정책의 exposure bias, 인기 집중과 행동 의미 혼합이다. 미노출을 dislike로 만들지 않고, 인기와 metadata fallback 및 제한된 탐색을 유지한다.

## S3. Hybrid

```text
Taxonomy source -------+
Behavior source --------+-> Union과 canonical dedup -> 공통 ranker
인기, 편집과 신작 -----+                              -> diversity와 eligibility
```

두 자산이 모두 검증됐을 때도 처음부터 하나의 거대한 model로 합치지 않는다. Source별 후보와 version을 보존한 뒤 공통 ranker에서 비교한다.

- Taxonomy는 신작, 설명 가능성과 content similarity를 보강한다.
- Behavior는 latent 관계와 실제 선택 패턴을 보강한다.
- Ranker는 taxonomy overlap, 행동 source score, 인기도, 최근 의도와 가용성을 feature로 사용한다.
- Source ablation과 incremental Recall로 각 source가 실제로 추가하는 후보를 확인한다.
- 한 source 장애나 freshness 저하에도 다른 source와 baseline으로 축소할 수 있다.

Hybrid는 기본 정답이 아니라 두 source의 증분 효과가 운영 복잡성을 정당화할 때의 결과다. Offline 상승만으로 합치지 않고 online primary와 guardrail을 통과해야 한다.

## 공통으로 먼저 닫을 계약

| 계약 | 모든 시나리오에서 필요한 이유 |
|---|---|
| 정본 ID와 offer | 같은 작품과 여러 OTT offer의 중복을 제어 |
| Surface policy | 검색, 랭킹, 상세와 홈의 목적을 섞지 않음 |
| Availability | 지금 보기 약속을 model score로 우회하지 않음 |
| Feedback event | Response와 impression, 미노출과 거절을 구분 |
| Evaluation | 같은 candidate universe와 label contract로 비교 |
| Serving bundle | Source, feature와 policy version을 요청 단위로 고정 |

알고리즘 선택이 이 계약보다 앞서면 어떤 시나리오도 신뢰할 수 없다.

## Discovery 결과로 선택하는 법

1. Surface와 module별 목표 행동, traffic과 latency budget을 확정한다.
2. 같은 기간과 eligibility 조건에서 taxonomy와 behavior 자산을 audit한다.
3. S0 baseline을 모든 비교에 포함한다.
4. Taxonomy item-to-item과 behavior item-to-item을 같은 평가 계약으로 비교한다.
5. Source별 Recall, 중복, coverage, latency와 운영 비용을 기록한다.
6. Shadow와 작은 A/B에서 primary, guardrail과 slice를 확인한다.
7. 증분 효과가 없는 source는 복잡하더라도 유지하지 않는다.

결정 결과는 시스템 전체에 하나가 아니라 surface별 registry로 남긴다.

```text
surfaceId, moduleId
candidateSources[]
sourceVersions[]
primaryMetric
eligibilityPolicyVersion
decisionEvidenceRef
```

## 내부에서 확인할 질문

- 현재 taxonomy는 실제 추천 입력인가, 검색 filter나 편집 metadata인가
- Taxonomy concept와 작품 할당을 누가 생성, 검수하고 versioning하는가
- 평가, 찜, 보는 중과 봤어요 중 어떤 event가 실제 impression과 연결되는가
- 상세, 홈과 신규 작품 slice에서 behavior support는 각각 충분한가
- 현재 추천과 ranking module의 baseline, fallback과 실험 단위는 무엇인가
- Taxonomy와 behavior를 함께 쓰고 있다면 source별 기여를 분해할 수 있는가

답을 얻기 전에는 S1, S2와 S3 중 어느 것도 현재 키노라이츠 구현이라고 표현하지 않는다.

## 관련 문서

- [[Recommendation-System-OTT-Aggregator-Design-Proposal|OTT 추천 시스템 초기 설계안]]
- [[Recommendation-System-Taxonomy-Content-Based|택소노미 기반 콘텐츠 추천]]
- [[Recommendation-System-Candidate-Generation|후보 생성]], [[Recommendation-System-Feedback-Data|피드백 데이터]]
- [[Recommendation-System-Evaluation-Experimentation|평가와 실험]], [[Recommendation-System-Eligibility-Availability|가용성 정책]]

## 출처

- [Candidate generation overview - Google for Developers](https://developers.google.com/machine-learning/recommendation/overview/candidate-generation)
- [Content-based filtering - Google for Developers](https://developers.google.com/machine-learning/recommendation/content-based/basics)
- [Collaborative filtering - Google for Developers](https://developers.google.com/machine-learning/recommendation/collaborative/basics)
- [Rules of Machine Learning - Google for Developers](https://developers.google.com/machine-learning/guides/rules-of-ml)
- [Collaborative Filtering for Implicit Feedback Datasets - Hu, Koren, Volinsky](https://yifanhu.net/PUB/cf.pdf)
