---
tags: [architecture, design-pattern]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Strategy 패턴이란?"]
---

# Strategy 패턴이란?
변화하는 알고리즘을 상호 교환 가능한 역할로 추출하고 Context가 합성해 사용하게 하는 패턴이다. 전략은 객체, 함수 또는 클로저로 구현할 수 있다.

## 왜 쓸까?

### if-else 체인 없이 알고리즘을 교체
조건문으로 분기하는 대신, 전략 객체를 주입하여 알고리즘을 선택한다.

### 새 전략 추가 시 안정된 코드 수정 최소화
기존 Context와 다른 전략을 유지한 채 Concrete Strategy를 추가할 수 있다. 다만 전략을 선택하고 등록하는 구성 루트나 팩토리는 새 구현을 알도록 바뀔 수 있다.

### 전략 객체를 독립적으로 테스트 가능
각 전략은 독립된 객체이므로 단위 테스트가 쉽다.

### 관심사 분리
Context는 무엇을 할지, Strategy는 어떻게 할지를 담당한다.

## 핵심 개념

### 구조
Context + Strategy Interface + Concrete Strategies
- Context: 전략을 사용하는 객체. 전략을 런타임에 교체 가능
- Strategy: 알고리즘의 공통 인터페이스
- Concrete Strategy: 실제 알고리즘 구현

### Template Method와의 차이
| 항목 | Strategy | Template Method |
|------|----------|-----------------|
| 관계 | has-a (합성) | is-a (상속) |
| 변형 방식 | 전략 객체를 주입하거나 선택 | 하위 클래스가 단계 일부를 재정의 |
| 결합 대상 | 역할의 구현 | 상위 클래스의 골격과 보호 메서드 |

### 같은 행동, 다른 비용의 구현
Strategy는 같은 행동을 시간과 공간 비용이 다른 알고리즘으로 구현해 두고 입력 규모나 실행 환경에 맞게 고르는 데도 쓴다. 1부터 n까지의 합을 반복문(O(n))과 가우스 공식(O(1))으로 따로 구현해 두면 Context 코드를 그대로 두고 더 빠른 구현으로 바꿀 수 있다. 대신 고르는 쪽은 전략 사이의 차이를 알아야 한다.

교체할 수 있다는 것은 시그니처가 같다는 뜻이 아니라 같은 계약을 지킨다는 뜻이다. TypeScript의 `implements`는 클래스를 인터페이스 타입으로 다룰 수 있는지만 검사하므로([[TS-Class-Type-System|TypeScript 클래스 타입 시스템]]) 허용 입력 범위, 경계값의 결과와 오류 처리는 타입이 보장하지 않는다. 아래 두 구현은 계약 안의 입력, 즉 결과가 안전한 정수 범위에 드는 0 이상의 정수에서는 같은 값을 내지만 계약 밖에서는 갈라질 수 있다. n = -5 같은 음수에서 반복문은 0, 공식은 10을 반환하고, n = 0.5 같은 소수에서도 0과 0.375로 다르다. 결과가 `Number.MAX_SAFE_INTEGER`를 넘으면 반복문의 덧셈 반올림 때문에 값이 달라질 수 있다(예: n = 2 ** 28). 허용 입력을 인터페이스 계약에 적고 벗어난 입력은 Context 경계에서 한 번 거부하거나, 모든 구현에 같은 계약 테스트를 돌린다. 이는 LSP의 사전조건과 사후조건 보존을 전략에 적용한 것이다([[Object-Design-Principles|객체 설계 원칙과 리팩터링]]).

```typescript
/** 1부터 n까지의 합을 구한다. 계약: n은 결과가 안전한 정수 범위에 드는 0 이상의 정수다. */
interface SumStrategy {
  sum(n: number): number
}

/** 반복문으로 더한다. 시간 O(n). */
class LoopSumStrategy implements SumStrategy {
  sum(n: number): number {
    let total = 0
    for (let i = 1; i <= n; i += 1) {
      total += i
    }
    return total
  }
}

/** 가우스 공식 n(n + 1) / 2를 쓴다. 시간 O(1). */
class GaussSumStrategy implements SumStrategy {
  sum(n: number): number {
    return (n * (n + 1)) / 2
  }
}

/**
 * 전략 간 결과가 하나라도 갈라지는 입력을 찾는다.
 * 기대값과 비교하지 않아 모든 전략이 똑같이 틀리면 놓치므로 계약 테스트를 보조하는 도구다.
 * @param strategies 서로 교체할 수 있어야 하는 전략 목록
 * @param inputs 비교할 입력과 경계값
 * @returns 전략 간 결과가 갈라진 입력 목록
 */
const findDivergentInputs = (
  strategies: readonly SumStrategy[],
  inputs: readonly number[],
): number[] => {
  return inputs.filter((n) => new Set(strategies.map((strategy) => strategy.sum(n))).size > 1)
}

const strategies = [new LoopSumStrategy(), new GaussSumStrategy()]
findDivergentInputs(strategies, [0, 1, 100]) // []
findDivergentInputs(strategies, [-5]) // [-5]: 반복문은 0, 공식은 10
```

### 코드 예시: 멀티포맷 Config
```typescript
interface ConfigStrategy {
  deserialize(data: string): Record<string, any>
  serialize(data: Record<string, any>): string
}

const jsonStrategy: ConfigStrategy = {
  deserialize: (data) => JSON.parse(data),
  serialize: (data) => JSON.stringify(data, null, 2)
}

const iniStrategy: ConfigStrategy = {
  deserialize: parseIni,
  serialize: stringifyIni
}

class Config {
  private data: Record<string, any> = {}

  constructor(private strategy: ConfigStrategy) {}

  async read(filePath: string) {
    const raw = await fs.readFile(filePath, 'utf-8')
    this.data = this.strategy.deserialize(raw)
  }

  async save(filePath: string) {
    await fs.writeFile(filePath, this.strategy.serialize(this.data))
  }
}
```

## 실 사용 사례
1. Passport.js: LocalStrategy, GoogleStrategy, JWTStrategy
2. 결제 시스템: 카드/계좌이체/간편결제 전략
3. 압축: gzip/brotli/deflate 전략
4. 정렬: 데이터 크기에 따라 다른 정렬 알고리즘
5. WMS 피킹: 주문, 단품, 배치, 총량 피킹 4종 (추상 `BasePickingStrategy` + 각 concrete에서 `createInstruction()`, `filterOrders()` 구현)
6. 회의실 예약 승격: FIFO, VIP 우선 등 승격 정책을 `PromotionPolicy` 전략으로 분리. 도메인 객체(슬롯)가 정책을 직접 알지 않고 주입받아 위임

## 실전 도입 시점

조건문 개수만으로 도입을 결정하지 않는다. 같은 변화 축의 알고리즘이 독립적으로 늘고, 클라이언트가 구체 타입을 검사하며, 각 구현을 따로 교체하거나 테스트할 필요가 있을 때 도입을 검토한다. 단순하고 안정적인 분기는 `if`가 더 읽기 좋다. 함정:

- **모든 if-else를 Strategy로**: 과설계. 한 번만 쓰는 분기는 그냥 if
- **전략 간 공통 로직 반복**: 추상 클래스에 Template Method로 끌어올리거나 합성으로 공유
- **Strategy 주입을 잊고 Context에서 직접 new**: DI 이점 사라짐 — 팩토리나 DI 컨테이너로 주입

디자인 패턴은 만능 해법이 아니라 상황에 따른 선택이다. 명확한 이유가 없으면 도입하지 않고, 도입 후 오버헤드가 크면 되돌린다.

## 정책이 늘어날 때: 메서드 분리가 아니라 전략 추출

도메인 객체 하나에 정책이 계속 쌓이는 상황(예: 예약 승격에 FIFO, VIP 우선, 부서 가중치 등이 추가됨)에서 흔한 오답이 메서드를 잘게 나누는 것이다. 메서드 분리는 줄 수만 옮길 뿐 그 객체의 **책임(관심사) 수는 그대로**다. 객체가 모든 정책을 다 안다는 사실 자체가 문제다.

- **인지 부하의 척도는 줄 수가 아니라 관심사 수다.** 한 파일이 200줄이냐가 아니라, 한 객체가 알아야 하는 정책이 몇 개냐가 이해와 변경을 어렵게 한다.
- 해법은 정책을 객체 밖으로 빼는 것. `PromotionPolicy` 인터페이스 + 구현체(`FifoPromotionPolicy`, `VipPriorityPromotionPolicy`)를 두고, Context(슬롯)는 정책 목록을 주입받아 정렬과 필터를 위임만 한다.
- 정책 추가 = 새 구현체 한 개(OCP). Context와 기존 정책은 손대지 않는다. 각 정책은 독립 단위 테스트가 가능하다.
- 권한 판정 같은 분기도 도메인 엔티티에 `checkPermission`을 박지 말고 인가 정책이나 도메인 서비스로 뺀다. 엔티티가 권한 규칙까지 떠안으면 다시 god object가 된다.

이게 OCP의 실전 모습이다 ([[SOLID-In-Practice]]의 할인 정책 확장과 같은 축). 관련 함정은 [[Elegant-OOP-Design]].

## 출처
- [jminc00 — 전략 패턴 구현 예제 (WMS 피킹 리팩토링)](https://jminc00.tistory.com/100)
- 조영호 강사, [유연한 설계, 다형성](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234577)
- 얄팍한 코딩사전, [Strategy 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242675)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 4. Strategy](https://www.youtube.com/watch?v=TiHzYc8I3Kk)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [TypeScript 공식 문서, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [MDN, Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER)

## 관련 문서

- [[State패턴이란#Strategy와의 차이|State 패턴과의 차이]]
- [[TemplateMethod패턴이란|Template Method 패턴]]
