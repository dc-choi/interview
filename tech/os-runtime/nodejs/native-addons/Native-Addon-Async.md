---
tags: [nodejs, native-addon, async, thread]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
---

# 네이티브 애드온의 비동기 처리

무거운 네이티브 작업도 JavaScript 스레드에서 동기로 실행하면 이벤트 루프를 막는다. 실행 위치, 결과 전달, 취소와 종료를 함께 설계해야 한다.

## AsyncWorker

`Napi::AsyncWorker`는 유한한 작업을 libuv 스레드풀에 제출하고 완료 결과를 원래 환경의 JavaScript 스레드로 돌려준다.

1. JavaScript 스레드에서 입력을 검증하고 작업이 소유할 네이티브 데이터로 준비한다.
2. worker를 생성한 뒤 `Queue()`로 실행을 요청한다.
3. `Execute()`는 스레드풀에서 연산한다. JavaScript 값 생성이나 호출처럼 `Env`에 의존하는 일반 Node-API 작업을 수행하지 않는다.
4. 성공은 `OnOK()`, 실패는 `SetError()`와 `OnError()` 경로에서 처리한다. JS 값 변환과 콜백 호출은 이 단계에서 한다.
5. 기본 수명 관리로 완료 후 worker를 정리한다. 별도 소유권 설정을 쓰면 해제 책임도 직접 관리한다.

`OnOK()`에서 error-first 콜백을 사용하려면 성공 인자로 `null`과 결과를 직접 구성한다. 기본 성공 콜백에 원하는 결과가 자동으로 붙는다고 가정하지 않는다.

`Cancel()`은 아직 시작하지 않은 큐의 작업만 취소할 수 있다. 이미 실행 중이면 강제 중단하지 못한다. 취소에 성공하면 `OnOK()`와 `OnError()`가 호출되지 않으므로 정리를 이 두 콜백에만 의존시키지 않는다. 실행 중 중단이 필요하면 안전한 지점에서 확인하는 협력적 취소와 별도 결과 계약을 설계한다.

풀을 공유하는 파일 I/O나 다른 네이티브 작업과의 경쟁도 측정한다. CPU 작업을 무제한 제출하면 이벤트 루프가 비어 있어도 큐 대기로 응답이 늦어질 수 있다.

## Thread-safe function

장시간 동작하는 네이티브 스레드가 JavaScript에 이벤트를 보내야 할 때 thread-safe function(TSFN)을 사용한다. 생산자는 데이터를 큐에 넣고 해당 환경의 JavaScript 스레드가 콜백을 실행한다. 다른 스레드에서 JS 함수를 직접 호출하는 API가 아니다.

생성 시 JS 콜백, 진단용 이름, 큐 크기, 초기 사용자 스레드 수, context와 finalizer를 지정한다. JS 객체 대신 소유권이 명확한 네이티브 payload를 전달하고 소비 또는 폐기 경로에서 해제한다.

- `NonBlockingCall()`은 큐가 가득 차면 실패 상태를 반환한다. 재시도, 버리기, 생산 속도 제한 중 정책을 정한다.
- `BlockingCall()`은 제한된 큐에 공간이 날 때까지 기다릴 수 있다. 큐를 비워야 하는 JavaScript 스레드에서 대기하면 교착 위험이 있다.
- 큐 크기 0은 무제한 큐다. 생산량이 처리량을 넘으면 메모리 사용이 커진다.
- `Acquire()`와 `Release()`는 TSFN을 사용하는 스레드 수를 관리한다. `Ref()`와 `Unref()`는 이벤트 루프의 종료 가능성을 조정하는 별개 기능이다.

## 닫힘과 데이터 정리

`Abort()` 이후 호출은 닫힘 상태를 받을 수 있다. `napi_closing`을 받은 스레드는 TSFN을 다시 사용하지 않으며 추가 `Release()`도 호출하지 않는다. 정상 사용을 마친 스레드는 자신이 획득한 사용 권한에 대응해 release한다.

종료 과정에서는 JS 콜백을 실행할 수 없는 상태로 남은 payload를 정리해야 할 수도 있다. 생산자 중단, 큐 소유권, finalizer와 네이티브 스레드 합류를 함께 설계한다. 완료 콜백 하나만 기다리는 종료 코드는 Worker가 먼저 종료될 때 안전하지 않을 수 있다.

## 선택과 확인

유한한 한 작업의 결과 반환은 AsyncWorker로 시작한다. 독립 네이티브 스레드가 지속적으로 이벤트를 생성하는 경우 TSFN이 맞는다. 어느 쪽도 입력 검증, 큐 제한과 자원 소유권을 대신하지 않는다.

성공뿐 아니라 큐 포화, 처리 오류, 시작 전 취소, 실행 중 종료, 여러 Worker의 동시 로드를 확인한다. 취소 요청을 실행 완료와 같은 의미로 처리하지 않는다.

## 출처

- [Node.js, AsyncWorker](https://nodejs.org/learn/node-api/special-topics/asyncworker)
- [Node.js, Thread-safe functions](https://nodejs.org/learn/node-api/special-topics/thread-safe-functions)
- [node-addon-api AsyncWorker — Node.js](https://github.com/nodejs/node-addon-api/blob/main/doc/async_worker.md)
- [Node.js, Asynchronous thread-safe function calls](https://nodejs.org/api/n-api.html#asynchronous-thread-safe-function-calls)

## 관련 문서

- [[Nodejs-Native-Addons]]
- [[Native-Addon-Lifetime]]
- [[libuv-Threading]]
- [[Worker-Threads]]
