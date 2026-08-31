---
tags: [database, rdbms, schema, migration, compatibility, deployment]
status: done
verified_at: 2026-08-31
category: "Data & Storage - RDB"
aliases: ["Backward Compatibility", "스키마 전후방 호환"]
---

# 스키마 전후방 호환 (Backward Compatibility)

배포는 원자적이지 않다. 마이그레이션이 먼저 나가고 앱 인스턴스가 순차로 교체되는 동안, 구버전 앱과 신버전 앱이 같은 스키마를 동시에 바라보는 구간이 반드시 생긴다. 그래서 호환성은 특정 배포 전략의 부산물이 아니라 마이그레이션 하나하나가 통과해야 하는 판정 기준이다.

이 문서는 DB 스키마와 신구 앱 공존이라는 렌즈만 다룬다. API 버저닝, 이벤트와 메시지 스키마 진화 같은 DB 밖의 계약 일반은 [[Backward-Compatibility-Design|계약 진화 설계]]가 소유한다.

## 후방 호환과 전방 호환

두 방향은 배포와 롤백이라는 서로 반대인 두 이동을 각각 지탱한다.

- 후방 호환(backward compatible)은 신 스키마가 구버전 앱의 쿼리를 깨지 않는 성질이다. 마이그레이션이 앱보다 먼저 나가는 구간을 지탱한다. 마이그레이션 적용 직후부터 마지막 구버전 인스턴스가 사라질 때까지가 이 성질에 걸린 시간이다.
- 전방 호환(forward compatible)은 구 스키마 기준으로 작성된 코드가 신버전 앱이 써 놓은 데이터를 만나도 견디는 성질이다. 롤백 구간을 지탱한다. 신버전이 새 컬럼에 쓰기 시작한 뒤 앱만 되돌리면, 구버전 코드는 자기가 모르는 값이 섞인 테이블을 읽게 된다.
- 배포는 앞으로 가고 롤백은 뒤로 가므로 두 방향이 동시에 필요하다. 후방 호환만 만족하면 배포는 되지만 되돌릴 수 없고, 스키마 롤백이 불가능한 변경과 겹치면 [[Schema-Versioning|스키마 버전 관리]]가 말하는 roll-forward 외에 선택지가 남지 않는다.

## 변경 유형별 breaking 판정

방향은 그 변경이 주로 어느 쪽 호환을 깨는지를 뜻한다. MySQL 8.4와 PostgreSQL 17 문서 기준이다.

| 변경 | 방향 | 판정 | 조건 |
|---|---|---|---|
| 컬럼 추가 (NULL 허용 또는 DEFAULT 있음) | 후방 | 안전 | 컬럼을 모르는 구버전 INSERT에도 기본값이 들어간다 |
| 컬럼 추가 (NOT NULL, DEFAULT 없음) | 후방 | breaking | strict SQL mode에서 그 컬럼을 뺀 INSERT는 에러로 롤백된다 |
| 컬럼 삭제 | 후방 | breaking | 구버전의 SELECT 컬럼 목록과 ORM 매핑이 깨진다 |
| 컬럼 개명 | 양방향 | breaking | 삭제와 추가를 한 번에 하는 것과 같다. 가장 흔한 함정 |
| 타입 확대 (INT을 BIGINT로) | 전방 | 조건부 | 신버전이 쓴 큰 값을 구버전 코드와 그쪽 검증이 감당하는지 확인 |
| 타입 축소, 길이 단축 | 후방 | breaking | 값 절단과 변환 실패. strict mode는 손실이 나는 변환을 실패시킨다 |
| DEFAULT 추가 | 후방 | 안전 | 기존 행은 그대로고 이후 INSERT의 누락분만 채운다 |
| DEFAULT 제거 | 후방 | breaking | 그 컬럼을 생략하던 구버전 INSERT가 NOT NULL이면 실패한다 |
| ENUM 값 추가 | 전방 | 조건부 | 구버전 코드가 모르는 값을 만나 분기에서 떨어질 수 있다 |
| ENUM 값 제거 | 후방 | breaking | 구버전이 쓰려는 값이 거부된다 |
| UNIQUE 추가 | 양방향 | breaking | 기존 중복이 있으면 DDL이 실패하고, 성공해도 제약을 모르는 구버전 쓰기가 위반을 낸다 |
| NOT NULL 강제 | 후방 | breaking | PostgreSQL은 추가 시점에 즉시 검증하므로 backfill 전에는 실패한다 |
| FK 추가 | 양방향 | breaking | 고아 행이 있으면 실패하고, 구버전 쓰기가 참조 무결성을 어길 수 있다 |
| PK 변경 | 양방향 | breaking | 구버전 매핑과 조인이 함께 흔들린다. 사실상 테이블 교체로 취급 |
| 인덱스 추가, 삭제 | 중립 | 조건부 | 결과 집합은 같지만 삭제는 구버전 쿼리를 느리게 만들어 타임아웃을 유발할 수 있다 |

호환 판정과 실행 알고리즘은 별개 판단이다. 후방 호환인 변경이라도 대용량 테이블에서는 락과 부하가 따로 문제이며, 그 영역은 [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]이 소유한다. 제약 자체의 설계 원리는 [[Data-Integrity-Constraints|데이터 무결성 제약]]에 둔다.

## 스키마는 호환인데 앱이 깨지는 경로

DDL 판정만으로는 잡히지 않는 것들이 있다. 표의 안전 판정을 받은 변경이 실제로 장애를 낸 사례는 대부분 여기서 나온다.

- `SELECT *`는 컬럼 개수와 순서 변화에 그대로 노출된다. 결과를 위치로 읽거나 전체 행을 그대로 직렬화하는 코드는 안전한 컬럼 추가만으로도 깨진다.
- 컬럼 목록 없는 `INSERT INTO t VALUES (...)`도 같다. 컬럼이 하나 늘어난 순간 값 개수가 맞지 않는다.
- ORM 엔티티와 실제 컬럼의 매핑이 엄격한 경우, 구버전 엔티티에 없는 NOT NULL 컬럼이 추가되면 구버전 INSERT가 실패한다. TypeORM 기준 실행 순서와 배포 전후 절차는 [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]가 소유한다.
- 캐시된 실행계획과 prepared statement는 스키마 변경 시점에 무효화되며, 재계획 뒤 다른 계획을 잡아 지연이 튈 수 있다.
- 뷰와 리포팅 쿼리는 마이그레이션 리뷰에서 빠지기 쉽다. 컬럼을 참조하는 뷰는 삭제와 개명에 함께 걸린다.
- 앱 밖 소비자를 빼먹는 것이 가장 흔하다. 리드 리플리카를 읽는 배치, CDC 소비자, BI 도구, 데이터 웨어하우스 적재 잡은 배포 파이프라인과 무관하게 구 스키마를 가정하고 돈다.

## 쪼개기 판단

Expand, migrate, contract 3단계 개념 자체는 [[Blue-Green|Blue-Green 배포]]의 DB 스키마 절이 소유한다. 여기서는 어떤 변경을 몇 개 릴리스로 나눌지의 판단만 다룬다.

- 위 표에서 breaking 판정을 받은 변경은 공존 창을 두고 단계적으로 배포한다. 개명과 타입 전환처럼 표현이 바뀌는 변경은 구컬럼과 신컬럼을 함께 다루는 중간 릴리스가 필요하다. NOT NULL, UNIQUE, FK 같은 제약 강화는 기존 writer 정리와 backfill, 검증을 먼저 끝낸 뒤 별도 릴리스에서 강제하며 이중 컬럼이 반드시 필요한 것은 아니다.
- 개명은 개명으로 처리하지 않는다. 신컬럼 추가, 두 컬럼에 동시 쓰기, backfill, 읽기 전환, 구컬럼 삭제로 편다. RENAME은 원자적이라 구버전이 참조할 이름이 한순간에 사라진다.

```sql
-- expand 단계. 구버전은 이 컬럼을 모른 채 계속 돈다
ALTER TABLE users ADD COLUMN display_name VARCHAR(100) NULL;
```

- backfill은 한 트랜잭션이 아니라 PK 범위로 끊은 배치로 돌린다. 긴 단일 UPDATE는 락 보유 시간과 undo, WAL 증가를 키우고 실패 시 처음부터 다시다. 배치 크기 조절과 자원 격리의 일반론은 [[Backfill-Resource-Isolation|백필 자원 격리]]에 둔다.
- 중단 기준을 미리 정한다. 리플리카 지연이 임계를 넘거나 대상 테이블의 쓰기 지연이 올라가면 backfill을 멈추고 재개할 수 있어야 한다. 이것이 배치로 쪼개는 실질적인 이유다.
- NOT NULL, UNIQUE, FK 같은 불변식 강제는 backfill 완료 뒤 별도 마이그레이션으로 미룬다. 같은 릴리스에 넣으면 아직 채워지지 않은 행 때문에 DDL이 실패하거나, 성공하더라도 구버전 쓰기가 곧바로 제약을 위반한다.

## 호환 창과 contract 시점

expand한 구조를 언제 접어도 되는가는 시간이 아니라 조건으로 판정한다. 아래가 모두 참일 때만 contract를 낸다.

- 구버전 앱 인스턴스가 전부 교체되었는가. 오토스케일 그룹, 여러 리전, 별도로 배포되는 워커까지 포함한다.
- 롤백 창이 닫혔는가. 아직 되돌릴 수 있다고 보는 구간이면 전방 호환이 필요하고, contract는 그 전방 호환을 없애는 행위다.
- 배치, 크론, 큐 컨슈머가 구버전 코드로 돌고 있지 않은가. 이들은 웹 인스턴스와 배포 주기가 다른 경우가 많다.
- 외부 소비자와 리포팅 쿼리가 구컬럼을 더 이상 읽지 않는가.

조기 contract의 대가는 명확하다. 앱만 되돌려도 구버전이 읽을 컬럼이 이미 없으므로 롤백 경로가 사라지고, 대응 수단이 roll-forward 하나만 남는다. 반대로 contract를 영영 하지 않으면 스키마에 죽은 컬럼과 이중 쓰기 코드가 쌓인다. 미루는 것이 기본값이 되지 않도록 contract 마이그레이션을 만들 시점을 expand 릴리스에서 함께 정해 두는 편이 낫다.

## 검증

구버전 앱과 신 스키마의 조합을 실제로 돌려 보는 것이 유일한 직접 증거다. 리뷰에서의 판정은 그 앞단의 필터일 뿐이다.

- 마이그레이션을 적용한 테스트 DB 위에서 직전 릴리스의 테스트 스위트를 실행한다. 마이그레이션으로 테스트 DB를 구성하는 방법은 [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 DB]]에 둔다.
- 마이그레이션 SQL 리뷰에 위 표 기준의 breaking 판정 항목을 넣는다. 컬럼 삭제와 개명, NOT NULL 강제, UNIQUE와 FK 추가는 리뷰에서 자동으로 눈에 걸려야 한다.
- 스테이징에서 구버전 인스턴스를 남겨 둔 채 마이그레이션을 리허설한다. 배치와 컨슈머도 구버전으로 함께 돌려야 앱 밖 소비자까지 검증된다.
- 배포 순서와 파이프라인 게이트 자체는 [[DB-Migration|배포 파이프라인의 DB Migration 전략]]에 둔다.

## 흔한 실수

- 컬럼 개명을 한 릴리스에 밀어넣는다. 배포 중 구버전 인스턴스가 존재하는 모든 순간에 쿼리가 실패한다.
- 마이그레이션과 앱 배포를 원자적으로 묶었다고 가정한다. 인스턴스 교체에는 시간이 걸리고 그 시간이 곧 공존 구간이다.
- backfill 없이 NOT NULL을 강제한다. 기존 NULL 행 때문에 DDL이 실패하거나 실패 지점에서 마이그레이션이 중간 상태로 멈춘다.
- expand와 contract를 같은 릴리스에서 수행한다. 두 단계로 쓴 것처럼 보여도 공존 구간을 하나도 만들지 않은 것이다.
- 배치와 외부 소비자를 호환 대상에서 빼먹는다. 웹 인스턴스만 보고 contract를 냈다가 야간 배치가 깨지는 경로가 여기서 나온다.
- 전방 호환을 검토하지 않고 배포한다. 배포는 통과했는데 롤백이 불가능해지는 구조가 만들어진다.

## 면접 체크포인트

- 후방 호환과 전방 호환의 방향 차이를 배포와 롤백이라는 두 이동으로 설명할 수 있는가.
- 컬럼 개명이 왜 가장 위험한 변경인지, 어떤 단계로 펴는지 말할 수 있는가.
- 스키마 자체는 호환인데 앱이 깨지는 사례를 구체적으로 들 수 있는가.
- contract 시점을 시간이 아니라 어떤 조건으로 판정하는지 설명할 수 있는가.
- 불변식 강제를 backfill 뒤 별도 마이그레이션으로 미루는 이유를 말할 수 있는가.

## 출처

- [MySQL 8.4 Reference Manual, ALTER TABLE Statement](https://dev.mysql.com/doc/refman/8.4/en/alter-table.html)
- [MySQL 8.4 Reference Manual, Data Type Default Values](https://dev.mysql.com/doc/refman/8.4/en/data-type-defaults.html)
- [PostgreSQL 17 Documentation, Modifying Tables](https://www.postgresql.org/docs/17/ddl-alter.html)
- [ParallelChange — Martin Fowler bliki, Danilo Sato](https://martinfowler.com/bliki/ParallelChange.html)

## 관련 문서

- [[Schema-Versioning|스키마 버전 관리]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]
- [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]
- [[Blue-Green|Blue-Green 배포 (Expand-Contract)]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[DB-Migration|배포 파이프라인의 DB Migration 전략]]
- [[Data-Integrity-Constraints|데이터 무결성 제약]]
- [[Backfill-Resource-Isolation|백필 자원 격리]]
- [[Migration-Backed-Test-Database|마이그레이션 기반 테스트 DB]]
- [[Backward-Compatibility-Design|계약 진화 설계]]
