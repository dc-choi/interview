---
tags: [ai, ontology, instances, recommendation-system]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["추천시스템 온톨로지 선언: 피드백 데이터와 가용성"]
ontology_concepts:
  - {id: universal-surface-constraint-separation, type: Approach, label: "보편 제약과 surface별 제품 제약 분리", aliases: ["보편 제약과 surface 제약 분리"], evidence: "[[Recommendation-System-Eligibility-Availability#추천 자격 조건과 가용성]]"}
  - {id: surface-dependent-eligibility, type: Problem, label: "화면 약속과 맥락에 따라 달라지는 노출 가능 여부", evidence: "[[Recommendation-System-Eligibility-Availability#추천 자격 조건과 가용성]]"}
  - {id: subscription-availability-hard-constraint, type: Approach, label: "구독 일치와 최신 가용성의 hard constraint 적용", evidence: "[[Recommendation-System-Eligibility-Availability#보편 제약과 surface 제약]]"}
  - {id: subscription-availability-as-feature-badge, type: Approach, label: "구독 일치와 가용성을 feature나 badge로 사용", evidence: "[[Recommendation-System-Eligibility-Availability#보편 제약과 surface 제약]]"}
  - {id: provider-name-only-availability, type: Problem, label: "제공처 이름만으로는 정액제, 대여, 구매 구분과 종료 deeplink 제거가 어려움", evidence: "[[Recommendation-System-Eligibility-Availability#Offer 단위 가용성 입력]]"}
  - {id: offer-level-availability-input, type: Approach, label: "Offer 단위 가용성 입력", evidence: "[[Recommendation-System-Eligibility-Availability#Offer 단위 가용성 입력]]"}
  - {id: direct-watch-cta, type: Approach, label: "직접 시청 CTA", aliases: ["직접 CTA"], evidence: "[[Recommendation-System-Eligibility-Availability#상태 판정표]]"}
  - {id: verified-deeplink, type: Condition, label: "VERIFIED deeplink", evidence: "[[Recommendation-System-Eligibility-Availability#상태 판정표]]"}
  - {id: offer-not-ended, type: Condition, label: "종료 시각이 지나지 않은 offer", evidence: "[[Recommendation-System-Eligibility-Availability#상태 판정표]]"}
  - {id: stale-offer-bounded-refresh-success, type: Condition, label: "maxStaleAge 안 STALE 관측의 bounded refresh 성공", evidence: "[[Recommendation-System-Eligibility-Availability#상태 판정표]]"}
  - {id: deferred-availability-evaluation, type: Approach, label: "source 미지원 후보의 가용성 평가 연기 (SOURCE_UNSUPPORTED_DEFERRED)", evidence: "[[Recommendation-System-Eligibility-Availability#공유 AvailabilityEvaluation]]"}
  - {id: resolved-before-slate, type: Condition, label: "slate 전까지 병합 또는 최종 재검사로 RESOLVED나 FAILED 전이", evidence: "[[Recommendation-System-Eligibility-Availability#공유 AvailabilityEvaluation]]"}
  - {id: post-topk-filter-underfill, type: Problem, label: "선택도가 높은 제약을 각 source의 Top K 뒤에서만 적용해 생기는 underfill", aliases: ["선택도 높은 조건을 Top K 뒤에서만 적용해 K 밖의 적격 후보를 잃음"], evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {id: bounded-overfetch-adaptive-retry, type: Approach, label: "pass rate 기준 제한된 overfetch와 adaptive retry", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {id: final-eligibility-recheck, type: Approach, label: "최종 eligibility 재검사", aliases: ["병합 뒤 최종 eligibility 재검사"], evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {id: stale-cache-and-snapshot-drift, type: Problem, label: "오래된 캐시와 source별 snapshot 차이", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {id: recheck-cannot-recover-eligible-recall, type: Tradeoff, label: "최종 재검사는 retrieval에서 잃은 eligible Recall을 복구하지 못함", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {id: availability-evaluation-logging, type: Approach, label: "candidate, slate와 impression의 AvailabilityEvaluation 기록", aliases: ["AvailabilityEvaluation 기록"], evidence: "[[Recommendation-System-Eligibility-Availability#로그와 운영 지표]]"}
  - {id: eligibility-audit-comparison-gap, type: Problem, label: "당시 eligibility 결과의 audit와 정책 변경 전후 비교 불가", evidence: "[[Recommendation-System-Eligibility-Availability#로그와 운영 지표]]"}
  - {id: assignment-logging, type: Approach, label: "실험 Assignment 단위 기록", evidence: "[[Recommendation-System-Feedback-Data#Request, 실험과 후보]]"}
  - {id: itt-srm-unverifiable, type: Problem, label: "ITT 모집단과 SRM 검증 불가", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: request-logging, type: Approach, label: "추천 Request 단위 기록", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: request-replay-incident-analysis-gap, type: Problem, label: "요청별 재현과 장애 분석 불가", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: candidate-logging, type: Approach, label: "추천 Candidate 단위 기록", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: candidate-recall-source-contribution-gap, type: Problem, label: "후보 Recall과 source 기여 분석 불가", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: slate-logging, type: Approach, label: "추천 Slate 단위 기록", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: rerank-position-effect-inseparable, type: Problem, label: "재랭킹과 위치 효과 분리 불가", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: impression-logging, type: Approach, label: "실제 Impression 별도 기록", aliases: ["API response와 실제 impression 분리", "impression 수집"], evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: unexposed-read-as-rejection, type: Problem, label: "미노출을 거절로 오해", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: outcome-logging, type: Approach, label: "지연 Outcome 단위 기록", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: short-term-proxy-only-optimization, type: Problem, label: "단기 proxy만 최적화", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {id: event-source-id-dedup-key, type: Approach, label: "추천 event의 {eventSource, eventId} 중복 키", evidence: "[[Recommendation-System-Feedback-Data#공통 envelope와 인과관계]]"}
  - {id: triggered-analysis, type: Approach, label: "Triggered 분석", aliases: ["triggered effect 분석"], evidence: "[[Recommendation-System-Feedback-Data#Request, 실험과 후보]]"}
  - {id: counterfactual-trigger-both-variants, type: Condition, label: "treatment 영향을 받지 않는 counterfactual trigger의 양 variant 기록", evidence: "[[Recommendation-System-Feedback-Data#Request, 실험과 후보]]"}
  - {id: feedback-event-training-use, type: Approach, label: "로그 event의 추천 학습 입력 사용", evidence: "[[Recommendation-System-Feedback-Data#Impression과 행동]]"}
  - {id: consent-retention-access-defined, type: Condition, label: "수집 전 정한 동의, 목적, 보유 기간, 삭제 전파와 접근 권한 충족", evidence: "[[Recommendation-System-Feedback-Data#Impression과 행동]]"}
  - {id: stable-id-attribution, type: Approach, label: "안정 ID 연결 기반 attribution", evidence: "[[Recommendation-System-Feedback-Data#Impression과 행동]]"}
  - {id: inferred-attribution, type: Approach, label: "시간 창과 사용자 ID만으로 추론한 attribution", evidence: "[[Recommendation-System-Feedback-Data#Impression과 행동]]"}
  - {id: replay-artifacts-retained, type: Condition, label: "replayableUntil까지 replay artifact와 snapshot 보존", evidence: "[[Recommendation-System-Feedback-Data#Audit reconstruction과 decision replay]]"}
  - {id: explicit-feedback, type: Approach, label: "Explicit feedback 신호", aliases: ["명시 피드백"], evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {id: implicit-feedback, type: Approach, label: "Implicit feedback 신호", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {id: explicit-sparsity-input-friction, type: Tradeoff, label: "explicit 신호의 희소성과 입력 마찰", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {id: feedback-selection-bias, type: Tradeoff, label: "자발적 피드백 신호의 Selection bias", aliases: ["평가와 찜 신호의 자기선택 편향"], evidence: "[[Recommendation-System-Feedback-Data#Selection bias]]"}
  - {id: implicit-signal-confounding, type: Tradeoff, label: "implicit 신호에 위치, UI, 상황, 실수와 목적이 섞임", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {id: implicit-volume-as-preference-strength, type: Problem, label: "implicit 행동량을 선호 강도로 해석", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {id: implicit-mf-confidence, type: Approach, label: "Implicit MF의 행동량 confidence 해석", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {id: unobserved-negative-distinction, type: Approach, label: "미관측과 부정 신호 구분", evidence: "[[Recommendation-System-Feedback-Data#미관측과 부정 신호를 구분한다]]"}
  - {id: label-observation-window, type: Approach, label: "Label 관측 시간 창", evidence: "[[Recommendation-System-Feedback-Data#Label 정의에는 시간 창이 필요하다]]"}
  - {id: premature-negative-label, type: Problem, label: "window 종료 전 negative 확정에 따른 delayed positive 오염", evidence: "[[Recommendation-System-Feedback-Data#Label 정의에는 시간 창이 필요하다]]"}
  - {id: position-logging-and-modeling, type: Approach, label: "노출 위치 기록과 모델 또는 실험 설계의 위치 효과 처리", evidence: "[[Recommendation-System-Feedback-Data#Position bias]]"}
  - {id: random-split, type: Approach, label: "Random split", aliases: ["Interaction row 단위 무작위 분할"], evidence: "[[Recommendation-System-Feedback-Data#학습 데이터 생성]]"}
  - {id: temporal-split, type: Approach, label: "Temporal split", aliases: ["시간 순서 분할"], evidence: "[[Recommendation-System-Feedback-Data#학습 데이터 생성]]"}
  - {id: off-policy-evaluation, type: Approach, label: "Off-policy 평가(OPE)", aliases: ["OPE", "off-policy 평가"], evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {id: selection-time-propensity-logging, type: Condition, label: "정책이 slate를 선택한 시점에 기록해 Impression과 별도로 연결한 propensity", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {id: served-slate-valid-propensity, type: Condition, label: "실제 servedSlateId와 일치하는 VALID propensity", aliases: ["실제 served action의 정확한 logging propensity", "Propensity correctness"], evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {id: ope-not-experiment-replacement, type: Tradeoff, label: "Off-policy estimator는 실험을 완전히 대체하지 않음", aliases: ["OPE는 무작위 온라인 실험을 대체하지 못함"], evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {id: deterministic-policy-logs, type: Approach, label: "Deterministic 정책 로그", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {id: unobserved-region-effect-unidentifiable, type: Tradeoff, label: "Deterministic 정책 로그만으로는 관측하지 않은 영역의 인과 효과를 식별할 수 없음", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {id: personalize-implicit-impressions, type: Approach, label: "Amazon Personalize recommendationId 기반 implicit impressions", evidence: "[[Recommendation-System-Feedback-Data#관리형 추천에도 이벤트 의미를 명시한다]]"}
  - {id: personalize-explicit-impressions, type: Approach, label: "Amazon Personalize impression 목록 직접 전달", aliases: ["Amazon Personalize explicit impressions"], evidence: "[[Recommendation-System-Feedback-Data#관리형 추천에도 이벤트 의미를 명시한다]]"}
  - {id: personalize-impressions-supported-config, type: Condition, label: "Amazon Personalize의 impressions 지원 구성", evidence: "[[Recommendation-System-Feedback-Data#관리형 추천에도 이벤트 의미를 명시한다]]"}
  - {id: implicit-impressions-not-client-visibility, type: Tradeoff, label: "Amazon Personalize implicit impressions는 클라이언트의 실제 가시성 측정이 아님", evidence: "[[Recommendation-System-Feedback-Data#관리형 추천에도 이벤트 의미를 명시한다]]"}
  - {id: sensitive-attribute-use, type: Approach, label: "민감 속성의 수집과 활용", evidence: "[[Recommendation-System-Feedback-Data#데이터 품질과 개인정보 운영]]"}
  - {id: legitimate-purpose-and-access-control, type: Condition, label: "정당한 목적과 접근 통제", evidence: "[[Recommendation-System-Feedback-Data#데이터 품질과 개인정보 운영]]"}
ontology_relations:
  - {subject: "concept:universal-surface-constraint-separation", predicate: addresses, target: "concept:surface-dependent-eligibility", evidence: "[[Recommendation-System-Eligibility-Availability#추천 자격 조건과 가용성]]"}
  - {subject: "concept:subscription-availability-hard-constraint", predicate: alternative_to, target: "concept:subscription-availability-as-feature-badge", evidence: "[[Recommendation-System-Eligibility-Availability#보편 제약과 surface 제약]]"}
  - {subject: "concept:offer-level-availability-input", predicate: addresses, target: "concept:provider-name-only-availability", evidence: "[[Recommendation-System-Eligibility-Availability#Offer 단위 가용성 입력]]"}
  - {subject: "concept:direct-watch-cta", predicate: requires, target: "concept:verified-deeplink", evidence: "[[Recommendation-System-Eligibility-Availability#상태 판정표]]"}
  - {subject: "concept:direct-watch-cta", predicate: requires, target: "concept:offer-not-ended", evidence: "[[Recommendation-System-Eligibility-Availability#상태 판정표]]"}
  - {subject: "concept:direct-watch-cta", predicate: requires, target: "concept:stale-offer-bounded-refresh-success", evidence: "[[Recommendation-System-Eligibility-Availability#상태 판정표]]"}
  - {subject: "concept:deferred-availability-evaluation", predicate: requires, target: "concept:resolved-before-slate", evidence: "[[Recommendation-System-Eligibility-Availability#공유 AvailabilityEvaluation]]"}
  - {subject: "concept:retrieval-filter-pushdown", predicate: addresses, target: "concept:post-topk-filter-underfill", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {subject: "concept:bounded-overfetch-adaptive-retry", predicate: addresses, target: "concept:post-topk-filter-underfill", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {subject: "concept:retrieval-filter-pushdown", predicate: alternative_to, target: "concept:bounded-overfetch-adaptive-retry", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {subject: "concept:final-eligibility-recheck", predicate: addresses, target: "concept:stale-cache-and-snapshot-drift", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {subject: "concept:final-eligibility-recheck", predicate: has_tradeoff, target: "concept:recheck-cannot-recover-eligible-recall", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {subject: "concept:resample-policy-with-new-id", predicate: addresses, target: "concept:late-recheck-changes-sampled-slate", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {subject: "concept:exclude-request-from-ope", predicate: addresses, target: "concept:late-recheck-changes-sampled-slate", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {subject: "concept:resample-policy-with-new-id", predicate: alternative_to, target: "concept:exclude-request-from-ope", evidence: "[[Recommendation-System-Eligibility-Availability#Retrieval과 최종 재검사]]"}
  - {subject: "concept:availability-evaluation-logging", predicate: addresses, target: "concept:eligibility-audit-comparison-gap", evidence: "[[Recommendation-System-Eligibility-Availability#로그와 운영 지표]]"}
  - {subject: "concept:assignment-logging", predicate: addresses, target: "concept:itt-srm-unverifiable", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {subject: "concept:request-logging", predicate: addresses, target: "concept:request-replay-incident-analysis-gap", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {subject: "concept:candidate-logging", predicate: addresses, target: "concept:candidate-recall-source-contribution-gap", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {subject: "concept:slate-logging", predicate: addresses, target: "concept:rerank-position-effect-inseparable", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {subject: "concept:impression-logging", predicate: addresses, target: "concept:unexposed-read-as-rejection", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {subject: "concept:outcome-logging", predicate: addresses, target: "concept:short-term-proxy-only-optimization", evidence: "[[Recommendation-System-Feedback-Data#관측 단위를 분리한다]]"}
  - {subject: "concept:event-source-id-dedup-key", predicate: requires, target: "concept:same-key-reuse-on-retry", evidence: "[[Recommendation-System-Feedback-Data#공통 envelope와 인과관계]]"}
  - {subject: "concept:event-source-id-dedup-key", predicate: requires, target: "concept:new-key-per-intended-operation", evidence: "[[Recommendation-System-Feedback-Data#공통 envelope와 인과관계]]"}
  - {subject: "concept:triggered-analysis", predicate: requires, target: "concept:counterfactual-trigger-both-variants", evidence: "[[Recommendation-System-Feedback-Data#Request, 실험과 후보]]"}
  - {subject: "concept:stochastic-logging-policy", predicate: requires, target: "concept:fixed-action-space-after-hard-eligibility", evidence: "[[Recommendation-System-Feedback-Data#Ranking과 Slate]]"}
  - {subject: "concept:feedback-event-training-use", predicate: requires, target: "concept:consent-retention-access-defined", evidence: "[[Recommendation-System-Feedback-Data#Impression과 행동]]"}
  - {subject: "concept:stable-id-attribution", predicate: alternative_to, target: "concept:inferred-attribution", evidence: "[[Recommendation-System-Feedback-Data#Impression과 행동]]"}
  - {subject: "concept:page-decision-replay", predicate: requires, target: "concept:replay-artifacts-retained", evidence: "[[Recommendation-System-Feedback-Data#Audit reconstruction과 decision replay]]"}
  - {subject: "concept:explicit-feedback", predicate: has_tradeoff, target: "concept:explicit-sparsity-input-friction", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {subject: "concept:explicit-feedback", predicate: has_tradeoff, target: "concept:feedback-selection-bias", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {subject: "concept:implicit-feedback", predicate: has_tradeoff, target: "concept:implicit-signal-confounding", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {subject: "concept:implicit-mf-confidence", predicate: addresses, target: "concept:implicit-volume-as-preference-strength", evidence: "[[Recommendation-System-Feedback-Data#Explicit와 implicit feedback]]"}
  - {subject: "concept:unobserved-negative-distinction", predicate: addresses, target: "concept:unexposed-read-as-rejection", evidence: "[[Recommendation-System-Feedback-Data#미관측과 부정 신호를 구분한다]]"}
  - {subject: "concept:label-observation-window", predicate: addresses, target: "concept:premature-negative-label", evidence: "[[Recommendation-System-Feedback-Data#Label 정의에는 시간 창이 필요하다]]"}
  - {subject: "concept:position-logging-and-modeling", predicate: addresses, target: "concept:position-bias", evidence: "[[Recommendation-System-Feedback-Data#Position bias]]"}
  - {subject: "concept:explicit-feedback", predicate: has_tradeoff, target: "concept:feedback-selection-bias", evidence: "[[Recommendation-System-Feedback-Data#Selection bias]]"}
  - {subject: "concept:point-in-time-feature-join", predicate: addresses, target: "concept:future-information-leakage", evidence: "[[Recommendation-System-Feedback-Data#학습 데이터 생성]]"}
  - {subject: "concept:temporal-split", predicate: alternative_to, target: "concept:random-split", evidence: "[[Recommendation-System-Feedback-Data#학습 데이터 생성]]"}
  - {subject: "concept:attribution-window-purge-gap", predicate: alternative_to, target: "concept:censoring-delayed-feedback-estimator", evidence: "[[Recommendation-System-Feedback-Data#학습 데이터 생성]]"}
  - {subject: "concept:off-policy-evaluation", predicate: requires, target: "concept:selection-time-propensity-logging", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {subject: "concept:off-policy-evaluation", predicate: requires, target: "concept:served-slate-valid-propensity", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {subject: "concept:off-policy-evaluation", predicate: requires, target: "concept:logging-policy-support", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {subject: "concept:ips-estimator", predicate: has_tradeoff, target: "concept:large-importance-weight-variance", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {subject: "concept:off-policy-evaluation", predicate: has_tradeoff, target: "concept:ope-not-experiment-replacement", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {subject: "concept:resample-policy-with-new-id", predicate: addresses, target: "concept:late-recheck-changes-sampled-slate", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {subject: "concept:exclude-request-from-ope", predicate: addresses, target: "concept:late-recheck-changes-sampled-slate", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {subject: "concept:deterministic-policy-logs", predicate: has_tradeoff, target: "concept:unobserved-region-effect-unidentifiable", evidence: "[[Recommendation-System-Feedback-Data#Propensity와 Off-policy 데이터]]"}
  - {subject: "concept:personalize-implicit-impressions", predicate: alternative_to, target: "concept:personalize-explicit-impressions", evidence: "[[Recommendation-System-Feedback-Data#관리형 추천에도 이벤트 의미를 명시한다]]"}
  - {subject: "concept:personalize-implicit-impressions", predicate: requires, target: "concept:personalize-impressions-supported-config", evidence: "[[Recommendation-System-Feedback-Data#관리형 추천에도 이벤트 의미를 명시한다]]"}
  - {subject: "concept:personalize-explicit-impressions", predicate: requires, target: "concept:personalize-impressions-supported-config", evidence: "[[Recommendation-System-Feedback-Data#관리형 추천에도 이벤트 의미를 명시한다]]"}
  - {subject: "concept:personalize-implicit-impressions", predicate: has_tradeoff, target: "concept:implicit-impressions-not-client-visibility", evidence: "[[Recommendation-System-Feedback-Data#관리형 추천에도 이벤트 의미를 명시한다]]"}
  - {subject: "concept:sensitive-attribute-use", predicate: requires, target: "concept:legitimate-purpose-and-access-control", evidence: "[[Recommendation-System-Feedback-Data#데이터 품질과 개인정보 운영]]"}
---

# 추천시스템 온톨로지 선언: 피드백 데이터와 가용성

피드백 이벤트 계약, 편향과 eligibility 판정에 대한 개념 64개와 타입 관계 53개를 선언한다. 본문 지식은 여기에 두지 않고, 각 선언의 `evidence`가 가리키는 원문 섹션이 근거다.

선언은 `ontology/candidates/recommendation-system-*.jsonl`에서 원문 대조 검증을 통과한 후보만 옮긴 것이다. 새 선언은 후보 파일에 먼저 추가해 검증한 뒤 한 줄로 옮기고, 원문 heading이 바뀌면 `evidence`를 함께 고친다.

상위: [[Ontology-Instances]]
