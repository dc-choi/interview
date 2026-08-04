---
tags: [database, rdbms, soft-delete, lifecycle, retention, typeorm]
status: done
verified_at: 2026-08-04
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

## 출처

- [TypeORM, DeleteDateColumn](https://typeorm.io/docs/help/decorator-reference/#deletedatecolumn)
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

## 관련 문서

- [[Operational-Data-History-and-Audit|운영 데이터 변경 이력]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성]]
- [[Schema-Migration-Large-Table|대용량 schema migration]]
