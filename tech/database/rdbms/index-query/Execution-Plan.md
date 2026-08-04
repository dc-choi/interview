---
tags: [database, rdbms, mysql, postgresql, query-plan, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["실행계획", "Execution Plan"]
---

# 실행계획

## MySQL traditional `EXPLAIN`

`select_type`은 query block의 관계를 보여 준다. `SIMPLE`은 subquery나 `UNION`이 없는 단순 block, `PRIMARY`는 가장 바깥 block, `SUBQUERY`는 subquery의 첫 SELECT, `DEPENDENT SUBQUERY`는 바깥 row에 의존하는 subquery다. `DERIVED`는 `FROM` 절의 derived table, `MATERIALIZED`는 materialized subquery를 뜻한다.

`type`은 table을 찾는 access type이다. 대략 `system`, `const`, `eq_ref`, `ref`, `range`, `index`, `ALL` 순으로 적은 후보를 읽는 경향이 있지만 성능 등급표는 아니다. `ALL`도 작은 table이나 반환 비율이 큰 query에는 합리적이며, index access도 많은 row lookup을 반복하면 비쌀 수 있다. `index_merge`, `ref_or_null` 같은 다른 access type도 있다.

| 필드 | 해석 |
|---|---|
| `possible_keys` | 후보가 될 수 있는 index |
| `key` | 실제 선택된 index |
| `key_len` | 사용할 수 있는 key byte 수의 단서. nullable key part의 byte도 포함될 수 있음 |
| `ref` | index 탐색에서 비교되는 column 또는 constant |
| `rows` | 조사할 것으로 추정한 행 수 |
| `filtered` | table condition을 통과할 것으로 추정한 비율 |

`rows * filtered / 100`은 다음 table로 전달할 행 수의 근사치다. 모두 통계 기반 추정이며 정확한 실행 횟수가 아니다. `key_len`도 복합 index의 사용 범위를 추론하는 단서일 뿐 빠른 계획을 보장하지 않는다.

### `Extra`를 경고등처럼 읽기

| 표시 | 의미 |
|---|---|
| `Using index` | 필요한 값을 index에서 얻는 covering access |
| `Using index condition` | ICP로 index entry에서 먼저 조건 평가 |
| `Using where` | 읽은 row에 table condition 적용. 그 자체로 설계 결함은 아님 |
| `Using temporary` | internal temporary table 사용 가능성 |
| `Using filesort` | index order 이외의 추가 정렬. disk 정렬이라는 뜻은 아님 |
| `Using MRR` | Multi-Range Read 사용 |

`Using temporary`와 `Using filesort`는 제거 여부를 자동 판정하는 빨간불이 아니다. 입력 rows, memory/disk 사용, 첫 row까지의 시간과 전체 실행 시간을 함께 본다.

## MySQL TREE 계획과 `EXPLAIN ANALYZE`

MySQL `EXPLAIN ANALYZE`는 문장을 실제 실행하고 TREE 형식으로 iterator별 estimated cost/rows와 actual time/rows/loops를 출력한다. traditional 표의 행 순서만으로 실행 순서를 단정하지 말고 자식 iterator가 부모에게 row를 공급하는 관계를 따라간다.

가장 먼저 예상 rows와 `actual rows * loops`가 벌어지는 지점을 찾는다. 오차가 상위 nested loop에서 곱해지면 join 순서나 access type 선택까지 바뀔 수 있다. 고정된 허용 배수보다 전체 계획과 처리량에 미치는 영향을 본다.

`EXPLAIN ANALYZE`는 실제 부하를 만들며 실행 중 `KILL QUERY`로 중단할 수 있다. 운영에서는 대표 데이터가 있는 안전한 환경, 읽기 replica 또는 제한된 시간/자원에서 먼저 측정하고 중단 기준을 정한다.

## PostgreSQL: 계획 노드 읽기

PostgreSQL의 `cost`는 시간이 아니라 planner가 비교하는 임의 단위다. `cost=startup..total`, `rows`, `width`는 모두 추정치이며, `EXPLAIN ANALYZE`의 `actual time`, `rows`, `loops`와 같은 단위가 아니다.

| 노드 | 의미 | 확인할 점 |
|---|---|---|
| `Seq Scan` | 테이블 페이지를 순차 탐색 | 반환 비율이 높다면 인덱스보다 합리적일 수 있음 |
| `Index Scan` | 인덱스로 위치를 찾고 heap 행을 읽음 | `Index Cond`와 heap 접근량 |
| `Index Only Scan` | 가시성 조건이 맞으면 heap 접근을 줄임 | `Heap Fetches`, visibility map |
| `Bitmap Index Scan` + `Bitmap Heap Scan` | 여러 위치를 모아 물리적 페이지 순서로 heap을 읽음 | `Recheck Cond`, 읽은 heap block 수 |
| `Gather` / `Gather Merge` | worker의 병렬 결과를 합침 | worker 수, worker별 실제 행 수와 coordinator 병목 |
| `Sort` | 입력을 정렬 | 정렬 자체보다 메모리 또는 디스크 사용과 입력 행 수 |

`Index Cond`는 인덱스 탐색 범위를 줄이는 조건이고, `Filter`는 읽어 온 행에 나중에 적용하는 조건이다. `Rows Removed by Filter`가 크면 predicate와 인덱스 정의가 맞지 않는지 확인한다. 가장 먼저 볼 숫자는 각 노드의 예상 `rows`와 실제 `rows × loops` 차이다. 큰 차이는 오래된 통계, 상관관계가 반영되지 않은 통계, parameter별 데이터 skew나 잘못된 조건식의 단서가 된다.

함수나 cast가 있다는 이유만으로 인덱스를 절대 사용할 수 없다고 단정하지 않는다. PostgreSQL은 쿼리 식과 일치하는 expression index를 사용할 수 있다. locale 기반 정렬에서 prefix `LIKE`를 지원하려면 `text_pattern_ops` 같은 operator class가 필요할 수 있고, 선행 wildcard 검색은 일반 B-tree 범위 탐색과 맞지 않는다.

## `EXPLAIN`, 통계 수집, `EXPLAIN ANALYZE` 차이

DB 튜닝의 첫 단계는 세 명령어를 정확히 구분해서 쓰는 것.

| 명령 | DBMS | 동작 | 용도 |
|---|---|---|---|
| `EXPLAIN` | MySQL, PostgreSQL | 실행하지 않고 예상 계획 표시 | 튜닝의 첫 단계 |
| `ANALYZE TABLE t` | MySQL | optimizer 통계 갱신 | 분포가 크게 바뀐 뒤 |
| `ANALYZE t` | PostgreSQL | 표본을 수집해 planner 통계 갱신 | 대량 적재나 분포 변화 뒤 |
| `EXPLAIN ANALYZE` | MySQL, PostgreSQL | 문장을 실제 실행하고 실측값 표시 | 추정과 실측의 괴리 확인 |

PostgreSQL에서는 `EXPLAIN (ANALYZE, BUFFERS)`로 cache hit, read와 temp I/O를 함께 본다. 이 명령은 문장을 실제 실행하므로 DML에는 실제 부작용이 생긴다. `BEGIN`과 `ROLLBACK`으로 데이터 변경을 되돌릴 수 있어도 실행 부하까지 사라지는 것은 아니므로, 대표 데이터와 트래픽에서 안전한 환경과 중단 기준을 먼저 정한다.

통계가 최신이어도 표본 기반 추정은 정확한 행 수가 아니다. 무조건 인덱스를 강제하기보다 추정 오차의 원인이 단일 컬럼 분포인지, 여러 컬럼의 상관관계인지, parameter shape인지 좁혀 간다.

## 단일 테이블 컬럼으로 조인 전 필터링

여러 테이블을 조인할 때, 필터 조건을 **조인된 테이블의 컬럼이 아니라 메인 테이블의 동등한 컬럼**으로 옮기면 큰 폭의 성능 향상이 가능하다.

비효율: `WHERE course."id" IN (?)`  — 조인 결과에서 필터링
효율: `WHERE review."course_id" IN (?)` — 조인 전에 필터링

같은 의미인데 후자는 옵티마이저가 **메인 테이블에서 먼저 행을 줄인 뒤** 조인을 수행 → 조인 비용, 메모리 사용 모두 감소. 실제 사례에서 189ms → 18.5ms (약 10배) 개선.

핵심 원리: **조인 술어를 분석해서 동등한 필터 조건을 메인 테이블에 적용**할 수 있는지 항상 검토. 특히 다중 조인, 대용량 데이터셋에서 효과가 크다.

## 출처
- [MySQL 8.4 Reference Manual, EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4 Reference Manual, EXPLAIN Output](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)
- [MySQL 8.4 Reference Manual, Internal Temporary Tables](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html)
- [인프런, Hong, 성능지표 및 EXPLAIN](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338542)
- [인프런, EXPLAIN 기본 사용법](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471859)
- [인프런, rows와 filtered](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471864)
- [인프런, EXPLAIN ANALYZE 실행 통계](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471869)
- [인프런, 예상과 실제 비교](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471873)
- [PostgreSQL 18 Documentation, EXPLAIN](https://www.postgresql.org/docs/18/sql-explain.html)
- [PostgreSQL 18 Documentation, Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)
- [PostgreSQL 18 Documentation, ANALYZE](https://www.postgresql.org/docs/18/sql-analyze.html)
- [PostgreSQL 18 Documentation, Indexes on Expressions](https://www.postgresql.org/docs/18/indexes-expressional.html)
- [PostgreSQL 18 Documentation, Operator Classes](https://www.postgresql.org/docs/18/indexes-opclass.html)
- [PostgreSQL EXPLAIN과 인덱스 성능 비교 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=439101)
- [데이터베이스 성능 최적화 패턴 1 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=439102)
- [데이터베이스 성능 최적화 패턴 2 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=439103)
- [요즘IT — 쿼리 튜닝 기초 (EXPLAIN / ANALYZE)](https://yozm.wishket.com/magazine/detail/2260/)
- [jojoldu — 단일 테이블 컬럼을 최대한 활용하기](https://jojoldu.tistory.com/788)

## 관련 문서
- [[Index]]
- [[SQL]]
- [[Covering-Index|커버링 인덱스]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
- [[MySQL-Query-Pipeline-and-Sorting|MySQL 파이프라인과 정렬]]
