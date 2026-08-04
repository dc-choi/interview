---
tags: [database, rdbms, index, query, performance]
status: index
category: "Database - RDBMS"
aliases: ["Index & Query", "인덱스와 쿼리"]
---

# 인덱스와 쿼리 (Index & Query)

인덱스 설계와 쿼리 성능 문서 모음. B-Tree 구조부터 실행 계획, 페이징 최적화까지.

- [[Index|Index design (B-Tree, covering index)]]
- [[Oracle-Index-Features|Oracle index 기능 (function-based, descending, bitmap, invisible, rebuild)]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이 분석 (InnoDB 페이지, PK 사이즈, 1억 건도 깊이 4)]]
- [[Covering-Index|커버링 인덱스 (Using index, 랜덤 I/O 제거, ORDER BY 인덱스 매칭)]]
- [[Execution-Plan|Execution plan, EXPLAIN/ANALYZE/EXPLAIN ANALYZE, 단일 테이블 필터 활용]]
- [[Pagination-Optimization|페이징 성능 최적화 (OFFSET, keyset cursor, 범위 batch, COUNT 계약)]]
- [[Sorting-Operations|정렬이 발생하는 5가지 연산]]
- [[Prepared-Statement-Cache|Prepared Statement와 캐시 경계 (session 범위, mysql2 LRU, 동적 SQL shape)]]
- [[Spatial-Index-MySQL|공간 데이터, 공간 색인 (GIS 함수, R-Tree, H3 격자 — 쿠팡 사례)]]
