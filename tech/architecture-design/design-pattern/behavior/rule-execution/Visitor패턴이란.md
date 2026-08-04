---
tags: [architecture, design-pattern, behavioral, visitor]
status: done
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

## 변화 방향의 트레이드오프

- 새 연산 추가: 새 Visitor를 만들면 되므로 쉽다.
- 새 Element 타입 추가: 모든 Visitor에 방문 메서드를 추가해야 하므로 어렵다.

따라서 Element 종류는 안정적이고 연산 종류가 자주 늘 때 적합하다. TypeScript의 discriminated union과 `switch`가 전체 타입 검사를 더 단순하고 명확하게 제공한다면 Visitor 계층보다 나을 수 있다.

Visitor가 대상의 private 상태를 과도하게 요구하면 캡슐화가 약해진다. 연산에 필요한 읽기 계약만 노출하고, 도메인 불변식을 깨는 변경 권한은 주지 않는다.

## 출처

- 얄팍한 코딩사전, [Visitor 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=244722)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994

## 관련 문서

- [[Interpreter패턴이란|Interpreter 패턴]]
- [[Composite패턴이란|Composite 패턴]]
- [[TS-Type-Narrowing-Pitfalls|TypeScript 타입 좁히기 함정]]
