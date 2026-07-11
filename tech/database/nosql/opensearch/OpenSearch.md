---
tags: [database, search, opensearch, lucene, inverted-index]
status: index
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch", "검색 엔진", "역색인"]
---

# OpenSearch 심화 인덱스

Apache Lucene을 분산 실행 계층으로 감싼 검색 및 분석 엔진. JSON 문서를 샤드별 Lucene 인덱스에 저장하고, 역색인과 `doc_values`로 전문 검색, 필터, 정렬, 집계를 처리한다.

> 핵심 범위: 전통적인 키워드 검색과 운영. 벡터와 하이브리드는 아래 확장 주제로 분리한다.

## 학습 순서

- [[OpenSearch-Architecture|1. 아키텍처와 분산 실행 모델]]
- [[OpenSearch-Indexing-Internals|2. 색인, 복제, refresh, flush, merge]]
- [[OpenSearch-Mapping-Text-Analysis|3. 매핑과 텍스트 분석]]
- [[OpenSearch-Korean-Text-Analysis|3A. 한국어 Nori, 사용자 사전과 동의어]]
- [[OpenSearch-Query-Relevance|4. 렉시컬 검색, Query DSL과 BM25 관련도]]
- [[OpenSearch-Search-Features|5. 자동완성, Highlight, Agentic Search, 응답 제어]]
- [[OpenSearch-Aggregations-Pagination|6. 집계, 정렬, 페이지네이션]]
- [[OpenSearch-Index-Lifecycle|7. Bulk, Pipeline, Alias, Data Stream, ISM]]
- [[OpenSearch-Cluster-Reliability|8. 클러스터 운영과 복구]]
- [[OpenSearch-Performance-Troubleshooting|9. 성능 진단과 장애 대응]]
- [[OpenSearch-Security-Production|10. 보안과 프로덕션 체크리스트]]

## 확장 주제

- [[OpenSearch-Hybrid-Search|렉시컬과 시맨틱 결과의 normalization과 RRF]]
- [[OpenSearch-Vector-Search|OpenSearch k-NN과 embedding pipeline]]
- [[OpenSearch-Observability|Amazon OpenSearch 통합 관측성과 AI 장애 조사]]
- [[Centralized-Logging-with-OpenSearch|AWS Centralized Logging with OpenSearch]]

## 출처

- [OpenSearch Documentation - OpenSearch Project](https://docs.opensearch.org/latest/about/)
- [OpenSearch 내부 구조 참고 영상 - YouTube](https://www.youtube.com/watch?v=J2uEQrCE2Hs)
