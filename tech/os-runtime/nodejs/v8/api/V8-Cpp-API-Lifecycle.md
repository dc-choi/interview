---
tags: [runtime, v8, cpp, embedding, concurrency]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 Isolate Lifecycle", "V8 Platform Tasks"]
---

# V8 초기화, Isolate와 플랫폼 작업

V8의 실행 수명은 프로세스 단위 초기화, isolate, context, handle scope로 나뉜다. 이 단위의 생성과 파괴 순서가 어긋나면 JS 예외가 아니라 native 메모리 오류나 프로세스 종료가 발생할 수 있다. 기준은 V8 15.7.0 candidate의 공개 헤더이며, 빌드와 배포 버전마다 계약을 확인한다.

## 초기화와 종료의 순서

1. 빌드에서 필요한 ICU와 startup 데이터를 준비하고 platform을 초기화한다.
2. `V8::Initialize()` 뒤에 allocator 등 `Isolate::CreateParams`를 준비한다.
3. `Isolate::New()`로 isolate를 만들고 `Isolate::Scope`, `HandleScope`, `Context::Scope`로 실행 범위를 설정한다.
4. 실행을 중단하고 남은 작업과 native 참조를 정리한다. 어느 스레드도 진입해 있지 않을 때 isolate를 `Dispose()`한다.
5. 모든 isolate 사용을 끝낸 뒤 `V8::Dispose()`와 platform 종료를 수행한다.

`Isolate::New()` 자체가 isolate에 진입하는 것은 아니다. 분리된 `Allocate()`와 `Initialize()`를 사용할 때는 초기화 전 허용된 `GetData()`, `SetData()`, `GetGroup()`만 호출한다. 대응하는 분리 종료는 `Deinitialize()`와 `Free()`다. 일반 C++ `new`/`delete`로 대체하지 않는다.

`V8::Dispose()`는 영구 종료다. 같은 프로세스에서 엔진을 다시 초기화하는 재시작 API로 쓰지 않는다. External startup data는 필요한 빌드에서만 로드하며, V8이 사용을 마칠 때까지 backing bytes를 유지한다. 잘못된 startup 데이터는 복구 가능한 JS 예외가 아닐 수 있다.

## Isolate와 Context의 경계

Isolate는 VM 상태와 힙을 갖는다. 서로 다른 isolate 사이로 `Local<Value>`를 넘기지 않는다. 같은 isolate의 여러 context는 서로 다른 global 환경과 built-in을 제공하지만 OS 권한이나 주소 공간을 격리하지 않는다.

`Context::Enter()`와 `Exit()`는 이전 context를 복원하는 스택으로 대응시킨다. RAII scope가 이 대응을 명확하게 만든다. Global은 proxy를 통해 노출되므로 prototype을 임의로 바꾸지 않는다. Global을 재사용할 때도 원래 template 등 생성 계약을 유지해야 한다.

`IsolateGroup`은 압축 포인터 cage와 sandbox 자원을 묶는 단위다. 포인터 압축 구성에서 그룹의 객체 주소 공간 제약과 ArrayBuffer 같은 외부 메모리는 별개다. `CanCreateNewGroups()`가 거짓인 환경에서 새 그룹을 만들면 중단될 수 있다. 그룹을 나눠도 임의의 JS 객체 공유가 허용되는 것은 아니다.

## 스레드 진입과 실행 중단

한 isolate는 한 번에 한 스레드가 사용한다. 스레드가 번갈아 접근한다면 `Locker`로 소유권을 보호한다. `Locker`는 재귀적으로 사용할 수 있지만 `Unlocker`는 재귀적이지 않으며 이미 잡은 lock을 전제로 한다.

잠시 lock을 내놓는 동안에는 isolate에서 나와야 한다. 그동안 handle이나 객체 주소를 사용하지 않고, lock을 다시 얻은 다음 isolate에 재진입한다. 스레드별 stack limit을 설정하는 작업도 해당 isolate의 lock 아래에서 수행한다.

- `RequestInterrupt()`는 다른 스레드에서 요청할 수 있다. Interrupt callback은 isolate로 재진입하지 않는다.
- `TerminateExecution()`은 다른 스레드에서도 실행을 중단하도록 요청할 수 있다. 일반 JS `try/catch`로 처리하는 예외와 다르다.
- `CancelTerminateExecution()`은 이후 실행을 다시 허용하는 동작이다. 중단된 native 작업의 일관성까지 복원하지 않는다.

CPU 시간 제한을 구현할 때는 중단 요청, native callback의 협조, 남은 작업 정리와 재사용 가능 여부를 함께 설계한다.

## Foreground task와 microtask는 다르다

Platform은 작업 실행기, 시간, 메모리 할당과 tracing 기능을 공급한다. Foreground task runner는 isolate의 실행 스레드에서 작업을 순차 실행한다. 작업을 다른 스레드에서 게시할 수 있어도 callback이 어디서 실행되는지는 runner의 계약을 따른다.

JS를 실행하는 작업은 중첩 메시지 루프에서 다시 실행되지 않도록 non-nestable task 조건을 지킨다. Isolate가 파괴된 뒤 게시한 작업은 실행되지 않을 수 있다. Idle task는 기회가 없으면 계속 지연될 수 있으므로 필수 정리를 맡기지 않는다. 작업 전달 시 `unique_ptr`로 소유권도 전달한다.

Promise microtask는 별도의 queue와 checkpoint 정책이다. Foreground task 하나를 실행했다고 모든 microtask가 자동으로 처리된다고 가정하지 않는다. 자세한 정책은 [[V8-Cpp-API-Execution]]에서 다룬다.

Default platform의 `PumpMessageLoop()`는 올바른 isolate 스레드에서 호출한다. 기본 non-wait 모드는 pending task가 없으면 기다리지 않는다. Idle task를 활성화했다면 `RunIdleTasks()`로 처리할 책임도 있다. Platform을 유지하면서 isolate만 종료할 때는 해당 isolate의 `NotifyIsolateShutdown()` 계약을 지킨다.

`NewDefaultPlatform()`의 thread pool size 0은 기본 worker 수 선택이다. Worker를 없애는 `NewSingleThreadedDefaultPlatform()`은 `--single-threaded` flag와 함께 사용한다. Thread pool을 만들었다고 한 isolate의 JS를 여러 스레드에서 동시에 실행할 수 있는 것은 아니다.

## 병렬 Job의 진행과 교착 방지

`JobTask::Run()`은 주기적으로 `ShouldYield()`를 확인하고 참이면 작업을 양보한다. `GetMaxConcurrency()`는 진행 중인 작업까지 포함한 남은 병렬 작업량을 반영한다. 이 callback에서 job handle로 다시 호출하지 않는다.

`Join()`은 호출한 스레드도 작업에 참여시킨다. 완료를 판단한 뒤 작업량을 다시 늘리는 구조는 종료 계약과 맞지 않는다. `Cancel()`은 작업자가 양보할 때까지 기다릴 수 있다. 따라서 작업자나 `GetMaxConcurrency()`가 획득할 lock을 잡은 채 `Join()` 또는 취소를 호출하면 교착할 수 있다.

작업자 ID는 동시에 활동하는 작업자를 구별하며 나중에 재사용될 수 있다. 영구적인 OS thread ID로 보관하지 않는다. Platform의 worker 수가 0이라는 보고만으로 background 작업 게시가 금지됐다고 해석하지 않는다.

## 시간과 메모리 단위

| 값 | 해석 |
|---|---|
| `MonotonicallyIncreasingTime()` | 단조 증가하는 초 단위 시간 |
| `CurrentClockTimeMilliseconds()` | epoch 기준 밀리초 시각 |
| Task delay와 idle deadline | API가 정한 초 단위 시간 |
| CPU profile timestamp | 마이크로초, 해당 profiler의 시간 기준 |
| `_in_bytes`가 붙은 resource constraint | 바이트 단위 힙 한도 |

서로 다른 clock이나 단위를 빼서 지연 시간으로 쓰지 않는다. Heap limit은 프로세스 RSS 한도가 아니다. 외부 버퍼, native allocation과 virtual address reservation이 별도로 존재한다. 힙 한도를 높여 달라는 callback도 OS 메모리를 확보해 주지 않는다.

Page allocator의 할당 granularity와 commit granularity는 다를 수 있다. `Decommit`은 주소 예약을 유지하면서 접근 권한과 물리 메모리 상태를 바꾸고, `Discard`는 즉시 회수를 보장하지 않는 OS 힌트다. `Free`에는 자신이 소유한 정확한 영역을 전달한다. `VirtualAddressSpace`는 불안정한 인터페이스이므로 고정 ABI로 의존하지 않는다.

Critical memory pressure callback은 V8으로 재진입하지 않는다. OOM과 fatal error callback이 존재한다고 일반 예외처럼 복구 가능한 것은 아니다. 더 많은 메모리를 얻지 못하면 프로세스가 종료되는 경로를 고려한다.

## 공식 임베딩 예제의 적용 범위

`shell.cc`는 compile/run 각각의 예외 처리와 JS scope를 끝낸 뒤 message loop를 진행하는 흐름을 보여 준다. Local handle이 stack에 남지 않은 경계는 stackless GC에도 의미가 있다. `read`, `load`, `quit` 같은 함수는 host가 명시적으로 제공한 파일과 프로세스 권한이다.

`process.cc`는 request wrapper와 native map interceptor를 연결한다. 다만 전체 isolate/V8 종료 경로가 없는 예제이므로 production 수명 관리의 완성본으로 복사하지 않는다. 예제의 오래된 `Persistent`, `Close` 주석보다 실제 `Local`, `Global::Reset()`과 `Escape()` 호출을 기준으로 이해한다.

## 출처

- [V8, Isolate](https://v8.github.io/api/head/classv8_1_1Isolate.html)
- [V8, Context](https://v8.github.io/api/head/classv8_1_1Context.html)
- [V8, Locker](https://v8.github.io/api/head/classv8_1_1Locker.html)
- [V8, Platform](https://v8.github.io/api/head/classv8_1_1Platform.html)
- [V8, TaskRunner](https://v8.github.io/api/head/classv8_1_1TaskRunner.html)
- [V8, JobHandle](https://v8.github.io/api/head/classv8_1_1JobHandle.html)
- [V8, Initialization header](https://v8.github.io/api/head/v8-initialization_8h.html)
- [V8, Version header](https://v8.github.io/api/head/v8-version_8h.html)
- [V8, Default platform utilities](https://v8.github.io/api/head/namespacev8_1_1platform.html)
- [V8, shell.cc embedding example](https://v8.github.io/api/head/shell_8cc-example.html)
- [V8, process.cc embedding example](https://v8.github.io/api/head/process_8cc-example.html)

## 관련 문서

- [[V8-Cpp-API]]
- [[V8-Embedding-and-Security]]
- [[V8-Cpp-API-Handles-and-Exceptions]]
