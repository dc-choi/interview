---
tags: [fit, seminar, meetups, opensearch]
status: done
verified_at: 2026-07-16
category: "Seminar - 밋업"
aliases: ["OpenSearch Seoul Meetup 검색 품질과 운영 질문"]
---

# 검색 품질과 운영 심화 질문 5개

> [[OpenSearch-Seoul-Meetup-2026-08-11|전체 질문 한눈에 보기]]
>
> 질문 4~8은 발표 내용을 이해하는 체크리스트로 사용하고, 관련 내용을 공부했거나 대화가 자연스럽게 이어질 때만 묻는다.

<a id="q4"></a>
## 4. 여러 writer가 같은 검색 문서를 갱신할 때 정합성을 어떻게 보장하는가

- **우선 대상:** 두 발표자
- **핵심 질문:** 서로 다른 writer가 한 OpenSearch 문서의 각기 다른 필드를 부분 갱신한다면, 전역 `updated_at` 하나와 field별 소유권이나 version 가운데 어떤 모델이 실전에서 안전했나요?
- **좋은 답의 신호:** 필드 소유권, 멱등 scripted upsert, 충돌 탐지, retry/DLQ와 reconciliation의 책임 경계가 나온다.
- **꼬리 질문:** durable queue를 제거한다면 어떤 drift 지표와 복구 시간 상한이 필요할까요?
- **학습 정본:** [[OpenSearch-Indexing-Pipeline-Reliability|OpenSearch 색인 파이프라인 신뢰성]]

<a id="q5"></a>
## 5. OpenSearch 장애가 사용자 요청으로 전파되지 않게 하는 기준은 무엇인가

- **우선 대상:** 두 발표자
- **핵심 질문:** 사용자 대면 검색 API에서 hard deadline, retry budget, circuit breaker와 fallback을 어떤 SLO 기준으로 정하셨나요?
- **좋은 답의 신호:** 전체 요청 예산 안의 deadline, 제한된 재시도, load shedding과 기능별 degrade 메뉴가 나온다.
- **꼬리 질문:** 어떤 오류는 retry하고 어떤 오류는 즉시 fallback하시나요?
- **학습 정본:** [[OpenSearch-Search-API-Layer|OpenSearch 검색 API 서비스 계층]]

<a id="q6"></a>
## 6. 한국어 검색 analyzer 변경을 어떤 회귀 세트로 검증하는가

- **우선 대상:** 당근 검색서비스 엔지니어
- **핵심 질문:** 초성, 음소, ngram, 유의어를 함께 쓰는 한국어 검색에서 analyzer나 정규화를 바꿀 때 골든쿼리를 어떤 범주로 구성하고 어떤 기준으로 배포를 막으셨나요?
- **좋은 답의 신호:** query slice 구성법, `_analyze` 계약 테스트, relevance judgment와 zero-result 회귀 기준이 나온다.
- **꼬리 질문:** Nori와 직접 만든 초성/음소 필드를 선택하는 판단 기준은 무엇이었나요?
- **학습 정본:** [[OpenSearch-Korean-Text-Analysis|OpenSearch 한국어 텍스트 분석과 사전 운영]]

<a id="q7"></a>
## 7. 인기 신호가 텍스트 관련도를 덮지 않게 어떻게 조정하는가

- **우선 대상:** 당근 검색서비스 엔지니어
- **핵심 질문:** BM25, 완전일치, 인기도를 함께 점수에 넣을 때 인기작이 관련도를 압도하지 않도록 어떤 함수와 상한을 사용하고, 그 선택을 어떤 실험으로 검증하셨나요?
- **좋은 답의 신호:** `log1p`, `max_boost`, query별 judgment, A/B 또는 interleaving 사례가 나온다.
- **꼬리 질문:** exact match 우선과 인기작 우선이 충돌할 때 제품과 어떤 기준을 합의하셨나요?
- **학습 정본:** [[OpenSearch-Relevance-Tuning|OpenSearch 관련도 튜닝 실전]]

<a id="q8"></a>
## 8. 무중단 rebuild와 rollback의 일관된 경계를 어떻게 잡는가

- **우선 대상:** 두 발표자
- **핵심 질문:** DB snapshot, event stream의 watermark, 이벤트 밖에서 실행되는 batch writer가 함께 있을 때 새 index의 backfill과 delta catch-up 경계를 어떻게 맞추고, rollback용 reverse delta는 어떻게 보존하셨나요?
- **좋은 답의 신호:** target-aware writer, 명시적 watermark, 격리 backfill, final reconciliation, rollback drill이 나온다.
- **꼬리 질문:** 문서 수 외에 missing/stale, field 충족률, bulk item 실패와 golden query를 어떤 cutover gate로 쓰셨나요?
- **학습 정본:** [[OpenSearch-Index-Lifecycle|OpenSearch 인덱스 수명주기]]

## 출처

- [Update Document API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/update-document/)
- [Search settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/search-settings/)
- [Circuit breaker pattern - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html)
- [Analyze API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/analyze-apis/)
- [Function score - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/compound/function-score/)
- [Ranking Evaluation API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/rank-eval/)
- [Index aliases - OpenSearch Documentation](https://docs.opensearch.org/latest/im-plugin/index-alias/)
- [Reindex Documents API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/reindex/)
