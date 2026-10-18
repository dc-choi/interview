---
tags: [palantir, action, parameter, interface, validation]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Action 규칙과 파라미터"]
---

# Action의 규칙, 파라미터와 일괄 편집

Action rule은 입력을 객체/링크 편집이나 다른 효과로 바꾸는 정의다. Parameter는 앱과 rule 사이의 값 계약이며 submission criteria는 실행 조건이다. Form의 표시와 기본값을 실행 인가로 대신하지 않는다. 기초 실행 계약은 [[Palantir-Actions-and-Functions]]에서 다룬다.

## 단순 rule을 조합하거나 함수 하나로 표현한다

Create, modify, create-or-modify와 delete object rule을 사용할 수 있다. Create에는 primary key가 필요하며 Action으로 기존 primary key를 바꿀 수는 없다. Modify/delete는 같은 Action이 만든 객체를 대상으로 참조하지 않는다. 여러 rule은 객체별 하나의 최종 edit로 합쳐지며 같은 속성을 뒤 rule이 다시 정하면 뒤 값이 남는다. 삭제 후 생성/수정, 생성 전 수정과 동일 객체 중복 생성 같은 조합을 피한다.

N:M 관계는 create/delete link rule을 사용한다. 1:1과 1:N은 foreign key를 object rule로 수정한다. 신규 객체와 N:M 링크는 create object rule의 Add link로 함께 구성할 수 있다. Function rule은 다른 Ontology rule과 함께 두지 않으며 복잡한 탐색, 계산과 여러 타입 생성은 함수 안에 표현한다. 전용 reference의 표현과 side-effect 부착 가이드를 구분해 확인한다.

값 mapping은 parameter, object parameter property, static과 Current User/Time을 지원한다. Static과 Current User/Time은 호출자가 바꾸는 parameter가 아니며 다른 Action 구성에서 parameter처럼 재참조할 수 없다. Time은 실행 시작 때 고정된다.

## 기본값과 표시 제어의 적용 순서를 확인한다

Action 자체의 global default보다 Workshop 변수, Object View 환경값과 Slate 같은 소비 앱의 local default가 우선한다. 중앙 기본값으로 전환하려면 남아 있는 local override도 제거한다. Object property default는 form 순서상 앞에 있는 object reference parameter에서 가져온다.

OSDK 요청의 optional parameter는 default가 구성돼 있을 때만 생략할 수 있다. Default가 기존 속성값이면 생략한 값도 그 값을 채워 다시 쓰므로 요청에서 빠졌다는 사실이 쓰기 제외를 뜻하지 않는다. 이는 동시 충돌과 감사 범위에도 영향을 준다.

Override는 constraints, visibility, requiredness와 default를 조건부로 바꾼다. 여러 block이 참이면 첫 block만 적용하고 그 block 안의 여러 override는 함께 적용한다. 조건에서 자신보다 앞 parameter만 참조한다. Sections는 1/2열, 설명, collapse/hidden과 override를 제공해 내부 parameter를 묶는다. 화면의 hidden/disabled는 서버의 권한 검사를 대신하지 않는다.

기본값과 선택지의 긴 의존 사슬은 form 초기화를 직렬화한다. 가능하면 뒤 parameter가 중간 복사값 대신 원 object를 직접 참조해 병렬로 계산할 수 있게 한다. 이는 UI 지연 설계이며 데이터 권한을 완화하는 방법이 아니다.

## Dropdown은 선택지와 노출 경로를 함께 설계한다

Object set에서 도출한 선택지는 사용자가 읽을 수 있는 객체의 속성으로 제한된다. Object dropdown 필터는 표시뿐 아니라 실행 전 선택값 검증에도 사용된다. 여러 비교값은 OR이며 starting set과 Search Around로 관계 탐색을 구성할 수 있다. 표시 속성은 object type의 prominent property 설정을 따르고 읽지 못하는 값은 표시하지 않는다.

민감한 상수를 dropdown filter에 넣으면 객체를 읽지 못하는 Action Viewer도 network request의 object set 정의에서 그 상수를 알아낼 수 있다. 화면에 보이지 않는 것과 API metadata에 없는 것은 다르다. 가능하면 사용자 입력 parameter나 접근 검사를 받는 다른 object property로 조건을 구성한다.

## Struct와 Interface는 별도의 호환 계약이다

Struct property는 하나의 struct parameter로 모든 field를 완전 mapping한다. 각 field의 base type이 같아야 하며 field 추가/삭제/타입 변경 때 관련 Action도 바꾼다. Field constraint를 모두 통과해야 값이 유효하다. Default는 동일 object type의 동일 struct property field 전체에서 가져오며 static field default나 일반 속성을 개별 field로 연결하는 방식은 지원하지 않는다. 지원 field 타입은 Boolean, Date, Double, Geopoint, Integer, Long, String과 Timestamp다.

Interface rule은 공통 shared property와 delete, link 기능에 사용한다. Create는 실제 object type 선택 parameter와 해당 타입의 primary key mapping이 필요하다. Modify가 구현 타입의 primary key를 건드리면 제출이 실패한다. Interface link 생성 때 concrete 구현이 여러 개면 실패하지만 삭제는 concrete 구현 전체를 삭제하려고 시도한다. 1:N 링크의 foreign key 편집과 다른 rule의 같은 속성 쓰기가 충돌하지 않는지 확인한다.

Interface rule의 submission criteria는 모든 구현 타입에 같은 방식으로 적용된다. 타입별 제한이 필요하면 object type의 Interface action control에서 inherited action을 차단한다. 확인일 기준 Action log와 function 결합은 지원하지 않는다. Interface action constraint의 capability mapping과 실제 interface edit rule을 혼동하지 않는다. Invocation 지원 범위에 문서 간 차이가 있어 [[Palantir-Ontology-Evolution]]에서 개별 지원 문서를 함께 확인한다.

## Inline edit와 함수 batch는 일반 제출의 반복과 다르다

Object Explorer inline edit는 단일 타입의 객체 하나만 수정하고 기존 object property defaults를 사용해야 한다. Side-effect webhook/notification은 허용하지 않으며 visibility/override 설정은 무시한다. Workshop은 추가 설정 없이 여러 Action을 쓸 수 있지만 같은 객체 중복 쓰기, 동일 링크 생성과 aggregate 유지 로직은 inline edit에 맞지 않는다.

Inline edit는 객체별 조건을 기존 값으로 평가한 뒤 bulk 제출한다. 각 비행기 지연은 20분 이내여도 전체 공항 지연 합계 50분 조건은 여러 편집을 합치면 넘을 수 있다. 공유/연결 객체 기준 누적 조건을 정상적인 sequential Action과 같은 보장으로 취급하지 않는다. Scenario inline edit는 순서가 결정되지 않은 sequential 적용이므로 일부 충돌이 사라질 수 있지만 이 차이에 의존하지 않는다.

Function-backed batch는 기본적으로 요청마다 함수를 순차 호출하고 끝에 편집을 원자 적용한다. 한 번의 함수로 전체 요청을 계산하려면 단일 `list<struct>` 입력을 받고 batched execution을 켠다. 단일 요청도 원소 하나의 목록으로 전달된다. 이 구성도 전체 Action 편집 제한을 없애지는 않는다.

## Scale은 요청별 값과 전체 편집을 나눠 본다

| 제한 | 확인일 기준 최대 |
|---|---|
| Primitive list parameter | 10,000원소 |
| Object reference list | 1,000원소 |
| Submission criteria에 쓰는 list | 1,000원소 |
| 단일 제출이 편집하는 type/객체 | 50타입/10,000객체 |
| 객체별 edit 크기 | OSv1 32KB, OSv2 3MB |
| Batch call 수 | 10,000회 |
| Batched execution 없는 function-backed batch | 20회 |

Batch의 편집은 전체를 하나로 합쳐 제한을 검사하며 caller 앱이 더 낮은 제한을 둘 수 있다. Struct, media reference, vector와 time-series reference 등은 OSv2 지원과 배열 지원이 다르다. 특히 media reference 배열은 Action 미지원이며 vector 속성은 Double list parameter를 사용하지만 vector 배열은 지원하지 않는다. 실제 속성 계약은 scale reference 표를 확인한다.

Marketplace로 패키징할 때는 submission criteria의 개인 사용자 참조를 group으로 바꾼다. Workshop 앱부터 product에 추가한 뒤 dependencies로 Action을 포함하면 관련 자원을 함께 고르기 쉽다. Object View의 single/bulk 표시도 reference와 list parameter의 실제 타입에 따른다.

## 출처

- [Palantir, Getting started](https://www.palantir.com/docs/foundry/action-types/getting-started)
- [Palantir, Explore other action types](https://www.palantir.com/docs/foundry/action-types/explore-action-types)
- [Palantir, Rules](https://www.palantir.com/docs/foundry/action-types/rules)
- [Palantir, Parameters](https://www.palantir.com/docs/foundry/action-types/parameter-overview)
- [Palantir, Set parameter default value](https://www.palantir.com/docs/foundry/action-types/parameters-default-value)
- [Palantir, Overrides](https://www.palantir.com/docs/foundry/action-types/parameters-override)
- [Palantir, Configure sections](https://www.palantir.com/docs/foundry/action-types/configure-sections)
- [Palantir, Parameter performance considerations](https://www.palantir.com/docs/foundry/action-types/parameter-performance-considerations)
- [Palantir, Filter results of a parameter dropdown menu](https://www.palantir.com/docs/foundry/action-types/parameters-filter)
- [Palantir, Object dropdown security considerations](https://www.palantir.com/docs/foundry/action-types/dropdown-security)
- [Palantir, Actions on structs](https://www.palantir.com/docs/foundry/action-types/actions-on-structs)
- [Palantir, Actions on interfaces](https://www.palantir.com/docs/foundry/action-types/actions-on-interfaces)
- [Palantir, Inline edits](https://www.palantir.com/docs/foundry/action-types/inline-edits)
- [Palantir, Batched execution](https://www.palantir.com/docs/foundry/action-types/function-actions-batched-execution)
- [Palantir, Scale and property limits](https://www.palantir.com/docs/foundry/action-types/scale-property-limits)
- [Palantir, Add action types to Marketplace product](https://www.palantir.com/docs/foundry/action-types/marketplace-action-types)
- [Palantir, Use actions in the platform](https://www.palantir.com/docs/foundry/action-types/use-actions)

## 관련 문서

- [[Palantir-Actions-and-Functions|Action 실행과 인가]]
- [[Palantir-Workshop-Applications|화면 상태와 Action 연결]]
- [[Palantir-Ontology-Evolution|Interface 소비자 호환성]]
- [[Palantir-Action-Observability-and-Recovery|관측과 복구]]
