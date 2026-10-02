---
tags: [runtime, v8, cpp, modules, microtask, wasm]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 Module Evaluation", "V8 MicrotaskQueue"]
---

# V8 Script, Module과 microtask 실행

호스트가 소스를 실행하려면 컴파일, 의존성 해석, 실행과 Promise 진행을 연결해야 한다. V8을 호출한 C++ 함수가 반환한 시점과 JS 비동기 작업이 완료된 시점은 다르다. 기준은 V8 15.7.0 candidate API다.

## Script와 Context

컴파일된 `Script`는 생성된 context에 연결된다. 다른 context를 `Run()`에 넘겨 같은 script의 실행 환경을 임의로 다시 바인딩할 수 있다고 가정하지 않는다. Context에 아직 묶이지 않은 `UnboundScript`를 현재 context에 연결하는 API는 별도로 존재한다.

Compile과 Run은 각각 실패할 수 있다. `ScriptOrigin`의 이름, source offset과 source map URL은 진단용 metadata이며 소스의 신뢰성을 검증하지 않는다. 파일이나 URL의 접근 권한과 소스 제한은 호스트가 먼저 적용한다.

## Module의 상태 전이

1. Module source를 컴파일한다. 구문 오류와 compilation failure를 처리한다.
2. `InstantiateModule()`에서 specifier와 의존성 module을 연결한다.
3. `Evaluate()`의 빈 결과를 검사하고 반환된 Promise의 상태를 관찰한다.
4. 필요한 task와 microtask를 진행시킨 뒤 resolve 또는 reject를 처리한다.

평가 호출 자체의 성공만으로 module graph가 완료됐다고 판단하지 않는다. Top-level await가 있으면 반환 Promise가 pending일 수 있다. `IsGraphAsync()`는 인스턴스화한 의존성 그래프의 비동기 평가 여부이고 `HasTopLevelAwait()`는 해당 module 자체의 조건이다.

Namespace는 인스턴스화 이후의 상태 계약에 따라 얻는다. Unbound module script를 얻는 동작도 평가 전과 후의 허용 조건을 따른다. Module status를 건너뛴 순서로 API를 호출하지 않는다.

## Resolution과 import attributes

V8은 URL fetch, package resolution과 캐시 권한 정책을 대신 구현하지 않는다. Static import resolution, dynamic import callback과 `import.meta` 초기화를 호스트가 제공한다.

Module request의 import attributes에는 key, value와 source offset이 포함될 수 있다. 호스트가 지원하지 않는 attribute를 조용히 무시하지 않고 명세와 callback 계약에 맞는 오류로 처리한다. 같은 specifier라도 referrer, attribute와 호스트 정책을 고려해 module identity를 결정한다.

Synthetic module은 미리 선언한 고유 export 이름을 사용한다. 선언하지 않은 이름을 `SetSyntheticModuleExport()`로 추가하지 않는다. Module name은 진단 정보이며 그 자체가 resolution 정책은 아니다.

종료 시 pending top-level await가 남으면 `GetStalledTopLevelAwaitMessages()`의 module과 message 쌍으로 원인을 진단할 수 있다. 실험적 import-defer 평가 API의 동작은 일반 `Evaluate()`에 그대로 적용하지 않는다.

## Microtask queue의 소유권

사용자 정의 `MicrotaskQueue`는 연결한 모든 context가 없어지거나 분리될 때까지 살아 있어야 한다. 동기적으로 서로 접근하는 context가 queue를 공유해야 하는 조건도 고려한다.

- 자동 정책은 V8의 정해진 실행 경계에서 checkpoint를 수행한다.
- 명시적 정책은 호스트가 checkpoint를 호출할 시점을 정한다.
- Scoped 정책에서는 비원시적 V8 호출을 적절한 `MicrotasksScope`로 감싼다. 가장 바깥 `kRunMicrotasks` scope를 나갈 때 queue를 진행한다.

`kDoNotRunMicrotasks`는 해당 scope에서 실행을 억제한다는 선언이다. Scoped 정책과 별도의 강제 checkpoint를 섞어 호출 순서를 추정하지 않는다. Isolate의 policy 설정이 별도로 생성한 모든 queue의 정책을 일괄 변경하는 것도 아니다.

## Checkpoint와 WeakRef 유지

Isolate의 기본 queue에 대한 checkpoint는 microtask 처리와 kept object 정리를 연결한다. Custom queue를 직접 운영하면 `ClearKeptObjects()`를 동기 JS 실행의 중간이 아닌 적절한 checkpoint 경계에서 호출할 책임도 확인한다.

Microtask 실행 중의 예외가 호출자에게 일반적인 native API 예외처럼 전파된다고 가정하지 않는다. Rejection callback과 오류 보고 정책을 따로 연결한다. 완료 callback은 실행할 microtask가 0개인 checkpoint에서도 호출될 수 있고 자기 자신을 무한 재귀적으로 발생시키는 신호는 아니다.

`BeforeCallEntered`는 재진입마다 관찰될 수 있지만 call-completed callback은 가장 바깥 실행 경계를 뜻한다. 두 callback의 개수를 동일한 요청 수로 집계하지 않는다.

## Promise와 rejection

`Promise::Then()`과 `Catch()`의 native API는 일반 JS property lookup과 species 처리와 다른 직접 계약을 제공한다. Handler는 등록하는 native 호출 안에서 바로 실행되는 것으로 보지 않고 microtask 진행과 함께 다룬다.

Pending이 아닌 Promise에 대한 resolve/reject는 새 상태 전이를 만들지 않는다. `Result()`는 pending 상태에서 읽지 않는다. Rejection 통지 뒤 handler가 나중에 추가되는 경우도 있으므로 최초 unhandled 통지만으로 영구적인 미처리 상태를 확정하지 않는다.

`MarkAsHandled()`는 처리 상태에 관한 동작이고 `MarkAsSilent()`는 debugger pause와 관련된 별도 동작이다. 로깅과 디버깅 정책을 같은 flag로 취급하지 않는다.

## Wasm streaming의 종료 계약

Wasm streaming은 bytes를 전달한 뒤 `Finish()`로 입력 종료를 알린다. `Abort()` 뒤에 finish하지 않고, 이미 종료한 stream을 다시 abort하지 않는다. 빈 exception으로 abort하면 Promise를 reject하지 않는 계약이 있으므로 host의 취소 완료 처리를 별도로 설계한다.

Compiled bytes 사용을 미리 알리면 일반 streaming compilation을 건너뛸 수 있다. 이후 cache callback에서 전체 wire bytes와 맞는 compiled cache인지 확인한다. URL이 같다는 사실만으로 cache를 신뢰하지 않는다.

실험적 `WasmModuleCompilation`의 생성과 취소는 여러 스레드에서 가능해도 finish와 결과 callback에는 foreground 조건이 있다. 지원 여부와 thread 계약을 해당 빌드에서 확인한다. Wasm trap을 위한 큰 virtual address reservation을 곧바로 물리 메모리 사용량으로 해석하지 않는다.

## 출처

- [V8, Script](https://v8.github.io/api/head/classv8_1_1Script.html)
- [V8, Module](https://v8.github.io/api/head/classv8_1_1Module.html)
- [V8, MicrotaskQueue](https://v8.github.io/api/head/classv8_1_1MicrotaskQueue.html)
- [V8, MicrotasksScope](https://v8.github.io/api/head/classv8_1_1MicrotasksScope.html)
- [V8, Promise](https://v8.github.io/api/head/classv8_1_1Promise.html)
- [V8, Isolate](https://v8.github.io/api/head/classv8_1_1Isolate.html)
- [V8, WasmStreaming](https://v8.github.io/api/head/classv8_1_1WasmStreaming.html)

## 관련 문서

- [[V8-Cpp-API]]
- [[V8-Cpp-API-Lifecycle]]
- [[V8-Cpp-API-Serialization]]
- [[WebAssembly]]
