---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Object Explorer 분석, 저장과 SQL

Explore chart는 property/link aggregation으로 subset을 좁힌다. Chart를 없애도 filter는 남는다. Single statistic은 filter를 만들지 않고 cluster/choropleth는 geospatial subset을 선택한다. Pivot은 현재 subset의 linked type으로 결과 단위를 바꾸며 단순히 같은 객체에 column을 추가하는 기능이 아니다. Undo/redo는 최근 5개 exploration 상태만 유지한다.

Layout은 chart/table/sort와 initial perspective를 저장하며 개인 default가 global default보다 우선한다. Preview는 최대 20개다. Results는 scroll로 추가 load하며 여러 column sort에서는 마지막 선택이 우선한다. Time-series column은 최신 observation과 sparkline을 함께 보인다. Inline edit는 진입 때와 제출 때 Action criteria를 다시 검사한다.

Exploration은 filter와 layout을 저장해 최신 결과를 다시 조회한다. List는 고정 membership이며 값의 과거 snapshot이 아니다. Compare는 두 set에 공통 filter를 적용하고 별도로 저장한다. Public은 지정 project/folder 접근자에게 공개한다는 뜻이며 underlying object/linked exploration 권한은 함께 부여하지 않는다.

Action은 선택 객체 또는 선택이 없으면 전체 set을 prefilling하며 1,000개 초과 선택에서는 사용할 수 없다. Parameter가 모호하면 자동 prefill하지 않는다. Export/Open In은 다른 결과 전달 경로이며 별도 권한과 한도를 확인한다.

## Ontology SQL beta

Read-only Spark SQL scratchpad는 RID 또는 `ontologyApiName`.`objectTypeApiName`을 backtick으로 지정한다. Edit-disabled single-source는 backing source를 읽고, edit enabled/edit-only/MDO는 materialization이 필요하다. 한 query에 tabular input과 Ontology input을 섞을 수 없다. 전체 데이터에서 실행하지만 반환 preview는 최대 1,000행이고 Contour compute로 계상한다.

문서는 최근 edit의 SQL 반영에 최대 30초를 설명한다. 일반 materialization의 수분/6시간 설정과 같은 보장으로 합치지 말고 해당 SQL 경로의 materialization과 freshness 표시를 확인한다. Live object 조회와 materialized SQL은 시점이 다를 수 있다.

## 출처

- [Palantir, analyze-sql](https://www.palantir.com/docs/foundry/object-explorer/analyze-sql)
- [Palantir, apply-actions](https://www.palantir.com/docs/foundry/object-explorer/apply-actions)
- [Palantir, compare-object-sets](https://www.palantir.com/docs/foundry/object-explorer/compare-object-sets)
- [Palantir, explore-charts](https://www.palantir.com/docs/foundry/object-explorer/explore-charts)
- [Palantir, pivot-linked](https://www.palantir.com/docs/foundry/object-explorer/pivot-linked)
- [Palantir, save-explorations](https://www.palantir.com/docs/foundry/object-explorer/save-explorations)
- [Palantir, save-lists](https://www.palantir.com/docs/foundry/object-explorer/save-lists)
- [Palantir, view-results](https://www.palantir.com/docs/foundry/object-explorer/view-results)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
