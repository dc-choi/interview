---
tags: [runtime, v8, embedding, inspector, debugging]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 Inspector C++ API"]
---

# V8 Inspector를 호스트에 연결하기

Inspector는 isolate 안의 context와 디버거 프로토콜 세션을 연결한다. C++ API를 붙이는 것만으로 네트워크 서버나 DevTools 화면이 생기지는 않는다. 호스트가 context 등록, 메시지 운반, pause 동안의 이벤트 처리와 종료 수명을 연결한다. 아래 계약은 공식 Doxygen `head` 기준이며, 실제 호스트에 포함된 V8 헤더와 대조해야 한다.

## Context group과 세션

`V8Inspector::create(isolate, client)`로 inspector를 만들고 `contextCreated(V8ContextInfo)`와 `contextDestroyed(context)`로 실행 환경의 수명을 알린다. `V8ContextInfo::contextGroupId`는 **0이 아닌 값**이어야 한다. Group은 디버깅 대상을 묶는 식별자이며 OS 권한 격리를 제공하는 장치로 해석하지 않는다.

`contextById()`는 `MaybeLocal<Context>`를 반환한다. ID를 알고 있어도 context가 남아 있다는 전제를 두지 않는다. `resetContextGroup()`와 context 생성/파괴 통지를 호스트의 실제 실행 환경 변화에 맞춘다. Debugger ID는 context group과 1:1로 연결되며, cross-debugger stack trace가 어느 디버거에서 왔는지 식별하는 데 쓰인다.

현재 헤더는 `connect()`를 deprecated로 표시하고 `connectShared()`를 권한다. 연결에는 group ID, channel, 복원할 state, `ClientTrustLevel`과 `SessionPauseState`를 전달한다. `kUntrusted`/`kFullyTrusted` 및 debugger 대기 여부를 호스트 정책에 따라 명시한다. 이 enum만으로 외부 접속 인증이 구현되는 것은 아니다.

## Channel 소유권과 중첩 pause loop

| 연결 방법 | Channel 수명 계약 |
|---|---|
| `connectShared(..., Channel*, ...)` | Embedder가 channel을 소유하며 반환한 세션이 살아 있는 동안 유지 |
| `connectShared(..., ManagedChannel*, ...)` | 세션이 `cppgc::Persistent`로 channel을 유지 |

일반 channel을 `shared_ptr`로 반환되는 세션에 넘겼다고 channel 소유권까지 이전되지는 않는다. `ManagedChannel`은 cppgc 관리 객체이며, 다른 관리 객체를 참조하는 구현은 자신의 `Trace()`에서 그 참조를 추적한다.

Debugger가 pause하면 `V8InspectorClient::runMessageLoopOnPause()`가 호스트의 중첩 loop를 연결한다. `runMessageLoopOnInstrumentationPause()`의 기본 구현도 이를 호출한다. 기본 callback들은 대부분 빈 구현이므로 `client`를 생성했다는 사실만으로 pause와 resume 메시지 처리가 동작한다고 생각하지 않는다.

헤더는 pause의 중첩 loop가 실행되는 동안 세션을 파괴하지 말라고 명시한다. `connectShared()`는 protocol dispatch가 stack에 남아 있을 때 세션 파괴를 미뤄 이를 일부 보완하지만, 호스트의 모든 수명 문제를 해결한다는 보장은 아니다. 종료할 때 `session->stop()`은 debugger pause 등을 끄는 준비 단계다. 이어 실제 세션, channel, context와 isolate의 수명을 정리한다.

## 프로토콜 입력과 출력

입력 메시지는 `session->dispatchProtocolMessage()`로 전달한다. 출력은 channel의 `sendResponse(callId, message)`와 `sendNotification(message)`로 구분하고 `flushProtocolNotifications()`도 구현한다. `supportedDomains()`와 `canDispatchMethod()`는 지원하는 영역과 method를 확인하는 API이며 접속 권한 검증을 대신하지 않는다.

`state()`는 byte vector를 반환한다. 이를 연결 시의 state 인자와 함께 사용하되, 다른 V8 버전에서도 그대로 호환되는 영구 저장 형식이라고 가정하지 않는다. `setSkipAllPausesForInternalUse()`는 프로토콜 설정과 저장된 session state를 바꾸지 않는 일시적 override다.

Inspector 문자열은 `StringView`의 8비트/16비트 구분과 길이를 따른다. 헤더 구현에서 view는 원본 pointer를 보관하므로 비소유 참조다. 비동기 전송 큐에 view만 남기지 말고 데이터를 보유한다. `StringBuffer::create(view)`는 내용을 복사하며, channel이 받는 `unique_ptr<StringBuffer>`는 해당 메시지 buffer의 소유권을 넘긴다. `StringBuffer::string()`의 view도 소유 buffer보다 오래 보관하지 않는다.

## 평가 결과와 remote object

`evaluate(context, expression, includeCommandLineAPI)`는 C++에서 `Runtime.evaluate`와 같은 내부 동작을 호출한다. 결과의 `ResultType`은 `kNotRun`, `kSuccess`, `kException`이다. 결과 `value`를 성공 반환값으로 사용하기 전에 type을 확인한다. 반환값은 `Local<Value>`이므로 일반 V8 handle scope의 수명 규칙도 적용된다.

`wrapObject()`는 V8 값을 프로토콜 remote object로 만들고 group 이름을 받는다. `unwrapObject()`는 성공 여부와 error, 값, context, object group을 돌려준다. Remote object ID를 원래 C++ pointer처럼 사용하지 않는다. 더 이상 필요 없는 묶음은 `releaseObjectGroup()`으로 해제한다.

Client는 custom subtype, 설명과 deep serialization을 제공할 수 있다. `DeepSerializationResult`는 `isSuccess`와 serialized value 또는 error message를 구분하므로, 실패 시 value가 있는 것처럼 처리하지 않는다. 지원하지 않는 client hook의 기본 반환은 `nullptr` 또는 빈 `MaybeLocal`일 수 있다.

## 비동기 원인과 예외 기록

호스트의 비동기 작업은 `asyncTaskScheduled(name, task, recurring)`와 started/finished/canceled 통지로 연결한다. 동일 작업의 생애를 같은 task 식별자에 대응시켜야 causal stack이 호스트의 실행 흐름을 반영한다. 반복 작업 여부도 등록 시 전달한다.

디버거를 넘나드는 원인 연결에는 `storeCurrentStackTrace()`의 `V8StackTraceId`와 `externalAsyncTaskStarted()`/`externalAsyncTaskFinished()`를 사용한다. `V8StackTrace::clone()`은 다른 스레드로 넘기기에 안전하지만 **async chain을 버린다**. 복사본이 전체 비동기 원인을 보존한다고 설명하지 않는다.

`exceptionThrown()`은 exception ID를 반환하고 `exceptionRevoked()`는 그 ID로 기록을 철회한다. 호스트의 예외 보고와 후속 처리에 맞춰 같은 context와 ID를 연결한다. Console 메시지는 현재 context ID를 받는 client overload를 사용한다. Context ID가 없는 이전 overload는 헤더에서 deprecated로 표시돼 있다.

## 이해 확인

일반 `Channel*`를 넘긴 뒤 세션만 shared pointer로 보관했다면 channel의 수명은 누가 보장하는가? Pause loop에서 연결 종료가 발생할 때 세션 파괴 시점을 어디서 제어하는가? 이 두 질문에 답할 수 있어야 메시지 전송이 성공한 뒤의 디버깅 수명도 설명할 수 있다.

## 출처

- [V8, V8Inspector](https://v8.github.io/api/head/classv8__inspector_1_1V8Inspector.html)
- [V8, V8InspectorSession](https://v8.github.io/api/head/classv8__inspector_1_1V8InspectorSession.html)
- [V8, V8InspectorClient](https://v8.github.io/api/head/classv8__inspector_1_1V8InspectorClient.html)
- [V8, Inspector public header](https://v8.github.io/api/head/v8-inspector_8h_source.html)
- [V8, StringBuffer](https://v8.github.io/api/head/classv8__inspector_1_1StringBuffer.html)
- [V8, V8StackTrace](https://v8.github.io/api/head/classv8__inspector_1_1V8StackTrace.html)

## 관련 문서

- [[V8-Embedding-and-Security|호스트 기능과 안전 경계]]
- [[V8-Profiling-and-Tooling|프로파일링과 도구]]
- [[V8-GC-and-Memory|객체와 native 자원의 수명]]
