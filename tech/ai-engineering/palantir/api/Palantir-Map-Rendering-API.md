---
tags: [palantir, foundry, api, maps, geojson, rendering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 지도 렌더링 API"]
---

# Object Set의 지도 렌더링과 Symbol 로딩

Map Rendering API는 Object Set으로부터 그릴 geometry/raster와 style, 그리고 원본 객체를 찾을 sourcing 정보를 반환한다. stateless snapshot이며 렌더링이 시작된 뒤 원본 데이터의 변경을 실시간 반영하는 구독이 아니다.

## 요청 capability와 invocation

`PUT /api/v2/mapRendering/invocationObject/render`는 OAuth2 scope `api:map-read`와 Preview opt-in `preview=true`를 요구한다. 클라이언트는 지원할 content 종류인 `GEOMETRY`, `RASTER_TILES_WEB_MERCATOR`를 capability에 선언하고 서버가 지원 가능한 적합한 형식을 선택하게 한다.

각 invocation은 session 안에서 유일한 client ID, object set 참조와 renderer를 가진다. standard renderer는 Ontology Manager의 object type icon에서 기본 style을 결정한다. `sourcingOnly` field도 노출되지만 이 명세에 자세한 의미가 없어 이름만으로 payload 생략 규칙을 확정하지 않는다.

Object Set 참조 설명은 versioned object set이 미지원이라고 명시한다. 같은 페이지 예제에는 versioned-object-set RID가 있어 상충한다. 예제 문자열을 지원 증거로 삼지 않고 사용하려는 Object Set 종류를 실제 지원 조건과 대조해야 한다.

## Renderable과 원본 추적

응답의 renderables는 invocation, sourcing과 여러 content part를 연결한다. renderable ID와 sourcing ID는 session 안에서 유일하며 opaque하다. content의 part ID는 해당 renderable 안에서 유일하다. 문자열 내부를 파싱해 객체 타입이나 영구 식별자를 추론하지 않는다.

sourcings는 실제 데이터 단위를 찾기 위한 정보와 title을 담는다. object 방식은 objectType과 property RID별 untyped primary key map, objectV2 방식은 objectType과 objectRid를 제공한다. untyped value에서 원래 property type이 보존된다고 전제하지 않는다.

## Geometry와 raster는 좌표계를 구분한다

Geometry content는 GeoJSON geometry와 style을 담는다. GeoJSON은 WGS84 기준 경도, 위도 순서의 decimal degree를 사용한다. 선택적 세 번째 값은 기준 타원체 위/아래 높이의 meter다. 위치의 네 번째 이후 값은 의미가 불명확해 parser가 무시할 수 있으므로 사용자 정의 timestamp를 끼워 넣지 않는다.

Point/MultiPoint, LineString/MultiLineString, Polygon/MultiPolygon, GeometryCollection과 Feature/FeatureCollection의 구조가 구분된다. LineString은 위치 두 개 이상, LinearRing은 네 개 이상이며 처음과 마지막 위치가 같아야 한다. exterior ring은 반시계, hole은 시계 방향인 right-hand rule을 따른다. 단일 geometry나 동종 multipart로 표현 가능한 것을 불필요한 GeometryCollection으로 감싸지 않는다.

bbox는 차원 수 n에 대해 2n 값으로 남서쪽 점의 각 축과 북동쪽 점의 각 축을 차례로 넣는다. Feature properties는 객체 또는 null이며 ID가 있으면 문자열/숫자 값을 사용한다.

Raster content는 Web Mercator EPSG:3857 tile이다. `(z=0, x=0, y=0)`의 단일 root tile이 전체 세계를 덮는 구조이며 제공된 URL template로 tile 주소를 만든다. coveringGeometry, tileDisplayResolution과 opacity도 함께 반환한다. geometry의 경위도 좌표와 raster tile의 projection을 같은 수치 좌표로 취급하지 않는다.

## Style과 Symbol capability

style은 symbol, stroke, fill과 label을 표현한다. 크기와 선 폭은 high-DPI를 고려한 virtual pixel 기준이다. alpha/opacity는 0~255 범위를 사용하고 RGB는 `#RRGGBB` 문자열이다.

pattern은 solid RGB, color를 적용할 SDF symbol, generic symbol의 union이다. 클라이언트는 generic symbol 렌더링을 지원해야 한다. stroke/fill의 이전 color field는 style 전체를 표현하지 못해 deprecated이며 가능한 경우 pattern과 opacity를 사용한다. field 이름이 남아 있다는 이유로 새 style 정보가 전부 color에 있다고 가정하지 않는다.

## PNG Symbol endpoint와 HTTP cache

`GET /api/v2/mapRendering/symbols/{symbolId}/generic`은 symbolId와 필수 size query를 받아 binary PNG를 반환한다. 이 endpoint도 `api:map-read`, `preview=true`를 요구한다. symbol ID는 opaque하므로 파싱하지 않는다.

Symbol basics는 `If-None-Match` ETag 요청에 unchanged이면 304를 반환하고 Cache-Control/Content-Type header를 제공한다고 명시한다. Authorization header가 없으면 PALANTIR_TOKEN cookie를 사용하는 browser 지원도 설명한다. 이 예외를 다른 Foundry API 전체의 cookie 인증 계약으로 일반화하지 않는다. 304 응답에 새 PNG body가 있을 것으로 기대하지 않는다.

RenderInvocationObjectPermissionDenied와 GenericSymbolPermissionDenied를 작업별로 구분하고 공통 인증/제한 처리는 [[Palantir-API-Client-Contract]]를 따른다. 이 기록은 명세 대조이며 실제 지도 렌더링, cache 재검증과 cookie 인증을 시험하지 않았다.

## 출처

- [Palantir, Invocation Object basics](https://www.palantir.com/docs/foundry/api/map-rendering-v2-resources/invocation-objects/invocation-object-basics)
- [Palantir, Render Invocation Object](https://www.palantir.com/docs/foundry/api/map-rendering-v2-resources/invocation-objects/render-invocation-object)
- [Palantir, Symbol basics](https://www.palantir.com/docs/foundry/api/map-rendering-v2-resources/symbols/symbol-basics)
- [Palantir, Generic Symbol](https://www.palantir.com/docs/foundry/api/map-rendering-v2-resources/symbols/generic-symbol)

## 관련 문서

- [[Palantir-API]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Ontology-Retrieval]]
