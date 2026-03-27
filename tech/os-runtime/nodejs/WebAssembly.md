---
tags: [runtime, nodejs]
status: note
category: "OS & Runtime"
aliases: ["WASM"]
---

# WebAssembly

## 개요
```
WebAssembly(WASM)는 C/C++, Rust, AssemblyScript 등에서 컴파일 가능한 고성능 어셈블리 언어.
Chrome, Firefox, Safari, Edge, Node.js에서 지원.
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
