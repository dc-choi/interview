---
tags: [runtime, nodejs, native-addon, n-api, node-api, c++, ffi]
status: done
category: "OS & Runtime"
aliases: ["Native Addons", "N-API", "Node-API", "C++ Addons", "node-addon-api"]
---

# Node.js Native Addons (Node-API · C++ Addons)

JavaScript 코드에서 **C/C++/Rust로 작성한 네이티브 코드를 직접 호출**하는 메커니즘. `require()`로 로드되는 동적 라이브러리(`.node`)로 배포되며, V8·libuv가 제공하지 못하는 시스템 호출·고성능 연산·기존 C 라이브러리 통합에 사용.

## 왜 필요한가

| 용도 | 예 |
|------|-----|
| 기존 C/C++ 라이브러리 바인딩 | OpenSSL·libxml2·OpenCV·SQLite |
| 성능이 결정적인 hot path | 암호화·이미지 처리·압축·시리얼라이즈 |
| 시스템 호출·하드웨어 접근 | GPIO·USB·시리얼 포트 |
| 기존 코드 자산 활용 | 회사 내부 C/C++ 코어 라이브러리 |

JS 자체로 충분한 케이스에 도입하면 빌드·배포 복잡도만 증가 — 진짜 필요할 때만.

## 3가지 접근 방식

| 방식 | API | 안정성 | 권장도 |
|------|-----|-------|-------|
| **V8 직접 사용** (구식) | V8 C++ API (`Local<Value>`, `Isolate`) | 버전마다 깨짐 | ✗ |
| **Node-API (구 N-API)** | C ABI 안정 인터페이스 | **메이저 버전 호환** | ✅ 표준 |
| **node-addon-api / napi-rs** | Node-API 위의 C++/Rust 래퍼 | Node-API와 동일 | ✅ 권장 |

V8 API는 Node.js 메이저 버전마다 재컴파일 필요 → 패키지 사용자가 새 버전마다 리빌드. Node-API는 **ABI 안정** — 한 번 빌드하면 이후 버전에서도 동작.

## Node-API (Node-API, 구 N-API)

C ABI 기반으로 V8·JerryScript·다른 엔진에 독립적인 인터페이스. v8.12부터 안정화.

```c
#include <node_api.h>
napi_value Method(napi_env env, napi_callback_info info) {
  napi_value result;
  napi_create_string_utf8(env, "Hello", NAPI_AUTO_LENGTH, &result);
  return result;
}
```

| 측면 | 의미 |
|------|------|
| `napi_env` | 호출 컨텍스트 (Isolate 추상화) |
| `napi_value` | JS 값의 핸들 (V8 `Local<Value>` 추상화) |
| `napi_callback_info` | 인자·this 정보 |
| 누적 버전 | v3 지원하면 v1·v2도 자동 지원 |

ABI 안정성 = **prebuild 배포 가능** — 사용자 머신에서 컴파일 안 해도 됨.

## node-addon-api (C++ 래퍼) — 표준

Node-API의 C 인터페이스는 verbose. **node-addon-api**는 RAII·예외 기반 C++ 래퍼:

```cpp
#include <napi.h>
Napi::String Method(const Napi::CallbackInfo& info) {
  return Napi::String::New(info.Env(), "Hello from C++");
}
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("hello", Napi::Function::New(env, Method));
  return exports;
}
NODE_API_MODULE(addon, Init)
```

장점: 자동 메모리 관리, 예외→ JS Error 변환, RAII 패턴. Node-API의 ABI 안정성 그대로 유지.

## napi-rs — Rust 대안

Rust + Node-API 조합. memory-safe + zero-cost 추상화:

```rust
use napi_derive::napi;
#[napi]
fn hello(name: String) -> String {
  format!("Hello, {}", name)
}
```

빌드 도구가 cross-compile + prebuild 제공. `parcel`·`swc`·`rspack`이 핵심에 napi-rs 사용.

## 빌드 시스템

| 도구 | 특징 |
|------|------|
| **node-gyp** | Python 기반 GYP, 표준 (오래됨) |
| **cmake-js** | CMake 기반, 모던 |
| **prebuildify** | 사전 빌드 바이너리를 패키지에 포함 |
| **node-pre-gyp** | S3·GitHub Releases에서 prebuild 다운로드 |
| **napi-rs cli** | Rust 환경, GitHub Actions 통합 cross-compile |

`binding.gyp` (node-gyp) 예:
```python
{
  "targets": [{
    "target_name": "addon",
    "sources": ["addon.cc"],
    "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
    "cflags": ["-fexceptions"], "cflags_cc": ["-fexceptions"]
  }]
}
```

## 배포 — Prebuild 패턴

사용자가 `npm install` 시 빌드하면:
- 빌드 도구(Python·C++ 컴파일러) 필요 → CI·서버리스 환경에서 실패 빈번
- 시간 소요 (수십 초~분)

**Prebuild** 패턴:
1. CI에서 OS·아키텍처·Node 버전별로 미리 빌드 (`linux-x64`, `darwin-arm64`, `win32-x64` ...)
2. GitHub Releases / S3 / npm 패키지에 동봉
3. 설치 시 OS·아키텍처 매칭하는 prebuild 다운로드, 없으면 fallback 빌드

| 도구 | 역할 |
|------|------|
| `prebuildify` | 패키지 자체에 prebuild 포함 (오프라인 설치 가능) |
| `node-pre-gyp` | 외부 저장소에서 다운로드 |
| `napi-rs` | GitHub Actions matrix로 cross-compile + npm 자동 배포 |

## 라이프사이클·예외·메모리

- **메모리**: napi handle은 callback scope 안에서만 유효. 장기 보관은 `napi_create_reference`로 weak/strong 참조
- **예외**: C++ throw → `napi_throw`로 JS Error 발행. node-addon-api는 자동 변환
- **GC**: V8 GC가 native 객체를 회수하려면 `Napi::ObjectWrap` + finalizer 등록
- **비동기**: `napi_async_work`로 libuv 스레드풀에서 실행, 완료 시 메인 스레드로 콜백
- **AsyncResource**: async_hooks와 통합되어 추적 가능

## 흔한 시나리오

| 패턴 | 도구 |
|------|------|
| 기존 C 라이브러리 바인딩 | node-addon-api + node-gyp |
| 성능 hot path 신규 작성 | napi-rs (Rust 안전성) |
| 사내 C++ 코어 통합 | node-addon-api + cmake-js |
| 서버리스·컨테이너 배포 | prebuildify로 빌드 의존성 제거 |

## 흔한 실수

- **V8 C++ API 직접 사용** — Node 버전마다 재컴파일·코드 수정. Node-API로 마이그레이션
- **prebuild 없이 npm 배포** — 설치 환경(서버리스·alpine·Windows)에서 빌드 실패. CI matrix로 prebuild 강제
- **napi handle을 callback 밖으로 누출** — invalid handle. reference 사용
- **finalizer 누락** — JS GC됐는데 native 메모리 안 풀림. `Napi::ObjectWrap`의 destructor 정의
- **동기 API로 무거운 작업** — Event Loop 블로킹. `AsyncWorker`로 libuv 스레드풀 활용
- **Node-API 버전 미선언** (`napi_versions` 필드) — 최신 Node에서만 동작
- **OS·아키텍처 prebuild 누락** — Apple Silicon (`darwin-arm64`)·musl alpine·Windows 빠뜨림

## Node-API vs FFI vs WebAssembly

| 측면 | Node-API | node-ffi-napi | WebAssembly |
|------|----------|---------------|-------------|
| 컴파일 | 네이티브 빌드 필요 | 동적 .so/.dll 호출 | wasm 모듈 |
| 성능 | 가장 빠름 | 호출 오버헤드 큼 | JIT/AOT, 빠름 |
| 이식성 | OS·arch별 prebuild | 동적 라이브러리 의존 | 한 번 빌드, 어디서든 |
| 메모리 안전 | C/C++ 위험 | C/C++ 위험 | sandbox 격리 |
| 배포 단순성 | prebuild 필요 | 라이브러리 동봉 | 단일 wasm 파일 |

새 코드라면 **WebAssembly**가 이식성·안전성에서 우월 ([[WebAssembly]]). 기존 C++ 자산 통합·시스템 호출은 Node-API.

## 면접 체크포인트

- V8 직접 사용 vs Node-API의 ABI 안정성 차이
- node-addon-api·napi-rs가 표준이 된 이유 (verbose 회피·메모리 안전)
- node-gyp vs cmake-js·prebuildify·node-pre-gyp 빌드 도구 분류
- prebuild 패턴이 npm 설치 실패를 막는 메커니즘
- napi handle scope·finalizer로 GC와 native 메모리 매칭
- Node-API vs WebAssembly 선택 기준
- napi 비동기 API로 Event Loop 블로킹 회피

## 출처
- [Node.js 아키텍처 학습 메모]

## 관련 문서
- [[Node.js|Node.js 개관]]
- [[V8|V8 엔진]]
- [[libuv|libuv]]
- [[Module-System|모듈 시스템]]
- [[Package-Publishing|npm 패키지 배포]]
- [[WebAssembly|WebAssembly]]
- [[Worker-Threads|Worker Threads]]
