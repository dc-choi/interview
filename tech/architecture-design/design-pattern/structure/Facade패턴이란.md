---
tags: [architecture, design-pattern, structural, facade]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Facade Pattern", "퍼사드 패턴"]
---

# Facade 패턴이란?

Facade는 복잡한 서브시스템 앞에 사용 목적에 맞춘 단순한 진입점을 두는 구조 패턴이다. 내부 객체를 감추는 것 자체보다 클라이언트가 알아야 할 협력 순서와 의존성 수를 줄이는 데 목적이 있다.

## 구조와 예시

- Client: 단순화된 작업을 요청한다.
- Facade: 작업 순서를 조율하고 서브시스템에 위임한다.
- Subsystem: 실제 기능을 수행하며 Facade를 알 필요가 없다.

```typescript
@Injectable()
class CheckoutFacade {
  constructor(
    private readonly inventory: InventoryService,
    private readonly payments: PaymentService,
    private readonly orders: OrderService,
  ) {}

  async checkout(command: CheckoutCommand): Promise<OrderId> {
    await this.inventory.reserve(command.items)
    const payment = await this.payments.charge(command.payment)
    return this.orders.place(command, payment)
  }
}
```

Controller는 재고, 결제, 주문의 호출 순서를 직접 알지 않는다. 다만 트랜잭션 경계, 실패 보상과 멱등성은 Facade라는 이름이 자동으로 해결하지 않으므로 별도로 설계해야 한다.

## 인스턴스 수명과 결과 전달

Facade 객체는 보통 하나면 충분해 Singleton으로 두는 경우가 많다. 캐시처럼 호출 사이에 이어져야 할 상태를 Facade 필드에 두면 이 전제가 필요하다. NestJS provider는 기본이 싱글턴 스코프지만, Facade가 durable이 아닌 REQUEST 스코프 provider에 의존하면 스코프가 주입 체인을 따라 올라와 Facade도 요청마다 새로 만들어지고 필드 상태가 요청 사이에 이어지지 않는다([[Injection-Scopes|NestJS 주입 스코프]]). 요청 사이에 유지할 상태는 별도 싱글턴 provider로 분리해 주입받는다.

캐시 적중처럼 즉시 끝나는 경로와 I/O를 기다리는 경로를 함께 조율하면 결과 전달 방식을 하나로 맞춘다. 적중 때는 콜백을 바로 부르고 미스 때는 응답 뒤에 부르면 호출부가 보는 실행 순서가 내부 분기에 따라 달라져, Facade가 감춰야 할 서브시스템 사정이 드러난다([[Async-Internals-Patterns#Zalgo 문제|Zalgo 문제]]). 위 예시처럼 `Promise`를 반환하는 `async` 메서드로 두면 이미 이행된 값이라도 `then` 콜백과 `await` 뒤의 코드가 동기로 실행되지 않으므로, 두 경로 모두 현재 실행 중인 동기 코드가 끝난 뒤에 결과를 받는다. 다만 타이머나 다른 `Promise` 콜백 같은 비동기 작업과의 상대 순서까지 같아지지는 않는다.

## 다른 패턴과 구분

- Adapter는 기존 인터페이스를 클라이언트가 원하는 계약으로 변환한다.
- Facade는 여러 협력자를 사용하기 쉬운 고수준 작업으로 묶는다.
- Proxy는 대상과 같은 계약을 유지한 채 접근을 제어한다. 둘은 내부 조율이 아니라 드러내는 계약으로 구분한다. 캐시 확인과 저장소 조회를 내부에서 조율해도 저장소와 같은 조회 계약이면 Caching Proxy에 가깝고, 재고 확보, 결제와 주문 생성처럼 여러 서브시스템 호출을 서브시스템에 없던 고수준 작업으로 묶어 새 계약을 만들면 Facade다.
- Mediator는 동료 객체들이 서로 직접 통신하지 않게 상호작용 규칙을 중앙화한다.

Facade가 모든 사용 사례와 도메인 규칙을 흡수하면 God Object가 된다. 특정 클라이언트가 반복해서 수행하는 안정된 조율만 제공하고, 필요한 고급 기능에는 서브시스템 직접 접근을 허용할 수 있다.

## 서브시스템 공개 범위

Facade는 서브시스템 공개 인터페이스의 일부일 뿐 유일한 부분이 아니며, 다른 서브시스템 클래스도 보통 공개된다. 공개 범위를 좁혀 클라이언트가 Facade에만 의존하게 하면 약한 결합을 얻는다. 서브시스템 구성 요소를 바꿔도 클라이언트가 영향을 받지 않고, 복잡하거나 순환하는 의존도 끊을 수 있다. NestJS에서 순환 의존을 Facade로 푸는 방법은 [[NestJS-Circular-Dependency-Refactoring|순환 의존성 구조 리팩토링]]에 있다.

1990년대 초에는 C++와 Smalltalk의 클래스 이름 공간이 전통적으로 전역이어서 서브시스템 클래스를 비공개로 만드는 언어 지원이 드물었고, C++는 표준화 위원회가 막 namespace를 추가한 참이었다. TypeScript와 Node.js에서는 계층마다 수단이 있다.

- 패키지: 서브시스템 클래스를 진입점에서 다시 export하지 않는다. `package.json`에 `exports`를 정의하면 패키지 이름으로 정의하지 않은 하위 경로를 불러올 때 `ERR_PACKAGE_PATH_NOT_EXPORTED` 오류가 난다. 절대 경로로 파일을 직접 불러오는 것까지 막지는 않는 약한 캡슐화다([[Module-System-ESM#package.json exports 필드|package.json exports 필드]]).
- NestJS 모듈: 현재 모듈의 provider이거나 import한 모듈이 export한 provider만 주입할 수 있다. Facade 서비스만 `exports`에 두면 다른 모듈은 서브시스템 provider를 주입받지 못한다([[NestJS-Core-Concepts#모듈 시스템|NestJS 모듈 시스템]]). `@Global()` 모듈이 export한 provider는 import 없이 주입되고, 이 경계는 주입 해석 단계에 적용되므로 `ModuleRef.get(X, { strict: false })`로는 다른 모듈의 export하지 않은 provider도 조회할 수 있다([[Module-reference|NestJS ModuleRef]]).
- 클래스 멤버: Facade가 서브시스템 객체를 담는 필드의 `private`는 타입 검사 단계의 제약이라 대괄호 접근 같은 우회가 남는다. 런타임에도 숨겨야 하면 `#` 필드를 쓴다([[TS-Class-Type-System#접근 제어자의 실행 시점|접근 제어자의 실행 시점]]).

## 출처

- 얄팍한 코딩사전, [Facade 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=236115)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 19. Facade](https://www.youtube.com/watch?v=LmyEsU47AGg)
- [NestJS, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [NestJS, Modules](https://docs.nestjs.com/modules)
- [NestJS, Module reference](https://docs.nestjs.com/fundamentals/module-ref)
- [Node.js, Modules: Packages](https://nodejs.org/api/packages.html)
- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [MDN, Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN, await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)

## 관련 문서

- [[Adapter패턴이란|Adapter 패턴]]
- [[Proxy패턴이란|Proxy 패턴]]
- [[Mediator패턴이란|Mediator 패턴]]
- [[Hexagonal-In-Practice|헥사고날 아키텍처 실전]]
