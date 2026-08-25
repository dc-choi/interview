---
tags: [database, rdbms, history, audit, temporal, snapshot]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["Operational Data History", "Audit History", "운영 데이터 변경 이력"]
---

# 운영 데이터 변경 이력과 감사 설계

`updated_at`은 마지막 변경 시각만 알려 준다. 가격 분쟁, 권한 변경과 사고 조사에 답하려면 **누가, 무엇을, 언제, 왜, 어떤 요청으로 바꾸었고 전후 값이 무엇인지**를 목적에 맞게 보존해야 한다.

## 이력을 요구사항으로 정의한다

- 단순 운영 추적, 사용자 화면의 version history, 법적 audit, 과거 시점 복원 중 무엇인가
- 어떤 entity/field가 대상이며 얼마나 오래 보존하는가
- transaction 시각과 business effective 시각이 다른가
- 정확한 row 복원, 변경 field만 표시, 시점 통계 중 어떤 query가 필요한가
- PII 삭제/정정 요구와 immutable audit를 어떻게 함께 만족하는가

모든 table을 영구 snapshot하는 것은 기본값이 아니다. 위험, query와 보존 규정에 맞춰 적용한다.

## Audit column은 최소 추적선이다

```text
created_at, created_by
updated_at, updated_by
change_type, change_reason
source_system, correlation_id
```

- actor는 표시 이름보다 안정적인 principal ID와 actor type을 기록한다.
- client IP는 proxy trust chain을 검증하고 필요할 때만 수집한다. PII 보존 정책도 적용한다.
- `change_reason`은 사용자 입력 text만 믿지 않고 업무 code와 ticket/request ID를 함께 둔다.
- DB timestamp default는 시각 누락을 줄이지만 actor와 business reason은 application context가 제공해야 한다.

이 column들은 이전 값을 보존하지 않으므로 복원이나 전체 변경 sequence에는 충분하지 않다.

## 이력 모델 비교

| 모델 | 강점 | 한계 | 적합한 query |
|---|---|---|---|
| 이전 값 column, SCD 3 | 가장 단순 | 직전 값만 보존, field 증가 | 현재와 바로 전 값 |
| 같은 table version row, SCD 2 | 한 table에서 시점 조회 | 현재 row query/constraint 복잡 | 차원 속성의 시점 분석 |
| 별도 full-row history | 복원과 이해가 쉬움 | 저장 중복, schema 동기화 | row version, 감사 |
| field-level change log | 변경 field가 명확 | 복원/통계가 복잡, type 약화 | 사람이 보는 diff |
| 공통 polymorphic log | 여러 entity를 한 stream으로 조회 | FK와 schema 의미 약화 | 관리 화면, event 검색 |

저장 공간만 보고 field-level log를 선택하면 재구성 code와 query 비용이 더 커질 수 있다. 반대로 큰 blob과 변경 빈도가 높은 row의 full snapshot은 비용이 커서 domain별 분리가 필요하다.

## Full-row history

현재 table은 현재 상태만 유지하고 변경 전 또는 변경 후 snapshot을 history table에 넣는다.

```text
product
  id, name, price, version, updated_at

product_history
  history_id, product_id, version
  name, price
  valid_from, valid_to
  operation, changed_by, reason, correlation_id
```

### 불변식

- `(product_id, version)`은 unique하다.
- 유효 구간은 겹치지 않고 `[valid_from, valid_to)`처럼 경계를 통일한다.
- 현재 version은 하나뿐이며 history sequence가 끊기지 않는다.
- current update와 history insert는 같은 local transaction에서 처리한다.
- 최초 상태도 복원이 필요하면 version 1부터 저장한다.

`valid_to IS NULL` current row를 같은 table에 둘 수도 있지만 MySQL의 NULL unique 의미만으로 entity별 current row 하나를 강제할 수는 없다. transaction/lock, generated active key나 별도 current table 등 대상 DB에 맞는 방어선을 둔다.

## Application, trigger와 CDC

### Application write

business reason, actor와 command context를 가장 잘 안다. 모든 write path가 같은 service를 거쳐야 하며 bulk SQL, admin script가 우회하지 않도록 통제한다.

### DB trigger

DB를 통과하는 변경을 넓게 잡지만 request context가 약하고 숨은 write/운영 복잡성이 생긴다. trigger code, 배포와 장애 처리도 application처럼 version 관리한다.

### CDC/binlog

기존 application을 덜 바꾸고 변경 stream을 얻지만 source log retention, schema evolution, before image 설정과 delivery semantics를 운영해야 한다. CDC event가 곧 business reason은 아니다.

감사 수준이 높으면 application의 business metadata와 DB/CDC의 변경 증거를 correlation ID로 연결한다.

## Transaction과 실패 경계

history가 성공하고 current update가 실패하거나 그 반대가 되면 감사 기록을 신뢰할 수 없다. 같은 DB라면 하나의 transaction으로 묶는다. 외부 audit store로 보낼 때는 local outbox에 먼저 기록하고 relay한다.

복구를 위해 다음을 함께 확인한다.

- retry가 같은 history version을 중복 생성하지 않는 idempotency key
- optimistic conflict 시 누가 재시도하고 reason을 다시 검증하는지
- batch correction이 원래 change와 correction change를 모두 남기는지
- history table 자체의 update/delete 권한이 제한되는지

## 시점 조회

```sql
SELECT *
FROM product_history
WHERE product_id = ?
  AND valid_from <= ?
  AND (valid_to > ? OR valid_to IS NULL)
ORDER BY valid_from DESC
LIMIT 1;
```

`(product_id, valid_from)` index를 기본 후보로 두되 전체 시점 통계는 많은 entity의 version을 읽으므로 OLTP primary에 큰 부하를 줄 수 있다. 분석 replica/warehouse와 [[SCD-Type2|SCD Type 2]]를 검토한다.

## Retention과 PII

- audit 목적, 법적 근거와 보존 기간을 field 단위로 정한다.
- password, token과 secret은 history에 복사하지 않는다.
- PII 삭제 요청은 무조건 immutable이라는 말로 회피하지 않고 삭제, 가명화와 별도 vault 전략을 법무/보안 요구에 맞춘다.
- partition/archive/purge job도 재현 가능하게 test하고 삭제 증거를 남긴다.

## TypeORM 적용

- subscriber만 믿으면 subscriber를 우회한 SQL과 다른 service write가 빠질 수 있다.
- application service가 `QueryRunner` transaction 안에서 current row와 typed history entity를 함께 저장하게 한다.
- JSON diff 하나로 모든 entity를 합치기보다 중요한 domain은 typed snapshot column을 우선한다.
- migration에서 current/history schema를 함께 변경하고 old application과의 mixed-version 호환을 확인한다.

## 출처

- [김영한 강사, 변경 이력이 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401963)
- [김영한 강사, 기본 변경 추적 column](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401964)
- [김영한 강사, 변경 사유](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401965)
- [김영한 강사, 감사 column](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401966)
- [김영한 강사, 기본 변경 이력 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401967)
- [김영한 강사, 이전 값 column](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401969)
- [김영한 강사, 현재 table version row](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401970)
- [김영한 강사, 현재 table 시점 조회](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401971)
- [김영한 강사, 현재 table 통계 한계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401972)
- [김영한 강사, 유효 기간](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401973)
- [김영한 강사, full-row history 시작](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401974)
- [김영한 강사, full-row history 주의점](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401975)
- [김영한 강사, history 유효 기간](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401976)
- [김영한 강사, full-row history 한계](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401977)
- [김영한 강사, field-level 변경 log](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401978)
- [김영한 강사, 공통 이력 table](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401979)
- [김영한 강사, 전체 변경 이력 정리](https://www.inflearn.com/courses/lecture?courseId=340524&unitId=401980)

## 관련 문서

- [[SCD-Type2|SCD Type 2]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[PII-Masking|PII 마스킹과 최소 수집]]
