---
tags: [palantir, foundry, geospatial]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Gaia 데이터 경로, 갱신과 접근 조건

Gaia에서 객체를 보이는 방식에 따라 규모와 갱신 계약이 다르다. Drag/drop object 또는 set은 최대5000개, 검색과 search template도 최대5000개이며 기본 정적 결과 또는 선택적30초 갱신을 사용한다. 검색에서 Live update search results를 켜야 주기 갱신한다. Geotemporal sync는 최대500만개와 realtime, Function/버전 고정 object set EML은 최대5000개와 설정한 refresh를 사용한다. 모든 지도 layer에 같은 한도가 적용되는 것은 아니다.

MRS가 있으면 일반 객체 보기와 만들기에 type mapping이 불필요할 수 있지만 advanced geotemporal 사용까지 면제되는 것은 아니다. Function/search template/versioned-set EML은 Gaia admin과 ACL group/Classification 설정이 필요하다. Foundry object search는 enrollment별 enablement를 확인하고 geo property가 있어야 한다.

Drag/drop set은 Object Explorer exploration을 public project에 저장하는 흐름을 포함한다. 여기서 public을 공개 인터넷 접근으로 해석하지 않으며 project 권한을 확인한다. 기존 layer와 중복 객체를 포함/제외할지 선택한다.

Function EML은 commit만으로 배포되지 않고 publish/tag가 필요하다. Refresh interval을 비우면 자동 갱신하지 않는다. Geo filter는 display name이 아닌 property ID를 사용한다. Versioned object-set EML과 MRS 조합의 일반 type-mapping 면제, geotemporal 고급 기능의 필수 mapping을 각각 적용한다.

## 출처

- [Palantir, add-ontology-data-to-gaia](https://www.palantir.com/docs/foundry/geospatial/add-ontology-data-to-gaia)

## 관련 문서

- [[Palantir-Geospatial]]
- [[Palantir-Geotemporal-Series]]
- [[Palantir-Map]]
