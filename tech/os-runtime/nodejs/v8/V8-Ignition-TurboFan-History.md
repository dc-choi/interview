---
tags: [runtime, nodejs, v8]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["V8 Pipeline History", "V8 파이프라인 변천", "JavaScript 엔진 계층 비교", "WarpMonkey", "IonMonkey"]
---

# V8 파이프라인의 변천과 다른 엔진 비교

[[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]에서 분리한 역사와 엔진 비교다. 현재 계층의 동작은 부모 문서에 있다. 계층 이름과 승격 기준은 계속 바뀌므로 개별 구현보다 어떤 간극을 메우려고 계층이 추가되고 교체됐는지를 본다.

## 5.9 이전 (Full-codegen + Crankshaft)

- **Full-codegen**: 실행 직전에 AST에서 곧바로 비최적화 기계어를 만드는 baseline 컴파일러 (지금의 Sparkplug에 가까운 자리). 컴파일은 빨랐지만 한 번만 실행되는 코드도 기계어로 남아, Ignition 이전에는 이 코드가 Chrome JavaScript 힙의 거의 3분의 1을 차지했다.
- **Crankshaft**: 별도 스레드에서 프로파일러가 수집한 hot 코드를 최적화 (TurboFan 역할). JavaScript의 일부만 최적화할 수 있었고 `try`, `catch`, `finally`를 쓰는 코드는 최적화하도록 설계되지 않았다.
- 스레드 구성: 메인(컴파일+실행), 프로파일러(실행 시간 측정), 별도 컴파일 스레드

## 5.9 (2017년 5월 발표, Chrome 59 stable)

- **Ignition이 Full-codegen을 대체**: 원래 목적은 모바일 기기의 메모리 절감이었다. 바이트코드는 같은 코드의 baseline 기계어의 25~50% 크기다. 2016년 Chrome 53에서 RAM 512MB 이하 Android 기기에 먼저 켜자 ARM64 모바일 기기에서 비최적화 코드가 차지하는 메모리가 9분의 1로 줄었다. 바이트코드 생성이 Full-codegen의 기계어 생성보다 빨라 스크립트 시작과 페이지 로드도 개선됐다.
- **TurboFan이 Crankshaft를 대체**: Crankshaft는 새 언어 기능을 넣을 때마다 지원 플랫폼(2017년 기준 9개)별 코드를 써야 했고, 칩 아키텍처마다 1만 줄 넘는 코드를 유지했다. TurboFan은 ES5뿐 아니라 ES2015 이후 계획된 기능까지 최적화하도록 처음부터 설계됐다.
- **계층화로 확장성 확보**: 고수준과 저수준 최적화를 계층으로 나누고 명시적인 instruction selection 단계를 둬 아키텍처별 코드를 크게 줄였다. 2015년 V8 블로그 기준 TurboFan은 당시 지원한 7개 아키텍처 각각에 3,000줄 미만의 플랫폼별 코드만 필요했고, Crankshaft는 13,000~16,000줄이었다.
- 효과(2017년 발표 기준): Speedometer 5~10% 향상, Node.js 서버 벤치마크 AcmeAir 10% 넘게 향상, Chrome 59에서 데스크톱과 고사양 모바일의 V8 메모리 5~10% 감소.
- 전환 방식: 새 파이프라인을 단계적으로 켜는 동안 네 컴파일러가 함께 동작한 시기가 있었고, 5.9부터 모든 JavaScript 실행을 Ignition과 TurboFan만으로 처리했다.

## 9.1 (Sparkplug, Chrome 91)

- Ignition과 TurboFan의 간극을 메우는 비최적화 컴파일러 Sparkplug가 추가됐다. V8 9.1에서는 `--sparkplug` 플래그로 제공됐고 Chrome 91에서 켜졌다.
- V8 블로그 측정: Speedometer 5~10%, 실제 사이트를 재생하는 브라우징 벤치마크의 V8 메인 스레드 시간 약 5~15% 개선.
- Chromium 블로그: M91은 Sparkplug와 short builtin calls를 합쳐 최대 23% 빨라졌고 사용자 CPU 시간을 하루 17년 이상 아낀다. 23%는 두 개선을 합친 수치라 Sparkplug만의 효과로 인용하지 않는다.

## Chrome 117 (Maglev)

- Sparkplug와 TurboFan 사이에 빠른 최적화 컴파일러 Maglev가 추가됐다. 2023년 12월 V8 블로그 기준 데스크톱 Chrome에 먼저 적용됐다.

## 2025년: Sea of Nodes에서 CFG/Turboshaft로

2015년 TurboFan 글은 값, effect와 control을 엮는 Sea of Nodes IR로 최적화 순서를 유연하게 조정한 설계를 설명했다. 반면 2025년 글은 명시적인 CFG와 block 순서가 analysis, memory 접근의 reasoning과 디버깅을 단순하게 한다고 설명한다. Node를 자유롭게 옮기는 장점과 schedule 복원, effect 연결의 복잡성을 함께 본다.

해당 발표 시점에 JavaScript backend는 Turboshaft를 사용했고 Wasm은 파이프라인 전반에서 사용했다. JS frontend의 Maglev 전환과 builtin 전환은 당시 진행 중이었다. TurboFan이라는 최고 실행 계층 이름과 그 안의 IR 변경은 같은 변화가 아니다. 옛 Sea of Nodes 설명을 현재 파이프라인 전체로 단정하지 않는다.

## 다른 엔진의 파이프라인

엔진 비교 자료는 기준 시점을 함께 본다. 아래 왼쪽 열은 V8 5.9가 나온 2017년 구성이고, 오른쪽 열은 2026-10-01에 확인한 각 엔진 공식 문서 기준이다.

| 엔진 | 2017년 (V8 5.9 당시) | 현재 |
|---|---|---|
| **V8** | Ignition → TurboFan | Ignition → Sparkplug → Maglev → TurboFan |
| **SpiderMonkey** | C++ Interpreter → Baseline JIT → IonMonkey | C++ Interpreter → Baseline Interpreter → Baseline Compiler → WarpMonkey |
| **JSC** | LLInt → Baseline JIT → DFG → FTL | LLInt → Baseline JIT → DFG → FTL |

- SpiderMonkey는 Firefox 70(2019)에서 C++ 인터프리터와 Baseline JIT 사이에 Baseline Interpreter를 넣었고, Firefox 83(2020)에서 Warp를 기본으로 켜 IonMonkey의 MIR 생성 단계를 바꿨다. 현재 Firefox Source Docs는 WarpMonkey를 IonMonkey를 대체한 최상위 최적화 JIT로 설명한다.
- JSC의 DFG는 지연이 낮은 최적화 JIT, FTL은 처리량을 노리는 최적화 JIT다. V8에서 Maglev와 TurboFan이 나눠 맡는 역할과 비슷하다.

모든 주류 엔진이 공통적으로 **여러 계층**을 둔다. 실행을 빨리 시작할지, 시간이 걸려도 좋은 최고 성능을 낼지의 트레이드오프 때문이다. Ignition만 쓰면 느리고, 너무 일찍 TurboFan을 태우면 hot이 아닌 코드까지 최적화하거나 Deopt가 잦아진다. 계층 사이의 간극을 메우는 중간 계층이 추가되면서 2017년에 V8 2계층, SpiderMonkey 3계층, JSC 4계층으로 달랐던 세 엔진이 지금은 모두 4계층으로 수렴했다.

## 출처

- [V8 — Launching Ignition and TurboFan](https://v8.dev/blog/launching-ignition-and-turbofan)
- [V8 — Firing up the Ignition interpreter](https://v8.dev/blog/ignition-interpreter)
- [V8 — Digging into the TurboFan JIT](https://v8.dev/blog/turbofan-jit)
- [V8 — Land ahoy: leaving the Sea of Nodes](https://v8.dev/blog/leaving-the-sea-of-nodes)
- [V8 — Sparkplug, a non-optimizing JavaScript compiler](https://v8.dev/blog/sparkplug)
- [V8 — Maglev, V8's fastest optimizing JIT](https://v8.dev/blog/maglev)
- [Chromium Blog — Chrome is up to 23% faster in M91 and saves over 17 years of CPU time daily](https://blog.chromium.org/2021/05/chrome-is-faster-in-m91.html)
- [Firefox Source Docs — SpiderMonkey](https://firefox-source-docs.mozilla.org/js/index.html)
- [Mozilla Hacks — The Baseline Interpreter: a faster JS interpreter in Firefox 70](https://hacks.mozilla.org/2019/08/the-baseline-interpreter-a-faster-js-interpreter-in-firefox-70/)
- [Mozilla Hacks — Warp: Improved JS performance in Firefox 83](https://hacks.mozilla.org/2020/11/warp-improved-js-performance-in-firefox-83/)
- [WebKit Documentation — JavaScriptCore](https://docs.webkit.org/Deep%20Dive/JSC/JavaScriptCore.html)
- [하정훈 강사 — V8 엔진의 역사 (v5.9 이전과 이후, v9.1)](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196059)
- [하정훈 강사 — Compiler Pipeline (V8, SpiderMonkey, JSC)](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196060)
- [하정훈 강사 — 최적화 팁 & 마무리](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196066)

## 관련 문서

- [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]
- [[V8|V8 엔진]]
