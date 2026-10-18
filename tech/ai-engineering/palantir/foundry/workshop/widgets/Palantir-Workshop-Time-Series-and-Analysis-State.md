---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop 시계열과 분석 상태"]
---

# Workshop 시계열과 분석 상태

Time-series property는 단일 값과 달리 timestamped history를 나타낸다. Display용 transform과 summarizer를 구분한다. Transform은 새 series를 만들고 summarizer는 특정 range의 한 값 또는 두 요약의 차이를 만든다.

Cumulative는 현재 point까지, rolling은 이전 fixed-size window(현재 포함), periodic은 alignment timestamp의 배수로 non-overlapping window를 만든다. Periodic output timestamp가 start인지 end인지도 정한다. Average와 time-weighted average는 irregular sampling에서 다르다. Difference/relative difference는 last-first와 first denominator이며 denominator0/non-finite 처리도 확인한다.

Derivative는 value/time, integral은 value×time unit conversion과 linear/left/right interpolation을 가진다. 수치적 integral을 derivative의 완전한 역함수로 일반화하지 않는다. Formula, shift, range filtering은 time alignment와 interpolation의 의미를 함께 검토한다. Baseline은 static/property/series summarizer로 만들며 측정 사실과 비교 기준은 별개다.

Relative time의 now는 처음 필요할 때 정해져 page reload 전까지 고정된다고 설명한다. Last week라는 label만 보고 wall-clock에 계속 움직이는 range로 가정하지 않는다. Widget의 refresh, time-window 재평가와 index freshness는 별도다.

## 저장 분석과 copy

Free-form analysis는 object filters/linked sets/table/pivot/chart/annotation cards를 조합한다. Time Series Analysis는 series/event set과 derived plot을 여러 canvas에 구성한다. Controlled source series는 사용자가 data configuration을 지우거나 바꾸지 못해도 display는 바꿀 수 있다. View-range 통계는 해당 visible range의 min/max/mean이다.

Saved analysis는 resource/RID로 다시 열 수 있고 private/public은 sharing 선택이다. Widget autoload display 설정은 saved analysis 설정을 화면에서 override할 수 있지만 저장할 때 원래 설정을 유지하는 차이가 있다. Don't-clear-on-load는 추가 load 때 기존 view를 보존한다.

Open in Quiver는 duplicate/new analysis를 만들고 이후 Quiver 변경이 Workshop에 돌아오지 않는다. Notepad copy도 saved path 등 조건을 갖는다. Copy를 live shared state sync로 표현하지 않는다. Full-range plot은 대규모 series에서 비용이 커질 수 있다. 실제 series 계산은 수행하지 않았다.

## 출처

- [Palantir Workshop, formatting](https://www.palantir.com/docs/foundry/workshop/formatting)
- [Palantir Workshop, time-series-properties](https://www.palantir.com/docs/foundry/workshop/time-series-properties)
- [Palantir Workshop, widget-free-form-analysis](https://www.palantir.com/docs/foundry/workshop/widget-free-form-analysis)
- [Palantir Workshop, widget-time-series-analysis](https://www.palantir.com/docs/foundry/workshop/widget-time-series-analysis)

## 관련 문서

- [[Palantir-Workshop]]
