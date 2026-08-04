---
tags: [architecture, design-pattern, creational, abstract-factory]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Abstract Factory Pattern", "추상 팩토리 패턴"]
---

# Abstract Factory 패턴이란?

Abstract Factory는 서로 관련되거나 함께 사용해야 하는 객체군을 구체 클래스에 의존하지 않고 생성하는 인터페이스를 제공하는 생성 패턴이다. 핵심은 객체 하나가 아니라 호환되는 제품군 전체를 바꾸는 데 있다.

## 예시

```typescript
interface StorageFactory {
  createOrderRepository(): OrderRepository
  createOutboxRepository(): OutboxRepository
}

class TypeOrmStorageFactory implements StorageFactory {
  constructor(private readonly dataSource: DataSource) {}

  createOrderRepository(): OrderRepository {
    return new TypeOrmOrderRepository(this.dataSource)
  }

  createOutboxRepository(): OutboxRepository {
    return new TypeOrmOutboxRepository(this.dataSource)
  }
}
```

테스트에서는 두 저장소를 모두 메모리 구현으로 제공하는 팩토리를 사용할 수 있다. 같은 트랜잭션이나 저장 방식처럼 제품군 사이에 지켜야 할 호환 조건을 팩토리 경계에서 드러낸다.

NestJS에서는 모듈과 Custom Provider가 조립 역할을 대신할 수 있다. 컨테이너 기능만으로 충분하다면 별도 Factory 클래스를 만들 필요는 없다.

## Factory Method와 구분

- Factory Method는 상위 Creator의 생성 단계를 하위 Creator가 재정의한다.
- Abstract Factory는 여러 종류의 관련 Product를 만드는 공통 인터페이스를 제공한다.
- 단순 팩토리는 조건에 따라 객체 하나를 반환하는 함수나 클래스이며 GoF의 별도 패턴은 아니다.

## 트레이드오프

- 제품군 교체와 일관성 유지가 쉬워진다.
- 새 제품군 추가는 기존 클라이언트 변경을 줄인다.
- 새로운 제품 종류를 인터페이스에 추가하면 모든 Concrete Factory가 함께 바뀐다.
- 제품군이 하나뿐이고 함께 바꿀 이유가 없다면 추상화 비용이 더 크다.

## 출처

- 얄팍한 코딩사전, [Abstract Factory 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243750)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)

## 관련 문서

- [[Factory패턴이란|Factory와 Factory Method]]
- [[Builder패턴이란|Builder 패턴]]
- [[SOLID-In-Practice|SOLID 실전 적용]]
