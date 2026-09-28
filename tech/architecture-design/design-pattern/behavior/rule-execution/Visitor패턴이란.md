---
tags: [architecture, design-pattern, behavioral, visitor]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Visitor Pattern", "방문자 패턴"]
---

# Visitor 패턴이란?

Visitor는 안정적인 객체 구조의 클래스들을 수정하지 않고 새로운 연산을 별도 객체에 추가하는 행동 패턴이다. 방문 대상의 실제 타입과 Visitor 타입을 함께 선택하는 이중 디스패치가 전형적인 구현의 핵심이다.

## 예시

```typescript
interface PricingVisitor {
  visitPhysical(item: PhysicalItem): Money
  visitDigital(item: DigitalItem): Money
}

interface Item {
  accept(visitor: PricingVisitor): Money
}

class PhysicalItem implements Item {
  accept(visitor: PricingVisitor): Money {
    return visitor.visitPhysical(this)
  }
}
```

세금 계산, 직렬화, 검증처럼 같은 객체 구조에 독립적인 연산이 계속 추가될 때 유용하다.

## 객체 구조와 순회 책임

GoF 구조에는 Visitor, ConcreteVisitor, Element, ConcreteElement 외에 원소를 열거하는 ObjectStructure가 있다. ObjectStructure는 [[Composite패턴이란|Composite]]일 수도 있고 리스트나 집합 같은 컬렉션일 수도 있다. Composite는 Visitor와 자주 함께 쓰지만 Visitor의 필수 구조는 아니다.

순회 책임은 객체 구조, Visitor, 별도 [[Iterator패턴이란|Iterator]] 중 한 곳에 둔다. 컬렉션은 원소마다 `accept`를 호출하고, Composite는 보통 복합 노드의 `accept`가 자식의 `accept`를 재귀 호출한다. 순회를 Visitor에 두면 복합 원소를 순회하는 코드가 ConcreteVisitor마다 중복되므로, 주로 앞선 연산 결과에 따라 순회 경로가 달라지는 복잡한 순회일 때 고른다.

```typescript
interface CartVisitor {
  visitPhysical(item: PhysicalItem): void
  visitDigital(item: DigitalItem): void
  visitBundle(bundle: Bundle): void
}

interface CartNode {
  accept(visitor: CartVisitor): void
}

class PhysicalItem implements CartNode {
  readonly kind = 'physical'

  constructor(readonly weightGrams: number) {}

  accept(visitor: CartVisitor): void {
    visitor.visitPhysical(this)
  }
}

class DigitalItem implements CartNode {
  readonly kind = 'digital'

  accept(visitor: CartVisitor): void {
    visitor.visitDigital(this)
  }
}

class Bundle implements CartNode {
  constructor(private readonly children: readonly CartNode[]) {}

  /**
   * 자신을 먼저 방문시킨 뒤 같은 Visitor를 자식에게 넘겨 트리 전체를 순회한다.
   * @param visitor 트리의 모든 노드에 적용할 연산
   */
  accept(visitor: CartVisitor): void {
    visitor.visitBundle(this)
    for (const child of this.children) {
      child.accept(visitor)
    }
  }
}

class ShippingWeightVisitor implements CartVisitor {
  private totalGrams = 0

  visitPhysical(item: PhysicalItem): void {
    this.totalGrams += item.weightGrams
  }

  visitDigital(_item: DigitalItem): void {}

  visitBundle(_bundle: Bundle): void {}

  get total(): number {
    return this.totalGrams
  }
}

const cart = new Bundle([
  new PhysicalItem(300),
  new DigitalItem(),
  new Bundle([new PhysicalItem(250)]),
])
const weight = new ShippingWeightVisitor()
cart.accept(weight)
weight.total // 550
```

`ShippingWeightVisitor`는 순회 방법을 모르고 원소별 처리만 맡는다. 순회 순서를 바꿀 때 고칠 곳은 복합 노드의 `accept` 하나다.

## 변화 방향의 트레이드오프

- 새 연산 추가: 새 Visitor를 만들면 되므로 쉽다.
- 새 Element 타입 추가: 모든 Visitor에 방문 메서드를 추가해야 하므로 어렵다.

따라서 Element 종류는 안정적이고 연산 종류가 자주 늘 때 적합하다. TypeScript의 discriminated union과 `switch`가 전체 타입 검사를 더 단순하고 명확하게 제공한다면 Visitor 계층보다 나을 수 있다.

Visitor가 대상의 private 상태를 과도하게 요구하면 캡슐화가 약해진다. 연산에 필요한 읽기 계약만 노출하고, 도메인 불변식을 깨는 변경 권한은 주지 않는다.

ConcreteVisitor는 방문하면서 결과를 자기 필드에 누적할 수 있다. Visitor 없이 연산을 원소 클래스에 흩어 두면 이 누적값을 순회 연산의 추가 인자로 넘기거나 전역 변수에 둔다. 대신 `ShippingWeightVisitor` 같은 누적형 Visitor는 순회 한 번에만 쓴다. NestJS provider의 기본 스코프는 애플리케이션 전체가 인스턴스 하나를 공유하는 singleton이므로, 누적형 Visitor를 provider로 주입해 재사용하면 이전 순회의 합계가 남고, 순회 중간에 `await`가 있으면 여러 요청의 순회가 같은 필드를 섞어 쓴다. 순회마다 `new`로 만들거나, `PricingVisitor`처럼 방문 메서드가 값을 반환하게 해 Visitor를 무상태로 둔다.

## TypeScript 구현 함정

- TypeScript 오버로드는 호출 시그니처만 여럿이고 구현 본문은 하나다. `visit(item: PhysicalItem)`과 `visit(item: DigitalItem)`을 오버로드로 선언해도 구현 클래스의 `visit` 본문은 하나뿐이라 그 안에서 타입을 다시 분기해야 한다. `visitPhysical`, `visitDigital`처럼 원소별 이름을 둔다.
- 방문 메서드를 `visit(node: CartNode)` 하나로 두고 Visitor마다 `instanceof`로 분기하면 `accept`가 맡던 타입 선택을 모든 Visitor가 반복하고, 새 원소 타입을 추가해도 컴파일 오류가 나지 않는다. 분기에 걸리지 않은 원소에 `node.accept(this)`를 다시 부르는 구조라면, `accept`에서 `visitor.visit(this)`를 호출하는 새 Leaf가 두 호출을 끝없이 반복해 호출 스택 한도를 넘는다(V8 기반인 Node.js와 Chrome에서는 `RangeError: Maximum call stack size exceeded`, Firefox에서는 `InternalError: too much recursion`). 원소별 방문 메서드를 선언한 인터페이스를 `implements`하면 방문 메서드를 빠뜨린 Visitor가 컴파일 단계에서 드러난다.
- 구조적 타이핑에서는 한 원소 클래스가 다른 원소 클래스의 멤버를 모두 가지면(모양이 같은 경우 포함) `accept`에서 엉뚱한 방문 메서드에 `this`를 넘겨도 컴파일된다. 원소 클래스마다 서로 다른 리터럴 판별 속성(위 예시의 `readonly kind`)이나 private 멤버를 두면 원소 타입끼리 대입되지 않아 이 실수가 컴파일 오류가 된다.

## 출처

- 얄팍한 코딩사전, [Visitor 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=244722)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 25. Visitor](https://www.youtube.com/watch?v=lULBRUBlBJY)
- [TypeScript Handbook, More on Functions](https://www.typescriptlang.org/docs/handbook/2/functions.html)
- [TypeScript Handbook, Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [NestJS, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [MDN, InternalError: too much recursion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Too_much_recursion)

## 관련 문서

- [[Interpreter패턴이란|Interpreter 패턴]]
- [[Composite패턴이란|Composite 패턴]]
- [[TS-Type-Narrowing-Pitfalls|TypeScript 타입 좁히기 함정]]
