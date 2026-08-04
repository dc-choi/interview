---
tags: [cs, compile, runtime, jvm]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["컴파일과 런타임"]
---

# 컴파일과런타임

프로그래밍 언어의 문법과 실행 구현을 분리해서 본다. 한 언어가 영원히 "컴파일 언어" 또는 "인터프리터 언어"인 것이 아니라, 구현체가 소스를 어떤 중간 표현으로 바꾸고 언제 기계어를 만드는지가 실행 특성을 결정한다.

## 프로그래밍을 절차로 풀어내기

문제를 입력, 상태, 출력과 부작용으로 나누고 실행 순서를 글로 적는 방식은 좋은 설계 도구다. 하지만 모든 프로그램이 순서만 기술하는 것은 아니다. SQL처럼 원하는 결과를 선언하거나, 규칙과 제약을 기술하는 패러다임도 있다.

1. 입력과 출력의 계약을 정한다.
2. 상태가 언제 바뀌는지 적는다.
3. 실패, 경계값과 부작용을 표시한다.
4. 순서가 필요한 부분과 순서에 독립적인 부분을 나눈다.
5. 구현 뒤 계약과 실제 동작을 비교한다.

## 소스에서 실행까지

일반적인 구현은 다음 단계 일부를 조합한다.

`source -> token/AST -> IR 또는 bytecode -> machine code -> execution`

- **프런트엔드**는 문법과 의미를 분석해 AST나 중간 표현을 만든다.
- **컴파일러**는 한 표현을 다른 표현으로 번역한다. 목적물이 곧바로 기계어일 필요는 없다.
- **어셈블러**는 어셈블리 코드를 object file의 기계 명령과 메타데이터로 바꾼다.
- **링커**는 여러 object와 library의 symbol을 연결해 실행 파일이나 library를 만든다.
- **로더와 런타임**은 파일을 주소 공간에 배치하고 필요한 실행 환경을 준비한다.

GCC driver의 전형적인 native build는 preprocessing, compilation proper, assembly, linking 순서다. `-E`, `-S`, `-c`로 각 단계 뒤에 멈출 수 있다. 이것은 대표적인 파이프라인이지 모든 언어 구현의 보편 규칙은 아니다.

## AOT, interpreter와 JIT

| 방식 | 번역 시점과 실행 | 주의점 |
|---|---|---|
| AOT | 배포 또는 실행 전에 target code 생성 | target ABI와 CPU, 배포 단위를 확인 |
| interpreter | 중간 표현의 연산을 runtime이 해석 | 반드시 소스 한 줄씩 실행하는 것은 아님 |
| bytecode VM | source를 portable instruction으로 바꾼 뒤 VM에서 실행 | VM 구현이 해석, JIT 또는 둘 다 선택 가능 |
| JIT | 실행 중 관측한 정보를 이용해 일부 코드를 target code로 최적화 | warm-up, compile cost와 deoptimization 고려 |

Java compiler는 JVM class file을 만들 수 있고 JVM 구현은 이를 해석하거나 native code로 컴파일할 수 있다. V8은 Ignition이 생성한 bytecode를 실행하고, 충분한 실행 정보가 쌓이면 TurboFan이 최적화된 machine code를 만든다. 가정이 깨지면 덜 최적화된 코드로 돌아갈 수 있다.

따라서 다음 단정은 피한다.

- native code가 모든 workload에서 언제나 가장 빠른 것은 아니다.
- interpreter가 언제나 source text를 한 줄씩 읽는 것은 아니다.
- VM을 쓴다고 반드시 느리거나, 한 번 만든 산출물이 모든 환경에서 그대로 실행되는 것은 아니다.
- startup, steady-state throughput, latency, memory, binary size와 배포 편의는 서로 다른 평가 축이다.

## 고급어와 저급어

기계어는 ISA가 정의한 bit pattern이고, assembly language는 그 명령과 데이터를 사람이 다루기 위한 표기다. 고급 언어는 자료형, 함수, 객체, module 같은 추상화를 제공한다. 경계는 교육적 분류이며, inline assembly, intrinsic, FFI처럼 한 프로그램 안에서 층이 섞일 수 있다.

## API와 SDK

| 개념 | 핵심 | 형태 |
|---|---|---|
| API | 두 구성요소가 상호작용하는 계약 | 함수와 타입, protocol, endpoint, file format 등 |
| SDK | 특정 platform이나 product 개발을 돕는 배포 묶음 | API binding, library, build/debug tool, 문서와 sample 등 |

API는 함수 하나에 한정되지 않고 SDK도 단순히 API 여러 개의 합이라고 정의할 수 없다. SDK의 실제 구성은 제공자가 정한다. Android SDK도 platform tool, build tool, command-line tool과 platform package처럼 여러 구성요소를 배포한다.

## 판단 질문

- source가 어떤 중간 표현과 target으로 변환되는가
- 번역은 build time, load time, runtime 중 언제 일어나는가
- optimization은 정적 정보와 runtime profile 중 무엇을 쓰는가
- 산출물이 의존하는 ISA, ABI, OS와 runtime version은 무엇인가
- API compatibility와 SDK toolchain version을 어떻게 관리하는가

## 관련 문서

- [[CPU-Datapath-Control-and-Instruction-Cycle|CPU 데이터패스와 명령어 사이클]]
- [[Process-Lifecycle|프로세스 생명주기]]
- [[Digital-Fundamentals|디지털 기초]]

## 출처

- 인프런, 널널한 개발자 강사, [프로그래밍의 다른 이름 절차적 글쓰기](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128259), [컴파일과 고급어 저급어](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128264), [인터프리터](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128265), [API와 SDK](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128266)
- [GCC, Options Controlling the Kind of Output](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)
- [Java SE 26, Java Virtual Machine Specification](https://docs.oracle.com/en/java/javase/26/docs/specs/jvms/index.html)
- [V8, Ignition interpreter](https://v8.dev/docs/ignition)
- [V8, Launching Ignition and TurboFan](https://v8.dev/blog/launching-ignition-and-turbofan)
- [Android Developers, SDK packages](https://developer.android.com/studio/intro/update)
