---
tags: [palantir, ontology, data-modeling, inventory, hierarchy]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 자원과 조직 관계 모델링"]
---

# 자원과 조직 관계 모델링

자원 관리에서는 분류, 개별 자산, 수량 상태, 변화와 요구사항이 서로 다른 사실이다. 조직 관리에서도 조직 자체와 특정 계층에 참여하는 관계를 구분해야 한다. Defense OSDK의 공개 모델은 이런 구분을 인터페이스와 링크로 표현한다.

## 분류와 개별 자산

`Materiel Type`은 분류를, `Materiel (Item)`은 개별 물자를 표현한다. 분류에는 명칭이 필수이고 의미 있는 식별자는 선택 사항이다. 개별 물자의 일련번호도 선택 사항이므로 이 필드가 항상 존재하거나 고유하다고 가정하지 않는다.

물자 분류는 여러 부모와 여러 자식을 갖는 분류 관계를 정의한다. 따라서 단일 부모 트리로 제한한다고 해석하면 안 된다. 개별 물자는 분류, 배정 조직과 배정 위치에 각각 선택적인 단일 관계를 갖는다.

`Equipment Type`과 `Munition Type`은 물자 분류를 확장하고, `Equipment (Item)`은 개별 물자를 확장한다. 같은 이름 계열이어도 분류를 상속하는 타입과 개별 자산을 상속하는 타입을 구분한다. 이는 일반 자산 관리에서 모델명과 개별 장비를 분리하는 설계와 연결된다.

## 상태, 변화와 요구사항

| 인터페이스 | 표현하는 사실 | 주요 계약 |
| --- | --- | --- |
| Materiel Status Event | 한 시점의 물자 수량 상태 | 분류, 상태, 수량, 출처 메타데이터와 보고 시각 |
| Materiel Change Event | 물자 수량을 바꾸는 사건 | 분류, 상태, 수량, 출처 메타데이터와 보고 시각 |
| Materiel Requirement | 필요한 물자의 수량 | 분류, 수량, 출처 메타데이터와 보고 시각 |

세 모델 모두 물자 분류 링크는 필수이고 조직과 위치 링크는 선택 사항이다. FK 문자열도 있지만 설명은 해당 링크 사용을 권한다. FK가 채워졌다는 사실만으로 링크의 대상이 존재하거나 접근 가능하다고 가정하지 않는다.

상태와 변화 이벤트는 `Report Observation`을 확장하지만 요구사항은 이 인터페이스를 확장하지 않는다. 같은 수량 필드를 쓴다고 같은 사건으로 합치지 않는다. 변경 이벤트의 수량이 항상 부호 있는 증감량인지, 절대 수량인지도 이름만으로 결정하지 않고 원천 시스템의 계약을 확인한다.

출처 메타데이터는 시스템 RID, 이름, 유형과 마지막 갱신 시각을 담는 구조체 배열이며 길이가 정확히 1로 제한된다. 여러 시스템의 자료를 합쳐 한 이벤트로 저장하려면 이 계약과 충돌하는지 검토해야 한다. 출처의 마지막 갱신 시각과 이벤트의 보고 시각도 별도 필드다.

## 조직의 하위 타입과 계층의 하위 타입

`Unit`은 `Organization`을 확장하므로 조직으로서의 관계에 참여할 수 있다. 그러나 `Unit Hierarchy`는 `Organization Hierarchy`를 확장하지 않는다. 전자는 Unit만 연결해야 하는데 후자의 링크까지 상속하면 다른 조직을 허용할 수 있기 때문이다.

두 종류의 계층 모두에 참여하는 구현은 필요한 인터페이스를 함께 구현한다. 객체의 하위 타입 관계가 그 객체를 담는 계층의 하위 타입 관계로 자동 확장되는 것은 아니다.

`Unit Type`은 이름, 약칭과 정의를 필수로 갖는 별도 분류다. Unit의 의미 있는 식별자, 소속 구분과 규모 속성은 선택 사항이다. 일부 속성의 값 목록은 대소문자를 구분한다. 표시용 설명을 그대로 저장값으로 복사하기보다 실제 value type의 허용값을 사용한다.

## 계획 시각과 실제 시각

`Operation`은 예정 시작과 종료 시각을 필수로, 실제 시작과 종료 시각을 선택적으로 둔다. 완료 전 실제 시각이 없다는 상태를 표현할 수 있다. 부모와 자식 작업, 소유 조직과 참조 계층도 별도 관계다.

확인한 스키마에서 Organization의 Operations 링크는 다중이지만 Unit의 Operation 링크는 단일이다. 이름이 유사하다는 이유로 두 접근 경로의 다중성을 같게 취급하지 않는다. 구현의 메타데이터와 업무 규칙을 확인해야 한다.

## 공통 자산 속성과 특화 속성

`Vessel`은 Equipment를 확장하며 최신 위치, 위치 출처와 관측 시각을 분리한다. 속도는 노트 단위다. Commercial Vessel은 등록 소유자, 회사 소유자와 실질 소유자를 나누고, Military Vessel은 별도의 분류와 소속 속성을 추가한다. 역할이 다른 식별자와 소유자를 하나의 문자열로 뭉개지 않는 사례다.

`Facility`는 위치와 일부 상태 속성을 필수로 갖는다. 확인한 공개 스키마에는 `Named Location` 확장이 없다. 공통 인터페이스를 구현할 수 있다는 개요의 예시를 모든 기본 타입에 이미 적용된 상속 관계라고 읽으면 안 된다.

## 연료 분류와 이동 능력의 계약

이 절은 2026-10-22 공개 Fuel Type과 Maritime Movement Capable 상세를 대조했다. 다른 절의 검증 날짜는 기존 frontmatter 기준을 유지한다.

`Fuel Type`은 `Materiel Type`을 확장하는 연료 분류다. 상세 페이지에 자체 속성이 없다는 사실을 상속 속성까지 없다는 뜻으로 읽지 않는다. 연료를 쓰는 개체로 향하는 `Maritime Movement Capable Entities` 링크는 선택적인 다중 관계이고, 반대쪽의 `Fuel Type` 링크는 선택적인 단일 관계다. 연료 종류와 그것을 사용하는 개체의 이동 능력을 따로 모델링한다.

`Maritime Movement Capable`은 다음 세 선택 속성을 정의한다. 인터페이스 구현만으로 계산에 필요한 값이 모두 있다고 가정하면 안 된다.

| 속성 | 자료형과 설명 | 해석 경계 |
| --- | --- | --- |
| Fuel Burn | `speedKnots`, `fuelBurnGph`가 각각 double인 구조체 목록. 소비율 설명은 gallons per hour | 속도별 소비율 자료이며 단일 상수로 축약하지 않는다 |
| Fuel Capacity | integer, gallons | 용량을 현재 잔량으로 해석하지 않는다 |
| Speed Constraints | `defaultSpeedKnots`, `maxSpeedKnots`가 각각 double인 구조체 | 속성 설명은 miles per hour여서 필드명의 Knots와 불일치한다 |

속도 제약의 실제 단위는 이 공개 설명만으로 확정할 수 없다. 필드명만 보고 노트로 처리하거나 설명만 보고 mph로 변환하지 말고, 데이터를 제공하는 구현과 단위 계약을 확인한다. 값이 없는 상태도 0으로 치환하지 않는다. 이는 누락과 단위 충돌을 계산 전에 검증하는 모델링 판단이다.

## 출처

- [Palantir Documentation, Materiel Type](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-materielType/)
- [Palantir Documentation, Materiel Item](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-materiel/)
- [Palantir Documentation, Equipment Type](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-equipmentType/)
- [Palantir Documentation, Equipment Item](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-equipment/)
- [Palantir Documentation, Munition Type](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-ammunitionType/)
- [Palantir Documentation, Materiel Status Event](https://www.palantir.com/docs/defense-osdk/api/sustainment/interfaceTypes/com-palantir-ontology-defense-types-materielStatusEvent/)
- [Palantir Documentation, Materiel Change Event](https://www.palantir.com/docs/defense-osdk/api/sustainment/interfaceTypes/com-palantir-ontology-defense-types-materielChangeEvent/)
- [Palantir Documentation, Materiel Requirement](https://www.palantir.com/docs/defense-osdk/api/sustainment/interfaceTypes/com-palantir-ontology-defense-types-materielRequirement/)
- [Palantir Documentation, Organization](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-organization/)
- [Palantir Documentation, Unit](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-unit/)
- [Palantir Documentation, Unit Hierarchy](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-unitHierarchy/)
- [Palantir Documentation, Unit Hierarchy Node Relationship](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-unitHierarchyNodeRelationship/)
- [Palantir Documentation, Unit Hierarchy Node Relationship Type](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-unitHierarchyNodeRelationshipType/)
- [Palantir Documentation, Unit Type](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-unitType/)
- [Palantir Documentation, Operation](https://www.palantir.com/docs/defense-osdk/api/missionPlanning/interfaceTypes/com-palantir-ontology-defense-types-operation/)
- [Palantir Documentation, Vessel](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-vessel/)
- [Palantir Documentation, Commercial Vessel](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-commercialVessel/)
- [Palantir Documentation, Military Vessel](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-militaryVessel/)
- [Palantir Documentation, Facility](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-facility/)
- [Palantir Documentation, Fuel Type](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-fuelType/)
- [Palantir Documentation, Maritime Movement Capable](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-maritimeMovementCapable/)

## 관련 문서

- [[Palantir-Defense-Ontology-Contracts]]
- [[Palantir-Observation-and-Evidence-Modeling]]
- [[Palantir-Ontology-Modeling]]
