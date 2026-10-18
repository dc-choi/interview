---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Interface의 추상 계약과 구현

Interface는 공통 속성, 링크와 Action capability를 선언하는 추상 타입이다. 자체 dataset이나 instance는 없고 concrete object type이 구현한다. 하나의 타입이 여러 interface를 구현할 수 있다. Local interface property를 권장하며 shared property도 사용할 수 있다. Required는 각 구현에서 매핑해야 한다는 뜻이며, 모든 객체 값의 non-null 보장을 의미하지 않는다.

Ontology Manager에서 생성하고 project를 선택한 뒤 Ontology Save를 해야 반영된다. Property, required link와 required Action constraint를 모두 구현한다. Pipeline Builder는 property mapping만 지원하므로 required link/Action이 있으면 Ontology Manager에서 구현한다. Interface로 typed된 조회는 interface API name, concrete type 조회는 local API name을 사용한다.

Link constraint는 target을 구체 object type 또는 interface로 정하고 ONE/MANY와 required 여부를 정한다. 선언만으로 모든 저장소의 실제 cardinality 검증을 보장한다고 해석하지 않는다. Metadata의 searchable=true는 한꺼번에 검색 가능한 구현 타입을 75개로 제한하고, non-searchable은 1,000개다. 기본은 searchable이며 status는 experimental이다.

## 소비자별 지원 경계

공식 overview는 TypeScript v2 Functions와 TypeScript OSDK를 지원하고, TypeScript v1/Python Functions는 미지원으로 설명한다. OSS 검색/정렬, Workshop widget과 Actions는 부분 지원이다. Interface 지원이 aggregation, interface link, Action constraint 호출 지원까지 뜻하지 않는다. 언어/SDK/앱 버전별 세부 문서를 함께 확인한다. Interface overview의 Ontology role 설명은 legacy 권한 모델이다. Project-based permissions로 관리하는 interface는 저장 project의 권한을 상속하며 Compass에서 관리한다. 어느 모델을 사용하는지 확인하고 구현 객체의 데이터 권한과 구분한다. Project-based로 이관한 resource는 legacy 모델로 되돌릴 수 없다.

## 출처

- [Palantir, Ontology permissions legacy](https://www.palantir.com/docs/foundry/object-permissioning/ontology-permissions-legacy/)
- [Palantir, Migrate to project-based permissions](https://www.palantir.com/docs/foundry/ontology-manager/migrate-to-project-based-permissions/)

- [Palantir, interfaces](https://www.palantir.com/docs/foundry/interfaces)
- [Palantir, create-interface](https://www.palantir.com/docs/foundry/interfaces/create-interface)
- [Palantir, implement-interface](https://www.palantir.com/docs/foundry/interfaces/implement-interface)
- [Palantir, interface-link-types-overview](https://www.palantir.com/docs/foundry/interfaces/interface-link-types-overview)
- [Palantir, interface-metadata](https://www.palantir.com/docs/foundry/interfaces/interface-metadata)
- [Palantir, interface-overview](https://www.palantir.com/docs/foundry/interfaces/interface-overview)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
