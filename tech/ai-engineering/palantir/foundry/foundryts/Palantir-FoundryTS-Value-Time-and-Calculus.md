---
tags: [palantir, foundry, foundryts]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 값 변환, 시간 이동과 미적분의 단위

scale(factor)는 value를 곱하고 value_shift(delta)는 더한다. time_shift(duration)는 timestamp를 이동하며 양수는 미래,음수는 과거다. integer duration은 nanosecond이므로 초단위값과 혼동하지 않는다. 사람이 읽는 duration string/timedelta도 받는다.

## Deprecated operation

timestamp_scale은 이름과 옛 설명에 timestamp 곱셈이 남아 있지만 현재 deprecated no-op이며 결과를 바꾸지 않는다. backend가 time unit을 통일하므로 단위변환 수단으로 쓰지 않는다. where(true,false)는 nonzero/zero 분기를 변환하는 deprecated API다. DSL conditional과 실제 지원 version을 확인한다.

## Unit과 nonfinite

unit_conversion(from,to)은 numeric value를 바꾼다. length,temperature,pressure,time,mass의 Unit/alias를 제공하며 실제 enrollment의 administrator가 확장할 수 있다. 예를 들어 m→mm은 값×1000이고 timestamp는 그대로다. temperature offset과 pressure gauge/absolute를 임의scale 하나로 대체하지 않는다.

skip_nonfinite는 NaN,+inf,-inf point를 제거한다. 0으로 대체하는 동작이 아니므로 timestamp union과 후속window point수도 달라진다. scale/value_shift 예제는inf를 보존한다.

## Derivative와 integral

derivative는 두 번째point부터 이전point와의 변화량을 elapsed seconds로 나누어 현재timestamp에 출력한다. 입력integer timestamp가ns면 작은간격 때문에 per-second값이 크게 나오는 것이 정상일 수 있다.

integral은 시작부터 각point까지 누적 면적을 출력하고 첫point는0이다. LINEAR(default),LHS,RHS를 구분한다. 불규칙샘플에서는 시간차가 면적을 바꾸며 결과는 value×seconds다. 샘플의 nanosecond구간을 그대로초로 읽으면10억배 오해가 생긴다. time_weighted의경계보간설정과 단순integral method의차이도 확인한다.

## 출처

- [Palantir, functions-scale](https://www.palantir.com/docs/foundry/foundryts/functions-scale)
- [Palantir, functions-value-shift](https://www.palantir.com/docs/foundry/foundryts/functions-value-shift)
- [Palantir, functions-time-shift](https://www.palantir.com/docs/foundry/foundryts/functions-time-shift)
- [Palantir, functions-timestamp-scale](https://www.palantir.com/docs/foundry/foundryts/functions-timestamp-scale)
- [Palantir, functions-unit-conversion](https://www.palantir.com/docs/foundry/foundryts/functions-unit-conversion)
- [Palantir, functions-skip-nonfinite](https://www.palantir.com/docs/foundry/foundryts/functions-skip-nonfinite)
- [Palantir, functions-where](https://www.palantir.com/docs/foundry/foundryts/functions-where)
- [Palantir, functions-derivative](https://www.palantir.com/docs/foundry/foundryts/functions-derivative)
- [Palantir, functions-integral](https://www.palantir.com/docs/foundry/foundryts/functions-integral)

## 관련 문서

- [[Palantir-FoundryTS-Aggregation-Windows]]
- [[Palantir-FoundryTS-Statistics-and-Regression]]
