---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Edge Runtime API와 제약", "NextJS-Edge-Runtime"]
---

# Next.js Edge Runtime API와 제약

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## Edge Runtime

기본 server runtime은 Node.js이며 native Node APIs를 제공한다. Edge Runtime은 Web APIs 위주의 제한된 JavaScript 환경이다. 16.3 adapter entrypoint 레퍼런스는 Edge runtime을 deprecated로 표시하고 신규 routes는 Node.js를 안내한다. 오래된 Edge API overview의 Proxy 사용 설명을 현재 모든 Proxy의 필수 runtime으로 해석하지 않는다.

Edge에는 ISR이 없고 Node.js module/native addon이 제한된다. streaming은 양쪽 runtime이 가능하더라도 실제 지원은 deployment adapter에 달린다. Cache Components는 Node.js를 요구하므로 Edge 설정과 함께 사용하지 않는다.

## 지원 API 그룹

| 그룹 | 지원 예 |
| --- | --- |
| network | Blob, fetch, FetchEvent, File, FormData, Headers, Request, Response, URLSearchParams, WebSocket |
| encoding | atob, btoa, TextEncoder/Decoder, EncoderStream/DecoderStream |
| stream | ReadableStream, BYOB/DefaultReader, TransformStream, WritableStream/DefaultWriter |
| crypto | crypto, CryptoKey, SubtleCrypto |
| ECMAScript | Array/Object/Map/Set/WeakMap/WeakSet, Promise, JSON, Reflect/Proxy, RegExp, Symbol, Math, Date, Intl, BigInt |
| buffers | ArrayBuffer/SharedArrayBuffer, typed arrays, DataView, Atomics |
| web globals | AbortController, DOMException, URL/URLPattern, structuredClone, console, timers, queueMicrotask, URI encoding |
| Next polyfill | AsyncLocalStorage |

Web-standard API 이름이 같아도 resource limits, websocket serving과 deployment connectivity가 모두 보장되는 것은 아니다. host 제한을 확인한다. process.env는 dev/build 환경 변수 접근에 사용할 수 있다.

## unsupported APIs

native fs read/write 등 Node.js APIs와 직접 require는 지원하지 않는다. node_modules는 ESM으로 동작하고 native Node APIs에 의존하지 않는 조건에서 사용할 수 있다. eval, new Function(string), WebAssembly.compile과 buffer-source WebAssembly.instantiate 같은 dynamic evaluation은 비활성화된다.

## unstable_allowDynamic

실행되지 않지만 tree shaking으로 제거되지 않는 dynamic eval statement가 있는 dependency는 Proxy config의 unstable_allowDynamic으로 특정 file/glob 검사를 완화할 수 있다. glob은 application root 기준이다. 허용은 build check만 완화하며 실제로 Edge에서 실행하면 runtime error가 난다.

```ts
export const config = {
  unstable_allowDynamic: ['**/node_modules/function-bind/**'],
}
```

## 선택과 검증

해당 dependency의 transitive imports까지 살펴 fs/native addon/CommonJS/dynamic eval을 확인한다. 로컬 Web API 테스트만으로 provider의 Edge compatibility를 확인했다고 말하지 않는다. 플랫폼의 실제 deployed endpoint에서 streaming, abort, external fetch와 crypto를 검사한다. 새로운 개발은 deprecated runtime의 제한을 피할 Node.js 경로를 우선 검토한다.

## 표준 API의 상세 범위

network의 Blob/File은 binary/file, fetch/FetchEvent는 resource fetch/event, FormData는 form, Headers/Request/Response는 HTTP, URLSearchParams는 query key/value, WebSocket은 connection 객체다. encoding의 atob/btoa는 base64 decode/encode, TextDecoder/Encoder는 Uint8Array와 string 변환, TextDecoderStream/TextEncoderStream은 같은 변환을 stream chain으로 제공한다. stream API의 정확한 reader/writer 이름은 ReadableStreamBYOBReader, ReadableStreamDefaultReader, WritableStreamDefaultWriter다. crypto는 platform 기능, CryptoKey는 key, SubtleCrypto는 hash/sign/encrypt/decrypt primitives다.

| 범주 | 상세 API와 의미 |
| --- | --- |
| typed arrays | Int8Array/Int16Array/Int32Array, Uint8Array/Uint8ClampedArray(0~255 clamp)/Uint32Array, Float32Array/Float64Array, BigInt64Array/BigUint64Array |
| binary | ArrayBuffer 고정 raw buffer, SharedArrayBuffer 공유 buffer, DataView buffer view, Atomics atomic operations |
| primitives/collections | Array, Boolean, BigInt 임의 정밀도 정수, Number, String, Object, Map, Set, WeakMap/WeakSet 약한 참조 key |
| function/metaprogramming | Function 객체, Proxy trap, Reflect operation, Symbol unique key, Promise 비동기 완료, RegExp pattern |
| numeric/date/i18n | Infinity, isFinite, isNaN, parseFloat, parseInt radix, Math, Date, Intl |
| errors | Error, EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, DOMException |
| text/URL | encodeURI/decodeURI, encodeURIComponent/decodeURIComponent, URL, URLPattern, URLSearchParams |
| control/utility | AbortController, console, setInterval/clearInterval, setTimeout/clearTimeout, queueMicrotask, structuredClone, JSON |
| wasm | WebAssembly namespace, 단 아래 동적 compile/instantiate 제한 유지 |

Function 객체와 WebAssembly namespace가 있다는 사실은 new Function(source), WebAssembly.compile, buffer-source instantiate 허용을 뜻하지 않는다. unstable_allowDynamic은 string glob 또는 배열을 받으며 /lib/utilities.js 한 파일과 **/node_modules/function-bind/** 패키지 범위 예시가 있다.

## 출처

- [Next.js, app/api-reference/edge](https://nextjs.org/docs/app/api-reference/edge)
- [Next.js, pages/api-reference/edge](https://nextjs.org/docs/pages/api-reference/edge)

## 관련 문서

- [[NextJS-Adapter-Lifecycle]]
- [[NextJS-Config-Rendering]]
