---
tags: [palantir, foundry, foundryts]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 동시각 집계, window 집계와 시간 가중 평균

sum/mean은 여러 numeric series의 같은 timestamp에 실제 존재하는 값만 모으고 전체 timestamp union을 반환한다. 자동보간하지 않는다. 같은 series를 input에 두 번 넣으면 중복으로 기여하므로 독립sensor평균과 같지 않다.

## Window 종류

cumulative는 첫point부터 현재point까지,rolling은 현재timestamp를 포함하는 지정 duration의 이동구간,periodic은 고정폭의 분리된 구간을 집계한다. numeric series만 지원하며 min/max/count/sum/product/mean/stddev/difference/percent_change/first/last와 time_weighted spec을 쓴다.

periodic window_type=end(default)는 (start,end]이며 결과 timestamp는 끝이다. start는 [start,end)이고 결과는 시작이다. alignment_timestamp(default0)를 기준으로 window duration의 정수배에 정렬한다. 빈window는 출력하지 않으므로 빈구간이0이라는 뜻이 아니다.

difference는 last-first이고 percent_change 예제는(32-8)/8=3처럼 비율을 반환한다. 이름만 보고300을 기대하지 않는다. 0분모나 nonfinite 처리의 상세가 필요하면 installed library 결과를 확인한다.

## 시간 가중

F.time_weighted(average/integral)은 직접 series를 받는 node가 아니라 cumulative/rolling/periodic의 aggregate argument에 넣는 spec이다. equal-point mean과 달리 관측 사이 duration을 적분한다. lhs는 이전값 유지,rhs는 다음값을 과거구간에 유지,linear(default)는 trapezoid다.

bounds_interpolation=None/none은 내부point 사이 면적만 포함해 window경계와 point사이 gap을 제외한다. default/linear/nearest/next/previous를 지정하면 경계값을 추론한다. 같은window라도 이 선택이 적분/평균을 바꾼다.

integral 단위는 value×seconds다. source의 불규칙샘플(1ns,5),(3ns,15),(6ns,30)의 cumulative linear average는5,10,17.5로 equal-point mean과 다르다. numeric-only 계약이며 enum기본보간 설명이 있다고 enum time_weighted를 지원한다고 확대하지 않는다.

## 출처

- [Palantir, functions-sum](https://www.palantir.com/docs/foundry/foundryts/functions-sum)
- [Palantir, functions-mean](https://www.palantir.com/docs/foundry/foundryts/functions-mean)
- [Palantir, functions-cumulative-aggregate](https://www.palantir.com/docs/foundry/foundryts/functions-cumulative-aggregate)
- [Palantir, functions-rolling-aggregate](https://www.palantir.com/docs/foundry/foundryts/functions-rolling-aggregate)
- [Palantir, functions-periodic-aggregate](https://www.palantir.com/docs/foundry/foundryts/functions-periodic-aggregate)
- [Palantir, functions-time-weighted](https://www.palantir.com/docs/foundry/foundryts/functions-time-weighted)

## 관련 문서

- [[Palantir-FoundryTS-Alignment-and-DSL]]
- [[Palantir-FoundryTS-Value-Time-and-Calculus]]
