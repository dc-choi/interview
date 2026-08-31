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

## 규칙을 어느 계층에 둘 것인가

위의 층 분류가 규칙 유형에서 장치로 가는 매핑이라면, 여기서는 그 장치를 DB와 application 중 어디에 두고 왜 그렇게 두는지를 정한다. 로직 배치 자체의 확장성 논거는 [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]가 소유한다.

| 규칙 유형 | 배치 | 근거 |
|---|---|---|
| 단일 값의 domain (범위, 형식, 필수) | 둘 다 | 앱은 필드 단위 오류 메시지, DB는 우회 writer 차단 |
| row 유일성 (업무 key, 멱등 key) | DB 우선 | 중복은 동시 요청에서 생기므로 앱의 조회 후 삽입만으로는 막지 못한다 |
| 참조 존재 | DB 우선 | 고아 row는 사후 탐지가 비싸고 제약 한 줄로 표현된다 |
| 교차 row 불변식 (잔액, 재고) | DB 판정 + 앱 조율 | 조건부 update와 lock으로 DB가 판정하고 앱은 재시도와 사용자 응답을 설계 |
| 상태 전이와 워크플로 | 앱 | 허용 전이가 조회 맥락과 시간에 따라 바뀌어 제약식으로 굳히기 어렵다 |
| 서비스 경계 밖과 외부 시스템 | 앱 + 사후 대사 | 하나의 transaction으로 묶이지 않으므로 대사 배치로 수렴시킨다 |

### 이중 배치의 원칙

같은 규칙을 양쪽에 두는 것은 중복이 아니라 역할 분담이다. 앱 검증은 조기 실패와 필드 단위 오류 메시지를 담당하고, DB 제약은 batch SQL, 운영 콘솔 접속과 다른 서비스의 writer까지 포함한 최후 방어선을 담당한다.

- 규칙의 정의 소유권은 한 곳에 둔다. 한도 상수와 허용 값 집합을 한쪽에서 정의하고 다른 쪽은 거기서 파생시키면 두 값이 따로 움직이지 않는다.
- 두 곳이 어긋나면 DB 제약이 진실이다. 앱만 통과한 값은 저장되지 못해 정체불명의 오류로 보이고, DB만 통과한 값은 이미 저장된 뒤라 정리 대상이 된다.
- 앱 검증만 지우면 오류 품질이 나빠지고, DB 제약만 지우면 데이터가 무너진다. 하나만 남긴다면 DB 제약을 남긴다.

### 제약으로 굳힐 수 없는 규칙의 행선지

CHECK가 감당하지 못하는 유형은 위 CHECK 절에 정리했다. 각 유형을 어디로 옮기는지는 다음과 같다.

- 다른 table 조회가 필요한 조건: 참조 존재만 FK로 남기고 나머지 판정은 앱 검증으로 옮긴다.
- 현재 시각에 따라 판정이 바뀌는 규칙: 제약 대신 조회 조건과 만료 배치로 옮긴다. 과거에 유효했던 row가 나중에 위반이 되면 migration과 복구가 막힌다.
- 상태 machine: 전이 판정은 앱이 하고, 동시성만 `WHERE status = ?`를 붙인 조건부 update로 DB에 맡긴다.
- 테넌트 경계: `(tenant_id, key)` composite UNIQUE와 composite FK로 승격한다. 전역 UNIQUE는 테넌트별 유일성을 표현하지 못한다.

### 제약 위반의 관측

앱 검증에서 걸린 건수와 DB 제약에서 걸린 건수를 나눠 metric으로 남긴다. 규칙이 실제로 앞단에서 걸리는지, 아니면 DB가 최후 방어선을 매번 실행하고 있는지가 여기서 갈린다. 후자가 꾸준히 관측되면 앱 검증이 빠졌거나 예상하지 못한 writer가 있다는 신호다.

## 제한된 선택지 컬럼: Enum vs 참조 테이블

상태값, 역할, 타입처럼 허용 값이 정해진 컬럼은 값 집합이 앞으로 늘거나 바뀔 여지가 있는가를 기준으로 고른다.

| 성격 | 예 | 권장 |
|---|---|---|
| 항목이 늘거나 바뀔 수 있음 | Role(권한 추가), JoinStatus(상태 단계 추가) | 참조 테이블(lookup table) — 값 추가가 INSERT 한 줄, 라벨 같은 부가 속성 확장, FK로 무결성 보장 |
| 사실상 불변인 소수 상태값 (값 불변, 부가 메타데이터와 이식성 요구 없음이 전부 확실할 때만) | 요일 구분처럼 고정된 집합 | DB enum 또는 CHECK 제약 — 조인 없이 간단, 값이 늘면 마이그레이션 부담 |

- 어느 쪽이든 목표는 DB 수준에서 유효하지 않은 값의 삽입을 방지하는 것이다. 참조 테이블은 FK로, enum/CHECK는 제약으로 방어선을 만든다. 판단이 애매하면 참조 테이블이 기본값이다 ([[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴]] 기준).
- DB 네이티브 ENUM의 함정은 [[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴]], 표시 메타데이터와 캐시까지 포함한 운영은 [[Common-Code-Management|공통 코드 관리]]가 소유한다.

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
- [[Business-Logic-App-vs-DB|비즈니스 로직 위치]]
- [[Normalization|정규화]]
- [[Transactions|Transaction]]
- [[Isolation-Level|격리 수준]]
- [[Soft-Delete-and-Data-Lifecycle|Soft delete와 unique constraint]]
