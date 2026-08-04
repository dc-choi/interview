---
tags: [database, rdbms, postgresql, sql, upsert, cte, window-function]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["PostgreSQL SQL 패턴", "PostgreSQL Advanced SQL"]
---

# PostgreSQL SQL 패턴

PostgreSQL 18 기준으로 DML 결과 반환, 원자적 UPSERT, CTE 최적화, 윈도 함수와 시간대 처리를 정리한다. 문법을 외우기보다 동시성 경계와 실행 계획에 어떤 영향을 주는지 이해하는 것이 중요하다.

## `RETURNING`으로 변경 결과 받기

`INSERT`, `UPDATE`, `DELETE`, `MERGE`는 `RETURNING`으로 실제 변경된 행을 같은 문장에서 반환할 수 있다. 기본값, 생성된 ID, trigger가 바꾼 값처럼 변경 뒤에야 확정되는 값을 별도 `SELECT` 없이 받을 때 유용하다.

```sql
INSERT INTO accounts (email, balance)
VALUES ('user@example.com', 0)
RETURNING id, email, balance;
```

반환 목록은 `SELECT`의 출력 목록처럼 식과 별칭을 사용할 수 있다. 다만 반환할 컬럼에 대한 `SELECT` 권한도 필요하며, 많은 행을 변경할 때 `RETURNING *`는 응답과 직렬화 비용을 키울 수 있다.

## `ON CONFLICT`로 원자적 UPSERT

애플리케이션에서 먼저 존재 여부를 조회한 뒤 `INSERT` 또는 `UPDATE`를 선택하면 두 문장 사이에 다른 트랜잭션이 끼어들 수 있다. PostgreSQL의 `ON CONFLICT DO UPDATE`는 유일 인덱스 또는 제약을 충돌 판정 기준으로 삼아, 동시 실행에서도 각 입력 행이 insert 또는 update 중 하나로 끝나는 원자적 결과를 보장한다.

```sql
INSERT INTO account_balances (account_id, balance, updated_at)
VALUES ($1, $2, now())
ON CONFLICT (account_id) DO UPDATE
SET balance = EXCLUDED.balance,
    updated_at = EXCLUDED.updated_at
RETURNING account_id, balance, updated_at;
```

- `DO NOTHING`은 해당 충돌 행의 삽입을 건너뛴다.
- `DO UPDATE`에서 기존 행은 대상 테이블 이름으로, 삽입하려던 값은 `EXCLUDED`로 참조한다.
- 충돌 대상은 실제 유일성 규칙과 일치해야 한다. 단순한 중복 회피가 아니라 어떤 키를 멱등성 경계로 삼을지 먼저 설계한다.
- 덮어쓰기, 누적, 최신 버전만 수용 중 어떤 갱신 의미가 필요한지 명시한다. UPSERT 자체가 잘못된 도메인 갱신 규칙을 해결하지는 않는다.

## CTE는 가독성 도구이자 계획 경계

`WITH`는 복잡한 쿼리를 이름 있는 단계로 나누지만 PostgreSQL에서 항상 임시 결과로 물질화되는 것은 아니다.

- 비재귀적이고 부작용이 없는 CTE를 상위 쿼리가 한 번 참조하면 기본적으로 상위 쿼리에 접힐 수 있어 predicate pushdown과 인덱스 사용이 가능하다.
- 여러 번 참조하는 CTE는 기본적으로 물질화되므로 중복 계산을 줄이는 대신 상위 조건을 내부로 밀어 넣지 못할 수 있다.
- `MATERIALIZED`는 별도 계산을 강제하고, `NOT MATERIALIZED`는 결합 최적화를 유도한다. 후자는 같은 계산을 여러 번 수행할 수 있으므로 `EXPLAIN`으로 확인한다.

CTE를 단지 보기 좋게 만들었다는 이유로 성능이 좋아지거나 나빠진다고 단정하지 않는다. 참조 횟수, 함수의 변동성, 선택도와 실제 계획을 함께 본다.

## 윈도 함수의 세 경계

윈도 함수는 `GROUP BY`처럼 행을 한 행으로 축약하지 않고 관련 행 집합을 기준으로 값을 계산한다.

1. `PARTITION BY`는 계산 그룹을 나눈다.
2. 윈도 내부 `ORDER BY`는 순서와 동률 peer group을 정한다.
3. frame은 현재 행에서 함수가 볼 수 있는 범위를 정한다.

```sql
SELECT account_id,
       occurred_at,
       amount,
       sum(amount) OVER (
         PARTITION BY account_id
         ORDER BY occurred_at, id
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS running_balance,
       lag(amount) OVER (
         PARTITION BY account_id
         ORDER BY occurred_at, id
       ) AS previous_amount
FROM transactions;
```

`row_number`는 행마다 번호를 주고, `rank`는 동률 다음 순위를 건너뛰며, `dense_rank`는 건너뛰지 않는다. 동률을 안정적으로 처리하려면 업무상 고유한 tie-breaker를 `ORDER BY`에 포함한다.

`ORDER BY`가 있는 기본 frame은 파티션 시작부터 현재 행과 같은 정렬값을 가진 마지막 peer까지다. 따라서 `last_value`가 파티션의 마지막 값이 아니라 현재 peer의 값을 반환할 수 있다. 전체 파티션의 마지막 값이 필요하면 다음처럼 frame을 명시한다.

```sql
last_value(status) OVER (
  PARTITION BY account_id
  ORDER BY occurred_at, id
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

## `timestamptz`의 의미

`timestamptz`는 원래 입력한 지역 이름이나 오프셋을 보존하는 타입이 아니다. 입력 시점의 절대 시간을 UTC로 변환해 저장하고, 출력할 때 세션의 `TimeZone`으로 변환한다.

- 사건이 실제로 발생한 시점을 저장할 때는 보통 `timestamptz`를 사용한다.
- 매일 오전 9시처럼 지역 달력상의 벽시계 규칙은 지역 이름을 별도 보존하거나 명시적 변환 규칙을 둔다.
- `timestamp without time zone`에 입력한 시간대 표시는 무시된다. 변환 의도를 `AT TIME ZONE`으로 드러내고 IANA 지역 이름을 사용한다.

## 점검 순서

1. 변경 결과가 필요하면 후속 조회보다 `RETURNING`을 먼저 검토한다.
2. 존재 확인 뒤 쓰기 패턴은 유일 제약과 `ON CONFLICT`로 원자화할 수 있는지 본다.
3. CTE는 참조 횟수와 `MATERIALIZED` 여부가 계획에 미치는 영향을 확인한다.
4. 윈도 쿼리는 partition, order, frame을 각각 설명할 수 있어야 한다.
5. 시간 컬럼은 절대 시점과 지역 벽시계 중 무엇을 표현하는지 먼저 정한다.

## 관련 문서

- [[SQL|SQL]]
- [[Execution-Plan|실행 계획]]
- [[Transactions|트랜잭션]]
- [[Pagination-Optimization|페이징 최적화]]
- [[MySQL-to-PostgreSQL-Migration|MySQL에서 PostgreSQL로 마이그레이션]]

## 출처

- [PostgreSQL 18 Documentation, INSERT](https://www.postgresql.org/docs/18/sql-insert.html)
- [PostgreSQL 18 Documentation, Returning Data from Modified Rows](https://www.postgresql.org/docs/18/dml-returning.html)
- [PostgreSQL 18 Documentation, WITH Queries](https://www.postgresql.org/docs/18/queries-with.html)
- [PostgreSQL 18 Documentation, Window Functions](https://www.postgresql.org/docs/18/functions-window.html)
- [PostgreSQL 18 Documentation, Date/Time Types](https://www.postgresql.org/docs/18/datatype-datetime.html)
- [UPDATE와 DELETE, RETURNING - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=432796)
- [UPSERT 쿼리 패턴 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=432798)
- [정렬, 페이징과 시간 함수 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=432799)
- [CTE를 활용한 서브쿼리 블록화 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=432805)
- [윈도 함수를 사용한 집계 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=432806)
- [윈도 frame 심화 패턴 - 인프런, Hong](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=432807)
