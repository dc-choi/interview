---
tags: [palantir, foundry, map]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Map styling과 Search Around Function의 입출력

styling Function은 array/ObjectSet 하나를 주인자로 받고 각 input object에 대응하는 string/numeric값 map을 반환한다. TypeScript1은 FunctionsMap,TypeScript2는 ObjectSpecifier key의 Record를 사용한다. Map은 layer전체를 한 번에 전달하지 않고 batch로 나누므로 각 object 결과는 동반 batch구성과 무관하게 일관돼야 한다.

Workshop widget의 styling은 첫object argument를 자동 제공하고 추가argument를 modulevariable에 mapping할 수 있다. style계산을 전체layer 정규화/순위로 구현하면 batch별로 다른결과가 나올 수 있다. sample의0건분모와 실제link로드 API도 설치된 SDK와 대조한다.

## Search Around

일반 link는 geospatial object간관계를 탐색한다. link-merge는 intermediary를 지나간두 object사이에 arc를 그린다. Link merge always는 intermediary자체를 menu에서 숨기고 transitive link를 보여 준다. 일부경로만 합치려면 incoming/outgoing link를 고르며 양방향은 양쪽목록 모두에 지정한다. intermediary event는 start/end/selected time을 따라 arc위를 이동하는표시를 만들 수 있다.

Function의 정확한 return type은 Promise<IMapSearchAroundResults>이며 objectRids,edges와 measures를 선택적으로 반환한다. edge는 sourceObjectRid/targetObjectRid와 optionalintermediaryObjectRids,measure는 objectRids/measureId다. 이름과 구조가 discoverability 계약이다.

object인자는 정확히1개(single/array/ObjectSet)이고 추가scalar string/Boolean/numeric/date/timestamp는 실행시 사용자값을 받을 수 있다. latest published semver Function을 쓰며 repo의 Ontology object/link권한과 cross-project backingdataset reference가 필요하다.

옛 Chinese integrate-searcharound-functions alias는 같은구조를 설명하지만 machine translation이 미검증이고 seriespanel출력을 안내한다. 현재 integrate-searcharounds는 timeline출력으로 설명하므로 둘을 같은UI현재성으로 보지 않는다. async병렬 sample도 무제한 concurrency/전체object로드의 안전성을 보장하지 않는다.

canonical English 경로 [integrate-searcharound-functions](https://www.palantir.com/docs/foundry/map/integrate-searcharound-functions)는 현재 본문을 확보하지 못했다. 아래 번역 alias의 실제 본문으로 읽었으며 현행 English 계약으로 단정하지 않는다.

## 출처

- [Palantir, integrate-functions](https://www.palantir.com/docs/foundry/map/integrate-functions)
- [Palantir, integrate-searcharounds](https://www.palantir.com/docs/foundry/map/integrate-searcharounds)
- [Palantir, integrate-searcharound-functions (미검증 번역 alias)](https://palantir.com/docs/zh/foundry/map/integrate-searcharound-functions/)

## 관련 문서

- [[Palantir-Map-Styles-and-Aggregates]]
- [[Palantir-Map-Time-and-Tracks]]
- [[Palantir-OSDK]]
