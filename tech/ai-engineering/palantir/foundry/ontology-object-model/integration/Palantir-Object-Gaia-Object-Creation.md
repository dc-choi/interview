---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Gaia 지도에서 업무 객체 만들기

Gaia annotation은 현재 지도에만 있는 도형/점/기호다. Ontology object로 승격하면 다른 지도에서도 권한에 따라 재사용할 수 있다. 승격은 원본 annotation과 layer를 삭제하지 않고 새 object layer를 만든다.

## 인터페이스와 Action 설정

Foundry와 Gotham이 모두 필요하다. 새 `Creatable Geoshape`, `Creatable Geopoint`, `MILSTD 2525C Symbol` 인터페이스와 Create or Modify Action의 interface action constraint를 연결하면 자동 발견된다. 구형 Gaia Geoshape/Geopoint Creatable은 2026-11 종료 예정이며 수동 admin 등록 방식도 2026-11부터 read-only 예정으로 문서화돼 있다. 실제 적용 여부는 환경에서 확인한다.

최신 인터페이스는 구형 Marketplace 설치 전제가 없다. 기존 수동 등록에서 옮기면 constraint와 parameter를 연결하고 이전 object/action RID 항목을 제거한다. 여러 인터페이스는 단일 공통 Action 또는 각각의 Action으로 구성할 수 있으며 혼합 bulk promotion에는 선택한 모든 geometry/symbol의 parameter가 같은 Action에 필요하다.

MRS는 기존 객체의 Gaia 편집과 tactical graphic tagging에 필요하다. 구형 type mapping으로 보이는 것만으로 편집을 지원하지 않는다. Geoshape/geopoint source는 보안 요구에 따라 dataset/RV를 사용하되 MILSTD Symbol 절차는 RV를 요구한다. Symbol Anchor Points와 SIDC를 같은 Action에 매핑하고 primary key는 Action에서 생성한다.

## 권한과 실행 한계

객체는 지도에서 CBAC/mandatory marking을 받을 수 있지만 지도 공유의 group 제한은 자동 상속하지 않는다. Classification parameter를 disabled로 두면 지도 marking 상속, 수동 입력이면 별도 최대 classification 검증을 확인한다. 지도에 안 보인다고 생성 실패로 단정하지 말고 객체 생성 결과와 layer/marking 호환성을 따로 확인한다.

Bulk table은 최대 5,000개이며 각 행은 별도 Action submission이다. 전체 표의 원자성을 가정하지 않는다. 지도 Edit와 Action 실행 권한이 필요하며 표에서 표현할 수 없는 struct parameter 등은 제한된다. 표 사전검사가 서버의 모든 Action constraint를 검증하지는 않는다.

180도 자오선을 넘는 일반 annotation과 달리 Foundry object로 태깅한 도형은 해당 횡단을 지원하지 않는다. 원문의 일반적인 struct Action 미지원 표현은 최신 struct 상세 문서와 충돌하며 Gaia bulk 표 제한을 별도로 적용한다.

## 출처

- [Palantir, create-ontology-objects-from-gaia](https://www.palantir.com/docs/foundry/object-link-types/create-ontology-objects-from-gaia)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Functions]]
