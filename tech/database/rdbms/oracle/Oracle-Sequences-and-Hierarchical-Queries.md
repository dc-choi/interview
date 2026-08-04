---
tags: [database, oracle, sequence, hierarchy, connect-by, recursive-cte]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Oracle Sequences and Hierarchical Queries", "Oracle 시퀀스와 계층형 쿼리"]
---

# Oracle sequence와 계층형 query

Sequence와 `CONNECT BY`는 Oracle schema와 query에서 자주 만나는 기능이다. Sequence는 번호를 생성하고, 계층형 query는 adjacency list의 parent-child edge를 순회한다. 둘 다 업무상 연속 번호나 tree 무결성을 자동 보장하지는 않는다.

## Sequence의 계약

Sequence는 table과 독립적으로 정수를 생성하는 schema object다.

```sql
CREATE SEQUENCE order_id_seq
  START WITH 1
  INCREMENT BY 1
  CACHE 100
  NOCYCLE;

INSERT INTO orders (id, customer_id, amount)
VALUES (order_id_seq.NEXTVAL, :customer_id, :amount);
```

- `sequence.NEXTVAL`은 값을 증가시키고 새 값을 반환한다.
- `sequence.CURRVAL`은 이 session에서 마지막으로 받은 값을 반환한다.
- session에서 `CURRVAL`을 쓰기 전에 먼저 `NEXTVAL`로 초기화해야 한다.
- 여러 session이 동시에 sequence를 사용할 수 있다.
- 현재 Oracle은 `GENERATED ... AS IDENTITY` column도 지원한다. 값 생성 주체를 column에 결합할지 여러 table이 공유하는 sequence로 둘지 선택한다.

강의의 `NEXT VALUE`, `CURRENT VALUE` 표현을 Oracle 문법으로 옮길 때는 `NEXTVAL`, `CURRVAL` 의사 열을 사용한다.

## 연속성과 유일성의 오해

Sequence는 gapless 번호가 아니다.

- `NEXTVAL`은 transaction commit이나 rollback과 독립적으로 소비된다.
- rollback된 insert, 동시에 값을 받은 session과 application retry가 gap을 만든다.
- `CACHE`를 쓰면 instance failure 때 아직 쓰지 않은 cache 값이 사라질 수 있다. row data가 사라진다는 뜻은 아니다.
- `CYCLE`은 한계에 도달하면 값 범위를 재사용하므로 그 자체로 영구 unique key를 보장하지 않는다.
- `ORDER`는 요청 순서를 보장하는 별도 비용이 있고 commit 순서나 업무 사건 시각을 뜻하지 않는다.

법정 문서 번호처럼 빈틈 없는 번호가 필요하면 sequence PK와 별도로 발급 ledger, 직렬화 지점, 취소 이력과 대사 정책을 설계한다.

## Sequence 운영 기준

1. PK 생성에는 보통 `NOCYCLE`을 사용한다.
2. 성능을 위해 충분한 `CACHE`를 쓰되 gap을 허용한다.
3. sequence 값을 시간순 정렬이나 row 수 계산에 쓰지 않는다.
4. migration과 data import 뒤에는 최대 PK와 다음 생성 값의 충돌을 검사한다.
5. `NEXTVAL`을 참조할 수 없는 query 위치와 `CURRVAL`의 session 범위를 test한다.

## 계층형 data의 저장

Oracle 전용 query를 쓰더라도 storage model은 보통 adjacency list다.

```sql
CREATE TABLE org_node (
  employee_id NUMBER PRIMARY KEY,
  manager_id NUMBER NULL,
  employee_name VARCHAR2(100) NOT NULL,
  CONSTRAINT fk_org_manager
    FOREIGN KEY (manager_id) REFERENCES org_node(employee_id)
);
```

root는 `manager_id IS NULL`, 각 child는 parent의 key를 참조한다. FK는 parent 존재를 보장하지만 임의 깊이 cycle까지 막지는 않는다.

## CONNECT BY

```sql
SELECT employee_id,
       manager_id,
       LEVEL AS depth,
       CONNECT_BY_ROOT employee_id AS root_id,
       SYS_CONNECT_BY_PATH(employee_name, '/') AS path
FROM org_node
START WITH manager_id IS NULL
CONNECT BY NOCYCLE PRIOR employee_id = manager_id
ORDER SIBLINGS BY employee_name;
```

- `START WITH`는 root row를 고른다.
- `CONNECT BY`는 parent-child 관계를 정의한다.
- `PRIOR`는 바로 앞 단계의 parent expression을 참조하는 operator다.
- `LEVEL`은 함수가 아니라 계층 query에서 제공되는 pseudocolumn이며 root가 1이다.
- `NOCYCLE`은 cycle이 있어도 결과를 반환하게 하고 `CONNECT_BY_ISCYCLE`로 문제 row를 찾게 한다.
- 전체 `ORDER BY`는 계층 순서를 덮어쓸 수 있다. sibling 순서만 바꾸려면 `ORDER SIBLINGS BY`를 쓴다.

`CONNECT BY`는 Oracle에서만 가능한 계층 data 자체가 아니라 Oracle 전용 순회 문법이다. 다른 DBMS도 recursive CTE 등으로 계층을 조회한다.

## Recursive subquery factoring과 비교

현재 Oracle도 recursive subquery factoring을 지원한다. Oracle 문법은 PostgreSQL/MySQL 예제처럼 `WITH RECURSIVE` keyword를 쓰지 않는다는 점에 주의한다.

```sql
WITH org (employee_id, manager_id, employee_name, depth) AS (
  SELECT employee_id, manager_id, employee_name, 1
  FROM org_node
  WHERE manager_id IS NULL

  UNION ALL

  SELECT c.employee_id, c.manager_id, c.employee_name, p.depth + 1
  FROM org_node c
  JOIN org p ON c.manager_id = p.employee_id
)
SELECT *
FROM org;
```

| 기준 | `CONNECT BY` | Recursive query |
|---|---|---|
| Oracle legacy code | 읽고 유지하기 쉬움 | 변환 비용 있음 |
| Oracle 전용 pseudocolumn | `LEVEL`, root/path 기능 풍부 | 직접 column으로 계산 |
| 다른 DBMS와 개념 공유 | 낮음 | 높음, 세부 문법은 다름 |
| cycle와 순서 | `NOCYCLE`, sibling 문법 | `CYCLE`, `SEARCH` 지원 범위 확인 |

선택은 팀의 운영 DB, 이식성, path와 sibling ordering 요구로 결정한다. 어느 문법을 써도 cycle 방지, depth 제한, subtree 크기와 `manager_id` index를 별도로 검토한다.

## 출처

- [Oracle AI Database 26ai, CREATE SEQUENCE](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/CREATE-SEQUENCE.html)
- [Oracle AI Database 26ai, Sequence Pseudocolumns](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Sequence-Pseudocolumns.html)
- [Oracle AI Database 26ai, Hierarchical Queries](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/Hierarchical-Queries.html)
- [Oracle AI Database 26ai, SELECT and Recursive Subquery Factoring](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/SELECT.html)
- 강의: [Sequence 사용](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4668), [계층형 query](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4669)

## 관련 문서

- [[Primary-Key-Strategy|Primary key 생성 전략]]
- [[Hierarchical-Data-Modeling|계층형 데이터 모델링]]
- [[Oracle-SQL-Dialect|Oracle SQL 방언]]
