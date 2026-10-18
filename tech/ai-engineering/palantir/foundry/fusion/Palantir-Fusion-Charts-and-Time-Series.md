---
tags: [palantir, foundry, fusion]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Fusion chart와 시계열 계산의 단위

chart.bar/line은 number/date/timestamp/string의 1차원 range/array x/y를 받는다. chart.chart로 여러 plot과 options를 묶는다. bar는 drawLabels/orientation, line은 dataMarkers/color를 지원한다. axes/legend/reset zoom/toolbar, tooltip closest/aggregate/false, rangeSelection select/visual/false와 px height/width는 표시 설정이다.

ts.timeseries(seriesId)는 series를 로드하고 ts.time_range/last는 범위를 선택한다. last의 units는 h/m/s/us/ns와 해당 full names다. count, first/last timestamp/value, min/max/mean/stddev로 요약하고 derivative는 seconds 기준 변화율이다. difference는 첫값과 끝값의 차이라는 설명만으로 부호를 확정하지 않는다.

ts.scale은 값에 factor를 곱하고 ts.shift는 값에 offset을 더한다. 시간축 이동 함수로 오해하지 않는다. integral은 누적 면적이며 linear trapezoid 및 left/right Riemann 방법을 지원한다. 문서의 right method는 lhr로 표기되어 있으므로 다른 시계열 API의 rhs와 동일 문자열로 가정하지 않고 사용 버전에서 확인한다. sparkline 표시와 실제 계산 결과, 조회 index 최신성을 함께 검증한다.

## 출처

- [Palantir, function-library](https://www.palantir.com/docs/foundry/fusion/function-library)
- [Palantir, visualize-time-series](https://www.palantir.com/docs/foundry/fusion/visualize-time-series)

## 관련 문서

- [[Palantir-Fusion-Data-and-Permissions]]
- [[Palantir-FoundryTS]]
