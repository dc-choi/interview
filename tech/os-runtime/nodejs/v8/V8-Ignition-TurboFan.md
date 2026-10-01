---
tags: [runtime, nodejs, v8]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["V8 Pipeline", "Ignition", "TurboFan", "SparkPlug", "Maglev", "Crankshaft", "Full-codegen", "Bytecode", "Accumulator", "hot and stable", "Inlining"]
---

# V8 컴파일 파이프라인 (Ignition, SparkPlug, TurboFan)

V8은 JIT(Just-In-Time) 엔진이다. 실행 시점에 코드를 프로파일링해 자주 쓰이는(hot) 코드만 점진적으로 더 공격적인 최적화 계층으로 승격시킨다.

## 전체 흐름

```
JS 소스코드
    ↓  Parser (Lexical → Syntax Analysis)
  AST
    ↓  Ignition
  Bytecode ────(프로파일링/피드백 수집)
    ↓
  ├── 가벼운 hot → Sparkplug ──→ 비최적화 기계어
  ├── 중간 hot   → Maglev    ──→ 빠른 최적화 기계어
  └── 깊은 hot   → TurboFan  ──→ 최고 계층 최적화 기계어
                                      ↓ (가정 깨짐)
                                Deoptimization
```

V8 9.1에서 Sparkplug가 추가됐고, Chrome 117에서 Maglev가 데스크톱에 도입됐다. 실행 계층과 승격 기준은 V8 구현 세부사항이라 버전에 따라 달라질 수 있다.

## Parser

- **Lexical Analysis (어휘 분석)**: 소스코드를 키워드, 식별자, 연산자, 구분자로 분해해 토큰 생성
- **Syntax Analysis (구문 분석)**: 토큰을 문법 규칙에 맞춰 검증. 실패 시 `SyntaxError` 발생
- 성공 시 필요한 정보만 추려 **AST(Abstract Syntax Tree, 추상 구문 트리)** 생성

AST는 코드의 의미(변수, 함수, 조건문)를 구조화한 트리다. 변수, 함수의 **스코프도 이 파싱 단계에서 확정**된다([[Scope|스코프]], [[Variable-Declarations|var/let/const]]). 산술 리터럴(`1 + 2`)처럼 컴파일 시점에 값이 정해지는 식은 파서가 미리 계산해(constant folding의 일종) 하나의 리터럴 노드로 접는다.

## Ignition (바이트코드 인터프리터)

AST를 **바이트코드**로 변환한 뒤 바이트코드 명령을 하나씩 실행한다. 바이트코드는 기계어를 추상화한 IR(Intermediate Representation)로, JS라는 고수준 언어를 가상 머신이 이해하기 편한 형태로 번역한 것.

- **레지스터 기반** (스택 기반 아님)
- **빠른 시작 시간**: 전체 코드를 미리 컴파일하지 않아 초기 메모리 효율적
- 실행 중 **프로파일링, 피드백 데이터 수집**: 어떤 함수가 자주 호출되는지, 인자 타입이 뭔지, 어떤 Hidden Class가 관찰되는지
- 실행 횟수는 상위 tier 전환 판단에 쓰인다. 타입과 map 피드백은 Maglev와 TurboFan의 최적화 근거가 되며, 비최적화 컴파일러인 Sparkplug는 bytecode를 machine code로 직접 변환한다.

실행 직전에 곧바로 비최적화 기계어를 만들던 옛 baseline 컴파일러(Full-codegen) 대신 간결한 바이트코드를 만들어 인터프리트하는 이유는 세 가지다. (1) 바이트코드는 같은 코드의 baseline 기계어의 25~50% 크기라 **메모리 사용량이 준다**. (2) TurboFan이 소스를 다시 컴파일하지 않고 바이트코드에서 바로 최적화 코드를 만들어 **재파싱이 필요 없다**(Crankshaft는 소스에서 다시 컴파일했다). (3) 최적화, 역최적화 모두 바이트코드 하나만 기준 삼으면 되어 **파이프라인 복잡도가 낮다**. 바이트코드 생성이 기계어 생성보다 빨라 스크립트 시작도 빨라졌다. 전환 배경과 수치는 [[V8-Ignition-TurboFan-History|V8 파이프라인의 변천]]에 있다.

**바이트코드 실행 전에 실행 컨텍스트가 생성**된다. 호이스팅, `this` 바인딩 등이 이 단계에서 이뤄진다.

확인:
```bash
node --print-bytecode app.js
```

### 바이트코드 해부

바이트코드는 Ignition interpreter의 가상 레지스터와 누산기를 어떻게 쓸지 지시하는 명령문에 가깝다. 두 저장소가 핵심이다.

- **레지스터(Register)**: interpreter stack frame 안의 가상 저장소. 지역 변수(`r0`...)와 인자(`a0`...)를 담으며, 실제 machine register 할당은 컴파일된 tier에서 이루어진다.
- **누산기(Accumulator)**: 중간 계산 결과를 담는 특수 레지스터. 대부분의 명령이 암묵적으로 누산기를 입출력으로 쓴다.

자주 보이는 명령:

| 명령 | 의미 |
|---|---|
| `StackCheck` | 스택 포인터가 한계를 넘었는지 확인 (초과 시 Stack Overflow로 중단) |
| `LdaConstant [i]` | 상수 풀의 i번 상수를 누산기에 로드 (Lda = Load Accumulator) |
| `Ldar a0` | 레지스터 a0의 값을 누산기에 로드 (Ldar = Load Accumulator from Register) |
| `Star r0` | 누산기 값을 레지스터 r0에 저장 (Star = Store Accumulator to Register) |
| `Add r0, [i]` | r0과 누산기를 더해 누산기에 저장 ([i]는 피드백 슬롯) |
| `Return` | 누산기 값을 반환 |

함수 하나에 대해 출력되는 **Parameter count**가 선언한 인자 수보다 1 큰 이유는, 암시적 리시버인 `this`가 0번 인자로 포함되기 때문이다. 간단한 함수 한 줄도 내부적으로는 이런 명령 여러 개로 풀리며, interpreter dispatch overhead는 계속 남는다. 반복 실행 후 Sparkplug, Maglev, TurboFan 같은 컴파일 tier로 전환되어야 컴파일된 코드의 성능을 얻는다.

## SparkPlug (비최적화 중간 컴파일러)

Ignition과 TurboFan 사이에 위치한 **빠른 컴파일**에 초점을 둔 계층. 9.1에 도입됐다.

- **AST가 아닌 Ignition의 바이트코드를 입력**으로 기계어를 만든다. 변수 해석(variable resolution), 괄호가 실제로 화살표 함수의 매개변수 목록인지 판별, 구조 분해 할당의 **디슈가링** 같은 일은 바이트코드 생성 단계에서 이미 끝났으므로 Sparkplug는 반복하지 않는다
- 디슈가링은 사람이 읽기 쉽게 만든 문법(syntax sugar)을 더 기본적인 연산으로 풀어 쓰는 작업이다. 구조 분해 할당이 대표 예다
- IR을 만들지 않고 바이트코드를 순서대로 훑으며 바이트코드마다 정해진 기계어를 내보내고, 대부분의 동작은 인터프리터와 공유하는 builtin 호출로 처리한다. 이득은 인터프리터의 피연산자 디코딩과 다음 바이트코드 dispatch 비용을 없애는 데서 나온다
- **과도한 최적화를 수행하지 않는다**. 뒤에 Maglev와 TurboFan이 있기 때문

### 왜 중간 계층이 필요한가

Ignition만으로는 hot 코드 실행이 느리고, TurboFan은 컴파일 비용이 크다. 너무 일찍 TurboFan을 적용하면 **아직 hot도 아닌 함수**를 최적화해버리거나 **Deopt가 빈번**해진다. SparkPlug는 Ignition의 느린 실행과 TurboFan의 느린 컴파일 사이 간극을 메운다.

## TurboFan (최적화 컴파일러)

Ignition의 바이트코드와 프로파일링 데이터를 입력으로 받아 **복잡하고 정교한 최적화**를 수행하는 기계어 컴파일러.

### 최적화 대상 판별 (Profiling)

런타임 내내 Profiler가 함수별 호출 횟수(tick)와 인자 타입 안정성을 수집하고, 그 데이터로 함수마다 최적화 여부를 판정한다. 판정 결과는 크게 둘이다.

- **kHotAndStable (hot and stable)**: 함수의 interrupt budget이 소진될 만큼 반복 호출되었을 때. 2026-09-03 V8 main 소스의 기본값은 bytecode 길이에 Maglev 400회 또는 TurboFan 3,000회의 호출 횟수를 곱해 budget을 계산한다.
- **kDoNotOptimize**: 최적화 대상으로 표시하지 않는다.

관찰은 `node --trace-opt`로 가능하며, 현재 로그에서는 `marking ... for optimization to ... reason: hot and stable` 형태를 볼 수 있다. 구버전의 `small function, ICs with typeinfo` 사유는 현재 tiering manager에 존재하지 않는다.

### 대표 최적화 기법

- **Hidden Class / Inline Caching**: [[V8-Hidden-Class|히든 클래스]], [[V8-Inline-Cache|인라인 캐시]] 참조
- **Inlining**: 아래 섹션
- **Dead Code Elimination**: 실행되지 않는 코드 제거
- **Constant Folding**: 컴파일 시점에 계산 가능한 상수 미리 계산
- **Loop Unrolling**: 반복문을 풀어 분기 비용 절감

### Deoptimization (역최적화)

TurboFan이 최적화 시 세운 **가정이 깨지면** 최적화된 기계어를 버리고 Ignition 바이트코드로 복귀한다. 대표적 원인:

- 변수 타입 변경 (number → string)
- 새 프로퍼티 추가, 삭제로 Hidden Class 변경

역최적화 자체가 비용이라 성능에 영향을 준다. 다만 특정 문법이 무조건 최적화를 막는다는 식의 목록은 오래 유지되지 않는다. 예를 들어 `try`, `catch`, `finally`를 최적화하지 못한 것은 Crankshaft의 한계였고, Ignition과 TurboFan은 예외 처리를 포함한 언어 전체를 지원하도록 설계됐다. 실제 병목을 프로파일링한 뒤 hot path의 타입과 객체 모양 안정성을 확인한다.

## Maglev (Chrome 117+)

Chrome 117에서 Sparkplug와 TurboFan 사이에 추가된 **빠른 최적화 컴파일러**. Sparkplug보다 나은 코드를 만들면서 TurboFan보다 훨씬 빨리 컴파일하는 포지션이다. runtime feedback으로 관찰한 객체 모양과 타입에 특화된 코드를 만들고, 가정이 깨지면 기존 deoptimization 메커니즘으로 복귀한다.

## 인라이닝 (Inlining)

함수 호출에는 고정 비용이 있다:

1. 반환 주소 Stack에 push
2. 레지스터 상태 저장
3. 함수 코드 위치로 jump

인라이닝은 **작은 함수를 호출부에 직접 삽입**해 이 과정을 생략한다. 다만 호출 비용 절감은 직접 효과일 뿐이다. 더 큰 이점은 호출 경계가 사라져 합쳐진 본문 전체가 한 최적화 단위가 된다는 점이다. 호출자가 아는 인자 타입과 상수를 피호출 본문에 적용할 수 있어 다른 최적화가 쉬워진다. V8 소스의 인라이닝 플래그 주석도 작은 함수의 인라이닝이 호출 오버헤드를 없애는 것 외에 load elimination과 escape analysis를 개선하고 HeapNumber 할당을 없앤다고 설명한다. 리팩터링에서 흩어진 함수를 합치면(Inline Function) 분석하고 더 나은 구조로 다시 나누기 쉬워지는 것과 같은 원리다.

### 인라이닝 판단 기준과 관찰

`node --trace-turbo-inlining app.js`로 TurboFan의 판단을 볼 수 있다. Node.js 26.7.0(V8 14.6.202.34)에서 크기가 다른 함수 세 개를 반복 호출했을 때의 로그(주소 생략):

| 로그 | 의미 |
|---|---|
| `Considering <SharedFunctionInfo square> for inlining with <FeedbackVector[1]>` | feedback vector와 바이트코드가 있는 대상을 후보로 고려한다 |
| `Inlining small function(s) at call site #35:JSCall` | 바이트코드 30바이트 이하(`--max-inlined-bytecode-size-small`)의 작은 함수는 바로 인라이닝한다 |
| `Cannot consider <SharedFunctionInfo big> for inlining (reason: exceeds bytecode limit)` | 한 번에 인라이닝할 수 있는 크기 상한(`--max-inlined-bytecode-size`, 460)을 넘어 제외한다 |
| `Budget used: 0/920 -- 1 candidate(s) for inlining:` 다음 `candidate: JSCall node #41 with frequency 98.4286` | 나머지 후보는 호출 지점 빈도를 크기로 나눈 점수 순으로 누적 예산(`--max-inlined-bytecode-size-cumulative`, 920) 안에서 인라이닝한다 |

- 호출 지점 빈도가 `--min-inlining-frequency`보다 낮으면 후보에서 빠진다. 선언 기본값은 0.15지만 Maglev가 켜진 기본 구성에서는 0.05가 적용됐다. `node --v8-options`는 선언 기본값만 보여 주므로 실제 값은 `node --print-flag-values`로 확인한다.
- 아직 실행되지 않아 feedback vector가 없는 함수는 고려 대상이 아니다. 호출 빈도가 높고 몸집이 작은 함수일수록 유리하다는 말은 엔진이 실제로 쓰는 두 축, 즉 바이트코드 크기와 호출 지점 빈도를 가리킨다.
- Maglev도 자체 기준(`--max-maglev-inlined-bytecode-size` 100 등)으로 인라이닝한다.
- 플래그 이름, 로그 형식과 기본값은 V8 내부 구현이라 버전마다 바뀐다. 학습과 진단에만 쓰고 코드를 이 숫자에 맞추지 않는다.

## 역사와 다른 엔진

Full-codegen과 Crankshaft에서 Ignition과 TurboFan으로 바뀐 5.9 전환, 9.1의 Sparkplug와 Chrome 117의 Maglev 추가, SpiderMonkey와 JSC의 계층 비교는 [[V8-Ignition-TurboFan-History|V8 파이프라인의 변천과 다른 엔진 비교]]로 분리했다.

## 출처

- [V8 — Ignition](https://v8.dev/docs/ignition)
- [V8 — Launching Ignition and TurboFan](https://v8.dev/blog/launching-ignition-and-turbofan)
- [V8 — Sparkplug, a non-optimizing JavaScript compiler](https://v8.dev/blog/sparkplug)
- [V8 — Maglev, V8's fastest optimizing JIT](https://v8.dev/blog/maglev)
- [V8 — Tiering manager source](https://raw.githubusercontent.com/v8/v8/main/src/execution/tiering-manager.cc)
- [V8 — Firing up the Ignition interpreter](https://v8.dev/blog/ignition-interpreter)
- [V8 — Flag definitions source (14.6.202.34)](https://raw.githubusercontent.com/v8/v8/14.6.202.34/src/flags/flag-definitions.h)
- [V8 — TurboFan inlining heuristic source (14.6.202.34)](https://raw.githubusercontent.com/v8/v8/14.6.202.34/src/compiler/js-inlining-heuristic.cc)
- [하정훈 강사 — V8 엔진의 동작방식 (v9.1)](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196058)
- [하정훈 강사 — V8 엔진의 역사](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196059)
- [하정훈 강사 — 인라이닝 이란?](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196067)
- [하정훈 강사 — 인라이닝 최적화 이점](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196068)

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Ignition-TurboFan-History|V8 파이프라인의 변천과 다른 엔진 비교]]
- [[V8-Hidden-Class|V8 히든 클래스]]
- [[V8-Inline-Cache|V8 인라인 캐시]]
- [[V8-Array-Internals|V8 배열 내부 구현]]
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
