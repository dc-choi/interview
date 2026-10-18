---
tags: [palantir, foundry, foundryts]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 시계열 reference, 시간범위와 event interval 검색

series(*IDs)는 기존 시계열 reference들의 NodeCollection을 만들고 points(*timestamp,value,name)는 sync에 쓰지 않는 사용자 reference point set을 만든다. points는 값 type을 통일하고 name은 후속 series ID로 쓴다. integer timestamp 예제는 nanosecond이므로 epoch seconds로 읽지 않는다.

## Range와 끝점

time_range(start,end)는 [start,end)로 잘라 읽고 query 범위를 줄일 수 있다. bound를 생략하면 해당 방향으로 unbounded이며 end 생략 예제에는 마지막 point도 포함된다. 문서의 datetime/string/timedelta 설명이 혼용되어 실제 timestamp parser와 timezone을 확인한다.

first_point/last_point는 범위 안의 첫/마지막 point를 single-row summary로 돌려주며 empty series는 empty summary다. time_extent는 earliest/latest timestamp의 단일 summary다. 이 범위가 연속 관측이나 그 사이 data 존재를 의미하지 않는다.

## Predicate와 interval

time_series_search는 DSL predicate가 참인 interval을 찾고 interval_values 식의 numeric 값으로 statistics를 계산한다. enum input은 통계용 numeric interval_values가 필요하다. labels는 input 순서와 맞추고 min/max_duration으로 기간을 걸러낸다.

기본 before/after는 NEAREST, internal은 numeric LINEAR/enum PREVIOUS다. start/end 검색 bound와 겹치는 interval은 전체 interval을 포함하므로 반환 구간이 요청 bound 밖으로 이어질 수 있다. 실제 window로 clip해야 한다면 후속 range 조건을 명시한다.

결과는 count/mean/stddev/extreme point와 start/end, duration.seconds/subsecond_nanos를 포함한다. schema의 start_timestamp/end_timestamp와 일부 sample의 start_time/end_time이 달라 installed result를 확인한다. 반환 interval을 map_intervals로 series마다 분리해 추가 계산할 수 있다. enum condition으로 다른 numeric series를 평가하면 condition source와 value source를 명확히 구분한다.

## 출처

- [Palantir, functions-series](https://www.palantir.com/docs/foundry/foundryts/functions-series)
- [Palantir, functions-points](https://www.palantir.com/docs/foundry/foundryts/functions-points)
- [Palantir, functions-time-range](https://www.palantir.com/docs/foundry/foundryts/functions-time-range)
- [Palantir, functions-first-point](https://www.palantir.com/docs/foundry/foundryts/functions-first-point)
- [Palantir, functions-last-point](https://www.palantir.com/docs/foundry/foundryts/functions-last-point)
- [Palantir, functions-time-extent](https://www.palantir.com/docs/foundry/foundryts/functions-time-extent)
- [Palantir, functions-time-series-search](https://www.palantir.com/docs/foundry/foundryts/functions-time-series-search)

## 관련 문서

- [[Palantir-FoundryTS-Collections-and-Intervals]]
- [[Palantir-FoundryTS-Statistics-and-Regression]]
