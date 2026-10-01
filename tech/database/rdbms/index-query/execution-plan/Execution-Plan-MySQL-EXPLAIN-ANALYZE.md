---
tags: [database, rdbms, mysql, query-plan, explain-analyze, iterator, performance]
status: done
category: "Data & Storage - RDB"
aliases: ["MySQL EXPLAIN ANALYZE 숫자 읽기", "MySQL EXPLAIN ANALYZE", "actual time과 loops"]
verified_at: 2026-09-30
---

# MySQL EXPLAIN ANALYZE 숫자 읽기

MySQL `EXPLAIN ANALYZE`는 문장을 실제 실행하고 TREE 형식으로 iterator별 estimated cost/rows와 actual time/rows/loops를 출력한다. traditional 표의 행 순서만으로 실행 순서를 단정하지 말고 자식 iterator가 부모에게 row를 공급하는 관계를 따라간다. 표의 컬럼 읽기는 [[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]]에 있다. MySQL 8.4 기준이다.

## 출력의 두 시간 값

```text
-> 노드 설명  (cost=추정비용 rows=추정행) (actual time=A..B rows=R loops=L)
```

- `cost`는 시간이 아니라 다른 계획과 비교하는 옵티마이저 내부 값이다. 비용 모델이 계산하지 않는 iterator는 추정에서 빠진다.
- `A`는 첫 행을 반환하기까지의 시간, `B`는 이 iterator를 실행한 시간(자식 iterator 포함, 부모 제외)이며 단위는 밀리초다. `loops`가 2 이상이면 두 값과 `rows`는 loop당 평균이다.
- 노드의 총 시간은 `B × loops`, 반환한 총 행 수는 `R × loops`로 계산한다. 첫 행 시간에 loops를 곱하지 않는다.
- 트리는 들여쓰기가 가장 깊은 노드부터 바깥으로 읽는다. 단일 행 조회면 `A`와 `B`가 거의 같다.
- 8.4에서 `EXPLAIN ANALYZE`는 항상 TREE 형식이다. `explain_format`이 `JSON`이면 `FORMAT=TREE`를 명시하지 않은 `EXPLAIN ANALYZE`는 오류가 난다.

가장 먼저 예상 rows와 `actual rows * loops`가 벌어지는 지점을 찾는다. 오차가 상위 nested loop에서 곱해지면 join 순서나 access type 선택까지 바뀔 수 있다. 고정된 허용 배수보다 전체 계획과 처리량에 미치는 영향을 본다.

## 자기 시간과 파이프라인

부모의 `B`에는 자식 시간이 들어 있다. 정렬 자체의 비용은 Sort 노드의 `B`에서 바로 아래 자식의 `B`를 빼서 구한다. 조인은 드라이빙 스캔 시간과 `inner lookup의 B × loops`로 나눠 본다.

첫 행 시간은 노드가 서로를 기다리는지 보여 준다. 인덱스 range scan이 1만 건을 모두 내는 데 약 2ms가 걸렸는데 그 위 Filter와 조인 노드의 첫 행 시간이 약 0.2ms였다면, 앞 단계가 끝나야 다음 단계가 시작되는 구조로는 설명되지 않는다. 행 단위로 흘려보내는 파이프라인이라는 증거다.

- 부모의 `A`가 자식의 `B`보다 훨씬 작으면 스트리밍이다.
- 자식이 끝난 뒤에야 부모의 첫 행이 나오면 Sort, 집계, materialize 같은 blocking 구간이다.

`LIMIT`가 조기 종료를 만들 수 있는 조건과 filesort, temporary table의 해석은 [[MySQL-Query-Pipeline-and-Sorting|MySQL 쿼리 파이프라인과 정렬]]에 있다.

## TREE 표식

| 표식 | 뜻 |
|---|---|
| `Sort: ..., limit input to N row(s) per chunk` | `ORDER BY ... LIMIT`에 Top-N 정렬이 적용됨 |
| `Limit: N row(s)` | 조기 종료 지점 |
| `Stream results` | 옵티마이저가 보통 materialize할 자리지만 임시 테이블에 쓰지 않고 행을 그대로 다음 단계로 넘김 |
| `Covering index lookup`, `Covering index scan`, `Covering index range scan` | covering 접근. 테이블 점프가 없음 |
| `(reverse)` | 인덱스 역방향 스캔 |
| `Filter: ...` | 읽어 온 행에 서버가 조건을 적용 |

등호 `ref` 접근은 인덱스 탐색이 보장한 조건을 서버 필터에서 뺄 수 있지만, `BETWEEN` 같은 range 접근 위에는 서버가 조건을 다시 평가하는 Filter 노드가 남는 경우가 많다. 이 Filter의 자기 시간은 거의 0에 가깝고, 스토리지 엔진에서 실행 엔진으로 행을 넘기는 시간이 함께 잡힌다. 이 노드만 보고 나쁜 계획이라고 판단하지 않는다.

## 병목을 숫자로 좁힌 예

관리자 화면의 최근 1개월 `DELIVERED` 주문을 최신순 1,000건 조회하는 문장이 느렸다. `EXPLAIN`은 `type=ALL`, rows 약 500만, filtered 1.11%, `Using where; Using filesort`를 보였다. filesort가 원인처럼 보이지만 `EXPLAIN ANALYZE`에서 Table scan과 Filter가 약 1.1초, Top-N Sort는 약 20ms였다. 500만 건을 읽어 약 26만 건이 통과하고 1,000건을 반환하는 약 5,000배의 읽기 증폭이 병목이었다. 정렬이 아니라 읽는 범위를 줄이는 인덱스가 해법이다.

회원 조건으로 주문을 붙이는 중첩 루프 조인에서는 옵티마이저가 결과가 작은 회원 테이블을 드라이빙으로 골라 PK range로 1만 건을 읽고, 행마다 주문의 `member_id` 인덱스로 회원당 평균 약 10건을 찾은 뒤 `DELIVERED` 필터로 약 60%를 남겼다. 중간 결과는 약 6만 건으로 추정치(약 5천 건)의 10배를 넘었고, 이 inner loop 구간이 전체 시간의 95% 이상이었다. 주문을 드라이빙으로 했다면 필터 뒤에도 약 300만 번 루프가 돌았을 것이다. 조인 비용은 드라이빙 행 수와 inner lookup 1회 비용의 곱으로 읽는다([[MySQL-Join-Optimization|MySQL 조인 최적화]]).

## 사용 절차와 운영 안전

1. `EXPLAIN` 또는 실행하지 않는 `EXPLAIN FORMAT=TREE`로 인덱스 적용과 조인 순서의 방향을 잡는다.
2. 의심 구간만 `EXPLAIN ANALYZE`로 실측하고, 총 시간과 총 행 수를 loops를 곱해 계산한다.
3. 부모와 자식의 시간 차로 자기 시간을 구해 병목 노드를 고른다.
4. 고친 뒤 같은 데이터와 같은 parameter shape로 다시 잰다.

`EXPLAIN ANALYZE`는 실제 부하를 만들며 실행 중 `KILL QUERY`로 중단할 수 있다. 운영에서는 대표 데이터가 있는 안전한 환경, 읽기 replica 또는 제한된 시간/자원에서 먼저 측정하고 중단 기준을 정한다.

## 출처

- [MySQL 8.4 Reference Manual, EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)
- [explain_access_path.cc, sql/join_optimizer — MySQL Server 8.4 GitHub](https://github.com/mysql/mysql-server/blob/8.4/sql/join_optimizer/explain_access_path.cc)
- [StreamingIterator, sql/iterators/composite_iterators.h — MySQL Server 8.4 GitHub](https://github.com/mysql/mysql-server/blob/8.4/sql/iterators/composite_iterators.h)
- [인프런, EXPLAIN ANALYZE 실행 통계](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471869)
- [인프런, 예상과 실제 비교](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471873)
- [인프런, 김영한, EXPLAIN ANALYZE - 소개](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471868)
- [인프런, 김영한, EXPLAIN ANALYZE - 실행 통계2](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471870)
- [인프런, 김영한, EXPLAIN ANALYZE - 파이프라인 모델 최적화](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471872)
- [인프런, 김영한, 정리 (실행 계획 2 - ANALYZE 섹션)](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471874)
- [인프런, 김영한, 실전 진단 - 관리자 대시보드 주문 조회](https://www.inflearn.com/courses/lecture?courseId=343202&unitId=471876)

## 관련 문서

- [[Execution-Plan|실행 계획 목차]]
- [[Execution-Plan-MySQL-EXPLAIN|MySQL EXPLAIN 읽기]]
- [[MySQL-Query-Pipeline-and-Sorting|MySQL 쿼리 파이프라인과 정렬]]
- [[MySQL-Join-Optimization|MySQL 조인 최적화]]
- [[MySQL-Optimizer-Statistics|MySQL 옵티마이저 통계]]
