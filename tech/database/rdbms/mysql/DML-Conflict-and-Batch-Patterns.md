---
tags: [database, rdbms, mysql, dml, upsert, batch]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["MySQL DML 패턴", "MySQL UPSERT", "MySQL 배치 갱신"]
---

# MySQL DML 충돌 처리와 배치 패턴

대량 `INSERT`, `UPDATE`, `DELETE`는 문법보다 충돌 시 의미, 잠금 범위, 실패 단위를 먼저 정해야 한다. 같은 중복 키라도 무시, 기존 행 갱신, 기존 행 교체는 서로 다른 작업이다.

## INSERT 충돌 의미를 먼저 고른다

| 방식 | 중복 키가 없을 때 | PK 또는 UNIQUE 충돌 시 | 주의점 |
|---|---|---|---|
| `INSERT` | 새 행 삽입 | 오류로 문장 중단 | 잘못된 입력을 즉시 드러내는 기본값 |
| `INSERT IGNORE` | 새 행 삽입 | 해당 행을 버리고 warning | 일부 변환 오류도 보정값과 warning으로 바뀔 수 있음 |
| `INSERT ... ON DUPLICATE KEY UPDATE` | 새 행 삽입 | 기존 행 갱신 | 여러 UNIQUE 인덱스 중 어느 충돌인지 모호해질 수 있음 |
| `REPLACE` | 새 행 삽입 | 기존 행 삭제 후 새 행 삽입 | UPDATE가 아니며 기본값, 참조 관계와 삭제 부작용을 다시 검토 |

`IGNORE`는 안전 모드가 아니다. 적재가 끝난 뒤 warning 수와 실제 반영 건수를 확인하지 않으면 잘못된 값이나 누락된 행을 성공으로 오인할 수 있다. `REPLACE`도 기존 행의 일부 컬럼을 보존하는 갱신이 아니므로 일반적인 UPSERT 기본값으로 두지 않는다.

락 관점의 차이도 있다. `INSERT IGNORE`는 중복 키를 확인하며 기존 인덱스 레코드에 S Lock을 잡을 수 있는데, 같은 트랜잭션에서 이어서 그 행을 UPDATE하면 S에서 X로 올리는 업그레이드가 된다 — 동시 요청이 각자 S Lock을 쥔 채 서로의 해제를 기다리는 데드락의 전형 패턴이다. 있으면 넘어가고 없으면 만드는 목적이라면 no-op ODKU(`ON DUPLICATE KEY UPDATE col = col`)가 중복 시 UPDATE 경로로 들어가 처음부터 X Lock을 잡으므로, 결과는 같아도 경합이 순환 대기 대신 직렬 대기로 정리된다.

```sql
INSERT INTO account_balance (account_id, balance, updated_at)
VALUES (42, 1000, NOW()) AS incoming
ON DUPLICATE KEY UPDATE
  balance = incoming.balance,
  updated_at = incoming.updated_at;
```

MySQL 8.4에서는 새 값을 가리킬 때 row alias를 사용할 수 있다. `VALUES(column)` 방식은 deprecated 상태다. 테이블에 여러 UNIQUE 인덱스가 있다면 입력 한 행이 서로 다른 기존 행과 각각 충돌할 수 있으므로, UPSERT의 식별 키를 하나로 설계하거나 사전 조회와 트랜잭션으로 의도를 분리한다.

## 배치 삽입

- 여러 단건 요청 대신 multi-row `VALUES`로 네트워크 왕복과 문장 파싱 비용을 줄인다.
- 테이블 간 이동은 `INSERT ... SELECT`로 서버 안에서 처리한다. 대상 컬럼을 명시하고 변환, 중복, NULL 정책을 검증한다.
- 파일 적재는 `LOAD DATA`가 빠르지만 `LOCAL`, `IGNORE`, `REPLACE`에 따라 파일 위치, 권한과 오류 의미가 달라진다.
- 한 번에 너무 많은 행을 묶으면 redo, binlog, lock 보유 시간과 재시도 비용이 커진다. 처리량과 tail latency를 함께 측정해 batch 크기를 정한다.
- 재시도 가능한 작업은 비즈니스 멱등 키를 UNIQUE로 강제하고, 어떤 충돌 동작을 성공으로 볼지 API 계약에 포함한다.

## 읽고 쓰는 틈을 없애는 UPDATE

현재 값을 애플리케이션으로 읽어 계산한 뒤 다시 저장하면 동시 갱신을 덮어쓸 수 있다. 가능한 불변식은 한 문장의 조건부 갱신으로 표현한다.

```sql
UPDATE inventory
SET quantity = quantity - 3
WHERE product_id = 42
  AND quantity >= 3;
```

영향받은 행이 1개면 차감 성공, 0개면 재고 부족 또는 대상 없음으로 해석한다. MySQL 단일 테이블 `UPDATE`는 `ORDER BY`와 `LIMIT`를 지원하지만, multi-table `UPDATE`에는 둘을 사용할 수 없다.

## JOIN UPDATE와 JOIN DELETE

MySQL의 multi-table `UPDATE`, `DELETE`는 join으로 대상을 찾고 한 문장에서 변경할 수 있다.

```sql
UPDATE inventory AS i
JOIN stock_adjustment AS a ON a.product_id = i.product_id
SET i.quantity = i.quantity + a.delta
WHERE a.batch_id = :batch_id;

DELETE s
FROM session AS s
JOIN expired_account AS e ON e.account_id = s.account_id;
```

- 어떤 table을 읽고 어느 table을 변경하는지 alias로 명시한다.
- Source 여러 행이 target 한 행에 매칭되더라도 target row는 한 번만 갱신된다. 적용할 값이 하나가 되도록 source를 UNIQUE로 제한하거나 먼저 집계한다.
- Multi-table 형식에는 `ORDER BY`와 `LIMIT`를 사용할 수 없다. 큰 작업은 대상 PK를 먼저 제한한 뒤 작은 단일-table DML로 나눈다.
- 읽는 table 전체에 포괄적인 read lock이 생긴다고 단정하지 않는다. 실제 plan, isolation level과 검색한 index record에 따라 lock 범위가 달라진다.
- Foreign key가 얽힌 multi-table `DELETE`는 optimizer의 처리 순서 때문에 실패할 수 있다. 단일 parent delete와 `ON DELETE` 동작이 더 명확한지 비교한다.

실행 전 같은 join과 predicate의 `SELECT`로 대상 cardinality를 확인하고 `EXPLAIN`에서 scan 범위를 검증한다. 변경 뒤에는 matched row와 changed row 의미를 구분한다.

## 큰 변경을 작은 트랜잭션으로 나눈다

```sql
DELETE FROM audit_log
WHERE created_at < '2025-01-01'
ORDER BY id
LIMIT 5000;
```

영향받은 행이 batch 크기보다 작아질 때까지 반복하면 한 트랜잭션의 undo, redo와 lock 보유 시간을 제한할 수 있다. 다음을 함께 지킨다.

- 조건과 순서를 재개 가능한 keyset으로 고정한다.
- batch마다 commit하고 재시도 횟수, 처리 위치와 영향 행 수를 기록한다.
- 삭제 조건을 받치는 인덱스를 준비하고 `EXPLAIN`으로 스캔 범위를 확인한다.
- multi-table `DELETE`에는 `ORDER BY`와 `LIMIT`를 쓸 수 없다. 대상 PK를 먼저 제한해 단일 테이블 삭제로 넘기는 방식을 검토한다.
- 소프트 삭제는 복구와 감사에는 유리하지만 모든 읽기, UNIQUE 제약, 보존 기간과 물리 삭제 작업까지 함께 설계해야 한다.

## 선택 체크리스트

1. 중복은 오류, 무시, 부분 갱신, 완전 교체 중 무엇인가?
2. 부분 성공과 warning을 호출자가 구분할 수 있는가?
3. 여러 UNIQUE 키가 같은 UPSERT에 참여해도 의미가 하나인가?
4. 영향 행 수가 비즈니스 성공 조건과 일치하는가?
5. batch 중단 뒤 같은 범위부터 안전하게 재시작할 수 있는가?
6. 실행 계획, lock wait, redo와 replica lag를 관찰하고 있는가?

## 출처

- [MySQL 8.4 Reference Manual, INSERT](https://dev.mysql.com/doc/refman/8.4/en/insert.html)
- [DB Lock으로 동시성을 해결하려다 Deadlock을 만난 이야기 — velog](https://velog.io/@joona95/DB-Lock%EC%9C%BC%EB%A1%9C-%EB%8F%99%EC%8B%9C%EC%84%B1%EC%9D%84-%ED%95%B4%EA%B2%B0%ED%95%98%EB%A0%A4%EB%8B%A4-Deadlock%EC%9D%84-%EB%A7%8C%EB%82%9C-%EC%9D%B4%EC%95%BC%EA%B8%B0)
- [MySQL 8.4 Reference Manual, INSERT ON DUPLICATE KEY UPDATE](https://dev.mysql.com/doc/refman/8.4/en/insert-on-duplicate.html)
- [MySQL 8.4 Reference Manual, REPLACE](https://dev.mysql.com/doc/refman/8.4/en/replace.html)
- [MySQL 8.4 Reference Manual, UPDATE](https://dev.mysql.com/doc/refman/8.4/en/update.html)
- [MySQL 8.4 Reference Manual, DELETE](https://dev.mysql.com/doc/refman/8.4/en/delete.html)
- [MySQL 8.4 Reference Manual, LOAD DATA](https://dev.mysql.com/doc/refman/8.4/en/load-data.html)
- [인프런, Hong, INSERT 기초](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367624)
- [인프런, Hong, INSERT 응용](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367627)
- [인프런, Hong, UPDATE 기초](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367623)
- [인프런, Hong, UPDATE 응용](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367625)
- [인프런, Hong, DELETE 기초](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367628)
- [인프런, Hong, DELETE 응용](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367621)
- [인프런, Real MySQL 시즌 1 - Part 2, JOIN UPDATE와 JOIN DELETE](https://www.inflearn.com/courses/lecture?courseId=333745&unitId=226585)
- [인프런, Hong, INSERT 최적화](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338549)
- [인프런, Hong, UPDATE와 DELETE](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338552)

## 관련 문서

- [[Transactions|트랜잭션]]
- [[Lock|DB Lock]]
- [[Schema-Design|스키마 설계]]
- [[Execution-Plan|실행 계획]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
