---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Slate 시각화 좌표와 선택 식별자"]
---

# Slate 시각화 좌표와 선택 식별자

## 테이블과 배열 위치

Table은 columnData의 평행 배열과 selectionIdentityColumnId의 고유 키로 선택을 추적한다. 숨겨진 식별 열도 선택에 사용할 수 있다. columnOrder를 비우면 열 순서가 결정적이지 않을 수 있다. 클라이언트 sort/page는 이미 로드한 부분집합만 다룬다. Server 옵션을 켜는 것만으로 SQL이 바뀌지 않으며 query가 정렬과 page size/offset을 반영해야 한다.

currentOffset 표는 0기반 현재 페이지라고 설명하지만 SQL 예제는 OFFSET에 직접 넣는다. 페이지 번호인지 행 offset인지 실제 출력을 확인한 뒤 SQL 계약과 맞춘다. totalServerItems도 현재 필터와 일치해야 한다. selectionRequired는 초기 선택이 없을 때 선택을 강제로 만들지 않고 첫 선택 뒤 마지막 해제를 막는다.

## 차트와 시간

X/Y/series/radius 등 같은 index의 배열을 일치시킨다. Gantt는 start/end/y와 선택적 label의 길이가 같고 timeseries X/category Y가 필요하다. 일반 timeseries 축은 epoch milliseconds를 요구하지만 Gantt 예제는 날짜 문자열을 사용하므로 입력을 임의 혼합하지 않는다. Scatter radius는 예제상 픽셀 반지름에 직접 대응해 원본 count의 크기와 시각 면적을 구분한다.

Data selection, area selection과 pan/zoom은 상호 제약이 있다. Category 축, 다중 축에서 area selection이 제한된다. Pan/zoom scale은 저장에 영속되지 않는다. Tree map의 size는 면적, density는 색 농도, category는 그룹이므로 서로 다른 의미의 수치를 같은 값처럼 제시하지 않는다.

Calendar의 all-day 표시/선택은 경계를 자정으로 조정할 수 있다. List view와 Timeline은 제공 순서대로 표시하므로 날짜 정렬을 자동 가정하지 않는다. Date picker의 표시 format과 value format은 별개이며 기본 min/max는 현재 연도에 상대적이다.

## 지도 좌표와 공간 규모

Slate Map은 Leaflet 기반으로 location/heat/shape/vector/choropleth 등을 구분한다. Lat/longitude 필드와 지도 CRS(EPSG3395/3857/4326), GeoJSON 좌표 계약은 구분해서 맞춘다. Circle selection radius는 미터지만 heatmap radius는 zoom scaling 여부에 따라 map scale 또는 픽셀이다. 같은 radius라는 이름만으로 단위를 통일하지 않는다.

GeoJSON shape는 초기에 모두 로드되고 vector tile은 보이는 구간을 동적으로 읽는다. 약 1,000 shape, 5,000~10,000 location point의 느려짐은 성능 휴리스틱이다. Vector tile feature ID는 고유해야 하고 choropleth 값/선택 ID는 도형의 ID와 대응해야 한다. Vector whitelist는 표시 필터이며 원본 접근 권한의 대체가 아니다.

Graph의 node ID와 edge endpoint가 같은 식별 체계를 써야 한다. 표의 숫자 endpoint 타입과 문자열 예제는 일치하지 않는다. Manual layout만 드래그 위치를 저장한다. 스타일의 축약 스키마와 오래된 예제를 완전한 현재 validator로 간주하지 않는다.

## 출처

- [Palantir slate, slate](https://www.palantir.com/docs/foundry/slate)
- [Palantir slate, applications-create](https://www.palantir.com/docs/foundry/slate/applications-create)
- [Palantir slate, applications-debug-problems](https://www.palantir.com/docs/foundry/slate/applications-debug-problems)
- [Palantir slate, applications-dependencies](https://www.palantir.com/docs/foundry/slate/applications-dependencies)
- [Palantir slate, applications-import-export](https://www.palantir.com/docs/foundry/slate/applications-import-export)
- [Palantir slate, applications-merging](https://www.palantir.com/docs/foundry/slate/applications-merging)
- [Palantir slate, applications-pages](https://www.palantir.com/docs/foundry/slate/applications-pages)
- [Palantir slate, applications-style-text](https://www.palantir.com/docs/foundry/slate/applications-style-text)
- [Palantir slate, applications-types](https://www.palantir.com/docs/foundry/slate/applications-types)
- [Palantir slate, applications-versioning](https://www.palantir.com/docs/foundry/slate/applications-versioning)
- [Palantir slate, applications-writeback](https://www.palantir.com/docs/foundry/slate/applications-writeback)
- [Palantir slate, best-practices-app-functionality](https://www.palantir.com/docs/foundry/slate/best-practices-app-functionality)
- [Palantir slate, best-practices-complex-layouts](https://www.palantir.com/docs/foundry/slate/best-practices-complex-layouts)
- [Palantir slate, best-practices-user-interaction](https://www.palantir.com/docs/foundry/slate/best-practices-user-interaction)
- [Palantir slate, concepts-events](https://www.palantir.com/docs/foundry/slate/concepts-events)
- [Palantir slate, concepts-events-and-actions-index](https://www.palantir.com/docs/foundry/slate/concepts-events-and-actions-index)
- [Palantir slate, concepts-foundry-functions](https://www.palantir.com/docs/foundry/slate/concepts-foundry-functions)
- [Palantir slate, concepts-functions](https://www.palantir.com/docs/foundry/slate/concepts-functions)
- [Palantir slate, concepts-handlebars](https://www.palantir.com/docs/foundry/slate/concepts-handlebars)
- [Palantir slate, concepts-object-context](https://www.palantir.com/docs/foundry/slate/concepts-object-context)
- [Palantir slate, concepts-object-sets](https://www.palantir.com/docs/foundry/slate/concepts-object-sets)
- [Palantir slate, concepts-osdk](https://www.palantir.com/docs/foundry/slate/concepts-osdk)
- [Palantir slate, concepts-queries](https://www.palantir.com/docs/foundry/slate/concepts-queries)
- [Palantir slate, concepts-styles](https://www.palantir.com/docs/foundry/slate/concepts-styles)
- [Palantir slate, concepts-variables](https://www.palantir.com/docs/foundry/slate/concepts-variables)
- [Palantir slate, faq](https://www.palantir.com/docs/foundry/slate/faq)
- [Palantir slate, logic-overview](https://www.palantir.com/docs/foundry/slate/logic-overview)
- [Palantir slate, marketplace-slate](https://www.palantir.com/docs/foundry/slate/marketplace-slate)
- [Palantir slate, navigation](https://www.palantir.com/docs/foundry/slate/navigation)
- [Palantir slate, overview](https://www.palantir.com/docs/foundry/slate/overview)
- [Palantir slate, public-applications-data-upload](https://www.palantir.com/docs/foundry/slate/public-applications-data-upload)
- [Palantir slate, read-write-overview](https://www.palantir.com/docs/foundry/slate/read-write-overview)
- [Palantir slate, references-convert-rows-columns](https://www.palantir.com/docs/foundry/slate/references-convert-rows-columns)
- [Palantir slate, references-helpers](https://www.palantir.com/docs/foundry/slate/references-helpers)
- [Palantir slate, references-indexes](https://www.palantir.com/docs/foundry/slate/references-indexes)
- [Palantir slate, references-query-perf](https://www.palantir.com/docs/foundry/slate/references-query-perf)
- [Palantir slate, references-writeback](https://www.palantir.com/docs/foundry/slate/references-writeback)
- [Palantir slate, style-overview](https://www.palantir.com/docs/foundry/slate/style-overview)
- [Palantir slate, styles-global-stylesheet](https://www.palantir.com/docs/foundry/slate/styles-global-stylesheet)
- [Palantir slate, widgets-advanced](https://www.palantir.com/docs/foundry/slate/widgets-advanced)
- [Palantir slate, widgets-chart](https://www.palantir.com/docs/foundry/slate/widgets-chart)
- [Palantir slate, widgets-container](https://www.palantir.com/docs/foundry/slate/widgets-container)
- [Palantir slate, widgets-control](https://www.palantir.com/docs/foundry/slate/widgets-control)
- [Palantir slate, widgets-platform](https://www.palantir.com/docs/foundry/slate/widgets-platform)
- [Palantir slate, widgets-text](https://www.palantir.com/docs/foundry/slate/widgets-text)
- [Palantir slate, widgets-time](https://www.palantir.com/docs/foundry/slate/widgets-time)
- [Palantir slate, widgets-visualization](https://www.palantir.com/docs/foundry/slate/widgets-visualization)

## 관련 문서

- [[Palantir-Slate]]
