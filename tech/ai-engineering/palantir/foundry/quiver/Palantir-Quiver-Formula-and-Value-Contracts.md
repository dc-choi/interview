---
tags: [palantir, foundry, quiver, formula, type-conversion, "null"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Quiver 수식, 값 변환과 빈값 계약"]
---

# Quiver 수식, 값 변환과 빈값 계약

Quiver의 numeric/time-series/chart formula는 자체 수식 언어를 사용한다. Dataset Expression의 Contour 언어, SparkSQL 또는 JavaScript와 문법이 비슷해도 같은 실행 의미를 가정하지 않는다.

## 참조와 계산

`$A`는 다른 카드의 global identifier, transform table의 `@column`은 현재 행의 열 참조다. Object-property 수식의 `@`를 쓰려면 해당 object input을 설정한다. Scalar, numeric series, time series, categorical/segment formula는 출력의 축과 결합 기준이 다르다.

수식은 double/scientific notation, 문자열, 비교와 Boolean 조건, 산술 연산, ternary, 변수와 early return/skip을 제공한다. `^`는 거듭제곱이 아니라 bitwise XOR다. 거듭제곱은 `pow`를 사용한다. `atan2`는 `(y,x)` 순서를 확인한다. Bitwise 연산을 일반 실수 산술과 혼동하지 않는다.

일반 formula syntax의 최종 결과 설명은 numeric/string을 대상으로 하며 한 수식이 number와 string을 섞어 반환하지 않도록 한다. Boolean이 필요하면 해당 문맥을 확인한다. Boolean formula는 transform table 전용이며, table filter/time-series search 조건은 Boolean을 반환하도록 명시한다. 일반 결과 타입 설명을 이 조건식에 그대로 적용하지 않는다.

Time series formula는 timestamp 정렬과 interpolation을 거쳐 계산한다. Numeric series formula는 numeric x-axis를 만드는 카드이며 일반 time-axis chart용이 아니다. Categorical formula는 matching category/segment끼리 계산한다.

## 변환 실패와 기본값

| 변환 | 명시된 계약 |
|---|---|
| String to number | 숫자가 아닌 입력은 `NaN` |
| String to Boolean | literal true/false 변환. 다른 문자열은 기본 false, default와 mapping 재설정 가능 |
| String to date | timezone/Day.js format 지정 가능, 기본 미국식 월/일/년. 잘못된 값은 `Invalid timezone or date` |
| Number to date / numeric range to date range | Unix seconds 또는 milliseconds를 명시 선택 |
| Coalesce | 처음으로 null이 아닌 값, 전부 null이면 null |
| Coalesce time series | null 또는 errored가 아닌 첫 series, 전부 null이면 null |

`NaN`, null, empty string과 error는 서로 다른 상태다. Scalar coalesce가 모든 `NaN`/error까지 처리한다고 확장하지 않는다. 일반 수식 예시의 `!= NaN`을 다른 언어의 NaN 비교 규칙으로 가져오지 않는다. `isnan`/`isfinite`가 제공되지만 조건별 실제 입력을 대조해야 한다.

Date property의 numeric aggregation은 화면에는 날짜로 보이더라도 underlying value는 numeric일 수 있다. Time input 카드로 연결하려면 Number to date와 단위를 확인한다. 표시만 보고 타입을 정하지 않는다.

Transform table filter의 visual editor는 string/date/number/Boolean을 받는다. Formula filter는 Boolean 결과가 필요하고 string 입력은 지원하지 않아 string 조건은 visual editor를 사용한다.

## 문자열, 배열과 날짜

Contains는 case-sensitive이며 `.`, `/`, `@`, `-`, 공백을 word boundary로 취급한다. Starts with는 같은 문자를 literal 검색 문자열의 일부로 취급한다. 단순 언어 내 substring 함수와 같은 tokenizer라고 가정하지 않는다. Ends with/does not contain도 case-sensitive로 설명되지만 boundary 규칙을 동일하게 확장하지 않는다.

Concatenate는 두 string, Array join은 string array를 delimiter로 합친다. Split은 string을 delimiter 기준 string array로 만든다. Substring은 start index와 length를 받지만 이 짧은 reference만으로 음수/초과 index 처리를 보장하지 않는다. Lower/upper case는 비알파벳 문자를 그대로 둔다.

Create array, unique values, sort, contains, length와 first/last/index access는 string/number/time/Boolean array를 다룬다. Stepped array는 start/end/step으로 numeric array를 만든다. Empty array, out-of-bounds와 0 step의 실패 계약은 해당 카드 설명에 없으므로 추정하지 않는다. Strings-to-number/date/Boolean array 변환도 scalar 실패값을 그대로 보장한다고 단정하지 않는다.

Number array aggregation은 sum/average/stddev/min/max/difference/product/count/first/last를 제공한다. Row number는 0부터 시작하지만 값의 영구 identity가 아니다. Column values는 typed array를 반환하며 object-set unique-property selector의 상위 1,000개 제한과 구분한다.

Day/week/month/year-to-date는 해당 기간의 00:00부터 입력 date까지의 range다. Week 시작은 locale에 따라 일요일 또는 월요일이다. Date difference는 week/day/hour/minute/second/millisecond 단위를 받는다. 날짜 일부를 추출하는 카드의 숫자 반환만으로 weekday 번호 체계나 timezone 처리를 확정하지 않는다.

## Parameter와 range

Numeric/string/Boolean/time/duration/object/array selector는 typed input이다. Property value selector는 object property, string selector는 주어진 string array로 선택 범위를 정한다. Date/time range는 fixed, 현재 시각 상대값 또는 두 time variable로 구성하고 relative range는 페이지 로드 때 갱신된다.

Range start/end는 range를 scalar로 분해한다. Create range/static time는 transform table의 모든 행에 같은 값을 붙이는 용도다. X/Y range는 두 축의 range를 함께 보관하며 각 축은 time/numeric/ordinal일 수 있다. Boolean parameter가 전역 설정을 제어하려면 Allow settings to be controlled 설정과 연결해야 한다.

## 적용 점검

실패값을 업무상 false/0으로 바꾸면 데이터 품질 문제가 정상 결과처럼 보일 수 있다. 변환 전 타입/단위, 변환 실패 상태와 fallback 선택을 분리해 검토한다. 짧은 카드 reference는 모든 경계 조건의 실행 schema를 보증하지 않는다.

## 출처

- [Palantir Quiver, Quiver / Detailed card index / After](https://www.palantir.com/docs/foundry/quiver/card-after)
- [Palantir Quiver, Quiver / Detailed card index / Array contains](https://www.palantir.com/docs/foundry/quiver/card-array-contains)
- [Palantir Quiver, Quiver / Detailed card index / Array end](https://www.palantir.com/docs/foundry/quiver/card-array-end)
- [Palantir Quiver, Quiver / Detailed card index / Array join](https://www.palantir.com/docs/foundry/quiver/card-array-join)
- [Palantir Quiver, Quiver / Detailed card index / Array length](https://www.palantir.com/docs/foundry/quiver/card-array-length)
- [Palantir Quiver, Quiver / Detailed card index / Array sort](https://www.palantir.com/docs/foundry/quiver/card-array-sort)
- [Palantir Quiver, Quiver / Detailed card index / Array start](https://www.palantir.com/docs/foundry/quiver/card-array-start)
- [Palantir Quiver, Quiver / Detailed card index / Before](https://www.palantir.com/docs/foundry/quiver/card-before)
- [Palantir Quiver, Quiver / Detailed card index / Between (inclusive)](https://www.palantir.com/docs/foundry/quiver/card-between-inclusive)
- [Palantir Quiver, Quiver / Detailed card index / Boolean formula](https://www.palantir.com/docs/foundry/quiver/card-boolean-formula)
- [Palantir Quiver, Quiver / Detailed card index / Boolean parameter](https://www.palantir.com/docs/foundry/quiver/card-boolean-parameter)
- [Palantir Quiver, Quiver / Detailed card index / Ceiling](https://www.palantir.com/docs/foundry/quiver/card-ceiling)
- [Palantir Quiver, Quiver / Detailed card index / Coalesce](https://www.palantir.com/docs/foundry/quiver/card-coalesce)
- [Palantir Quiver, Quiver / Detailed card index / Concatenate](https://www.palantir.com/docs/foundry/quiver/card-concatenate)
- [Palantir Quiver, Quiver / Detailed card index / Contains](https://www.palantir.com/docs/foundry/quiver/card-contains)
- [Palantir Quiver, Quiver / Detailed card index / Create array](https://www.palantir.com/docs/foundry/quiver/card-create-array)
- [Palantir Quiver, Quiver / Detailed card index / Create range](https://www.palantir.com/docs/foundry/quiver/card-create-range)
- [Palantir Quiver, Quiver / Detailed card index / Date difference](https://www.palantir.com/docs/foundry/quiver/card-date-difference)
- [Palantir Quiver, Quiver / Detailed card index / Date to string](https://www.palantir.com/docs/foundry/quiver/card-date-to-string)
- [Palantir Quiver, Quiver / Detailed card index / Date/time parameter](https://www.palantir.com/docs/foundry/quiver/card-datetime-parameter)
- [Palantir Quiver, Quiver / Detailed card index / Date/time range parameter](https://www.palantir.com/docs/foundry/quiver/card-datetime-range-parameter)
- [Palantir Quiver, Quiver / Detailed card index / Day of month](https://www.palantir.com/docs/foundry/quiver/card-day-of-month)
- [Palantir Quiver, Quiver / Detailed card index / Day of week](https://www.palantir.com/docs/foundry/quiver/card-day-of-week)
- [Palantir Quiver, Quiver / Detailed card index / Day of year](https://www.palantir.com/docs/foundry/quiver/card-day-of-year)
- [Palantir Quiver, Quiver / Detailed card index / Day to date](https://www.palantir.com/docs/foundry/quiver/card-day-to-date)
- [Palantir Quiver, Quiver / Detailed card index / Does not contain](https://www.palantir.com/docs/foundry/quiver/card-does-not-contain)
- [Palantir Quiver, Quiver / Detailed card index / Duration unit parameter](https://www.palantir.com/docs/foundry/quiver/card-duration-unit-parameter)
- [Palantir Quiver, Quiver / Detailed card index / Ends with](https://www.palantir.com/docs/foundry/quiver/card-ends-with)
- [Palantir Quiver, Quiver / Detailed card index / Equal to](https://www.palantir.com/docs/foundry/quiver/card-equal-to)
- [Palantir Quiver, Quiver / Detailed card index / Find and replace](https://www.palantir.com/docs/foundry/quiver/card-find-and-replace)
- [Palantir Quiver, Quiver / Detailed card index / Floor](https://www.palantir.com/docs/foundry/quiver/card-floor)
- [Palantir Quiver, Quiver / Detailed card index / Greater than](https://www.palantir.com/docs/foundry/quiver/card-greater-than)
- [Palantir Quiver, Quiver / Detailed card index / Greater than or equal to](https://www.palantir.com/docs/foundry/quiver/card-greater-than-or-equal-to)
- [Palantir Quiver, Quiver / Detailed card index / Hour of day](https://www.palantir.com/docs/foundry/quiver/card-hour-of-day)
- [Palantir Quiver, Quiver / Detailed card index / Is](https://www.palantir.com/docs/foundry/quiver/card-is)
- [Palantir Quiver, Quiver / Detailed card index / Is not](https://www.palantir.com/docs/foundry/quiver/card-is-not)
- [Palantir Quiver, Quiver / Detailed card index / Less than](https://www.palantir.com/docs/foundry/quiver/card-less-than)
- [Palantir Quiver, Quiver / Detailed card index / Less than or equal to](https://www.palantir.com/docs/foundry/quiver/card-less-than-or-equal-to)
- [Palantir Quiver, Quiver / Detailed card index / Month](https://www.palantir.com/docs/foundry/quiver/card-month)
- [Palantir Quiver, Quiver / Detailed card index / Month to date](https://www.palantir.com/docs/foundry/quiver/card-month-to-date)
- [Palantir Quiver, Quiver / Detailed card index / Not equal to](https://www.palantir.com/docs/foundry/quiver/card-not-equal-to)
- [Palantir Quiver, Quiver / Detailed card index / Not on](https://www.palantir.com/docs/foundry/quiver/card-not-on)
- [Palantir Quiver, Quiver / Detailed card index / Number array aggregation](https://www.palantir.com/docs/foundry/quiver/card-number-array-aggregation)
- [Palantir Quiver, Quiver / Detailed card index / Number to date](https://www.palantir.com/docs/foundry/quiver/card-number-to-date)
- [Palantir Quiver, Quiver / Detailed card index / Numeric formula](https://www.palantir.com/docs/foundry/quiver/card-numeric-formula)
- [Palantir Quiver, Quiver / Detailed card index / Numeric parameter](https://www.palantir.com/docs/foundry/quiver/card-numeric-parameter)
- [Palantir Quiver, Quiver / Detailed card index / Numeric range parameter](https://www.palantir.com/docs/foundry/quiver/card-numeric-range-parameter)
- [Palantir Quiver, Quiver / Detailed card index / Numeric range to date range](https://www.palantir.com/docs/foundry/quiver/card-numeric-range-to-date-range)
- [Palantir Quiver, Quiver / Detailed card index / Numeric series formula](https://www.palantir.com/docs/foundry/quiver/card-numeric-series-formula)
- [Palantir Quiver, Quiver / Detailed card index / On](https://www.palantir.com/docs/foundry/quiver/card-on)
- [Palantir Quiver, Quiver / Detailed card index / On or after](https://www.palantir.com/docs/foundry/quiver/card-on-or-after)
- [Palantir Quiver, Quiver / Detailed card index / On or before](https://www.palantir.com/docs/foundry/quiver/card-on-or-before)
- [Palantir Quiver, Quiver / Detailed card index / Range end](https://www.palantir.com/docs/foundry/quiver/card-range-end)
- [Palantir Quiver, Quiver / Detailed card index / Range start](https://www.palantir.com/docs/foundry/quiver/card-range-start)
- [Palantir Quiver, Quiver / Detailed card index / Row number](https://www.palantir.com/docs/foundry/quiver/card-row-number)
- [Palantir Quiver, Quiver / Detailed card index / Shift date/time](https://www.palantir.com/docs/foundry/quiver/card-shift-datetime)
- [Palantir Quiver, Quiver / Detailed card index / Split](https://www.palantir.com/docs/foundry/quiver/card-split)
- [Palantir Quiver, Quiver / Detailed card index / Starts with](https://www.palantir.com/docs/foundry/quiver/card-starts-with)
- [Palantir Quiver, Quiver / Detailed card index / Static time](https://www.palantir.com/docs/foundry/quiver/card-static-time)
- [Palantir Quiver, Quiver / Detailed card index / Stepped array](https://www.palantir.com/docs/foundry/quiver/card-stepped-array)
- [Palantir Quiver, Quiver / Detailed card index / String array parameter](https://www.palantir.com/docs/foundry/quiver/card-string-array-parameter)
- [Palantir Quiver, Quiver / Detailed card index / String parameter](https://www.palantir.com/docs/foundry/quiver/card-string-parameter)
- [Palantir Quiver, Quiver / Detailed card index / String selector](https://www.palantir.com/docs/foundry/quiver/card-string-selector)
- [Palantir Quiver, Quiver / Detailed card index / String to Boolean](https://www.palantir.com/docs/foundry/quiver/card-string-to-boolean)
- [Palantir Quiver, Quiver / Detailed card index / String to date](https://www.palantir.com/docs/foundry/quiver/card-string-to-date)
- [Palantir Quiver, Quiver / Detailed card index / String to number](https://www.palantir.com/docs/foundry/quiver/card-string-to-number)
- [Palantir Quiver, Quiver / Detailed card index / Strings to booleans](https://www.palantir.com/docs/foundry/quiver/card-strings-to-booleans)
- [Palantir Quiver, Quiver / Detailed card index / Strings to dates](https://www.palantir.com/docs/foundry/quiver/card-strings-to-dates)
- [Palantir Quiver, Quiver / Detailed card index / Strings to numbers](https://www.palantir.com/docs/foundry/quiver/card-strings-to-numbers)
- [Palantir Quiver, Quiver / Detailed card index / Substring](https://www.palantir.com/docs/foundry/quiver/card-substring)
- [Palantir Quiver, Quiver / Detailed card index / To lower case](https://www.palantir.com/docs/foundry/quiver/card-to-lower-case)
- [Palantir Quiver, Quiver / Detailed card index / To upper case](https://www.palantir.com/docs/foundry/quiver/card-to-upper-case)
- [Palantir Quiver, Quiver / Detailed card index / Unique values](https://www.palantir.com/docs/foundry/quiver/card-unique-values)
- [Palantir Quiver, Quiver / Detailed card index / Value at index](https://www.palantir.com/docs/foundry/quiver/card-value-at-index)
- [Palantir Quiver, Quiver / Detailed card index / Week to date](https://www.palantir.com/docs/foundry/quiver/card-week-to-date)
- [Palantir Quiver, Quiver / Detailed card index / X/Y range parameter](https://www.palantir.com/docs/foundry/quiver/card-xy-range-parameter)
- [Palantir Quiver, Quiver / Detailed card index / Year](https://www.palantir.com/docs/foundry/quiver/card-year)
- [Palantir Quiver, Quiver / Detailed card index / Year to date](https://www.palantir.com/docs/foundry/quiver/card-year-to-date)
- [Palantir Quiver, Quiver / Analysis / Formula syntax](https://www.palantir.com/docs/foundry/quiver/cards-formula-syntax)
- [Palantir Quiver, Quiver / Analysis / Formulas](https://www.palantir.com/docs/foundry/quiver/cards-formulas)
- [Palantir Quiver, Quiver / Card references / Array](https://www.palantir.com/docs/foundry/quiver/cards-index-array)
- [Palantir Quiver, Quiver / Card references / Boolean](https://www.palantir.com/docs/foundry/quiver/cards-index-boolean)
- [Palantir Quiver, Quiver / Card references / Date/Time](https://www.palantir.com/docs/foundry/quiver/cards-index-datetime)
- [Palantir Quiver, Quiver / Card references / Numeric](https://www.palantir.com/docs/foundry/quiver/cards-index-numeric)
- [Palantir Quiver, Quiver / Card references / String](https://www.palantir.com/docs/foundry/quiver/cards-index-string)
- [Palantir Quiver, Quiver / Analysis / Parameters](https://www.palantir.com/docs/foundry/quiver/cards-parameters)
- [Palantir Quiver, Quiver / Transform references / Array operations](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-array-operations)
- [Palantir Quiver, Quiver / Transform references / Boolean comparisons](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-boolean-comparisons)
- [Palantir Quiver, Quiver / Transform references / Boolean operations](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-boolean-operations)
- [Palantir Quiver, Quiver / Transform references / Null/error handling](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-null-error-handling)
- [Palantir Quiver, Quiver / Transform references / Number comparisons](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-number-comparisons)
- [Palantir Quiver, Quiver / Transform references / Number operations](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-number-operations)
- [Palantir Quiver, Quiver / Transform references / Range operations](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-range-operations)
- [Palantir Quiver, Quiver / Transform references / String comparisons](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-string-comparisons)
- [Palantir Quiver, Quiver / Transform references / String operations](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-string-operations)
- [Palantir Quiver, Quiver / Transform references / Time comparisons](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-time-comparisons)
- [Palantir Quiver, Quiver / Transform references / Time operations](https://www.palantir.com/docs/foundry/quiver/cards-transform-table-index-time-operations)

## 관련 문서

- [[Palantir-Quiver]]
- [[Palantir-Quiver-Analysis-and-Versioning|Quiver 분석 그래프와 버전 관리]]
- [[Palantir-Quiver-Object-Sets-and-Charts|Quiver 객체 집합, 탐색과 차트의 정확도]]
- [[Palantir-Quiver-Transform-Tables-and-Datasets|Quiver transform table과 dataset의 계산 계약]]
- [[Palantir-Quiver-Time-Series-Interpolation-and-Aggregation|Quiver 시계열 보간, 시간창과 집계]]
- [[Palantir-Quiver-Events-Ranges-and-Reference-Profiles|Quiver 이벤트, 시간 범위와 기준 프로파일]]
- [[Palantir-Quiver-Regression-and-Forecasting|Quiver 회귀, 예측과 분포 해석]]
- [[Palantir-Quiver-Dashboards-and-Embedding|Quiver 대시보드, 임베딩과 권한 전파]]
- [[Palantir-Quiver-Functions-AIP-and-Vega|Quiver 재사용 함수, AIP와 Vega의 경계]]
