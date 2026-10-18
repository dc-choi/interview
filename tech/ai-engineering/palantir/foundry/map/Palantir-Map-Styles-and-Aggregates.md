---
tags: [palantir, foundry, map]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Display styling, choropleth와 cluster 집계

한 object layer에 icon/circle/line/polygon/track 등 여러 display를 둘 수 있다. Shared defaults는 연결한 display의 color/opacity를 공유하고 zoom별 visibility를 정한다. 단순 style 변경이 underlying object나 query를 수정하지는 않는다.

## 값과 시각표현

fixed/property/Function/measure를 style source로 쓴다. numeric color gradient의 min/max는 자동추론 또는 수동고정이며 숫자크기는 linear scaled 또는 raw값을 사용한다. string color는 manual/automatic/hex직접적용으로 매핑한다. 비교할 map마다 auto range가 다르면 같은색이 같은값을 뜻하지 않을 수 있다.

icon은 Ontology default/fixed/property/media-image를 쓰고 track방향으로 자동회전할 수 있다. image media만 icon으로 지원한다. circle radius,polygon fill/stroke,width/dash와 line-segment arrow는 서로 다른 표시다. labels는 always/hover/hidden,card/minimal,header/null표시를 정하고 property/Function/series/linked-count를 넣지만 tile loading에는 label/custom tooltip이 없다.

By time opacity는 event/track의 active/inactive,buffer,fade/hide-until-occurred를 설정한다. 이는 데이터 permission이 아니라 표시다. Saved styles는 여러 styling 구성을 저장해 바꾼다.

## Choropleth

region별 object를 묶어 sum/mean/min/max 또는 expression aggregation으로 색칠한다. 지원 boundary는 country alpha2/3,state FIPS/USPS,county FIPS/ANSI이며 Marketplace Value Types를 property에 붙인다. 좌표밖에 없으면 boundary dataset과 spatial join으로 ID를 얻는다.

임의region은 geoshape를 가진 region object와 many-one link로 묶는다. expression은 object집계/regionproperty/앞선식연산을 만들고 마지막 reference를 style값으로 쓴다. 예를 들어 전체trail length÷region area는 density다. 단순 total과 밀도를 혼동하지 않는다.

## Cluster

geopoint center의 가까운 객체를 zoom/pan에 따라 다시 집계해 color/radius에 count/sum/mean을 적용한다. 고정행정구역 choropleth와 다르다. Beta cluster label은 color집계값 또는 fixedcolor일 때 radius집계값을 보인다. 화면의 cluster수를 원본object수로 해석하지 않는다.

## 출처

- [Palantir, styling](https://www.palantir.com/docs/foundry/map/styling)
- [Palantir, visualize-objects](https://www.palantir.com/docs/foundry/map/visualize-objects)
- [Palantir, visualize-points](https://www.palantir.com/docs/foundry/map/visualize-points)
- [Palantir, visualize-polygons-lines](https://www.palantir.com/docs/foundry/map/visualize-polygons-lines)
- [Palantir, visualize-choropleths](https://www.palantir.com/docs/foundry/map/visualize-choropleths)
- [Palantir, visualize-clusters](https://www.palantir.com/docs/foundry/map/visualize-clusters)

## 관련 문서

- [[Palantir-Map-Loading-and-Geometry]]
- [[Palantir-Map-Function-Contracts]]
