---
tags: [palantir, ontology, action, function, authorization, transaction]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir Actions and Functions", "팔란티어 액션과 함수"]
---

# Palantir Actions와 Functions: 조회에서 업무 변경으로

업무 객체를 읽는 기능과 상태를 바꾸는 기능은 다른 계약을 가진다. Foundry의 Action type은 객체, 속성과 링크를 어떻게 바꿀지 정의하고, Action은 그 정의를 적용하는 실행이다. Function은 서버의 격리된 환경에서 조회, 계산이나 편집 로직을 수행한다. 함수가 존재한다는 사실만으로 데이터 변경 권한이 부여되지는 않는다. [Action types](https://www.palantir.com/docs/foundry/action-types/overview), [Functions](https://www.palantir.com/docs/foundry/functions/overview)

이 문서는 Palantir 제품의 실행 계약을 다룬다. 일반 온톨로지의 정의나 OWL 추론 규칙과 구별하며, 기초 개념은 [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]에 둔다. 공식 문서를 대조했으며 Foundry 환경에서 실행하거나 부하, 권한과 장애를 시험하지 않았다.

## 조회, 계산과 변경의 경계

| 요소 | 역할 | 확인할 계약 |
|---|---|---|
| Query function | API gateway로 노출할 수 있는 읽기 전용 함수 | Ontology 변경과 외부 시스템 변경을 포함하는 부수효과 금지 |
| 일반 Function | 객체 조회, 관계 탐색, 계산, 외부 데이터 활용 등의 로직 | 언어와 실행 환경별 지원 범위 |
| Ontology edit function | 객체와 링크의 변경 내역 계산 | 편집 결과와 provenance 선언 방식 |
| Action type | 파라미터, 변경 규칙, 제출 조건과 부수효과 정의 | 업무 변경을 허용하는 조건과 영향 범위 |
| Function-backed Action | 단순 rule로 부족한 변경을 함수로 계산 | Action 제한과 Function 실행 제한 모두 적용 |

Query의 읽기 전용 계약은 일반 함수 전체의 계약이 아니다. 외부 상태를 바꾸는 기능이 필요한 API는 Action으로 제공한다. 여러 연결 객체의 상태를 함께 바꾸거나 계산 결과로 편집할 때 Function-backed Action을 쓸 수 있다. [Queries](https://www.palantir.com/docs/foundry/functions/query-functions), [Function-backed actions](https://www.palantir.com/docs/foundry/action-types/function-actions-overview)

## 하나의 업무 명령으로 모델링한다

예를 들어 주문 배정을 `orderId`, `riderId`와 함께 제출하는 명령으로 정의한다. 여러 화면이나 에이전트가 같은 Action을 호출하면 배정 로직과 조건을 공유할 수 있다. 이는 예시 설계이며 Palantir가 배송 업무의 모든 불변조건을 자동으로 알아내는 기능이라는 뜻은 아니다.

1. 파라미터로 필요한 입력과 대상 객체를 정한다.
2. rule 또는 함수로 객체와 링크의 변경을 계산한다.
3. submission criteria로 실행 주체와 대상 상태의 조합을 검사한다.
4. 필요할 때 notification이나 webhook을 연결한다.
5. 변경 반영과 외부 효과를 각각 관측한다.

Action type은 한 번에 수행할 변경과 부수효과를 함께 정의한다. 같은 정의를 애플리케이션들이 공유할 수 있다는 점이 재사용의 단위다. [Action types](https://www.palantir.com/docs/foundry/action-types/overview)

## 권한은 네 가지 질문으로 나눈다

- **정의 편집:** 누가 Action type을 조회하거나 수정할 수 있는가?
- **실행 인가:** 제출자가 submission criteria를 충족하는가?
- **데이터 접근:** 변경 대상 타입과 데이터에 필요한 접근 권한이 있는가?
- **결과 보호:** 입력에서 읽은 민감 정보가 출력과 로그에서도 적절히 보호되는가?

Submission criteria는 사용자 ID, 그룹, 파라미터, 객체 상태와 실행 문맥을 조합한다. Action type 편집 권한과 독립이며, 같은 객체를 바꾸는 두 Action도 서로 다른 조건을 가질 수 있다. 그룹, marking이나 조직 소속을 `NOT`으로 검사하면 scoped token에서 속성이 빠진 것을 허용으로 오해할 수 있으므로 이런 구성을 피한다. [Submission criteria](https://www.palantir.com/docs/foundry/action-types/submission-criteria)

편집을 Action으로만 허용하는 객체는 제출자가 읽을 수 있는 객체를 Action 조건에 따라 편집할 수 있다. 다른 편집 경로까지 열면 writeback dataset의 Edit 권한이나 Restricted View 편집 정책 같은 추가 조건이 필요하다. 이 설정은 사용자에게 불필요한 writeback 데이터까지 노출할 수 있다. Action log 객체를 생성한다면 그 객체에 필요한 권한도 확인한다. [Action permissions](https://www.palantir.com/docs/foundry/action-types/permissions)

### 입력 보호와 출력 보호를 구별한다

행과 열 수준 보안은 실행 중 읽을 수 있는 데이터를 제한하지만 Action의 쓰기 결과까지 자동으로 보호하는 계약은 아니다. Marking과 CBAC 등 downstream 보호를 별도로 설계한다. [Action permissions](https://www.palantir.com/docs/foundry/action-types/permissions)

Read/write authorizations는 기존 사용자 권한과 제출 조건에 **추가되는 경계**다. Read authorization은 읽거나 입력받을 marked data의 상한, write authorization은 결과가 만족할 최소 보안을 정하며 권한을 새로 부여하지 않는다. Write authorization이 marking을 자동 부착하지도 않는다. Action log와 edit history 같은 플랫폼 관리 쓰기는 write authorization 적용에서 제외된다. 확인일 기준 beta이므로 enrollment별 가용성을 확인한다. [Read and write authorizations](https://www.palantir.com/docs/foundry/action-types/read-write-authorizations)

이 경계는 선택 설정이다. Marking을 설정하지 않으면 추가 읽기 상한이나 출력 보안 하한을 강제하지 않는다. Action 로직은 입력보다 낮은 보안의 출력을 만들 수 있다. Read/write 경계가 다르면 저장/발행자의 declassification 권한을 검사하며 실행 때 반복하지 않는다. 특히 read authorization이 없으면 그 검사 자체를 하지 않아, 사용자가 읽은 marked data를 더 낮은 보안으로 쓰는 유출 위험이 있다. Marked data를 읽을 수 있는 Action은 read authorization과 출력 경계를 함께 구성해야 한다.

## 트랜잭션 범위와 동시성을 분리한다

다음은 확인일의 [Consistency and isolation](https://www.palantir.com/docs/foundry/action-types/consistency-guarantees)에 명시된 조건이다.

- 원자성은 Action의 Ontology 편집 묶음에 적용된다. Notification, webhook과 함수의 외부 호출은 포함하지 않는다.
- 기본 batched writes에서는 같은 실행의 후속 조회가 자신이 모은 편집을 보지 못한다. Staged writes는 이를 보지만 현재 legacy isolation만 지원한다.
- 새 batched Action의 기본은 snapshot isolation이다. 충돌 검사는 쓴 객체 단위이며 다른 속성을 바꿔도 충돌할 수 있다.
- 읽기만 한 객체는 충돌 검사에 포함되지 않아 write skew가 가능하다. 여러 객체에 걸친 불변조건은 공유 객체 쓰기로 표현하는 등의 재설계가 필요하다.
- Read committed는 문서에 출시 예정으로 표시되어 현재 사용 가능하다고 전제하지 않는다.
- 자동 재시도는 설정에 따라 외부 호출을 반복할 수 있다. 재실행 안전성을 확인해야 한다.

Transient retry는 처음부터 다시 실행하며 최대 5회 시도한다. 기본값은 외부 호출 없는 Action만 재시도하고, All actions는 외부 호출까지 반복하며 Disabled는 첫 오류를 caller에 돌려준다. Backing dataset rebuild는 실제 대상 객체 값이 안 바뀌어도 더 넓은 충돌을 만들 수 있다. Snapshot의 일관 시점은 Action이 직접 수행한 Ontology read의 계약이며 source가 수행하는 별도 읽기/외부 작업에는 확장되지 않는다. [Consistency and isolation](https://www.palantir.com/docs/foundry/action-types/consistency-guarantees)

설계 적용 예로, 동시에 두 주문을 배정하면서 같은 라이더의 수용량을 각각 검사하고 서로 다른 주문만 바꾸면 그 검사만으로 총량을 지킨다고 볼 수 없다. 공통 용량 상태에 대한 충돌과 재시도 경계를 검토한다. 이는 앞의 동시성 조건에서 도출한 예시이며 해당 업무를 실험한 결과가 아니다.

### 외부 효과는 별도의 실패 경계다

Notification은 사용자 알림, webhook은 REST API나 ERP 등 외부 시스템 연결에 사용한다. 원천 정본이 외부 시스템에 있는 업무에도 연결할 수 있다. [Side effects](https://www.palantir.com/docs/foundry/action-types/side-effects-overview)

설계 시에는 Ontology 반영 결과와 외부 처리 결과를 별도로 확인한다. 재시도, 외부 요청 식별자, 중복 실행 처리와 보상 동작은 업무에 맞게 검토한다. 이 목록은 통합 설계 점검이며 Palantir가 모든 외부 시스템에 exactly-once나 분산 원자성을 제공한다는 설명이 아니다.

## 함수 개발과 배포의 계약

### 언어를 고르기 전에 기능을 확인한다

TypeScript v1, TypeScript v2와 Python을 같은 런타임으로 취급하지 않는다. 확인일 기준 TypeScript v2와 Python은 OSDK와 전용 리소스 기반 deployed execution을 지원하고, v1은 지원 구성이 다르다. Pipeline Builder에서 호출하는 함수와 Ontology interface 지원도 언어별로 다르다. 사용하려는 기능을 지원 표에서 확인한 뒤 언어와 실행 방식을 정한다. [Feature support by language](https://www.palantir.com/docs/foundry/functions/language-feature-support)

편집 결과를 선언하는 API도 다르다. v1은 `@OntologyEditFunction`과 `@Edits`, v2는 `createEditBatch`와 `Edits` 타입, Python은 edits container와 `@function`의 `edits` 선언을 사용한다. 링크 변경 역시 편집이며 관계의 저장 방식에 맞게 provenance를 선언한다. [Ontology edits](https://www.palantir.com/docs/foundry/functions/edits-overview)

### 작성 권한과 실행 권한은 다르다

개발자의 개인 권한과 함수 저장소 권한은 별개다. 바인딩 생성과 live preview에 필요한 Ontology 타입, 링크와 원천 데이터를 Project에 가져와야 한다. Import 변경은 저장소 하나가 아니라 같은 Project의 다른 저장소에도 영향을 줄 수 있다.

일반 published function 실행에는 저장소 Viewer 권한이 필요하지만 Function-backed Action의 최종 사용자가 함수 읽기 권한까지 가져야 하는 것은 아니다. 함수가 읽는 객체는 실행 사용자 권한에 따라 달라진다. 함수 출력에 대한 보안 전파는 별도로 검토한다. [Function permissions](https://www.palantir.com/docs/foundry/functions/permissions)

### 버전 번호와 API 이름의 계약은 다르다

일반 함수 release는 생성 후 불변인 버전과 Semantic Versioning을 사용한다. 필수 인자 추가나 출력 타입 변경은 호출부를 깨뜨릴 수 있다. 내장 호환성 검사는 내부 구현의 의미 변경까지 모두 감지하지 못하므로 통과만으로 호환성을 확정하지 않는다. 버전 범위를 참조하는 운영 소비자는 새 stable release를 즉시 사용할 수 있다. [Function versioning](https://www.palantir.com/docs/foundry/functions/functions-versioning)

Function-backed Action은 선택한 고정 버전을 기본으로 유지하고 auto upgrade를 켜야 호환 version range를 실행 시 해석한다. `0.y.z`에는 auto upgrade가 없다. Function 편집 권한은 Action 편집 권한과 독립이므로 auto upgrade는 Action을 못 고치는 개발자에게도 동작 변경 경로를 줄 수 있다. 편집 provenance는 최소 선택 버전 기준이어서 새 release가 다른 object type을 편집하면 실패한다. [Function-backed actions: Getting started](https://www.palantir.com/docs/foundry/action-types/function-actions-getting-started)

반면 **API 이름으로 노출한 query는 최신 tagged version을 사용**하며 일반 함수의 버전 선택과 다르다. `apiName` 변경이나 제거는 소비자를 깨뜨린다. 병행 전환이 필요하면 별도의 API 이름을 가진 query로 유지한다. [Queries](https://www.palantir.com/docs/foundry/functions/query-functions)

## 검증할 때 실제로 실행되는 것을 확인한다

Ontology Manager의 Test run은 현재 branch와 실행자 권한으로 조건을 평가하고 예상 객체, 링크 편집을 보여 준다. Ontology에는 그 편집을 반영하지 않는다. 그러나 이를 외부 부수효과까지 없는 모의 실행으로 해석하면 안 된다.

| Test run 대상 | 동작 |
|---|---|
| Ontology edits | 예상 변경을 계산하고 보여 주며 반영하지 않음 |
| Side-effect webhook, notification, schedule build | 호출, 발송이나 trigger 생략 |
| 결과 계산에 필요한 함수, writeback webhook과 외부 리소스 호출 | 실행될 수 있으며 외부 시스템에 영향 가능, 사전 확인 UI 제공 |

따라서 테스트 계정의 권한과 외부 시스템의 테스트 대상을 함께 확인한다. 저장하지 않은 Action 수정은 Test run 대상이 되지 않는다. [Test run](https://www.palantir.com/docs/foundry/action-types/test-run)

설계 검증에서는 정상 편집 외에 권한 거부, 제출 조건 실패, 동시 요청, 재시도 중 외부 중복 효과를 분리해 확인한다. 공식 문서 검토만 수행한 이 기록은 이런 실행 시험의 통과 기록이 아니다.

## 출처

- [Palantir, Action types overview](https://www.palantir.com/docs/foundry/action-types/overview)
- [Palantir, Functions overview](https://www.palantir.com/docs/foundry/functions/overview)
- [Palantir, Submission criteria](https://www.palantir.com/docs/foundry/action-types/submission-criteria)
- [Palantir, Action permissions](https://www.palantir.com/docs/foundry/action-types/permissions)
- [Palantir, Read and write authorizations](https://www.palantir.com/docs/foundry/action-types/read-write-authorizations)
- [Palantir, Consistency and isolation](https://www.palantir.com/docs/foundry/action-types/consistency-guarantees)
- [Palantir, Function-backed actions](https://www.palantir.com/docs/foundry/action-types/function-actions-overview)
- [Palantir, Function-backed actions: Getting started](https://www.palantir.com/docs/foundry/action-types/function-actions-getting-started)
- [Palantir, Side effects](https://www.palantir.com/docs/foundry/action-types/side-effects-overview)
- [Palantir, Test run](https://www.palantir.com/docs/foundry/action-types/test-run)
- [Palantir, Feature support by language](https://www.palantir.com/docs/foundry/functions/language-feature-support)
- [Palantir, Ontology edits](https://www.palantir.com/docs/foundry/functions/edits-overview)
- [Palantir, Function permissions](https://www.palantir.com/docs/foundry/functions/permissions)
- [Palantir, Function versioning](https://www.palantir.com/docs/foundry/functions/functions-versioning)
- [Palantir, Publish and call query functions through API gateway](https://www.palantir.com/docs/foundry/functions/query-functions)

## 관련 문서

- [[Palantir-Ontology-Scenarios|대안 편집과 실제 반영]]
- [[Palantir-Foundry-Actions|규칙, 입력, 외부 효과와 복구]]
- [[Palantir-AIP-Logic-and-Evaluation|모델이 참여하는 실행과 평가]]

- [[Ontology-Knowledge-Graph|온톨로지와 지식 그래프]]
- [[Palantir-SDK-and-Agent-Tools|OSDK와 에이전트 도구 연결]]
- [[Agent-Ready-API-Design|에이전트 친화 API 설계]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
