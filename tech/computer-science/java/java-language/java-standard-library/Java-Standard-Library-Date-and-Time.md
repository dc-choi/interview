---
tags: [java, date-time, instant, timezone, duration, period, formatting]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Date and Time", "Java 날짜와 시간"]
---

# Java 날짜와 시간

날짜와 시간은 윤년, 달마다 다른 일수, 지역별 시차와 서머타임 규칙 때문에 직접 계산하면 오류가 나기 쉽다. `java.time`은 서로 다른 시간 개념을 별도 불변 타입으로 나눠 모델링한다.

## 먼저 의미를 고른다

| 질문 | 타입 | 예시 |
|---|---|---|
| 달력의 날짜만 필요한가 | `LocalDate` | 생일, 영업일 |
| 하루 안의 시각만 필요한가 | `LocalTime` | 매장 개점 시각 |
| 지역 규칙 없는 날짜와 시각인가 | `LocalDateTime` | 사용자가 입력한 예약 후보 |
| UTC 기준 한 순간인가 | `Instant` | 이벤트 발생 시각, 로그 timestamp |
| UTC offset이 계약에 필요한가 | `OffsetDateTime` | protocol과 DB 교환 값 |
| 지역의 시간대 규칙까지 필요한가 | `ZonedDateTime` | 서울에서 매일 오전 9시 실행 |

`LocalDateTime`에는 offset과 zone이 없어 timeline의 한 순간을 유일하게 가리키지 못한다. 서버의 기본 zone을 암묵적으로 적용하지 말고 순간으로 바꿀 경계에서 `ZoneId`나 `ZoneOffset`을 명시한다.

## LocalDateTime과 불변 연산

`java.time`의 주요 클래스는 불변이며 thread-safe다. `plus`, `minus`, `with`는 원본을 바꾸지 않고 새 값을 반환한다.

```java
LocalDateTime start = LocalDateTime.of(2026, 8, 4, 9, 0);
LocalDateTime end = start.plusHours(2);
```

- `of`는 구성 요소로 값을 만들고 `parse`는 문자열을 해석한다.
- `get` 계열은 field를 조회하고 `with`는 field 조정 결과를 반환한다.
- `TemporalAccessor`는 조회 능력, `Temporal`은 날짜와 시간 조정 능력을 추상화한다.
- 복잡한 달력 규칙은 `TemporalAdjuster`로 표현할 수 있다.

## ZoneId, offset과 DST

`ZoneOffset`은 `+09:00`처럼 UTC와의 고정 차이고, `ZoneId`는 `Asia/Seoul`처럼 지역의 시간대 규칙 집합이다. 지역 규칙은 역사와 정책 변화에 따라 offset을 결정한다.

서머타임 전환에는 현지 시각이 존재하지 않는 gap과 두 번 나타나는 overlap이 생길 수 있다. `LocalDateTime.atZone(zone)` 같은 변환이 이를 어떻게 해석하는지 API 계약을 확인하고, 예약 업무에서는 gap과 overlap 정책을 제품 요구사항으로 정한다.

```java
ZoneId zone = ZoneId.of("Asia/Seoul");
ZonedDateTime local = start.atZone(zone);
Instant instant = local.toInstant();
```

동일한 `Instant`도 zone에 따라 다른 현지 날짜와 시각으로 표시된다. zone database 규칙은 업데이트될 수 있으므로 먼 미래 일정은 계산 당시의 offset만 저장하는 것과 region ID를 저장하는 것의 의미가 다르다.

## Instant는 기계 중심의 순간이다

`Instant`는 UTC 기반 timeline의 한 지점을 seconds와 nanoseconds로 표현한다. 저장과 서비스 간 전달에는 적합하지만 연도, 월, 현지 오전 같은 업무 의미는 zone과 함께 해석해야 한다.

- 현재 순간은 `Instant.now(clock)`처럼 `Clock`을 주입해 얻으면 테스트를 고정할 수 있다.
- epoch millisecond로 변환하면 원래 값의 nanosecond 정밀도를 잃을 수 있다.
- 경과 시간 측정과 벽시계 시각은 다르다. 짧은 코드 성능 측정은 `System.nanoTime`, 업무 timestamp는 `Instant`를 구분한다.

## Duration과 Period

`Duration`은 seconds와 nanoseconds 기반의 시간량이고, `Period`는 years, months, days 기반의 달력량이다.

```java
Duration timeout = Duration.ofSeconds(30);
Period subscription = Period.ofMonths(1);
```

하루를 24시간으로 더하는 것과 다음 달력 날짜로 하루 이동하는 것은 DST 전환에서 결과가 다를 수 있다. 서버 timeout에는 `Duration`, 매달 같은 날짜의 구독 갱신에는 `Period`처럼 업무 의미에 맞춘다. `Period.ofMonths(1)`은 고정된 초 수가 아니다.

## 조회와 조정

명확한 메서드가 있으면 `getYear`, `getMonth`, `plusDays`처럼 구체 API를 우선한다. 동적인 field와 unit을 다루는 framework나 범용 로직에서는 `ChronoField`, `ChronoUnit`, `TemporalQuery`, `TemporalAdjuster`를 사용할 수 있다.

```java
LocalDate nextBusinessCandidate = date
    .with(TemporalAdjusters.firstDayOfNextMonth());
```

여러 chronology를 일반화하는 API는 복잡성을 높인다. 서비스와 저장 경계에는 보통 ISO-8601 타입을 사용하고 사용자 표시 단계에서 locale과 달력 체계를 적용한다.

## parsing과 formatting

`DateTimeFormatter`는 불변이며 thread-safe하므로 상수로 재사용할 수 있다.

```java
DateTimeFormatter formatter =
    DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm").withLocale(Locale.KOREA);

LocalDateTime parsed = LocalDateTime.parse("2026-08-04 09:30", formatter);
String rendered = formatter.format(parsed);
```

- 기계 간 교환에는 가능한 한 ISO formatter와 offset을 포함한 명확한 contract를 쓴다.
- 사용자 표시에는 `Locale`과 `ZoneId`를 명시한다.
- `yyyy`의 year-of-era와 `uuuu`의 proleptic year 의미가 다르므로 패턴을 복사해 쓰지 않는다.
- parsing 실패는 `DateTimeParseException`으로 전달되므로 입력 경계에서 사용자 오류로 변환한다.

## 테스트와 저장 원칙

- `now()`를 도메인 로직 곳곳에서 직접 호출하지 말고 `Clock` 또는 현재 시각을 인자로 전달한다.
- DB column의 타입, JDBC driver와 ORM이 `Instant`, offset, local 값을 어떻게 보존하는지 통합 테스트한다.
- 사용자 zone, 이벤트가 발생한 zone과 서버 기본 zone을 구분한다.
- 날짜만 필요한 값에 자정 timestamp를 억지로 넣지 않는다.

## 면접 체크포인트

- `LocalDateTime`이 한 순간을 특정하지 못하는 이유
- `ZoneId`와 `ZoneOffset`의 차이
- DST gap과 overlap이 예약 시스템에 주는 영향
- `Instant`, `Duration`, `Period`의 서로 다른 의미
- 불변 날짜 연산의 반환값을 받아야 하는 이유
- `Clock` 주입이 테스트 가능성을 높이는 방식

## 출처

- [java.time, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/package-summary.html)
- [LocalDateTime, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDateTime.html)
- [ZonedDateTime, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/ZonedDateTime.html)
- [Instant, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Instant.html)
- [Duration, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Duration.html)
- [Period, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Period.html)
- [DateTimeFormatter, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/format/DateTimeFormatter.html)
- [Clock, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Clock.html)
- 김영한 강사, [날짜와 시간 라이브러리가 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212244)
- 김영한 강사, [자바 날짜와 시간 라이브러리 소개](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212245)
- 김영한 강사, [기본 날짜와 시간 - LocalDateTime](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212246)
- 김영한 강사, [타임존 - ZonedDateTime](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212247)
- 김영한 강사, [기계 중심의 시간 - Instant](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212248)
- 김영한 강사, [기간, 시간의 간격 - Duration, Period](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212249)
- 김영한 강사, [날짜와 시간의 핵심 인터페이스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212250)
- 김영한 강사, [날짜와 시간 조회하고 조작하기1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212251)
- 김영한 강사, [날짜와 시간 조회하고 조작하기2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212252)
- 김영한 강사, [날짜와 시간 문자열 파싱과 포맷팅](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212253)
- 김영한 강사, [날짜와 시간 문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212254)
- 김영한 강사, [날짜와 시간 문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212255)
- 김영한 강사, [날짜와 시간 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212256)

## 관련 문서

- [[Java-Standard-Library-Immutability-and-String|Java 불변 객체와 String]]
- [[Java-Standard-Library-Enum|Java 열거형]]
- [[Java-Standard-Library-Exception-Handling|Java 예외 처리]]
