---
tags: [ai, ontology, instances, recommendation-system]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["추천시스템 온톨로지 선언: 공유 임베딩과 다중 관심"]
ontology_concepts:
  - {id: multi-interest-representation, type: Approach, label: "다중 관심 사용자 표현", aliases: ["다중 관심 표현"], evidence: "[[Recommendation-System-Multi-Interest-Modeling#다중 관심 사용자 표현]]"}
  - {id: single-vector-bottleneck, type: Problem, label: "단일 사용자 벡터의 병목(여러 관심이 섞인 중간 지점)", aliases: ["하나의 평균 embedding이 서로 다른 관심을 섞음"], evidence: "[[Recommendation-System-Multi-Interest-Modeling#단일 벡터의 병목]]"}
  - {id: multi-interest-design-burden, type: Tradeoff, label: "관심 수, 관심 분리와 점수 집계를 따로 정해야 하는 비용 증가", evidence: "[[Recommendation-System-Multi-Interest-Modeling#단일 벡터의 병목]]"}
  - {id: interest-collapse, type: Problem, label: "관심 벡터들이 같은 관심으로 뭉치는 관심 붕괴", aliases: ["관심 붕괴"], evidence: "[[Recommendation-System-Multi-Interest-Modeling#단일 벡터의 병목]]"}
  - {id: gaussian-routing-logit-init, type: Approach, label: "interest capsule의 routing logit Gaussian 무작위 초기화", evidence: "[[Recommendation-System-Multi-Interest-Modeling#파이프라인 위치가 먼저다]]"}
  - {id: shared-fixed-interest-count, type: Approach, label: "모든 사용자에 공통인 관심 수 K", evidence: "[[Recommendation-System-Multi-Interest-Modeling#파이프라인 위치가 먼저다]]"}
  - {id: per-interest-ann-merge, type: Approach, label: "관심별 ANN top N 병합", evidence: "[[Recommendation-System-Multi-Interest-Modeling#파이프라인 위치가 먼저다]]"}
  - {id: interest-disagreement-regularization, type: Approach, label: "Disagreement regularization", aliases: ["disagreement 정규화"], evidence: "[[Recommendation-System-Multi-Interest-Modeling#MINER의 구성]]"}
  - {id: category-aware-attention-weighting, type: Approach, label: "Category-aware attention weighting", aliases: ["category 가중"], evidence: "[[Recommendation-System-Multi-Interest-Modeling#MINER의 구성]]"}
  - {id: category-embedding-concatenation, type: Approach, label: "카테고리 embedding 단순 연결", evidence: "[[Recommendation-System-Multi-Interest-Modeling#MINER의 구성]]"}
  - {id: max-aggregation, type: Approach, label: "관심별 내적의 max 집계", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {id: mean-aggregation, type: Approach, label: "관심별 내적의 mean 집계", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {id: weighted-aggregation, type: Approach, label: "후보 기반 weighted 집계", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {id: ann-approximation-propagates, type: Tradeoff, label: "관심별 ANN 병합 결과도 ANN 근사만큼 근사", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {id: candidate-dependent-no-single-query-ann, type: Tradeoff, label: "후보에 의존하는 점수라 질의 벡터 하나의 ANN 검색으로 바꿀 수 없음", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {id: per-category-interest-query, type: Approach, label: "카테고리별 관심 벡터 재생성과 카테고리 필터 ANN 검색", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {id: single-category-per-item, type: Condition, label: "아이템마다 카테고리가 하나", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {id: query-count-categories-times-k, type: Tradeoff, label: "max 집계와 함께 쓰면 질의 수가 카테고리 수 곱하기 K개로 늘어남", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {id: per-user-interest-count-heuristic, type: Approach, label: "행동량에 따른 사용자별 관심 수 휴리스틱(Alibaba MIND)", evidence: "[[Recommendation-System-Multi-Interest-Modeling#관심 수 K와 비용]]"}
  - {id: sparse-user-interest-vector-cost, type: Problem, label: "행동이 적은 사용자에게도 관심 벡터를 만드는 계산과 메모리 비용", evidence: "[[Recommendation-System-Multi-Interest-Modeling#관심 수 K와 비용]]"}
  - {id: per-candidate-k-interest-scores, type: Tradeoff, label: "MINER에서 후보마다 관심별 점수 K개 계산", evidence: "[[Recommendation-System-Multi-Interest-Modeling#관심 수 K와 비용]]"}
  - {id: weighted-extra-k-dot-products, type: Tradeoff, label: "weighted 집계의 가중치 계산에 내적 K개 추가", evidence: "[[Recommendation-System-Multi-Interest-Modeling#관심 수 K와 비용]]"}
  - {id: per-slot-candidate-model-sprawl, type: Problem, label: "추천 칸마다 따로 둔 후보 모델의 학습, 서빙, 모니터링 증가와 개선 반복", evidence: "[[Recommendation-System-Shared-Embedding-Space#통합 임베딩 공간과 범용 리트리버]]"}
  - {id: universal-embedding-retriever, type: Approach, label: "통합 임베딩 공간과 범용 리트리버", aliases: ["통합 임베딩", "Universal Embedding"], evidence: "[[Recommendation-System-Shared-Embedding-Space#통합 임베딩 공간과 범용 리트리버]]"}
  - {id: shared-text-encoder-bi-encoder, type: Approach, label: "질의와 상품을 같은 텍스트 인코더로 따로 인코딩하는 bi-encoder", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {id: aggregated-derived-entity-vectors, type: Approach, label: "파생 엔티티 벡터를 상품 벡터 집계로 만들기", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {id: new-entity-model-retraining, type: Problem, label: "새 엔티티를 추가할 때마다 모델을 다시 학습함", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {id: same-brand-click-damping, type: Approach, label: "사용자 벡터 가중 평균에서 같은 브랜드 반복 클릭 가중치 축소", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {id: single-brand-dominates-user-vector, type: Problem, label: "한 브랜드가 사용자 벡터를 독차지", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {id: segment-vector-fallback, type: Approach, label: "연령대와 성별 세그먼트 벡터 대체", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {id: brand-category-distribution-signal, type: Approach, label: "브랜드 벡터 유사도에 클릭 카테고리 분포를 두 번째 신호로 섞기", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {id: assortment-similar-brands-too-close, type: Problem, label: "상품 구성만 비슷하고 사용자가 다르게 보는 브랜드가 가깝게 나옴", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {id: false-negative, type: Problem, label: "사실상 정답인 아이템을 오답으로 학습하는 false negative", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {id: exclude-de-facto-positives, type: Approach, label: "사실상 정답인 상품을 오답에서 제외", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {id: wide-exclusion-collapse, type: Tradeoff, label: "오답에서 넓게 빼면 그 상품들을 한 점에 모아 구분하지 못하는 붕괴", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {id: margin-negative, type: Approach, label: "오답으로 남기되 일정 margin 안에서만 가깝게 두기", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {id: cross-category-negative-penalty, type: Approach, label: "카테고리가 다른 오답의 점수 감점", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {id: confusable-same-category-items, type: Problem, label: "헷갈리는 같은 카테고리 상품을 구분하지 못함", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {id: title-to-product-self-supervision, type: Approach, label: "상품명으로 상품 맞추기 자기 지도 데이터", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {id: retraining-coordinate-shift, type: Problem, label: "재학습마다 같은 상품의 임베딩 좌표가 바뀜", evidence: "[[Recommendation-System-Shared-Embedding-Space#차원과 좌표계]]"}
  - {id: embedding-version-matching, type: Approach, label: "인덱스 재생성과 하위 모델 재학습으로 임베딩 버전 맞춤", evidence: "[[Recommendation-System-Shared-Embedding-Space#차원과 좌표계]]"}
  - {id: orthogonal-procrustes-alignment, type: Approach, label: "직교 Procrustes 회전 정렬", aliases: ["Procrustes 정렬"], evidence: "[[Recommendation-System-Shared-Embedding-Space#차원과 좌표계]]"}
  - {id: rotation-only-difference, type: Condition, label: "두 임베딩 공간이 회전만 다름", evidence: "[[Recommendation-System-Shared-Embedding-Space#차원과 좌표계]]"}
  - {id: precomputed-combination-lists, type: Approach, label: "조건 조합별 상품 목록을 미리 만들어 공유 저장소에 두기", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: combination-explosion-store-load, type: Tradeoff, label: "조합 수 폭발과 요청마다 공유 저장소 부하", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: per-condition-roaring-bitmap, type: Approach, label: "조건값별 Roaring bitmap을 서버 메모리에 두고 AND로 결합", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: neighbor-traversal-ann, type: Approach, label: "조건부 요청에 쓰는 질의 근처 이웃 탐색 ANN", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: ann-misses-clustered-condition-items, type: Tradeoff, label: "필터 인지 전략이 없으면 한구석에 몰린 조건 상품에 닿기 전에 탐색이 끝남", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: bitmap-narrowed-exact-scoring, type: Approach, label: "비트맵으로 좁힌 후보의 전수 계산", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: exact-scoring-cost, type: Tradeoff, label: "전수 계산의 점수 계산 비용", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: per-request-array-allocation, type: Problem, label: "요청마다 후보 수 곱하기 차원 크기 배열 할당이 점수 계산 시간을 차지", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: per-thread-fixed-buffer, type: Approach, label: "작업 스레드별 고정 크기 버퍼와 후보 조각 계산", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: fail-closed-unknown-condition, type: Approach, label: "인덱스에 없는 조건값이면 빈 결과 반환(fail closed)", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: silently-dropped-condition-widens-results, type: Problem, label: "조건을 조용히 빼 의도보다 넓은 상품이 노출됨", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: load-only-called-entity-indexes, type: Approach, label: "호출되는 엔티티 인덱스만 적재", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: unused-index-memory, type: Problem, label: "호출되지 않는 엔티티 인덱스가 서버 메모리 대부분을 차지", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {id: entity-definable-as-product-bundle, type: Condition, label: "엔티티를 상품 묶음으로 정의할 수 있음", evidence: "[[Recommendation-System-Shared-Embedding-Space#적용 점검]]"}
ontology_relations:
  - {subject: "concept:multi-interest-representation", predicate: addresses, target: "concept:single-vector-bottleneck", evidence: "[[Recommendation-System-Multi-Interest-Modeling#단일 벡터의 병목]]"}
  - {subject: "concept:multi-interest-representation", predicate: has_tradeoff, target: "concept:multi-interest-design-burden", evidence: "[[Recommendation-System-Multi-Interest-Modeling#단일 벡터의 병목]]"}
  - {subject: "concept:gaussian-routing-logit-init", predicate: addresses, target: "concept:interest-collapse", evidence: "[[Recommendation-System-Multi-Interest-Modeling#파이프라인 위치가 먼저다]]"}
  - {subject: "concept:shared-fixed-interest-count", predicate: alternative_to, target: "concept:per-user-interest-count-heuristic", evidence: "[[Recommendation-System-Multi-Interest-Modeling#파이프라인 위치가 먼저다]]"}
  - {subject: "concept:max-aggregation", predicate: alternative_to, target: "concept:mean-aggregation", evidence: "[[Recommendation-System-Multi-Interest-Modeling#파이프라인 위치가 먼저다]]"}
  - {subject: "concept:max-aggregation", predicate: alternative_to, target: "concept:weighted-aggregation", evidence: "[[Recommendation-System-Multi-Interest-Modeling#파이프라인 위치가 먼저다]]"}
  - {subject: "concept:mean-aggregation", predicate: alternative_to, target: "concept:weighted-aggregation", evidence: "[[Recommendation-System-Multi-Interest-Modeling#파이프라인 위치가 먼저다]]"}
  - {subject: "concept:interest-disagreement-regularization", predicate: addresses, target: "concept:interest-collapse", evidence: "[[Recommendation-System-Multi-Interest-Modeling#MINER의 구성]]"}
  - {subject: "concept:category-aware-attention-weighting", predicate: alternative_to, target: "concept:category-embedding-concatenation", evidence: "[[Recommendation-System-Multi-Interest-Modeling#MINER의 구성]]"}
  - {subject: "concept:per-interest-ann-merge", predicate: has_tradeoff, target: "concept:ann-approximation-propagates", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {subject: "concept:weighted-aggregation", predicate: has_tradeoff, target: "concept:candidate-dependent-no-single-query-ann", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {subject: "concept:category-aware-attention-weighting", predicate: has_tradeoff, target: "concept:candidate-dependent-no-single-query-ann", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {subject: "concept:per-category-interest-query", predicate: requires, target: "concept:single-category-per-item", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {subject: "concept:per-category-interest-query", predicate: has_tradeoff, target: "concept:query-count-categories-times-k", evidence: "[[Recommendation-System-Multi-Interest-Modeling#집계 방식이 서빙 위치를 정한다]]"}
  - {subject: "concept:per-user-interest-count-heuristic", predicate: addresses, target: "concept:sparse-user-interest-vector-cost", evidence: "[[Recommendation-System-Multi-Interest-Modeling#관심 수 K와 비용]]"}
  - {subject: "concept:max-aggregation", predicate: has_tradeoff, target: "concept:per-candidate-k-interest-scores", evidence: "[[Recommendation-System-Multi-Interest-Modeling#관심 수 K와 비용]]"}
  - {subject: "concept:weighted-aggregation", predicate: has_tradeoff, target: "concept:per-candidate-k-interest-scores", evidence: "[[Recommendation-System-Multi-Interest-Modeling#관심 수 K와 비용]]"}
  - {subject: "concept:weighted-aggregation", predicate: has_tradeoff, target: "concept:weighted-extra-k-dot-products", evidence: "[[Recommendation-System-Multi-Interest-Modeling#관심 수 K와 비용]]"}
  - {subject: "concept:universal-embedding-retriever", predicate: addresses, target: "concept:per-slot-candidate-model-sprawl", evidence: "[[Recommendation-System-Shared-Embedding-Space#통합 임베딩 공간과 범용 리트리버]]"}
  - {subject: "concept:shared-text-encoder-bi-encoder", predicate: addresses, target: "concept:new-item-cold-start", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {subject: "concept:aggregated-derived-entity-vectors", predicate: addresses, target: "concept:new-entity-model-retraining", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {subject: "concept:same-brand-click-damping", predicate: addresses, target: "concept:single-brand-dominates-user-vector", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {subject: "concept:segment-vector-fallback", predicate: addresses, target: "concept:new-user-cold-start", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {subject: "concept:brand-category-distribution-signal", predicate: addresses, target: "concept:assortment-similar-brands-too-close", evidence: "[[Recommendation-System-Shared-Embedding-Space#공간 만들기: 상품만 학습하고 나머지는 집계한다]]"}
  - {subject: "concept:exclude-de-facto-positives", predicate: addresses, target: "concept:false-negative", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {subject: "concept:exclude-de-facto-positives", predicate: has_tradeoff, target: "concept:wide-exclusion-collapse", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {subject: "concept:margin-negative", predicate: alternative_to, target: "concept:exclude-de-facto-positives", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {subject: "concept:cross-category-negative-penalty", predicate: addresses, target: "concept:confusable-same-category-items", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {subject: "concept:title-to-product-self-supervision", predicate: addresses, target: "concept:new-item-cold-start", evidence: "[[Recommendation-System-Shared-Embedding-Space#학습: 대조 학습과 오답 설계]]"}
  - {subject: "concept:embedding-version-matching", predicate: addresses, target: "concept:retraining-coordinate-shift", evidence: "[[Recommendation-System-Shared-Embedding-Space#차원과 좌표계]]"}
  - {subject: "concept:orthogonal-procrustes-alignment", predicate: alternative_to, target: "concept:embedding-version-matching", evidence: "[[Recommendation-System-Shared-Embedding-Space#차원과 좌표계]]"}
  - {subject: "concept:orthogonal-procrustes-alignment", predicate: requires, target: "concept:rotation-only-difference", evidence: "[[Recommendation-System-Shared-Embedding-Space#차원과 좌표계]]"}
  - {subject: "concept:precomputed-combination-lists", predicate: has_tradeoff, target: "concept:combination-explosion-store-load", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {subject: "concept:per-condition-roaring-bitmap", predicate: alternative_to, target: "concept:precomputed-combination-lists", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {subject: "concept:neighbor-traversal-ann", predicate: has_tradeoff, target: "concept:ann-misses-clustered-condition-items", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {subject: "concept:bitmap-narrowed-exact-scoring", predicate: alternative_to, target: "concept:neighbor-traversal-ann", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {subject: "concept:bitmap-narrowed-exact-scoring", predicate: has_tradeoff, target: "concept:exact-scoring-cost", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {subject: "concept:per-thread-fixed-buffer", predicate: addresses, target: "concept:per-request-array-allocation", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {subject: "concept:fail-closed-unknown-condition", predicate: addresses, target: "concept:silently-dropped-condition-widens-results", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {subject: "concept:load-only-called-entity-indexes", predicate: addresses, target: "concept:unused-index-memory", evidence: "[[Recommendation-System-Shared-Embedding-Space#조건 리트리벌: 정확도와 지연을 같이 지킨다]]"}
  - {subject: "concept:aggregated-derived-entity-vectors", predicate: requires, target: "concept:entity-definable-as-product-bundle", evidence: "[[Recommendation-System-Shared-Embedding-Space#적용 점검]]"}
---

# 추천시스템 온톨로지 선언: 공유 임베딩과 다중 관심

통합 임베딩 공간, 조건 리트리벌과 다중 관심 표현에 대한 개념 57개와 타입 관계 41개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/recommendation-system-*.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
