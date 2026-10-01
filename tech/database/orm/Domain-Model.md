---
tags: [database, ddd, domain-model]
status: done
verified_at: 2026-09-30
category: "Database - ORM"
aliases: ["Domain Model", "도메인 모델"]
---

# Domain Model

도메인의 개념, 상태와 규칙을 객체로 옮긴 계층이다. 데이터와 그 데이터를 다루는 행동이 같은 객체에 산다. 주문 객체가 자신의 상태 전이 규칙을 스스로 강제하면 도메인 모델이다. 주문은 필드 뭉치일 뿐이고 규칙은 전부 서비스 계층에 있으면 아니다.

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

## 단순한 도메인 모델과 풍부한 도메인 모델

도메인 모델 패턴은 도메인의 속성, 행위와 규칙을 하나의 객체 모델로 표현해 도메인과 코드 사이의 표현 차이를 줄이는 비즈니스 로직 구성 방식이다. 속성과 행위가 같은 객체에 있어야 하는 이유는 행위가 그 속성을 쓰기 때문이다. 대안인 Transaction Script는 업무 절차마다 메서드를 두고 로직을 순서대로 적으며, 데이터는 별도 객체나 Map에 담는다.

모델의 모양은 두 수준으로 나눌 수 있다.

| 구분 | 모양 | 저장 매핑 |
|---|---|---|
| 단순한 도메인 모델 | 테이블 설계와 비슷하게 테이블당 도메인 객체 하나. 그래도 자기 데이터를 다루는 로직을 함께 가진다 | Active Record로도 감당할 수 있음 |
| 풍부한 도메인 모델 | 상속, 전략 같은 객체지향 기법과 엔티티, 값 객체 사이 연관을 써서 테이블 구조와 1:1이 아님 | 여러 클래스가 한 테이블에 매핑되거나 상속 구조를 저장해야 해 Data Mapper(ORM)가 필요 |

이 구분은 위의 Rich vs Anemic과 다른 축이다. Rich vs Anemic은 행위가 객체에 있는가를, 단순 vs 풍부는 모델이 테이블 구조를 얼마나 벗어나는가를 본다. 테이블당 객체 하나여도 속성만 있고 행위가 없으면 단순한 도메인 모델이 아니라 anemic 객체다. Fowler는 PoEAA에서 Active Record가 복잡하지 않은 도메인 로직에 잘 맞지만, 직접 관계, 컬렉션, 상속을 쓰는 복잡한 로직은 Active Record에 잘 매핑되지 않아 Data Mapper로 가게 되고, Active Record는 객체 설계를 DB 설계에 묶는다고 설명한다. 보통 단순한 모델로 시작해 규칙이 얽히는 곳부터 객체지향 기법을 적용해 풍부한 모델로 발전시킨다. TypeORM의 두 방식은 [[TypeORM-Overview-and-DataSource|TypeORM 개요와 DataSource]]에 있다.

## 애플리케이션 서비스는 작업 단위 입구다

도메인 모델은 도메인의 핵심 규칙을 잘 담지만, 외부가 호출할 작업 단위 API(회원 가입, 주문 취소)는 객체 협력 속에 흩어져 잘 드러나지 않는다. 그래서 애플리케이션 서비스가 작업 단위 API를 제공하는 퍼사드 역할을 맡는다. 서비스는 조회, 트랜잭션, 저장과 호출 순서를 조정할 뿐 도메인 규칙을 직접 담지 않고 얇게 유지하며, 컨트롤러 같은 앞단 계층에 도메인 세부가 새지 않게 한다. Fowler의 Service Layer가 애플리케이션 경계에서 가능한 작업 집합을 정하고 각 작업의 응답을 조정한다고 정의한 것과 같은 자리다. 서비스 계층이 흐름과 규칙을 모두 쥐면 다시 anemic 구조로 돌아간다([[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]).

## 기존 코드에 점진적으로 들이기

- 전부 갈아엎지 않는다. 엔티티에 속성만 두지 말고 그 속성을 쓰는 규칙과 행위를 옮겨, 외부는 메서드로 접근하게 한다.
- setter를 하나씩 호출해 상태를 바꾸는 대신 의미 있는 메서드 안에서 여러 속성이 함께 바뀌게 한다. 상태를 꺼내 검사하는 코드가 호출부마다 복사되는 문제가 사라진다.
- 생성도 같다. 초기 상태는 여러 속성이 한꺼번에 정해지므로 setter 나열보다 생성자나 정적 팩토리로 초기 상태(예: `PENDING`)를 한 번에 만든다. TypeORM entity에서는 아래 생성자 제약 때문에 정적 팩토리를 쓴다.

## Transaction Script와의 선택

도메인 모델이 항상 정답은 아니다. 로직이 단순하면 요청당 절차 하나로 처리하는 Transaction Script가 더 정직하고 싸며, 규칙이 서로 얽히고 상태 전이가 많아질수록 도메인 모델의 이득이 커진다. 어느 지점부터 역전되는지는 측정된 공식이 아니라 판단의 문제이고, 상태 전이 규칙이 여러 개 얽히는 도메인(주문, 정산, 예약)이 대표 신호다. 두 패턴의 데이터 접근 구조 차이는 [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]], Rich로 넘어갈 시점의 나머지 판단 기준은 [[OOP-vs-Procedural-In-Practice|실무의 OOP vs 절차형]]에 둔다.

## ORM Entity와의 관계

entity를 그대로 도메인 모델로 쓸지, 도메인 모델과 영속성 모델을 분리할지의 판단(통합/분리 신호, create vs reconstitute, NestJS + TypeORM 매핑)은 [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]이 소유한다.

통합해서 쓸 때 TypeORM의 제약 하나는 반드시 반영해야 한다. TypeORM은 DB에서 로드할 때 생성자 인자 없이 인스턴스를 만들므로 entity 생성자의 인자는 optional이어야 하고, hydration은 정적 팩토리를 거치지 않는다. 따라서 위 예시 같은 필수 인자 생성자는 순수 도메인 클래스에서만 가능하고, entity에서는 신규 생성 검증을 정적 팩토리에, 상태 전이 검증을 command 메서드에 두는 분리가 필요하다. 세부 규칙은 [[TypeORM-Entities-and-Columns|TypeORM Entity와 컬럼]]에 둔다.

## 면접 체크포인트

- anemic domain model이 왜 안티패턴인지, Transaction Script와는 어떻게 다른 문제인지 구분해 말할 수 있는가.
- Transaction Script를 선택해야 하는 상황을 말할 수 있는가. 도메인 모델이 항상 옳다고 답하면 감점이다.
- 불변식을 서비스 검증이 아니라 모델 생성자에서 강제하면 무엇이 달라지는지 예를 들 수 있는가.
- 단순한 도메인 모델과 풍부한 도메인 모델의 차이가 Active Record와 Data Mapper 선택으로 이어지는 이유, 그리고 Rich vs Anemic과 다른 축인 이유를 말할 수 있는가.
- 도메인 모델을 쓸 때 애플리케이션 서비스가 필요한 이유(작업 단위 API 퍼사드)를 설명할 수 있는가.
- ORM hydration이 정적 팩토리를 우회한다는 사실이 불변식 설계에 왜 중요한지(생성 경로와 로드 경로의 분리) 설명할 수 있는가.

## 관련 문서

- [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
- [[OOP-vs-Procedural-In-Practice|실무의 OOP vs 절차형]]
- [[Domain-ORM-Mapper|도메인 모델과 ORM 모델]]
- [[ORM|ORM 기초]]
- [[Business-Logic-App-vs-DB|비즈니스 로직, DB에 둘 것인가 앱에 둘 것인가]]
- [[Elegant-OOP-Design|우아한 객체지향 설계]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]
- [[TypeORM-Overview-and-DataSource|TypeORM 개요와 DataSource (Data Mapper와 Active Record)]]

## 출처

- [Domain Model — Martin Fowler, PoEAA Catalog](https://martinfowler.com/eaaCatalog/domainModel.html)
- [AnemicDomainModel — Martin Fowler](https://martinfowler.com/bliki/AnemicDomainModel.html)
- [TypeORM, Entities](https://typeorm.io/docs/entity/entities)
- [Service Layer — Martin Fowler, PoEAA Catalog](https://martinfowler.com/eaaCatalog/serviceLayer.html)
- [Active Record — Martin Fowler, PoEAA Catalog](https://martinfowler.com/eaaCatalog/activeRecord.html)
- [Patterns of Enterprise Application Architecture, Active Record 발췌 — InformIT, Martin Fowler](https://www.informit.com/articles/article.aspx?p=1398618&seqNum=3)
- [TypeORM, Active Record vs Data Mapper](https://typeorm.io/docs/guides/active-record-data-mapper/)
- [인프런, 토비, 도메인 모델 패턴](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=291360)
- [인프런, 토비, Member 엔티티 생성](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=291092)
- [인프런, 토비, JPA와 도메인 모델 패턴](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312138)
