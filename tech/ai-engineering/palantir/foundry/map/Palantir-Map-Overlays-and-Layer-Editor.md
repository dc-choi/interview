---
tags: [palantir, foundry, map]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 재사용 overlay의 vector, raster와 Mapbox JSON

Map Layer Editor에서 source와 display를 정해 저장한 layer를 Map/Workshop에 재사용한다. save 전 preview가 공유 layer publication은 아니다. object-backed layer와 static/vector/raster overlay의 source 및 권한을 구분한다.

vector source는 manual GeoJSON file, dataset 내 GeoJSON file, GeoJSON URL 또는 MVT URL이다. raster는 tileset URL을 받고 opacity/min-max zoom과 linear/nearest sampling을 정한다. overzoom linear는 부드럽지만 흐리고 nearest는 선명하지만 pixelated해진다. 확대가 원본 공간 해상도를 높이지는 않는다.

object layer는 geopoint/geoshape를 가진 OSS 또는 deprecated OQL sync object type과 optional filter, 또는 saved exploration을 받는다. instance 지원이 전제다. object type의 data가 바뀌면 layer 결과도 바뀔 수 있다.

native UI로 표현하지 못하는 경우 Mapbox GL style JSON을 쓰되 sources와 layers만 지원하며 둘 다 필수다. JSON validation 성공이 외부 URL 접근/CSP/인증이나 모든 style feature 지원을 보장하지 않는다. Control Panel의 custom base map 설정과 per-map overlay를 구분한다.

## 출처

- [Palantir, layer-editor](https://www.palantir.com/docs/foundry/map/layer-editor)

## 관련 문서

- [[Palantir-Map-State-and-Selection]]
- [[Palantir-Map-Loading-and-Geometry]]
