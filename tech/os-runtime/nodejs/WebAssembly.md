---
tags: [runtime, nodejs, wasm]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["WASM", "WebAssembly"]
---

# WebAssembly

WebAssembly(Wasm)는 타입이 명시된 명령과 모듈 구조를 가진 이진 실행 포맷이다. 사람이 읽는 텍스트 표현은 WAT다. C/C++, Rust 등에서 컴파일하거나 WAT를 직접 작성할 수 있다. 특정 CPU의 어셈블리와 달리 엔진이 대상 기계어로 컴파일하며, JS와 호스트 기능은 imports와 exports를 통해 연결한다.

Chrome, Edge와 Node.js의 엔진은 V8, Firefox는 SpiderMonkey, Safari는 JavaScriptCore다. 수치 연산과 기존 네이티브 코드를 가져오는 데 유용하지만, 컴파일 비용, 데이터 이동과 JS 경계 호출 비용까지 포함하면 모든 JS보다 빠르다는 보장은 없다.

## 모듈, 인스턴스와 상태

| 개념 | 역할 |
|---|---|
| `.wasm` | 검증, 컴파일할 모듈의 이진 바이트 |
| `Module` | 컴파일된 코드와 모듈 정보를 나타내는 재사용 가능한 객체 |
| `Instance` | Module에 imports를 연결하고 exports를 제공하는 실행 인스턴스 |
| `Memory` | 선형 바이트 메모리, JS에서는 buffer와 뷰로 접근 |
| `Table` | 함수 등 타입이 정해진 참조의 컬렉션, TypedArray나 Memory의 바이트 배열이 아님 |
| `Global` | 모듈 사이에 가져오거나 내보낼 수 있는 타입이 있는 전역 값 |

하나의 Module로 여러 Instance를 만들 수 있다. 상태는 별도일 수 있지만 같은 imported Memory나 Table을 연결하면 그 상태를 공유한다. 모듈 재사용과 인스턴스 상태 공유를 혼동하지 않는다.

## Node.js에서 사용

다음은 `add` 함수를 export한 `add.wasm`이 있다는 조건의 ESM 예다.

```js
import { readFile } from 'node:fs/promises';

const bytes = await readFile(new URL('./add.wasm', import.meta.url));
const { module, instance } = await WebAssembly.instantiate(bytes, {});
console.log(instance.exports.add(5, 6)); // 11

const another = await WebAssembly.instantiate(module, {});
console.log(another.exports.add(1, 2)); // 3
```

바이트를 `instantiate`하면 `{ module, instance }`, 이미 만든 Module을 전달하면 Instance를 반환한다. 필요한 imports가 없거나 타입이 맞지 않으면 연결에 실패한다. Emscripten(C/C++), wasm-pack(Rust), wabt(WAT 변환) 같은 도구는 서로 다른 언어와 실행 환경을 연결하므로 생성물의 JS wrapper와 runtime 요구사항도 확인한다.

## 브라우저 로딩과 캐싱

```js
const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/compute.wasm'),
  imports,
);
```

Streaming은 다운로드와 컴파일을 겹칠 기회를 준다. 응답 상태, CORS 등 origin 정책, `application/wasm` Content-Type과 CSP를 만족해야 한다. 서버 MIME 설정 오류를 모든 컴파일 오류를 삼키는 fallback으로 감추지 않는다. Streaming API를 제공하지 않는 대상까지 지원할 때는 capability를 확인한 뒤 `arrayBuffer()`와 `instantiate()` 경로를 둔다.

캐시의 대상을 구분한다.

- 서비스 워커나 Cache API는 `.wasm` **응답 바이트**를 보관할 수 있다.
- 브라우저의 **컴파일 코드 캐시**는 엔진과 버전, 자원 식별과 정책에 달린 구현이다. 표준이 cache hit를 보장하지 않는다.
- 같은 프로세스에서 **Module 객체를 재사용**하면 같은 바이트를 매번 다시 컴파일하는 일을 줄일 수 있다. 허용된 worker 간 전달은 structured clone 규칙과 agent cluster 조건을 따른다. Module이 저장용 직렬화나 IndexedDB에서 보편적으로 지원된다고 가정하지 않는다.
- Node.js `module.enableCompileCache()`와 `NODE_COMPILE_CACHE`는 CommonJS, ESM과 TypeScript 모듈용이며 `.wasm`에는 적용되지 않는다.

## 선형 메모리와 JS 뷰

Memory는 64KiB 페이지 단위로 커진다. JS의 `memory.grow(n)`은 성공하면 이전 페이지 수를 반환하고 실패하면 예외를 낼 수 있다. 최대값, 주소 폭과 실제 할당 가능량은 모듈 및 런타임 조건에 따라 달라진다.

기본 고정 길이 `memory.buffer`에 대한 뷰는 메모리 증가 뒤 다시 만들어야 한다. 증가 과정에서 이전 buffer가 분리되거나 뷰가 새 범위를 보지 못할 수 있기 때문이다. 최신 JS API 명세에는 resizable buffer 경로도 있으므로 모든 Memory 증가가 모든 종류의 뷰를 같은 방식으로 처리한다고 단정하지 않는다. 실제 대상 엔진의 API 지원과 shared/non-shared 조건을 확인한다.

```js
const memory = instance.exports.memory;
let view = new Uint8Array(memory.buffer);
memory.grow(1);
view = new Uint8Array(memory.buffer); // 현재 buffer로 갱신
```

C/C++의 allocator가 선형 메모리 안에서 관리하는 객체는 엔진의 JS GC가 개별적으로 `free`하지 않는다. WasmGC의 GC 타입은 엔진과 연결되는 별도의 모델이다. 선형 메모리를 많이 예약했다고 전부 resident memory인 것도 아니며, OOM과 최대 크기 초과를 처리해야 한다.

## V8 실행 계층과 최적화

Liftoff는 함수 명령을 선형으로 처리해 빠르게 baseline 기계어를 만든다. 실행 계층의 명령 dispatch를 없애는 컴파일러이며 JS의 Ignition 인터프리터와 같지는 않다. 지연 컴파일과 dynamic tiering은 시작 비용을 줄이고 자주 실행되는 함수를 최적화 계층으로 올리는 데 쓰인다.

최적화 비용과 생성 코드 크기도 제한된 자원이다. 콜드 함수까지 미리 최고 계층으로 컴파일하는 것이 유리하지 않을 수 있다. V8의 2025년 파이프라인 글은 Wasm 최적화에 Turboshaft를 사용한 전환을 설명한다. 계층 구성과 승격 정책은 엔진 버전의 구현이다.

**Wasm에도 speculative optimization과 deoptimization이 있다.** V8은 Chrome M137부터 WasmGC의 관찰된 호출 대상에 특화된 인라이닝을 지원하도록 역최적화를 도입했다. 가정이 깨지면 저장한 상태로 Liftoff 프레임을 재구성해 중간 실행을 이어간다. 함수를 처음부터 다시 실행해 부수효과를 반복하는 방식이 아니다. 오래된 글의 Wasm은 정적 타입이라 역최적화가 필요 없다는 설명은 현재의 일반 규칙이 아니다.

WasmGC로 기존 언어를 가져올 때는 선형 메모리의 기존 GC/VM을 재사용할지, struct/array 등 GC 타입으로 객체를 내릴지 선택한다. 후자는 엔진 GC와 통합할 수 있지만 언어의 객체 모델, 참조, 예외와 runtime을 함께 설계해야 한다. JS와 Wasm 사이의 참조 순환도 전체 도달 가능성 관점에서 본다.

## i64, SIMD와 호출 경계

JS와 Wasm 사이의 `i64` 값은 `BigInt`로 정확하게 전달한다. Number로 변환하면 큰 정수에서 정밀도를 잃을 수 있다. 옛 도구가 i64를 low/high i32로 분리하던 legalization은 인터페이스 변형과 추가 비용을 만들었다. 오래된 실험 플래그를 현재 실행 요건으로 옮기지 않는다.

SIMD는 `v128` 값의 여러 lane에 한 명령으로 연산하는 방식이다. 여러 스레드에서 일을 나누는 병렬 실행과 다르다. 컴파일러의 자동 벡터화와 명시적 intrinsics는 각각 적용 조건이 있다. 데이터 범위, 마지막에 남는 원소와 alias 조건을 처리하고 스칼라 결과와 의미가 같은지 확인한다. 대상 중 SIMD 미지원 환경이 있으면 feature detection과 fallback을 제공한다. 2022년 Rust nightly 설정, Relaxed SIMD 제안 단계나 당시 벤치마크 배수는 현재의 계약이 아니다.

작은 함수를 매 원소마다 JS에서 호출하는 방식보다 buffer를 전달하고 한 번에 처리하는 방식이 경계 비용을 줄일 수 있다. 복사량과 메모리 소유권까지 포함해 측정한다.

## 비동기 호출과 제어 흐름

JS Promise Integration(JSPI)은 Wasm이 Promise를 반환하는 JS import를 호출했을 때 Wasm 실행을 중단했다가 결과에 따라 재개하도록 한다. 새 API는 `WebAssembly.Suspending`으로 import를 감싸고 `WebAssembly.promising`으로 export를 Promise 반환 함수로 감싼다. 이전 실험 API나 origin-trial 예제를 그대로 적용하지 않고 두 API의 대상 런타임 지원을 확인한다.

이는 Wasm의 동기 형태 코드를 비동기 호스트 작업에 연결하는 장치다. CPU 연산을 자동으로 다른 스레드로 옮기지 않는다. worker 병렬화는 별도 설계다.

Wasm tail call은 명시적인 `return_call` 계열 명령을 사용하는 도구체인과 런타임의 기능이다. 일반 JS 함수가 모두 tail-call 최적화된다는 뜻이 아니며, 제거된 호출 프레임은 예외 stack trace에도 남지 않을 수 있다.

## OS 기능, WASI와 안전 경계

Wasm 코드가 OS 파일이나 네트워크에 접근하려면 호스트가 기능을 제공해야 한다. WASI는 이런 imports의 인터페이스이며 Wasmtime만 필요한 것은 아니다. Node.js에도 `node:wasi`가 있다.

2026-10-01 확인한 Node.js 문서의 WASI API는 experimental이며 `version: 'preview1'` 등을 명시한다. `args`, `env`, `preopens`와 import object는 프로그램에 제공할 권한과 환경을 정한다. 다만 Node.js 문서는 WASI를 안전한 파일 시스템 sandbox나 신뢰할 수 없는 코드의 격리 수단으로 보장하지 않는다고 명시한다. 선형 메모리의 bounds 검사와 호스트 imports에 부여한 OS 권한은 다른 안전 경계다.

디버깅에서 `wasm2wat`은 명령의 텍스트 표현을 보여 주고, decompiler는 읽기 쉬운 고수준 형태를 추정한다. 최적화와 이름 정보 손실 때문에 원래 소스가 그대로 복구되는 것은 아니다.

## 출처

- [SpiderMonkey — Firefox Source Docs](https://firefox-source-docs.mozilla.org/js/index.html)
- [Speculative Optimizations for WebAssembly using Deopts and Inlining — V8](https://v8.dev/blog/wasm-speculative-optimizations)
- [Node.js, Module compile cache](https://nodejs.org/docs/latest/api/module.html#module-compile-cache)
- [Node.js, Node.js with WebAssembly](https://nodejs.org/learn/getting-started/nodejs-with-webassembly)
- [Node.js, WASI](https://nodejs.org/api/wasi.html)
- [WebAssembly, JavaScript Interface](https://webassembly.github.io/spec/js-api/)
- [WebAssembly, Web API](https://webassembly.github.io/spec/web-api/)
- [Liftoff: a new baseline compiler for WebAssembly in V8 — V8](https://v8.dev/blog/liftoff)
- [Dynamic tiering in WebAssembly — V8](https://v8.dev/blog/wasm-dynamic-tiering)
- [Leaving the Sea of Nodes — V8](https://v8.dev/blog/leaving-the-sea-of-nodes)
- [Porting to WebAssembly's Garbage Collector — V8](https://v8.dev/blog/wasm-gc-porting)
- [WebAssembly compilation pipeline — V8](https://v8.dev/docs/wasm-compilation-pipeline)
- [WebAssembly code caching — V8](https://v8.dev/blog/wasm-code-caching)
- [WebAssembly integration with JavaScript BigInt — V8](https://v8.dev/features/wasm-bigint)
- [Fast, parallel applications with WebAssembly SIMD — V8](https://v8.dev/features/simd)
- [Introducing the WebAssembly JavaScript Promise Integration API — V8](https://v8.dev/blog/jspi-newapi)
- [WebAssembly tail calls — V8](https://v8.dev/blog/wasm-tail-call)
- [Decompiling WebAssembly — V8](https://v8.dev/blog/wasm-decompile)

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-GC-and-Memory|V8 메모리 관리]]
- [[V8-Startup-and-Code-Caching|시작 비용과 캐싱]]
- [[Worker-Threads-Core|Worker threads]]
- [[Call-Stack-Heap|콜 스택과 힙]]
- [[GC-Algorithm|GC 알고리즘]]
