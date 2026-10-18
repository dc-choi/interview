---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# 객체와 속성 정책으로 cell 수준 보안 구성하기

Object security policy는 객체의 가시성을, property security policy는 지정한 속성값의 가시성을 정한다. 속성을 보려면 두 정책을 모두 통과해야 한다. 객체 정책 실패는 객체를 숨기고, 속성 정책만 실패하면 해당 값이 null로 보인다. 기본키는 속성 정책에 넣을 수 없고, 나머지 속성은 최대 한 속성 정책에 속한다.

Project 기반 권한에서는 object type Viewer와 정책을 통과하면 backing datasource Viewer 없이 객체를 볼 수 있다. legacy datasource-derived 모델에는 이 분리가 적용되지 않는다. 정책을 편집하려면 object type Owner가 필요하다.

## 전파와 우회 경로

Granular row/column 조건은 읽는 순간을 제한하며 downstream output과 export에 그대로 전파되지 않는다. Marking과 CBAC 같은 mandatory 통제로 후속 데이터를 보호한다. 정책의 granular 조건과 mandatory 조건을 같은 전파 특성으로 취급하지 않는다.

Media reference를 숨겨도 원본 media set 접근을 차단한 것이 아니다. 파일과 시계열 등 외부 참조 자원의 권한을 별도로 설정한다. Ontology 정책은 비Ontology 도구가 읽는 raw dataset에도 적용되지 않는다. raw dataset의 세분화된 접근에는 RV 등이 필요하다.

Group, marking, organization membership에 `NOT`을 적용하지 않는다. scoped token이 해당 속성을 갖지 않을 때 부정 조건이 통과해 원래보다 넓은 접근을 줄 수 있다. 객체 정책과 속성 정책의 granular comparison weight 합은 10,000 제한을 따른다.

## 정책 변경과 materialization

Ontology 정책 변경은 거의 즉시 반영되지만 그룹/사용자 속성에는 cache 지연이 있다. 이는 RV 정책이 pipeline rebuild를 기다리는 것과 다르다. 정책의 Marking/organization/classification은 기본적으로 source에서 상속하며, 의도적으로 해제한 통제를 다른 경로에서도 검토한다.

정책 기반 object type materialization은 현재 Foundry dataset을 대상으로 하며 backing source, object/property policy, granular policy가 사용하는 mandatory control property의 Marking을 보수적으로 모은다. Transaction은 build 시점 정책으로 보호된다. 새 Marking 추가 뒤 즉시 build해야 새 transaction에 반영되며, 과거 transaction까지 보호하려면 materialization 또는 backing dataset 자체에 Marking을 추가한다.

Download 권한은 view와 별도다. project에 있는 정책 기반 object type은 object type에서, legacy ontology roles/datasource-derived 자원은 backing source에서 download 권한을 검사한다.

## 검증과 RV 이행 제한

정책 테스트는 저장 전 구성과 가상 속성값으로 사용자 가시성을 점검한다. Derived property 가시성은 원본 객체 권한도 필요해 테스트에서 지원하지 않는다. 검사자가 관련 organization 구성원/관리자가 아니면 guest와 secondary organization 정보가 빠질 수 있다.

RV migration 도구는 정책을 대응시키지만 MDO, 복수 materialization 또는 RV materialization, 일부 부등호, numeric constant, 특정 user property 기반 group/organization/marking 조건을 지원하지 않는다. RV project의 재량적 제약을 보존하려면 object type을 같은 project로 옮기는 선택도 검토한다.

## 출처

- [Palantir, managing-object-security](https://www.palantir.com/docs/foundry/object-permissioning/managing-object-security)
- [Palantir, object-security-policies](https://www.palantir.com/docs/foundry/object-permissioning/object-security-policies)

## 관련 문서

- [[Palantir-Ontology-Object-Model]]
- [[Palantir-Ontology-Guides]]
- [[Palantir-Functions]]
