---
tags: [palantir, foundry, contour]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Contour 표현식과 SQL 호환성

Expression board는 컬럼 추가/교체, boolean filter와 aggregate를 지원한다. Column은 case-sensitive이고 문자열 literal은 single quote, column은 double quote로 구분한다. 문자열 비교는 사전식이므로 숫자 문자열의 크기 비교와 다르다. 저장 expression은 argument를 노출해 재사용할 수 있으며 group-by 없는 저장 aggregate는 소비자가 grouping을 선택할 수 있다.

## Spark SQL로 옮기기 전에 확인할 차이

Contour equality는 `NULL = NULL`을 true, `NULL != 값`을 true로 평가한다. Spark SQL의 null 결과와 다르다. 함수 이름이 같다고 전체 SQL 의미가 같은 것은 아니다. Filter expression에서 window `OVER`는 사용할 수 없으므로 먼저 컬럼을 계산한 뒤 필터한다. Count distinct는 Aggregate 모드만 지원하고 sum_distinct는 window에서 지원하지 않는다.

Window는 원본 행을 유지하며 PARTITION/ORDER/frame을 지정한다. ROWS와 RANGE를 같게 취급하지 않는다. 정렬 동률이 있으면 row_number/first/last/lead/lag/ntile/array aggregate가 달라질 수 있으므로 결정적 tie-breaker를 둔다.

Substring, regex capture와 array index는 1-based다. Regexp extract가 매치하지 못하면 빈 문자열을 반환한다. Split delimiter는 regex라 special character를 escape해야 한다. Array length(null)은 -1이며 explode는 null 행을 버리고 explode_outer는 보존하는 경로다. 배열은 주로 expression에서 처리하며 다른 board 소비 전 array_join 또는 명시적 cast가 필요하다.

Timestamp를 long으로 바꾸면 Unix 초이며 밀리초 입력은 1,000으로 나눈다. Fractional precision이 필요하면 double 경로의 오차도 검토한다. Date/current-time 값은 path 재계산 때만 바뀐다. MONOTONICALLY_INCREASING_ID를 build 간 안정적인 식별자로 쓰지 않는다.

표준편차/분산은 문서의 sample/unbiased 계약을 따른다. Aggregation mode는 group-by/aggregate 컬럼으로 새 schema를 만들므로 원래 행/컬럼이 보존되는 add-column mode와 다르다.

## 출처

- [Palantir, expressions-arrays](https://www.palantir.com/docs/foundry/contour/expressions-arrays)
- [Palantir, expressions-overview](https://www.palantir.com/docs/foundry/contour/expressions-overview)
- [Palantir, expressions-syntax](https://www.palantir.com/docs/foundry/contour/expressions-syntax)
- [Palantir, expressions-use-board](https://www.palantir.com/docs/foundry/contour/expressions-use-board)
- [Palantir, expressions-window-functions](https://www.palantir.com/docs/foundry/contour/expressions-window-functions)

## 관련 문서

- [[Palantir-Contour]]
- [[Palantir-Pipeline-Builder]]
