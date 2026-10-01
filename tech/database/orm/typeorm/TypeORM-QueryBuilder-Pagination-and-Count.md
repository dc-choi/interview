---
tags: [database, orm, typeorm, query-builder, pagination, count, performance]
status: done
verified_at: 2026-09-30
category: "Database - ORM"
aliases: ["TypeORM take skip SQL", "TypeORM getCount COUNT DISTINCT", "TypeORM 페이지네이션과 count"]
---

# TypeORM take/skip과 count가 만드는 SQL

join이 있는 목록에 `take`/`skip`을 쓰거나 `getCount()`, `getManyAndCount()`, `findAndCount()`로 총계를 구하면 TypeORM은 작성한 query와 모양이 다른 SQL을 만든다. 결과 의미를 지키려는 설계지만 비용이 숨어 있다. ORM을 쓰면 개발자가 모르는 사이 `COUNT(DISTINCT ...)`가 나가 `COUNT(*)`와 큰 성능 차이를 낼 수 있으므로, 생성 SQL을 로그와 실행 계획으로 한 번씩 확인한 뒤 배포한다. 아래 경로는 TypeORM `1.1.0`과 `1.1.1` 태그의 `SelectQueryBuilder.ts`에서 확인했다. 결과 grain과 pagination 선택 기준은 [[TypeORM-QueryBuilder|TypeORM QueryBuilder]]를 따른다.

## join과 take/skip은 두 단계 query가 된다

`skip` 또는 `take`가 있고 join이 하나라도 있으면(중복이 생길 수 없는 to-one join만 있어도) 다음 두 query를 보낸다.

```text
1단계: SELECT DISTINCT distinctAlias.<PK 별칭> AS ids_<alias>_<pk>, <정렬 컬럼>
       FROM (<ORDER BY를 뺀 원래 query 전체>) distinctAlias
       ORDER BY <사용자 정렬, PK가 없으면 PK ASC 추가>
       LIMIT <take> OFFSET <skip>
2단계: <원래 query> AND <alias>.<pk> IN (<1단계 ID 목록>)
```

- parent 단위로 페이지를 자르기 위한 구조다. raw `limit`/`offset`은 join row 단위로 잘라 parent가 잘리거나 중복된다.
- 사용자 정렬에 PK가 없으면 PK `ASC`가 덧붙는다. `createdAt DESC`만 정렬하면 `createdAt DESC, id ASC`가 되어 `(created_at DESC, id DESC)` 같은 인덱스 방향과 어긋날 수 있으므로 정렬에 PK를 원하는 방향으로 명시한다.
- 1단계는 조건에 맞는 join 결과 전체를 파생 테이블로 만든 뒤 중복을 제거하고 정렬해야 할 수 있다. 이러면 인덱스 순서를 따라 `LIMIT`에서 조기 종료하는 계획을 쓰지 못하고, `EXPLAIN`에 temporary table과 filesort가 나타날 수 있다.
- 2단계는 ID 목록의 parent와 조건에 맞는 child row를 모두 읽는다. 숫자 PK면 ID를 parameter 대신 SQL 문자열에 직접 넣는다.

## count의 SQL은 세 갈래다

`getCount()`와 `getManyAndCount()`의 count query는 원래 query를 복제해 `ORDER BY`, `GROUP BY`, `OFFSET`/`LIMIT`, `skip`/`take`를 지우고 SELECT를 count 식으로 바꾼다. `GROUP BY`도 지워지므로 group 단위 총계가 필요하면 별도 query로 센다. count 식은 다음 순서로 정해진다.

| 조건 | count 식 |
|---|---|
| FindOptions `select`가 있음 (1.1.0부터) | 고른 column들의 `COUNT(DISTINCT ...)` |
| select가 없고 join과 relation id 로드도 없음 | `COUNT(1)` |
| join이 있음 | main alias PK의 `COUNT(DISTINCT ...)` |

PostgreSQL 계열은 `COUNT(DISTINCT(a, b))`, MySQL 계열은 `COUNT(DISTINCT a, b)` 형태다. join이 있으면 row 증폭을 되돌리려고 PK 중복을 제거하므로 `COUNT(*)`보다 무거워진다.

### 1.1.0의 select 기반 distinct count

1.1.0에 들어간 변경(PR #11965)으로 FindOptions에 `select`가 있으면 count가 고른 column으로 distinct를 센다. 공식 PR 예시에서 `repo.count({ select: { name: true } })`는 행 수가 아니라 고유 `name` 수를 돌려준다. `findAndCount`도 같은 count 경로를 탄다. 이때 count 식에는 사용자가 고른 column만 들어가고 PK는 자동으로 추가되지 않는다. PK는 entity hydration용 SELECT를 만들 때만 virtual column으로 붙는다.

- 목록 API의 `findAndCount({ select, relations, skip, take })`에서 select에 PK가 없으면 총계가 행 수가 아니라 선택 column 조합의 고유 수가 될 수 있다.
- MySQL의 다중 인자 `COUNT(DISTINCT a, b)`는 NULL이 들어간 조합을 세지 않는다. nullable column이나 LEFT JOIN relation column을 select하면 총계가 더 줄 수 있다.
- 두 영향은 소스와 MySQL 문서로 추론한 위험이다. 0.3.x나 1.0에서 올릴 때는 select를 쓰는 count 호출마다 실제 행 수와 비교하는 재현 테스트를 먼저 둔다.

## 운영 점검

1. query log에서 1단계 DISTINCT 선조회, 2단계 본문 조회, count query를 각각 찾는다.
2. 각 query를 `EXPLAIN ANALYZE`로 보고 temporary table, filesort, 읽은 행 수를 확인한다([[Execution-Plan-MySQL-EXPLAIN-ANALYZE|MySQL EXPLAIN ANALYZE 숫자 읽기]]).
3. parent 단위 목록이면 parent ID를 먼저 keyset이나 offset으로 찾고 relation은 따로 로드하는 방식을 비교한다([[Pagination-Optimization#키 탐색과 본문 조회를 나눴을 때|키 탐색과 본문 조회 분리]]).
4. count는 필터에 필요한 join만 남긴 parent table `COUNT`로 분리하거나, 제거, 상한, 통계 같은 [[Pagination-Optimization#COUNT 비용 줄이기|COUNT 대안]]을 적용한다.

## 출처

- [SelectQueryBuilder.ts 1.1.1 — TypeORM GitHub](https://github.com/typeorm/typeorm/blob/1.1.1/src/query-builder/SelectQueryBuilder.ts)
- [SelectQueryBuilder.ts 1.1.0 — TypeORM GitHub](https://github.com/typeorm/typeorm/blob/1.1.0/src/query-builder/SelectQueryBuilder.ts)
- [feat: support distinct count, PR #11965 — TypeORM GitHub](https://github.com/typeorm/typeorm/pull/11965)
- [TypeORM 1.1.0 release — TypeORM GitHub](https://github.com/typeorm/typeorm/releases/tag/1.1.0)
- [Aggregate Function Descriptions, COUNT(DISTINCT) — MySQL 8.4 Reference Manual](https://dev.mysql.com/doc/refman/8.4/en/aggregate-functions.html)
- [Select using Query Builder — TypeORM](https://typeorm.io/docs/query-builder/select-query-builder/)
- [인프런, 이성욱, Ep.03 COUNT(*) & COUNT(DISTINCT) 튜닝](https://www.inflearn.com/courses/lecture?courseId=333931&unitId=226563)

## 관련 문서

- [[TypeORM|TypeORM 허브]]
- [[TypeORM-QueryBuilder|TypeORM QueryBuilder]]
- [[TypeORM-Repository-and-Find-Options|TypeORM Repository와 FindOptions]]
- [[Pagination-Optimization|페이징 성능 최적화]]
- [[Query-Antipatterns|SQL 쿼리 안티패턴]]
