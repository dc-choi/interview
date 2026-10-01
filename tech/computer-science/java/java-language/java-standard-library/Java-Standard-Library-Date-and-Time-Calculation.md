---
tags: [java, date-time, temporal, chrono-unit, chrono-field, temporal-adjuster, period, duration]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Date and Time Calculation", "Java 날짜와 시간 계산"]
---

# Java 날짜와 시간 계산: 필드, 단위, 조정과 기간

`java.time`의 시점 타입은 같은 `get`, `with`, `plus`, `until` 계약을 공유하지만, 타입마다 지원하는 필드와 단위가 다르고 그 차이는 컴파일이 아니라 실행 시점에 드러난다. 타입 선택, zone, parsing과 저장 원칙은 [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]에서 다룬다. 아래 결과와 예외 메시지는 JDK 21.0.3 실행으로 확인했다.

## 시점과 시간의 양을 나누는 인터페이스

| 인터페이스 | 역할 | 구현 예 |
|---|---|---|
| `TemporalAccessor` | 읽기 전용 필드 조회(`get`, `getLong`, `isSupported(field)`) | 아래 `Temporal` 구현 전부와 조회만 하는 `DayOfWeek`, `Month`, `MonthDay`, `ZoneOffset` |
| `Temporal` | 조회와 조작(`plus`, `minus`, `with`, `until`, `isSupported(unit)`) | `LocalDate`, `LocalTime`, `LocalDateTime`, `ZonedDateTime`, `OffsetDateTime`, `Instant`, `Year`, `YearMonth` |
| `TemporalAmount` | 시간의 양 | `Period`(연, 월, 일), `Duration`(초, 나노초) |
| `TemporalAdjuster` | 날짜를 관련된 다른 날짜로 바꾸는 전략 | `TemporalAdjusters`가 제공하는 함수 |

`DayOfWeek`처럼 필드가 연속되지 않은 타입은 `plus`와 `minus`로 다룰 만큼 완전하지 않아 `TemporalAccessor`만 구현한다. 시간의 양은 `dt.plus(Period.ofYears(10))`처럼 시점에 적용하며 `dt.plus(10, ChronoUnit.YEARS)`와 결과가 같다.

## 단위와 필드

- 단위(`TemporalUnit`, 표준 구현 `ChronoUnit`)는 시간을 재는 길이다. `NANOS`부터 `DAYS`, `WEEKS`, `MONTHS`, `YEARS`까지 있고 `plus(amount, unit)`, `until`, `ChronoUnit.SECONDS.between(start, end)`에 쓴다. 시간 이하 단위는 정확하고 날짜 단위의 길이는 추정값이다. `DAYS`는 DST로, `MONTHS`는 달마다 길이가 달라진다.
- 필드(`TemporalField`, 표준 구현 `ChronoField`)는 더 큰 날짜와 시간 안의 한 칸이며 유효 범위가 있다. `ChronoField.SECOND_OF_MINUTE.range()`는 `0 - 59`다. `get`, `getLong`, `with(field, value)`에 쓴다.
- `DAYS`는 하루라는 길이, `DAY_OF_MONTH`는 월 안의 몇 번째 날이다. 값을 꺼내거나 지정할 때는 필드, 더하고 빼거나 차이를 셀 때는 단위를 쓴다.

명확한 메서드가 있으면 `getYear`, `getMonthValue`, `plusDays`처럼 구체 API를 우선하고, 없는 값만 `dt.get(ChronoField.MINUTE_OF_DAY)`처럼 필드로 꺼낸다(13:30이면 810). 동적인 field와 unit을 다루는 framework나 범용 로직에서는 `ChronoField`, `ChronoUnit`, `TemporalQuery`, `TemporalAdjuster`를 사용할 수 있다. 여러 chronology를 일반화하는 API는 복잡성을 높이므로 서비스와 저장 경계에는 보통 ISO-8601 타입을 사용하고 사용자 표시 단계에서 locale과 달력 체계를 적용한다.

타입이 지원하지 않는 필드나 단위는 `DateTimeException`의 하위인 `UnsupportedTemporalTypeException`으로 실패한다.

| 호출 | 결과 |
|---|---|
| `LocalDate.of(2024, 1, 1).get(ChronoField.SECOND_OF_MINUTE)` | `Unsupported field: SecondOfMinute` |
| `LocalDate.of(2024, 1, 1).plus(1, ChronoUnit.HOURS)` | `Unsupported unit: Hours` |
| `Instant.now().get(ChronoField.YEAR)` | `Unsupported field: Year`. `Instant`에는 달력 필드가 없다 |

필드와 단위를 인자로 받는 범용 코드는 `isSupported(ChronoField.X)`, `isSupported(ChronoUnit.X)`로 먼저 확인한다. 지원하는 필드라도 범위 밖 값은 `LocalDate.of(2024, 2, 1).with(ChronoField.DAY_OF_MONTH, 31)`처럼 `DateTimeException`(`Invalid date 'FEBRUARY 31'`)이 된다.

## with와 TemporalAdjusters

`with`는 필드 하나나 조정 규칙을 적용한 새 객체를 반환한다. `LocalDate.of(2018, 1, 1).with(ChronoField.YEAR, 2020)`은 2020-01-01이고 원본은 그대로이므로 반환값을 받아야 한다. 다음 금요일, 이번 달 마지막 일요일 같은 날짜는 직접 계산하지 말고 `TemporalAdjusters`를 넘긴다.

```java
LocalDate nextBusinessCandidate = date
    .with(TemporalAdjusters.firstDayOfNextMonth());
```

| adjuster | 의미 | 예 |
|---|---|---|
| `next(FRIDAY)` | 기준일 이후 첫 금요일, 당일 제외 | 2024-01-05(금) → 2024-01-12 |
| `nextOrSame(FRIDAY)` | 당일이 금요일이면 당일 | 2024-01-05(금) → 2024-01-05 |
| `lastInMonth(SUNDAY)` | 같은 달의 마지막 일요일 | 2018-01-01 → 2018-01-28 |
| `lastDayOfMonth()` | 그 달의 말일 | 2024-02-10 → 2024-02-29 |
| `firstDayOfNextMonth()` | 다음 달 1일 | 2024-01-31 → 2024-02-01 |

- `next`는 다음 주 금요일이 아니라 기준일 이후 첫 금요일이다. 월요일 2018-01-01에는 같은 주 2018-01-05가 되고, 금요일 당일에는 `next`와 `nextOrSame`이 일주일 차이 난다.
- `DayOfWeek.getValue()`는 ISO-8601 기준 월요일 1부터 일요일 7까지다. 레거시 `Calendar`의 `DAY_OF_WEEK`는 일요일이 1, JavaScript `Date.prototype.getDay()`는 일요일이 0이므로 시스템 사이에 요일 번호를 그대로 옮기지 않고 enum 이름 같은 명시적 표현으로 주고받는다.
- 일요일부터 시작하는 달력에서 1일 앞의 빈칸 수는 `firstDay.getDayOfWeek().getValue() % 7`(일 0, 월 1, 토 6)이다. 날짜 순회는 1일부터 `firstDayOfNextMonth()` 직전까지 `isBefore`로 돌면 월 길이를 따로 계산하지 않아도 된다. [[Temporal-Modeling|시간 모델링]]의 반개구간 `[start, end)`와 같은 원리다.

## Period와 Duration 계산

`Duration`은 초와 나노초, `Period`는 연, 월, 일을 저장한다. 두 타입의 의미 차이와 DST 영향은 [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]의 Duration과 Period 절에서 다룬다.

| 질문 | API | 2024-01-01부터 2024-11-21까지 |
|---|---|---|
| 연, 월, 일 성분 | `Period.between(start, end)` | `P10M20D`, `getMonths()` 10, `getDays()` 20 |
| 총 일수 | `ChronoUnit.DAYS.between(start, end)` 또는 `start.until(end, ChronoUnit.DAYS)` | 325 |
| 총 개월 수 | `period.toTotalMonths()` 또는 `ChronoUnit.MONTHS.between(start, end)` | 10 |

- `Period.between`은 시작일을 포함하고 끝 날짜를 제외하며, 완전한 달을 먼저 뺀 뒤 남은 일수를 구한다. `getDays()`는 그 나머지 일 성분이라 D-day에 쓰면 325가 아니라 20이 나온다. 카운트다운 일수는 `ChronoUnit.DAYS.between`, N개월 M일 남음 같은 달력 표현은 `Period`로 구한다.
- `ChronoUnit.between`은 완전한 단위 수만 센다. 11:30부터 13:29까지는 1시간이다. 두 API 모두 끝 날짜를 제외하므로 당일을 D-0으로 표시할지는 제품 규칙으로 정한다.
- `Duration`은 초와 나노초만 저장하므로 `getSeconds()`, `getNano()`만 저장값을 꺼내고, 시와 분은 `toHours()`, `toMinutes()`처럼 계산을 뜻하는 `to` 메서드로 얻는다. `getHours()`는 없다. `toMinutes()`는 전체 간격의 총량(1시간 30분이면 90)이고, Java 9부터 있는 `toMinutesPart()`는 시를 뺀 나머지(30)다.
- `Period`의 `getYears()`, `getMonths()`, `getDays()`는 저장된 성분을 그대로 꺼내며 서로 정규화되지 않는다. `Period.ofMonths(14)`는 `P14M`이고 `normalized()`를 거쳐야 `P1Y2M`이 된다.
- 문자열 표현은 ISO-8601 기간 표기다. `Period.ofDays(10)`은 `P10D`, `Duration.ofMinutes(30)`은 `PT30M`이며 `T` 뒤가 시, 분, 초다. `Duration.ofDays(2)`는 `PT48H`로 표기된다.
- `Duration.between`은 초 단위를 지원하는 타입끼리만 계산한다. `LocalDate` 두 개를 넘기면 `UnsupportedTemporalTypeException: Unsupported unit: Seconds`이므로 날짜 차이는 `Period`나 `ChronoUnit.DAYS`로 구한다.

## 면접 체크포인트

- 단위와 필드의 차이, `DAYS`와 `DAY_OF_MONTH`
- `UnsupportedTemporalTypeException`이 컴파일 시점에 잡히지 않는 이유
- `next`와 `nextOrSame`의 당일 처리
- `Period.between(...).getDays()`가 총 일수가 아닌 이유
- `toMinutes()`와 `toMinutesPart()`의 차이
- 요일 번호 체계가 API마다 다른 문제

## 출처

- [java.time.temporal, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/temporal/package-summary.html)
- [Temporal, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/temporal/Temporal.html)
- [TemporalAccessor, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/temporal/TemporalAccessor.html)
- [ChronoUnit, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/temporal/ChronoUnit.html)
- [TemporalAdjusters, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/temporal/TemporalAdjusters.html)
- [DayOfWeek, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/DayOfWeek.html)
- [Period, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Period.html)
- [Duration, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/time/Duration.html)
- [Calendar, Java SE 26 API](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Calendar.html)
- [ECMAScript Language Specification, WeekDay](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-weekday)
- 김영한 강사, [기간, 시간의 간격 - Duration, Period](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212249)
- 김영한 강사, [날짜와 시간의 핵심 인터페이스](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212250)
- 김영한 강사, [날짜와 시간 조회하고 조작하기1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212251)
- 김영한 강사, [날짜와 시간 조회하고 조작하기2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212252)
- 김영한 강사, [날짜와 시간 문제와 풀이1](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212254)
- 김영한 강사, [날짜와 시간 문제와 풀이2](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212255)
- 김영한 강사, [날짜와 시간 정리](https://www.inflearn.com/courses/lecture?courseId=333308&unitId=212256)

## 관련 문서

- [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]
- [[Temporal-Modeling|시간 모델링 (시점, 기간, 간격, 반복)]]
