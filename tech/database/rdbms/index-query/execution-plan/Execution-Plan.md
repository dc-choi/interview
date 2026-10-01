---
tags: [database, rdbms, mysql, postgresql, query-plan, performance]
status: index
category: "Data & Storage - RDB"
aliases: ["실행계획", "Execution Plan"]
---

# 실행계획

실행 계획은 옵티마이저가 고른 접근 경로와 그 근거가 된 추정치를 보여 준다. 명령의 차이와 진단 흐름을 먼저 잡고 DBMS별 출력 읽기로 내려간다.

## 목차

1. [[Execution-Plan-Basics|실행 계획 기본]]: `EXPLAIN`, 통계 수집, `EXPLAIN ANALYZE`의 구분, 진단 흐름, 조인 전 필터링
2. [[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]]: 읽는 순서, access type 조건, `possible_keys`와 `key`의 불일치, `key_len` 계산, `ref=func`, `Extra`
3. [[Execution-Plan-MySQL-EXPLAIN-ANALYZE|MySQL EXPLAIN ANALYZE 숫자 읽기]]: actual time과 loops, 자기 시간, 파이프라인과 blocking, TREE 표식, 병목 좁히기
4. [[Execution-Plan-PostgreSQL|PostgreSQL 실행 계획과 planner 통계]]: 계획 노드, cost 숫자, 병렬 계획, InitPlan과 SubPlan, `pg_stats`와 extended statistics

## 함께 볼 문서

- [[index-query|인덱스와 쿼리 폴더 인덱스]]
- [[Index|인덱스]], [[Covering-Index|커버링 인덱스]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]], [[MySQL-Query-Pipeline-and-Sorting|MySQL 파이프라인과 정렬]], [[MySQL-Join-Optimization|MySQL 조인 최적화]]
- [[MySQL-Slow-Query-Diagnosis|MySQL Slow Query 진단]], [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
