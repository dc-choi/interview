---
tags: [palantir, gotham, gaia, geospatial, api]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gaia 지도 구조와 좌표 계약"]
---

# Gaia 지도 구조와 좌표 계약

지도 메타데이터, 계층 구조와 실제 geometry는 서로 다른 응답이다. 모든 값을 하나의 지도 로드 요청이 돌려준다고 가정하면 중첩 계층이나 개별 요소가 누락된다. 아래는 2026-10-16 Gaia v2 공개 API 계약을 중심으로 정리하고 v1 차이를 별도로 구분했다. 렌더링이나 실제 요청은 시험하지 않았다.

## 계층과 요소의 식별 범위

지도 로드는 제목과 layer 메타데이터를 제공한다. `rootLayerIds`는 루트만, `layers`는 하위 계층까지 포함한다. 각 layer의 `subLayerIds`를 따라 전체 구조를 복원한다.

레이어 내용 로드는 geometry를 포함한 요소를 반환한다. 유효하지 않은 layer ID는 응답 매핑에서 빠질 수 있다. 요청 ID 목록과 반환 ID 목록을 비교해야 일부 누락을 감지한다.

Layer ID는 지도 안에서, element ID는 부모 layer 안에서 고유하다. Element ID 하나를 지도 전체의 고유키로 쓰지 않는다. 요소는 여러 feature를 가질 수 있으며 Foundry 객체나 다른 원천을 참조할 수 있다. 강타입 properties의 필드 계약과 실제 값의 존재 보장은 다르다. 해당 값은 best effort로 채워진다.

`loadWithExtension`은 각 layer의 Foundry 객체를 담는 임시 object set 정보를 요청할 수 있다. 반환된 참조에는 만료 시각이 있으므로 영구 집합으로 저장하지 않는다.

## 입력 좌표와 출력 GeoJSON의 차이

| 구분 | 표현과 조건 |
|---|---|
| Gaia annotation 좌표 | `{lon, lat}` 객체 |
| Annotation polygon | 3개 이상 좌표, 마지막에 첫 좌표를 반복하지 않음 |
| GeoJSON position | 경도, 위도 순서의 배열, 세 번째 높이는 선택 |
| GeoJSON polygon ring | 4개 이상 위치, 첫 위치와 마지막 위치가 같아야 함 |

입력 polygon과 GeoJSON ring에 같은 닫힘 규칙을 적용하면 잘못된 도형을 만들 수 있다. GeoJSON은 WGS 84 경위도와 선택적 타원체 기준 높이를 설명한다. 도형의 좌표와 화면 스타일인 픽셀 폭, 색상, 투명도 및 회전 각도도 서로 다른 단위다.

## 지도 변경은 멱등하지 않다

Annotation 추가는 요청마다 새 요소를 만든다. 부모 layer를 지정하지 않으면 layer도 새로 만든다. 기존 부모를 지정할 때는 annotation layer여야 한다. 잘못된 입력이나 보안 조건 위반이 있으면 전체 요청을 거부한다.

Artifact 추가도 요청마다 새 layer를 만들어 멱등하지 않다. 해당 v2 계약은 Foundry 관리 객체 타입만 지원한다. 네트워크 오류 후 응답을 받지 못했다고 동일 쓰기를 바로 재시도하면 중복될 수 있으므로 적용 여부 확인이 필요하다.

읽기 endpoint가 GET뿐 아니라 PUT도 사용하므로 HTTP 메서드만 보고 데이터 변경 여부를 추측하지 않는다. OAuth 앱에는 읽기와 쓰기 scope를 구별해 요청한다.

## 검색과 표현 기능

지도 검색은 이름에 문자열이 포함된 게시 지도를 반환한다. 개별 설명의 pageSize 기본값은 50이며 다음 토큰으로 계속 조회한다. 결과의 `mapRid`는 폐기 예정이고 `mapGid`를 사용하도록 안내하지만, 다른 endpoint의 parameter 이름은 여전히 `mapRid`다. 이름만 보고 ID 형식을 자동 치환하지 않는다.

Symbol 렌더링 결과는 PNG binary다. IconSymbol과 MilsymSymbol을 구분하며 URL symbol은 지원하지 않는다. 지도 메타데이터나 geometry JSON처럼 파싱하지 않는다. 이 범위의 endpoint는 preview이므로 안정 API의 변경 보장을 적용하지 않는다.

## v1을 함께 읽을 때의 차이

v1 지도 구조와 layer 조회도 계층과 geometry를 분리하지만 경로와 입력 필드가 다르다. v1의 `includeDisplayFields`는 표시용 일반 필드를 best effort로 요청하며, 이 필드에는 안정된 API 보장이 없다. 프로그램에서 사용하는 강타입 `properties`와 구별한다.

v1 annotation rectangle의 bounding box는 top-left와 bottom-right의 `{lon, lat}` 객체다. GeoJSON bbox의 남서와 북동 좌표 배열 규칙을 적용하지 않는다. Annotation의 `eventDate`는 Unix epoch 밀리초이며, 다른 endpoint의 ISO 8601 문자열과 구별한다.

v1은 annotation 외에 artifact, enterprise map layer와 Foundry 관리 객체 추가를 각각 제공한다. 각 요청에서 새 layer나 element를 만들므로 멱등하지 않다. 특히 v1 artifact 추가는 collection artifact로 지원 범위를 한정한다. v2의 artifact 추가가 Foundry 객체를 설명하는 것과 서로 바꿔 해석하지 않는다.

v1의 PNG cache, 객체 snapshot 렌더링과 외부 KMZ/WFS 교환은 [[Gotham-Map-Rendering-and-Exchange]]에서 구분한다.

## 출처

- [Palantir, Gaia Map basics](https://www.palantir.com/docs/gotham/api/gaia-v2-resources/maps/map-basics)
- [Palantir, Load Map](https://www.palantir.com/docs/gotham/api/gaia-v2-resources/maps/load-map)
- [Palantir, Load Layers Map](https://www.palantir.com/docs/gotham/api/gaia-v2-resources/maps/load-layers-map)
- [Palantir, Load With Extension Map](https://www.palantir.com/docs/gotham/api/gaia-v2-resources/maps/load-with-extension-map)
- [Palantir, Add Annotations To Map](https://www.palantir.com/docs/gotham/api/gaia-v2-resources/maps/add-annotations-to-map)
- [Palantir, Add Artifacts To Map](https://www.palantir.com/docs/gotham/api/gaia-v2-resources/maps/add-artifacts-to-map)
- [Palantir, Search Maps](https://www.palantir.com/docs/gotham/api/gaia-v2-resources/maps/search-maps)
- [Palantir, Render Symbol Map](https://www.palantir.com/docs/gotham/api/gaia-v2-resources/maps/render-symbol-map)
- [Palantir, Load Map Layers](https://www.palantir.com/docs/gotham/api/map-resources/maps/load-layers)
- [Palantir, Add Annotations To Map](https://www.palantir.com/docs/gotham/api/map-resources/maps/add-annotations-to-map)
- [Palantir, Add Artifacts To Map](https://www.palantir.com/docs/gotham/api/map-resources/maps/add-artifacts-to-map)
- [Palantir, Add Enterprise Map Layers To Map](https://www.palantir.com/docs/gotham/api/map-resources/maps/add-emls-to-map)
- [Palantir, Add Objects To Map](https://www.palantir.com/docs/gotham/api/map-resources/maps/add-objects-to-map)

## 관련 문서

- [[Gotham-API-Client-Contracts|공통 API 계약]]
- [[Palantir-Observation-and-Evidence-Modeling|위치, 관측과 증거의 구분]]
- [[Gotham-Map-Rendering-and-Exchange|렌더링과 외부 지도 형식]]
