---
tags: [runtime, v8, cpp, serialization, snapshot]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 ValueSerializer", "V8 Code Cache", "V8 SnapshotCreator"]
---

# V8 직렬화, 코드 캐시와 snapshot

값을 전달하는 structured clone, 컴파일 비용을 줄이는 code cache와 시작 상태를 저장하는 snapshot은 목적과 호환성 조건이 다르다. 한 형식의 bytes를 다른 용도의 영구 저장 계약으로 쓰지 않는다. 기준은 V8 15.7.0 candidate API다.

## 값 직렬화의 경계

`ValueSerializer`는 structured clone에 대응하는 형식을 사용한다. 반환값이 없는 `WriteHeader()`로 header를 쓰고, `WriteValue()`의 성공을 확인한 뒤 `Release()`로 결과 buffer의 소유권을 넘겨받는다. 실패한 직렬화의 buffer를 정상 메시지로 전송하지 않는다. Release 이후 serializer를 계속 쓰는 것도 허용된 흐름으로 가정하지 않는다.

`ValueDeserializer`는 header와 wire version을 검사한 뒤 값을 읽는다. Legacy wire format 허용은 header를 읽기 전에 필요한 경우에만 설정한다. Custom host object를 지원한다면 serializer와 deserializer 양쪽 delegate의 타입, 길이와 실패 처리를 함께 정의한다.

직접 기록하는 정수는 API의 varint 형식 등을 따른다. C++ 구조체 메모리를 그대로 복사하면 padding, endian과 수명 계약까지 자동으로 해결된다고 생각하지 않는다.

## Buffer transfer와 공유 자원

`TransferArrayBuffer()`는 ID를 통해 out-of-band 전달 자원을 연결한다. 송수신 양쪽이 같은 ID와 실제 buffer를 설정해야 한다. 직렬화된 bytes만 보내면 transfer가 완료되는 것은 아니다.

SharedArrayBuffer ID 공간과 일반 transferred ArrayBuffer ID 공간은 다를 수 있다. `SharedValueConveyor`로 공유한 값도 직렬화 결과와 이후 역직렬화가 사용하는 동안 살아 있어야 한다. 재시도나 여러 번 읽는 transport라면 첫 read 이후 곧바로 자원을 버리지 않는다.

Immutable buffer의 zero-copy 모드를 사용하면 `ReleaseSharedImmutableBackingStores()`로 얻은 저장 공간을 receiver의 대응 설정에도 전달한다. Bytes만 복사하고 backing store를 누락하면 같은 전달 계약이 아니다.

## Code cache와 버전

Code cache는 원본 소스와 엔진 빌드 조건에 종속된다. `CachedDataVersionTag()`는 V8 버전, embedder 설정과 flags 영향을 반영하므로 보편적인 파일 형식 버전으로 쓰지 않는다. Cache key에는 정확한 소스와 필요한 origin, compile 조건도 반영한다.

`CreateCodeCache()`의 결과는 null일 수 있으며 반환 객체의 소유권은 호출자에게 있다. Cache rejection을 정상적인 miss로 처리할지와 다시 컴파일할 비용을 설계한다. 엔진 업그레이드 후 이전 cache를 무조건 신뢰하지 않는다.

Wasm의 compiled module serialization은 원래 wire bytes를 포함하지 않는다. 재사용과 검증에 필요한 원본 bytes를 따로 보존한다.

## Streaming과 background compilation

Streaming task는 embedder가 background에서 실행하고 정리한다. `StreamedSource`는 해당 작업과 후속 컴파일 동안 유지한다. Background `Run()`이 끝난 후에도 최종 compile에는 전체 source string과 origin이 필요하다.

일반 `ExternalSourceStream`이 반환하는 chunk는 V8 쪽으로 소유권을 넘기는 계약이다. 반면 `FlexibleExternalSourceStream`은 embedder가 stream 파괴까지 chunk memory를 유지한다. 이름이 비슷해도 해제 책임이 반대일 수 있다.

UTF-8 문자를 지나치게 작은 여러 chunk로 쪼개거나 UTF-16 code unit 중간에서 나누지 않는다. EOF 또는 취소는 stream API의 종료 반환값으로 표시한다. Byte length와 code unit length를 혼동하지 않는다.

Background cached-data 처리는 `SourceTextAvailable()`에 같은 isolate와 정확한 소스 정보를 전달하는 조건이 있다. Run, 소스 제공과 merge의 완료 조건을 모두 만족한 뒤 결과를 사용한다. 순서를 생략해서 thread-safe해지는 API가 아니다.

## SnapshotCreator의 소유권

Snapshot은 초기 상태와 external reference 계약을 함께 저장한다. Creator가 isolate를 소유하는지는 생성자 overload에 따라 다르다. 자체 생성하는 방식과 이미 allocate한 isolate를 받는 방식을 구분하고, 기존 bool 인자가 있는 overload의 기본값도 확인한다.

`CreateBlob()`은 열린 `HandleScope` 밖에서 호출한다. 실패하면 `{nullptr, 0}`일 수 있고, 성공한 data 배열은 호출자가 해제한다. Creator의 종료만으로 반환 blob까지 자동 정리된다고 가정하지 않는다.

Default context 설정은 global proxy를 제외하는 반면 추가 context 저장은 다른 포함 계약을 가진다. Native pointer, internal field, context data와 API wrapper를 복구하려면 대응 serialize/deserialize callback이 필요하다. Native 주소 자체를 새 프로세스에서 재사용하지 않는다.

`AddData()`로 넣은 값은 복원 후 한 번 꺼내는 계약이 있다. 꺼낸 data는 다음 snapshot에 자동으로 다시 남지 않는다. Startup snapshot을 일반 DB 저장이나 실행 중 상태 checkpoint와 동일시하지 않는다.

## 설계 선택

- 다른 isolate에 JS 값을 넘기는 목적이면 structured clone과 transfer 계약을 검토한다.
- 같은 소스의 재컴파일 비용을 줄이려면 code cache를 사용하되 miss와 버전 변경을 허용한다.
- 고정된 초기화 작업을 줄이려면 snapshot을 검토하고 빌드, external reference와 native 자원 복구를 맞춘다.

세 방식 모두 입력 출처와 자원 한도를 검증해야 한다. 엔진이 형식을 검사한다는 사실이 host object delegate의 권한 검증까지 대신하지 않는다.

## 출처

- [V8, ValueSerializer](https://v8.github.io/api/head/classv8_1_1ValueSerializer.html)
- [V8, ValueDeserializer](https://v8.github.io/api/head/classv8_1_1ValueDeserializer.html)
- [V8, ScriptCompiler](https://v8.github.io/api/head/classv8_1_1ScriptCompiler.html)
- [V8, SnapshotCreator](https://v8.github.io/api/head/classv8_1_1SnapshotCreator.html)
- [V8, Script header](https://v8.github.io/api/head/v8-script_8h.html)
- [V8, Snapshot header](https://v8.github.io/api/head/v8-snapshot_8h.html)
- [V8, CompiledWasmModule](https://v8.github.io/api/head/classv8_1_1CompiledWasmModule.html)

## 관련 문서

- [[V8-Cpp-API]]
- [[V8-Startup-and-Code-Caching]]
- [[V8-Cpp-API-Buffers-and-Strings]]
- [[V8-Cpp-API-Execution]]
