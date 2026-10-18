---
tags: [palantir, foundry, foundryts]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 통계 summary, distribution과 regression 해석

statistics는 numeric series를 window 또는 window_count로 나누어 count/mean,earliest/latest/smallest/largest point와 timestamp를 반환한다. include_std_dev 기본False이고 window_count는 include_std_dev=True일 때만 작동하며 window를 덮어쓴다. 단순 window_count만 주면 무시될 수 있다.

statistics의 end는 inclusive로 문서화되어 다른 time_range/scatter/regression의 exclusive end와 다르다. 문서의 window 설명과 일부 example 경계가 섞여 있으므로 설치version으로 경계point를 확인한다.

## Distribution

distribution은 한개 또는 여러series의 값을 합쳐 default10개 equal-width bin에 분포시킨다. delta=(max-min)/bins이며 time/value range는 lower-inclusive/upper-exclusive로 설명된다. 예제는 max값도 마지막bin에 포함하고 빈bin을생략하므로 min/max/빈bin의 실제결과를 직접 확인한다. sample의timestamp전체범위표시를 실측first/last로 해석하지 않는다.

## Scatter

scatter는 정확히2numeric series를 받아 timestamp를 맞춘x/y point를 만들며 기본internal LINEAR,before/after NONE이다. 보간으로 생긴 쌍과 실제동시측정 쌍을 구분한다. optional regression을 붙일 수 있고 is_truncated field는 deprecated라 무시하도록 안내한다. 이field가False라고 결과완전성을 별도로 입증한 것은 아니다.

## Regression

linear는 y=A x+B,exponential은 y=A exp(Bx),polynomial은 degree별 coefficient를 반환한다. time_unit은s/ms/us/ns(defaultns)이고 start-inclusive/end-exclusive를 적용한다. polynomial max_degree 기본0,linear include_intercept와 exponential include_multiple 등의 signature를 자신의version에서 확인한다.

결과 fit field의 slope/intercept/A/B/coefficients와 linear R²를 읽는다. max/min_bounds 설명은 coefficient bounds라고 적혔지만 example은입력x/y범위(10,6)~(50,96)를보이므로 통계적신뢰구간으로간주하지않는다. fit은관측구간의요약이며 미래예측정확도나인과성을보장하지않는다.

## 출처

- [Palantir, functions-statistics](https://www.palantir.com/docs/foundry/foundryts/functions-statistics)
- [Palantir, functions-distribution](https://www.palantir.com/docs/foundry/foundryts/functions-distribution)
- [Palantir, functions-scatter](https://www.palantir.com/docs/foundry/foundryts/functions-scatter)
- [Palantir, functions-linear-regression](https://www.palantir.com/docs/foundry/foundryts/functions-linear-regression)
- [Palantir, functions-exponential-regression](https://www.palantir.com/docs/foundry/foundryts/functions-exponential-regression)
- [Palantir, functions-polynomial-regression](https://www.palantir.com/docs/foundry/foundryts/functions-polynomial-regression)

## 관련 문서

- [[Palantir-FoundryTS-Query-and-Ontology]]
- [[Palantir-FoundryTS-Alignment-and-DSL]]
