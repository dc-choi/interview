---
tags: [cs, javascript, binary-data, typed-array, web-worker, atomics]
status: done
verified_at: 2026-08-04
category: "CS - JavaScript"
aliases: ["JavaScript Binary Data and Workers", "JavaScript 바이너리 데이터와 워커"]
---

# JavaScript 바이너리 데이터와 Worker

JavaScript에서 바이너리 데이터는 `ArrayBuffer`가 메모리 영역을 소유하고 `TypedArray`나 `DataView`가 그 영역을 해석하는 구조다. Worker는 메인 실행 환경과 분리된 agent에서 작업하며, 데이터를 복제하거나 소유권을 이전하거나 명시적으로 공유한다.

## 비트 연산의 범위

`number`에 대한 비트 연산은 피연산자를 32비트 정수로 변환한 뒤 수행한다. 따라서 일반 `number`의 최대 안전 정수 범위 전체를 보존하는 연산이 아니다.

```ts
const flags = READ | WRITE;
const canWrite = (flags & WRITE) !== 0;
```

- `&`, `|`, `^`, `~`, `<<`, `>>`, `>>>`의 부호와 overflow 동작을 확인한다.
- `>>> 0` 같은 변환은 32비트 unsigned 범위에만 맞으며 범용 숫자 검증이 아니다.
- `BigInt` 비트 연산은 `number`와 섞을 수 없고 unsigned right shift인 `>>>`를 지원하지 않는다.
- bit mask는 제한된 flag 집합에는 간결하지만 이름 있는 집합이나 확장 가능한 권한 모델에는 읽기 어려울 수 있다.
- 비트 연산이 항상 더 빠르다고 가정하지 말고 실제 hot path에서 측정한다.

## ArrayBuffer와 view

`ArrayBuffer` 자체는 byte 해석 방식을 갖지 않는다. view가 element type, offset과 length를 정한다.

```ts
const buffer = new ArrayBuffer(8);
const bytes = new Uint8Array(buffer);
const words = new Uint16Array(buffer);
```

두 view는 같은 byte를 다른 element 폭으로 본다. 한 view의 쓰기가 다른 view에 즉시 보이므로 encoding, alignment와 endian 계약을 문서화한다.

현재 ECMAScript는 옵션으로 resizable `ArrayBuffer`와 growable `SharedArrayBuffer`도 정의한다. 기본 생성은 고정 길이지만 `maxByteLength`를 지정한 buffer는 runtime 지원 범위에서 resize/grow할 수 있다. 오래된 환경과 library는 이 기능을 모를 수 있으므로 feature detection과 호환성 검증이 필요하다.

`ArrayBuffer`는 structured clone으로 복제할 수도 있고 transfer list로 소유권을 넘길 수도 있다. transfer되면 원래 buffer는 detached되어 더 이상 같은 data를 읽지 못한다. `SharedArrayBuffer`는 transfer되거나 detach되지 않고 양쪽 agent가 같은 data block을 공유한다.

## TypedArray의 복사와 공유

`TypedArray`는 `Uint8Array`, `Int32Array`, `Float64Array`처럼 element type이 정해진 view다.

- constructor에 기존 buffer를 넘기면 그 buffer를 공유한다.
- `subarray(begin, end)`은 새 view만 만들며 같은 buffer를 공유한다.
- `slice(begin, end)`는 element를 새 buffer로 복사한다.
- 다른 TypedArray를 constructor에 넘기면 element 값을 변환해 새 buffer에 복사한다.
- `Uint8ClampedArray`는 0에서 255로 clamp하고 정해진 반올림 규칙을 적용한다. 단순 truncation과 같지 않다.
- 범위를 벗어난 integer는 해당 element type의 modulo/변환 규칙을 따르므로 domain validation을 대신하지 못한다.

## DataView와 endian

`DataView`는 같은 buffer에서 서로 다른 크기와 부호의 값을 offset별로 읽고 쓸 때 사용한다.

```ts
const view = new DataView(buffer);
view.setUint32(0, 0x12345678, false); // big-endian
const value = view.getUint32(0, false);
```

multi-byte getter/setter의 endian 인자를 생략하면 big-endian으로 해석한다. protocol/file format의 endian을 항상 명시하면 host architecture와 무관한 결과를 얻는다. DataView는 unaligned offset도 다룰 수 있지만 범위를 넘으면 `RangeError`가 발생한다.

## Worker의 격리와 메시지

Dedicated Worker는 별도 global scope와 event loop를 가지며 DOM을 직접 조작할 수 없다. main thread와 worker는 `postMessage`로 structured clone 가능한 값을 교환한다.

```ts
worker.postMessage(buffer, [buffer]);
```

위 코드는 큰 `ArrayBuffer`를 복사하지 않고 worker로 transfer하며 송신 측 buffer를 detach한다. 계속 사용해야 한다면 복제하거나 ownership protocol을 다시 설계한다.

- 메시지마다 request ID를 두어 응답과 오류를 연결한다.
- worker 생성/종료, crash, timeout과 in-flight 요청 거부 정책을 정한다.
- CPU 작업을 worker로 옮겨도 작업 분할과 serialization 비용이 사라지지 않는다.
- 같은 code가 Node.js라면 Web Worker와 `worker_threads`의 API/환경 차이를 확인한다.

## SharedArrayBuffer와 Atomics

`SharedArrayBuffer`는 복사나 소유권 이전 없이 여러 agent가 같은 byte를 보게 한다. 동시에 같은 위치를 읽고 쓰면 data race가 생길 수 있으므로 shared integer TypedArray와 `Atomics`로 ordering과 synchronization을 표현한다.

- `Atomics.add`, `compareExchange` 등은 해당 shared element에 atomic한 read-modify-write를 제공한다.
- atomic operation 하나가 여러 field에 걸친 domain invariant까지 자동 보장하지는 않는다.
- `Atomics.wait`는 blocking이 허용된 agent에서만 사용한다. browser main thread에서는 사용할 수 없으므로 worker나 `Atomics.waitAsync` 지원 여부를 검토한다.
- browser의 `SharedArrayBuffer` 사용은 보안상 secure context와 cross-origin isolation 설정이 필요하다.
- message passing이 더 단순한 문제라면 shared memory보다 우선한다.

## 백엔드 적용

NestJS에서 binary upload, compression, encryption adapter를 만들 때 `Buffer`가 `Uint8Array` 계열이라는 점을 활용할 수 있지만 view의 `byteOffset`과 `byteLength`를 무시하면 underlying buffer의 다른 data까지 노출할 수 있다. 외부 API나 DB에 넘길 때는 실제 view 범위만 사용한다.

CPU 집약적인 parsing이나 image 처리는 request handler에서 직접 실행하지 말고 queue/worker pool로 격리한다. 동시성 수, memory 상한, timeout, cancellation과 graceful shutdown을 함께 설계한다.

## 출처

- [ECMAScript Language Specification, structured data](https://tc39.es/ecma262/multipage/structured-data.html)
- [ECMAScript Language Specification, TypedArray objects](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-typedarray-objects)
- [ECMAScript Language Specification, memory model](https://tc39.es/ecma262/multipage/memory-model.html)
- [HTML Standard, Web workers](https://html.spec.whatwg.org/multipage/workers.html)
- 비트 연산: [기본 연산](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49951), [shift](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49954), [활용](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50029)
- ArrayBuffer: [개요](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50107), [생성과 속성](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50145), [slice](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50204), [view](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50311)
- TypedArray: [구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50388), [생성](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50480), [buffer 공유](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50671), [메서드](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50690), [subarray/slice](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50691), [clamped array](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50722)
- DataView: [구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50954), [get/set](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51027), [endian](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51028)
- Worker: [Web Worker](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51177), [message](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51200), [transfer](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51205)
- 공유 메모리: [SharedArrayBuffer](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51255), [Atomics](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51256)

## 관련 문서

- [[Event-Loop|Node.js Event Loop]]
- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[NestJS-File-Upload|파일 업로드]]
- [[Graceful-Shutdown|Graceful Shutdown]]
