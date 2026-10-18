---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Interface 변경과 Action capability 검증

Interface extension은 properties, link와 Action constraints를 상속하며 다중 extension도 가능하다. Extension 제거는 상속된 계약과 base 연결을 함께 제거한다. Required property/link/Action을 추가하면 모든 구현을 같은 Ontology update에서 맞춰야 한다. 소비자를 동시에 바꾸기 어려우면 새 interface 또는 extension을 만들고 점진적으로 이전한다. Optional 속성/constraint는 Marketplace upgrade blocker를 줄일 수 있다.

구현 mapping 변경/제거와 interface 정의 변경은 다르다. API name과 type 변경은 소비자 계약을 다시 검토한다. 원문은 모든 변경이 반드시 구현을 깨뜨린다는 강한 경고를 사용하지만, 실제 영향을 metadata 변경과 required 계약 변경으로 나눠 확인한다.

## Beta Action constraint

Action constraint는 표시 의미, API name, parameter shape와 required 여부를 선언한다. 실행 규칙, submission criteria, side effect와 form layout은 concrete Action에 남는다. Required parameter constraint는 compatible required parameter에 매핑해야 하며 같은 concrete parameter를 여러 constraint에 중복 매핑할 수 없다. Object/interface reference, object set와 struct는 일반 종류를 검증하며 특정 concrete object type의 모든 의미까지 고정하지 않는다.

Save는 required constraint/parameter 미매핑, incompatible type, 중복 매핑과 사라진 constraint를 거절한다. 상속된 required constraint도 만족해야 한다. 의미상 같은 동작인지는 설명, 실제 규칙, 권한과 외부 효과를 따로 검증해야 한다.

TypeScript OSDK는 mapping을 resolve한 뒤 concrete Action을 호출한다. Constraint 자체를 직접 호출하지 않는다. Workshop은 직접 노출하지 않으므로 OSDK custom widget이 필요하다. Marketplace는 패키징을 지원한다. Beta UI/validation 확장과 기존 mapping 호환 약속을 실제 배포 환경의 지원 여부와 구분한다.

## 출처

- [Palantir, edit-interface-definition](https://www.palantir.com/docs/foundry/interfaces/edit-interface-definition)
- [Palantir, edit-interface-implementation](https://www.palantir.com/docs/foundry/interfaces/edit-interface-implementation)
- [Palantir, extend-interface](https://www.palantir.com/docs/foundry/interfaces/extend-interface)
- [Palantir, interface-action-type-constraints](https://www.palantir.com/docs/foundry/interfaces/interface-action-type-constraints)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
