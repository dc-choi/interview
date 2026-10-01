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

## byte, element와 변환의 경계

Number 비트 연산의 signed 결과 범위는 -2^31부터 2^31-1이다. ToInt32는 0 방향으로 소수부를 버린 뒤 2^32 modulo를 signed로 해석한다. `5.7 | 0`은 5, `2 ** 31 | 0`은 -2147483648, `2 ** 32 | 0`과 `NaN | 0`은 0이다. `~5`는 -6, `3 & 5`는 1, `3 ^ 5`는 6이다. signed 오른쪽 shift는 음수의 부호를 유지해 `-9 >> 2`는 -3이고 `-1 >>> 0`은 4294967295다. 이동 횟수는 하위 5bit만 써 `1 << 32`는 1이다. [[Digital-Fundamentals|2의 보수]]와 연결하되 범용 소수 버림에는 Math.trunc를 쓴다.

ArrayBuffer.slice는 byte를 복사하고 ArrayBuffer.isView는 TypedArray와 DataView를 판별한다. `new Int16Array(4)`는 원소 4개, byte 8개이고 다른 TypedArray/iterable을 넘기면 값 복사, buffer를 넘기면 공유 view다. 고정 buffer의 `(buffer, byteOffset, length)`는 offset이 원소 크기의 배수여야 하며 생략한 length는 남은 byte 수도 배수여야 한다. `new Int16Array(new ArrayBuffer(10),4)`는 원소 3개, offset 1은 RangeError다. 범위 밖 integer index 쓰기는 strict에서도 조용히 무시되고 읽기는 undefined라 길이 위반을 별도로 검사한다. resizable buffer의 length-tracking view는 길이 규칙을 별도로 확인한다.

Int8은 modulo 256을 signed로 해석해 128은 -128, 500은 -12다. Uint8은 300을 44로 저장하지만 Uint8Clamped는 255로 제한하고 1.5와 2.5를 모두 2로 반올림한다. Int/Uint16,32는 각각 2,4byte다. Float32/64는 각각 binary32/64이고 BigInt64/BigUint64는 BigInt만 받는다. 현재 명세에는 binary16인 Float16Array도 있으므로 강의의 9종 목록이나 Float16 부재 설명을 현재 지원 표로 쓰지 않는다. runtime 지원은 별도로 확인한다.

TypedArray.from은 iterable 또는 array-like의 원소를 변환한다. `Int8Array.from('12')`는 `[1,2]`지만 `new Int8Array('12')`는 길이 12다. from의 mapper가 반환하지 않으면 정수 view에는 0, float view에는 NaN이 들어간다. 고정 buffer 위 view는 push/pop/splice처럼 길이를 바꾸는 method가 없고 set(source, offset)은 원소 위치에서 복사해 공간을 넘으면 RangeError다. copyWithin은 같은 view 안에서 겹친 구간도 안전하게 복사하고 길이를 늘리지 않는다.

DataView constructor의 byteOffset은 buffer 기준, get/set의 offset은 view 시작 기준이다. `new DataView(buffer,4,4).getUint16(0)`은 buffer byte 4에서 읽는다. 한 byte를 읽는 Int8/Uint8에는 endian 인자가 없고, multi-byte get/set은 생략 시 big-endian이다. view 끝을 넘으면 RangeError, detached buffer는 TypeError다.

## 메시지와 원자 연산의 정확한 계약

Worker에는 window/document/DOM이 없지만 self/globalThis, timer와 지원되는 fetch/XHR 같은 WorkerGlobalScope API가 있다. Worker 전용 지원, module/classic 차이와 대상 browser를 확인한다. postMessage는 호출 때 직렬화한 snapshot을 보내므로 이후 원본 변경은 반영되지 않는다. transfer 뒤 고정 ArrayBuffer의 byteLength는 0, TypedArray length는 0이며 index 읽기는 undefined, 쓰기는 무시된다. DataView get/set은 TypeError다. 같은 buffer를 되돌려 transfer하면 한 시점에 한 agent만 소유하는 왕복 protocol이 되고, SharedArrayBuffer는 transfer list에 넣지 않고 공유한다.

Atomics.load는 현재 값, exchange/add/sub/and/or/xor와 compareExchange는 변경 전 값을 반환한다. compareExchange는 expected를 대상 정수 element 타입으로 변환한 값과 기존 값이 같을 때 교체한다. 반환값은 변경 전 값이므로 성공 판정에는 같은 타입으로 정규화한 expected와 비교해야 한다. Int8에 44가 있을 때 expected 300, replacement 7을 주면 300이 44로 변환되어 교체에 성공하고 44를 반환한다. 원래 인자 300과 직접 비교하면 성공을 실패로 오판하므로 범위 안의 정수만 허용하거나 먼저 정규화한다. store는 인자를 정수 변환한 값을 반환해 Int8에 300을 store한 반환은 300이어도 load는 44다. load, 계산, store를 각각 atomic하게 해도 전체 증감은 atomic하지 않아 한 element 증감에는 add를 쓴다. 여러 field 불변식에는 compareExchange로 만든 별도 lock protocol이나 message owner가 필요하다.

wait는 expected를 Int32/BigInt64로 변환한 뒤 공유 위치의 값과 비교하여 같으면 대기하고, 다르면 즉시 `not-equal`을 낸다. 값이 0인 Int32 위치에 expected `2 ** 32`, timeout 0을 주면 expected가 0으로 변환되어 `not-equal`이 아닌 `timed-out`을 반환한다. 깨어남은 `ok`, timeout은 `timed-out`이며 깨어난 뒤 조건을 다시 검사한다. notify는 깨어난 agent 수를 반환한다. Atomics는 constructor가 아니며 Float/Uint8Clamped view에는 이런 정수 연산을 쓸 수 없다. isLockFree는 view가 아닌 byte 크기를 받고 lock 구현의 공정성이나 여러 field atomicity를 보장하지 않는다.

## 출처

- [ECMAScript, Atomics.compareExchange](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.compareexchange)

- [ECMAScript, Atomics.store](https://tc39.es/ecma262/multipage/structured-data.html#sec-atomics.store)

- [HTML Standard, structured data](https://html.spec.whatwg.org/multipage/structured-data.html)

- [ECMAScript, InitializeTypedArrayFromArrayBuffer](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-initializetypedarrayfromarraybuffer)

- [ECMAScript, ToInt32](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-toint32)

- [ECMAScript Language Specification, structured data](https://tc39.es/ecma262/multipage/structured-data.html)
- [ECMAScript Language Specification, TypedArray objects](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-typedarray-objects)
- [ECMAScript Language Specification, memory model](https://tc39.es/ecma262/multipage/memory-model.html)
- [HTML Standard, Web workers](https://html.spec.whatwg.org/multipage/workers.html)
- 비트 연산: [기본 연산](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49951), [OR/AND/XOR](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=49954), [NOT/shift](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50029)
- ArrayBuffer: [TypedArray 개요](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50107), [TypedArray 필요성](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50145), [ArrayBuffer와 view](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50204), [ArrayBuffer 생성/속성](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50311)
- TypedArray: [구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50388), [생성](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50480), [Int/Uint/clamped](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50671), [Float/속성](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50690), [from/of/iterator](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50691), [set/subarray/copyWithin](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50722)
- DataView: [구조](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=50954), [get/set](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51027), [endian](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51028)
- Worker: [Web Worker](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51177), [message](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51200), [transfer](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51205)
- 공유 메모리: [SharedArrayBuffer](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51255), [Atomics](https://www.inflearn.com/courses/lecture?courseId=325633&unitId=51256)

## 관련 문서

- [[Event-Loop|Node.js Event Loop]]
- [[JavaScript-Async-Iterable-Pipelines|JavaScript 비동기 이터러블 파이프라인]]
- [[NestJS-File-Upload|파일 업로드]]
- [[Graceful-Shutdown|Graceful Shutdown]]
