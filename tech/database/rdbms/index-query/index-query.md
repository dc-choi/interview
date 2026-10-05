---
tags: [database, rdbms, index, query, performance]
status: index
category: "Database - RDBMS"
aliases: ["Index & Query", "인덱스와 쿼리"]
---

# 인덱스와 쿼리 (Index & Query)

인덱스 설계와 쿼리 성능 문서 모음. B-Tree 구조부터 실행 계획, 페이징 최적화까지.

- [[Index|Index design (B-Tree, hash 인덱스와의 차이, covering index)]]
- [[Oracle-Index-Features|Oracle index 기능 (function-based, descending, bitmap, invisible, rebuild)]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이 분석 (InnoDB 페이지, fan-out 실측, 페이지 분할과 병합, PK 사이즈, hash 인덱스와 비교)]]
- [[Covering-Index|커버링 인덱스 (Using index, 랜덤 I/O 제거, index extension, 단계별 실측)]]
- [[Index-Composite-Design|복합 인덱스 설계 (정렬 구조, 등호 앞 범위 뒤, filesort, OR 조건과 Index Merge, IN 목록 전환, 최소 인덱스 묶기, 추가 전 판단)]]
- [[Execution-Plan|실행 계획 폴더 (명령 구분과 진단 흐름, MySQL EXPLAIN과 key_len, EXPLAIN ANALYZE 숫자 읽기, PostgreSQL 계획과 pg_stats)]]
- [[Pagination-Optimization|페이징 성능 최적화 (OFFSET과 지연 조인, DBMS별 keyset 조건, 두 단계 조회의 checkpoint, 페이지 안의 불변식, 범위 batch, COUNT 계약과 상한 COUNT)]]
- [[Sorting-Operations|정렬이 발생하는 5가지 연산]]
- [[Prepared-Statement-Cache|Prepared Statement와 캐시 경계 (session 범위, 서버 사이드 준비의 이득 조건, mysql2 LRU, PostgreSQL plan 재사용, 동적 SQL shape)]]
- [[Spatial-Index-MySQL|공간 데이터, 공간 색인 (GIS 함수, R-Tree, H3 격자 — 쿠팡 사례)]]
- [[Index-Write-Cost-and-Cleanup|인덱스의 쓰기 비용과 정리 (쓰기 증폭, InnoDB PK 포함 구조, HOT, sorted index build, 미사용과 중복 인덱스, Invisible Index 제거 절차, 크기 재기)]]
