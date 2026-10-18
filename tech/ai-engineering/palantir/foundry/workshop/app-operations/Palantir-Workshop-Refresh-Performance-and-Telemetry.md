---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop refresh, 성능과 telemetry"]
---

# Workshop refresh, 성능과 telemetry

Data freshness, variable compute time, module refresh와 usage telemetry는 서로 다른 시각이다. Data Freshness는 configured source/object의 latest index time이며 source event 발생 시각이나 모든 row 최신성을 직접 증명하지 않는다.24시간 내 relative,그 이상 absolute로 표시한다.

## Auto-refresh

Watched object set update는 module data 전체 refresh를 유발한다. 최소 refresh 간격은10초이며 initial update latency를 줄이는 설정은 아니다. OSv2 object/link만 지원하고 linked type은 자동 watch되지 않아 명시 등록이 필요하다. Unsupported filter(terms/phrase/multiMatch/prefixOnLastToken/objectSetLink)나 runtime invalid filter가 watch를 깨뜨릴 수 있다.

Watched variable은 visible widget에서 쓰여야 하고 hidden drawer/minimized/inactive tab에서 notification은 지연돼 다시 visible일 때 reload한다. 더 넓은 set watch는 누락을 줄이지만 불필요한 refresh/cost가 늘 수 있다. Child module auto-refresh setting은 상속되지 않는다.

Refresh는 user input/comment draft/selection을 reset하거나 computed variable을 overwrite할 수 있다. Event로 pause/resume하거나 별도 variable/module을 두는 선택을 검토한다. 사용자가 멈춘 UI update와 upstream data 변화를 같은 상태로 보지 않는다.

## Mount와 비용

Normal mount/unmount는 layout을 떠날 때 state를 버린다. Delay-until-onscreen은 첫 load를 늦추고 never-unmount는 local state를 보존하지만 hidden 상태에서도 DOM/memory/variable computation/request가 남을 수 있다. Eager mount는 never-unmount와만 짝지어지며 parent embed도 eager여야 child eager가 동작한다.

Carbon tab 전환처럼 module을 떠나면 setting과 무관하게 reset한다. Loop page 전환도 state가 reset될 수 있다. Hidden 상태에서 size가 부정확하거나 auto-selection이 실행될 수 있다. Performance Profiler로 실제 visible widgets/variables의 initialization/reload를 측정하고 config count만으로 비용을 추정하지 않는다.

## Metrics 해석

Usage metrics는 aggregate count로 개인별 귀속을 제공하지 않는다. Action successful submission count는 기본, layout view는 opt-in/main/View mode만 추적하며 daily batch라 최초 최대24시간 지연된다.7/30/90day와 직전 동기간을 비교한다. Embedded overlay view는 child module에 귀속된다.

Observability Chart는 resource당 하나의 function/action executions, P95duration 또는 compute module CPU/memory를 표시한다. Missing/no-active session은 empty plot 대신 message가 나올 수 있다. Range variable은 bidirectional이며 chart brush가 다른 widget range도 바꾼다. Near-real-time telemetry와 daily usage counts를 같은 지연으로 설명하지 않는다. 실제 profiler/metric query는 실행하지 않았다.

## 출처

- [Palantir Workshop, auto-refresh](https://www.palantir.com/docs/foundry/workshop/auto-refresh)
- [Palantir Workshop, performance-profiler](https://www.palantir.com/docs/foundry/workshop/performance-profiler)
- [Palantir Workshop, usage-metrics](https://www.palantir.com/docs/foundry/workshop/usage-metrics)
- [Palantir Workshop, widget-display-optimization](https://www.palantir.com/docs/foundry/workshop/widget-display-optimization)
- [Palantir Workshop, widgets-data-freshness](https://www.palantir.com/docs/foundry/workshop/widgets-data-freshness)
- [Palantir Workshop, widgets-observability-chart](https://www.palantir.com/docs/foundry/workshop/widgets-observability-chart)

## 관련 문서

- [[Palantir-Workshop]]
