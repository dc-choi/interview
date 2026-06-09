---
tags: [architecture, ddd, hexagonal, orm, persistence]
status: done
category: "Architecture - DDD·Hexagonal"
aliases: ["Domain ORM Mapper", "도메인-ORM 분리", "Persistence Mapper"]
---

# 도메인 모델 ↔ ORM 엔티티 분리 (Mapper 패턴)

도메인 모델은 비즈니스 규칙의 응집체, ORM 엔티티는 저장 구조의 표현이다. 둘은 다른 목적을 가지므로 같은 클래스로 합치면 한쪽이 다른 쪽을 오염시킨다. 이 둘 사이를 명시적 Mapper로 잇는다.

## 왜 분리하는가

| 합쳤을 때 문제 | 분리하면 |
|---|---|
| `@Entity`, `@Column` 데코레이터가 도메인에 침투 → 영속화 기술이 도메인을 오염 | 도메인은 ORM 의존성 0, 순수 TypeScript 클래스 |
| 테스트 시 DB·메타데이터 로딩 필요 → 단위 테스트가 느려짐 | `new Order()` 만으로 메모리 테스트, 수천 케이스 1초 |
| 정규화된 DB 구조 vs 응집된 도메인 구조의 충돌을 강제로 1:1 매핑 | DB는 정규화, 도메인은 행동 중심 응집 — 각자 최적 |
| ORM 교체(TypeORM→Prisma, MikroORM) 시 도메인까지 손대야 함 | Infrastructure만 갈아끼움 |
| 변경 감지·지연 로딩이 비즈니스 메서드 사이에 끼어듦 | 도메인 메서드가 예측 가능 |

## 구조

도메인 레이어 — 순수 클래스. 행동(메서드)이 중심이고 상태는 캡슐화. 다른 애그리게이트는 ID(Value Object)로만 참조한다.

영속화 레이어 — ORM 데코레이터 붙은 엔티티 클래스. 필드 평탄화, JOIN 컬럼, `@CreateDateColumn` 같은 ORM 관심사만 담당.

Mapper — 두 모델 간 양방향 변환을 책임지는 정적 클래스. `toDomain(entity) → Domain`, `toEntity(domain) → Entity`. Repository에서만 호출하고 다른 곳에 새지 않게 한다.

Repository — 도메인 인터페이스(`OrderRepository`)는 도메인 레이어에 두고, 구현체(`TypeOrmOrderRepository`)는 Infrastructure에 둔다. 구현체 내부에서 Mapper를 써서 도메인↔엔티티를 변환한다.

```typescript
// 도메인 (TypeORM 의존성 없음)
export class Order extends AggregateRoot {
  static reconstitute(id, customerId, lines, status, total, createdAt): Order { ... }
  addOrderLine(product, qty): void { /* 규칙 */ }
}

// 영속화 (TypeORM 전용, 도메인 의존성 없음)
@Entity('orders')
export class OrderEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'customer_id' }) customerId: string;
  @Column({ type: 'enum', enum: OrderStatus }) status: OrderStatus;
  @OneToMany(() => OrderLineEntity, l => l.order, { cascade: true }) orderLines: OrderLineEntity[];
}

// Mapper
export class OrderMapper {
  static toDomain(e: OrderEntity): Order {
    const lines = e.orderLines.map(l => OrderLine.create(ProductId.of(l.productId), l.quantity, Money.of(l.unitPrice, l.currency)));
    return Order.reconstitute(OrderId.of(e.id), CustomerId.of(e.customerId), lines, e.status, Money.of(e.totalAmount, e.currency), e.createdAt);
  }
  static toEntity(o: Order): OrderEntity { /* 역방향 */ }
}
```

## 재구성 메서드 (`reconstitute`)

`Order.create()`는 새 객체 + 생성 이벤트 발행. `Order.reconstitute()`는 이미 영속화된 데이터로부터 객체를 복원하는 별도 정적 메서드 — **이벤트를 발행하지 않는다**. 이 둘을 구분하지 않으면 DB에서 로드할 때마다 `OrderCreatedEvent`가 또 발행되는 버그가 생긴다.

```typescript
static create(id, customerId): Order {
  const order = new Order(id, customerId, [], OrderStatus.PENDING, ...);
  order.apply(new OrderCreatedEvent(id, customerId)); // 신규만
  return order;
}

static reconstitute(id, customerId, lines, status, total, createdAt): Order {
  return new Order(id, customerId, lines, status, total, createdAt); // 이벤트 없음
}
```

## 트레이드오프

**비용** — Mapper 코드를 손으로 써야 한다. 필드가 많아지면 매핑 라인이 늘고, 양방향이라 한쪽 빠뜨리기 쉽다. Value Object가 들어가면 풀고 다시 감싸는 비용이 추가된다.

**완화 방법**:
- Mapper에 단위 테스트를 붙여 양방향 round-trip(`toEntity(toDomain(e)) == e`)을 보장
- 큰 애그리게이트는 Mapper도 분할 (`OrderMapper` + `OrderLineMapper`)
- 자동화 도구(class-transformer, AutoMapper)는 가능하지만 마법이 늘어나 디버깅이 어려워질 수 있음 — 손 매핑이 명시적

**언제 분리를 생략해도 되는가**:
- 단순 CRUD 게시판: 도메인 규칙이 거의 없어 분리 비용 대비 이득 적음 → ORM 엔티티에 메서드 몇 개 두는 정도로 충분
- 짧은 프로토타입: 어차피 갈아엎을 코드

핵심 도메인(주문, 결제, 재고)에는 분리, Supporting 도메인은 단순 패턴 — 한 시스템 안에서 혼용한다.

## ORM별 친화도

| ORM | 도메인 분리 친화도 | 비고 |
|---|---|---|
| TypeORM | 낮음 | 데코레이터·메타데이터 의존이 강해 도메인 침투 우려 — Mapper 필수 |
| Prisma | 중간 | 모델 정의가 schema.prisma에 분리되어 도메인 클래스 자유도 높음, 다만 생성된 타입을 도메인에 직접 쓰지 말 것 |
| MikroORM | 높음 | DDD 친화 설계, Identity Map·Unit of Work — 도메인 클래스에 데코레이터 최소화 가능 |

ORM 자체가 분리 친화적이어도 **도메인이 ORM 타입을 import 하는 순간 의존성 누수**다. 늘 Mapper 경계 유지.

## 안티패턴

**ORM 엔티티에 비즈니스 메서드 추가** — `OrderEntity.confirm()` 같은 것. 데코레이터와 비즈니스 로직이 한 클래스에 섞이면 테스트 시 메타데이터를 로드해야 하고, 변경 감지가 메서드 호출과 얽혀 예측이 어려워진다.

**Repository가 ORM 엔티티를 그대로 반환** — `findById(): OrderEntity`. 호출하는 Application Service가 ORM 타입을 직접 다루게 되어 도메인 보호막이 무너진다. 항상 도메인 타입으로 반환.

**Mapper를 Controller·Service에서 직접 호출** — Mapper는 Repository 내부에서만. 다른 레이어가 직접 호출하면 어디서 변환이 일어나는지 추적이 어려워진다.

## 면접 포인트

Q. 도메인 모델과 ORM 엔티티를 왜 분리하나?
- 도메인은 비즈니스 규칙 응집, ORM 엔티티는 저장 구조 표현. 목적이 다르다.
- 합치면 ORM 데코레이터가 도메인을 오염시키고, 테스트가 느려지고, ORM 교체 비용이 폭증한다.

Q. 매핑 코드 작성이 부담스럽지 않은가?
- 의도적 비용. 도메인 보호의 대가다.
- Round-trip 단위 테스트로 양방향 일치를 보장하면 회귀 위험은 낮다.
- 큰 애그리게이트는 Mapper도 분할해 응집도 유지.

Q. 모든 프로젝트에 적용해야 하나?
- 아니다. 핵심 도메인(복잡한 규칙과 장기 유지보수)에만 적용하고 Supporting 도메인은 단순 패턴.
- 게시판이나 짧은 프로토타입에는 오버엔지니어링.

Q. 같은 엔티티(User, Reservation)가 여러 유스케이스에서 쓰이는데 특정 도메인 디렉터리에 종속시키는 게 맞나?
- 둘을 분리해서 답한다. 퍼시스턴스 엔티티는 인프라 레이어에, 도메인 모델은 도메인 레이어에 1급으로 둔다.
- 여러 컨텍스트가 공유하는 도메인 모델은 특정 feature 폴더에 가두지 말고 공유 커널(shared kernel)에 둔다. auth가 user를 참조해도 디렉터리 종속 문제가 사라진다.
- 분리 기준은 변경 이유다(SRP). DB 스키마가 바뀌면 퍼시스턴스 엔티티, 비즈니스 규칙이 바뀌면 도메인 모델.

## 관련 문서
- [[DDD|DDD (Aggregate, CQRS, 도메인 서비스)]]
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 적용]]
- [[Clean-Architecture-NestJS|Clean Architecture with NestJS]]
- [[Saga-Pattern|Saga 패턴 (분산 트랜잭션)]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
