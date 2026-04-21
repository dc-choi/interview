---
tags: [runtime, nodejs, v8]
status: done
category: "OS & Runtime"
aliases: ["V8 Pipeline", "Ignition", "TurboFan", "SparkPlug", "Maglev", "Crankshaft", "Full-codegen"]
---

# V8 컴파일 파이프라인 (Ignition·SparkPlug·TurboFan)

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

- **Lexical Analysis (어휘 분석)**: 소스코드를 키워드·식별자·연산자·구분자로 분해해 토큰 생성
- **Syntax Analysis (구문 분석)**: 토큰을 문법 규칙에 맞춰 검증. 실패 시 `SyntaxError` 발생
- 성공 시 필요한 정보만 추려 **AST(Abstract Syntax Tree, 추상 구문 트리)** 생성

## Ignition (바이트코드 인터프리터)

AST를 **바이트코드**로 변환한 뒤 한 줄씩 실행한다. 바이트코드는 기계어를 추상화한 IR(Intermediate Representation)로, JS라는 고수준 언어를 가상 머신이 이해하기 편한 형태로 번역한 것.

- **레지스터 기반** (스택 기반 아님)
- **빠른 시작 시간**: 전체 코드를 미리 컴파일하지 않아 초기 메모리 효율적
- 실행 중 **프로파일링·피드백 데이터 수집**: 어떤 함수가 자주 호출되는지, 인자 타입이 뭔지, 어떤 Hidden Class가 관찰되는지
- 수집한 데이터는 SparkPlug·TurboFan이 기계어로 최적화할 때 판단 근거로 사용

**바이트코드 실행 전에 실행 컨텍스트가 생성**된다. 호이스팅, `this` 바인딩 등이 이 단계에서 이뤄진다.

확인:
```bash
node --print-bytecode app.js
```

## SparkPlug (비최적화 중간 컴파일러)

Ignition과 TurboFan 사이에 위치한 **빠른 컴파일**에 초점을 둔 계층. 9.1에 도입됐다.

- **AST가 아닌 Ignition의 바이트코드를 입력**으로 기계어 생성 → 변수 확인, 화살표 함수 확인, **디슈가링**(Syntax Sugar 제거) 같은 무거운 작업이 불필요
- 디슈가링 예: 삼항 연산자, 구조분해할당 — 사람이 읽기 쉬운 문법을 내부 기본 형태로 되돌리는 작업
- **과도한 최적화를 수행하지 않는다**. 뒤에 TurboFan이 있기 때문

### 왜 중간 계층이 필요한가

Ignition만으로는 hot 코드 실행이 느리고, TurboFan은 컴파일 비용이 크다. 너무 일찍 TurboFan을 적용하면 **아직 hot도 아닌 함수**를 최적화해버리거나 **Deopt가 빈번**해진다. SparkPlug는 Ignition의 느린 실행과 TurboFan의 느린 컴파일 사이 간극을 메운다.

## TurboFan (최적화 컴파일러)

Ignition의 바이트코드와 프로파일링 데이터를 입력으로 받아 **복잡하고 정교한 최적화**를 수행하는 기계어 컴파일러.

### 대표 최적화 기법

- **Hidden Class / Inline Caching**: [[V8-Hidden-Class|히든 클래스]], [[V8-Inline-Cache|인라인 캐시]] 참조
- **Inlining**: 아래 섹션
- **Dead Code Elimination**: 실행되지 않는 코드 제거
- **Constant Folding**: 컴파일 시점에 계산 가능한 상수 미리 계산
- **Loop Unrolling**: 반복문을 풀어 분기 비용 절감

### Deoptimization (역최적화)

TurboFan이 최적화 시 세운 **가정이 깨지면** 최적화된 기계어를 버리고 Ignition 바이트코드로 복귀한다. 대표적 원인:

- 변수 타입 변경 (number → string)
- 새 프로퍼티 추가·삭제로 Hidden Class 변경
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
- 이전 엔진의 한계: 메모리 과소비, `try-catch`·ES6 신규 기능 최적화 불가

### 9.1 (SparkPlug 도입)

- Ignition↔TurboFan 간극을 메우는 **비최적화 중간 컴파일러** SparkPlug 추가

### 114+ (Maglev 추가)

- SparkPlug↔TurboFan 사이에 **경량 최적화 컴파일러** Maglev 추가

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Hidden-Class|V8 히든 클래스]]
- [[V8-Inline-Cache|V8 인라인 캐시]]
- [[Execution-Context|실행 컨텍스트]]
- [[Call-Stack-Heap|콜 스택 과 힙]]
