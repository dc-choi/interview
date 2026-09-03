---
tags: [runtime, nodejs, buffer, memory]
status: done
category: "OS & Runtime"
aliases: ["Node.js Buffer", "Buffer Memory Management", "Buffer.alloc"]
verified_at: 2026-09-03
---

# Node.js Buffer, Memory Management

`Buffer`는 고정 길이 바이트 시퀀스를 다루는 Node.js 클래스다. 네트워크 소켓, 파일 I/O, 암호화처럼 바이트 단위 데이터를 처리할 때 사용한다. Buffer의 backing store는 `process.memoryUsage().arrayBuffers`에 집계되고 그 값은 `external`에도 포함된다. Buffer 객체와 수명 자체는 V8이 관리한다.

## 힙과 외부 메모리의 구분

- `heapUsed`만 보면 Buffer backing store를 놓칠 수 있다. `arrayBuffers`, `external`, RSS를 함께 보되, `arrayBuffers`를 `external`에 더해 이중 계산하지 않는다.
- JS 객체가 더 이상 참조되지 않으면 V8 GC가 수명을 관리하지만, 외부 메모리가 큰 워크로드는 프로세스 RSS와 GC 압박을 함께 관찰해야 한다.
- 작은 할당에는 공유 풀이 사용될 수 있어 개별 `ArrayBuffer`를 많이 추적하는 비용을 줄인다.
- ES2015에 표준화된 `ArrayBuffer`/`Uint8Array`와 같은 메모리 모델 — `Buffer`는 `Uint8Array`의 서브클래스.

## 생성 방법

| 메서드 | 동작 | 용도 |
|--------|------|------|
| `Buffer.alloc(size)` | **0으로 초기화**한 size 바이트 | 안전 — 기본 선택 |
| `Buffer.allocUnsafe(size)` | **초기화 안 함** — 이전 메모리 잔여물 가능 | 즉시 덮어쓸 때 (성능) |
| `Buffer.allocUnsafeSlow(size)` | 초기화 X + 풀 사용 X | 풀 단편화 회피 |
| `Buffer.from(string, encoding)` | 문자열 → Buffer | 디코딩 |
| `Buffer.from([bytes])` | 바이트 배열 → Buffer | 직접 지정 |
| `Buffer.from(arrayBuffer)` | ArrayBuffer 공유 | zero-copy |

```ts
const a = Buffer.alloc(10);              // 0x00 × 10
const b = Buffer.allocUnsafe(10);        // ⚠️ 잔여 메모리 노출 위험
const c = Buffer.from('hello', 'utf8');  // 5바이트
const d = Buffer.from([1, 2, 3, 4]);     // [0x01, 0x02, 0x03, 0x04]
```

**`allocUnsafe` 보안 함정**: 이전 사용자의 데이터가 그대로 남아 있을 수 있어, 전체를 즉시 덮어쓰지 않으면 정보 누출 가능. 신뢰 못 할 데이터를 다룰 땐 `alloc` 또는 `allocUnsafe + fill(0)`.

## 메모리 풀 (`Buffer.poolSize`)

Node.js는 작은 Buffer 할당을 빠르게 하기 위해 메모리 풀을 유지한다. 2026-09-03에 확인한 Node.js v26.8.1 문서는 기본 `Buffer.poolSize`를 65,536바이트(64KiB)로 설명하며, 변경 이력은 Node.js v26.3.0에서 기본값이 8,192에서 65,536바이트로 바뀌었다고 기록한다. 실행 중인 Node 버전의 `Buffer.poolSize`를 확인하고, `allocUnsafe` 요청이 그 절반보다 작을 때 풀 슬라이스가 사용된다고 본다.

```ts
console.log(Buffer.poolSize);              // Node.js v26.8.1 문서 기준 65536
const small = Buffer.allocUnsafe(100);     // 풀에서 슬라이스
const large = Buffer.allocUnsafe(40000);   // 별도 할당
```

| 크기 | 동작 | 비용 |
|------|------|------|
| < poolSize/2 (현재 문서 기준 32KiB) | 풀 슬라이스 가능 | 작은 할당의 오버헤드 감소 |
| ≥ poolSize/2 | 별도 할당 | 풀을 장기 점유하지 않음 |

`Buffer.allocUnsafe()`, `Buffer.from(string|array)`, `Buffer.concat()`은 작은 요청에서 풀을 사용할 수 있다. `alloc`과 `allocUnsafeSlow`는 풀을 쓰지 않는다. 장기 보관하는 작은 Buffer가 풀 슬라이스를 계속 참조하면 풀 전체가 오래 남을 수 있으므로, 실제 보관 패턴을 측정한 뒤 `allocUnsafeSlow`와 복사본을 검토한다.

## 조작

```ts
const buf = Buffer.from('hello', 'utf8');
buf[0] = 0x48;                  // 'h' → 'H'
buf.toString('utf8');           // 'Hello'
buf.toString('hex');            // '48656c6c6f'
buf.toString('base64');         // 'SGVsbG8='

// 연결
const combined = Buffer.concat([buf, Buffer.from(' world')]);
```

| 인코딩 | 용도 |
|--------|------|
| `utf8` | 일반 텍스트 |
| `hex` | 16진수 표현 (HMAC, 해시 출력) |
| `base64`/`base64url` | 이진 데이터 텍스트 전송 |
| `latin1`/`binary` | 1바이트 1문자, 인코딩 미지정 raw |
| `ucs2`/`utf16le` | JS 문자열과 동일 인코딩 |

## 슬라이스 — `subarray` vs `slice`

```ts
const slice = buf.subarray(0, 3);   // 같은 메모리 공유 (zero-copy)
slice[0] = 0xff;                    // 원본도 변경됨
```

`Buffer.prototype.slice`는 Node.js v17.5.0, v16.15.0부터 deprecated다. `subarray`를 사용한다. 둘 다 zero-copy지만 `slice`는 `TypedArray.prototype.slice()`의 복사 의미와 달라 혼동하기 쉽다.

## 메모리 누수 패턴 — Buffer 특화

- **장기 보관 Buffer가 풀 슬라이스를 들고 있음** → 풀 전체가 GC 회수 안 돼 메모리 잔존. 보관 시 `allocUnsafeSlow` 또는 복사본 생성.
- **TypedArray 뷰가 큰 ArrayBuffer를 잡고 있음** → 작은 view만 사용해도 원본 ArrayBuffer가 살아 있음. 필요한 범위만 새로 복사.
- **Buffer를 클로저에 캡처** → 클로저가 살아 있는 동안 GC 안 됨. EventEmitter 핸들러 등에 캡처할 때 주의.

## 흔한 실수

- **`allocUnsafe` 후 일부만 덮어쓰기** → 잔여물 노출.
- **`Buffer.from(string)`에 인코딩 누락** → 기본 `utf8` 가정. 멀티바이트 텍스트 길이 헷갈림 (`length`는 바이트, 문자 수 아님).
- **`buf.length`를 문자 수로 착각** → 바이트 수. 문자열로 변환 후 `.length`.
- **Buffer 비교에 `==`** → 객체 동등성 X. `Buffer.compare(a, b)` 또는 `a.equals(b)`.
- **TypeScript에서 `Buffer | Uint8Array` 혼용** → API별로 Buffer 전용 동작이 다를 수 있다. Buffer 전용 기능이 필요 없으면 `Uint8Array` 기준 API를 우선 검토.

## 면접 체크포인트

- Buffer의 외부 backing store와 JS 객체 수명, 메모리 지표의 차이
- `alloc` vs `allocUnsafe` 차이와 보안 함정
- `Buffer.poolSize`의 버전별 기본값과 풀 슬라이스 동작 — 장기 보관 시 함정
- `subarray`의 zero-copy 의미 — 같은 메모리 공유
- `Buffer`가 `Uint8Array`의 서브클래스라는 점
- 인코딩(utf8, hex, base64) 선택 기준
- Buffer 메모리 누수 패턴 (풀 슬라이스 잔존, ArrayBuffer view 잔존)

## 관련 문서

- [[Node.js|Node.js 개요]]
- [[V8|V8 엔진]]
- [[V8-Array-Internals|V8 배열 내부 구현 (ArrayBuffer, Typed Array)]]
- [[Stream-Types|Stream Types (Buffer chunk)]]
- [[Debugging-Profiling-Memory|메모리 진단, 프로파일링]]

## 출처

- [ECMAScript 2015, ArrayBuffer Objects](https://262.ecma-international.org/6.0/#sec-arraybuffer-objects)
- [Node.js, Buffer](https://nodejs.org/api/buffer.html)
- [Node.js, Process memoryUsage](https://nodejs.org/api/process.html#processmemoryusage)
