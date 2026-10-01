---
tags: [database, rdbms, mysql, dml, upsert, batch]
status: done
verified_at: 2026-09-30
category: "Data & Storage - RDB"
aliases: ["MySQL DML 패턴", "MySQL UPSERT", "MySQL 배치 삽입", "조건부 INSERT"]
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

락 관점의 차이도 있다. `INSERT IGNORE`는 중복 키를 확인하며 기존 인덱스 레코드에 S Lock을 잡을 수 있는데, 같은 트랜잭션에서 이어서 그 행을 UPDATE하면 S에서 X로 올리는 업그레이드가 된다 — 동시 요청이 각자 S Lock을 쥔 채 서로의 해제를 기다리는 데드락의 전형 패턴이다. 있으면 넘어가고 없으면 만드는 목적이라면 no-op ODKU(`ON DUPLICATE KEY UPDATE col = col`)가 중복 키 시점에 S 대신 X를 잡아 승격이 없으므로, 결과는 같아도 경합이 순환 대기 대신 직렬 대기로 정리된다. 다만 ODKU 경로도 중복마다 X 락을 잡고(중복 PK면 index-record 락, 중복 UNIQUE 키면 레코드와 앞 갭을 묶는 next-key 락), `updated_at = NOW()`처럼 값을 실제로 바꾸는 절이면 불필요한 쓰기도 쌓인다. 요청이 몰리는 유저 단위 Hot Row라면 그 행을 정말 갱신해야 하는지부터 다시 본다 — 뒤따르는 갱신이 없다면 `FOR UPDATE` 없이 `INSERT IGNORE`와 잠금 없는 일반 조회를 짧은 별도 트랜잭션으로 분리해 잠금 읽기와 락 수명을 줄인다. 중복 확인의 S 락 자체는 남으므로 경합이 사라지는 것이 아니라 짧아지는 것이다 ([[Lock-Deadlock|DB 데드락]] 참고).

```sql
INSERT INTO account_balance (account_id, balance, updated_at)
VALUES (42, 1000, NOW()) AS incoming
ON DUPLICATE KEY UPDATE
  balance = incoming.balance,
  updated_at = incoming.updated_at;
```

MySQL 8.4에서는 새 값을 가리킬 때 row alias를 사용할 수 있다. `VALUES(column)` 방식은 deprecated 상태다. 테이블에 여러 UNIQUE 인덱스가 있다면 입력 한 행이 서로 다른 기존 행과 각각 충돌할 수 있으므로, UPSERT의 식별 키를 하나로 설계하거나 사전 조회와 트랜잭션으로 의도를 분리한다.

### UPSERT와 IGNORE가 소모하는 AUTO_INCREMENT

MySQL 8.4 InnoDB의 기본 `innodb_autoinc_lock_mode`는 row-based replication과의 호환을 위한 2(interleaved)이며 동적 변수가 아니라 재시작해야 바꿀 수 있다. `INSERT ... ON DUPLICATE KEY UPDATE`는 mixed-mode insert로 분류되고, 매뉴얼은 최악의 경우 INSERT 뒤 UPDATE와 같아 할당된 값이 갱신 단계에서 쓰이지 않을 수 있다고 적는다. 한 번 생성된 값은 문장이 끝나지 않거나 트랜잭션이 롤백돼도 되돌려지지 않는다.

- 8.4.6 기본 설정 재현에서 같은 키로 ODKU 갱신을 두 번 하자 다음 새 행의 id가 두 칸 건너뛰었고, UNIQUE 보조 키가 중복된 `INSERT IGNORE` 두 번도 값을 두 개 소모했다. IGNORE의 할당 시점은 매뉴얼에 명시가 없으므로 대상 버전에서 확인한다.
- `MAX(id)`나 테이블의 AUTO_INCREMENT 값을 행 수, 주문 수 같은 업무 지표로 쓰지 않는다. 건수는 `COUNT`나 집계 테이블로 구한다. 롤백과 bulk insert의 과대 할당도 간격을 만든다([[Primary-Key-Strategy#Auto increment|Auto increment]]).
- 카운터, 일별 통계처럼 UPSERT가 잦은 테이블은 실제 행 수보다 ID가 훨씬 빨리 는다. 정수 컬럼이 값을 다 쓰면 다음 INSERT는 중복 키 오류를 내므로 `BIGINT`를 쓰거나 타입 상한(`INT` 2,147,483,647, `INT UNSIGNED` 4,294,967,295) 대비 여유를 감시한다.
- `(user_id, stat_date)`처럼 자연 키로 식별이 끝나는 UPSERT 테이블은 대리 AUTO_INCREMENT PK 대신 자연 복합 PK를 검토한다.
- 간격 없는 연속 번호가 법적 요구라면 AUTO_INCREMENT가 아니라 별도 채번 행과 트랜잭션으로 발급한다. ULID, UUID로 바꾸면 ID를 순번으로 읽을 여지는 사라지지만 PK 폭과 삽입 지역성 비용이 있다([[Primary-Key-Strategy|Primary Key 전략]]).

## 배치 삽입

- 여러 단건 요청 대신 multi-row `VALUES`로 네트워크 왕복과 문장 파싱 비용을 줄인다.
- 테이블 간 이동은 `INSERT ... SELECT`로 서버 안에서 처리한다. 대상 컬럼을 명시하고 변환, 중복, NULL 정책을 검증하며, 원본 테이블에 걸리는 잠금을 아래에서 확인한다.
- 파일 적재는 `LOAD DATA`가 빠르지만 `LOCAL`, `IGNORE`, `REPLACE`에 따라 파일 위치, 권한과 오류 의미가 달라진다.
- 한 번에 너무 많은 행을 묶으면 redo, binlog, lock 보유 시간과 재시도 비용이 커진다. 처리량과 tail latency를 함께 측정해 batch 크기를 정한다.
- 재시도 가능한 작업은 비즈니스 멱등 키를 UNIQUE로 강제하고, 어떤 충돌 동작을 성공으로 볼지 API 계약에 포함한다.

### INSERT ... SELECT가 원본에 거는 잠금

InnoDB는 `INSERT INTO T SELECT ... FROM S WHERE ...`에서 T에 넣은 행마다 gap 없는 X record lock을 건다. S는 READ COMMITTED면 잠금 없는 consistent read로 읽고, 그 밖의 격리 수준(기본 REPEATABLE READ 포함)에서는 S의 행에 shared next-key lock을 건다. statement 기반 binlog로 roll-forward할 때 모든 문장이 원래와 똑같이 실행되어야 하기 때문이다. `CREATE TABLE ... SELECT`도 같은 방식으로 읽는다.

- RR에서 운영 테이블을 원본으로 한 큰 `INSERT ... SELECT`(아카이브, 백필, 요약 적재)는 읽은 범위의 행과 gap에 S lock을 트랜잭션 끝까지 쥐고 원본의 UPDATE, DELETE, INSERT를 기다리게 한다.
- keyset 청크와 짧은 커밋으로 나누고([[MySQL-Long-Transactions-and-Batch|장기 트랜잭션과 배치]]), binlog가 row 형식이면 그 세션만 READ COMMITTED로 실행하거나 애플리케이션이 읽어 배치 삽입하는 방식을 비교한다.

### 조건부 INSERT는 중복 방지가 아니다

```sql
INSERT INTO coupon_issue (user_id, coupon_id)
SELECT :user_id, :coupon_id FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM coupon_issue
  WHERE user_id = :user_id AND coupon_id = :coupon_id
);
```

존재 확인을 애플리케이션의 별도 조회 대신 한 문장에 넣어도 동시 요청 사이의 경쟁은 남는다.

- READ COMMITTED: 존재 검사가 잠금 없는 consistent read라 동시 요청이 함께 통과한다. UNIQUE가 없으면 중복 행이 생긴다.
- REPEATABLE READ: 존재 검사가 빈 key 위치의 gap에 S lock을 잡는다(8.4.6 `performance_schema.data_locks`에서 `S,GAP`과 supremum의 `S` 확인). gap lock은 서로 공존하므로 두 세션이 S lock을 쥔 채 insert intention lock을 요청하면 서로 기다려 deadlock(1213)이 나고 한쪽이 롤백된다([[MySQL-Gap-Lock#INSERT Intention과 deadlock 경계|INSERT Intention과 deadlock]]).
- 8.4.6에서 네 세션이 같은 키 3,000개를 동시에 넣은 1회 재현(UNIQUE 없음, autocommit)에서 RC는 중복 행 8,272건을 남겼고, RR은 중복 없이 세션마다 시도의 약 40~55%가 1213으로 롤백됐다. 롤백된 뒤 재시도하지 않은 466개 키는 행이 아예 남지 않았다.
- 최종 방어선은 `(user_id, coupon_id)` UNIQUE 제약이다. 생성 의도는 `INSERT IGNORE`나 no-op ODKU로 표현하고 affected rows로 신규 여부를 판별하며, 1213은 멱등 재시도한다. `WHERE NOT EXISTS`는 중복 시도를 줄이는 보조 수단이다.
- no-op ODKU의 affected rows는 신규 1, 기존 행 0이지만 `CLIENT_FOUND_ROWS`로 접속하면 기존 행도 1이다. Node.js mysql2는 이 flag를 기본으로 켜므로 8.4.6에서 신규와 중복이 모두 1이었다. flag를 끄면 같은 connection의 UPDATE 의미도 바뀌므로, 이 경로의 신규 판별은 신규 1, 중복 0을 돌려주는 `INSERT IGNORE`로 한다([[DML-Conflict-and-Batch-Patterns-Update-Delete#affected rows는 changed인가 matched인가|affected rows 기준]]).
- 부모의 존재와 상태를 `WHERE EXISTS`로 확인하는 조건부 INSERT도 판단 시점의 문제가 같다. 8.4.6에서 REPEATABLE READ는 부모 PK 레코드에 S lock을 걸어 커밋 전 부모의 변경과 삭제를 막았지만, READ COMMITTED는 잠그지 않으므로 판단 직후 부모가 비활성화되거나 삭제될 수 있다. 부모 존재는 FK로 강제하고(FK 검사도 부모 레코드에 S lock을 건다), 상태 조건까지 묶어야 하면 부모 행을 `FOR SHARE`로 읽은 뒤 같은 트랜잭션에서 삽입한다.
- 대상 테이블을 읽는 subquery를 `VALUES` 안에 두면 오류 1093이 나지만, 위처럼 `INSERT ... SELECT`의 WHERE에 두는 형태는 8.4.6에서 실행된다.

## UPDATE와 DELETE

기존 행을 바꾸는 패턴은 [[DML-Conflict-and-Batch-Patterns-Update-Delete|MySQL UPDATE와 DELETE 패턴]]으로 분리했다. 조건부 차감과 affected rows의 changed, matched 기준, SET 대입 순서, CASE 조건부 UPDATE, 같은 테이블을 읽는 서브쿼리 제한, JOIN UPDATE와 읽기 테이블 잠금, chunk 삭제와 저장 프로시저 반복을 다룬다.

## 선택 체크리스트

1. 중복은 오류, 무시, 부분 갱신, 완전 교체 중 무엇인가?
2. 부분 성공과 warning을 호출자가 구분할 수 있는가?
3. 여러 UNIQUE 키가 같은 UPSERT에 참여해도 의미가 하나인가?
4. 영향 행 수가 비즈니스 성공 조건과 일치하는가?
5. batch 중단 뒤 같은 범위부터 안전하게 재시작할 수 있는가?
6. 실행 계획, lock wait, redo와 replica lag를 관찰하고 있는가?

## 출처

- [MySQL 8.4 Reference Manual, INSERT](https://dev.mysql.com/doc/refman/8.4/en/insert.html)
- [MySQL 8.4 Reference Manual, Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [DB Lock으로 동시성을 해결하려다 Deadlock을 만난 이야기 — velog](https://velog.io/@joona95/DB-Lock%EC%9C%BC%EB%A1%9C-%EB%8F%99%EC%8B%9C%EC%84%B1%EC%9D%84-%ED%95%B4%EA%B2%B0%ED%95%98%EB%A0%A4%EB%8B%A4-Deadlock%EC%9D%84-%EB%A7%8C%EB%82%9C-%EC%9D%B4%EC%95%BC%EA%B8%B0)
- [데드락을 해결하려다, 락을 줄이게 된 이야기 — 여기어때 기술블로그](https://techblog.gccompany.co.kr/%EB%8D%B0%EB%93%9C%EB%9D%BD%EC%9D%84-%ED%95%B4%EA%B2%B0%ED%95%98%EB%A0%A4%EB%8B%A4-%EB%9D%BD%EC%9D%84-%EC%A4%84%EC%9D%B4%EA%B2%8C-%EB%90%9C-%EC%9D%B4%EC%95%BC%EA%B8%B0-97bf2b0c91b6)
- [선착순 수강신청 동시성 이슈 — Nextree 기술블로그](https://www.nextree.io/seoncagsun-sugang-sinceong-dongsiseong-isyu/)
- [MySQL 8.4 Reference Manual, INSERT ON DUPLICATE KEY UPDATE](https://dev.mysql.com/doc/refman/8.4/en/insert-on-duplicate.html)
- [MySQL 8.4 Reference Manual, REPLACE](https://dev.mysql.com/doc/refman/8.4/en/replace.html)
- [MySQL 8.4 Reference Manual, LOAD DATA](https://dev.mysql.com/doc/refman/8.4/en/load-data.html)
- [MySQL 8.4 Reference Manual, INSERT ... SELECT](https://dev.mysql.com/doc/refman/8.4/en/insert-select.html)
- [MySQL 8.4 Reference Manual, AUTO_INCREMENT Handling in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-auto-increment-handling.html)
- [MySQL 8.4 Reference Manual, InnoDB Startup Options and System Variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_autoinc_lock_mode)
- [MySQL 8.4 Reference Manual, Information Functions](https://dev.mysql.com/doc/refman/8.4/en/information-functions.html)
- [connection_config.js — node-mysql2 GitHub](https://github.com/sidorares/node-mysql2/blob/master/lib/connection_config.js)
- [인프런, Hong, INSERT 기초](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367624)
- [인프런, Hong, INSERT 응용](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367627)
- [인프런, Hong, MySQL Transaction Deep Dive (LifeCycle, Autocommit, Statement vs Row based)](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=373900)
- [인프런, Hong, INSERT 최적화](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338549)

## 관련 문서

- [[Transactions|트랜잭션]]
- [[MySQL-SQL-Mode|MySQL SQL Mode]]
- [[Lock|DB Lock]]
- [[Lock-Deadlock|DB 데드락]]
- [[Schema-Design|스키마 설계]]
- [[Execution-Plan|실행 계획]]
- [[DML-Conflict-and-Batch-Patterns-Update-Delete|MySQL UPDATE와 DELETE 패턴]]
- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]]
