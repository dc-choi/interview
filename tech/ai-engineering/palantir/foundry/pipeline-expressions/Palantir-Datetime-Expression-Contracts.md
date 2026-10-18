---
tags: [palantir, pipeline-builder, datetime, timezone]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Pipeline Builder 날짜, 시간과 시간대

문자열 파싱, 시간대 재해석, 달력 연산과 경과 시간 계산을 구분한다. 공식 레퍼런스의 예제를 정리했으며 실제 Foundry 환경에서 실행하지 않았다. 문서 안에서 상충하는 예제는 미확인으로 남긴다.

## 문자열과 epoch 변환

`stringToDateV3`와 `stringToTimestampV3`는 Java DateTimeFormatter 형식 목록에서 처음 맞는 형식을 사용한다. 날짜 파서는 기본적으로 날짜 형식을 먼저, timestamp 파서는 timestamp 형식을 먼저 시도한다. 잘못된 값이나 형식은 null이 될 수 있다.

생략한 날짜 구성 요소가 자동으로 채워진다. 연도는 1970, 월과 일은 1이 되는 예제가 있으며 `yy`로 읽은 99는 2099이다. 실제 업무 날짜에 누락값을 허용해도 되는지 따로 정해야 한다. 오프셋을 포함한 문자열을 날짜로 바꾸면 UTC 환산으로 전날이 될 수 있다.

Timestamp 파서의 AM/PM 기본 시각은 6이다. 날짜와 PM만 있는 예제는 18시가 되며, 기본 시각을 0으로 바꾸면 12시가 된다. 명시적 Time zone이 입력 형식의 시간대를 덮어쓴다는 설명이 있지만, 숫자 오프셋 `-0500`과 `Australia/Sydney`를 함께 지정한 예제의 결과는 단순 우선순위만으로 설명되지 않는다. 숫자 오프셋과 이름 시간대의 충돌 입력은 실제 환경에서 별도 검증한다.

출처: [String to date](https://www.palantir.com/docs/foundry/pb-functions-expression/stringToDateV3), [String to timestamp](https://www.palantir.com/docs/foundry/pb-functions-expression/stringToTimestampV3)

Epoch 함수는 초와 밀리초 단위를 함수명으로 구분하며 UTC 기준이다. `epochSecondsToTimestampV1`은 문자열과 소수 초도 받을 수 있다. 반대 방향인 `timestampToEpochSecondsV1`은 Long을 반환하므로 예제의 13.47초가 13초가 되어 소수 부분을 잃는다. 밀리초 함수도 더 미세한 정밀도의 보존을 뜻하지 않는다.

출처: [Milliseconds to date](https://www.palantir.com/docs/foundry/pb-functions-expression/epochMillisToDateV1), [Milliseconds to timestamp](https://www.palantir.com/docs/foundry/pb-functions-expression/epochMillisToTimestampV1), [Seconds to date](https://www.palantir.com/docs/foundry/pb-functions-expression/epochSecondsToDateV1), [Seconds to timestamp](https://www.palantir.com/docs/foundry/pb-functions-expression/epochSecondsToTimestampV1), [Timestamp to milliseconds](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampToEpochMillisV1), [Timestamp to seconds](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampToEpochSecondsV1)

`dateToStringV2`와 `timestampToStringV2`는 표시 문자열을 만든다. Timestamp 표시의 기본 시간대는 UTC이다. `BST` 예제와 `Europe/London` 예제가 다른 오프셋을 보여 주므로 약어를 지역 시간대와 동일하게 취급하지 않는다. 지역의 일광 절약 규칙이 필요하면 명시적 지역 이름을 사용하고 전환일을 검증한다. [Date to string](https://www.palantir.com/docs/foundry/pb-functions-expression/dateToStringV2), [Timestamp to string](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampToStringV2)

## 시간대 변환은 표시 변경과 다르다

`timestampFromUtcV1`, `timestampToUtcV1`과 `changeTimestampTimeZoneV1`의 예제는 결과 timestamp 값 자체를 이동한다. 이미 UTC로 정규화된 시각에 지역 시간대 변환을 두 번 적용하면 다른 순간을 만들 수 있다. 입력이 절대 시각인지, 지역 벽시계 값을 timestamp에 담은 것인지 먼저 정한다.

From UTC 문서는 도시 이름에 일광 절약 규칙을 적용하지만 세 글자 코드에는 적용하지 않는다고 설명한다. London의 중복 시각과 존재하지 않는 시각도 To UTC 예제에 있으나, 이 사례만으로 모든 지역의 DST 충돌 정책을 일반화하지 않는다. `changeTimestampTimeZoneV1`의 Input time zone이 null인 예제는 UTC처럼 처리된다. 이 함수는 Batch/Faster만 지원한다.

출처: [From UTC](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampFromUtcV1), [To UTC](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampToUtcV1), [Change time zone](https://www.palantir.com/docs/foundry/pb-functions-expression/changeTimestampTimeZoneV1)

Legacy OffsetDateTime은 timestamp와 초 단위 offset을 가진 struct다. 변환 함수는 UTC timestamp를 반환한다. offset 추출은 timestamp가 null이어도 offset을 반환하며, struct 내부 offset이 null이면 0을 반환하는 예제가 있다. 두 legacy 함수는 Batch만 지원한다. [Convert legacy](https://www.palantir.com/docs/foundry/pb-functions-expression/convertLegacyOffsetDateTimeV1), [Extract legacy offset](https://www.palantir.com/docs/foundry/pb-functions-expression/extractOffsetFromLegacyOffsetDateTimeV1)

## 달력 연산과 계산 시점

| 목적 | 함수 계약 |
| --- | --- |
| 현재 날짜와 시각 | `currentDateV1`, `currentTimestampV2`는 계산 시작 시점을 사용한다. 이벤트 발생 시각이나 행마다 새로 읽는 시각으로 해석하지 않는다. 날짜의 기본 시간대는 UTC이다. |
| 날짜 더하기와 빼기 | `dateAddV2`, `dateSubV2`는 일, 주, 월, 분기, 연도를 지원하며 Date를 반환한다. |
| Timestamp 더하기와 빼기 | `timestampAddV1`, `timestampSubtractV1`은 밀리초부터 연도까지 단위를 받고 Timestamp를 반환한다. |
| 차이 | `timestampDiffV1`은 End에서 Start를 뺀 값을 지정 단위의 Long으로 반환한다. |
| 고정 단위 환산 | `convertTimeV1`은 주, 일, 시, 분, 초, 밀리초 사이 Double 환산이며 월과 연도는 단위에 없다. |
| 기간 문자열 | `parseDurationV1`은 ISO 8601 기간과 시작 시각을 받아 완전한 단위 수의 Long을 반환한다. 월의 길이는 시작 시각에 의존한다. 90.5초를 초 단위로 요청하면 90이다. 잘못된 기간이나 범위를 벗어난 값은 null이 될 수 있다. Batch만 지원한다. |

`datePartV1`의 주차는 월요일부터 일요일까지이며 ISO 8601의 leap week를 따른다. 2027-01-01의 주차는 53이므로 달력 연도와 주차만 붙인 식별자를 무조건 같은 주 연도로 해석하지 않는다. `timestampPartV1`은 시각의 구성 요소도 추출한다.

`dateTruncateV1`은 월요일 시작 주와 일요일 시작 주를 구분한다. `timestampTruncateV1`은 지정 단위 아래 정밀도를 버린다. `lastDayV1`의 주 마지막 날 예제는 일요일이다. `nextDayV1`은 현재 날짜보다 뒤의 날짜를 찾으므로 같은 요일이면 다음 주를 반환한다. truncate와 lastDay는 Batch/Faster, nextDay는 Batch만 지원한다.

출처: [Current date](https://www.palantir.com/docs/foundry/pb-functions-expression/currentDateV1), [Current timestamp](https://www.palantir.com/docs/foundry/pb-functions-expression/currentTimestampV2), [Date add](https://www.palantir.com/docs/foundry/pb-functions-expression/dateAddV2), [Date subtract](https://www.palantir.com/docs/foundry/pb-functions-expression/dateSubV2), [Timestamp add](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampAddV1), [Timestamp subtract](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampSubtractV1), [Difference](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampDiffV1), [Time units](https://www.palantir.com/docs/foundry/pb-functions-expression/convertTimeV1), [Duration](https://www.palantir.com/docs/foundry/pb-functions-expression/parseDurationV1)

출처: [Date part](https://www.palantir.com/docs/foundry/pb-functions-expression/datePartV1), [Timestamp part](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampPartV1), [Date truncate](https://www.palantir.com/docs/foundry/pb-functions-expression/dateTruncateV1), [Timestamp truncate](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampTruncateV1), [Last day](https://www.palantir.com/docs/foundry/pb-functions-expression/lastDayV1), [Next day](https://www.palantir.com/docs/foundry/pb-functions-expression/nextDayV1)

## 날짜 배열의 경계와 문서 불일치

`dateSequenceV1`, `timestampSequenceV1`은 시작과 끝을 포함하는 범위에서 step에 맞는 값들을 만든다. 끝이 간격과 맞지 않으면 끝값을 강제로 추가하지 않는다. Timestamp 예제는 시작이 끝보다 뒤여도 양수 step으로 내림차순 결과를 만든다. 두 함수 모두 Batch/Faster 지원이다.

Timestamp sequence의 step size 기본값은 1이라고 되어 있지만, null step을 보여 주는 예제 중에는 null 결과와 정상 배열 결과가 모두 있다. 생략한 선택 인자와 null을 반환하는 표현식의 차이일 가능성은 있지만 문서만으로 확정하지 않는다. 명시적 양수 step을 사용하고 null, 0, 역방향 구간을 따로 시험한다.

출처: [Date sequence](https://www.palantir.com/docs/foundry/pb-functions-expression/dateSequenceV1), [Timestamp sequence](https://www.palantir.com/docs/foundry/pb-functions-expression/timestampSequenceV1)

## 이전 버전 번역본의 경계

다음 출처는 공식 AIP 기계번역이며 정확성 미검증 경고가 있다. 현재 영어 문서와 같은 버전으로 취급하지 않는다.

`currentTimestampV1`도 계산 시작 시각을 사용하고 optional timezone 기본값은 UTC다. 문자열 V2 파서는 format 목록을 순서대로 시도한다. `stringToDateV2`의 +11 offset 예시는 전날 날짜를 반환하므로 입력의 달력 날짜를 그대로 떼는 연산이 아니다. `stringToTimestampV2`는 명시 timezone이 named zone을 덮는 예시와 numeric offset이 있는 예시를 구분한다. V3의 추가 기본값과 오류 정책을 V2 전체에 소급하지 않는다.

## 출처

- [Palantir, currentTimestampV1 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/currentTimestampV1/)
- [Palantir, stringToTimestampV2 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/stringToTimestampV2/)
- [Palantir, stringToDateV2 중국어 번역본](https://palantir.com/docs/zh/foundry/pb-functions-expression/stringToDateV2/)

- [Palantir, Pipeline Builder expression reference](https://www.palantir.com/docs/foundry/pb-functions-expression/)
- 각 계약의 함수별 공식 출처는 해당 본문에 연결했다.

## 관련 문서

- [[Palantir-Type-and-Encoding-Contracts|타입 변환과 표시 형식]]
- [[Palantir-Pipeline-Expressions|Pipeline Builder 표현식]]
