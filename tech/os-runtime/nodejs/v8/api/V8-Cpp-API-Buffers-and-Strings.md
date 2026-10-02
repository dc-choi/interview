---
tags: [runtime, v8, cpp, memory, unicode]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 BackingStore", "V8 External String"]
---

# V8 버퍼, 문자열과 외부 메모리

JS 객체의 수명, 실제 데이터의 수명과 메모리 사용량 집계는 서로 다른 계약이다. `ArrayBuffer`와 external string을 native 코드에 연결할 때 세 가지를 각각 관리한다. 기준은 V8 15.7.0 candidate API다.

## ArrayBuffer와 BackingStore

`ArrayBuffer`는 JS 객체이며 `BackingStore`가 실제 저장 공간을 소유한다. `GetBackingStore()`의 `shared_ptr`를 통해 여러 사용자가 저장 공간의 수명을 공유할 수 있다. 같은 저장 공간을 다른 수동 소유권 체계로도 해제하지 않는다.

`Data()`가 돌려준 raw pointer는 그것만으로 수명을 연장하지 않는다. 버퍼와 backing store의 수명, detach와 resize 가능성을 확인한 상태에서 사용한다. `GetBackingStore()`가 비어 있지 않다는 사실은 buffer가 detach되지 않았다는 증거가 아니다. Detach 여부는 `WasDetached()` 등 해당 계약으로 확인한다.

Raw memory를 넘겨 backing store를 만들면 설정한 deleter가 소유권 종료를 처리한다. 소유권을 한 번만 전달하고 같은 memory를 다른 backing store로 다시 감싸지 않는다. `EmptyDeleter`로 수동 관리할 때도 V8이 접근할 수 없게 detach한 뒤 메모리를 해제해야 한다.

기본 raw allocator 포인터 설정은 allocator의 수명을 자동으로 연장하지 않는다. 필요한 경우 `array_buffer_allocator_shared`로 공유 소유권을 사용한다. Allocator 자체는 thread-safe해야 하며 V8으로 재진입하지 않는다.

## 할당 실패와 resizable buffer

모든 생성 API가 같은 방식으로 실패하지 않는다. `MaybeNew()`처럼 빈 결과를 주는 API와 GC 후 재시도하거나 OOM으로 종료하는 경로를 구분한다. Backing store 생성의 failure mode를 명시할 수 있으면 호출자가 복구할 수 있는 정책인지 확인한다.

Resizable backing store는 현재 길이와 최대 길이를 별도로 갖는다. Isolate 없이 할당하는 경로에 isolate GC와 재시도가 자동으로 붙는다고 기대하지 않는다. 가상 주소 공간 예약량도 현재 접근 가능한 bytes나 물리 RAM 사용량과 같지 않다.

Detach에 key가 있으면 일치 조건을 확인한다. `Maybe<bool>`의 실패와 정상적인 true를 구분한다. Buffer를 다른 구성 요소로 넘긴 뒤 원래 view를 계속 사용하지 않는다.

## TypedArray와 view의 단위

TypedArray의 `Length()`는 원소 수다. `ByteLength()`와 `ByteOffset()`은 bytes다. `Uint8Array`에서 우연히 같은 값이 되는 것을 다른 원소 타입에 일반화하지 않는다.

`ArrayBufferView::GetContents()`는 외부 저장 공간을 바로 보여 주거나 호출자가 제공한 scratch 공간으로 내용을 복사할 수 있다. 반환된 span이 어느 저장 공간을 참조하는지에 맞춰 수명을 유지한다. On-heap view 크기 같은 한계는 빌드 의존 상수이므로 코드에 임의의 숫자를 고정하지 않는다.

## 문자열의 길이와 encoding

| API 개념 | 단위 또는 의미 |
|---|---|
| `String::Length()` | UTF-16 code unit 수 |
| UTF-8 길이 계산 | UTF-8 bytes 수 |
| One-byte string | Latin-1 표현이며 UTF-8과 다름 |
| `IsOneByte()` | 빠른 표현 검사, false만으로 Latin-1 불가능을 단정하지 않음 |
| `ContainsOnlyOneByte()` | 전체 내용 검사가 필요할 수 있음 |

`NewFromUtf8()`에 명시적인 길이를 넘기면 중간 NUL을 포함한 입력을 다룰 수 있다. C 문자열 종료 규칙을 적용하는 overload와 혼동하지 않는다. `NewFromUtf8Literal()`의 배열 기반 길이는 마지막 종료 문자만 제외하므로 literal 내부의 NUL도 보존할 수 있다.

UTF-8 쓰기는 다중 byte 문자를 중간에서 자르지 않는다. NUL 종료를 요청하면 terminator 공간도 필요하며, 반환한 byte 수에 terminator가 포함되는 조건을 확인한다. 필요한 UTF-8 길이에 1을 더한 공간을 확보하는 방식도 실제 flag와 함께 판단한다.

## 복사, view와 외부 문자열

`String::Utf8Value`와 `String::Value`는 변환 결과를 소유하는 임시 wrapper다. 포인터는 wrapper 수명 안에서만 사용한다. 변환 과정에서 `toString()`이 실행될 수 있고 실패하면 포인터가 null이며 길이가 0일 수 있다. 이를 정상적인 빈 문자열로 바꾸어 처리하지 않는다.

`String::ValueView`는 복사를 줄이는 대신 view가 살아 있는 동안 할당과 GC를 금지하는 조건을 가진다. 내용을 보는 중에 다른 V8 API로 변환하거나 사용자 callback을 실행하지 않는다. One-byte와 two-byte 표현도 실제 view에 맞춰 해석한다.

External string의 내용은 불변이어야 한다. V8이 resource의 `Dispose()` 수명을 관리하는 동안 native 쪽에서 데이터를 먼저 해제하거나 바꾸지 않는다. Cacheable resource는 `data()`가 안정된 주소를 제공해야 한다. Non-cacheable resource의 `Lock()`과 `Unlock()`은 thread-safe하고 중첩 횟수가 맞아야 한다.

## 외부 메모리 집계와 소유권

`ExternalMemoryAccounter` 같은 API는 V8의 GC 판단에 외부 사용량을 알려 준다. 메모리를 할당하거나 해제하는 소유권 API가 아니다. 증가와 감소를 균형 있게 기록하고 accounter 수명이 끝날 때 잔액이 남지 않게 한다.

여러 wrapper가 같은 외부 메모리를 공유하면 각 wrapper의 전체 크기를 중복 집계하지 않는다. JS heap 사용량만 봐서 native 누수가 없다고 결론 내리지 않고, backing store, allocator와 외부 resource의 수명을 함께 추적한다.

## 출처

- [V8, ArrayBuffer](https://v8.github.io/api/head/classv8_1_1ArrayBuffer.html)
- [V8, BackingStore](https://v8.github.io/api/head/classv8_1_1BackingStore.html)
- [V8, ArrayBufferView](https://v8.github.io/api/head/classv8_1_1ArrayBufferView.html)
- [V8, String](https://v8.github.io/api/head/classv8_1_1String.html)
- [V8, Array buffer header](https://v8.github.io/api/head/v8-array-buffer_8h.html)
- [V8, Primitive values header](https://v8.github.io/api/head/v8-primitive_8h.html)
- [V8, External memory accounter header](https://v8.github.io/api/head/v8-external-memory-accounter_8h.html)

## 관련 문서

- [[V8-Cpp-API]]
- [[V8-GC-and-Memory]]
- [[V8-Cpp-API-Serialization]]
