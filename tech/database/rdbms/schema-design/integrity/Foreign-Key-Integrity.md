---
tags: [database, rdbms, mysql, foreign-key, referential-integrity]
status: done
verified_at: 2026-10-05
category: "Data & Storage - RDB"
aliases: ["외래 키 설계", "Foreign Key Integrity", "참조 무결성"]
---

# 외래 키와 참조 무결성

외래 키는 child의 참조 값이 parent의 candidate key에 존재하도록 강제한다. 여러 쓰기 경로가 같은 DB를 사용할 때 애플리케이션을 우회한 고아 행도 막을 수 있지만, 업무 의미 전체나 올바른 JOIN 조건까지 보장하지는 않는다.

## 무엇을 보장하고 무엇을 보장하지 않는가

외래 키가 보장하는 것은 구조적 참조다.

- 존재하지 않는 parent key를 child에 삽입하거나 갱신하는 작업을 거부한다.
- parent key 삭제와 갱신 시 선언한 referential action을 적용한다.
- InnoDB는 deferred FK를 제공하지 않으므로 관련 DML을 검사하는 시점마다 제약을 강제한다.

다음은 별도 설계가 필요하다.

- `order.customer_id = payment.customer_id`처럼 문법상 가능하지만 업무상 틀린 JOIN
- 같은 조직의 자원만 연결해야 한다는 tenant 경계
- 시작일이 종료일보다 앞서야 한다는 행 내부 규칙
- 주문 상태 전이, 잔액 보존 같은 여러 행의 비즈니스 불변식

FK가 있다는 이유로 JOIN의 컬럼과 결과 grain 검증을 생략하면 안 된다.

### NULL인 FK는 검사하지 않는다

FK 컬럼이 NULL이면 부모를 찾지 않는다. 선택 관계를 nullable FK로 표현하는 근거지만 복합 FK에서는 함정이 된다. MySQL은 표준의 MATCH SIMPLE 의미를 따르므로 `(tenant_id, parent_id)` 같은 복합 FK에서 한 컬럼만 NULL이어도 나머지 값이 부모에 없는 행이 들어간다. MySQL은 `MATCH` 절을 문법으로만 받고 강제하지 않으며 `SHOW CREATE TABLE`에도 남기지 않는다. 매뉴얼은 `MATCH`를 쓰면 ON DELETE, ON UPDATE가 무시된다고 적지만 8.4.11 재현에서는 `MATCH FULL`과 함께 쓴 `ON DELETE CASCADE`, `MATCH SIMPLE`과 함께 쓴 `ON UPDATE CASCADE`가 모두 동작했다. 효과가 없고 문서와 동작도 어긋나므로 쓰지 않는다. 일부 NULL을 막으려면 FK 컬럼을 모두 `NOT NULL`로 두거나 `CHECK ((tenant_id IS NULL) = (parent_id IS NULL))` 같은 제약을 더한다. 다만 MySQL은 `ON DELETE SET NULL`이나 `ON UPDATE CASCADE`처럼 FK 동작이 값을 바꾸는 컬럼을 CHECK에 쓰면 오류 3823으로 거부한다. 매뉴얼은 ON UPDATE, ON DELETE 동작 전체를 금지 대상으로 적지만 8.4.11에서는 동작을 생략하거나 `RESTRICT`, `NO ACTION`, `ON DELETE CASCADE`만 둔 FK에는 이 CHECK를 함께 둘 수 있었다. PostgreSQL은 `MATCH FULL`로 일부만 NULL인 행을 거부할 수 있다.

## MySQL InnoDB 정의 조건

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) ENGINE = InnoDB;
```

- parent와 child는 같은 storage engine을 사용해야 한다.
- 정수와 고정 소수점 참조 컬럼은 크기와 sign이 같아야 한다. 문자형은 charset과 collation이 같아야 한다.
- child FK 컬럼은 같은 순서의 인덱스 선두 컬럼이어야 한다. 없으면 MySQL이 사용할 수 있는 인덱스를 자동 생성한다. 이 자동 인덱스는 FK를 받칠 수 있는 다른 인덱스를 만들면 조용히 제거될 수 있으므로, 단독으로 남겨야 하는 인덱스는 이름을 붙여 명시적으로 만든다([[Index-Write-Cost-and-Cleanup#접두사 중복이어도 남길 인덱스|접두사 중복이어도 남길 인덱스]]).
- referenced key는 PK 또는 UNIQUE candidate key로 설계한다. InnoDB의 non-unique key 참조 확장은 MySQL 8.4에서 deprecated이고 별도 설정이 필요하다.
- InnoDB user-partitioned table은 parent와 child 모두 FK를 지원하지 않는다.

자동 생성된 child 인덱스가 실제 조회의 복합 조건까지 만족한다는 뜻은 아니다. 예를 들어 `WHERE customer_id = ? AND created_at >= ?`가 핵심이면 `(customer_id, created_at)`을 별도로 검토한다. 반대로 FK 컬럼만으로 한 고객의 행이 수백 건 이하로 좁혀지면 복합 인덱스가 쓰기 비용만 늘리는 과잉 최적화일 수 있다([[Index-Composite-Design#추가 전 판단|추가 전 판단]]).

## Referential action 선택

| action | parent 변경 시 의미 | 적합한 예 | 주의점 |
|---|---|---|---|
| `RESTRICT` 또는 InnoDB `NO ACTION` | 관련 child가 있으면 즉시 거부 | 보존해야 하는 주문의 고객 삭제 | 삭제 절차를 명시적으로 만들 필요 |
| `CASCADE` | child key를 갱신하거나 child를 삭제 | 부모 없이 의미 없는 내부 구성 요소 | 예상보다 큰 lock과 삭제 파급 범위 |
| `SET NULL` | 참조를 끊고 child를 남김 | 담당자 해제처럼 독립 생존 가능 | child 컬럼이 nullable이어야 함 |

InnoDB의 `NO ACTION`은 deferred constraint가 아니라 `RESTRICT`와 같은 즉시 검사다. cascade는 편리하지만 데이터 보존 요구, 감사 로그와 최대 fan-out을 먼저 확인한다.

## 순환 참조와 적재 순서

부서의 `leader_id`가 직원을, 직원의 `dept_id`가 부서를 참조하면 두 테이블이 서로를 참조한다. 아직 없는 테이블은 참조할 수 없으므로 먼저 만드는 쪽은 FK 없이 만들고, 두 테이블이 생긴 뒤 추가한다.

```sql
ALTER TABLE department
  ADD CONSTRAINT fk_department_leader
  FOREIGN KEY (leader_id) REFERENCES employee(id)
  ON DELETE SET NULL;
```

데이터 적재도 같은 문제를 가진다. 직원을 먼저 넣을 때 `dept_id`를 NULL로 두고, 부서를 넣은 뒤 UPDATE로 채우려면 그 FK 컬럼이 nullable이어야 한다. MySQL은 FK를 문장의 행마다 즉시 검사하고 commit까지 미루지 않으므로, 두 행이 서로를 NOT NULL로 참조하는 순환은 적재 순서로 풀 수 없다. 한쪽을 nullable로 두거나 리더 지정처럼 나중에 생기는 관계를 별도 테이블로 분리한다. PostgreSQL은 `DEFERRABLE` 제약으로 검사를 commit 시점까지 미룰 수 있다. 대량 적재에서 `foreign_key_checks = 0`으로 순서를 우회했다면 아래 운영 주의점처럼 재활성화 뒤 별도 검증이 필요하다.

## FK를 빼는 이유와 유지할 조건

FK를 쓰지 않는 선택은 대개 다음 비용 중 하나에서 출발한다.

- **쓰기 경로의 검증과 잠금**: InnoDB는 FK 조건을 검사하는 insert, update, delete가 확인한 레코드에 shared record lock을 건다. 인기 상품이나 큰 계정 같은 소수 부모에 자식 쓰기가 몰리면 잠금 경합과 데드락 경로가 늘고, 대량 적재와 삭제 배치는 행마다 참조 검사를 치른다.
- **온라인 스키마 변경 도구와의 충돌**: gh-ost는 FK 제약을 지원하지 않는다. pt-online-schema-change는 참조되는 테이블을 바꿀 때 `--alter-foreign-keys-method`를 요구하고, `drop_swap`은 원본 테이블이 잠시 사라지는 구간이 생기는 등 방식마다 위험이 다르다. 절차는 [[Schema-Migration-Large-Table|대용량 스키마 변경]]에서 고른다.
- **저장소 분리**: 서비스별 DB, 샤드, 아카이브 저장소로 부모와 자식이 갈라지면 물리 FK를 걸 수 없다. 분산 DB의 FK 지원 범위는 제품과 시점마다 다르므로 도입 시 공식 문서로 확인한다.

반대로 다음 조건이면 FK를 기본값으로 유지한다.

- 결제, 정산, 재고처럼 참조가 깨지면 곧 금전과 법적 문제가 되는 데이터
- 여러 서비스, 배치와 운영 SQL이 같은 단일 DB에 직접 쓰는 모놀리식 구조
- 트래픽이 낮아 검증 비용보다 사고 비용이 확실히 큰 시스템

유행이 아니라 도메인의 정합성 요구와 쓰기 규모가 결정한다. 일시적으로 끄는 `foreign_key_checks = 0`은 FK를 쓰는 것도 빼는 것도 아닌 상태를 만들기 쉬우므로 아래 운영 주의점의 제한을 따른다.

## FK를 애플리케이션에서만 관리한다면

샤딩으로 parent와 child가 다른 노드에 있거나, 대규모 적재와 스키마 전환에서 제약 비용을 통제해야 하는 경우 DB FK를 사용하지 않을 수 있다. 이 선택은 무결성이 필요 없다는 뜻이 아니라 보장 주체를 옮기는 것이다.

최소한 다음 보완 장치를 둔다.

- 모든 쓰기 경로가 공유하는 service boundary와 transaction 규칙
- child 참조 컬럼의 조회 인덱스
- 고아 행을 주기적으로 탐지하는 reconciliation query와 지표
- parent 삭제 전 참조 검사, tombstone 또는 outbox 기반 정리 절차
- backfill과 장애 재시도가 멱등한지 확인하는 UNIQUE 제약
- 데이터 이관 전후 고아 행 수 검증

고아 행 탐지는 부모가 사라진 자식을 찾는 anti join으로 시작한다. 대상 행 수와 인덱스를 확인하고 범위를 나눠 실행한다.

```sql
SELECT c.id, c.order_id
FROM order_items c
LEFT JOIN orders p ON p.id = c.order_id
WHERE c.order_id IS NOT NULL
  AND p.id IS NULL
LIMIT 1000;
```

DB 제약이 없는 참조는 스키마 어디에도 흔적이 남지 않는다. `<대상>_id` 명명 규칙, 논리 ERD와 스키마 문서에 참조 관계와 삭제 정책을 남기는 Soft FK 관례로 관계를 드러낸다. ORM의 `ManyToOne` 같은 관계 매핑은 FK 없이도 JOIN을 만들지만 무결성을 보장하지 않으므로, 팀이 이를 제약으로 오해하지 않게 문서에 명시한다.

단일 DB 안에서 여러 서비스, 배치와 운영 SQL이 직접 쓰는 구조라면 FK가 제공하는 공통 방어선의 가치가 커진다. 반대로 분산 경계를 넘는 관계에는 DB FK를 걸 수 없으므로 보상 통제가 필수다.

## 엔진별 참조 컬럼 인덱스

- MySQL InnoDB는 child FK 컬럼을 선두로 하는 인덱스를 요구하고, 없으면 FK 생성 시 자동으로 만든다.
- PostgreSQL은 FK를 선언해도 참조하는 쪽 컬럼에 인덱스를 만들지 않는다. 부모 행 `DELETE`나 참조 컬럼 `UPDATE`는 자식 테이블에서 옛 값을 찾아야 하므로, 인덱스가 없으면 큰 자식 테이블을 훑게 된다. 부모 삭제와 조인 경로가 있으면 참조 컬럼 인덱스를 직접 만든다.
- MySQL에서 PostgreSQL로 옮길 때 이 차이로 인덱스가 빠지기 쉽다. 이관 체크리스트에 FK별 참조 컬럼 인덱스 존재 여부를 넣는다.

## 운영 주의점

- 큰 cascade는 하나의 작은 DML처럼 보여도 많은 child row를 잠그고 변경할 수 있다. 영향 행 수와 실행 시간을 사전 측정한다.
- FK 관련 DDL은 연결된 테이블까지 metadata lock에 영향을 줄 수 있다.
- `foreign_key_checks = 0`은 제한된 import 절차에서만 사용한다. 다시 켜도 비활성 기간에 들어온 기존 행을 자동으로 재검사하지 않으므로 별도 검증이 필요하다.
- multi-table UPDATE 또는 DELETE의 optimizer 순서가 parent-child 순서와 충돌할 수 있다. 가능한 한 한 테이블을 바꾸고 선언한 cascade를 사용한다.
- 제약 이름, 삭제 정책과 소유 팀을 schema migration에 명시한다.

## PostgreSQL의 기본 action

PostgreSQL의 생략 action은 NO ACTION이다. DEFERRABLE로 선언하고 deferred 검사를 선택하면 transaction 후반까지 위반을 해결할 여지가 있지만 RESTRICT는 검사를 지연하지 않는다. InnoDB의 NO ACTION = 즉시 RESTRICT와 구분한다. SET DEFAULT라도 default가 참조 key에 없으면 제약 위반을 피하지 못한다.

## 오류 뒤 transaction 상태

InnoDB의 즉시 FK 위반은 일반적으로 실패한 문장을 rollback하며 앞선 성공 DML까지 자동 취소하지는 않는다. 애플리케이션이 전체 업무를 실패시킬 때는 명시적 rollback 또는 transaction wrapper의 예외 전파가 필요하다. PostgreSQL의 오류 뒤 aborted transaction과 SAVEPOINT 복구는 같은 동작으로 가정하지 않는다.

## 생략 action과 SET DEFAULT

MySQL parser가 SET DEFAULT 문법을 인식하더라도 InnoDB는 해당 referential action을 거부한다. InnoDB에서 ON DELETE/UPDATE를 생략하면 NO ACTION이며 즉시 RESTRICT와 같다. 지원하지 않는 action을 ORM 옵션에 넣기 전에 생성 DDL을 확인한다.

## FK 도입 시점과 환경 차이

개발 단계에서 참조 규칙을 검증하면 고아 행과 삭제 순서 오류를 일찍 찾을 수 있다. QA 직전에만 FK를 추가하면 쌓인 위반 데이터 정리와 application 수정이 한꺼번에 필요하다. 운영에서 제거할 성능 근거가 있다면 제약 차이를 migration에 남기고 제약이 있는 정합성 검증과 실제 운영 schema의 부하/삭제 테스트를 각각 둔다. 제거는 데이터 무결성 보완 비용까지 포함한 선택이다.

## FK를 받치는 UNIQUE를 바꿀 때

FK 컬럼의 UNIQUE를 제거해 1:N으로 바꾸려면 먼저 같은 선두 컬럼의 일반 index로 FK 지원을 유지할 수 있는지 검토한다. 필요한 index가 없는데 UNIQUE를 바로 DROP하면 실패할 수 있다. 부득이하게 FK를 제거했다면 무제약 구간의 write를 통제하고 재생성 전 참조 위반을 검증한다. 관계 변경과 인덱스 변경을 같은 migration에서 명시한다.

## Cascade와 보이지 않는 후속 처리

InnoDB의 cascaded FK action은 child trigger를 활성화하지 않는다. child trigger로 audit나 outbox를 만드는 설계라면 cascade로 생긴 변경이 그 경로에 남지 않을 수 있다. CDC도 실제 row event와 connector 지원을 검증하고 자동으로 같은 event를 얻는다고 가정하지 않는다. 명시적 child DML, parent event 기반 후속 처리와 대사 중 요구에 맞는 경로를 정한다.

## 출처

- [MySQL 8.4 Reference Manual, FOREIGN KEY Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [MySQL 8.4 Reference Manual, Locks Set by Different SQL Statements in InnoDB](https://dev.mysql.com/doc/refman/8.4/en/innodb-locks-set.html)
- [PostgreSQL 18 Documentation, Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [gh-ost, Requirements and limitations](https://github.com/github/gh-ost/blob/master/doc/requirements-and-limitations.md)
- [Percona Toolkit Documentation, pt-online-schema-change](https://docs.percona.com/percona-toolkit/pt-online-schema-change.html)
- [인프런, Hong, 참조 무결성과 외래 키](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367636)
- [인프런, Hong, 외래 키 동작](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367637)
- [인프런, Hong, 외래 키가 막지 못하는 잘못된 JOIN](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367639)
- [인프런, Hong, 외래 키의 운영 트레이드오프](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367638)
- [FK 없이 사는 법 — Threads, bear_dba](https://www.threads.com/@bear_dba/post/DccLgcJEzbh)
- [MySQL 8.4 Reference Manual, innodb error handling](https://dev.mysql.com/doc/refman/8.4/en/innodb-error-handling.html)
- [인프런, 기본키와 고유키, 그리고 외래키](https://www.inflearn.com/courses/lecture?courseId=327501&unitId=86860)
- [인프런, 누구나 다 알게 해주는 MySQL DELETE 기본 가이드](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367628)
- [인프런, 식별 관계 vs 비식별 관계 - 다대다(M:N) 2](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347657)
- [인프런, 일대일(1:1) 관계 - [실습] 관계 확장의 유연성](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347643)
- [인프런, 테이블 관계 설계와 기본키와 외래키 제약 조건에 대한 연관관계](https://www.inflearn.com/courses/lecture?courseId=341698&unitId=432801)
- [MySQL 8.4 Reference Manual, FOREIGN KEY Constraint Differences](https://dev.mysql.com/doc/refman/8.4/en/ansi-diff-foreign-keys.html)
- [MySQL 8.4 Reference Manual, CHECK Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html)
- [YouTube, 쉬운코드, SQL의 개념과 데이터베이스 정의](https://www.youtube.com/watch?v=c8WNbcxkRhY)
- [YouTube, 쉬운코드, SQL로 데이터 추가, 수정, 삭제하기](https://www.youtube.com/watch?v=mgnd5JWeCK4)


## 관련 문서

- [[Data-Integrity-Constraints|데이터 무결성과 제약 조건]]
- [[Normalization|정규화]]
- [[Schema-Migration-Large-Table|대용량 스키마 변경]]
- [[SQL-Joins|SQL 조인]]
- [[MySQL-Partitioning|MySQL 파티셔닝]]
- [[Lock-Deadlock|Lock과 Deadlock]]
- [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL]]
