---
tags: [runtime, nodejs, buffer, memory]
status: done
category: "OS & Runtime"
aliases: ["Node.js Buffer", "Buffer Memory Management", "Buffer.alloc"]
---

# Node.js Buffer, Memory Management

`Buffer`는 V8 힙 밖의 **고정 크기 raw 메모리 영역**을 다루는 클래스. 네트워크 소켓, 파일 I/O, 암호화처럼 바이트 단위 데이터를 처리할 때 사용. JS 문자열은 UTF-16/UCS-2 인코딩이라 바이트 정확히 다루기 어려운데, Buffer는 **임의 인코딩의 바이트 시퀀스**를 그대로 표현.

## 왜 V8 힙 밖인가

- V8 GC 비용을 피해 **대용량, 고빈도 I/O 처리에 유리**.
- 대신 **OS 메모리 압박을 직접 받는다** — 누수 시 GC가 도와주지 않음.
- ES2017+ `ArrayBuffer`/`Uint8Array`와 같은 메모리 모델 — `Buffer`는 `Uint8Array`의 서브클래스.

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

Node.js는 작은 Buffer 할당을 빠르게 하기 위해 **8KB(`Buffer.poolSize` 기본값) 메모리 풀**을 유지. `allocUnsafe`로 풀 크기 절반(4KB) 미만을 요청하면 풀에서 잘라 반환.

```ts
console.log(Buffer.poolSize);              // 8192
const small = Buffer.allocUnsafe(100);     // 풀에서 슬라이스
const large = Buffer.allocUnsafe(9000);    // 별도 할당
```

| 크기 | 동작 | 비용 |
|------|------|------|
| ≤ poolSize/2 (4KB) | 풀 슬라이스 | 매우 저렴 |
| > poolSize/2 | malloc 직접 | 비싸지만 단편화 X |

`alloc` 또는 `allocUnsafeSlow`는 **풀을 쓰지 않음** — 영속성 길게 갈 Buffer는 풀 슬라이스를 들고 있으면 풀 전체가 GC 안 됨 → 메모리 잔존. 장기 보관 Buffer는 `allocUnsafeSlow`로.

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

Node.js v17+에서 `Buffer.prototype.slice`는 **deprecated** — `subarray` 사용. 둘 다 zero-copy지만 slice는 의미가 헷갈림(다른 언어에서는 복사인 경우 많음).

## 메모리 누수 패턴 — Buffer 특화

- **장기 보관 Buffer가 풀 슬라이스를 들고 있음** → 풀 전체가 GC 회수 안 돼 메모리 잔존. 보관 시 `allocUnsafeSlow` 또는 복사본 생성.
- **TypedArray 뷰가 큰 ArrayBuffer를 잡고 있음** → 작은 view만 사용해도 원본 ArrayBuffer가 살아 있음. 필요한 범위만 새로 복사.
- **Buffer를 클로저에 캡처** → 클로저가 살아 있는 동안 GC 안 됨. EventEmitter 핸들러 등에 캡처할 때 주의.

## 흔한 실수

- **`allocUnsafe` 후 일부만 덮어쓰기** → 잔여물 노출.
- **`Buffer.from(string)`에 인코딩 누락** → 기본 `utf8` 가정. 멀티바이트 텍스트 길이 헷갈림 (`length`는 바이트, 문자 수 아님).
- **`buf.length`를 문자 수로 착각** → 바이트 수. 문자열로 변환 후 `.length`.
- **Buffer 비교에 `==`** → 객체 동등성 X. `Buffer.compare(a, b)` 또는 `a.equals(b)`.
- **TypeScript에서 `Buffer | Uint8Array` 혼용** → API에 따라 동작 다를 수 있음. v8+ 표준은 `Uint8Array` 우선.

## 면접 체크포인트

- Buffer가 V8 힙 밖에 있는 이유 — GC 회피, 대용량 I/O 효율
- `alloc` vs `allocUnsafe` 차이와 보안 함정
- `Buffer.poolSize` (기본 8KB)와 풀 슬라이스 동작 — 장기 보관 시 함정
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
