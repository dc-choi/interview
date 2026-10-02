---
tags: [nodejs, native-addon, memory, lifecycle]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
---

# 네이티브 애드온의 핸들과 수명

JavaScript 객체의 생존 기간, 네이티브 메모리의 소유권, Node 실행 환경의 생존 기간은 서로 다르다. 한쪽의 포인터가 남아 있다는 이유로 다른 쪽까지 살아 있다고 가정하면 use-after-free나 누수가 생긴다.

## 지역 핸들과 reference

Node-API 호출에서 받은 지역 값 핸들은 유효한 handle scope 안에서만 사용한다. `Napi::Function`을 C++ 멤버에 복사해 두는 것만으로 callback 반환 이후의 생존이 보장되지는 않는다.

| 수단 | 의미 |
|---|---|
| `Napi::Persistent(value)` | 참조 수 1의 강한 reference를 만든다. 명시적으로 해제할 때까지 GC의 회수를 막는다. |
| `Napi::Weak(value)` | 참조 수 0의 약한 reference를 만든다. 객체가 이미 수거되었는지 확인해야 한다. |
| `Ref()` / `Unref()` | reference의 강한 참조 수를 증감한다. 작업의 실제 소유권과 대응시킨다. |
| `Reset()` | reference가 보유한 연결을 해제한다. |

`ObjectReference`로 속성에 접근하고 `FunctionReference`로 함수를 호출할 수 있지만 해당 환경의 JavaScript 스레드에서 사용해야 한다. 약한 reference는 장기 비동기 콜백의 생존 보장이 아니다. 작업 중 콜백이 반드시 살아 있어야 한다면 그 기간에 필요한 강한 참조를 유지한다.

대량 반복에서 지역 핸들이 누적되지 않도록 짧은 handle scope를 사용할 수 있다. scope 밖으로 내보낼 값은 적절한 escape 또는 reference가 필요하다. 네이티브 메모리는 별도로 소유자를 정하고 해제한다.

## ObjectWrap과 자원 소유권

`Napi::ObjectWrap<T>`는 JavaScript 인스턴스에 대응하는 네이티브 상태를 캡슐화한다. 생성자에서 인자를 검증하고 메서드에서 인스턴스 상태를 사용하며 소멸 시 소유 자원을 해제한다.

비동기 작업이 객체를 사용한다면 JavaScript 객체의 수거와 작업 종료가 충돌하지 않아야 한다. 작업이 소유할 네이티브 입력을 복사하거나 완료 시점까지 필요한 객체를 유지한다. 강한 reference를 남긴 채 해제하지 않으면 GC가 정상 동작해도 객체는 사라지지 않는다.

## 환경별 상태

Node 메인 스레드와 각 Worker는 별도의 실행 환경을 갖는다. 한 환경에서 만든 `napi_env`, JavaScript 값이나 생성자 reference를 전역 변수에 넣고 다른 환경에서 재사용하지 않는다.

`napi_set_instance_data`와 `napi_get_instance_data`로 환경별 상태를 연결할 수 있다. finalizer는 환경 종료 시 상태를 정리한다. 일반 객체가 언제 수거되는지와 환경 전체의 종료를 혼동하지 않는다. 여러 구성 요소가 같은 instance data 슬롯을 사용한다면 소유권과 덮어쓰기 여부도 조정해야 한다.

순수 네이티브의 불변 데이터까지 전역 저장이 금지되는 것은 아니다. 공유 가변 데이터라면 동시성 제어와 환경별 종료 시점의 독립성을 별도로 보장한다.

## 종료 경로

정상 완료, 오류, 취소, Worker 종료를 각각 설계한다. 환경 cleanup hook은 환경 종료에 맞춘 자원 정리에 쓰고 객체 finalizer는 개별 객체 수명에 연결한다. 비동기 정리가 필요한 자원은 해당 API의 비동기 cleanup 계약을 따른다.

종료 시에는 네이티브 생산자를 멈추고, 진행 중인 작업과 큐의 데이터 소유권을 정리한 뒤 관련 자원을 해제한다. JavaScript 실행 환경이 사라진 뒤 일반 콜백을 호출하려 해서는 안 된다. finalizer 호출 순서가 모든 외부 의존성의 안전한 종료 순서를 대신한다고 가정하지 않는다.

## 오류 경계

C API의 `napi_status`를 확인하고 실패 후 성공한 것처럼 다음 API를 호출하지 않는다. C++ 예외를 JS 예외로 바꾸는 동작은 node-addon-api의 빌드 타깃에 달려 있다. 임의의 C++ 예외가 설정 없이 JS 경계를 안전하게 통과한다고 가정하지 않는다.

이미 JS 예외를 설정했다면 해당 실행 경로를 끝내야 한다. `assert`만으로 실패 처리를 구현하거나 부작용이 있는 API 호출을 `assert` 안에 넣으면 release 빌드에서 검사가 사라지는 문제가 생길 수 있다.

## 출처

- [Node.js, Node-API special topics](https://nodejs.org/learn/node-api/special-topics)
- [Node.js, Object and function references](https://nodejs.org/learn/node-api/special-topics/object-function-refs)
- [Node.js, Context awareness](https://nodejs.org/learn/node-api/special-topics/context-awareness)
- [Node.js, ObjectWrap](https://nodejs.org/learn/node-api/getting-started/objectwrap)
- [Node.js, Node-API](https://nodejs.org/api/n-api.html)
- [node-addon-api setup — Node.js](https://github.com/nodejs/node-addon-api/blob/main/doc/setup.md)

## 관련 문서

- [[Nodejs-Native-Addons]]
- [[Native-Addon-Async]]
- [[Buffer-Memory]]
- [[Worker-Threads]]
