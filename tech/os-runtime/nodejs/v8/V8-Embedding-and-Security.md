---
tags: [runtime, v8, embedding, security]
status: done
verified_at: 2026-10-02
category: "OS & Runtime"
aliases: ["V8 Embedder", "V8 Sandbox", "V8 Torque", "CodeStubAssembler"]
---

# V8 임베딩과 안전 경계

V8을 앱 안에 넣는 embedder는 JS 실행 엔진뿐 아니라 OS 기능, 실행 스케줄과 자원 수명을 연결해야 한다. V8만 넣는다고 Node.js, DOM, 파일 API와 네트워크 이벤트 루프가 생기지 않는다. 공개 C++ API도 V8 버전과 빌드 configuration에 맞춰 사용한다.

## Isolate, Context와 호스트

| 개념 | 책임 |
|---|---|
| Isolate | 독립적인 VM 실행 상태와 힙을 관리하는 엔진 단위 |
| Context | global object와 내장 객체 등 실행 환경을 갖는 JS realm |
| Embedder | native callback, 외부 자원, task와 microtask 정책을 연결 |
| OS/process sandbox | 주소 공간과 OS 권한 수준에서 신뢰 경계를 제한 |

같은 isolate의 context는 힙을 공유할 수 있으며 isolate나 context를 만드는 것만으로 OS 권한의 보안 격리가 완성되지 않는다. Native callback에 파일이나 네트워크 권한을 주면 JS에서 그 기능을 호출할 수 있다. Template, accessor와 internal field는 객체 연결 장치이지 독립적인 보안 장치가 아니다.

호스트는 foreground/background task 처리, Promise microtask checkpoint, 종료 시 남은 작업과 thread 수명을 함께 설계한다. 자동 microtask 정책인지 명시적 checkpoint 정책인지 확인하고 두 방식을 섞어 순서를 추정하지 않는다. 신뢰할 수 없는 실행에 대해서는 CPU, 메모리와 노출할 기능의 제한도 필요하다.

## Handles와 객체 수명

V8 GC는 객체를 이동시킬 수 있다. Handle은 GC와 연결된 객체 참조이며, 살아 있는 강한 handle은 객체를 GC root에서 도달 가능하게 만들 수 있다. Direct handle 빌드 여부에 따라 내부 표현이 달라지므로 모든 handle을 고정된 간접 포인터 구조로 가정하지 않는다.

- `HandleScope`의 Local handle은 scope 수명을 따른다. scope가 끝났다고 해당 객체가 즉시 GC되는 것은 아니다.
- Local handle을 함수 밖에 반환해야 하면 `EscapableHandleScope` 등 API의 반환 계약을 따른다.
- 장기 보관하는 Persistent/Global handle은 더 이상 필요하지 않을 때 `Reset()` 등으로 해제한다. Native 저장소에서 계속 보유하면 객체가 남을 수 있다.
- GC 관리 밖의 native 자원 수명과 JS 객체 수명을 연결할 때 약한 참조와 finalizer만으로 즉각적인 정리를 보장하지 않는다.

`MaybeLocal`/`Maybe` 반환과 예외 발생 가능성을 처리한다. API 호출이 user JS를 실행하면 재진입, 예외와 GC가 일어날 수 있으므로 호출 전의 주소나 객체 모양 가정을 그대로 사용하지 않는다.

## Builtin 작성: CSA와 Torque

CodeStubAssembler(CSA)는 V8의 저수준 기계 연산 IR을 이용해 portable builtin을 만드는 인터페이스다. JS와 C++ 사이의 호출 비용이나 일반 경로의 불필요한 검사를 줄이는 데 쓰인다. 엔진 내부 구현이며 앱에서 쓰는 JS 라이브러리 API가 아니다.

Torque의 `.tq`는 타입, 객체 layout과 builtin 흐름을 표현하고 CSA/C++ 코드를 생성하는 언어다. TypeScript와 닮은 표기가 있어도 TypeScript 코드가 아니다. `constexpr` 등 빌드 시 처리와 runtime 처리의 차이를 이해해야 한다.

낮은 수준의 최적화에는 안전성 책임이 따른다. 배열 builtin 등이 callback을 호출한 뒤에는 length, backing store와 모양이 바뀌었는지 다시 확인해야 한다. Loop 안의 빠른 raw 접근과 재진입 가능한 JS 호출을 같은 가정으로 처리하면 안 된다. 생성 코드 크기와 인라이닝 증가도 instruction cache와 컴파일 비용에 영향을 준다.

## V8 sandbox가 다루는 위협

2026-10-01 확인한 V8 main의 sandbox README는 공격자가 sandbox 내부 메모리를 임의로, 동시에 읽고 쓸 수 있다고 가정한다. 이 메모리 손상을 cage 밖의 임의 메모리 쓰기로 확장하지 못하도록 하는 것이 핵심 경계다. Offset 기반 sandboxed pointer와 external pointer table 등의 간접 참조로 외부 주소를 보호한다.

현재 threat model은 **하드웨어 side channel 등에 의한 sandbox 밖 읽기도 가정**한다. 따라서 내부 손상을 제한하는 sandbox가 프로세스 안의 모든 비밀 읽기를 막는다고 쓰지 않는다. 이는 OS process sandbox를 보완하는 엔진 내부의 소프트웨어 경계다. Context의 의미상 분리와도 다르다.

- 실제 활성화는 `v8_enable_sandbox` 등 빌드 조건을 확인한다. 지원되는 64비트 구성에서의 기본값을 모든 Node.js 바이너리의 활성화 사실로 확대하지 않는다.
- 큰 가상 주소 공간 예약은 그 크기 전체의 RAM 사용을 뜻하지 않는다.
- Sandbox 테스트의 memory-corruption API와 crash filter는 공격 가능성을 검증하는 개발용 장치다. Production API나 사용자 입력 방어로 제공하는 기능이 아니다.

Sandbox를 활성화해도 native binding의 권한, resource exhaustion과 앱 로직의 취약점은 별도로 다룬다. 메모리 손상의 containment와 안전한 호스트 API 설계를 함께 본다.

## JITless, 실행 메모리와 control flow

2019년 JITless는 runtime에 실행 가능한 메모리를 할당하지 않는 환경에서도 JS를 실행하려고 소개됐다. 기계어 생성을 제한하면 일부 공격 경로와 실행 환경의 제약을 줄일 수 있지만 parser, interpreter, GC와 native callback의 오류가 사라지는 것은 아니다. 당시의 Wasm 사용 제한도 그 시점의 구현 설명이다.

W^X는 writable/executable page 조건을 제한하고, control-flow integrity는 간접 분기나 return이 허용된 대상으로 향하는지 검사한다. 플랫폼별 pointer authentication 등과 V8 sandbox는 서로 다른 층을 보호한다. CPU speculative execution의 Spectre 위험까지 한 장치로 해결됐다고 단정하지 않는다. 어떤 방어가 실제 배포 빌드에 켜졌는지 확인한다.

2022년 temporal-memory-safety 글의 quarantine과 scan 실험은 해제된 C++ 메모리의 재사용을 늦추고 참조를 조사하는 접근이다. GC 대상 JS 객체의 회수와 다르며, 연구 결과나 prototype 설정을 현재 V8의 production 보장으로 옮기지 않는다.

## 배포와 버전 경계

V8의 버전 숫자와 Chrome milestone, Node.js 버전은 서로 다른 식별자다. 최신 Chrome 기능이 현재 설치된 Node.js에도 들어 있다고 추정하지 않는다. `process.versions.v8`와 해당 Node.js 릴리스의 빌드 조건을 확인한다.

기능 소개의 지원 표시는 구현 환경별로 읽는다. Babel을 통한 syntax 변환과 runtime API의 polyfill은 다른 지원 방식이다. Chrome의 지원 표시도 Node.js에 해당 API와 호스트 기능이 제공된다는 뜻은 아니다. 외부 C++ Doxygen의 `head` 역시 설치한 Node.js의 bundled V8 헤더와 구분한다.

V8의 공식 지원 문서가 보장하는 범위와 community port를 구분한다. 시뮬레이터에서 instruction 동작을 확인한 결과는 실제 기기의 성능과 같지 않다. Embedding header, ICU 데이터, external references와 snapshot 산출물이 같은 빌드 계약을 따르는지 확인한다. 보안 수정은 해당 호스트의 업데이트 경로와 함께 적용한다.

## 출처

- [V8, Getting started with embedding V8](https://v8.dev/docs/embed)
- [V8, V8 API](https://v8.dev/docs/api)
- [V8, Built-in functions](https://v8.dev/docs/builtin-functions)
- [V8, CodeStubAssembler builtins](https://v8.dev/docs/csa-builtins)
- [V8, V8 Torque](https://v8.dev/docs/torque)
- [V8, Torque builtins](https://v8.dev/docs/torque-builtins)
- [Introducing the V8 Sandbox — V8](https://v8.dev/blog/sandbox)
- [V8, Sandbox README (main, 2026-10-01 확인)](https://chromium.googlesource.com/v8/v8/+/refs/heads/main/src/sandbox/README.md)
- [JIT-less V8 — V8](https://v8.dev/blog/jitless)
- [Control-flow Integrity in V8 — V8](https://v8.dev/blog/control-flow-integrity)
- [Retrofitting temporal memory safety on C++ — V8](https://v8.dev/blog/retrofitting-temporal-memory-safety-on-c++)
- [V8, Untrusted code mitigations](https://v8.dev/docs/untrusted-code-mitigations)
- [V8, Official support](https://v8.dev/docs/official-support)
- [V8, Version numbers](https://v8.dev/docs/version-numbers)
- [V8, Node.js integration](https://v8.dev/docs/node-integration)
- [V8, Feature support](https://v8.dev/features/support)
- [V8, Local handle API](https://v8.github.io/api/head/classv8_1_1Local.html)

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Cpp-API|C++ API의 수명과 실패 처리]]
- [[V8-GC-and-Memory|GC와 native 메모리]]
- [[V8-Startup-and-Code-Caching|Snapshot과 초기화]]
- [[V8-Profiling-and-Tooling|빌드와 진단]]
- [[Nodejs-Native-Addons|Node.js native addons]]
- [[WebAssembly|Wasm의 호스트 연결과 안전 경계]]
