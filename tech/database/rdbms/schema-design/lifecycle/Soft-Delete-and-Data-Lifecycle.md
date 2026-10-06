---
tags: [database, rdbms, soft-delete, lifecycle, retention, typeorm]
status: done
verified_at: 2026-10-06
category: "Data & Storage - RDB"
aliases: ["Soft Delete", "Logical Delete", "소프트 삭제", "논리 삭제"]
---

# Soft delete와 데이터 생명주기

Soft delete는 row를 지우지 않고 삭제 시각이나 marker를 기록하는 구현 패턴이다. 복구와 참조 유지에 유용하지만 **업무 상태, 감사 이력, 보존 정책과 영구 삭제를 대신하지 않는다**.

## 먼저 의미를 구분한다

| 의미 | 예 | 적합한 표현 |
|---|---|---|
| 업무 상태 전이 | 주문 취소, 회원 정지 | 명시적 status와 상태 이력 |
| 사용자 화면에서 제거 | 게시글 삭제, 임시 복구 가능 | `deleted_at` soft delete |
| 법적/운영 감사 | 가격 변경, 권한 변경 | 별도 history/audit |
| 보존 만료와 개인정보 삭제 | 탈퇴 후 법정 기간 종료 | purge/anonymization job |
| 잘못 생성된 임시 row | 미사용 upload staging | hard delete 가능 |

주문을 soft delete로 취소 처리하면 취소 사유, 시각과 후속 정책을 표현하지 못한다. 핵심 domain은 상태 machine을 우선하고 soft delete는 repository 가시성 규칙으로 제한한다.

## `deleted_at` 기본 모델

```sql
ALTER TABLE post
  ADD COLUMN deleted_at DATETIME(6) NULL,
  ADD COLUMN deleted_by BIGINT NULL,
  ADD COLUMN delete_reason_code VARCHAR(50) NULL;
```

boolean은 삭제 여부만, timestamp는 삭제 여부와 시점을 함께 표현한다. 복구/보존 cutoff가 필요하면 timestamp가 낫다. reason과 actor가 감사상 중요하면 별도 typed column/history를 둔다.

### query scope

- 기본 조회는 `deleted_at IS NULL`을 일관되게 적용한다.
- join의 어느 쪽이 삭제 row를 허용하는지 명시한다. 양쪽을 무조건 숨기면 과거 주문의 참조 설명이 사라질 수 있다.
- admin/restore path의 `withDeleted` 권한을 일반 조회와 분리한다.
- raw SQL, report와 batch가 ORM default scope를 우회하는지 test한다.

TypeORM은 `@DeleteDateColumn`이 있으면 repository soft-delete 경로의 기본 scope에서 삭제 row를 제외한다. 이 기능이 business state와 모든 raw query까지 자동으로 보호하는 것은 아니다.

## Index는 query shape로 정한다

`deleted_at`의 cardinality가 낮다는 이유만으로 항상 index 첫 column에서 빼거나, soft delete라는 이유만으로 모든 index에 넣는 규칙은 없다.

```sql
-- tenant의 활성 row를 최근순으로 읽는 실제 query에 맞춘 후보
CREATE INDEX idx_post_tenant_active_created
  ON post (tenant_id, deleted_at, created_at DESC);
```

- leading column과 range/order는 실제 predicate와 분포, 실행 계획으로 결정한다.
- 삭제 row 비율이 매우 낮으면 기존 business index만으로 충분할 수 있다.
- 삭제 row가 계속 쌓이면 index와 buffer pool도 커진다. purge/partition/archive가 필요하다.

## Active row unique 제약

단순 `UNIQUE(email, deleted_at)`은 MySQL에서 활성 row 하나를 보장하지 못한다. unique index가 여러 NULL을 허용하기 때문이다.

```sql
ALTER TABLE account
  ADD COLUMN active_key TINYINT
    GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) STORED,
  ADD UNIQUE KEY uq_account_email_active (email, active_key);
```

활성 row는 `active_key=1`이라 충돌하고 삭제 row는 NULL로 여러 개 존재할 수 있다. 다른 선택지는 다음과 같다.

- 계정 identity를 보존해야 하면 login identifier를 별도 identity table에서 관리한다.
- 삭제 시 email을 임의 문자열로 덮는 방식은 감사, 재가입과 외부 연동 의미를 바꾸므로 정책 없이 사용하지 않는다.
- PostgreSQL 같은 DB는 partial unique index를 사용할 수 있다.
- 활성 여부를 `is_active` 같은 별도 컬럼으로 중복 관리하지 않는다. 같은 키의 삭제 이력이 두 건 쌓이면 false 값끼리 다시 unique에 걸리고, `deleted_at`과 어긋난 상태도 생길 수 있다. 활성 키는 `deleted_at`에서 파생하는 generated column으로 계산한다 — 위 `active_key` 같은 플래그형 대신 활성일 때만 원본 값을 투영하는 형태(`IF(deleted_at IS NULL, start_at, NULL)`)도 같은 원리다.

생성 column/functional index의 지원 범위와 online DDL 조건은 대상 MySQL version에서 확인한다.

## FK와 삭제 정책

참조가 있다는 이유만으로 soft delete가 필수는 아니다. 관계별로 `RESTRICT`, `CASCADE`, `SET NULL`, archive/history와 soft delete를 비교한다.

- 과거 order line이 catalog product를 설명해야 하면 order snapshot을 보존한다.
- child가 parent 없이 의미가 없고 규정상 보존할 이유가 없으면 hard cascade가 맞을 수 있다.
- soft-deleted parent를 새 child가 참조하지 못하게 application/constraint 경계를 둔다.
- FK는 row 존재만 보장하며 활성 상태까지 자동 보장하지 않는다.

## Restore, purge와 충돌

복구는 `deleted_at=NULL` 한 줄로 끝나지 않을 수 있다.

- 같은 unique key를 새 row가 이미 차지했는가
- parent/member 권한과 연관 row도 복구해야 하는가
- 삭제 기간 동안 발생한 event와 search/cache projection을 어떻게 되돌리는가
- restore가 허용되는 기간과 승인자는 누구인가

보존 기한이 끝난 row는 batch로 hard delete/anonymize한다. 작은 chunk, stable cursor와 rate limit을 사용하고 replica lag, lock과 redo를 감시한다. purge retry는 같은 대상에서 안전해야 하며, 완료/실패 수와 삭제 근거를 기록한다.

## 사본별 삭제 전파와 완료 시점

운영 DB에서 지운 값도 replica, cache, 검색 색인, 분석 저장소, 로그, 객체 version과 백업에 한동안 남아 있을 수 있다. 삭제가 끝나는 시점은 가장 늦게 사라지는 사본이 정하므로, 사본마다 삭제 경로와 최대 소요 시간을 정해 둔다.

| 사본 | 삭제 경로 | 남는 기간을 정하는 것 |
|---|---|---|
| 운영 DB와 replica | `DELETE` 또는 purge job, 복제 | 엔진의 물리 정리 시점과 replica lag |
| cache | 명시 무효화 또는 TTL | TTL 상한 |
| 검색 색인, 분석 저장소, export 파일 | delete event, 별도 삭제 job | 이벤트 유실, 늦은 update의 재생성([[OpenSearch-Indexing-Pipeline-Reliability\|색인 파이프라인 신뢰성]]), 적재 주기 |
| 로그 | 보존 기간 만료 | log retention([[PII-Masking\|PII 마스킹과 최소 수집]]) |
| S3 versioning 버킷 | version ID 지정 삭제, `NoncurrentVersionExpiration` | delete marker 아래 이전 version, Object Lock |
| 자동 백업과 수동 snapshot | 보존 기간 만료, 직접 삭제 | 자동 백업 보존 기간, 만료가 없는 수동 snapshot |

- **엔진의 물리 정리는 별도 단계다.** InnoDB는 삭제한 row와 index record를 그 삭제의 update undo log record를 버릴 때 purge로 제거한다. 보통 그 `DELETE` 문과 비슷한 시간 규모로 끝나지만, 작은 batch의 insert와 delete가 비슷한 속도로 이어지면 purge가 밀리고 dead row 때문에 table이 계속 커질 수 있다. PostgreSQL은 `DELETE` 뒤에도 이전 row version이 남는다. standard `VACUUM`은 dead row version을 제거하고 그 공간을 재사용 가능하게 표시하지만, 테이블 끝 page가 완전히 비고 exclusive table lock을 쉽게 얻을 수 있는 경우를 빼면 OS에 반환하지 않는다. 동작 차이는 [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]를 본다.
- **S3는 version 단위로 지워졌는지 확인한다.** versioning을 켠 버킷에서 version ID 없는 단순 `DELETE`와 lifecycle `Expiration`은 delete marker를 추가할 뿐 이전 version에는 영향을 주지 않는다. 이전 version은 version ID를 지정해 지우거나 `NoncurrentVersionExpiration`으로 영구 삭제한다. lifecycle은 Object Lock이 적용된 noncurrent version에 작동하지 않고, 만료일과 실제 제거 사이에 지연이 있을 수 있다.
- **수동 snapshot은 저절로 사라지지 않는다.** RDS 수동 snapshot은 백업 보존 기간을 적용받지 않고 만료되지 않으므로 삭제 정책에 별도 정리 주기를 둔다. 인스턴스를 중지한 기간은 보존 기간 계산에 들어가지 않아 자동 백업이 설정보다 오래 남을 수 있다. 자동 백업 보존과 PITR 범위는 [[Backup-Restore|백업과 복원]]을 본다.
- **불변 백업은 삭제 요구와 충돌한다.** S3 Object Lock compliance 모드에서는 root 사용자를 포함한 어떤 사용자도 보존 기간 안에 객체 version을 덮어쓰거나 지울 수 없고 기간을 줄일 수도 없다. 기간 전에 지우는 방법은 AWS 계정 삭제뿐이다. governance 모드는 `s3:BypassGovernanceRetention` 권한과 `x-amz-bypass-governance-retention:true` 헤더로 보존 기간 안에도 지울 수 있다. 개인정보가 든 백업은 삭제 정책이 허용하는 보존 기간 안에서 잠금 기간을 정하거나 [[Crypto-Shredding|crypto-shredding]]으로 범위를 줄인다(설계 판단).
- **완료 시점은 단계별 상한으로 정한다.** Google Cloud는 서비스나 삭제 요청에 따라 최대 30일의 내부 복구 기간이 적용될 수 있고, 활성 시스템에서는 보통 약 2개월, 백업에서는 삭제 요청 뒤 6개월 안에 만료되도록 설계해 최대 약 6개월(180일) 안에 고객 데이터를 삭제한다고 공개한다(2026-10-06 확인). 사본별 상한을 정해야 사용자와 고객사에 삭제 완료 시점을 약속할 수 있다(설계 판단).

한국 법령의 파기 기한, 방법과 파기 기록은 [[Privacy-Operations-for-Small-Business#탈퇴하거나 계약이 끝나면 언제 지우는가|대표의 개인정보 운영]]을 따른다.

## Soft delete와 history

둘은 대체 관계가 아니다.

- soft delete는 현재 row의 가시성과 복구 가능성을 표현한다.
- history는 여러 변경 version과 reason을 보존한다.
- 삭제 event도 history에 하나의 operation으로 남길 수 있다.
- current table을 hard delete하고 history만 보존하는 모델도 요구에 따라 가능하다.

자세한 변경 이력은 [[Operational-Data-History-and-Audit|운영 데이터 변경 이력]]을 따른다.

## 완료 체크리스트

- 삭제가 업무 상태인지 가시성인지 구분했다.
- 기본/관리/raw query의 삭제 row 포함 규칙을 test했다.
- active unique와 FK 정책을 DB가 가능한 범위에서 강제한다.
- restore conflict와 연관 data 복구 정책이 있다.
- retention, purge/anonymization과 관측 지표가 있다.
- cache, search index와 event consumer도 삭제/복구를 반영한다.
- 사본 목록과 사본별 삭제 경로, 최대 소요 시간을 문서화했다.

## 삭제 조건과 복합 index

`(deleted_at, business_key)`와 `(business_key, deleted_at)`은 두 column을 equality로 지정하는 lookup에서 모두 좁은 구간을 만들 수 있다. 활성 row가 많다는 이유만으로 전자가 모두 scan한다고 단정하지 않는다. 한 column만 쓰는 query, range와 ORDER BY, covering, 활성/삭제 비율을 기준으로 prefix를 결정하고 실제 계획으로 비교한다.

## 활성 데이터 전용 view

`WHERE deleted_at IS NULL`을 명시한 view로 반복 조회의 누락 위험을 줄일 수 있다. base table 직접 접근과 관리/복구 query는 여전히 별도 권한과 API 경계가 필요하다. view가 row 보안이나 삭제 정책 전체를 자동 보장하지는 않는다.

## 출처

- [TypeORM, DeleteDateColumn](https://typeorm.io/docs/help/decorator-reference/#deletedatecolumn)
- [Soft Delete 환경에서 활성 회차 중복과 재생성 충돌을 해결한 방법 — velog](https://velog.io/@khs0305/%EB%B0%A5%ED%92%80-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-Soft-Delete-%ED%99%98%EA%B2%BD%EC%97%90%EC%84%9C-%ED%99%9C%EC%84%B1-%ED%9A%8C%EC%B0%A8-%EC%A4%91%EB%B3%B5%EA%B3%BC-%EC%9E%AC%EC%83%9D%EC%84%B1-%EC%B6%A9%EB%8F%8C%EC%9D%84-%ED%95%B4%EA%B2%B0%ED%95%9C-%EB%B0%A9%EB%B2%95)
- [MySQL 8.4, CREATE INDEX](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)
- [인프런, Hong, UPDATE와 DELETE](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338552)
- [김영한 강사, soft delete가 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401982)
- [김영한 강사, is_deleted 방식](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401983)
- [김영한 강사, deleted_at 방식 1](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401984)
- [김영한 강사, deleted_at 방식 2](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401985)
- [김영한 강사, soft delete와 hard delete](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401986)
- [김영한 강사, soft/hard/status](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401987)
- [김영한 강사, soft delete와 history](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401988)
- [김영한 강사, soft delete index](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401989)
- [김영한 강사, soft delete 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401990)
- [MySQL 8.4, InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
- [PostgreSQL 18, Routine Vacuuming](https://www.postgresql.org/docs/18/routine-vacuuming.html)
- [Amazon S3, Expiring objects](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html)
- [Amazon S3, Locking objects with Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- [Amazon RDS, Creating a DB snapshot for a Single-AZ DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html)
- [Amazon RDS, Backup retention period](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html)
- [Google Cloud, Data deletion on Google Cloud](https://docs.cloud.google.com/docs/security/deletion)

## 관련 문서

- [[Operational-Data-History-and-Audit|운영 데이터 변경 이력]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Schema-Migration-Large-Table|대용량 schema migration]]
- [[Crypto-Shredding|Crypto-shredding]]
- [[Backup-Restore|백업과 복원]]
- [[Privacy-Operations-for-Small-Business|대표의 개인정보 운영]]
