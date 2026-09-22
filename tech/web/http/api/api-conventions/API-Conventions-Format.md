---
tags: [web, http, api, convention]
status: done
verified_at: 2026-09-22
category: "웹&네트워크(Web&Network)"
aliases: ["API 시간 포맷", "JSON 키 네이밍"]
---

# API 컨벤션 — 시간, 네이밍, URI

## 시간 (Timestamp)

### 먼저 값의 의미를 고른다

| 의미 | 저장과 전송 계약 | 예시 |
|---|---|---|
| 이미 특정된 순간 | UTC로 정규화하거나 offset을 명시해 같은 순간을 식별 | 결제 승인, 로그 발생 시각 |
| 날짜 자체 | `YYYY-MM-DD`, 해석할 업무 달력과 날짜 기준을 명시 | 생년월일, 영업일 |
| 현지 시각으로 정한 일정 | 현지 날짜와 시각, 지역 시간대, 변환 정책을 보존 | 특정 장소의 오전 예약, 매일 현지 시각에 실행 |

서버의 기본 시간대를 암묵적으로 적용하지 않는다. 회의실의 예약 기준은 시설의 시간대일 수 있고, 사용자가 화면을 보는 시간대와 다를 수 있다. UTC 값만으로 장소의 현지 시각이나 반복 일정의 의도까지 복원할 수 있는 것은 아니다.

`+09:00` 같은 offset은 한 순간의 UTC 차이다. `Asia/Seoul` 같은 지역 시간대는 날짜에 따른 규칙을 가리킨다. 고정 offset을 전제로 만든 변환을 다른 지역에 적용할 때는 일광절약시간과 규칙 변경을 별도로 다룬다. 미래 일정에서 규칙이 바뀌면 현지 시각과 이미 계산한 순간 중 무엇을 유지할지도 정한다.

PostgreSQL의 `timestamp with time zone`은 순간을 UTC로 저장하지만 입력한 지역 시간대 이름을 보존하지 않는다. 지역이 업무 의미에 필요하면 별도 필드로 남긴다. 다른 DB의 `TIMESTAMP`와 `DATETIME`을 이름만 보고 같은 의미로 취급하지 않는다.

### API 전송 형식

순간의 문자열 표현은 RFC 3339처럼 offset이 명확한 형식을 사용한다. `Z`는 UTC를 나타내지만 표시할 지역, 업무일의 기준과 예약 해석 정책까지 설명하지는 않는다.

- `2026-04-17T17:00:00.000Z`: UTC 순간
- `2026-04-18T02:00:00.000+09:00`: 위와 같은 순간의 다른 표현
- Unix epoch를 사용한다면 초 또는 밀리초 등 단위와 허용 정밀도를 명시한다.
- 소수점 자리수와 정밀도는 시스템 간 계약으로 정한다. 밀리초 표시를 추가해도 원본의 정확성이 높아지는 것은 아니다.

문자열 정렬을 사용하려면 offset 표현과 소수점 정밀도 등을 통일한다. 서로 다른 offset의 문자열은 시간순 정렬과 일치하지 않을 수 있다.

### 입력과 경계 검증

문자열 모양과 실제 달력의 유효성은 별도로 검사한다. `2023-02-29`는 날짜 형식과 맞아도 존재하지 않는다. 현지 시각이 사라지거나 두 번 나타나는 시간대 전환에는 거부, 앞선 순간 또는 뒤의 순간 선택 같은 업무 정책이 필요하다.

예약 구간을 `[start, end)`로 정하면 앞 예약의 종료와 다음 예약의 시작이 같아도 겹치지 않는다. `start < end`와 같은 시간축이라는 전제에서 겹침 조건은 `a.start < b.end && b.start < a.end`다. 날짜별로 후보를 나누어 조회한다면 자정을 넘는 구간도 놓치지 않아야 한다. 이 비교식 자체가 동시 예약의 안전성을 보장하지는 않는다.

검증에는 서버 시간대 변경, 업무일 자정, 윤년, 구간 끝점 일치와 해당 지역의 시간대 전환을 포함한다. 언어별 시간 타입과 계산은 [[Java-Standard-Library-Date-and-Time|날짜와 시간의 의미 구분]]을 참고한다.

## JSON 키 네이밍

| 스타일 | 예 | 쓰는 곳 |
|---|---|---|
| **camelCase** | `firstName`, `createdAt` | **권장** — JS, Java, Kotlin, Swift 모두 익숙 |
| snake_case | `first_name`, `created_at` | Python, Ruby 생태계, 일부 구식 API |
| PascalCase | `FirstName` | C# 생태계 일부 |
| kebab-case | `first-name` | JS 변수로 불가 → 헤더, URL에만 |

팀에서 **하나로 통일**. camelCase가 프론트, 모바일과 자연스럽게 맞물려 가장 일반적.

## URI 컨벤션 (REST 기반)

```
/users                   ← 컬렉션, 복수형
/users/{id}              ← 개별, 경로 파라미터
/users/{id}/comments     ← 계층 최대 1단계
/users?role=admin        ← 필터는 쿼리스트링
/users?sort=-createdAt   ← 정렬 `-` 접두사로 내림차순
```

세부는 [[REST#Resource URI 설계|REST URI 설계]] 참고.

## 출처

- [RFC 3339, Date and Time on the Internet: Timestamps](https://www.rfc-editor.org/rfc/rfc3339)
- [TC39 Temporal, Time Zones and Resolving Ambiguity](https://tc39.es/proposal-temporal/docs/timezone.html)
- [PostgreSQL 18, Date/Time Types](https://www.postgresql.org/docs/18/datatype-datetime.html)
- [PostgreSQL 18, Range Types](https://www.postgresql.org/docs/18/rangetypes.html)

## 관련 문서

- [[API-Conventions|API 실무 컨벤션]]
- [[Java-Standard-Library-Date-and-Time|순간, 현지 시각과 시간대]]
