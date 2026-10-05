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

### 의사코드와 알고리즘

의사코드는 특정 언어의 문법 없이 절차의 동작과 분기를 적은 글이며, 들여쓰기로 어떤 단계가 어느 조건이나 반복에 속하는지 드러낸다. 블록형 언어든 텍스트 언어든 절차는 대체로 다음 요소의 조합으로 정리된다. 불리언 식과 명제의 관계는 [[Math-Logic-For-Programming|프로그래밍에 필요한 수학과 논리]]에서 다룬다.

| 요소 | 역할 | 예 |
|---|---|---|
| 함수 | 이름 붙인 동작. 입력을 받아 결과나 부작용을 만든다 | `open(middle)`, `call(person)` |
| 조건문 | 여러 경로 중 하나를 고른다 | `if`, `else if`, `else` |
| 불리언 식 | 분기와 반복 여부를 정하는 참/거짓 질문 | `person is on page` |
| 반복문 | 종료 조건을 만족할 때까지 단계를 되풀이한다 | `go back to line 3`, `while pages remain` |
| 변수 | 단계 사이에 이어지는 상태를 저장한다 | `counter = counter + 1`, `muted = !muted` |

알고리즘은 이런 단계를 모호하지 않게 나열한 유한한 절차이고, 유효한 모든 입력에서 끝나며 올바른 출력을 낼 때 정확하다고 한다. 같은 문제도 규칙을 어떻게 배열하느냐에 따라 걸리는 시간이 달라지므로 정확성을 먼저 확인하고 효율을 비교한다. 이름순으로 정렬된 n쪽 전화번호부에서 이름을 찾을 때 한 쪽씩 넘기면 정확하지만 최대 n번 확인한다. 두 쪽씩 넘기면 빨라지지만 목표를 지나쳤을 때 한 쪽 되돌아가 확인하는 보완이 없으면 답을 놓칠 수 있다. 가운데를 펼쳐 절반을 버리는 방식은 쪽수가 두 배가 되어도 확인이 한 번만 늘어 약 log₂ n번에 끝나지만, 정렬이라는 입력 조건이 깨지면 정확성도 함께 깨진다 ([[Algorithm-Complexity|시간복잡도]], [[Algorithm-Searching|선형 검색과 이진 검색]], [[Binary-Search-and-LIS|이분탐색과 LIS]]).

반복문 안에서 일정 간격으로 입력 상태를 확인하는 폴링은 확인 간격보다 짧은 입력을 놓칠 수 있고, 간격보다 오래 유지된 입력을 여러 번 처리할 수 있다. 키를 누를 때마다 불리언 변수를 한 번씩 토글해야 한다면 입력이 생길 때 한 번 실행되는 이벤트 처리 방식을 먼저 검토한다. 다만 키를 누르고 있으면 시스템 설정에 따라 같은 키 이벤트가 반복되므로(브라우저는 `keydown`의 `repeat`로 표시한다) 반복 이벤트는 거른다.

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
- [[Algorithm-Practice|알고리즘 문제를 절차로 바꾸는 법]]
- [[Math-Logic-For-Programming|프로그래밍에 필요한 수학과 논리]]

## 실행 관리, 메모리 회수와 VM의 범위

Managed code는 runtime이 실행과 memory/type safety 같은 서비스를 관리한다는 뜻이며 .NET에서는 CLR의 계약을 가리킨다. 이를 GC 유무, native 기계어 유무와 하나의 축으로 묶지 않는다. 실행 모델, 메모리 회수, 안전성, 배포 단위는 별개다. GC가 있어도 도달 가능한 참조를 계속 보유하면 memory leak이 생기며 native interop 경계에서는 별도 lifetime과 platform 계약을 확인한다.

Bytecode와 source의 이식성은 runtime 자체가 모든 OS에서 같은 바이너리라는 뜻이 아니다. ISA/ABI별 runtime과 native library가 필요하다. 언어의 process VM은 한 프로그램에 실행 추상화와 서비스를 제공하고 system VM은 guest OS에 하드웨어 환경을 제공한다. Container는 host kernel을 공유하는 OS 격리이므로 두 VM과 구분한다.

## 출처

- 인프런 보충 강의: [이제 무엇을 배워야 할까요?](https://www.inflearn.com/courses/lecture?courseId=336749&unitId=281082)
- 인프런 보충 강의: [User mode와 Kernel mode 그리고 가상화까지!](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128256), [가상 메모리 소개](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128257)

- [Microsoft Learn, What is managed code?](https://learn.microsoft.com/en-us/dotnet/standard/managed-code)

- 인프런, 널널한 개발자 강사, [프로그래밍의 다른 이름 절차적 글쓰기](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128259), [컴파일과 고급어 저급어](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128264), [인터프리터](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128265), [API와 SDK](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128266)
- 부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), [알고리즘](https://www.boostcourse.org/cs112/lecture/118999), [스크래치: 기초](https://www.boostcourse.org/cs112/lecture/119000), [스크래치: 심화](https://www.boostcourse.org/cs112/lecture/119001)
- [GCC, Options Controlling the Kind of Output](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)
- [Java SE 26, Java Virtual Machine Specification](https://docs.oracle.com/en/java/javase/26/docs/specs/jvms/index.html)
- [V8, Ignition interpreter](https://v8.dev/docs/ignition)
- [V8, Launching Ignition and TurboFan](https://v8.dev/blog/launching-ignition-and-turbofan)
- [Android Developers, SDK packages](https://developer.android.com/studio/intro/update)
- [W3C, UI Events](https://www.w3.org/TR/uievents/#dom-keyboardevent-repeat)
