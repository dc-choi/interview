---
tags: [architecture, design-pattern, creational, abstract-factory]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Abstract Factory Pattern", "추상 팩토리 패턴"]
---

# Abstract Factory 패턴이란?

Abstract Factory는 서로 관련되거나 함께 사용해야 하는 객체군을 구체 클래스에 의존하지 않고 생성하는 인터페이스를 제공하는 생성 패턴이다. 객체 하나가 아니라 호환되는 제품군 전체를 바꾼다.

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

팩토리 자체를 Provider로 주입한다면 계약의 형태가 DI 토큰을 정한다. TypeScript `interface`는 컴파일 후 사라져 Nest가 런타임 토큰으로 쓸 수 없으므로 `Symbol` 토큰과 `@Inject()`를 함께 쓰거나 abstract class를 계약 겸 토큰으로 둔다. abstract class 토큰을 쓰면 `useClass`에서 환경에 따라 ConcreteFactory를 한 번 고르고, 소비 측은 `@Inject()` 없이 생성자 타입으로 주입받는다.

```typescript
export abstract class StorageFactory {
  abstract createOrderRepository(): OrderRepository
  abstract createOutboxRepository(): OutboxRepository
}

@Module({
  providers: [
    {
      provide: StorageFactory,
      useClass: process.env.STORAGE_DRIVER === 'memory' ? InMemoryStorageFactory : TypeOrmStorageFactory,
    },
  ],
  exports: [StorageFactory],
})
export class StorageModule {}
```

ConcreteFactory는 `implements StorageFactory`를 그대로 두고 `@Injectable()`을 붙인다. GoF는 제품군마다 ConcreteFactory 인스턴스 하나면 충분하므로 대개 Singleton으로 구현하는 편이 낫다고 보는데, Nest의 기본 Scope Provider는 애플리케이션 안에서 인스턴스 하나를 공유하므로 Singleton을 따로 구현하지 않아도 된다. Symbol 토큰과 abstract class 토큰의 선택은 [[Clean-Architecture-NestJS-Layers|NestJS 클린 아키텍처 계층]], 토큰 종류는 [[Custom-Provider|Custom Provider]]에서 다룬다.

## 구성 요소

- AbstractFactory: 제품 종류마다 생성 연산을 선언한다. 예시의 `StorageFactory`다.
- ConcreteFactory: 한 제품군의 생성 연산을 구현한다. `TypeOrmStorageFactory`와 메모리 구현 팩토리다.
- AbstractProduct: 제품 종류별 계약이다. `OrderRepository`와 `OutboxRepository`다.
- ConcreteProduct: 제품군별 구현이다. `TypeOrmOrderRepository` 같은 구체 클래스 이름은 ConcreteFactory 안에만 나타나고 Client 코드에는 나타나지 않는다.
- Client: AbstractFactory와 AbstractProduct의 인터페이스만 사용한다. ConcreteFactory 클래스는 인스턴스를 만드는 한 곳에만 나타나므로 제품군을 바꿀 때는 그 선택만 바뀐다.

제품군마다 ConcreteFactory 클래스를 두고 제품 종류별 구현을 제품군마다 따로 두는 기본 구조에서는 제품 종류가 N개, 제품군이 M개면 ConcreteProduct는 N×M개, ConcreteFactory는 M개가 된다. 제품군이 많으면 제품마다 원형을 등록해 두고 복제하는 [[Prototype패턴이란|Prototype]] 기반 ConcreteFactory로 제품군마다 새 팩토리 클래스를 만들 필요를 없앨 수 있다.

## Factory Method, Builder와 구분

- Factory Method는 상위 Creator의 생성 단계를 하위 Creator가 재정의한다.
- Abstract Factory는 여러 종류의 관련 Product를 만드는 공통 인터페이스를 제공한다.
- 단순 팩토리는 조건에 따라 객체 하나를 반환하는 함수나 클래스이며 GoF의 별도 패턴은 아니다.
- Builder는 복잡한 객체 하나를 단계별로 만들고 마지막 단계에서 제품을 반환한다. Abstract Factory는 단순하든 복잡하든 제품군에 초점을 두고, 각 생성 연산이 제품을 바로 반환하며 받은 제품을 조합하는 일은 Client가 맡는다.

## 트레이드오프

- 제품군 교체와 일관성 유지가 쉬워진다.
- 새 제품군 추가는 기존 클라이언트 변경을 줄인다.
- 새로운 제품 종류를 인터페이스에 추가하면 모든 Concrete Factory가 함께 바뀐다.
- 제품군이 하나뿐이고 함께 바꿀 이유가 없다면 추상화 비용이 더 크다.

## 출처

- 얄팍한 코딩사전, [Abstract Factory 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243750)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인패턴: 22. Abstract Factory](https://www.youtube.com/watch?v=Xx0dM517HYs)
- [NestJS 공식 문서, Custom providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS 공식 문서, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)

## 관련 문서

- [[Factory패턴이란|Factory와 Factory Method]]
- [[Builder패턴이란|Builder 패턴]]
- [[SOLID-In-Practice|SOLID 실전 적용]]
