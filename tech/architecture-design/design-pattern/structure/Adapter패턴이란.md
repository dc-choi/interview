---
tags: [architecture, design-pattern, structural, adapter]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Adapter Pattern", "어댑터 패턴"]
---

# Adapter 패턴이란?

Adapter는 클라이언트가 기대하는 Target 계약과 호환되지 않는 Adaptee의 인터페이스를 변환하는 구조 패턴이다. 외부 SDK나 레거시 시스템의 세부를 애플리케이션 경계 뒤에 격리할 때 유용하다.

Adaptee를 직접 고치지 않는 이유도 적용 판단에 들어간다. 소스를 소유하지 않은 라이브러리는 고칠 수 없고, 고칠 수 있더라도 여러 곳에서 재사용하는 클래스가 한 애플리케이션의 도메인 인터페이스를 따를 이유는 없다. 신버전으로 교체하는 동안 구버전 계약에 의존하는 호출부가 남았다면 신버전 구현 위에 구버전 계약을 제공하는 Adapter로 두 계약을 함께 지원하고, 이전이 끝나면 Adapter만 삭제한다. API 경계에서 같은 전략을 쓰는 방법은 [[API-Versioning-Design|API 버전 설계]]에서 다룬다.

## NestJS 예시

```typescript
interface PaymentGateway {
  charge(command: ChargeCommand): Promise<PaymentResult>
}

@Injectable()
class VendorPaymentAdapter implements PaymentGateway {
  constructor(private readonly client: VendorClient) {}

  async charge(command: ChargeCommand): Promise<PaymentResult> {
    try {
      const response = await this.client.request({
        price: command.amount.toNumber(),
        key: command.idempotencyKey,
      })
      return PaymentResult.approved(response.transactionId)
    } catch (error) {
      throw mapVendorError(error)
    }
  }
}
```

외부 시스템 경계의 Adapter는 메서드 이름만 바꾸는 데서 끝나지 않는다. DTO, 단위, 오류, 동기와 비동기 방식, 타임아웃과 재시도 의미까지 내부 계약으로 변환한다. Adapter가 하는 일의 양은 연산 이름만 바꾸는 단순 변환부터 전혀 다른 연산 집합을 지원하는 수준까지 넓고, Target과 Adaptee가 얼마나 비슷한지에 달려 있다. 의미가 근본적으로 다른 두 시스템을 억지로 같은 인터페이스에 넣으면 차이를 숨길 뿐 제거하지 못한다.

## 객체 어댑터와 클래스 어댑터

GoF는 Adapter가 Adaptee를 Target에 연결하는 방식을 둘로 나눈다. 위 `VendorPaymentAdapter`처럼 Adaptee를 필드로 보유하고 위임하면 객체 어댑터, Adaptee를 상속하면서 Target을 따르면 클래스 어댑터다.

- 객체 어댑터: Adapter 하나가 Adaptee와 그 하위 클래스 인스턴스를 모두 다루고, 모든 Adaptee에 기능을 한 번에 더할 수 있다. Adaptee 동작 일부를 바꾸려면 Adaptee의 하위 클래스를 만들고 Adapter가 그 하위 클래스를 참조하게 해야 한다.
- 클래스 어댑터: Adaptee 동작 일부를 재정의할 수 있고 위임할 객체가 따로 생기지 않는다. 대신 구체 Adaptee 클래스 하나에 묶여 그 클래스와 하위 클래스를 함께 적응시키지 못한다.

```typescript
// 클래스 어댑터: Adaptee를 상속하면서 Target을 구현한다
class VendorClientPaymentAdapter extends VendorClient implements PaymentGateway {
  async charge(command: ChargeCommand): Promise<PaymentResult> {
    try {
      const response = await this.request({
        price: command.amount.toNumber(),
        key: command.idempotencyKey,
      })
      return PaymentResult.approved(response.transactionId)
    } catch (error) {
      throw mapVendorError(error)
    }
  }
}

// Adaptee 타입 자리에도 대입되므로 request를 직접 호출하는 경로가 남는다
const client: VendorClient = new VendorClientPaymentAdapter()
```

JavaScript 클래스는 상위 클래스를 하나만 `extends`할 수 있으므로 클래스 어댑터는 Adaptee를 상속하고 Target은 `implements`로 따른다. C++에서는 Adaptee를 private으로 상속해 Adapter를 Target의 하위 타입으로만 만들 수 있지만, TypeScript는 파생 클래스를 상위 클래스의 하위 타입으로 강제하므로 클래스 어댑터가 Adaptee 자리에도 쓰인다. 외부 SDK를 경계 뒤에 숨기려는 목적에서는 이것이 Adaptee API가 새는 통로가 되므로, Adaptee를 생성자로 주입받는 객체 어댑터를 기본으로 둔다.

TypeScript는 멤버 구조로 타입 호환성을 판정한다. Target이 `interface`이고 기존 클래스의 public 멤버가 이미 그 구조를 만족하면 Adapter 없이 대입된다. 구조가 맞아 컴파일되더라도 단위, 오류와 nullable 의미까지 같다는 보장은 없으므로 적용 체크포인트는 그대로 확인한다.

Target을 `private`, `protected` 인스턴스 멤버나 `#` 비공개 인스턴스 멤버(필드, 메서드, 접근자)가 있는 클래스로 두면 그 멤버가 같은 클래스 선언에서 유래해야 호환된다. 모양이 같은 다른 계층의 클래스는 대입되지 않고, Target을 `implements`하면 TS2720 오류가 난다. 이때 Adapter는 Target을 `extends`해야 하고, 하나뿐인 상속 자리를 Target에 쓰므로 Adaptee는 필드로 보유하는 객체 어댑터가 된다. NestJS에서 abstract class를 계약 겸 DI 토큰으로 쓰면서 `protected` 상태를 두는 경우가 여기에 해당한다. 비공개 멤버의 호환 규칙은 [[TS-Class-Type-System|TypeScript 클래스 타입 시스템]]에서, 추상 클래스를 DI 토큰으로 등록하는 방법은 [[Clean-Architecture-NestJS-Layers|NestJS 추상 클래스 토큰]]에서 다룬다.

## 적용 체크포인트

- 외부 타입이 도메인과 애플리케이션 내부로 새지 않는가?
- 외부 오류가 안정된 내부 오류 분류로 변환되는가?
- 금액, 시간대, 식별자와 nullable 의미가 보존되는가?
- 재시도 가능한 실패와 영구 실패를 구분하는가?
- 계약 테스트로 실제 Adaptee와의 호환성을 검증하는가?

## 다른 패턴과 구분

- Facade는 복잡한 서브시스템에 단순한 고수준 진입점을 제공한다.
- Bridge는 설계 시점부터 독립적인 두 변화 축을 분리한다.
- Decorator는 같은 Component 계약을 유지하면서 책임을 겹쳐 붙인다.

## 출처

- 얄팍한 코딩사전, [Adapter 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242783)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- yongsoocho, [TypeScript로 구현하는 Adapter](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=150430)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 6. Adapter](https://www.youtube.com/watch?v=L3fxjPFPvak)
- [Design Patterns: Adapter — InformIT](https://www.informit.com/articles/article.aspx?p=1398600)
- [TypeScript 공식 문서, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript 공식 문서, Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [MDN, extends](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends)
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)

## 관련 문서

- [[Facade패턴이란|Facade 패턴]]
- [[Bridge패턴이란|Bridge 패턴]]
- [[Hexagonal-In-Practice|헥사고날 아키텍처 실전]]
