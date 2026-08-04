---
tags: [architecture, ddd, hexagonal, orm, persistence, jpa, typeorm]
status: done
category: "Architecture - DDD, Hexagonal"
aliases: ["Domain ORM Mapper", "도메인 ORM 통합과 분리", "Persistence Mapper"]
verified_at: 2026-08-04
---

# 도메인 모델과 ORM 모델, 통합할까 분리할까

도메인 모델과 ORM 엔티티를 같은 클래스로 쓸지, 별도 모델과 Mapper로 나눌지는 **상황별 설계 선택**이다. 통합은 잘못이고 분리는 정답이라는 규칙도, 그 반대 규칙도 없다. 도메인과 저장 모델의 간극이 Mapper 비용보다 큰지 판단한다.

## 두 전략

| 전략 | 장점 | 비용과 위험 |
|---|---|---|
| 통합 모델 | 중복 모델과 변환 코드가 없고 변경 추적, 연관관계, 저장이 자연스러움 | ORM 제약, 프록시, 로딩과 트랜잭션 의미를 도메인 코드가 알아야 함 |
| 분리 모델 + Mapper | 도메인과 스키마가 독립적으로 진화하고 저장 기술을 경계에 가둘 수 있음 | 양방향 매핑, 변경 누락, 식별자와 이벤트 복원 규칙이 추가됨 |

Jakarta Persistence 명세는 엔티티를 가벼운 영속 도메인 객체로 정의하고 비즈니스 메서드를 허용한다. 따라서 JPA 엔티티에 행위를 두는 것 자체는 안티패턴이 아니다. 반대로 저장 구조가 도메인 표현을 심하게 왜곡한다면 명세가 통합을 허용한다는 이유만으로 한 모델을 고집할 필요도 없다.

## 통합 모델이 자연스러운 경우

- 한 애그리거트와 한 트랜잭션 경계가 대체로 한 영속 객체 그래프에 대응한다.
- 도메인 상태와 테이블 구조가 비슷하고 레거시 스키마 제약이 작다.
- 행위가 풍부해도 지연 로딩과 영속 상태를 애그리거트 내부에서 통제할 수 있다.
- 별도 모델의 매핑 및 동기화 비용이 얻는 독립성보다 크다.

```java
@Entity
public class Order {
  @Id private UUID id;
  @Enumerated(EnumType.STRING) private OrderStatus status;

  protected Order() {}

  public void confirm() {
    if (status != OrderStatus.PENDING) throw new IllegalStateException();
    status = OrderStatus.CONFIRMED;
  }
}
```

JPA 통합 모델에서도 다음 제약은 명시적으로 다룬다.

- 명세가 요구하는 인자 없는 생성자와 비 final 클래스/메서드 제약
- 프록시가 섞여도 일관된 `equals`/`hashCode`와 식별자 정책
- 애그리거트 밖에서 지연 로딩을 유발하지 않는 조회 및 트랜잭션 경계
- 컬렉션 변경 메서드와 연관관계 양쪽을 일관되게 유지하는 책임

매핑 애노테이션이 도메인 코드를 읽기 어렵게 만들면 `orm.xml`로 옮길 수 있다. 이는 **메타데이터의 소스 분리**이지, 도메인 객체와 영속 객체의 런타임 모델을 분리하는 것은 아니다.

## 분리 모델이 자연스러운 경우

- 레거시나 공유 스키마가 도메인 언어와 크게 다르다.
- 한 도메인 객체가 여러 테이블/문서/외부 소스에서 재구성된다.
- 같은 저장 데이터에 서로 다른 바운디드 컨텍스트 모델이 필요하다.
- 이벤트 소싱, 복잡한 암호화, 외부 시스템 동기화처럼 복원 규칙이 별도 책임이다.
- 프레임워크 없는 도메인 패키지를 장기적으로 유지할 실익이 분명하다.

```typescript
export class OrderMapper {
  static toDomain(entity: OrderEntity): Order {
    return Order.reconstitute(
      OrderId.of(entity.id),
      entity.lines.map(OrderLineMapper.toDomain),
      entity.status,
    );
  }

  static toEntity(order: Order): OrderEntity {
    return OrderEntity.restore(order.id.value, order.lines, order.status);
  }
}
```

Mapper는 persistence adapter 또는 repository 구현 안에 둔다. 애플리케이션 포트는 어느 전략에서도 도메인 타입을 기준으로 설계하고, ORM 전용 타입이 컨트롤러나 유스케이스로 새지 않게 한다.

## 생성과 재구성

분리 모델에서는 신규 생성과 저장 데이터 복원을 구분해야 한다.

- `create`: 불변식 검사, 기본 상태 설정, 생성 도메인 이벤트 등록
- `reconstitute`: 이미 검증되어 저장된 상태 복원, 생성 이벤트 재발행 금지

이 구분이 없으면 DB에서 읽을 때마다 `OrderCreated` 같은 이벤트가 다시 등록될 수 있다. 통합 JPA 모델은 provider가 인자 없는 생성자와 필드/프로퍼티 접근으로 복원하므로 같은 이름의 `reconstitute`가 필수는 아니지만, 로드 후 지켜야 할 불변식은 여전히 설계해야 한다.

## 판단 순서

1. 애그리거트 경계와 트랜잭션 경계를 먼저 정한다.
2. 도메인 모델과 저장 모델의 구조적 차이를 구체적으로 적는다.
3. 통합했을 때 생기는 ORM 제약과 분리했을 때 생기는 Mapper 비용을 비교한다.
4. 핵심 도메인과 지원 도메인마다 다른 전략을 허용한다.
5. 선택한 경계가 유지되는지 테스트와 의존성 규칙으로 검증한다.

| 질문 | 통합 쪽 신호 | 분리 쪽 신호 |
|---|---|---|
| 모델과 스키마의 형태 | 거의 같음 | 구조와 변경 주기가 크게 다름 |
| 저장소 수 | 하나 | 복수 저장소/외부 소스 |
| 매핑 코드 | 대부분 기계적 복사 | 의미 있는 번역 로직 |
| ORM 교체 가능성 | 막연한 가능성 | 승인된 계획이나 실제 복수 구현 |
| 팀 역량과 운영 비용 | JPA/ORM 의미를 잘 통제 | Mapper 누락과 복원을 잘 검증 |

ORM 교체 가능성만으로 모델을 미리 분리하면 미래 비용을 피하려다 현재의 확정된 비용을 계속 낼 수 있다. 반대로 이미 번역 로직이 존재하는데 이를 엔티티 메서드와 콜백에 숨기면 변경 영향이 더 커진다.

## NestJS와 TypeORM 매핑

TypeORM에서도 두 전략이 가능하다.

- 통합: `@Entity` 클래스가 캡슐화된 상태와 도메인 메서드를 함께 가진다.
- 분리: `domain/Order`와 `adapter/outgoing/persistence/OrderEntity`를 두고 repository 구현이 Mapper를 호출한다.

NestJS DI는 어느 전략을 선택하는지 결정하지 않는다. 요구 포트 토큰과 persistence adapter의 연결만 담당한다. 단순 CRUD에는 통합 모델, 복잡한 핵심 도메인에는 분리 모델처럼 한 시스템 안에서 섞을 수도 있다.

## 피해야 할 단정

- ORM 애노테이션이 있으면 도메인 모델이 아니다.
- ORM 엔티티에 비즈니스 메서드를 두면 항상 안티패턴이다.
- Mapper를 두면 ORM 교체가 자동으로 쉬워진다.
- JPA가 도메인 객체를 지원하므로 모든 모델을 반드시 통합해야 한다.
- 애플리케이션 포트가 도메인 엔티티를 반환하면 곧바로 HTTP에 노출된다.

## 면접 포인트

Q. 도메인 모델과 ORM 엔티티를 분리해야 하는가?

- 무조건이 아니다. 두 모델의 간극과 매핑 비용을 비교한다.
- JPA는 영속 도메인 객체와 비즈니스 메서드를 지원하므로 통합 모델도 정당하다.
- 레거시 스키마, 복수 모델, 의미 있는 번역이 있으면 분리의 이점이 커진다.
- 어떤 선택이든 애그리거트 불변식과 트랜잭션 경계를 먼저 지킨다.

## 출처

- [Jakarta Persistence 3.2 명세 — Entity Class](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#the-entity-class)
- [Spring Data JPA 공식 문서 — Persisting Entities](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html)
- [NestJS 공식 문서 — TypeORM 통합](https://docs.nestjs.com/techniques/database)
- [토비 강사 — 도메인 모델과 JPA 엔티티](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312138)
- [토비 강사 — JPA 매핑 정보 분리](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312327)
- [토비 강사 — 엔티티의 동등성과 프록시](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=312377)
- [토비 강사 — Entity vs DTO](https://www.inflearn.com/courses/lecture?courseId=336073&unitId=264324)

## 관련 문서

- [[DDD|DDD (Aggregate, CQRS, 도메인 서비스)]]
- [[DDD-Hexagonal-In-Production|DDD + Hexagonal 실무 적용]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
