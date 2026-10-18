---
tags: [palantir, foundry, map]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 지도 resource, layer와 선택 상태의 구분

Foundry Map은 Ontology 객체, vector/raster overlay, track와 event를 같은 공간/시간 화면에서 분석한다. 표시 projection은 Web Mercator EPSG:3857이고 입력 좌표는 WGS84 EPSG:4326의 위도/경도 degree다. 지도에서 보이는 모양과 원래 저장 좌표를 구분한다.

## Layer와 저장

base/object/link/overlay/annotation layer를 조합한다. layer 순서의 위쪽이 화면에서도 위에 그려지며 같은 object type의 객체를 여러 layer로 나누어 따로 style할 수 있다. visibility와 rename은 표시 설정이다. map과 Map Layer Editor는 자동저장하지 않으므로 Save해야 공유 resource에 반영된다.

검색창은 object type/property 또는 공간 shape로 좁혀 추가한다. object-based 기본 Add all 한도는1,000이며 Control Panel 설정과 tile 지원 여부에 따라 달라진다. Find는 이미 map에 있는 object/title/property,주소와 좌표 탐색을 구분한다. 주소 geocoding에는 조직의 Mapbox Geocoding API key가 필요하다.

## 선택과 필터

click/Ctrl-Cmd/Shift rectangle,전체/타입별/역선택과 shape intersection으로 선택한다. layer lock은 canvas에서 cursor로 선택하지 못하게 하지만 Layers/Find/Histogram에서는 여전히 선택할 수 있다. 접근권한 lock이 아니다.

Histogram은 object type/property별 count와 selected count를 비교하며 date/numeric binning을 바꾼다. Filter to/out은 비일치 object를 흐리게 하고 상호작용/통계에서 제외하지만 map에 저장되지 않는 임시필터다. panel의5개씩 Show more를 전체데이터 한도로 해석하지 않는다.

Selection panel은 Properties/Series/Events/Object View를 보여 주고 property를 pin하거나 Function 값을 추가할 수 있다. Delete selection/layer는 map에서 item을 제거하며 원본 Ontology object 삭제 Action과 다르다. toast Undo로 map 제거를 되돌릴 수 있다.

## 설정의 범위

unit system과 GeoJSON panel은 사용자별,timezone/polling/point count/theme은 map별이다. UI dark theme은 base map을 바꾸지 않는다. Map Admin은 org default viewport/time/units,minimum polling/maximum points/searcharound limits와 API key/base map/watermark를 설정한다. user/map override는 admin 한도 안에서만 가능하다.

## 출처

- [Palantir, map](https://www.palantir.com/docs/foundry/map)
- [Palantir, overview](https://www.palantir.com/docs/foundry/map/overview)
- [Palantir, core-concepts](https://www.palantir.com/docs/foundry/map/core-concepts)
- [Palantir, map-overview](https://www.palantir.com/docs/foundry/map/map-overview)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/map/getting-started)
- [Palantir, create-save-maps](https://www.palantir.com/docs/foundry/map/create-save-maps)
- [Palantir, add-to-map](https://www.palantir.com/docs/foundry/map/add-to-map)
- [Palantir, navigation](https://www.palantir.com/docs/foundry/map/navigation)
- [Palantir, selection](https://www.palantir.com/docs/foundry/map/selection)
- [Palantir, histogram](https://www.palantir.com/docs/foundry/map/histogram)
- [Palantir, layer-management](https://www.palantir.com/docs/foundry/map/layer-management)
- [Palantir, settings](https://www.palantir.com/docs/foundry/map/settings)
- [Palantir, control-panel](https://www.palantir.com/docs/foundry/map/control-panel)

## 관련 문서

- [[Palantir-Map]]
- [[Palantir-Map-Loading-and-Geometry]]
