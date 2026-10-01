---
tags: [database, rdbms, mysql, postgresql, query-plan, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["실행 계획 기본", "EXPLAIN vs EXPLAIN ANALYZE", "실행 계획 명령 구분"]
verified_at: 2026-09-30
---

# 실행 계획 기본: 명령 구분과 진단 흐름

실행 계획은 옵티마이저가 통계로 고른 접근 경로와 그 근거가 된 추정치다. 계획 모양만으로 성능을 판정하지 않고, 추정과 실측이 어디서 갈라지는지 찾는 도구로 쓴다. DBMS별 출력 읽기는 [[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]], [[Execution-Plan-MySQL-EXPLAIN-ANALYZE|MySQL EXPLAIN ANALYZE 숫자 읽기]], [[Execution-Plan-PostgreSQL|PostgreSQL 실행 계획과 planner 통계]]에서 다룬다.

## `EXPLAIN`, 통계 수집, `EXPLAIN ANALYZE` 차이

DB 튜닝의 첫 단계는 세 명령어를 정확히 구분해서 쓰는 것.

| 명령 | DBMS | 동작 | 용도 |
|---|---|---|---|
| `EXPLAIN` | MySQL, PostgreSQL | 실행하지 않고 예상 계획 표시 | 튜닝의 첫 단계 |
| `ANALYZE TABLE t` | MySQL | optimizer 통계 갱신 | 분포가 크게 바뀐 뒤 |
| `ANALYZE t` | PostgreSQL | 표본을 수집해 planner 통계 갱신 | 대량 적재나 분포 변화 뒤 |
| `EXPLAIN ANALYZE` | MySQL, PostgreSQL | 문장을 실제 실행하고 실측값 표시 | 추정과 실측의 괴리 확인 |

PostgreSQL에서는 `EXPLAIN (ANALYZE, BUFFERS)`로 cache hit, read와 temp I/O를 함께 본다. PostgreSQL 18부터는 `ANALYZE` 옵션이 `BUFFERS`를 함께 켜므로, 버퍼 정보를 빼려면 `BUFFERS OFF`를 명시한다. 이 명령은 문장을 실제 실행하므로 DML에는 실제 부작용이 생긴다. `BEGIN`과 `ROLLBACK`으로 데이터 변경을 되돌릴 수 있어도 실행 부하까지 사라지는 것은 아니므로, 대표 데이터와 트래픽에서 안전한 환경과 중단 기준을 먼저 정한다.

통계가 최신이어도 표본 기반 추정은 정확한 행 수가 아니다. 무조건 인덱스를 강제하기보다 추정 오차의 원인이 단일 컬럼 분포인지, 여러 컬럼의 상관관계인지, parameter shape인지 좁혀 간다. PostgreSQL에서 이 원인을 들여다보는 `pg_stats`와 extended statistics는 [[Execution-Plan-PostgreSQL#planner 통계 들여다보기|planner 통계 들여다보기]], MySQL의 persistent statistics와 histogram은 [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]에 있다.

## 진단 흐름

1. 실제 느린 문장과 같은 parameter shape, schema, session 설정을 재현한다.
2. `EXPLAIN`으로 접근 방식, 조인 순서와 예상 rows를 읽어 방향을 잡는다. 실행하지 않으므로 안전하다.
3. 의심 구간만 안전한 환경에서 `EXPLAIN ANALYZE`로 실측한다. 가장 먼저 예상 rows와 실제 `rows × loops`가 크게 벌어지는 노드를 찾는다.
4. 통계, 문장, 인덱스, 데이터 분포 중 한 가지씩 고치고 같은 데이터와 같은 workload로 다시 잰다.

## 단일 테이블 컬럼으로 조인 전 필터링

여러 테이블을 조인할 때, 필터 조건을 **조인된 테이블의 컬럼이 아니라 메인 테이블의 동등한 컬럼**으로 옮기면 큰 폭의 성능 향상이 가능하다.

비효율: `WHERE course."id" IN (?)`  — 조인 결과에서 필터링
효율: `WHERE review."course_id" IN (?)` — 조인 전에 필터링

같은 의미인데 후자는 옵티마이저가 **메인 테이블에서 먼저 행을 줄인 뒤** 조인을 수행 → 조인 비용, 메모리 사용 모두 감소. 실제 사례에서 189ms → 18.5ms (약 10배) 개선.

핵심 원리: **조인 술어를 분석해서 동등한 필터 조건을 메인 테이블에 적용**할 수 있는지 항상 검토. 특히 다중 조인, 대용량 데이터셋에서 효과가 크다.

## 출처

- [MySQL 8.4 Reference Manual, EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [PostgreSQL 18 Documentation, EXPLAIN](https://www.postgresql.org/docs/18/sql-explain.html)
- [PostgreSQL 18 Documentation, Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)
- [PostgreSQL 18 Documentation, ANALYZE](https://www.postgresql.org/docs/18/sql-analyze.html)
- [인프런, Hong, 성능지표 및 EXPLAIN](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338542)
- [인프런, 예상과 실제 비교](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471873)
- [요즘IT — 쿼리 튜닝 기초 (EXPLAIN / ANALYZE)](https://yozm.wishket.com/magazine/detail/2260/)
- [jojoldu — 단일 테이블 컬럼을 최대한 활용하기](https://jojoldu.tistory.com/788)

## 관련 문서

- [[Execution-Plan|실행 계획 목차]]
- [[MySQL-Slow-Query-Diagnosis|MySQL Slow Query 진단]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[MySQL-Join-Optimization|MySQL 조인 최적화]]
