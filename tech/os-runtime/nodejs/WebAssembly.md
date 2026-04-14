---
tags: [runtime, nodejs, wasm]
status: done
category: "OS & Runtime"
aliases: ["WASM", "WebAssembly"]
---

# WebAssembly

## 개요
```
WebAssembly(WASM)는 C/C++, Rust, AssemblyScript 등에서 컴파일 가능한 고성능 어셈블리 언어.
Chrome, Firefox, Safari, Edge, Node.js에서 지원.

JS에서 호출 가능한 이진 포맷으로, 브라우저와 Node.js 모두 V8이 실행 엔진을 담당한다.
정적 타입 기반이기 때문에 JS 대비 파싱/최적화 단계가 훨씬 짧고,
SIMD 같은 저수준 명령을 직접 노출하여 수치 연산·미디어 처리에서 큰 이점을 낸다.
```

## 핵심 개념
| 개념 | 설명 |
|------|------|
| Module | 컴파일된 WASM 바이너리 (.wasm) |
| Memory | 크기 조정 가능한 ArrayBuffer |
| Table | Memory에 저장되지 않은 참조 타입의 배열 |
| Instance | Module + Memory + Table + 변수로 인스턴스화된 객체 |

## 사용법
```js
const fs = require('node:fs');
const wasmBuffer = fs.readFileSync('/path/to/add.wasm');

WebAssembly.instantiate(wasmBuffer).then(wasmModule => {
  const { add } = wasmModule.instance.exports;
  console.log(add(5, 6));  // 11
});
```

**모듈 생성 방법**: WAT 수동 작성(wabt), Emscripten(C/C++), wasm-pack(Rust), AssemblyScript(TS)

**OS 상호작용**: WASM은 자체적으로 OS에 접근 불가. WASI(WebAssembly System Interface) + Wasmtime 필요.

## V8의 WASM 실행 파이프라인

### Liftoff (베이스라인 컴파일러)
```
V8이 WASM 모듈을 처음 받으면 Liftoff가 한 함수당 한 번의 선형 스캔만으로
빠르게 머신 코드를 생성한다. JS의 Ignition처럼 "일단 빠르게 실행하자" 역할.

- 목표: 시작 지연 최소화 (TurboFan은 수십~수백 ms, Liftoff는 μs~ms 수준)
- 최적화는 거의 하지 않음 — 스택 머신의 명령을 그대로 기계어로 풀어냄
- JS 호출 경계, 트랩 처리 같은 복잡한 로직은 런타임 헬퍼 호출로 위임
```

### Dynamic Tiering
```
Liftoff로 빠르게 시작한 뒤, 실행 프로파일링으로 핫 함수를 감지해
TurboFan이 백그라운드 스레드에서 최적화 코드를 생성한다.

- 핫 함수: Liftoff 코드 → TurboFan 최적화 코드로 교체
- 콜드 함수: 끝까지 Liftoff 코드로 실행 (최적화 비용 절약)
- JS의 Ignition → TurboFan 승격과 철학이 동일하지만, WASM은 타입이 정적이라
  deoptimization이 필요 없음
```

### SIMD (Single Instruction Multiple Data)
```
WASM은 128비트 SIMD 명령 셋을 직접 노출한다. 이미지 필터링, 오디오 처리,
벡터 연산 같은 "같은 연산을 여러 데이터에 동시에" 적용하는 워크로드에서
JS 대비 2~4배 성능 향상이 흔하다.

브라우저/Node.js 모두 런타임 지원 여부를 feature-detect 한 뒤 fallback 경로를
제공해야 한다.
```

### 코드 캐싱
```
V8은 컴파일된 WASM 코드를 디스크에 캐싱하여, 동일 모듈을 재로드할 때
Liftoff 컴파일 단계를 건너뛸 수 있다.

- 브라우저: 서비스 워커 + Cache API로 .wasm 응답 캐싱, V8이 자동으로 컴파일 캐시 재사용
- Node.js: V8의 compile cache가 .wasm 모듈에도 적용되어 재시작 시 시작 시간 단축
```

## 관련 문서
- [[V8|V8 엔진]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
- [[GC-Algorithm|GC 알고리즘]]
