---
tags: [ai, ontology, instances, recommendation-system]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["추천시스템 온톨로지 선언: 산업 사례: 미디어, 연구 벤치마크와 소셜 그래프"]
ontology_concepts:
  - {id: user-user-collaborative-filtering, type: Approach, label: "user-user collaborative filtering", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#GroupLens가 만든 초기 구조]]"}
  - {id: netflix-algorithm-portfolio, type: Approach, label: "Netflix의 목적별 알고리즘과 화면 조합 portfolio", evidence: "[[Recommendation-System-Industry-Media#여러 문제를 분리한 portfolio]]"}
  - {id: single-global-score, type: Approach, label: "하나의 global score로만 합치는 추천", evidence: "[[Recommendation-System-Industry-Media#여러 문제를 분리한 portfolio]]"}
  - {id: row-duplication-lost-exploration-intent, type: Tradeoff, label: "화면 중복과 탐색 의도 상실", evidence: "[[Recommendation-System-Industry-Media#여러 문제를 분리한 portfolio]]"}
  - {id: new-profile-initial-recommendation, type: Problem, label: "이용 기록이 쌓이기 전 새 프로필의 초기 추천", evidence: "[[Recommendation-System-Industry-Media#제품 설명에서 확인되는 입력과 초기화]]"}
  - {id: new-profile-favorite-title-selection, type: Approach, label: "새 프로필의 좋아하는 작품 선택", evidence: "[[Recommendation-System-Industry-Media#제품 설명에서 확인되는 입력과 초기화]]"}
  - {id: popular-titles-starting-point, type: Approach, label: "인기 작품을 초기 추천의 출발점으로 삼기", evidence: "[[Recommendation-System-Industry-Media#제품 설명에서 확인되는 입력과 초기화]]"}
  - {id: online-computation-failure-or-delay, type: Problem, label: "online 계산의 실패나 지연", evidence: "[[Recommendation-System-Industry-Media#계산 시점의 분리]]"}
  - {id: precomputed-result-fallback, type: Approach, label: "precomputed result fallback", evidence: "[[Recommendation-System-Industry-Media#계산 시점의 분리]]"}
  - {id: ctr-gain-masks-page-harm, type: Problem, label: "CTR이 높아도 화면 소비가 한 row로 쏠리거나 장기 만족이 낮아짐", evidence: "[[Recommendation-System-Industry-Media#평가 계약]]"}
  - {id: row-page-guardrail-metric-separation, type: Approach, label: "row metric, page-level metric과 장기 guardrail 분리", evidence: "[[Recommendation-System-Industry-Media#평가 계약]]"}
  - {id: netflix-recommendation-foundation-model, type: Approach, label: "Netflix recommendation foundation model", evidence: "[[Recommendation-System-Industry-Media#이후 방향과 근거 경계]]"}
  - {id: out-of-catalog-generation, type: Problem, label: "목록 밖 작품 생성", evidence: "[[Recommendation-System-Industry-Media#GenRec: 언어 이해와 catalog 점수화를 결합한다]]"}
  - {id: catalog-constrained-output, type: Approach, label: "catalog에 제한된 추천 출력", evidence: "[[Recommendation-System-Industry-Media#GenRec: 언어 이해와 catalog 점수화를 결합한다]]"}
  - {id: exposure-policy-dependence, type: Problem, label: "학습 example의 기존 노출 정책 종속", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {id: all-watch-training-examples, type: Approach, label: "외부 embed를 포함한 전체 watch로 학습 example 생성", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {id: sampled-softmax, type: Approach, label: "sampled softmax", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {id: heavy-user-dataset-dominance, type: Problem, label: "많은 활동을 한 사용자의 dataset 지배", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {id: per-user-example-cap, type: Approach, label: "사용자별 example 수 제한", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {id: past-features-future-label-holdout, type: Approach, label: "과거 시점 feature로 미래 행동을 예측하는 holdout", aliases: ["temporal holdout"], evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {id: random-holdout, type: Approach, label: "무작위 holdout", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {id: multi-stage-recommendation-funnel, type: Approach, label: "후보 공간을 여러 단계로 줄이는 multi-stage funnel", aliases: ["multi-stage ranking"], evidence: "[[Recommendation-System-Industry-Social-Graph#제품 문제]]"}
  - {id: popularity-shift-during-training-window, type: Problem, label: "학습 기간에 변한 인기도 분포", evidence: "[[Recommendation-System-Industry-Media#Ranking과 label]]"}
  - {id: example-age-feature, type: Approach, label: "example age feature", evidence: "[[Recommendation-System-Industry-Media#Ranking과 label]]"}
  - {id: click-only-objective, type: Approach, label: "click만 최적화하는 목적", aliases: ["CTR만 최적화"], evidence: "[[Recommendation-System-Industry-Media#평가와 근거 경계]]"}
  - {id: short-clickbait-video-advantage, type: Tradeoff, label: "짧거나 낚시성인 video가 유리해짐", evidence: "[[Recommendation-System-Industry-Media#평가와 근거 경계]]"}
  - {id: watch-time-engagement-signal, type: Approach, label: "watch time을 engagement 신호로 쓰는 ranker", evidence: "[[Recommendation-System-Industry-Media#평가와 근거 경계]]"}
  - {id: mmoe, type: Approach, label: "Multi-gate Mixture-of-Experts", aliases: ["MMoE"], evidence: "[[Recommendation-System-Industry-Media#2019년 Watch Next는 별도 multi-objective 사례다]]"}
  - {id: user-feedback-selection-bias, type: Problem, label: "user feedback에 포함된 selection bias", evidence: "[[Recommendation-System-Industry-Media#2019년 Watch Next는 별도 multi-objective 사례다]]"}
  - {id: watch-next-wide-and-deep, type: Approach, label: "Watch Next ranker의 Wide & Deep 구조", evidence: "[[Recommendation-System-Industry-Media#2019년 Watch Next는 별도 multi-objective 사례다]]"}
  - {id: context-dependent-next-listening, type: Problem, label: "같은 사용자도 시간, 기기와 진입 경로에 따라 다음에 들을 음악이 달라짐", evidence: "[[Recommendation-System-Industry-Media#CoSeRNN이 푸는 문제]]"}
  - {id: cosernn, type: Approach, label: "CoSeRNN", evidence: "[[Recommendation-System-Industry-Media#CoSeRNN이 푸는 문제]]"}
  - {id: track-order-changes-session-consumption, type: Problem, label: "개별 relevance로 만든 목록도 곡 순서에 따라 session 소비가 달라짐", evidence: "[[Recommendation-System-Industry-Media#2023년 playlist sequencing은 목록 내부 순서를 다룬다]]"}
  - {id: spotify-playlist-sequencing, type: Approach, label: "position-aware와 local-sequential preference를 분리한 Spotify 목록 순서 최적화", evidence: "[[Recommendation-System-Industry-Media#2023년 playlist sequencing은 목록 내부 순서를 다룬다]]"}
  - {id: similar-past-opinions-persist, type: Condition, label: "과거에 의견이 비슷했던 사람은 다음 item에서도 비슷할 가능성이 있음", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#GroupLens가 만든 초기 구조]]"}
  - {id: mutable-latest-dataset, type: Problem, label: "MovieLens latest dataset은 내용이 바뀌어 연구 결과 보고에 적합하지 않음", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#Stable과 latest를 구분한다]]"}
  - {id: pinned-dataset-version, type: Approach, label: "dataset version, checksum 또는 permalink 고정", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#Stable과 latest를 구분한다]]"}
  - {id: missing-feedback-ambiguity, type: Problem, label: "rating이나 반응이 없는 이유를 데이터만으로 완전히 구분할 수 없음", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#데이터는 중립적인 표본이 아니다]]"}
  - {id: incomplete-reciprocal-objective, type: Tradeoff, label: "초대 전송과 상대의 수락을 따로 담지 못하는 불완전한 목적", evidence: "[[Recommendation-System-Industry-Social-Graph#제품 문제]]"}
  - {id: graph-walk-candidate-generation, type: Approach, label: "N-hop과 PPR graph walk 후보 생성", evidence: "[[Recommendation-System-Industry-Social-Graph#Candidate generation]]"}
  - {id: few-connection-candidate-shortage, type: Problem, label: "연결이 적은 사용자의 후보 유동성 부족", evidence: "[[Recommendation-System-Industry-Social-Graph#Candidate generation]]"}
  - {id: high-degree-structure-reinforcement, type: Tradeoff, label: "degree가 큰 node와 기존 연결 구조의 반복 강화", evidence: "[[Recommendation-System-Industry-Social-Graph#Candidate generation]]"}
  - {id: l1-source-score-calibration, type: Approach, label: "L1 light ranker의 source 점수 calibration", evidence: "[[Recommendation-System-Industry-Social-Graph#Multi-stage ranking]]"}
  - {id: pair-feature-ranker-high-cost, type: Tradeoff, label: "viewer-candidate pair feature를 쓰는 ranker의 높은 비용", evidence: "[[Recommendation-System-Industry-Social-Graph#Multi-stage ranking]]"}
  - {id: invite-send-only-optimization, type: Approach, label: "초대 전송만 높이는 최적화", evidence: "[[Recommendation-System-Industry-Social-Graph#평가와 피드백 루프]]"}
  - {id: acceptance-and-recipient-fatigue-worsen, type: Tradeoff, label: "수락률과 상대의 피로도 악화", evidence: "[[Recommendation-System-Industry-Social-Graph#평가와 피드백 루프]]"}
  - {id: fairness-reranking, type: Approach, label: "공정성 re-ranking", evidence: "[[Recommendation-System-Industry-Social-Graph#평가와 피드백 루프]]"}
  - {id: fairness-target-stage-and-group-distribution, type: Condition, label: "목표로 하는 단계와 집단 분포의 명시", evidence: "[[Recommendation-System-Industry-Social-Graph#평가와 피드백 루프]]"}
  - {id: pinsage, type: Approach, label: "PinSage", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {id: sparse-interaction-item-representation, type: Problem, label: "interaction이 적은 item의 표현", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {id: full-neighborhood-aggregation-cost, type: Problem, label: "full-neighborhood aggregation의 scale 부담", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {id: pinsage-important-neighbor-sampling, type: Approach, label: "PinSage의 중요 이웃 샘플링", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {id: near-but-irrelevant-items, type: Problem, label: "가깝지만 관련 없는 item의 구분", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {id: pinsage-curriculum-hard-negatives, type: Approach, label: "PinSage의 점점 어려운 negative 사용", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {id: engagement-bias, type: Problem, label: "engagement 편향", evidence: "[[Recommendation-System-Industry-Social-Graph#X For You 피드 공개 저장소]]"}
  - {id: negative-weighted-action-score, type: Approach, label: "부정적 반응에 음수 가중치를 주는 행동 확률 가중합 점수", evidence: "[[Recommendation-System-Industry-Social-Graph#X For You 피드 공개 저장소]]"}
ontology_relations:
  - {subject: "concept:netflix-algorithm-portfolio", predicate: alternative_to, target: "concept:single-global-score", evidence: "[[Recommendation-System-Industry-Media#여러 문제를 분리한 portfolio]]"}
  - {subject: "concept:single-global-score", predicate: has_tradeoff, target: "concept:row-duplication-lost-exploration-intent", evidence: "[[Recommendation-System-Industry-Media#여러 문제를 분리한 portfolio]]"}
  - {subject: "concept:new-profile-favorite-title-selection", predicate: addresses, target: "concept:new-profile-initial-recommendation", evidence: "[[Recommendation-System-Industry-Media#제품 설명에서 확인되는 입력과 초기화]]"}
  - {subject: "concept:popular-titles-starting-point", predicate: alternative_to, target: "concept:new-profile-favorite-title-selection", evidence: "[[Recommendation-System-Industry-Media#제품 설명에서 확인되는 입력과 초기화]]"}
  - {subject: "concept:precomputed-result-fallback", predicate: addresses, target: "concept:online-computation-failure-or-delay", evidence: "[[Recommendation-System-Industry-Media#계산 시점의 분리]]"}
  - {subject: "concept:offline-evaluation", predicate: has_tradeoff, target: "concept:offline-gain-not-online-effect", evidence: "[[Recommendation-System-Industry-Media#평가 계약]]"}
  - {subject: "concept:row-page-guardrail-metric-separation", predicate: addresses, target: "concept:ctr-gain-masks-page-harm", evidence: "[[Recommendation-System-Industry-Media#평가 계약]]"}
  - {subject: "concept:netflix-recommendation-foundation-model", predicate: addresses, target: "concept:duplicated-user-representation-learning", evidence: "[[Recommendation-System-Industry-Media#이후 방향과 근거 경계]]"}
  - {subject: "concept:catalog-constrained-output", predicate: addresses, target: "concept:out-of-catalog-generation", evidence: "[[Recommendation-System-Industry-Media#GenRec: 언어 이해와 catalog 점수화를 결합한다]]"}
  - {subject: "concept:all-watch-training-examples", predicate: addresses, target: "concept:exposure-policy-dependence", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {subject: "concept:sampled-softmax", predicate: addresses, target: "concept:full-softmax-cost", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {subject: "concept:per-user-example-cap", predicate: addresses, target: "concept:heavy-user-dataset-dominance", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {subject: "concept:past-features-future-label-holdout", predicate: addresses, target: "concept:future-information-leakage", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {subject: "concept:past-features-future-label-holdout", predicate: alternative_to, target: "concept:random-holdout", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {subject: "concept:multi-stage-recommendation-funnel", predicate: has_tradeoff, target: "concept:candidate-miss-unrecoverable-by-ranker", evidence: "[[Recommendation-System-Industry-Media#Candidate generation]]"}
  - {subject: "concept:example-age-feature", predicate: addresses, target: "concept:popularity-shift-during-training-window", evidence: "[[Recommendation-System-Industry-Media#Ranking과 label]]"}
  - {subject: "concept:click-only-objective", predicate: has_tradeoff, target: "concept:short-clickbait-video-advantage", evidence: "[[Recommendation-System-Industry-Media#평가와 근거 경계]]"}
  - {subject: "concept:watch-time-engagement-signal", predicate: alternative_to, target: "concept:click-only-objective", evidence: "[[Recommendation-System-Industry-Media#평가와 근거 경계]]"}
  - {subject: "concept:mmoe", predicate: addresses, target: "concept:competing-recommendation-objectives", evidence: "[[Recommendation-System-Industry-Media#2019년 Watch Next는 별도 multi-objective 사례다]]"}
  - {subject: "concept:watch-next-wide-and-deep", predicate: addresses, target: "concept:user-feedback-selection-bias", evidence: "[[Recommendation-System-Industry-Media#2019년 Watch Next는 별도 multi-objective 사례다]]"}
  - {subject: "concept:cosernn", predicate: addresses, target: "concept:context-dependent-next-listening", evidence: "[[Recommendation-System-Industry-Media#CoSeRNN이 푸는 문제]]"}
  - {subject: "concept:spotify-playlist-sequencing", predicate: addresses, target: "concept:track-order-changes-session-consumption", evidence: "[[Recommendation-System-Industry-Media#2023년 playlist sequencing은 목록 내부 순서를 다룬다]]"}
  - {subject: "concept:user-user-collaborative-filtering", predicate: requires, target: "concept:similar-past-opinions-persist", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#GroupLens가 만든 초기 구조]]"}
  - {subject: "concept:pinned-dataset-version", predicate: addresses, target: "concept:mutable-latest-dataset", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#Stable과 latest를 구분한다]]"}
  - {subject: "concept:impression-logging", predicate: addresses, target: "concept:missing-feedback-ambiguity", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#데이터는 중립적인 표본이 아니다]]"}
  - {subject: "concept:movielens-baseline", predicate: has_tradeoff, target: "concept:movielens-cannot-prove-production-readiness", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#MovieLens가 production readiness를 증명하지 못하는 이유]]"}
  - {subject: "concept:fixed-evaluation-contract", predicate: addresses, target: "concept:incomparable-offline-metrics", evidence: "[[Recommendation-System-Industry-Research-Benchmarks#재현 가능한 평가 계약]]"}
  - {subject: "concept:multi-stage-recommendation-funnel", predicate: addresses, target: "concept:full-catalog-scoring-latency", evidence: "[[Recommendation-System-Industry-Social-Graph#제품 문제]]"}
  - {subject: "concept:click-only-objective", predicate: has_tradeoff, target: "concept:incomplete-reciprocal-objective", evidence: "[[Recommendation-System-Industry-Social-Graph#제품 문제]]"}
  - {subject: "concept:graph-walk-candidate-generation", predicate: addresses, target: "concept:few-connection-candidate-shortage", evidence: "[[Recommendation-System-Industry-Social-Graph#Candidate generation]]"}
  - {subject: "concept:graph-walk-candidate-generation", predicate: has_tradeoff, target: "concept:high-degree-structure-reinforcement", evidence: "[[Recommendation-System-Industry-Social-Graph#Candidate generation]]"}
  - {subject: "concept:l1-source-score-calibration", predicate: addresses, target: "concept:source-score-scale-mismatch", evidence: "[[Recommendation-System-Industry-Social-Graph#Multi-stage ranking]]"}
  - {subject: "concept:downstream-pair-feature-ranker", predicate: has_tradeoff, target: "concept:pair-feature-ranker-high-cost", evidence: "[[Recommendation-System-Industry-Social-Graph#Multi-stage ranking]]"}
  - {subject: "concept:invite-send-only-optimization", predicate: has_tradeoff, target: "concept:acceptance-and-recipient-fatigue-worsen", evidence: "[[Recommendation-System-Industry-Social-Graph#평가와 피드백 루프]]"}
  - {subject: "concept:fairness-reranking", predicate: requires, target: "concept:fairness-target-stage-and-group-distribution", evidence: "[[Recommendation-System-Industry-Social-Graph#평가와 피드백 루프]]"}
  - {subject: "concept:pinsage", predicate: addresses, target: "concept:sparse-interaction-item-representation", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {subject: "concept:pinsage-important-neighbor-sampling", predicate: addresses, target: "concept:full-neighborhood-aggregation-cost", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {subject: "concept:pinsage-curriculum-hard-negatives", predicate: addresses, target: "concept:near-but-irrelevant-items", evidence: "[[Recommendation-System-Industry-Social-Graph#Graph structure와 node feature 결합]]"}
  - {subject: "concept:negative-weighted-action-score", predicate: addresses, target: "concept:engagement-bias", evidence: "[[Recommendation-System-Industry-Social-Graph#X For You 피드 공개 저장소]]"}
---

# 추천시스템 온톨로지 선언: 산업 사례: 미디어, 연구 벤치마크와 소셜 그래프

미디어 추천, 연구 데이터셋과 소셜 그래프 추천 사례에 대한 개념 56개와 타입 관계 39개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/recommendation-system-*.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
