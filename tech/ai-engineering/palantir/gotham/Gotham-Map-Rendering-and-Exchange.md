---
tags: [palantir, gotham, gaia, rendering, geospatial]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Gaia v1 렌더링과 지도 교환"]
---

# Gaia v1 렌더링과 지도 교환

지도 구조를 읽는 것, 객체를 화면 요소로 변환하는 것과 외부 형식으로 내보내는 것은 다른 계약이다. 아래는 2026-10-16 `map-resources`의 v1 공개 문서 기준이며, Gaia v2에 같은 경로나 기능이 있다고 가정하지 않는다. 실제 렌더링이나 외부 GIS 연동은 시험하지 않았다.

## 렌더링 snapshot과 식별자 수명

Foundry 객체 렌더링은 지정한 object set의 초기 렌더링 값을 반환하는 stateless snapshot이다. 처리 도중 생긴 변경을 반영하지 않으므로 실시간 객체 조회나 지속 구독으로 취급하지 않는다. 해당 계약은 versioned object set을 지원하지 않는다고 명시한다.

한 요청을 하나의 session으로 보고 invocation ID는 그 안에서 고유해야 한다. Renderable과 sourcing ID도 session 범위의 opaque 식별자이고, renderable part ID는 해당 요소 안에서만 고유하다. 문자열을 파싱해 객체의 영구 식별자로 만들지 않는다.

Sourcing은 화면 요소가 어떤 원천 데이터에서 파생됐는지 가리킨다. Foundry 객체의 object type과 primary key 또는 object RID를 별도로 따라가야 한다. `sourcingOnly`는 도형 없이 원천 정보만 받는 용도이므로 빈 renderable을 데이터 부재로 해석하지 않는다.

## 기능 협상과 표현 손실

클라이언트는 지원하는 content type을 전달하며 기본 `GEOMETRY`를 지원해야 한다. 추가 표현에는 Web Mercator(EPSG:3857) raster tile이 있다. 지원하지 않는 고급 표현을 기본 geometry로 바꾸면 성능이나 충실도가 떨어질 수 있다.

| 표현 | 확인할 단위와 의미 |
|---|---|
| GeoJSON geometry | WGS 84 경위도와 선택적 높이 |
| Raster tiles | Web Mercator 투영, 제공된 `{z}/{x}/{y}` URL template |
| 크기와 선 폭 | 고해상도 화면을 고려한 virtual pixel |
| 렌더링 색상과 opacity | Alpha 0~255 |
| Annotation fill/stroke opacity | 0~1 |

같은 opacity라는 이름만 보고 범위를 공유하지 않는다. Raster tile의 표시 해상도와 지리 좌표의 정밀도도 다른 값이다. PNG나 화면 도형이 원천의 모든 속성이나 불확실성을 보존한다고 가정하지 않는다.

## PNG symbol 캐시와 인증

Generic symbol 로드는 PNG를 반환하고 `If-None-Match`/ETag에 따라 304를 반환할 수 있다. `Cache-Control`과 `Content-Type`도 제공한다. 크기 요청은 reference size를 맞추는 요청이므로 실제 이미지 폭과 높이가 지정 숫자와 같다는 보장은 없다.

Authorization header가 없으면 `PALANTIR_TOKEN` cookie를 사용하는 별도 fallback을 설명한다. 이를 모든 Gotham API의 공통 인증 방식으로 확대하지 않는다. Symbol ID도 opaque 값이므로 내부 구조를 해석하지 않는다.

## KMZ export와 WFS는 범위가 다르다

KMZ export는 해당 지도에 직접 들어 있는 local element만 내보내고 linked map의 element는 포함하지 않는다. 내부 KMZ 내용의 schema compatibility 보장도 없다. 내보낸 파일을 안정된 내부 데이터 교환 포맷처럼 장기 파싱하지 않는다.

WFS는 지도 지리 요소를 `GaiaGeoFeature`라는 하나의 type으로 노출한다. 공개 설명의 지원 동작은 GetCapabilities, DescribeFeatureType과 GetFeature이며 GET과 POST를 제공한다. 버전 표기는 `1.1.0`과 `2.00`이다. 이 표기만으로 더 넓은 WFS 호환성을 확정하지 않는다.

WFS 인증은 Authorization Bearer를 우선하며, 외부 GIS 제약에 따라 ESRI token header나 `PALANTIR_TOKEN` query parameter도 설명한다. Query parameter 방식은 토큰이 URL 로그나 기록에 남을 수 있으므로, 사용 시 URL 수집 경로를 통제해야 한다. 이는 공개 인증 방식에서 도출한 운영상 주의점이며 실제 로그 노출을 확인했다는 뜻은 아니다.

## 출처

- [Palantir, Rendering Foundry Objects](https://www.palantir.com/docs/gotham/api/map-resources/maps/render-objects)
- [Palantir, Load Generic Symbol](https://www.palantir.com/docs/gotham/api/map-resources/maps/load-generic-symbol)
- [Palantir, Rendering Symbology](https://www.palantir.com/docs/gotham/api/map-resources/maps/render-symbol)
- [Palantir, Export Map as KMZ](https://www.palantir.com/docs/gotham/api/map-resources/maps/export-kmz)
- [Palantir, Map as a WFS Source](https://www.palantir.com/docs/gotham/api/map-resources/maps/map-wfs)

## 관련 문서

- [[Gotham-Map-Structure-and-Geometry|지도 계층과 annotation 좌표]]
- [[Gotham-API-Client-Contracts|인증과 preview 경계]]
- [[Palantir-Observation-and-Evidence-Modeling|표현과 원천 증거]]
