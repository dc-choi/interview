---
tags: [architecture, design-pattern, structural, composite]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Composite 패턴이란?", "컴포지트 패턴"]
---

# Composite 패턴이란?

Composite는 개별 객체(Leaf)와 객체들의 조합(Composite)을 같은 Component 역할로 다루는 구조 패턴이다. 클라이언트는 단일 객체인지 조합인지 구분하지 않고 같은 메시지를 보낸다.

## 언제 유용한가

- 부분과 전체가 트리 구조를 이룬다.
- 단일 정책과 여러 정책의 조합을 같은 방식으로 실행하고 싶다.
- 조합 요구가 늘 때 기존 클라이언트의 타입 분기와 수정을 피하고 싶다.

단순히 배열을 감싼다고 Composite가 되는 것은 아니다. Leaf와 Composite가 같은 행동 계약을 지키고 클라이언트가 둘을 대체 가능하게 사용할 때 패턴의 효과가 생긴다.

## 중복 할인 정책 예시

```typescript
interface DiscountPolicy {
  discount(context: DiscountContext): Money
}

class FixedDiscountPolicy implements DiscountPolicy {
  constructor(private readonly amount: Money) {}

  discount(_context: DiscountContext): Money {
    return this.amount
  }
}

class OverlappedDiscountPolicy implements DiscountPolicy {
  private readonly policies: readonly DiscountPolicy[]

  constructor(policies: readonly DiscountPolicy[]) {
    this.policies = [...policies]
  }

  discount(context: DiscountContext): Money {
    return this.policies.reduce(
      (total, policy) => total.plus(policy.discount(context)),
      Money.zero(),
    )
  }
}
```

`FixedDiscountPolicy`는 Leaf, `OverlappedDiscountPolicy`는 Composite다. 둘 다 `DiscountPolicy`이므로 `Movie` 같은 클라이언트는 새 조합 정책을 위해 수정되지 않는다. 기존 정책 객체를 재사용하고 조합 규칙만 새 클래스로 확장한다.

## 조합 의미를 먼저 정한다

Composite가 결과 결합 규칙까지 정해 주지는 않는다.

- 합산: 각 할인을 모두 더한다.
- 최댓값: 가장 큰 할인 하나만 고른다.
- 순차 적용: 앞 정책의 결과가 다음 정책의 입력이 된다.
- 첫 성공: 조건을 만족한 첫 정책에서 멈춘다.

할인의 중복 허용, 상한, 음수 방지, 적용 순서는 도메인 규칙이다. 이를 `reduce` 구현에 암묵적으로 숨기지 말고 이름과 테스트로 드러낸다. 외부에서 받은 가변 배열을 그대로 보관하지 않고 복사하거나 읽기 전용 컬렉션으로 노출하는 것도 필요하다.

## 자식 관리 연산의 위치

`add`, `remove` 같은 자식 관리 연산을 어느 타입에 선언할지는 투명성과 안전성 사이의 선택이다. GoF는 투명성 쪽을 기준으로 패턴을 설명한다.

- Component에 선언한다(투명성): 트리를 조립하는 코드도 Leaf와 Composite를 구분하지 않는다. 대신 Leaf의 `add`는 보통 예외를 던지게 하는 편이 낫다. 아무 일도 하지 않게 두면 Leaf에 자식을 넣는 버그가 조용히 묻힌다. 어느 쪽이든 이 잘못은 컴파일 시점에 잡히지 않는다.
- Composite에만 선언한다(안전성): Leaf에 자식을 넣는 코드는 컴파일되지 않는다. 대신 조립 코드가 대상이 Composite인지 알아야 하므로 `instanceof`나 사용자 정의 타입 가드(`item is Bundle`)로 타입을 좁힌 뒤 `add`를 호출한다. `instanceof`는 생성자의 `prototype`을 검사하므로 Composite 역할을 `interface`로만 정의했다면 판별 속성이나 타입 가드 함수가 필요하다.
- 생성자로만 자식을 받는다: 위 할인 예시처럼 받은 컬렉션을 복사하고 조립 뒤 구성을 바꾸지 않으면 자식 관리 연산이 필요 없다. 트리의 모든 Composite가 이렇게 만들어지면 자식이 부모보다 먼저 만들어지므로 부모가 자기 자손이 되는 순환도 생기지 않는다. `add`를 여는 Composite가 섞이면 생성자로 만든 부모도 자기 가변 자식에 `add`되어 순환에 들 수 있으므로, 순환 검사는 다른 Composite 타입이나 자식을 감싼 Decorator처럼 `Bundle`이 아닌 객체의 자식까지 탐색해야 한다.

```typescript
interface CatalogItem {
  price(): number
}

class Product implements CatalogItem {
  constructor(private readonly unitPrice: number) {}

  price(): number {
    return this.unitPrice
  }
}

class Bundle implements CatalogItem {
  private readonly items: CatalogItem[] = []

  /**
   * 구성품을 추가한다. 자기 자신이나 자신을 이미 포함한 묶음은 거부한다.
   * @param item 추가할 상품 또는 묶음
   */
  add(item: CatalogItem): void {
    const createsCycle = item === this || (item instanceof Bundle && item.contains(this))
    if (createsCycle) {
      throw new Error('묶음 구성에 순환이 생긴다')
    }
    this.items.push(item)
  }

  /**
   * 하위 트리에 대상이 있는지 확인한다.
   * @param target 찾을 항목
   * @returns 포함 여부
   */
  contains(target: CatalogItem): boolean {
    return this.items.some(
      (item) => item === target || (item instanceof Bundle && item.contains(target)),
    )
  }

  price(): number {
    return this.items.reduce((total, item) => total + item.price(), 0)
  }
}
```

`add`가 `Bundle`에만 있으므로 `Product`에 구성품을 넣는 코드는 컴파일되지 않는다. `price()`는 자식에게 같은 메시지를 보내 트리 전체를 재귀로 계산한다. `add`의 순환 검사 없이 자기 자신이나 조상을 자식으로 넣으면 재귀 위임이 끝나지 않고, V8 기반인 Node.js와 Chrome에서는 `RangeError: Maximum call stack size exceeded`로 실패한다. 이 검사는 추가 대상과 하위 항목이 `Bundle`일 때만 따라 내려가므로 `Bundle`이 아닌 객체를 거쳐 이어진 순환은 찾지 못한다.

## NestJS에서 조립하기

도메인 객체가 NestJS 컨테이너를 직접 조회하지 않게 한다. Module이나 Factory Provider가 Leaf들을 주입받아 Composite를 만들고 `DiscountPolicy` 토큰으로 등록한다. 도메인은 프레임워크가 아니라 역할에만 의존한다.

TypeScript `interface`는 런타임에 지워지므로 NestJS 등록에는 `Symbol`이나 abstract class 같은 런타임 토큰이 필요하다.

## 장점과 비용

### 장점

- 단일 객체와 조합을 동일하게 다룬다.
- 클라이언트의 타입 분기를 줄인다.
- 기존 구현을 수정하지 않고 새로운 조합을 추가하기 쉽다.

### 비용

- 모든 Leaf에 자연스럽지 않은 연산까지 공통 인터페이스에 넣으면 ISP와 LSP를 해친다.
- 트리를 이루는 클래스 종류는 거의 바뀌지 않는데 트리 전체에 적용할 연산만 계속 늘어난다면 연산을 Component 인터페이스에 쌓지 않고 [[Visitor패턴이란|Visitor]]로 모을 수 있다. 대신 Leaf나 Composite 클래스가 늘면 Visitor 인터페이스와 각 구현에 방문 연산을 추가해야 한다.
- 조립 뒤 `add`로 자식을 넣을 수 있으면 추가 시점에 순환을 검증해야 한다.
- 원본과 독립된 트리를 복제하려면 Composite의 `clone()`이 자식까지 재귀적으로 복제해야 한다. 자식 참조만 복사하면 원본과 복제본이 하위 트리를 공유해 한쪽의 변경이 다른 쪽에 보인다. 복제 의미는 [[Prototype패턴이란|Prototype 패턴]]에서 다룬다.
- 조합의 깊이, 실행 순서와 실패 정책이 복잡해질 수 있다.
- 단순한 두 정책뿐이고 조합이 늘지 않는다면 일반 함수나 배열 순회가 더 명확할 수 있다.

## 출처

- 조영호 강사, [중복 할인 정책 추가하기](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234593)
- 조영호 강사, [중복 할인 정책 추가하기 예제](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234614)
- 얄팍한 코딩사전, [Composite 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=246153)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 11. Composite](https://www.youtube.com/watch?v=_3fS1KCCP1U)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 18. Prototype](https://www.youtube.com/watch?v=tLf6Yh_y3LM)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 25. Visitor](https://www.youtube.com/watch?v=lULBRUBlBJY)
- [TypeScript 공식 문서, Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [MDN, InternalError: too much recursion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion)
- [Node.js 공식 문서, The V8 JavaScript Engine](https://nodejs.org/en/learn/getting-started/the-v8-javascript-engine)

## 관련 문서

- [[Strategy패턴이란|Strategy 패턴]]
- [[Responsibility-Driven-Design|책임 주도 설계와 GRASP]]
- [[SOLID-In-Practice|SOLID 실전 적용]]
- [[Prototype패턴이란|Prototype 패턴]]
- [[Visitor패턴이란|Visitor 패턴]]
