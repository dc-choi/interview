---
tags: [database, rdbms, mysql, iterator, sorting, group-by, performance]
status: done
category: "Database - RDBMS"
aliases: ["MySQL Query Pipeline and Sorting", "MySQL 파이프라인과 정렬"]
verified_at: 2026-09-30
---

# MySQL 쿼리 파이프라인과 정렬

MySQL 8.4의 TREE 실행 계획은 iterator가 자식에게서 row를 받아 부모로 전달하는 구조를 보여 준다. 전체 중간 결과를 먼저 만드는 operator도 있고 row를 받는 즉시 넘길 수 있는 operator도 있다. `LIMIT`, 정렬과 집계의 비용은 이 경계에서 달라진다.

## Pipeline과 조기 종료

index가 `WHERE`와 `ORDER BY`를 함께 지원하면 scan이 이미 필요한 순서로 row를 내보낼 수 있다. 상위 `LIMIT` iterator는 필요한 수를 받은 뒤 자식 scan을 멈출 수 있다.

```sql
CREATE INDEX idx_posts_category_created
    ON posts(category_id, created_at DESC, id DESC);

SELECT id, created_at
FROM posts
WHERE category_id = 10
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

반대로 정렬이 필요하면 matching rows를 수집하고 정렬한 뒤에야 첫 row를 내보내는 blocking 구간이 생길 수 있다. `LIMIT`가 있어도 조건을 만족하는 후보 탐색 비용이 자동으로 20행이 되는 것은 아니다.

## 파이프라인과 애플리케이션 소비

iterator가 row를 흘려보내 첫 행을 빨리 내도 애플리케이션까지 한 행씩 전달된다는 뜻은 아니다. MySQL Connector/J는 기본적으로 결과 집합 전체를 받아 메모리에 두고, forward-only와 read-only 결과에 fetch size `Integer.MIN_VALUE`를 주거나 `useCursorFetch`를 켜야 스트리밍한다. 스트리밍 중에는 결과를 끝까지 읽거나 닫기 전까지 같은 connection에 다른 쿼리를 보낼 수 없고, 문장이 끝나야 그 문장이 잡은 잠금도 풀린다.

- 결과를 소비하는 동안 connection을 붙잡아 pool이 마를 수 있고, 스트림과 리소스 해제를 직접 관리해야 한다. 해제를 빠뜨리면 누수가 생긴다. ORM의 엔티티 변환과 캐시도 거치지 않는다. TypeORM `stream()`은 엔티티가 아닌 raw data를 돌려준다.
- 사용자 화면의 목록은 페이징으로 나눠 조회하고([[Pagination-Optimization|페이징 성능 최적화]]), 스트리밍은 수백만 건 배치나 엑셀 내보내기처럼 한 흐름으로 끝까지 소비하는 작업에 한정한다. Node.js 메모리 대책으로서의 cursor 스트리밍은 [[OOM-Troubleshooting-Response|OOM 대응]]과 함께 본다.
- 행 단위 전달이 행마다 디스크 I/O를 한다는 뜻은 아니다. 내부 읽기는 페이지 단위다.
- 기본 버퍼링과 스트리밍 옵션은 드라이버마다 다르므로 사용하는 드라이버 문서로 확인한다.

## `Using filesort` 해석

`Using filesort`는 index 순서만으로 결과를 만들지 못해 추가 정렬 단계를 사용한다는 뜻이다. 항상 disk sort라는 뜻은 아니다. MySQL은 memory buffer를 사용하고 필요할 때 disk temporary file을 사용한다.

확인할 것은 표시 자체보다 다음 값이다.

- 정렬에 들어간 실제 row 수와 row 폭
- sort buffer와 disk spill 여부
- 첫 row가 나오기까지 걸린 시간
- 정렬 key와 index key의 방향, prefix
- `LIMIT`와 data skew가 plan에 미친 영향

동일한 `ORDER BY` 값 사이의 순서는 보장되지 않는다. pagination이나 반복 가능한 결과가 필요하면 unique tiebreaker를 추가한다.

## Index 정렬을 사용할 수 있는 조건

복합 index는 leftmost prefix와 key-part 방향에 따라 순서를 제공한다. 선행 key가 상수 조건으로 고정되면 뒤 key의 정렬을 활용할 수 있다. MySQL 8.4 descending index는 `(a DESC, b ASC)` 같은 혼합 방향도 저장한다.

index 정렬이 가능해도 많은 base row lookup이 필요하면 optimizer가 table scan과 filesort를 더 싸게 볼 수 있다. query가 covering인지, 반환 비율과 `LIMIT`이 어떤지 함께 비교한다.

## 본인이 직접 수행한 경험을 공개 가능한 범위로 일반화한 사례: 필터와 정렬을 한 index로 묶어 filesort 제거

최근 상태를 가져오는 조회가 느려진 서비스에서 `EXPLAIN ANALYZE`를 확인했더니, 단일 column index가 `ORDER BY created_at DESC, id DESC`를 풀지 못해 많은 후보를 filesort한 뒤 한 건만 남기고 있었다.

equality 조건을 선행 key로 두고 정렬 key의 방향까지 맞춘 `(device_number, created_at DESC, id DESC)` 복합 index를 만들었다. 선행 key가 상수로 고정되자 뒤 key part의 순서가 사용되어 filesort가 사라지고 상위 결과에서 scan을 멈출 수 있었다.

같은 조건에서 실행 계획을 다시 확인해 filesort가 사라진 것과 단건, 배치의 지연이 모두 유의미하게 줄어든 것을 검증했다. 단건 실행 계획과 배치의 end-to-end 시간은 애플리케이션 처리와 네트워크 왕복 때문에 같은 비율로 움직이지 않는다. 적재량, cache miss, base row lookup과 동시성이 바뀌면 결과도 달라지므로 같은 데이터 분포에서 다시 측정하고, index 정의는 schema에 선언해 형상 관리한다.

## Internal temporary table

MySQL은 `GROUP BY`, `DISTINCT`, `UNION`, 일부 window function이나 materialization에 internal temporary table을 사용할 수 있다. `Using temporary`는 진단 신호이지 즉시 장애라는 판정은 아니다.

MySQL 8.4의 기본 in-memory engine은 TempTable이고, 크기와 전역 한도를 넘으면 disk의 InnoDB temporary table로 전환될 수 있다. `tmp_table_size`, TempTable memory 한도와 실제 workload를 함께 본다. status counter만으로 특정 query의 spill을 단정하지 않는다.

## `GROUP BY`와 index

### Loose Index Scan

각 group의 일부 key만 읽어 결과를 만들 수 있다. 일반적인 조건은 다음과 같다.

- single table query
- `GROUP BY` column이 index의 leftmost prefix
- 나머지 key part 조건과 aggregate가 지원 형태를 만족

traditional `EXPLAIN`에서는 `Using index for group-by`로 보일 수 있다. `MIN()`과 `MAX()` 외에도 제한된 DISTINCT aggregate 형태가 지원되므로 함수 이름만으로 판정하지 않는다.

### Tight Index Scan

range를 만족하는 index key를 모두 읽되, key 순서를 활용해 grouping할 수 있다. loose scan처럼 group 사이를 건너뛰지는 않지만 temporary table을 피할 수 있다. index를 썼다는 사실보다 실제 읽은 rows와 grouping 단계의 시간을 비교한다.

## 검증 절차

1. 결과의 결정적인 정렬 순서를 먼저 정의한다.
2. TREE 형식 `EXPLAIN ANALYZE`에서 iterator 경계와 actual rows, loops를 본다.
3. index scan, filesort, temporary table 대안을 같은 데이터 분포로 비교한다.
4. 첫 페이지와 깊은 페이지, 작은 group과 skew가 큰 group을 각각 측정한다.
5. index 추가 전 쓰기 비용과 기존 index 중복을 확인한다.

## Top-N 정렬의 비용

적용 가능한 ORDER BY + LIMIT는 우선순위 큐로 상위 N개만 유지해 정렬 메모리와 비교 비용을 줄일 수 있다. 그러나 어떤 행이 상위인지 알려면 후보 입력을 끝까지 읽어야 하므로 정렬에 앞선 scan 비용이 N개로 줄지는 않는다. `LIMIT N OFFSET M`이면 유지해야 할 후보도 N보다 커질 수 있다.

## 동등 조건, 정렬과 범위

복합 index의 equality prefix 뒤에 정렬 컬럼을 놓으면 ordered scan을 제공할 수 있다. 그 앞 key가 range라면 후행 정렬 key는 range 전체에서 하나의 정렬 순서를 보장하지 못할 수 있다. 필터 범위를 좁히는 index와 정렬을 유지해 LIMIT에서 멈추는 index를 실제 분포로 비교한다.

## 조기 종료와 일치 밀도

정렬 index를 따라 읽다가 20개를 채우는 query도 추가 filter의 일치 밀도가 낮으면 많은 entry를 훑는다. 일치 row가 index 앞에 몰린 경우와 뒤에 몰린 경우를 따로 측정하고 scanned rows와 base lookup을 기록한다. LIMIT가 작다는 사실만으로 일정 지연을 보장하지 않는다.

## Sort buffer와 spill

정렬 대상이 memory에 맞지 않으면 정렬 run을 임시 파일로 내보내 병합할 수 있다. `Using filesort`만으로 disk spill을 확정하지 말고 실제 입력 row 폭, 정렬 merge와 temporary I/O를 비교한다. sort buffer의 global 증가는 동시 sort 수만큼 메모리를 늘릴 수 있어 session 실험부터 한다.

## GROUP BY 계획 신호

Loose scan은 group 안의 모든 entry를 읽지 않을 수 있지만 tight/streaming grouping은 정렬된 입력을 읽으며 group별 상태를 유지한다. 지원되지 않는 shape는 temporary aggregation을 사용할 수 있다. GROUP BY 자체의 결과 순서를 기대하지 말고 TREE iterator와 `Using index for group-by`, temporary 신호를 함께 확인한다.

## 출처

- [MySQL 8.4, EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [MySQL 8.4, ORDER BY Optimization](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html)
- [MySQL 8.4, LIMIT Query Optimization](https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html)
- [MySQL 8.4, GROUP BY Optimization](https://dev.mysql.com/doc/refman/8.4/en/group-by-optimization.html)
- [MySQL 8.4, Internal Temporary Table Use](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html)
- [MySQL Connector/J Developer Guide, JDBC API Implementation Notes](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-implementation-notes.html)
- [TypeORM, Select using Query Builder](https://typeorm.io/docs/query-builder/select-query-builder/)
- [인프런, Top-N 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471871)
- [인프런, 파이프라인 모델 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471872)
- [인프런, 정리 (실행 계획 2 - ANALYZE 섹션)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471874)
- [인프런, filesort, 메모리와 디스크](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471942)
- [인프런, GROUP BY 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471948)
- [인프런, Filesort, Temporary Table과 Partitioning](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373901)
- [인프런, GROUP BY 최적화 2](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471949)
- [인프런, GROUP BY 최적화 3](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471950)
- [인프런, ICP 적용 예제 - 실전 튜닝 2에 ICP 적용](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471904)
- [인프런, 남은 문제 - GROUP BY가 만든 임시 테이블](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471953)
- [인프런, 누구나 다 알게 해주는 MySQL SELECT 고급 가이드](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367622)
- [인프런, 실전 진단 - 관리자 대시보드 주문 조회](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471876)
- [인프런, 실전 진단 - 상품 검색](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471898)
- [인프런, 실전 진단 - 해결 방안 1 (실전 튜닝 1)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471877)
- [인프런, 실전 진단 - 해결 방안 1 (실전 튜닝 2)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471899)
- [인프런, 실전 진단 - 해결 방안 2 (실전 튜닝 1)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471878)
- [인프런, 실전 진단 - 해결 방안 2 (실전 튜닝 2)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471900)
- [인프런, 정렬과 페이징의 함정](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471941)
- [인프런, 정리](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471951)
- [인프런, 해결 - 인덱스 정렬을 바꿔 스트리밍 집계로](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471954)


## 관련 문서

- [[Execution-Plan|실행 계획]]
- [[Pagination-Optimization|페이징 성능 최적화]]
- [[Covering-Index|커버링 인덱스]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
