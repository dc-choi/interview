---
tags: [database, search, opensearch, query, ranking, index]
status: index
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Query Index", "OpenSearch 쿼리 폴더 인덱스"]
---

# OpenSearch 쿼리 폴더 인덱스

검색어가 query로 해석되고 점수가 계산되어 순위가 조정되기까지를 다룬다.

- [[OpenSearch-Query-Relevance|Query DSL과 관련도]] — term-level과 full-text, query와 filter context, BM25
- [[OpenSearch-Query-Relevance-Compound|bool과 dis_max]] — clause별 논리와 점수, minimum_should_match 함정, `_name` 디버깅, 중첩 bool과 dis_max 비교
- [[OpenSearch-Query-Understanding|쿼리 이해]] — 오타 교정, 초성 검색과 검색어 전처리
- [[OpenSearch-Query-Requirement-Classification|검색 요구사항 분류]] — 별칭, 서수, 엔티티, 부분일치와 의미 연관을 구현 전에 구분
- [[OpenSearch-Relevance-Tuning|랭킹 튜닝]] — function_score, rescore와 LTR 판단

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
