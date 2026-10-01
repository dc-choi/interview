---
tags: [architecture, modeling, time, timezone, interval, recurrence]
status: done
verified_at: 2026-10-01
category: "Architecture - 데이터 모델"
aliases: ["Temporal Modeling", "시간 모델링", "시점 기간 간격 반복", "Time Modeling"]
---

# 시간 모델링: 시점, 기간, 간격, 반복

예약 시작 시각, 만료일, 기한처럼 비즈니스에서 시간은 특정한 때에 무엇을 한다는 계약이다. 계약이 어긋나면 사용자가 손실을 입는다. 시간은 [[Measure-Modeling|측도]]처럼 보이지만 선형 변환이 안 되는 단위, 달력과 시간대, 시간 흐름 속의 위치라는 개념이 있어 별도 모델이 필요하다. 언어별 타입의 세부는 [[Java-Standard-Library-Date-and-Time]], API와 저장 형식은 [[API-Conventions-Format]]에 둔다.

## 시간이 복잡한 이유

| 관점 | 예 | 계산 가능성 |
|---|---|---|
| 물리량 | Unix epoch 이후 흐른 시간 | 수식으로 계산 |
| 위치 | 같은 순간의 서울과 런던 시각 | 규칙으로 계산 |
| 천문 현상 | 윤년, 윤초 | 규칙과 발표로 보정 |
| 문화 | 양력, 음력, 이슬람력 | 달력 체계별 규칙 |
| 역사 | 1582년 그레고리력 전환으로 10월 4일 다음 날이 10월 15일 | 사건이라 수식이 없다 |
| 사회 | 일광절약시간, 국가의 시간대 변경 | 정책이라 수식이 없고 바뀐다 |

사람끼리는 맥락을 공유해 문제가 없지만 소프트웨어에는 규칙을 명시해야 한다. 지역 시간대 규칙은 IANA tz database가 역사와 정책 변경을 반영해 관리하므로, 고정 offset 계산 대신 `Asia/Seoul` 같은 지역 ID와 최신 규칙 데이터를 쓴다. 경도상 시간과 실제 사용하는 시간대도 다를 수 있다. 과거 날짜를 다룰 때는 라이브러리가 어떤 달력을 쓰는지도 확인한다. Java `LocalDate`는 1582년 이전까지 그레고리력을 연장한 ISO 달력이라 역사 기록의 율리우스력 날짜와 다를 수 있다.

## 시간 값의 세 가지 쓰임

같은 시간이라도 용도에 따라 저장 방식이 다르다. 한 가지 규칙(무조건 UTC)으로 통일하면 일부 용도에서 의미를 잃는다.

| 쓰임 | 예 | 표현 |
|---|---|---|
| 시간대 없는 달력 날짜와 시각 | 생일, 설립일, 기념일, 공휴일, 매일 09:00 오픈 | `LocalDate`, `PlainDate`처럼 zone 없는 타입. 생일을 사용자 시간대로 바꾸면 날짜가 달라지는 오류가 생긴다 |
| 이미 일어난 사건의 순간 | 로그, 감사 기록, 시계열 데이터, `createdAt`, `updatedAt` | UTC 기준 순간(`Instant`). 분산된 기록의 순서를 비교할 수 있다 |
| 사람과 장소가 해석하는 시각 | 결제 시각의 현지 표시, 푸시 알림 발송 시각, 캘린더 일정, UI 표시 | 순간과 함께 사용자나 장소의 zone ID를 보존한다 |

- 결제처럼 이미 일어난 사건도 사용자가 현지 몇 시에 주문했는지가 업무에 필요하면 UTC 순간만으로는 부족하다. 사용자나 매장의 zone ID를 함께 저장한다.
- 아직 오지 않은 현지 시각 일정(다음 달 서울 오후 3시 회의)은 시간대 규칙이 바뀔 수 있으므로, 계산한 UTC 순간만이 아니라 현지 날짜와 시각, zone ID를 원본으로 둔다. 규칙이 바뀌었을 때 현지 시각과 이미 계산한 순간 중 무엇을 유지할지 정한다.
- 경과 시간 측정과 벤치마크에는 벽시계가 아니라 단조 증가 시계(`performance.now()`, `process.hrtime.bigint()`, `System.nanoTime()`)를 쓴다. 벽시계는 NTP 보정이나 사용자 설정으로 앞뒤로 움직인다.

```json
{
  "userId": 1,
  "zoneId": "Asia/Seoul",
  "birthdate": "1990-05-20",
  "createdAt": "2021-03-20T04:59:25Z",
  "posts": [{ "postId": 1, "publishedAt": "2021-03-20T06:00:00Z" }]
}
```

생일은 zone 없는 날짜, 생성 시각과 발행 시각은 UTC 순간이며, 화면에서는 보는 사람의 zone으로 발행 시각을 변환해 보여준다. 같은 게시물도 서울에서는 오후, 런던에서는 새벽, 하와이에서는 전날로 표시된다.

## 네 가지 시간 개념

| 개념 | 뜻 | 모델링 요점 |
|---|---|---|
| 시점(Point in Time) | 시간 흐름 속 한 순간 | 내부는 epoch 기준 순간으로 두고, 표시할 때 zone을 적용한다 |
| 기간(Duration) | 시간의 양. 3시간, 2일 | 정확한 초 단위 양과 달력 단위 양을 구분한다 |
| 간격(Interval) | 시작 시점과 끝 시점 사이의 범위 | 끝이 시작보다 앞설 수 없다. 끝점 포함 규칙을 정한다 |
| 반복(Recurrence) | 일정한 패턴으로 발생하는 시점 | 규칙과 시작 시점, 시간대로 발생 시점을 계산한다 |

### 기간: 정확한 양과 달력 양

월은 28~31일, 연은 365일이나 366일이고, 일광절약시간 전환일의 하루는 23시간이나 25시간이다. 그래서 기간은 두 가지로 나눈다.

- 초와 나노초로 고정된 양: 타임아웃, 캐시 TTL, 작업 소요 시간. Java `Duration`
- 연, 월, 일 같은 달력 양: 한 달 구독, 1년 약정. Java `Period`

한 달 구독을 30일로 계산하거나 다음 날 같은 시각을 24시간 뒤로 계산하면 달력 경계에서 어긋난다. 1월 31일에 한 달을 더하는 것처럼 결과 날짜가 없는 경우의 처리(말일로 맞춤 등)도 업무 규칙으로 정한다.

### 간격: 관계 연산과 끝점

간격 모델은 포함, 겹침, 인접 판정과 이동, 확장, 합집합, 교집합을 제공한다. 회의 시간이 참석자의 가용 시간 안에 들어가는지, 두 예약이 겹치는지, 프로젝트 단계들이 병렬로 진행된 구간이 어디인지 같은 질문이 이 연산으로 풀린다.

- 시작은 포함하고 끝은 제외하는 반개구간 `[start, end)`로 두면 10:00~11:00과 11:00~12:00이 겹치지 않고 인접하며, 구간을 이어 붙여도 틈이나 중복이 생기지 않는다. 날짜 구간도 끝 날짜를 포함할지 명시한다.
- 겹침 판정은 `a.start < b.end && b.start < a.end`다.
- 예약 중복 방지는 애플리케이션 판정만으로는 동시 요청에 약하므로 DB 제약이나 잠금으로 보장한다.

### 반복: 규칙으로 저장하고 발생 시점은 계산한다

매주 월요일 10시, 매월 첫째 토요일, 매월 31일 같은 반복은 발생 시점 목록이 아니라 규칙으로 저장하고, 필요한 구간의 발생 시점만 계산한다. 캘린더 표준인 RFC 5545의 RRULE은 FREQ, INTERVAL, BYDAY, BYMONTHDAY, COUNT, UNTIL로 규칙을 표현한다.

- 발생 시점은 반복의 기준 zone의 현지 시각으로 계산한다. UTC로 계산하면 일광절약시간 전환 뒤에 현지 시각이 한 시간씩 밀린다.
- RFC 5545는 규칙이 2월 30일 같은 존재하지 않는 날짜나 일광절약시간으로 사라진 현지 시각을 만들면 그 발생을 무시하고 횟수에도 세지 않는다. 매월 31일 규칙은 31일이 없는 달을 건너뛴다. 말일로 옮기고 싶다면 그것은 별도 업무 규칙이다.
- 반복 일정의 한 회차만 바꾸거나 취소하는 예외를 규칙과 분리해 저장한다.

## 구현 원칙

- 윤년, 월별 일수, 시간대 변환을 직접 구현하지 않고 표준 라이브러리를 쓴다. Java는 `java.time`, JavaScript는 `Temporal`이 `Instant`, `ZonedDateTime`, `PlainDate`, `PlainDateTime`, `Duration`을 구분해 제공한다. 2026-10 MDN 기준 `Temporal`은 Baseline이 아니므로 대상 런타임을 확인하고 필요하면 폴리필을 쓴다.
- 현재 시각을 직접 부르지 않고 시계를 주입해 테스트에서 고정한다. [[Controllability-Functional-Core]], [[Deterministic-Test]]
- 서버 기본 시간대에 의존하지 않는다. 순간은 offset이 명확한 RFC 3339 형식으로 주고받는다.
- 테스트에는 윤년, 월말, 일광절약시간의 gap과 overlap, 구간 끝점, 시간대 규칙 변경을 넣는다.

## 체크포인트

- 생일, 로그 시각, 미래 회의 시각을 각각 어떻게 저장할지와 그 이유
- 정확한 기간과 달력 기간의 차이, 한 달을 30일로 계산하면 생기는 문제
- 반개구간을 쓰는 이유와 겹침 판정식
- 반복 일정을 규칙으로 저장하고 현지 시각으로 계산해야 하는 이유, 없는 날짜의 처리
- 경과 시간 측정에 단조 시계를 쓰는 이유

## 출처

- [모델링 시리즈: 시간 — kciter.so, kciter](https://kciter.so/posts/modeling-series-temporal/)
- [시간에 대해 탐구하기 — kciter.so, kciter](https://kciter.so/posts/deep-dive-into-datetime/)
- [RFC 5545, Internet Calendaring and Scheduling Core Object Specification (iCalendar)](https://www.rfc-editor.org/rfc/rfc5545)
- [MDN, Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)

## 관련 문서

- [[Measure-Modeling|측도 모델링]]
- [[System-Time-and-Clock-Sync|시스템 시간과 시계 동기화]]
- [[Software-Modeling|소프트웨어 모델링과 좋은 모델의 기준]]
- [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]
- [[API-Conventions-Format|API 시간 형식과 저장]]
- [[JavaScript-Global-JSON-Date-and-Builtins|JavaScript Date의 시간 모델]]
- [[Controllability-Functional-Core|제어 가능성과 Functional Core]]
