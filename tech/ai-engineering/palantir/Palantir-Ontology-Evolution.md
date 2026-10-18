---
tags: [palantir, ontology, interface, migration, compatibility]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 온톨로지 변경", "Palantir Ontology Evolution"]
---

# Palantir Ontology 변경: 인터페이스와 소비자 호환성

Ontology 변경은 스키마, 기존 편집, 색인과 애플리케이션 계약을 함께 다루는 작업이다. 스키마 저장 성공, 새 객체 버전의 조회 가능 상태와 기존 소비자의 정상 동작은 각각 확인해야 한다. 객체의 단위와 키 설계는 [[Palantir-Ontology-Modeling]]에 둔다.

## 인터페이스를 애플리케이션의 공통 계약으로 쓴다

Interface는 데이터셋에 직접 연결되어 생성되는 객체 타입이 아니라, 여러 object type이 만족해야 할 속성, 링크와 행동의 공통 형태다. 객체 타입은 여러 interface를 구현할 수 있고 interface도 다른 interface를 확장할 수 있다. 실제 인스턴스는 구체 object type으로 존재한다. [Interfaces](https://www.palantir.com/docs/foundry/interfaces/interface-overview)

예를 들어 `Inspectable`이 점검 상태와 점검일을 정의하면 차량과 시설이 각자의 속성을 공통 속성에 매핑한다. 지원되는 소비자는 구체 타입별 필드명 대신 interface API를 사용할 수 있다. 새로운 타입 추가가 애플리케이션 수정 없이 가능한지는 그 타입의 구현 매핑과 소비 기능의 지원 범위에 달려 있다. [Implement an interface](https://www.palantir.com/docs/foundry/interfaces/implement-interface)

| 공통 계약 | 구현 타입이 연결해야 할 것 | 보장으로 오해하지 않을 것 |
|---|---|---|
| Interface property | 필수 속성에 대한 구체 속성 매핑 | Optional 속성이 모든 객체에 있다는 보장 |
| Link type constraint | 대상 타입/interface와 ONE/MANY 조건을 만족하는 링크 | 실제 모든 인스턴스에 관계가 존재한다는 보장 |
| Action type constraint | 구체 Action과 호환되는 필수 파라미터 매핑 | 실행 로직, 제출 조건과 외부 효과가 같다는 보장 |

Required constraint는 해당 capability의 구현 매핑을 요구한다. 업무 값이 빠질 수 없는 Required property와 같은 층의 규칙으로 취급하지 않는다. Ontology Manager에서 required 속성, 링크와 Action 매핑을 구성하고 저장한다. Pipeline Builder는 현재 interface 구현의 link/action constraint 매핑을 지원하지 않으므로 그런 필수 제약이 있으면 Ontology Manager를 사용한다. [Implement an interface](https://www.palantir.com/docs/foundry/interfaces/implement-interface)

Interface link constraint는 구체 타입 또는 다른 interface를 대상으로 지정할 수 있다. `Facility`와 `Alert`처럼 양쪽이 여러 구체 타입을 가질 때는 interface 대상이 맞는다. 특정 타입과의 관계가 계약이면 그 object type을 대상으로 지정한다. [Interface link type constraints](https://www.palantir.com/docs/foundry/interfaces/interface-link-types-overview)

### 공통 Action의 형태와 의미를 분리한다

2026-10-16 확인 기준 interface action type constraints는 beta다. 필수 Action과 파라미터의 호환 매핑을 저장 시 검증하지만, 구체 Action의 규칙, 제출 조건, 권한과 side effect를 동일하게 만들어 주지는 않는다. `Schedule inspection`이 타입마다 어떤 객체와 외부 일정을 바꾸는지는 각 Action에서 검토해야 한다. [Interface action type constraints](https://www.palantir.com/docs/foundry/interfaces/interface-action-type-constraints)

TypeScript OSDK는 constraint를 만족하는 구체 Action을 찾아 호출할 수 있으며 constraint 자체를 직접 실행하는 방식은 지원하지 않는다. Workshop의 직접 노출도 현재 지원하지 않는다. Interface가 지원되는 곳이라고 Action constraint까지 지원된다고 추정하지 않는다. [Interface action type constraints: support](https://www.palantir.com/docs/foundry/interfaces/interface-action-type-constraints)

일반 interface 지원 역시 서비스와 언어에 따라 다르다. 2026-10-16 overview는 TypeScript v2 Functions를 지원 대상으로, TypeScript v1과 Python Functions를 미지원 대상으로 명시한다. OSDK, OSS와 Workshop은 일부 기능만 지원한다. 새 소비자를 붙일 때 해당 서비스 문서와 실제 환경을 다시 확인한다. [Interfaces: current levels of support](https://www.palantir.com/docs/foundry/interfaces/interface-overview)

### Value type은 의미와 검증, interface는 객체의 공통 형태다

Value type은 primitive field에 의미, metadata와 constraint를 더하는 재사용 wrapper다. 예를 들어 email string의 regex를 여러 property/shared property/pipeline에서 공유한다. Interface는 여러 object type의 property/link/capability를 묶는다. 둘을 함께 써도 field validation과 객체 다형성은 서로 다른 책임이다. 2024년 8월 value type GA는 Builder logical-type cast와 Marketplace packaging을 포함했다. 당시 interface beta의 Action/Function/Workshop 지원 roadmap을 현재 지원 한도로 고정하지 않는다. ([August 2024](https://www.palantir.com/docs/foundry/announcements/2024-08))

2024년 Builder/OMA 통합 확장은 Builder가 만든 batch object의 편집, conflict resolution과 schema migration을 연결했다. 당시 OMA가 만든 객체를 Builder에서 편집하는 역방향과 stream-backed edit는 지원하지 않는다고 구분했다. 같은 Ontology를 두 화면에서 다룰 수 있어도 소유권과 지원 source별 제약이 사라지는 것은 아니다. 현재 direct datasource 기능은 별도로 확인한다.

## 스키마 변경과 데이터 편집의 이력을 나눠 본다

Ontology Manager의 변경은 먼저 로컬 작업 상태에 쌓이며 Save 후 공유된다. 다른 사용자가 먼저 저장했다면 Update로 최신 변경을 합치고 충돌을 해결한다. Error는 저장을 막지만 Warning은 저장을 막지 않는다. 함수의 소스 변경은 Ontology Manager가 아니라 Functions repository에서 한다. [Save changes to the Ontology](https://www.palantir.com/docs/foundry/ontology-manager/save-changes)

History는 스키마 저장 이력을 보여준다. Object type 복원은 선택한 과거 상태를 작업 상태로 가져오므로 다시 저장해야 효력이 생긴다. 이것을 업무 객체의 모든 Action, 외부 시스템 변경과 데이터 원천을 함께 되돌리는 기능으로 확대해석하지 않는다. [Review and restore changes](https://www.palantir.com/docs/foundry/ontology-manager/restore-changes)

| 확인 대상 | 바뀌는 것 | 별도로 확인할 것 |
|---|---|---|
| 표시명, title key 등 메타데이터 | 사람이 보는 이름과 표현 | 설명 의미와 UI 탐색 |
| Property ID, base type, datasource | 데이터 및 편집을 해석하는 스키마 | 기존 편집과 색인 마이그레이션 |
| API name과 객체/링크의 존재 | 코드와 설정이 참조하는 계약 | SDK, Functions, 뷰와 애플리케이션 |
| Primary key | 객체의 식별 | 기존 편집, 링크와 외부 참조의 연속성 |

OSv2의 편집 migration 기준에서 비파괴 변경이어도 애플리케이션까지 호환된다는 뜻은 아니다. 편집된 적 없는 속성의 삭제는 해당 migration 기준에서는 non-breaking이지만, 그 속성을 읽는 앱에는 문제가 될 수 있다. 편집의 보존과 소비자의 호환성을 독립적으로 검토한다. [Manage schema changes](https://www.palantir.com/docs/foundry/object-edits/schema-migrations), [Edit object types](https://www.palantir.com/docs/foundry/object-link-types/edit-object-type)

## OSv2 마이그레이션은 기존 편집을 어떻게 해석할지 정한다

OSv2는 datasource/primary key 변경, property 타입 변경과 편집 이력이 있는 속성의 ID 변경 또는 삭제 등을 breaking schema change로 다룬다. 필요한 migration을 정해야 저장할 수 있다. 저장 후 새 schema version과 replacement Funnel batch pipeline을 만들며, 새 버전은 replacement 완료와 hydration 후 조회된다. [Manage schema changes](https://www.palantir.com/docs/foundry/object-edits/schema-migrations)

| Migration의 선택 | 의미 | 검토할 손실 또는 제약 |
|---|---|---|
| Move edits | 속성 또는 datasource 교체 때 기존 편집을 이동 | 새 대상의 의미와 매핑이 같은가 |
| Cast property/struct field | 지원되는 타입 변환으로 편집을 변환 | 허용 변환 목록과 실제 값의 변환 결과 |
| Drop property/struct field edits | 특정 범위의 편집을 버림 | 다른 편집은 보존돼도 해당 편집은 손실 |
| Drop all edits | 타입의 편집을 버리고 입력 datasource 상태로 복귀 | 사용자 생성, 수정 상태에 미칠 영향 |
| Revert migration | 이전 migration을 되돌리는 지시 | 이력에서 migration 복원 후 다시 저장 |

지원 목록이 임의의 변환을 허용하지는 않는다. 현재 framework는 primary key property에 migration instruction을 적용하지 못한다. Primary key 변경이 breaking 목록에 있다는 사실과 편집을 보존할 migration이 제공된다는 사실을 혼동하지 않는다. [Manage schema changes: supported migrations](https://www.palantir.com/docs/foundry/object-edits/schema-migrations)

OSv1의 제약은 별개다. Datasource 재등록이 필요한 변경은 조회를 중단시키거나 기존 편집 이력을 잃게 할 수 있다. OSv2의 migration 기능을 OSv1 환경에 그대로 적용하지 않는다. Object type ID는 생성 후 변경할 수 없고, active 상태에서는 API name 변경과 타입 삭제가 제한된다. [Edit object types](https://www.palantir.com/docs/foundry/object-link-types/edit-object-type)

## 변경은 소비 경로를 따라 검증한다

다음은 제품이 자동으로 수행한다는 보장이 아닌, 변경 작업을 조직하는 설계 절차다.

1. **변경의 층을 정한다.** 의미, 표현, 키, 원천, 기존 편집과 코드 계약 중 무엇이 달라지는지 적는다.
2. **소비자를 찾는다.** Object Views, Workshop, Functions, OSDK 앱, Action과 외부 참조의 사용을 조사한다.
3. **보존 조건을 정한다.** 편집, 링크, 식별자와 권한 중 유지할 항목 및 불가피한 손실을 명시한다.
4. **작업 상태에서 검토한다.** 변경분, 오류, 경고, 다른 사용자의 수정과 migration 선택을 함께 확인한다.
5. **반영 준비 상태를 확인한다.** Save 결과뿐 아니라 replacement pipeline, hydration과 실제 조회를 확인한다.
6. **업무 경로를 재검증한다.** 기존 참조와 변경 Action을 시험하고, 사용자와 에이전트의 대표 질문을 다시 수행한다.
7. **복구 경로를 확인한다.** 스키마 복원, 편집 migration 복원, 원천 복구와 외부 효과의 처리를 구분한다.

Ontology usage는 소비자를 찾는 단서다. 문서의 30일 지표는 읽기 요청 수와 편집 요청 수이지 로드한 객체 수가 아니다. 지표가 비어 있어도 내부 테이블 미설정이나 metrics 설정의 영향일 수 있으며 Ontology Manager 안의 사용은 집계에서 제외된다. 낮은 지표만으로 미사용 타입을 확정하지 않는다. [Ontology metrics](https://www.palantir.com/docs/foundry/ontology-manager/view-usage)

내보낸 JSON은 작업 상태와 미저장 변경을 포함한다. Import는 그 JSON으로 작업 상태를 재구성한 뒤 Save를 요구한다. JSON schema는 바뀔 수 있으므로 고정된 외부 계약으로 의존하지 않는다. Conditional formatting이 있으면 다른 Ontology로 가져오는 제한도 확인한다. 이는 객체 데이터와 외부 시스템까지 복제하는 백업 절차가 아니다. [Export, edit, and import an Ontology](https://www.palantir.com/docs/foundry/ontology-manager/export-import)

변경량을 줄이는 것만으로 안정성을 확보할 수는 없다. 공통 계약을 유지하면서 필요한 capability나 관련 객체를 확장하는 방법과, 핵심 타입 자체를 바꾸는 방법을 비교한다. 의미가 다른 객체까지 interface 하나로 억지로 묶지 않는다. [Design best practices: extension and composition](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices)

## 출처

- [Palantir, Interfaces](https://www.palantir.com/docs/foundry/interfaces/interface-overview)
- [Palantir, Implement an interface](https://www.palantir.com/docs/foundry/interfaces/implement-interface)
- [Palantir, Interface link type constraints](https://www.palantir.com/docs/foundry/interfaces/interface-link-types-overview)
- [Palantir, Interface action type constraints](https://www.palantir.com/docs/foundry/interfaces/interface-action-type-constraints)
- [Palantir, Save changes to the Ontology](https://www.palantir.com/docs/foundry/ontology-manager/save-changes)
- [Palantir, Review and restore changes](https://www.palantir.com/docs/foundry/ontology-manager/restore-changes)
- [Palantir, Manage schema changes](https://www.palantir.com/docs/foundry/object-edits/schema-migrations)
- [Palantir, Edit object types](https://www.palantir.com/docs/foundry/object-link-types/edit-object-type)
- [Palantir, Ontology metrics](https://www.palantir.com/docs/foundry/ontology-manager/view-usage)
- [Palantir, Export, edit, and import an Ontology](https://www.palantir.com/docs/foundry/ontology-manager/export-import)
- [Palantir, Ontology design: Best practices](https://www.palantir.com/docs/foundry/ontology/ontology-best-practices)
- [Palantir, August 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-08)

## 관련 문서

- [[Palantir-Foundry|Palantir 학습 지도]]
- [[Palantir-Ontology-Modeling|객체의 단위와 의미 계약]]
- [[Palantir-Object-Backend|객체 백엔드와 편집]]
- [[Palantir-Actions-and-Functions|실제 변경의 실행 계약]]
- [[Palantir-SDK-and-Agent-Tools|SDK와 에이전트의 소비 경계]]
