---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Ontology 패키징과 Gotham type mapping

Marketplace는 object/link/shared property/interface의 정의와 관련 dataset을 패키징한다. 실제 object instance와 Action 편집 이력을 product로 포장하지 않는다. Source 없는 object type도 지원한다. 이 문서의 Cipher/Geo time/Vector 미지원 목록은 다른 상세 기능 지원표와 시점이 다를 수 있어 product 검증에서 확인한다.

MRS가 있는 enrollment는 Gotham 통합을 위한 구형 type mapping을 생략할 수 있다. Gaia Data sources에서 Object search를 찾는 것이 문서의 MRS 확인 방법이다. 실제 설치 여부는 여기서 확인하지 않았다.

구형 type mapping은 Foundry와 Gotham이 함께 필요하며 관리자 활성화 후 비활성화할 수 없다. Gotham 설치당 하나의 Foundry Ontology만 연결한다. 지도 표시에 geopoint가 필요하고 custom symbology, search template/EML 등 기존 경로의 조건을 확인한다.

Property는 기본적으로 map하지 않는다. Shared property로 연결/승격하거나 Gotham local clone으로 만들 수 있고 shared property는 자동 매핑된다. Foundry Save 이후 Gotham installation complete를 확인해야 사용할 수 있다. live reindex, 선행 property 미설치, 동시 ontology update 때문에 실패하면 이후 설치 주기에 재시도한다.

Foundry 타입 삭제는 대응 Gotham 타입/속성의 접근과 앱 사용을 끊는다. Type mapping은 source 접근 통제와 classification을 유지한다고 문서가 설명하므로 표시 설정만으로 권한을 별도로 확장하지 않는다.

## 출처

- [Palantir, enable-gotham-integration](https://www.palantir.com/docs/foundry/object-link-types/enable-gotham-integration)
- [Palantir, marketplace-ontology-types](https://www.palantir.com/docs/foundry/object-link-types/marketplace-ontology-types)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
