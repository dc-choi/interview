---
tags: [runtime, v8, profiling, debugging]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["V8 Tools", "Turbolizer", "V8 System Analyzer", "V8 Runtime Call Stats"]
---

# V8 프로파일링과 진단 도구

함수의 최적화 상태보다 실제 사용자가 기다리는 시간을 먼저 본다. 다운로드와 I/O, 실행 CPU, 컴파일과 GC, 메모리 압박이 서로 다른 원인이다. Sampling profiler의 CPU 비율을 전체 요청 wall-clock 시간으로 해석하지 않는다.

## 재현과 측정 조건

- 입력 크기와 객체 모양, 최초 실행과 warm-up 뒤 실행을 구분한다.
- 런타임 버전, CPU/플랫폼, 빌드와 플래그를 함께 남긴다.
- 평균뿐 아니라 지연 분포와 메모리, 컴파일 비용도 확인한다.
- 샘플의 분모가 전체 tick인지 JS/non-library tick인지 확인한다. C++ 심볼이 안 풀린 경우를 JS 비용으로 몰아가지 않는다.
- 강제 최적화나 비현실적인 반복 횟수로 만든 microbenchmark를 production 결과로 옮기지 않는다.

V8이 Octane 같은 옛 벤치마크를 교체한 이유도 실제 웹의 시작 비용과 프레임 지연을 충분히 반영하지 못했기 때문이다. 특정 벤치마크 향상과 앱의 개선은 별도로 확인한다.

## d8과 내부 플래그

`d8`은 V8 개발자 셸이다. `print`, `read`, `load` 등은 셸이 제공하는 기능이며 브라우저나 Node.js의 표준 API가 아니다. DOM이나 Node.js module loader가 자동으로 생기지 않는다.

```bash
node -p 'process.versions.v8'
node --v8-options
node --trace-opt --trace-deopt app.js
node --prof app.js
node --prof-process isolate-*.log
```

예시는 대상 Node.js가 해당 플래그를 제공하는지 확인한 뒤 사용한다. 내부 플래그와 log schema는 공개 앱 API가 아니다. 실행한 버전과 맞는 parser/tool을 선택하고, 로그의 source 경로와 코드 등 노출할 정보도 고려한다.

`--trace-opt`와 `--trace-deopt`는 tier 전환과 가정 실패를 설명한다. Deopt 횟수만으로 병목을 확정하지 않고 비용이 실제 hot path에서 발생하는지 sampling 결과와 연결한다. Trace 자체가 실행과 메모리 사용을 바꿀 수 있다.

## 공식 웹 도구의 입력과 질문

[V8 Tools](https://v8.github.io/tools/)에서 대상 버전의 도구를 선택한다. `head`는 최신 엔진 로그에 맞는 도구여서 오래된 로그와 항상 호환되지는 않는다. 브라우저 UI만 있어도 로그를 만드는 기능은 대상 V8 빌드에서 제공해야 한다.

| 도구 | 대표 입력 | 확인할 질문 |
|---|---|---|
| System Analyzer | `--log-maps`, `--log-ic`, source logging 등의 `v8.log` | 객체 모양과 IC 전이가 언제 발생했는가 |
| Callstats | Runtime Call Stats 집계, CSV/text/JSON 등 지원 형식 | builtin/runtime 작업의 호출 수와 시간이 어떻게 바뀌었는가 |
| Heap Stats | `--trace-gc-object-stats` 출력 | 특정 GC 시점에 어떤 객체 종류가 얼마를 차지하는가 |
| Heap Layout | `--trace-gc-heap-layout` 출력 | 힙 공간, 페이지와 객체 배치가 어떻게 보이는가 |
| Parse Processor | `--log-function-events` 등 parsing log | 파싱/컴파일 이벤트와 함수 수명에서 비용이 어디에 모이는가 |
| Profview | 전처리한 profiler JSON | 호출 경로의 CPU 샘플이 어느 함수에 집중되는가 |
| Turbolizer | `--trace-turbo`의 함수별 JSON | 최적화 IR과 기계어가 source의 어느 부분에 대응하는가 |
| Zone Stats | `--trace-zone-stats` 출력 | 컴파일러의 native zone 메모리가 어떻게 늘고 줄어드는가 |

Runtime Call Stats는 profiling 지원 빌드의 세부 옵션을 확인한다. 로그 수집법과 지원 형식은 각 UI와 현재 엔진 문서의 설명을 따른다. Heap 통계, GC snapshot과 Zone 통계는 서로 다른 범위이므로 합쳐 process RSS라고 부르지 않는다.

## Turbolizer, Linux perf와 심볼

Turbolizer는 함수의 컴파일 phase, IR graph/block, schedule과 disassembly 사이를 연결한다. 최적화에서 연산이 합쳐지거나 사라졌는지 살펴볼 수 있다. 그래프에서 빠진 노드가 있다고 실행 의미가 빠졌다고 단정하지 않는다.

현재 공식 README는 `.json` trace를 사용하고 로컬 web server에서 UI를 실행하는 방법을 안내한다. Linux perf 기록과 trace를 결합하려면 해당 build의 symbol/disassembler 지원과 같은 실행의 주소 대응을 확보해야 한다. 다른 버전이나 다른 실행의 기계어 주소를 섞지 않는다.

Linux `perf`, GDB의 JIT 지원과 V8 profiler는 질문이 다르다. Native stack과 JIT symbol을 보려면 필요한 perf map/JIT metadata를 생성하고 심볼이 실제로 풀렸는지 확인한다. 시뮬레이터에서 성공한 instruction 실행을 native CPU의 속도로 측정하지 않는다.

## Coverage와 디버깅의 관찰 비용

Best-effort coverage는 이미 모이는 정보의 비용을 활용하지만 GC 뒤 함수 정보가 없어지면 일부를 놓칠 수 있다. Precise coverage는 정확한 계수와 범위를 유지하려고 함수 정보를 보존하고 최적화 정책에 영향을 줄 수 있다. Coverage를 켠 성능이 production과 같다고 가정하지 않는다.

Wasm에서도 profiler나 debugger가 활성화되면 계층과 디버그 코드 정책이 달라질 수 있다. 디버깅 가능한 상태의 속도를 기본 최적화 실행과 구분한다. Source map, source position과 native symbol은 서로 다른 연결 정보다.

V8 Inspector는 breakpoint, CPU/heap profiling 등 디버깅 기능을 호스트에 연결하는 API다. Protocol과 context group, 실행 중 pause 처리도 host가 연결해야 한다. 외부에 노출된 debugger 포트는 앱의 정상 API와 같은 권한 경계로 보지 않는다.

## Error stack trace

V8의 `Error.captureStackTrace`, `Error.stackTraceLimit`, `Error.prepareStackTrace`는 유용하지만 ECMAScript의 공통 stack 형식을 보장하는 API는 아니다. Stack 수집과 `.stack` 문자열 formatting 시점도 구분한다. 사용자 formatting과 CallSite 객체를 쓸 때 각 함수의 값 수명과 예외 가능성을 고려한다.

생성 시점에 수집한 stack과 비동기 호출의 실제 전체 이력은 다르다. V8은 `await`와 일부 Promise 조합 등 재구성 가능한 경로의 async frame을 더할 수 있지만 모든 callback, timer와 queue 이력을 자동으로 복원하는 것은 아니다. 성능과 관찰 가능성 모두 runtime과 flags를 확인한다.

## V8 자체를 빌드하고 조사할 때

공식 source checkout과 `depot_tools`, GN/Ninja 흐름을 따른다. Debug/release build, target CPU와 feature flag가 같은지 먼저 맞춘다. Cross compilation의 sysroot/toolchain과 target simulator는 앱이 production에서 실행될 환경과 구분한다.

테스트도 확인하는 층을 구분한다. Test262는 언어 의미, engine unit/cctest는 내부 API와 구현, inspector 테스트는 디버깅 protocol, stress/fuzz는 GC와 JIT의 특수 상태를 조사한다. 간헐 실패는 반복 재현과 revision bisection으로 범위를 좁히되 실패 확률과 환경 차이를 남긴다. 통과한 suite 하나가 모든 embedding과 OS의 안전성을 증명하지 않는다.

새 기능은 설계 검토, 호환성, 벤치마크와 flag/staging 단계를 거쳐 적용된다. Dev branch의 기능, shipping 여부와 호스트의 포함 버전을 구분한다. 오래된 merge/release 절차의 명령을 현재 브랜치에서 확인 없이 적용하지 않는다.

## 출처

- [V8, Using V8's sample-based profiler](https://v8.dev/docs/profile)
- [V8, Runtime Call Stats](https://v8.dev/docs/rcs)
- [V8, Using Linux perf with V8](https://v8.dev/docs/linux-perf)
- [V8, Using GDB with V8's JIT](https://v8.dev/docs/gdb-jit)
- [V8, Using d8](https://v8.dev/docs/d8)
- [V8, Using the V8 Inspector API](https://v8.dev/docs/inspector)
- [V8, Stack trace API](https://v8.dev/docs/stack-trace-api)
- [V8 Tools](https://v8.github.io/tools/)
- [V8, Turbolizer README (main)](https://chromium.googlesource.com/v8/v8/+/refs/heads/main/tools/turbolizer/README.md)
- [System Analyzer — V8](https://v8.dev/blog/system-analyzer)
- [JavaScript code coverage — V8](https://v8.dev/blog/javascript-code-coverage)
- [Retiring Octane — V8](https://v8.dev/blog/retiring-octane)
- [Real-world performance — V8](https://v8.dev/blog/real-world-performance)
- [V8, Building V8 with GN](https://v8.dev/docs/build-gn)
- [V8, Testing](https://v8.dev/docs/test)
- [V8, Flake bisection](https://v8.dev/docs/flake-bisect)
- [V8, Feature launch process](https://v8.dev/docs/feature-launch-process)

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Ignition-TurboFan|최적화와 역최적화]]
- [[V8-Inline-Cache|IC 진단]]
- [[V8-GC-and-Memory|메모리 진단]]
- [[V8-Startup-and-Code-Caching|시작 비용]]
- [[Debugging-Profiling-Tools|Node.js 진단 도구]]
- [[Debugging-Profiling-Memory|Node.js 메모리 진단]]
