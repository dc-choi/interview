---
tags: [architecture, design-pattern, structural, composite]
status: done
verified_at: 2026-08-04
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
- 순환 구조가 가능하면 생성 시 검증이 필요하다.
- 조합의 깊이, 실행 순서와 실패 정책이 복잡해질 수 있다.
- 단순한 두 정책뿐이고 조합이 늘지 않는다면 일반 함수나 배열 순회가 더 명확할 수 있다.

## 출처

- 조영호 강사, [중복 할인 정책 추가하기](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234593)
- 조영호 강사, [중복 할인 정책 추가하기 예제](https://www.inflearn.com/courses/lecture?courseId=334416&unitId=234614)
- 얄팍한 코딩사전, [Composite 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=246153)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)

## 관련 문서

- [[Strategy패턴이란|Strategy 패턴]]
- [[Responsibility-Driven-Design|책임 주도 설계와 GRASP]]
- [[SOLID-In-Practice|SOLID 실전 적용]]
