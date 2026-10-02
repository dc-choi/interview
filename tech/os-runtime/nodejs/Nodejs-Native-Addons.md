---
tags: [runtime, nodejs, native-addon, node-api, c++, ffi]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["Native Addons", "N-API", "Node-API", "C++ Addons", "node-addon-api"]
---

# Node.js Native Addons

네이티브 애드온은 JavaScript에서 C/C++/Rust로 만든 코드를 호출하는 동적 라이브러리다. 보통 `.node` 바이너리와 이를 로드하는 JavaScript 진입점을 npm 패키지로 배포한다. 기존 네이티브 라이브러리, 시스템 기능, 측정으로 확인한 연산 병목을 연결할 때 사용한다.

네이티브 구현도 같은 스레드에서 오래 실행하면 이벤트 루프를 막는다. 언어 변경만으로 비동기 실행이나 성능 향상이 보장되지는 않는다. 데이터 복사, 언어 경계 호출, 빌드와 배포 비용까지 비교해야 한다.

## API와 ABI

API는 소스 코드의 호출 계약이고 ABI는 컴파일된 코드가 연결되는 계약이다. 헤더가 같아 보여도 타입 배치나 호출 규약이 달라지면 기존 바이너리를 그대로 쓸 수 없다.

| 접근 | 계약과 제약 |
|---|---|
| V8/Node C++ API 직접 사용 | 내부 기능에 접근할 수 있지만 Node/V8 변화에 따라 소스 수정이나 재빌드가 필요할 수 있다. |
| Node-API | 엔진 내부에서 분리한 C API다. 지원되는 안정 API 버전을 대상으로 하면 Node 메이저 버전 사이에도 ABI 호환성을 활용할 수 있다. |
| node-addon-api | Node-API를 감싼 C++ 래퍼다. 래퍼의 소스 호환성과 Node-API의 바이너리 호환성은 구분한다. |
| Rust 바인딩 | napi-rs 같은 도구로 Node-API를 사용한다. FFI와 `unsafe` 경계까지 메모리 안전이 자동 보장되지는 않는다. |

Node-API 바이너리를 재사용하려면 대상 런타임이 요구 Node-API 버전을 지원해야 한다. OS, CPU 아키텍처, libc와 외부 네이티브 라이브러리의 ABI도 맞아야 한다. 실험 API와 직접 사용한 V8 API에는 같은 안정성 보장을 적용하지 않는다.

## 호출 경계

- `napi_env`는 특정 Node 실행 환경에 속한다. Worker마다 환경이 다르므로 다른 Worker로 전달해 쓰지 않는다.
- `napi_value`는 JavaScript 값의 핸들이다. 장기간 보관할 값은 reference와 명시적인 수명 관리를 사용한다.
- `napi_callback_info`에서 인자와 수신 객체를 얻는다. 타입과 범위 검사는 네이티브 함수 진입 시 수행한다.
- C Node-API는 상태 코드를 반환한다. C++ 래퍼의 예외 처리 방식은 빌드 설정에 따라 달라진다.

```cpp
#include <napi.h>

Napi::String Hello(const Napi::CallbackInfo& info) {
  return Napi::String::New(info.Env(), "Hello from C++");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("hello", Napi::Function::New(env, Hello));
  return exports;
}

NODE_API_MODULE(addon, Init)
```

`Init`는 exports를 구성해 반환하고 `NODE_API_MODULE`이 초기화 함수를 등록한다. JavaScript 진입점은 바이너리 로드와 공개 API를 담당한다. 실제 빌드 설정은 [[Native-Addon-Build|빌드와 배포]]를 따른다.

## 객체와 비동기 작업

`Napi::ObjectWrap`은 JavaScript 인스턴스와 네이티브 객체를 연결한다. 클래스 정의, 생성자, 메서드를 등록하고 인스턴스별 상태를 네이티브 객체에 둔다. 소멸자는 소유 자원을 해제하지만, GC가 임의의 외부 자원 사용 시점까지 알아서 조정해 주지는 않는다.

유한한 백그라운드 연산은 `AsyncWorker`, 네이티브 스레드의 연속 이벤트는 thread-safe function을 검토한다. JavaScript 객체 접근은 해당 환경의 JavaScript 스레드에서 수행한다.

- [[Native-Addon-Lifetime|핸들, reference, 환경별 상태와 종료]]
- [[Native-Addon-Async|AsyncWorker, 취소와 thread-safe function]]

## 선택 기준

| 방식 | 유리한 조건 | 확인할 비용 |
|---|---|---|
| JavaScript | 현재 처리량과 지연 요구를 만족한다. | 이벤트 루프 점유와 메모리 |
| Node-API | 기존 라이브러리나 호스트 기능을 긴밀하게 연결한다. | 플랫폼별 바이너리, 메모리 안전, 수명 관리 |
| FFI | 기존 공유 라이브러리의 비교적 단순한 C 인터페이스를 호출한다. | 타입 마샬링, 라이브러리 설치, 콜백과 스레드 계약 |
| WebAssembly | 호스트 의존성을 제한한 연산을 여러 실행 환경에 배포한다. | 지원 기능, imports/WASI, 데이터 전달과 성능 측정 |

한 방식이 항상 가장 빠르거나 배포가 가장 간단하지는 않다. 입력 크기와 호출 빈도를 포함한 실제 부하로 비교한다. Rust 도구를 선택해도 플랫폼 지원과 네이티브 라이브러리 의존성 검토는 남는다.

## 출처

- [Node.js, ABI stability](https://nodejs.org/learn/modules/abi-stability)
- [Node.js, Node-API getting started](https://nodejs.org/learn/node-api/getting-started)
- [Node.js, Your first project](https://nodejs.org/learn/node-api/getting-started/your-first-project)
- [Node.js, ObjectWrap](https://nodejs.org/learn/node-api/getting-started/objectwrap)
- [Node.js, Node-API](https://nodejs.org/api/n-api.html)

## 관련 문서

- [[Node.js|Node.js 개관]]
- [[Native-Addon-Build|애드온 빌드와 배포]]
- [[Native-Addon-Lifetime|애드온 수명 관리]]
- [[Native-Addon-Async|애드온 비동기 처리]]
- [[Package-Publishing|npm 패키지 배포]]
- [[WebAssembly]]
- [[Worker-Threads]]
