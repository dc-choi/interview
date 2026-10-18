---
tags: [palantir, functions, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Functions의 권한 주체와 데이터 전파

작성자의 계정 권한, 저장소의 imports/권한, 게시 함수 실행자의 권한은 서로 다르다. Code Assist가 binding을 생성하고 객체를 로드하려면 Project에 필요한 entity와 datasource 또는 Restricted View를 import해야 한다.

게시 함수의 직접 실행은 원본 repository Viewer 권한을 요구한다. `ReadFunctionsPermissionDenied`는 이 권한을 확인한다. 반면 `FunctionRegistry:ReadOntologyFunctionPermissionDenied`는 Developer Console에 함수가 등록되어 있는지 먼저 확인해야 하는 경우다. 폴더 권한만 늘려 해결하려 하지 않는다.

Function-backed Action은 별도 경계다. 구성자는 함수를 읽을 수 있어야 하지만 최종 사용자는 함수에 직접 Viewer가 없어도 Action 권한/제출 조건으로 실행할 수 있다. 함수의 객체 조회는 실행 사용자에게 보이는 데이터로 제한된다.

Row/column controls는 읽을 때 필터링하며 출력값을 자동으로 계속 보호하는 것은 아니다. downstream 전파에는 Marking/CBAC 등 해당 통제 계약을 함께 적용한다. 함수가 만든 문자열이나 집계 결과도 민감한 데이터가 될 수 있다.

## 확장 권한과 Platform SDK

Extended execution은 게시 가능한 repository, 실행 가능한 function, Marketplace 설치 가능한 Project allowlist가 각각 필요하다. 실행 allowlist는 런타임에 확인한다. Action 내부 호출과 최대 4시간 TTL token은 이 통제 안에 있다.

Platform SDK의 함수 client에는 admin-read/functions-read/ontologies-read/orchestration-read, usage mediasets-read/ontologies-write 범위가 문서화되어 있다. 일반 dataset 직접 읽기인 `api:usage:datasets-read`는 지원하지 않아 배포 함수에서 실패할 수 있다. 사용자 context의 workspace preview가 성공해도 이 제한은 없어지지 않는다.

Python `foundry-platform-sdk`는 Python 3.9 이상이며 Python 3.14 지원은 SDK 1.93.0부터다. TypeScript v1에는 같은 first-class 인증을 전제하지 않고 v2/Python을 구분한다.

## 출처

- [Palantir, permissions](https://www.palantir.com/docs/foundry/functions/permissions)
- [Palantir, functions-settings](https://www.palantir.com/docs/foundry/functions/functions-settings)
- [Palantir, platform-sdk](https://www.palantir.com/docs/foundry/functions/platform-sdk)

## 관련 문서

- [[Palantir-Functions]]

공식 문서를 대조한 내용이며 실제 Foundry 환경에서 실행 검증하지 않았다.
