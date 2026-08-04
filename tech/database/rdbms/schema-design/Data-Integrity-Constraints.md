---
tags: [database, integrity, constraint, not-null, unique, check, foreign-key]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Data Integrity Constraints", "데이터 무결성 제약", "DB Constraints"]
---

# 데이터 무결성과 제약 조건

데이터 무결성은 저장된 값이 정의된 domain, entity identity, 관계와 업무 불변식을 계속 만족하는 성질이다. Application validation은 사용자에게 좋은 오류를 제공하고, DB constraint는 batch/운영 SQL을 포함한 모든 write path의 마지막 방어선이 된다.

## 무결성의 층

| 층 | 질문 | 대표 장치 |
|---|---|---|
| Domain | 값 하나가 유효한가? | type, `NOT NULL`, `CHECK` |
| Entity | row가 유일하게 식별되는가? | `PRIMARY KEY`, `UNIQUE` |
| Referential | 참조 대상이 존재하는가? | `FOREIGN KEY` |
| Cross-row/business | 여러 row의 상태가 규칙을 지키는가? | transaction, lock/CAS, ledger, reconciliation |

DB가 표현할 수 있는 규칙은 constraint로 두고, 여러 aggregate/외부 system을 가로지르는 정책은 application workflow와 사후 대사로 보완한다.

## 기본 제약

### NOT NULL

값 부재가 유효한 상태가 아니라면 `NOT NULL`로 표현한다. 빈 문자열, 0 또는 임의 sentinel은 NULL을 피하는 일반 해법이 아니다. unknown/not-applicable/not-yet-known이 서로 다른 의미라면 상태/별도 relation으로 모델링한다.

### DEFAULT

Default는 column을 생략했을 때 값을 채우는 생성 규칙이지 입력 유효성 검사가 아니다. 업무상 필수 선택을 `DEFAULT 'PENDING'`으로 조용히 대체해도 되는지 확인한다. 시간 default도 business event 시각과 storage 시각을 혼동하지 않는다.

### PRIMARY KEY와 UNIQUE

PK는 row identity이며 non-null unique다. 다른 candidate key는 `UNIQUE`로 보존한다. MySQL unique index는 nullable column의 여러 NULL을 허용하므로 활성 row 하나, optional key와 soft delete 규칙을 단순 composite unique로 잘못 표현하지 않는다.

### CHECK

```sql
CHECK (quantity > 0),
CHECK (discount_amount >= 0),
CHECK (valid_to IS NULL OR valid_to > valid_from)
```

CHECK는 현재 row의 값 범위/조합에 적합하다. 다른 table 조회, 현재 시각에 따라 계속 변하는 규칙이나 복잡한 상태 machine에는 맞지 않는다. MySQL version의 CHECK enforcement와 허용 expression을 migration 전에 확인한다.

## FOREIGN KEY

FK는 child key가 parent의 candidate key를 참조하도록 보장하고 `RESTRICT/CASCADE/SET NULL` 같은 parent 변경 정책을 정의한다. 다음까지 자동 보장하지는 않는다.

- 같은 tenant의 row끼리 연결됐는가
- parent가 active 상태인가
- 업무상 허용된 상태 전이인가
- join이 올바른 column/grain을 사용했는가

필요하면 tenant key를 composite FK/UNIQUE에 포함하거나 application policy를 추가한다. 상세한 storage engine 조건과 운영 tradeoff는 [[Foreign-Key-Integrity|외래 키와 참조 무결성]]에서 다룬다.

## 여러 row의 불변식

`balance >= 0`, 재고 상한과 동일 coupon 1회 사용은 단순 read-then-write validation만으로 동시 요청을 막지 못한다.

- 조건부 update: `UPDATE ... SET balance = balance - ? WHERE balance >= ?`
- row/range lock과 transaction
- version column을 사용한 compare-and-swap
- append-only ledger와 balance projection
- 업무 key의 unique constraint/idempotency key

선택한 방식의 conflict retry, 사용자 응답과 timeout 뒤 결과 확인을 함께 설계한다. Isolation level만 높이면 모든 business invariant가 자동으로 지켜지는 것은 아니다.

## Constraint migration

운영 table에 제약을 추가하기 전에 기존 위반 row를 조사한다.

1. 위반 유형과 수를 read-only query로 측정한다.
2. 새 writer가 더 이상 위반을 만들지 않게 application을 먼저 배포한다.
3. deterministic backfill/정리와 audit를 수행한다.
4. 대상 DB version의 validation/lock/online DDL 동작을 확인한다.
5. constraint를 추가하고 위반 metric을 계속 감시한다.

제약을 잠시 끄고 import한 뒤 다시 켠다고 기존 row가 모두 자동 검증되는 것은 DBMS별로 다르다. MySQL의 `foreign_key_checks`도 재활성화만으로 비활성 기간의 기존 row를 소급 검사하지 않는다.

## NestJS와 TypeORM 적용

- DTO validation은 빠른 4xx 응답용, DB constraint는 race와 우회 writer 방어용으로 함께 둔다.
- `nullable`, `unique`, relation option만 믿지 않고 생성 migration의 실제 DDL을 review한다.
- DB constraint 이름을 안정적으로 정하고 driver error를 domain conflict로 mapping한다.
- 여러 write는 transactional EntityManager 하나를 사용하고 외부 API는 local constraint만으로 원자화할 수 없음을 드러낸다.
- test에서 validation decorator만이 아니라 실제 DB의 unique/FK/CHECK 위반과 rollback을 확인한다.

## 출처

- [MySQL 8.4, PRIMARY KEY and UNIQUE Constraints](https://dev.mysql.com/doc/refman/8.4/en/constraint-primary-key.html)
- [MySQL 8.4, CHECK Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html)
- [MySQL 8.4, FOREIGN KEY Constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html)
- [Oracle AI Database 26ai, Constraint](https://docs.oracle.com/en/database/oracle/oracle-database/26/sqlrf/constraint.html)
- Oracle 11g 강의: [무결성 제약 조건 1](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4665), [무결성 제약 조건 2](https://www.inflearn.com/courses/lecture?courseId=34982&unitId=4666)
- 강의: [무결성이 중요한 이유](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328809), [기본 제약](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328810), [FK](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328811), [CHECK](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328812), [정리](https://www.inflearn.com/courses/lecture?courseId=338212&unitId=328813)

## 관련 문서

- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Primary-Key-Strategy|Primary Key 전략]]
- [[Normalization|정규화]]
- [[Transactions|Transaction]]
- [[Soft-Delete-and-Data-Lifecycle|Soft delete와 unique constraint]]
