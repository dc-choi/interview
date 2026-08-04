---
tags: [database, rdbms, schema, calendar, recurrence, mysql]
status: done
verified_at: 2026-08-04
category: "Data & Storage - RDB"
aliases: ["반복 일정 모델링", "Recurring Event Modeling", "Calendar Schema"]
---

# 반복 일정 모델링

반복 일정은 하나의 규칙과 그 규칙에서 만들어진 여러 occurrence를 구분해야 한다. 미래 일정을 전부 행으로 저장하면 무한 반복을 표현할 수 없고, 규칙만 저장하면 기간 검색과 예약 충돌 검사가 비싸진다. 실무에서는 규칙을 원본으로 두고 가까운 occurrence를 투영하는 방식이 유용하다.

## 세 층으로 나눈다

| 층 | 책임 | 예시 데이터 |
|---|---|---|
| event series | 사용자가 편집하는 원본 일정과 반복 규칙 | 시작 local time, timezone, duration, RRULE |
| exception | 특정 회차만 취소하거나 시간, 제목을 변경 | original recurrence key, override, cancelled |
| occurrence | 조회와 충돌 검사용으로 계산한 투영 | UTC start/end, series version, status |

occurrence가 원본이면 반복 규칙 변경 때 어느 행이 사용자의 예외인지 구분하기 어렵다. series와 exception을 source of truth로 두고 occurrence는 다시 만들 수 있는 read model로 취급한다.

## 반복 규칙

RFC 5545의 recurrence는 `DTSTART`를 첫 회차로 보고 `FREQ`, `INTERVAL`, `BYDAY` 같은 rule part로 다음 회차를 계산한다. 종료는 `COUNT` 또는 `UNTIL` 중 하나를 사용하며 둘을 동시에 두지 않는다. 둘 다 없으면 무기한 반복이다.

```text
DTSTART;TZID=Asia/Seoul:20260804T090000
RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=20
```

- 외부 캘린더 호환성이 중요하면 검증된 RRULE parser와 원문 규칙을 저장한다.
- 요일, 빈도, 종료 조건으로 DB 검색해야 하면 `frequency`, `interval_value`, 종료 값과 weekday 연결 테이블을 함께 정규화할 수 있다.
- 같은 의미를 RRULE과 정규 컬럼에 중복 저장할 경우 canonical representation과 갱신 책임을 하나로 정한다.
- 규칙 계산기는 DST, 말일, 윤년과 존재하지 않거나 두 번 나타나는 local time을 테스트해야 한다.

## 종일 일정과 시간 일정

종일 일정은 시간대가 적용된 자정 instant가 아니라 달력의 `DATE` 의미다. `[start_date, end_date)` 반열린 구간으로 저장하면 하루 일정은 종료일이 다음 날이고, 여러 날 일정의 경계 계산도 일관된다. RFC 5545의 `DTEND`도 non-inclusive다.

시간 일정은 같은 instant와 같은 wall-clock 반복을 구분한다.

- occurrence 검색용 절대 시각은 UTC로 정규화한다.
- 매주 현지 오전 9시처럼 반복하려면 IANA timezone 이름과 local start를 series에 보존한다.
- offset만 저장하면 DST 규칙 변경을 재현할 수 없다.
- MySQL `TIMESTAMP`는 session timezone과 UTC 사이를 변환하지만 범위가 2038년까지다. `DATETIME`은 자동 timezone 변환을 하지 않고 더 넓은 범위를 제공하므로, UTC 저장 규약을 애플리케이션 경계에서 강제하는 설계도 가능하다.

## occurrence 투영

```sql
CREATE TABLE event_occurrence (
  series_id BIGINT NOT NULL,
  recurrence_key VARCHAR(80) NOT NULL,
  starts_at_utc DATETIME(6) NOT NULL,
  ends_at_utc DATETIME(6) NOT NULL,
  series_version BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  PRIMARY KEY (series_id, recurrence_key),
  INDEX idx_occurrence_range (starts_at_utc, ends_at_utc)
);
```

`recurrence_key`는 해당 회차의 원래 시작 값을 안정적으로 식별한다. 시간이 override되어도 key를 유지해야 같은 예외를 다시 찾을 수 있다.

투영 작업은 다음 조건을 지킨다.

1. 오늘부터 3개월처럼 유한한 horizon까지만 생성한다.
2. `(series_id, recurrence_key)` UNIQUE로 재실행을 멱등하게 만든다.
3. series version이 바뀌면 영향받는 미래 구간을 재계산한다.
4. exception을 적용하고 cancelled 회차를 결과에서 제외하거나 상태로 남긴다.
5. horizon 끝에 가까워지기 전에 background job이 다음 구간을 연장한다.
6. 생성 지연 시 규칙에서 보완 계산할지, 조회를 실패시킬지 서비스 계약으로 정한다.

## 편집 의미를 API에 드러낸다

반복 일정 수정에는 최소 세 의미가 있다.

- 이 회차만 변경: exception 추가
- 이 회차와 이후 변경: 기존 series를 경계에서 끝내고 새 series 생성
- 전체 변경: series version 갱신 후 occurrence 재투영

이미 예약, 결제, 출석이 연결된 occurrence를 단순 삭제하고 재생성하면 외부 참조가 깨진다. 확정된 과거와 업무 객체는 보존하고, 수정 가능한 미래 구간만 교체하는 정책을 둔다.

## 출처

- [RFC 5545, Internet Calendaring and Scheduling Core Object Specification](https://www.rfc-editor.org/rfc/rfc5545.html)
- [MySQL 8.4 Reference Manual, DATE, DATETIME and TIMESTAMP](https://dev.mysql.com/doc/refman/8.4/en/datetime.html)
- [인프런, Hong, 일정 데이터 모델의 시작](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367641)
- [인프런, Hong, 종일 일정과 관계 모델](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367640)
- [인프런, Hong, 반복 규칙 모델](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367642)
- [인프런, Hong, occurrence 투영](https://www.inflearn.com/courses/lecture?courseId=339423&unitId=367643)

## 관련 문서

- [[Schema-Design|스키마 설계]]
- [[Normalization|정규화]]
- [[Idempotency|멱등성]]
