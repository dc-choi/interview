---
tags: [palantir, ontology, interface, schema, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Defense OSDK 모델링 계약"]
---

# Defense OSDK의 모델링 계약

Defense OSDK는 여러 조직과 원천 시스템의 데이터를 공통 의미 모델로 다루기 위한 인터페이스 계층이다. 도메인별 객체 이름을 통일하는 것뿐 아니라, 속성, 관계와 애플리케이션 접근 계약을 함께 제공한다. 공개 문서에 있는 모델 정의와 실제 배포 환경의 데이터 접근 권한은 구분한다.

## 인터페이스를 애플리케이션 계약으로 쓰기

인터페이스는 공통 속성과 관계의 모양을 정의한다. 자체 backing dataset이나 인스턴스를 갖는 객체 타입이 아니며, 실제 객체 타입이 인터페이스를 구현한다. 소비자는 모든 구현 객체의 구체적인 타입을 하드코딩하는 대신 필요한 인터페이스를 대상으로 코드를 작성한다.

OSDK는 선택한 Ontology 엔티티에 맞는 타입과 함수를 생성한다. 접근은 애플리케이션에 부여한 범위와 사용자의 데이터 권한에 함께 제한된다. SDK 생성이나 타입 검사만으로 데이터 접근이 허용되는 것은 아니다.

인터페이스 확장은 부모의 속성과 링크 제약을 물려받는다. 공통 능력은 조합하되, 의미가 다른 관계를 상속해서 허용 범위를 넓히지 않는 것이 중요하다. 데이터 모델의 구체적인 설계 판단은 [[Palantir-Ontology-Modeling]]과 [[Palantir-Ontology-Evolution]]을 함께 참조한다.

## 도메인과 공통 능력 분리

| 모델 영역 | 표현하는 정보 | 모델링에서 구분할 것 |
| --- | --- | --- |
| Common | 위치, 보고, 공통 표기 같은 여러 도메인의 기본 개념 | 특정 업무의 객체 타입과 공통 능력 |
| Intelligence | 자료, 출처, 수집 활동과 분석 결과의 연결 | 관측 자료, 생성 주체와 해석 결과 |
| Mission Planning | 계획, 작업, 관련 엔티티와 필요 자원 | 계획 내용과 그 계획이 참조하는 객체 |
| Order of Battle | 조직, 장비, 시설과 조직 관계 | 조직 자체와 특정 맥락의 소속 관계 |
| Sustainment | 물자, 분류, 요구량과 상태 변화 | 현재 자산, 요구사항과 변화 이벤트 |
| Targeting and Fires | 대상, 제약 영역, 평가와 상호 관계 | 도메인 객체의 정의와 실제 실행 절차 |

공통 `Named Location`은 이름이 있는 지리적 위치를 표현한다. 여러 도메인의 객체가 이를 구현하면 소비자는 도메인별 위치 타입에 따로 의존하지 않아도 된다. 공개 스키마에서 점과 영역 속성은 모두 선택 사항이므로, 이 인터페이스를 구현했다는 사실만으로 표시 가능한 좌표가 존재한다고 가정하면 안 된다.

## 관계에 맥락이 있으면 별도 객체로 표현하기

한 조직의 부모가 상황이나 기간에 따라 달라질 수 있다면 조직에 부모 ID 하나만 두는 모델은 부족하다. 다음을 분리하면 같은 조직이 여러 계층에 참여하는 상황을 표현할 수 있다.

- `Organization Hierarchy`: 어떤 계층인지 나타내는 집합과 유효 기간.
- `Organization Hierarchy Node Relationship`: 특정 계층에서 부모와 자식을 연결하는 중간 관계.
- `Organization Hierarchy Node Relationship Type`: 그 연결의 의미를 구분하는 분류.

공개 스키마의 조직 계층은 일반 계층 인터페이스를 상속하지 않는다. 일반 계층의 링크 제약까지 물려받으면 조직 외 노드를 허용할 수 있기 때문이다. 두 계층에 모두 참여해야 하는 객체는 필요한 인터페이스를 함께 구현한다.

이 설계를 일반 업무에 적용하면 조직, 프로젝트, 계약 같은 엔티티와 특정 기간의 참여 관계를 분리할 수 있다. 이는 모델링 응용이며, 이 Vault가 해당 구조나 실행 기능을 이미 구현했다는 뜻은 아니다.

## 설명과 스키마의 강도를 구분하기

Order of Battle 개요는 중간 관계가 부모, 자식, 계층과 관계 유형에 각각 연결된다고 설명한다. 그러나 해당 인터페이스 상세의 네 링크는 `oneToOne`이면서 `required: false`로 표시된다. 따라서 개요의 설명만으로 네 연결이 모두 필수라고 해석하지 않는다. 업무상 필수인 연결은 실제 구현 스키마와 검증 규칙에서 확인해야 한다.

개요는 관계의 시간적 유효성을 설명하지만, 확인한 `Organization Hierarchy Node Relationship` 상세에는 속성이 없다. `Valid From`과 `Valid To`는 `Organization Hierarchy`에 선택 속성으로 존재한다. 개별 관계의 유효 기간까지 저장하려면 실제 객체 타입이 제공하는 속성을 별도로 확인해야 한다.

관계의 다중성, 필수 여부와 업무상 완전성은 다른 조건이다. 모델 설명은 의도를 보여주고, 실제 스키마와 변경 검증은 그 의도를 어디까지 강제하는지 보여준다.

## SDK 예제의 사용 경계

공개 인터페이스 예제는 메타데이터 조회, 반복 조회, 필터, 정렬, 페이지 조회와 구독의 사용 형태를 보여준다. 확인한 자동 생성 예제에는 `someProperty`, 대체가 필요한 import 표현과 제어 문자가 포함되어 있어 그대로 실행 가능한 코드로 취급하지 않는다. 생성된 SDK의 실제 export와 속성을 기준으로 작성해야 한다.

구독에서 객체 제거는 실제 삭제뿐 아니라 필터 조건에서 벗어난 경우도 포함한다. `onOutOfDate`는 변경을 모두 추적하지 못했으므로 다시 조회해야 한다는 신호다. 변경 알림만 누적해도 로컬 상태가 계속 정확하다고 가정하면 안 된다.

## 출처

- [Palantir Documentation, Build with the Defense OSDK](https://www.palantir.com/docs/defense-osdk/api/general/overview/build-with-the-defense-osdk/)
- [Palantir Documentation, Common interfaces across domains](https://www.palantir.com/docs/defense-osdk/api/common/overview/about/)
- [Palantir Documentation, Intelligence](https://www.palantir.com/docs/defense-osdk/api/intelligence/overview/about/)
- [Palantir Documentation, Mission Planning](https://www.palantir.com/docs/defense-osdk/api/missionPlanning/overview/about/)
- [Palantir Documentation, Order of Battle](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/overview/about/)
- [Palantir Documentation, Sustainment](https://www.palantir.com/docs/defense-osdk/api/sustainment/overview/about/)
- [Palantir Documentation, Targeting and Fires](https://www.palantir.com/docs/defense-osdk/api/targetingFires/overview/about/)
- [Palantir Documentation, Named Location](https://www.palantir.com/docs/defense-osdk/api/common/interfaceTypes/com-palantir-ontology-defense-types-namedLocation/)
- [Palantir Documentation, Organization Hierarchy](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-organizationHierarchy/)
- [Palantir Documentation, Organization Hierarchy Node Relationship](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-organizationHierarchyNodeRelationship/)
- [Palantir Documentation, Organization Hierarchy Node Relationship Type](https://www.palantir.com/docs/defense-osdk/api/orderOfBattle/interfaceTypes/com-palantir-ontology-defense-types-organizationHierarchyNodeRelationshipType/)

## 관련 문서

- [[Palantir-Foundry]]
- [[Palantir-Ontology-Modeling]]
- [[Palantir-Ontology-Evolution]]
- [[Palantir-SDK-and-Agent-Tools]]
