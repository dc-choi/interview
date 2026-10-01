---
tags: [java, date-time, instant, timezone, duration, period, formatting, legacy-date]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Date and Time", "Java 날짜와 시간"]
---

# Java 날짜와 시간

날짜와 시간은 윤년, 달마다 다른 일수, 지역별 시차와 서머타임 규칙 때문에 직접 계산하면 오류가 나기 쉽다. `java.time`은 서로 다른 시간 개념을 별도 불변 타입으로 나눠 모델링한다.

## Date, Calendar에서 java.time으로

- 윤년 규칙만 봐도 직접 계산은 위험하다. 4로 나누어떨어지는 해는 윤년이지만 100으로 나누어떨어지면 평년이고 400으로 나누어떨어지면 다시 윤년이라, 2000년은 윤년이고 1900년과 2100년은 평년이다. 이 규칙이 만드는 그레고리력의 평균 1년이 365.2425일이며, `java.time`은 이 규칙을 과거와 미래 전체에 적용하는 ISO proleptic 달력을 쓴다.
- JDK 1.0의 `java.util.Date`와 JDK 1.1의 `Calendar`는 가변 객체라 공유하면 부작용과 스레드 안전성 문제가 생기고, 0부터 시작하는 월 번호(`Calendar.JANUARY`는 0)와 타입 안전하지 않은 API 때문에 버그가 잦았다. `SimpleDateFormat`도 동기화되지 않아 스레드마다 인스턴스를 만들거나 외부에서 동기화해야 한다.
- 표준 밖의 Joda-Time이 사실상 표준으로 쓰였고, 그 창시자가 공동 스펙 리드로 참여한 JSR 310이 Java SE 8의 `java.time`으로 표준화됐다. Joda-Time도 Java SE 8 이후 사용자에게 `java.time`으로 옮기라고 안내한다.
- 레거시 API와 맞닿는 경계에서는 `Date.from(instant)`, `date.toInstant()`, `GregorianCalendar.from(zonedDateTime)`, `gregorianCalendar.toZonedDateTime()`, `TimeZone.toZoneId()`로 변환하고 내부 모델은 `java.time` 타입으로 둔다. `Date`는 millisecond 정밀도라 `Instant`의 나머지 나노초는 잘린다.

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

## 국내 단일 시간대 서비스의 LocalDateTime 관행

사용자, 업무 규칙과 운영이 한 시간대에 있는 국내 서비스에서는 `LocalDate`, `LocalDateTime`을 기본으로 쓰고, DST나 국제화가 필요할 때 `ZonedDateTime`, 고정 offset만 필요한 로그와 교환 값에 `OffsetDateTime`, 시스템 간 공통 기준점에 `Instant`를 쓰는 관행이 흔하다. 이 관행은 다음 전제에 기댄다.

- 업무 기준 zone, 사용자 zone과 서버, 컨테이너, DB 세션의 기본 zone이 같다. `LocalDateTime.now()`는 JVM 기본 zone을 읽으므로 TZ 설정 없이 기본 zone이 UTC인 컨테이너로 옮기면 같은 코드가 9시간 다른 값을 저장한다.
- `Asia/Seoul`은 1988년 10월 이후 offset 전환이 없어 현지 시각과 순간이 1:1로 대응한다. 1987년과 1988년 여름의 +10:00처럼 과거 일광절약시간 구간을 다루면 이 대응이 깨진다(JDK 21 내장 tzdb 2024a 기준).
- 해외 사용자나 리전, 다른 시간대 시스템과의 이벤트 교환, 서버 간 순서 비교, 배치와 알림 발송 시각 계산이 생기면 관행을 다시 검토할 신호다.

관행을 유지하더라도 `createdAt` 같은 사건 시각은 위 표처럼 `Instant`로 두거나 최소한 기준 zone을 문서화한다. 사건 시각, zone 없는 달력 값과 사람이 해석하는 시각의 구분은 [[Temporal-Modeling|시간 모델링]]을 따른다.

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
- 필드와 단위의 차이, `TemporalAdjusters`, 지원하지 않는 필드와 단위의 실패, 기간 계산 API는 [[Java-Standard-Library-Date-and-Time-Calculation|Java 날짜와 시간 계산]]에서 다룬다.

## ZoneId, offset과 DST

`ZoneOffset`은 `+09:00`처럼 UTC와의 고정 차이고, `ZoneId`는 `Asia/Seoul`처럼 지역의 시간대 규칙 집합이다. 지역 규칙은 역사와 정책 변화에 따라 offset을 결정한다.

서머타임 전환에는 현지 시각이 존재하지 않는 gap과 두 번 나타나는 overlap이 생길 수 있다. `LocalDateTime.atZone(zone)` 같은 변환이 이를 어떻게 해석하는지 API 계약을 확인하고, 예약 업무에서는 gap과 overlap 정책을 제품 요구사항으로 정한다.

```java
ZoneId zone = ZoneId.of("Asia/Seoul");
ZonedDateTime local = start.atZone(zone);
Instant instant = local.toInstant();
```

동일한 `Instant`도 zone에 따라 다른 현지 날짜와 시각으로 표시된다. zone database 규칙은 업데이트될 수 있으므로 먼 미래 일정은 계산 당시의 offset만 저장하는 것과 region ID를 저장하는 것의 의미가 다르다.

## 같은 순간의 비교와 zone 변환

- `isBefore`, `isAfter`, `isEqual`은 `ZonedDateTime`, `OffsetDateTime`에서 timeline의 순간만 비교한다. `equals`는 `ZonedDateTime`이면 local date-time, offset과 zone을, `OffsetDateTime`이면 local date-time과 offset을 모두 비교한다. 서울 2030-01-01 09:00과 UTC 2030-01-01 00:00은 `isEqual`이 true, `equals`가 false다.
- 그래서 `HashSet`, `Map` key와 중복 검사에서는 같은 순간도 zone이 다르면 다른 원소가 된다. `ZoneOffset.UTC`와 `ZoneId.of("UTC")`로 만든 같은 시각도 `equals`가 false다. 비교하거나 저장하기 전에 `Instant`나 한 zone으로 정규화한다. `LocalDateTime`끼리는 두 메서드 모두 같은 현지 날짜와 시각인지를 본다.

같은 순간을 다른 지역 시각으로 보여 줄 때는 `withZoneSameInstant`를 쓴다.

```java
ZonedDateTime seoul = LocalDateTime.of(2024, 1, 1, 9, 0).atZone(ZoneId.of("Asia/Seoul"));
ZonedDateTime london = seoul.withZoneSameInstant(ZoneId.of("Europe/London"));     // 2024-01-01T00:00Z
ZonedDateTime newYork = seoul.withZoneSameInstant(ZoneId.of("America/New_York")); // 2023-12-31T19:00-05:00
```

- 같은 서울 09:00이 2024-07-01이면 런던은 01:00(+01:00), 뉴욕은 전날 20:00(-04:00)이다. 겨울의 시차 9시간과 14시간을 상수로 두면 일광절약시간 기간에 1시간 틀리므로 지역 `ZoneId`로 변환한다. 결과는 JDK 21 내장 tzdb 2024a 기준이며 미래 날짜의 offset은 각국 정책 변경으로 달라질 수 있다.
- `withZoneSameLocal`은 현지 날짜와 시각을 유지하고 순간을 바꾼다. 위 서울 값에 쓰면 `2024-01-01T09:00Z[Europe/London]`이 되어 원래와 9시간 다른 순간이다. 회의 시각 변환에 쓰면 참석자마다 다른 순간에 회의가 잡힌다.

## Instant는 기계 중심의 순간이다

`Instant`는 UTC 기반 timeline의 한 지점을 seconds와 nanoseconds로 표현한다. 저장과 서비스 간 전달에는 적합하지만 연도, 월, 현지 오전 같은 업무 의미는 zone과 함께 해석해야 한다.

- 현재 순간은 `Instant.now(clock)`처럼 `Clock`을 주입해 얻으면 테스트를 고정할 수 있다.
- epoch millisecond로 변환하면 원래 값의 nanosecond 정밀도를 잃을 수 있다.
- 경과 시간 측정과 벽시계 시각은 다르다. 짧은 코드 성능 측정은 `System.nanoTime`, 업무 timestamp는 `Instant`를 구분한다.
- `Instant.from(localDateTime)`은 zone 정보가 없어 `DateTimeException`(`Unable to obtain Instant from TemporalAccessor`)으로 실패한다. `atZone(zone).toInstant()`나 `toInstant(offset)`으로 기준을 명시한다.
- `Instant.ofEpochSecond(3600)`은 `1970-01-01T01:00:00Z`이고 `getEpochSecond()`는 3600이다. `Instant`는 초와 나노초만 가지므로 `plus(1, ChronoUnit.MONTHS)`나 `get(ChronoField.YEAR)`는 `UnsupportedTemporalTypeException`이다. 달력 계산은 zone을 붙인 `ZonedDateTime`에서 한다.

## Duration과 Period

`Duration`은 seconds와 nanoseconds 기반의 시간량이고, `Period`는 years, months, days 기반의 달력량이다.

```java
Duration timeout = Duration.ofSeconds(30);
Period subscription = Period.ofMonths(1);
```

하루를 24시간으로 더하는 것과 다음 달력 날짜로 하루 이동하는 것은 DST 전환에서 결과가 다를 수 있다. 서버 timeout에는 `Duration`, 매달 같은 날짜의 구독 갱신에는 `Period`처럼 업무 의미에 맞춘다. `Period.ofMonths(1)`은 고정된 초 수가 아니다. `between`으로 구한 성분과 총량의 차이, `get`과 `to` 메서드, D-day 계산은 [[Java-Standard-Library-Date-and-Time-Calculation|Java 날짜와 시간 계산]]에서 다룬다.

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
- 패턴 문자는 대소문자를 구분한다. `M`은 월, `m`은 분이라 2024-03-07 21:45를 `yyyy-mm-dd`로 포맷하면 `2024-45-07`이 되고, 같은 패턴으로 `2024-03-07`을 파싱하면 월이 없어 실패한다.
- `H`는 0~23시, `h`는 1~12시다. `hh:mm`은 21:45를 `09:45`로 바꿔 오전과 오후를 잃고, `a` 없이 `09:30`을 파싱하면 시를 확정하지 못해 실패한다. `a`의 텍스트는 locale에 따라 오후, PM으로 달라지므로 파싱과 포맷 모두 locale을 명시한다.
- 구분자처럼 문자열 모양이 패턴과 다르면 `2024/03/07`은 index 4에서 바로 실패한다. `Y`는 locale의 주 규칙을 따르는 week-based-year라 2024-12-30을 `YYYY-MM-dd`로 포맷하면 `2025-12-30`이 된다.
- `ofPattern`은 SMART resolver라 `uuuu-MM-dd`로 `2024-02-30`을 파싱하면 오류 없이 2024-02-29가 된다. `LocalDate.parse`의 기본 ISO formatter는 STRICT라 실패한다. 입력 검증에는 `withResolverStyle(ResolverStyle.STRICT)`를 쓰고, STRICT에서는 `yyyy`가 era 없이 연도를 확정하지 못하므로 `uuuu`를 쓴다.

## 테스트와 저장 원칙

- `now()`를 도메인 로직 곳곳에서 직접 호출하지 말고 `Clock` 또는 현재 시각을 인자로 전달한다.
- DB column의 타입, JDBC driver와 ORM이 `Instant`, offset, local 값을 어떻게 보존하는지 통합 테스트한다.
- 사용자 zone, 이벤트가 발생한 zone과 서버 기본 zone을 구분한다.
- 날짜만 필요한 값에 자정 timestamp를 억지로 넣지 않는다.

## 면접 체크포인트

- `LocalDateTime`이 한 순간을 특정하지 못하는 이유와 국내 서비스 관행이 기대는 전제
- `ZoneId`와 `ZoneOffset`의 차이
- `isEqual`과 `equals`, `withZoneSameInstant`와 `withZoneSameLocal`의 차이
- `M`과 `m`, `H`와 `h`, `y`와 `Y`를 혼동했을 때의 결과
- DST gap과 overlap이 예약 시스템에 주는 영향
- `Instant`, `Duration`, `Period`의 서로 다른 의미
- 불변 날짜 연산의 반환값을 받아야 하는 이유
- `Clock` 주입이 테스트 가능성을 높이는 방식

## 출처

- [java.time, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/package-summary.html)
- [LocalDateTime, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/LocalDateTime.html)
- [ZonedDateTime, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/ZonedDateTime.html)
- [ChronoZonedDateTime, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/chrono/ChronoZonedDateTime.html)
- [OffsetDateTime, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/OffsetDateTime.html)
- [Instant, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Instant.html)
- [Year, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Year.html)
- [Duration, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Duration.html)
- [Period, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Period.html)
- [DateTimeFormatter, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/format/DateTimeFormatter.html)
- [ResolverStyle, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/format/ResolverStyle.html)
- [Clock, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Clock.html)
- [Date, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Date.html)
- [SimpleDateFormat, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/text/SimpleDateFormat.html)
- [Oracle, The Java Tutorials: Legacy Date-Time Code](https://docs.oracle.com/javase/tutorial/datetime/iso/legacy.html)
- [JCP, JSR 310: Date and Time API](https://jcp.org/en/jsr/detail?id=310)
- [Joda-Time — Joda.org](https://www.joda.org/joda-time/)
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

- [[Java-Standard-Library-Date-and-Time-Calculation|Java 날짜와 시간 계산]]
- [[Java-Standard-Library-Immutability-and-String|Java 불변 객체와 String]]
- [[Java-Standard-Library-Enum|Java 열거형]]
- [[Java-Standard-Library-Exception-Handling|Java 예외 처리]]
- [[Temporal-Modeling|시간 모델링 (시점, 기간, 간격, 반복)]]
