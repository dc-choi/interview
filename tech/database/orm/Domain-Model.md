---
tags: [database, ddd, domain-model]
status: done
verified_at: 2026-08-24
category: "Database - ORM"
aliases: ["Domain Model", "도메인 모델"]
---

# Domain Model

도메인의 개념, 상태와 규칙을 객체로 옮긴 계층이다. 핵심은 데이터와 그 데이터를 다루는 행동이 같은 객체에 산다는 것으로, 주문 객체가 자신의 상태 전이 규칙을 스스로 강제하면 도메인 모델이고, 주문은 필드 뭉치일 뿐이고 규칙은 전부 서비스 계층에 있으면 아니다.

## Rich vs Anemic

Anemic Domain Model은 getter, setter만 있는 데이터 객체와 로직을 전부 든 서비스의 조합으로, 객체 모양을 하고 있지만 실질은 절차형이라 도메인 모델의 비용은 내면서 캡슐화의 이득은 못 얻는 안티패턴으로 불린다. Rich Domain Model은 불변식(invariant)을 생성자와 메서드가 강제해 잘못된 상태의 객체가 만들어질 수 없게 한다. 두 스타일의 역사적 맥락, 실무에 Anemic이 많은 이유와 Anemic → Rich 리팩토링은 [[OOP-vs-Procedural-In-Practice|실무의 OOP vs 절차형]]이 소유한다.

```typescript
class Order {
  private constructor(
    private status: OrderStatus,
    private readonly lines: OrderLine[],
  ) {}

  static place(lines: OrderLine[]): Order {
    if (lines.length === 0) throw new EmptyOrderError();
    return new Order('PLACED', lines);
  }

  cancel(): void {
    if (this.status === 'SHIPPED') throw new AlreadyShippedError();
    this.status = 'CANCELLED';
  }
}
```

취소 가능 조건이 `cancel()` 안에 있으므로 어느 서비스가 호출하든 규칙이 한 곳에서 지켜진다. anemic 구조에서는 같은 검사가 호출부마다 복사되고, 하나가 빠지는 순간 잘못된 상태가 저장된다.

## Transaction Script와의 선택

도메인 모델이 항상 정답은 아니다. 로직이 단순하면 요청당 절차 하나로 처리하는 Transaction Script가 더 정직하고 싸며, 규칙이 서로 얽히고 상태 전이가 많아질수록 도메인 모델의 이득이 커진다. 어느 지점부터 역전되는지는 측정된 공식이 아니라 판단의 문제이고, 상태 전이 규칙이 여러 개 얽히는 도메인(주문, 정산, 예약)이 대표 신호다. 두 패턴의 데이터 접근 구조 차이는 [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]], Rich로 넘어갈 시점의 나머지 판단 기준은 [[OOP-vs-Procedural-In-Practice|실무의 OOP vs 절차형]]에 둔다.

## ORM Entity와의 관계

entity를 그대로 도메인 모델로 쓸지, 도메인 모델과 영속성 모델을 분리할지의 판단(통합/분리 신호, create vs reconstitute, NestJS + TypeORM 매핑)은 [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]이 소유한다.

통합해서 쓸 때 TypeORM의 제약 하나는 반드시 반영해야 한다. TypeORM은 DB에서 로드할 때 생성자 인자 없이 인스턴스를 만들므로 entity 생성자의 인자는 optional이어야 하고, hydration은 정적 팩토리를 거치지 않는다. 따라서 위 예시 같은 필수 인자 생성자는 순수 도메인 클래스에서만 가능하고, entity에서는 신규 생성 검증을 정적 팩토리에, 상태 전이 검증을 command 메서드에 두는 분리가 필요하다. 세부 규칙은 [[TypeORM-Entities-and-Columns|TypeORM Entity와 컬럼]]에 둔다.

## 면접 체크포인트

- anemic domain model이 왜 안티패턴인지, Transaction Script와는 어떻게 다른 문제인지 구분해 말할 수 있는가.
- Transaction Script를 선택해야 하는 상황을 말할 수 있는가. 도메인 모델이 항상 옳다고 답하면 감점이다.
- 불변식을 서비스 검증이 아니라 모델 생성자에서 강제하면 무엇이 달라지는지 예를 들 수 있는가.
- ORM hydration이 정적 팩토리를 우회한다는 사실이 불변식 설계에 왜 중요한지(생성 경로와 로드 경로의 분리) 설명할 수 있는가.

## 관련 문서

- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
- [[OOP-vs-Procedural-In-Practice|실무의 OOP vs 절차형]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]
- [[ORM|ORM 기초]]
- [[Business-Logic-App-vs-DB|비즈니스 로직, DB에 둘 것인가 앱에 둘 것인가]]
- [[Elegant-OOP-Design|우아한 객체지향 설계]]

## 출처

- [Domain Model — Martin Fowler, PoEAA Catalog](https://martinfowler.com/eaaCatalog/domainModel.html)
- [AnemicDomainModel — Martin Fowler](https://martinfowler.com/bliki/AnemicDomainModel.html)
- [TypeORM, Entities](https://typeorm.io/docs/entity/entities)
