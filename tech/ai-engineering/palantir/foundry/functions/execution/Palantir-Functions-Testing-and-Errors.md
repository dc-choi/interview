---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Functions의 테스트, 오류와 관측 경계

## 단위 테스트가 증명하는 범위

v1은 Jest와 functions-testing-lib로 stub object, object-set query와 aggregation 결과를 구성한다. 구체 object를 search constructor에 넣는 mock에는 RID가 필요하다. whenObjectSet의 고정 응답은 실제 색인, 권한과 검색 의미를 검증하지 않는다.

`verifyOntologyEditFunction`의 단수/복수 메서드는 각각 값/배열을 받는다. 생성된 객체를 링크하는 검증은 collected edits callback으로 참조한다. `hasNoMoreEdits()`는 마지막에 놓고 ignoreExtra 옵션을 켜면 해당 종류의 불필요한 편집을 탐지하지 못한다. 비동기 edit 검증은 await한다.

UUID, Timestamp.now와 LocalDate.now는 spy 또는 주입한 supplier로 결정적으로 만든다. v2의 node:crypto/사용 중인 UUID library는 해당 API를 mock한다. User mock은 id/username, Group mock은 id가 필수다.

## 오류 계약

UserFacingError는 사용자가 해결할 수 있는 메시지를 Workshop/Action/export toast로 전달한다. 내부 비밀이나 민감한 입력을 그대로 포함하지 않는다. v1 FunctionsResult는 업무 오류 외에 CPU/wall timeout, memory와 runtime 오류도 포함한다. isOk/isErr 뒤에 구체 이름과 미지 오류를 처리한다.

공식 예제에도 변수 이름 불일치, Promise 오타, async 반환 타입과 package import 오타가 있으므로 복사한 코드 자체를 검증된 프로그램으로 보지 않는다. 타입 체크와 실제 소비자 실행을 통과한 예제를 따로 관리한다.

## 관측

Function metrics는 30일 창의 사용량, 실패율과 P95 등을 보여주며 실행 이력 보존 기간 7일과 다르다. user-facing/non-user-facing 실패를 나눠 본다. Workflow Lineage와 소비자별 실행 기록을 함께 확인한다.

v2/Python은 custom OpenTelemetry span과 외부 호출 관측을 제공한다. v1의 제품 span 지원과 같은 수준으로 일반화하지 않는다. 제공된 global provider를 사용하고 credentials, 전체 응답과 민감한 입력을 로그에 남기지 않는다. metrics 제공 범위와 custom span 지원 범위도 다르다. debugger의 breakpoint/step 실행과 preview 성공은 운영 트랜잭션이나 권한의 증거가 아니다.

## 출처

- [Palantir, debug](https://www.palantir.com/docs/foundry/functions/debug)
- [Palantir, unit-test-debugging](https://www.palantir.com/docs/foundry/functions/unit-test-debugging)
- [Palantir, unit-test-getting-started](https://www.palantir.com/docs/foundry/functions/unit-test-getting-started)
- [Palantir, unit-test-stub-objects](https://www.palantir.com/docs/foundry/functions/unit-test-stub-objects)
- [Palantir, unit-test-object-searches](https://www.palantir.com/docs/foundry/functions/unit-test-object-searches)
- [Palantir, unit-test-ontology-edits](https://www.palantir.com/docs/foundry/functions/unit-test-ontology-edits)
- [Palantir, unit-test-dates-timestamps](https://www.palantir.com/docs/foundry/functions/unit-test-dates-timestamps)
- [Palantir, unit-test-users-groups](https://www.palantir.com/docs/foundry/functions/unit-test-users-groups)
- [Palantir, typescript-error-types](https://www.palantir.com/docs/foundry/functions/typescript-error-types)
- [Palantir, user-facing-error](https://www.palantir.com/docs/foundry/functions/user-facing-error)
- [Palantir, function-metrics](https://www.palantir.com/docs/foundry/functions/function-metrics)
- [Palantir, instrumentation-telemetry](https://www.palantir.com/docs/foundry/functions/instrumentation-telemetry)
- [Palantir, monitoring](https://www.palantir.com/docs/foundry/functions/monitoring)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
