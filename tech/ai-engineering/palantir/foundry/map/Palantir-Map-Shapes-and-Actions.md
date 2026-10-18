---
tags: [palantir, foundry, map]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 지도 shape, annotation과 Ontology Action의 효과

drawing 또는 선택 object에서 active shape를 만들고 vertex edit/buffer/translate/replace로 수정한다. Select intersecting은 이미 map에 보이는 object를, Search within은 Ontology 공간 검색 결과를 찾는다. tile object는 selection→shape에 포함되지 않는다.

annotation은 text/line/polygon/rectangle/circle에 title/notes/style을 붙인 map context다. polygon 면적/둘레와 line 길이는 선택 표시에 따라 segment/total로 보인다. annotation 생성은 원본 Ontology object 생성과 다르다.

## Action 계약

point Action은 geo:geopoint type class의 String latitude,longitude 또는 geo:latitude와 geo:longitude의 Double 2개를 받는다. shape Action은 geo:geojson String으로 GeoJSON geometry를 받는다. GeoJSON의 좌표 순서와 geopoint 문자열의 위도/경도 순서를 섞지 않는다.

기존 geoshape 수정은 Modify object Action의 String parameter를 property에 mapping하고 default value를 끈다. geo:geojson과 geo:prefill type class를 함께 설정한다. 사용자가 shape 편집 Done과 추가 parameter form을 완료하면 Action을 실행해 object/map을 갱신한다.

기본 geometry 선택이 추가 parameter를 없애지는 않는다. map의 Available actions는 보여 줄 entry를 좁히는 UI 설정이며 Action의 서버 권한/validation을 대체하지 않는다. remove item/shape와 실제 object edit을 구분한다.

## 출처

- [Palantir, shapes](https://www.palantir.com/docs/foundry/map/shapes)
- [Palantir, annotations](https://www.palantir.com/docs/foundry/map/annotations)
- [Palantir, actions](https://www.palantir.com/docs/foundry/map/actions)
- [Palantir, integrate-actions](https://www.palantir.com/docs/foundry/map/integrate-actions)

## 관련 문서

- [[Palantir-Map-State-and-Selection]]
- [[Palantir-Map-Templates-and-Embedding]]
