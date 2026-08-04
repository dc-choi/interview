---
tags: [architecture, oop, solid, refactoring, value-object]
status: done
category: "Architecture - OOP"
aliases: ["Object Design Principles", "객체 설계 원칙과 리팩터링"]
---

# 객체 설계 원칙과 리팩터링

조영호 강사의 오브젝트 설계 원칙편을 바탕으로, 동작하는 코드를 변경하기 쉬운 구조로 다듬는 판단 기준을 정리한다. 원칙은 처음부터 완벽한 계층을 만드는 규칙이 아니라 테스트로 동작을 고정한 뒤 현재 코드의 문제와 리팩터링 방향을 찾는 도구다.

## 테스트를 안전망으로 둔다

리팩터링은 관찰 가능한 동작을 유지하면서 내부 구조를 바꾸는 일이다. 먼저 입력과 출력을 제어할 수 있는 테스트를 만들고 작은 단계로 구조를 바꾼다. 테스트하기 어려운 private 메서드를 공개하는 대신, 그 로직이 독립 책임인지 살펴 다른 객체로 이동한다.

외부 입력, 시간, 파일, 네트워크처럼 제어하기 어려운 의존성이 핵심 로직 안에 숨어 있으면 테스트도 설계도 어려워진다. 역할을 추출하고 생성자 주입으로 드러내면 실제 구현과 fake를 같은 계약으로 바꿔 끼울 수 있다. 테스트 용이성은 유용한 설계 피드백이지만 그 자체가 품질의 유일한 기준은 아니다.

## 메서드에는 한 추상화 수준을 둔다

조합 메서드(Composed Method)는 한 메서드를 비슷한 추상화 수준의 단계들로 구성한다.

```typescript
async place(command: PlaceOrderCommand): Promise<OrderId> {
  const order = this.createOrder(command)
  await this.charge(order)
  await this.orders.save(order)
  return order.id
}
```

상위 메서드는 무엇을 하는지 보여주고 각 하위 메서드는 어떻게 하는지를 감춘다. 추출 기준은 줄 수가 아니다. 이름을 붙였을 때 호출자의 의도가 더 선명해지는지, 중복이나 외부 의존성을 고립할 수 있는지가 기준이다. 너무 작은 메서드가 오히려 흐름을 흩뜨리면 추출하지 않는다.

## 값 객체로 별칭 문제를 줄인다

참조 객체는 식별성으로 구분하며 여러 변수가 같은 인스턴스를 가리킬 수 있다. 공유된 가변 상태는 한 별칭의 변경이 다른 별칭에서 예기치 않게 보이는 문제를 만든다. 값 객체는 속성 값으로 동등성을 판단하고 새 값으로 교체하는 불변 연산을 제공해 이 복잡성을 줄인다.

```typescript
class Position {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  move(dx: number, dy: number): Position {
    return new Position(this.x + dx, this.y + dy)
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y
  }
}
```

TypeScript의 `readonly`는 타입 검사 중 재할당을 막을 뿐 런타임 불변성이나 중첩 객체의 깊은 불변성을 보장하지 않는다. 외부에 가변 컬렉션을 그대로 내보내지 않고, 변경 메서드가 새 객체를 반환하게 만들며, 필요하면 런타임 방어도 별도로 적용한다.

## 변경 이유로 클래스를 나눈다

SRP의 책임은 막연한 기능 개수가 아니라 변경 이유다. 요구사항이 달라질 때 서로 다른 이유와 속도로 바뀌는 메서드 및 상태를 묶지 않는다.

1. 클래스가 하는 일을 책임 문장으로 적는다.
2. 같은 상태를 사용하고 함께 변경되는 메서드를 묶는다.
3. 분리 뒤 생긴 양방향 참조를 그대로 두지 말고 메시지 방향을 다시 설계한다.
4. 중복 제거가 목적이면 상속부터 만들지 말고 공통 객체를 합성할 수 있는지 본다.

클래스를 작게 만드는 것 자체가 목표는 아니다. 분리로 협력 경로와 관리 비용이 더 커진다면 현재 경계가 더 나을 수 있다.

## 인터페이스를 행동 계약으로 다듬는다

### 디미터 법칙과 묻지 말고 시켜라

객체가 낯선 객체의 내부 구조를 연쇄 탐색하지 않게 한다.

```typescript
// 내부 구조와 판단 규칙에 결합
if (order.customer.wallet.balance >= order.total) {
  order.customer.wallet.withdraw(order.total)
}

// 협력 대상에게 의도를 전달
order.payWith(customerWallet)
```

디미터 법칙은 점(`.`) 개수를 세는 규칙이 아니다. 직접 협력자의 내부 객체 구조를 알아야 하는지를 묻는 휴리스틱이다. DTO 변환이나 컬렉션 파이프라인처럼 내부 탐색이 아닌 코드를 기계적으로 금지하지 않는다.

### 명령과 조회를 구분한다

- Command는 상태를 바꾸며 변경 결과를 관찰하는 책임을 가진다.
- Query는 값을 반환하며 관찰 가능한 상태를 바꾸지 않는다.

둘을 분리하면 호출자가 시그니처와 이름만으로 부수효과를 예상하기 쉽다. 다만 생성 명령이 ID를 반환하거나 실패 결과를 돌려주는 실용적 API까지 무조건 금지하는 법칙은 아니다. 숨은 변경과 조회를 한 메서드에 뒤섞지 않는 것이 핵심이다.

## SOLID를 변경 축으로 읽는다

| 원칙 | 설계 질문 |
|---|---|
| SRP | 이 클래스는 서로 다른 이유나 이해관계자 때문에 함께 바뀌는가? |
| OCP | 예상한 변화가 생길 때 안정된 코드를 수정하지 않고 구현을 추가할 수 있는가? |
| LSP | 하위 타입이 상위 타입의 사전조건, 사후조건, 불변식과 관찰 가능한 행동을 보존하는가? |
| ISP | 각 클라이언트가 사용하지 않는 연산과 그 변경에 의존하는가? |
| DIP | 정책을 담은 상위 수준 코드와 세부 구현이 안정된 역할에 의존하는가? |

OCP는 모든 미래 변경을 막으라는 뜻이 아니다. 관찰된 변경 축에 안정된 역할을 만들고 그 역할의 구현을 확장한다. LSP는 문법상 `implements` 여부가 아니라 클라이언트가 타입 검사나 예외 분기 없이 대체할 수 있는 행동 계약이다. 사용하지 못하는 메서드를 빈 구현이나 예외로 채우면 LSP와 ISP를 함께 의심한다.

상속으로 기존 구현을 재사용하는 확장도 가능하지만 부모 내부 변경에 하위 타입이 함께 흔들릴 수 있다. 클라이언트가 안정된 역할에 의존하고 구현을 교체하는 다형적 확장과 구분한다. 한 상속 계층에 서로 다른 변경 축이 섞여 계약을 지키기 어렵다면 계층을 축별로 나누고 합성한다.

DIP와 DI도 구분한다. DIP는 의존 방향에 관한 설계 원칙이고, DI는 의존 객체를 외부에서 전달하는 구성 기법이다. NestJS에서는 TypeScript `interface`가 런타임에 지워지므로 `Symbol` 토큰이나 abstract class를 역할의 런타임 식별자로 사용한다.

## 리팩터링 순서

1. 대표 동작을 테스트로 고정한다.
2. 긴 흐름에서 추상화 수준이 다른 코드를 추출한다.
3. 가변 값과 별칭을 값 객체로 바꿀 후보를 찾는다.
4. 함께 변경되는 상태와 메서드를 기준으로 책임을 이동한다.
5. 외부 의존성을 역할 뒤로 보내고 생성자에서 주입한다.
6. 타입 분기, 빈 메서드, 거대한 인터페이스를 OCP, LSP, ISP 관점에서 점검한다.
7. 중복을 비슷한 형태로 정리한 뒤 상속보다 합성을 먼저 검토한다.

## 출처

- 얄팍한 코딩사전, [SOLID 원칙](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=236069)
- 조영호 강사, [단일 추상화 수준 원칙과 조합 메서드](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=276193)
- 조영호 강사, [참조 객체와 별칭 문제](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=280253)
- 조영호 강사, [값 객체의 가치](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=275117)
- 조영호 강사, [단일 책임 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=276707)
- 조영호 강사, [디미터 법칙과 묻지 말고 시켜라](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=280443)
- 조영호 강사, [명령 쿼리 분리 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=280444)
- 조영호 강사, [의존성 역전 원칙, 상위 수준과 하위 수준](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283585)
- 조영호 강사, [전통적인 개방-폐쇄 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283698)
- 조영호 강사, [다형적인 개방-폐쇄 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283699)
- 조영호 강사, [리스코프 치환 원칙을 위한 가이드](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283701)
- 조영호 강사, [인터페이스 분리 원칙](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=283706)
- 조영호 강사, [중복 코드 제거하기](https://www.inflearn.com/courses/lecture?courseId=336658&unitId=285460)
- [TypeScript 공식 문서, Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [Northeastern Demeter Project, Law of Demeter](https://www2.ccs.neu.edu/research/demeter/demeter-method/LawOfDemeter/LawOfDemeter.htm)
- [Liskov, Wing, A Behavioral Notion of Subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf)

## 관련 문서

- [[Responsibility-Driven-Design|책임 주도 설계와 GRASP]]
- [[SOLID-In-Practice|SOLID 실전 적용]]
- [[Generalization-vs-Abstraction|일반화와 추상화]]
- [[Defensive-Copy-Immutable-Practice|방어적 복사와 불변 객체]]
