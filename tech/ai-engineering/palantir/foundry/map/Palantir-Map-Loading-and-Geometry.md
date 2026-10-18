---
tags: [palantir, foundry, map]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Map geometry의 검색 가능성과 tile loading 제한

geopoint/geoshape property는 Ontology-native point/line/polygon 표현이다. radius numeric property는 meter 단위 circle을 표시하지만 그 circle은 공간검색 index가 아니다. H3 cell string도 hexagon으로 표시만 하므로 circle/H3영역으로 검색하려면 polygon geoshape를 만들어야 한다.

## Imagery와 track

georectified image는 image URL과 bounds geoshape의 사각형 polygon을 연결한다. bounds vertex는 왼쪽 아래부터 시계 방향이며 geo:bounds.<URL property ID> type class를 둔다. bounds geoshape는 검색된다. media-reference GeoTIFF tile은 Beta이며 viewport의 보이는 부분만 읽는다.

track은 numeric time-series latitude/longitude property를 지정한다. event는 start/end timestamp를 지정하고 linked-event severity용 Event intent를 설정한다. 단순 현재위치,시간별 위치와 event기간을 하나의 property로 대신하지 않는다.

## Loading method

Auto는 적절한 object/tile 방식을 고르고 Tile은 viewport의 simplified geometry,Object는 full object detail을 로드한다. tile은 Searchable render hint가 있는 geopoint/geoshape와 지원되는 icon/circle/geoshape display가 필요하다. Searchable이 없으면 tile이 비어 object가 안 보일 수 있다.

tile은 큰 ObjectSet의 Add all 한도를 제거하지만 Function/series styling,time-opacity,label/custom tooltip,timeline geometry와 Search Around를 지원하지 않는다. Histogram/timeline filter도 적용되지 않고 selection에서 shape를 만들 때 포함되지 않는다. 전체화면 필터를 걸었다고 tile data까지 같은 조건으로 제한된 것으로 보고하지 않는다.

옛 objects-high-scale Chinese alias는 Beta high-scale toggle과 geohash 표기를 사용하며 번역 정확성이 미검증이다. 현재 loading-methods의 Auto/Tile/Object와 searchable 조건을 우선 대조한다. timeline FAQ는1,000개 초과 set의 자동tile 전환을 설명하므로 시간기능이 사라지면 loading method와 object 수를 확인한다.

canonical English 경로 [objects-high-scale](https://www.palantir.com/docs/foundry/map/objects-high-scale)는 현재 본문을 확보하지 못했다. 아래 번역 alias의 실제 본문으로 읽었으며 현행 English 계약으로 단정하지 않는다.

## 출처

- [Palantir, integrate-objects](https://www.palantir.com/docs/foundry/map/integrate-objects)
- [Palantir, objects-loading-methods](https://www.palantir.com/docs/foundry/map/objects-loading-methods)
- [Palantir, objects-high-scale (미검증 번역 alias)](https://palantir.com/docs/zh/foundry/map/objects-high-scale/)

## 관련 문서

- [[Palantir-Map-State-and-Selection]]
- [[Palantir-Map-Time-and-Tracks]]
