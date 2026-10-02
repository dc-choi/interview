---
tags: [runtime, v8, performance, caching]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["V8 시작 비용", "V8 Code Cache", "V8 Startup Snapshot", "Preparser"]
---

# V8 시작 비용과 코드 캐싱

시작 지연은 다운로드, 스캔과 파싱, 바이트코드 생성, 초기 실행과 후속 최적화가 합쳐진 결과다. 이미 달궈진 함수의 처리량이 높아도 처음 사용하는 화면이나 프로세스 시작이 느릴 수 있다. 콜드 실행, 재방문과 충분히 실행된 상태를 구분해 측정한다.

## 파싱을 미루되 의미를 보존하기

Scanner는 문자를 토큰으로 바꾸고 parser는 문법과 scope를 분석한다. 정규식과 나눗셈의 `/`처럼 문맥에 따라 의미가 달라지는 토큰도 있다. 문자열 검색이나 괄호 개수만으로 JS를 정확히 나눌 수 없다.

V8의 preparser는 나중에 실행할 함수의 완전한 AST와 바이트코드 생성을 미루면서 필요한 문법 검사와 binding/scope 정보를 얻는다. 내부 함수의 정보를 보관하면 나중에 바깥 함수를 파싱할 때 같은 중첩 본문을 여러 번 훑는 비용을 줄일 수 있다. 문법 오류를 무시하고 본문을 건너뛰는 장치가 아니다.

- 지연 컴파일은 사용하지 않는 함수의 초기 CPU와 메모리 비용을 줄인다.
- 처음 호출될 때 컴파일하면 그 순간 지연이 생길 수 있다.
- 처음부터 실행될 함수를 eager하게 컴파일하면 지연을 옮길 수 있지만, 실행하지 않을 함수까지 컴파일하면 낭비한다.

번들 크기만 아니라 초기 경로에 필요한 함수의 수와 실행 시점을 본다. 엔진의 예측과 구현을 유도하려고 문법을 과도하게 바꾸기보다 실제 시작 프로파일을 확인한다.

## Streaming과 백그라운드 컴파일

네트워크로 소스를 받는 동안 파싱이나 컴파일을 시작하면 다운로드와 CPU 작업 일부를 겹칠 수 있다. 독립적인 metadata를 사용해 백그라운드에서 처리하고, JS 힙에 연결하는 최종 작업은 필요한 스레드에서 한다. Streaming, off-thread compilation과 결과 연결은 같은 단계가 아니다.

이 기능을 언제 사용할지는 호스트도 결정한다. Chrome의 script preload와 네트워크 스케줄링 설명을 모든 Node.js loader에 적용하지 않는다. 작은 자원, 캐시된 자원과 이미 메인 스레드가 바쁜 경우에도 효과가 같지 않다.

2025년 Chrome 136에 소개된 `//# allFunctionsCalledOnLoad` 같은 explicit compile hint도 호스트와 버전에 묶인 최적화다. 모든 JS 엔진이 따르는 언어 문법이나 Node.js의 실행 계약이 아니다. 사용 전에 대상에서 적용되는지, 최초 지연 감소가 전체 CPU 증가를 상쇄하는지 확인한다.

## 세 가지 캐시를 구분하기

| 대상 | 재사용하는 것 | 무효화와 주의점 |
|---|---|---|
| 네트워크/자원 캐시 | JS 또는 Wasm 응답 바이트 | HTTP 정책, 자원 URL과 내용 변경 |
| 코드 캐시 | 검증된 소스에 대응하는 엔진의 컴파일 산출물 | 엔진 버전, 플래그, 호스트 정책과 source 일치 |
| Startup snapshot | 초기화된 힙의 직렬화 상태 | 빌드와 runtime 조건, 복원 뒤 다시 정할 상태 |

자원 캐시가 hit여도 파싱이 필요할 수 있다. 코드 캐시가 있어도 실행, imports 연결과 후속 최적화가 모두 없어지는 것은 아니다. 캐시를 생성할 때까지 실행하지 않은 함수는 버전과 생성 시점에 따라 산출물에 충분히 포함되지 않을 수 있다.

V8 코드 캐시 글의 세 번째 방문, 1KiB 이상, 보관 시간 같은 기준은 당시 Chrome 정책의 설명이다. 영구 공개 API의 임계값으로 삼지 않는다. 안정된 코드와 자주 바뀌는 코드를 나누면 재사용에 도움이 될 수 있지만, 번들 수 증가와 요청/초기 실행 비용도 함께 본다.

사용자 입력이 있는 초기화나 외부 I/O를 cache 생성용 실행에 섞지 않는다. 캐시를 만드는 과정에서 코드를 실행한다면 부수효과도 발생한다.

## Startup snapshot과 runtime 초기화

Snapshot은 parser와 초기 JS 실행을 통해 만들어진 객체 상태를 복원해 시작 비용을 줄인다. 코드 캐시와 달리 초기화된 힙을 가져오는 방법이다. V8 embedder와 Node.js의 snapshot 기능은 각 호스트의 API와 제한을 따른다.

복원된 상태에 그대로 둘 값과 runtime마다 정할 값을 나눈다.

- 순수한 lookup table이나 초기 함수/객체 구조는 재사용 후보다.
- 파일 descriptor, socket과 외부 포인터의 연결은 snapshot 바이트만으로 유효한 OS 자원이 되지 않는다.
- 시간, 난수, 환경별 설정과 비밀은 snapshot 생성 시점의 값이 고정되거나 배포물에 남을 수 있다. 복원 뒤 초기화할 경계를 둔다.
- native binding과 외부 참조는 embedder의 직렬화/복원 계약을 따라 연결한다.

2015년 custom snapshot 글의 typed array 제약 같은 옛 제한을 현재 API 전체의 제한으로 옮기지 않는다. Snapshot으로 절약할 초기화 비용과 snapshot 크기, 배포 호환성, 생성 비용을 함께 비교한다.

## 코드 메모리와 공유

Embedded builtins는 엔진 builtin의 위치 독립적인 기계어를 실행 파일에 넣고 여러 isolate가 재사용하도록 한 설계다. 변경 가능한 JS 객체가 전부 isolate 간 공유된다는 뜻은 아니다. 2021년 short builtin calls 글처럼 호출 거리를 줄이려고 코드를 복제하면 CPU 효율과 메모리 공유 사이에 교환이 생긴다.

2024년 static roots는 고정된 read-only 힙 배치를 이용해 일부 root 참조와 객체 종류 확인을 상수나 범위 검사로 줄이는 설계다. 여기서 고정은 압축 포인터/cage 내부의 배치다. ASLR과 무관하게 프로세스의 절대 주소가 같다는 뜻도, 객체 주소 숫자가 앱 API라는 뜻도 아니다.

실행되지 않는 코드의 bytecode와 feedback, source position 정보를 늦게 만들거나 버리는 정책도 메모리를 줄인다. 다시 쓰면 재생성 비용이 들고, 디버거와 profiler가 켜져 있을 때는 보존 요구가 달라질 수 있다. V8 Lite의 2019년 결과를 오늘의 기본값이나 모든 워크로드의 절감 비율로 해석하지 않는다.

## 적용 판단

1. 실제 초기 경로를 기록하고 다운로드, 파싱/컴파일, JS 실행을 구분한다.
2. 캐시 없는 최초 실행과 자원/코드 캐시가 가능한 재실행을 따로 비교한다.
3. 잘 쓰이지 않는 코드의 지연 로딩과 초기 필수 코드의 준비 시점을 검토한다.
4. 변경 후 시작 지연뿐 아니라 전체 CPU, 메모리와 재방문 성능도 확인한다.

## 출처

- [Blazingly fast parsing, part 1: optimizing the scanner — V8](https://v8.dev/blog/scanner)
- [Blazingly fast parsing, part 2: lazy parsing — V8](https://v8.dev/blog/preparser)
- [Background compilation — V8](https://v8.dev/blog/background-compilation)
- [The cost of JavaScript in 2019 — V8](https://v8.dev/blog/cost-of-javascript-2019)
- [Giving V8 a heads-up: faster JavaScript startup with explicit compile hints — V8](https://v8.dev/blog/explicit-compile-hints)
- [Code caching for JavaScript developers — V8](https://v8.dev/blog/code-caching-for-devs)
- [Improved code caching — V8](https://v8.dev/blog/improved-code-caching)
- [Custom startup snapshots — V8](https://v8.dev/blog/custom-startup-snapshots)
- [Embedded builtins — V8](https://v8.dev/blog/embedded-builtins)
- [Short builtin calls — V8](https://v8.dev/blog/short-builtin-calls)
- [Static roots: objects with compile-time constant addresses — V8](https://v8.dev/blog/static-roots)
- [V8 Lite — V8](https://v8.dev/blog/v8-lite)
- [Lazy deserialization — V8](https://v8.dev/blog/lazy-deserialization)

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Ignition-TurboFan|실행 계층]]
- [[V8-GC-and-Memory|메모리 관리]]
- [[V8-Profiling-and-Tooling|진단 도구]]
- [[WebAssembly|Wasm 로딩과 캐싱]]
