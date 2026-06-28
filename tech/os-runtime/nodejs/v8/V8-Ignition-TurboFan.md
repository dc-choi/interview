---
tags: [runtime, nodejs, v8]
status: done
category: "OS & Runtime"
aliases: ["V8 Pipeline", "Ignition", "TurboFan", "SparkPlug", "Maglev", "Crankshaft", "Full-codegen", "Bytecode", "Accumulator", "hot and stable"]
---

# V8 컴파일 파이프라인 (Ignition, SparkPlug, TurboFan)

V8은 JIT(Just-In-Time) 엔진이다. 실행 시점에 코드를 프로파일링해 자주 쓰이는(hot) 코드만 점진적으로 더 공격적인 최적화 계층으로 승격시킨다.

## 전체 흐름 (9.1 이후)

```
JS 소스코드
    ↓  Parser (Lexical → Syntax Analysis)
  AST
    ↓  Ignition
  Bytecode ────(프로파일링/피드백 수집)
    ↓
  ┌── 가벼운 hot → SparkPlug ──→ 비최적화 기계어
  └── 깊은 hot  → TurboFan   ──→ 최적화 기계어
                                    ↓ (가정 깨짐)
                              Deoptimization → Bytecode로 복귀
```

114+ 버전부터는 SparkPlug와 TurboFan 사이에 **Maglev**라는 중간 계층 최적화 컴파일러가 추가됐다.

## Parser

- **Lexical Analysis (어휘 분석)**: 소스코드를 키워드, 식별자, 연산자, 구분자로 분해해 토큰 생성
- **Syntax Analysis (구문 분석)**: 토큰을 문법 규칙에 맞춰 검증. 실패 시 `SyntaxError` 발생
- 성공 시 필요한 정보만 추려 **AST(Abstract Syntax Tree, 추상 구문 트리)** 생성

AST는 코드의 의미(변수, 함수, 조건문)를 구조화한 트리다. 변수, 함수의 **스코프도 이 파싱 단계에서 확정**된다([[Scope|스코프]], [[Variable-Declarations|var/let/const]]). 산술 리터럴(`1 + 2`)처럼 컴파일 시점에 값이 정해지는 식은 파서가 미리 계산해(constant folding의 일종) 하나의 리터럴 노드로 접는다.

## Ignition (바이트코드 인터프리터)

AST를 **바이트코드**로 변환한 뒤 한 줄씩 실행한다. 바이트코드는 기계어를 추상화한 IR(Intermediate Representation)로, JS라는 고수준 언어를 가상 머신이 이해하기 편한 형태로 번역한 것.

- **레지스터 기반** (스택 기반 아님)
- **빠른 시작 시간**: 전체 코드를 미리 컴파일하지 않아 초기 메모리 효율적
- 실행 중 **프로파일링, 피드백 데이터 수집**: 어떤 함수가 자주 호출되는지, 인자 타입이 뭔지, 어떤 Hidden Class가 관찰되는지
- 수집한 데이터는 SparkPlug, TurboFan이 기계어로 최적화할 때 판단 근거로 사용

전체를 한 번에 기계어로 컴파일하던 옛 방식(Full-codegen) 대신 한 줄씩 바이트코드로 인터프리트하는 이유는 세 가지다. (1) 기계어보다 바이트코드 컴파일이 가벼워 **메모리 사용량이 준다**. (2) 바이트코드가 간결해 **재파싱 오버헤드가 작다**. (3) 최적화, 역최적화 모두 바이트코드 하나만 기준 삼으면 되어 **파이프라인 복잡도가 낮다**.

**바이트코드 실행 전에 실행 컨텍스트가 생성**된다. 호이스팅, `this` 바인딩 등이 이 단계에서 이뤄진다.

확인:
```bash
node --print-bytecode app.js
```

### 바이트코드 해부

바이트코드는 CPU의 레지스터와 누산기를 어떻게 쓸지 지시하는 명령문에 가깝다. 두 저장소가 핵심이다.

- **레지스터(Register)**: CPU의 고속 메모리. 지역 변수(`r0`...)와 인자(`a0`...)를 담는다.
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

함수 하나에 대해 출력되는 **Parameter count**가 선언한 인자 수보다 1 큰 이유는, 암시적 리시버인 `this`가 0번 인자로 포함되기 때문이다. 간단한 함수 한 줄도 내부적으로는 이런 명령 여러 개로 풀린다 — 그래서 처음 실행은 느리지만, 한 번 바이트코드로 풀어 두면 이후는 컴파일 언어에 가까운 성능을 낸다.

## SparkPlug (비최적화 중간 컴파일러)

Ignition과 TurboFan 사이에 위치한 **빠른 컴파일**에 초점을 둔 계층. 9.1에 도입됐다.

- **AST가 아닌 Ignition의 바이트코드를 입력**으로 기계어 생성 → 변수 확인, 화살표 함수 확인, **디슈가링**(Syntax Sugar 제거) 같은 무거운 작업이 불필요
- 디슈가링 예: 삼항 연산자, 구조분해할당 — 사람이 읽기 쉬운 문법을 내부 기본 형태로 되돌리는 작업
- **과도한 최적화를 수행하지 않는다**. 뒤에 TurboFan이 있기 때문

### 왜 중간 계층이 필요한가

Ignition만으로는 hot 코드 실행이 느리고, TurboFan은 컴파일 비용이 크다. 너무 일찍 TurboFan을 적용하면 **아직 hot도 아닌 함수**를 최적화해버리거나 **Deopt가 빈번**해진다. SparkPlug는 Ignition의 느린 실행과 TurboFan의 느린 컴파일 사이 간극을 메운다.

## TurboFan (최적화 컴파일러)

Ignition의 바이트코드와 프로파일링 데이터를 입력으로 받아 **복잡하고 정교한 최적화**를 수행하는 기계어 컴파일러.

### 최적화 대상 판별 (Profiling)

런타임 내내 Profiler가 함수별 호출 횟수(tick)와 인자 타입 안정성을 수집하고, 그 데이터로 함수마다 최적화 여부를 판정한다. 판정 결과는 크게 둘이다.

- **kHotAndStable (hot and stable)**: 자주 호출되고(hot, tick이 임계 `ticks_for_optimization` 초과) 동작이 안 변하는(stable) 함수. 같은 일을 반복하는 루프 안 코드가 대표적이다. 임계값은 바이트코드 길이에 비례해 커진다(긴 함수일수록 더 많이 호출돼야 hot 판정).
- **kSmallFunction (small function)**: 아직 hot은 아니지만 바이트코드 길이가 충분히 짧은 함수. 작고 단순한 함수는 동작이 제한적이라 일찍 최적화해도 안전하다고 본다.

둘 다 아니면 최적화하지 않는다(kDoNotOptimize). 관찰은 `node --trace-opt`로 가능하며, 로그의 `reason: hot and stable` / `small function`이 위 판정에 대응한다. 함께 찍히는 `ICs with typeinfo: n/m`은 인라인 캐시가 단형(monomorphic)으로 안정화된 비율로, 높을수록 [[V8-Inline-Cache|인라인 캐시]] 최적화가 잘 걸린 것이다.

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
- `try-catch` 블록 내 일부 코드

역최적화 자체가 비용이라 성능에 영향을 준다. 완전히 없애는 게 이상적이지만 JS가 **동적 언어**이므로 어쩔 수 없이 감내해야 한다. 최적화 가정을 깨지 않는 코드 작성이 hot path에서 중요하다.

## Maglev (114+)

크롬 114부터 TurboFan과 SparkPlug 사이에 추가된 **경량 최적화 컴파일러**. SparkPlug보다 더 최적화되고, TurboFan보다 빨리 컴파일되는 포지션. 계층 간극을 한 단계 더 세분화한 결과.

## 인라이닝 (Inlining)

함수 호출은 본질적으로 비용이 있다:

1. 반환 주소 Stack에 push
2. 레지스터 상태 저장
3. 함수 코드 위치로 jump

인라이닝은 **작은 함수를 호출부에 직접 삽입**해 이 과정을 생략한다. 호출 빈도가 높고 몸집이 작은 함수일수록 효과가 크다.

## 다른 엔진의 파이프라인

| 엔진 | 인터프리터 | 기본 최적화 | 복잡한 최적화 |
|---|---|---|---|
| **V8** (9.1+) | Ignition | SparkPlug (+ Maglev 114+) | TurboFan |
| **SpiderMonkey** | Interpreter | Baseline | IonMonkey |
| **JSC** | LLInt | Baseline + DFG | FTL (Faster Than Light) |

모든 주류 엔진이 공통적으로 **여러 계층**을 둔다. 이유는 실행 시간 vs 성능의 트레이드오프: Ignition만 쓰면 느리고, 너무 일찍 TurboFan을 태우면 hot이 아닌 코드까지 최적화하거나 Deopt가 잦아진다. 계층 사이의 간극을 줄이기 위해 중간 컴파일러가 추가된다.

## 역사

### 5.9 이전 (Crankshaft + Full-codegen)

- **Full-codegen**: 파싱 직후 전체 코드를 한 번에 기계어로 컴파일 (SparkPlug 역할)
- **Crankshaft**: 별도 스레드에서 프로파일러가 수집한 hot 코드를 최적화 (TurboFan 역할)
- 스레드 구성: 메인(컴파일+실행), 프로파일러(실행 시간 측정), 별도 컴파일 스레드

### 5.9 이후 (2017 초, 완전 재설계)

- **Ignition이 Full-codegen을 완전히 대체**: 전체 선(先)컴파일 → 한 줄씩 인터프리트. 메모리 사용량 대폭 감소
- **TurboFan이 Crankshaft를 대체**: Crankshaft는 새 언어 기능 지원이 어려웠음. TurboFan은 ES6+ 표준을 처음부터 염두에 두고 설계
- 이전 엔진의 한계: 메모리 과소비, `try-catch`, ES6 신규 기능 최적화 불가
- **계층화로 확장성 확보**: Crankshaft는 아키텍처별 코드가 비대했지만(7개 아키텍처 지원에 13,000~16,000줄), 여러 레이어로 나눈 TurboFan은 3,000줄 미만으로 같은 범위를 커버
- 초기엔 Ignition, TurboFan의 성능과 역최적화 시 바이트코드 복귀 문제로 Full-codegen, Crankshaft를 한동안 병존시켰다가 5.9에서 완전 전환

### 9.1 (SparkPlug 도입)

- Ignition↔TurboFan 간극을 메우는 **비최적화 중간 컴파일러** SparkPlug 추가

### 114+ (Maglev 추가)

- SparkPlug↔TurboFan 사이에 **경량 최적화 컴파일러** Maglev 추가

## 출처

- [V8 엔진은 어떻게 내 코드를 실행하는 걸까? — evan-moon](https://evan-moon.github.io/2019/06/28/v8-analysis/)

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Hidden-Class|V8 히든 클래스]]
- [[V8-Inline-Cache|V8 인라인 캐시]]
- [[V8-Array-Internals|V8 배열 내부 구현]]
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
