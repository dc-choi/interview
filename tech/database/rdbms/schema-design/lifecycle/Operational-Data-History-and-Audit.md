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

## History 적재의 시작과 두 시각

Full-row history는 최초 INSERT부터 after-image를 남겨야 첫 상태를 복원할 수 있다. 변경 시마다 새 상태와 operation, entity key를 함께 기록한다. 업무상 효력 발생 시각과 이력이 시스템에 기록된 시각을 분리하면 지연 입력, 과거 정정과 재처리를 구분할 수 있다.

## 종료 시각과 append-only

이전 version의 valid_to를 갱신하면 조회는 단순해지지만 이력은 엄밀한 append-only가 아니다. 변경이 드문 master 데이터에서는 같은 transaction으로 이전 구간 종료와 새 구간 시작을 처리할 수 있다. 변경이 잦거나 감사상 수정 금지라면 종료 event나 다음 version 시각으로 경계를 계산하는 대안과 비교한다. master라는 이름만으로 필수 규칙으로 삼지 않는다.

## 공통 event와 전용 history

공통 audit에는 누가 어떤 entity에 어떤 operation을 했는지 추적하고, 과거 상태 복원에는 typed 전용 history를 사용한다. 모든 request, debug와 infrastructure log를 운영 DB에 넣으면 write와 보존 부담이 커진다. 로그 저장소로 분리하되 업무 변경과 감사 event의 유실 경계, correlation key와 접근 통제는 유지한다.

## 추적 수준을 선택하는 질문

생성/수정 시각만으로 충분한지, 행위자와 변경 사유가 필요한지, 특정 컬럼의 이전 값이나 전체 과거 상태까지 복원해야 하는지 구분한다. 이력 조회 빈도, 증빙 책임, 보존/파기 기준과 변경량으로 전용 history 도입을 결정한다. 모든 table에 같은 감사 컬럼을 강제하지 않는다.

## 자동 timestamp와 업무 시각

DB 또는 ORM의 생성/수정 timestamp는 시스템 write 시각이다. 주문 완료, 계약 효력과 같은 업무 시각은 별도 field로 표현한다. bulk SQL과 우회 write도 같은 규칙을 따르는지 확인하고 clock/timezone, transaction 시각과 statement 시각의 제품별 차이를 명시한다.

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
- [인프런, 데이터 타입2 - 날짜와 시간 타입](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347676)
- [인프런, 쇼핑몰 테이블 정의서](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347684)
- [인프런, 정리(물리적 모델링 실습)](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347689)
- [인프런, 정리(물리적 모델링)](https://www.inflearn.com/courses/lecture?courseId=338886&unitId=347679)


## 관련 문서

- [[SCD-Type2|SCD Type 2]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[PII-Masking|PII 마스킹과 최소 수집]]
