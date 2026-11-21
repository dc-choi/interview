---
tags: [ai, ontology, instances, recommendation-system]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["추천시스템 온톨로지 선언: OTT 디스커버리"]
ontology_concepts:
  - {id: empty-query-silent-home-swap, type: Problem, label: "빈 검색어를 개인화 홈으로 조용히 바꿈", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#세 경로의 계약]]"}
  - {id: separate-empty-query-browse-surface, type: Approach, label: "빈 질의 browse를 별도 surfaceId, 요청 schema와 평가 지표로 분리", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#세 경로의 계약]]"}
  - {id: search-query-reuse-in-recommendation-profile, type: Approach, label: "검색어를 추천 profile에 재사용", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#공유해야 하는 정본과 분리해야 하는 정책]]"}
  - {id: within-consented-purpose-and-retention, type: Condition, label: "허용 목적과 보유 기간 안의 사용", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#공유해야 하는 정본과 분리해야 하는 정책]]"}
  - {id: personalization-overrides-search-relevance, type: Problem, label: "개인화가 exact title, 인물과 명시적 filter를 뒤집어 관련 없는 작품을 구제", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#개인화 검색 guardrail]]"}
  - {id: relevance-floor-max-boost, type: Approach, label: "relevance floor와 최대 boost", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#개인화 검색 guardrail]]"}
  - {id: personalization-unavailable, type: Problem, label: "개인화 입력이나 개인화 경로를 쓸 수 없는 요청", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#개인화 검색 guardrail]]"}
  - {id: deterministic-non-personalized-degrade, type: Approach, label: "비개인화 검색으로 결정론적 degrade", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#개인화 검색 guardrail]]"}
  - {id: missing-taxonomy-assignment, type: Problem, label: "taxonomy assignment가 없거나 version이 맞지 않는 작품", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Queryless recommendation과 browse]]"}
  - {id: structured-metadata-degrade, type: Approach, label: "정형 metadata나 비개인화 source로 degrade", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Queryless recommendation과 browse]]"}
  - {id: cross-vertical-ranker, type: Approach, label: "공통 feature로 학습한 cross-vertical ranker", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Federated vertical과 결과 혼합]]"}
  - {id: rank-fusion, type: Approach, label: "vertical 결과 혼합의 rank fusion", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Federated vertical과 결과 혼합]]"}
  - {id: calibrated-vertical-score, type: Approach, label: "calibrated score 기반 vertical 혼합", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Federated vertical과 결과 혼합]]"}
  - {id: fixed-layout-baseline, type: Approach, label: "고정 layout baseline", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Federated vertical과 결과 혼합]]"}
  - {id: last-touch-attribution, type: Approach, label: "cross-surface attribution의 last-touch 규칙", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Event와 cross-surface attribution]]"}
  - {id: first-touch-attribution, type: Approach, label: "cross-surface attribution의 first-touch 규칙", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Event와 cross-surface attribution]]"}
  - {id: multi-touch-attribution, type: Approach, label: "cross-surface attribution의 multi-touch 규칙", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Event와 cross-surface attribution]]"}
  - {id: semantic-retrieval-failure, type: Problem, label: "디스커버리 검색의 semantic retrieval 실패", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: lexical-result-fallback, type: Approach, label: "lexical 결과와 명시적 filter 유지", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: vertical-timeout, type: Problem, label: "특정 vertical timeout", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: partial-vertical-response, type: Approach, label: "나머지 vertical의 부분 응답 표시", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: recommendation-source-failure, type: Problem, label: "추천 source 실패", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: availability-unknown, type: Problem, label: "작품 availability 불명", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: keep-discovery-remove-direct-cta, type: Approach, label: "작품 발견은 유지하고 직접 CTA 제거", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: partial-results-in-success-rate, type: Problem, label: "부분 결과가 정상 성공률에 섞임", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: separate-fallback-metrics, type: Approach, label: "fallback과 부분 결과를 별도 지표로 관측", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {id: slice-level-maturity-assessment, type: Approach, label: "surface, 사용자와 작품 slice별 성숙도 평가", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#Behavior 성숙도]]"}
  - {id: aggregate-traffic-hides-slice-sparsity, type: Problem, label: "트래픽 총량이 slice별 행동 부족을 가림", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#Behavior 성숙도]]"}
  - {id: baseline-instrumentation-first-scenario, type: Approach, label: "Baseline과 계측 우선 시나리오(S0)", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S0. 둘 다 미성숙]]"}
  - {id: no-comparable-baseline-closed-loop, type: Problem, label: "비교 가능한 baseline과 신뢰할 수 있는 폐루프가 없음", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S0. 둘 다 미성숙]]"}
  - {id: taxonomy-first-scenario, type: Approach, label: "Taxonomy-first 시나리오(S1)", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {id: taxonomy-tag-error, type: Tradeoff, label: "taxonomy tag 오류", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {id: common-genre-dominance, type: Tradeoff, label: "흔한 장르의 지배", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {id: taxonomy-editing-cost, type: Tradeoff, label: "taxonomy 편집 비용", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {id: behavior-first-scenario, type: Approach, label: "Behavior-first 시나리오(S2)", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S2. Behavior-first]]"}
  - {id: behavior-semantics-mixing, type: Tradeoff, label: "행동 의미 혼합", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S2. Behavior-first]]"}
  - {id: hybrid-scenario, type: Approach, label: "Hybrid 시나리오(S3)", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S3. Hybrid]]"}
  - {id: single-giant-model-merge, type: Approach, label: "처음부터 하나의 거대한 model로 통합", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S3. Hybrid]]"}
  - {id: hybrid-operational-complexity, type: Tradeoff, label: "Hybrid 시나리오(S3)의 운영 복잡성", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S3. Hybrid]]"}
  - {id: canonical-id-offer-contract, type: Approach, label: "정본 ID와 offer 계약", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {id: duplicate-work-offers, type: Problem, label: "같은 작품과 여러 OTT offer의 중복", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {id: surface-policy-contract, type: Approach, label: "surface policy 계약", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {id: surface-purpose-mixing, type: Problem, label: "검색, 랭킹, 상세와 홈의 목적 혼합", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {id: availability-contract, type: Approach, label: "작품 availability 계약", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {id: model-score-bypasses-watch-now-promise, type: Problem, label: "지금 보기 약속을 model score로 우회", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {id: feedback-event-contract, type: Approach, label: "feedback event 계약", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {id: response-impression-confusion, type: Problem, label: "response와 impression 혼동", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
ontology_relations:
  - {subject: "concept:separate-empty-query-browse-surface", predicate: addresses, target: "concept:empty-query-silent-home-swap", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#세 경로의 계약]]"}
  - {subject: "concept:search-query-reuse-in-recommendation-profile", predicate: requires, target: "concept:within-consented-purpose-and-retention", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#공유해야 하는 정본과 분리해야 하는 정책]]"}
  - {subject: "concept:relevance-floor-max-boost", predicate: addresses, target: "concept:personalization-overrides-search-relevance", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#개인화 검색 guardrail]]"}
  - {subject: "concept:deterministic-non-personalized-degrade", predicate: addresses, target: "concept:personalization-unavailable", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#개인화 검색 guardrail]]"}
  - {subject: "concept:structured-metadata-degrade", predicate: addresses, target: "concept:missing-taxonomy-assignment", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Queryless recommendation과 browse]]"}
  - {subject: "concept:cross-vertical-ranker", predicate: alternative_to, target: "concept:rank-fusion", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Federated vertical과 결과 혼합]]"}
  - {subject: "concept:cross-vertical-ranker", predicate: alternative_to, target: "concept:calibrated-vertical-score", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Federated vertical과 결과 혼합]]"}
  - {subject: "concept:cross-vertical-ranker", predicate: alternative_to, target: "concept:fixed-layout-baseline", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Federated vertical과 결과 혼합]]"}
  - {subject: "concept:last-touch-attribution", predicate: alternative_to, target: "concept:first-touch-attribution", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Event와 cross-surface attribution]]"}
  - {subject: "concept:last-touch-attribution", predicate: alternative_to, target: "concept:multi-touch-attribution", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Event와 cross-surface attribution]]"}
  - {subject: "concept:first-touch-attribution", predicate: alternative_to, target: "concept:multi-touch-attribution", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#Event와 cross-surface attribution]]"}
  - {subject: "concept:lexical-result-fallback", predicate: addresses, target: "concept:semantic-retrieval-failure", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {subject: "concept:partial-vertical-response", predicate: addresses, target: "concept:vertical-timeout", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {subject: "concept:popular-new-editorial-baseline", predicate: addresses, target: "concept:recommendation-source-failure", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {subject: "concept:keep-discovery-remove-direct-cta", predicate: addresses, target: "concept:availability-unknown", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {subject: "concept:separate-fallback-metrics", predicate: addresses, target: "concept:partial-results-in-success-rate", evidence: "[[Recommendation-System-OTT-Discovery-Architecture#실패와 의도 보존 fallback]]"}
  - {subject: "concept:slice-level-maturity-assessment", predicate: addresses, target: "concept:aggregate-traffic-hides-slice-sparsity", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#Behavior 성숙도]]"}
  - {subject: "concept:behavior-first-scenario", predicate: alternative_to, target: "concept:hybrid-scenario", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#2x2 시나리오]]"}
  - {subject: "concept:baseline-instrumentation-first-scenario", predicate: addresses, target: "concept:no-comparable-baseline-closed-loop", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S0. 둘 다 미성숙]]"}
  - {subject: "concept:taxonomy-first-scenario", predicate: addresses, target: "concept:new-item-cold-start", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {subject: "concept:taxonomy-first-scenario", predicate: has_tradeoff, target: "concept:taxonomy-tag-error", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {subject: "concept:taxonomy-first-scenario", predicate: has_tradeoff, target: "concept:common-genre-dominance", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {subject: "concept:taxonomy-first-scenario", predicate: has_tradeoff, target: "concept:overspecialization", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {subject: "concept:taxonomy-first-scenario", predicate: has_tradeoff, target: "concept:taxonomy-editing-cost", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S1. Taxonomy-first]]"}
  - {subject: "concept:behavior-first-scenario", predicate: addresses, target: "concept:latent-taste-discovery", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S2. Behavior-first]]"}
  - {subject: "concept:behavior-first-scenario", predicate: has_tradeoff, target: "concept:behavior-exposure-bias", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S2. Behavior-first]]"}
  - {subject: "concept:behavior-first-scenario", predicate: has_tradeoff, target: "concept:behavior-semantics-mixing", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S2. Behavior-first]]"}
  - {subject: "concept:common-ranker", predicate: alternative_to, target: "concept:single-giant-model-merge", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S3. Hybrid]]"}
  - {subject: "concept:hybrid-scenario", predicate: addresses, target: "concept:recommendation-source-failure", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S3. Hybrid]]"}
  - {subject: "concept:hybrid-scenario", predicate: has_tradeoff, target: "concept:hybrid-operational-complexity", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#S3. Hybrid]]"}
  - {subject: "concept:canonical-id-offer-contract", predicate: addresses, target: "concept:duplicate-work-offers", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {subject: "concept:surface-policy-contract", predicate: addresses, target: "concept:surface-purpose-mixing", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {subject: "concept:availability-contract", predicate: addresses, target: "concept:model-score-bypasses-watch-now-promise", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {subject: "concept:feedback-event-contract", predicate: addresses, target: "concept:response-impression-confusion", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
  - {subject: "concept:feedback-event-contract", predicate: addresses, target: "concept:unexposed-as-rejection", evidence: "[[Recommendation-System-OTT-Discovery-Scenarios#공통으로 먼저 닫을 계약]]"}
---

# 추천시스템 온톨로지 선언: OTT 디스커버리

검색, 추천과 탐색 경로의 계약과 성숙도 시나리오에 대한 개념 47개와 타입 관계 35개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/recommendation-system-*.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
