---
tags: [architecture, design-pattern, behavioral, observer]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Observer Pattern", "옵서버 패턴"]
---

# Observer 패턴이란?

Observer는 Subject의 상태나 사건이 바뀌면 등록된 여러 Observer에게 통지하는 일대다 의존 관계를 만드는 행동 패턴이다. Subject는 구독자의 구체 타입 대신 공통 통지 계약만 안다.

## 구성 요소

- Subject: 자신을 관찰하는 Observer를 알고, Observer를 등록하고 해제하는 인터페이스를 제공한다.
- Observer: Subject의 변경을 통지받을 객체가 구현할 갱신 인터페이스를 정의한다.
- ConcreteSubject: ConcreteObserver가 관심을 두는 상태를 저장하고, 상태가 바뀌면 Observer에게 통지한다.
- ConcreteObserver: ConcreteSubject를 참조하고, Subject와 일관되게 유지할 자기 상태를 갱신 인터페이스에서 맞춘다.

Subject와 Observer는 서로 독립적으로 바꾸고 재사용할 수 있으며, Subject나 다른 Observer를 고치지 않고 Observer를 추가할 수 있다. 아래 예시처럼 갱신 인터페이스가 메서드 하나뿐이면 Observer를 함수 타입으로 표현할 수 있다.

## 예시

```typescript
type OrderListener = (event: OrderPlaced) => void | Promise<void>

class OrderSubject {
  private readonly listeners = new Set<OrderListener>()

  subscribe(listener: OrderListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async notify(event: OrderPlaced): Promise<void> {
    await Promise.all([...this.listeners].map((listener) => listener(event)))
  }
}
```

반환된 해제 함수를 호출하지 않으면 수명이 긴 Subject가 구독자를 붙잡아 메모리 누수가 생길 수 있다. 통지 중 구독 목록 변경, 한 Observer의 실패, 실행 순서와 병렬 처리 정책도 명시해야 한다.

## 통지 시점과 상태 일관성

통지를 누가 호출할지도 정한다. Subject의 상태 변경 연산이 변경 뒤 직접 통지하면 클라이언트가 통지를 잊을 일은 없지만 연속된 변경마다 통지가 반복된다. 클라이언트가 통지 시점을 정하면 여러 변경을 모은 뒤 한 번만 통지할 수 있지만 통지를 빠뜨리기 쉽다. 어느 쪽이든 어떤 연산이 통지를 일으키는지 문서화한다.

Observer는 갱신 중 Subject의 현재 상태를 읽을 수 있으므로 통지 시점에 Subject 상태가 일관돼야 한다. 하위 클래스 연산이 통지하는 상속 연산을 먼저 호출하고 자기 상태를 나중에 바꾸면 Observer는 변경이 덜 끝난 상태를 읽는다. 추상 Subject의 템플릿 메서드가 하위 클래스의 상태 변경 단계를 호출하고 통지를 마지막에 하게 하면 이 순서가 고정된다.

```typescript
interface StockObserver {
  update(quantity: number): void
}

abstract class StockSubject {
  readonly #observers = new Set<StockObserver>()

  attach(observer: StockObserver): () => void {
    this.#observers.add(observer)
    return () => this.#observers.delete(observer)
  }

  /**
   * 하위 클래스의 상태 변경 단계를 먼저 실행하고 통지는 마지막에 한다.
   * @param delta 증감할 수량
   */
  adjust(delta: number): void {
    const quantity = this.applyAdjustment(delta)
    // 통지 중 등록이나 해제가 이번 순회에 끼어들지 않도록 사본을 순회한다
    for (const observer of [...this.#observers]) {
      observer.update(quantity)
    }
  }

  /** 하위 클래스가 구현하는 상태 변경 단계로, 변경 뒤 수량을 반환한다. */
  protected abstract applyAdjustment(delta: number): number
}

class WarehouseStock extends StockSubject {
  private current = 0

  protected applyAdjustment(delta: number): number {
    this.current += delta
    return this.current
  }
}
```

구독 목록을 JavaScript private 필드(`#observers`)로 두면 하위 클래스는 목록에 닿을 수 없어 통지는 상위 클래스의 템플릿 메서드를 거친다. 하위 클래스 본문의 `this.#observers`는 타입 검사 오류이자 JavaScript 문법 오류이고, `#` 이름은 문자열 속성이 아니어서 `this['observers']` 같은 대괄호 표기로도 조회되지 않는다. TypeScript `private`는 타입 검사 중에도 대괄호 표기 접근을 허용해 이 경계를 강제하지 못한다([[TS-Class-Type-System|TS 클래스 타입 시스템]]). 다만 TypeScript에는 `final`이 없어 하위 클래스가 `adjust`를 재정의해 통지를 건너뛰거나 `attach`를 재정의해 Observer를 따로 모으는 것은 막지 못하므로, 재정의를 리뷰에서 드러내는 방법과 Strategy로 바꾸는 대안은 [[TemplateMethod패턴이란#TypeScript에서 골격 보호|Template Method]]를 따른다.

## Push와 Pull

- Push: Subject가 변경 내용을 통지와 함께 보낸다. Observer는 Subject를 다시 조회하지 않아도 되지만, Subject가 Observer에게 필요한 데이터를 가정하므로 요구가 다른 Observer가 늘면 payload가 커지고 Observer의 재사용성이 떨어질 수 있다.
- Pull: Subject는 최소한의 통지만 보내고 Observer가 필요한 값을 Subject에서 읽는다. Subject는 Observer의 필요를 몰라도 되지만, Observer가 무엇이 바뀌었는지 스스로 알아내야 해 비효율적일 수 있고 Subject의 조회 계약에 더 의존한다.

Observer는 보통 같은 프로세스의 객체 참조와 구독 등록을 전제로 한다. NestJS EventEmitter도 인프로세스 이벤트에 사용할 수 있지만, 프로세스 재시작 후 전달, 영속성, 재시도와 여러 인스턴스 간 전달이 필요하면 메시지 브로커나 Outbox 같은 별도 보장이 필요하다.

## Publisher-Subscriber와 구분

Observer에서는 Subject가 Observer 목록을 직접 관리하는 경우가 일반적이다. Publisher-Subscriber는 Topic이나 Broker가 중간에 있어 발행자와 구독자가 서로를 알지 않는다.

## 출처

- 얄팍한 코딩사전, [Observer 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243748)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [NestJS 공식 문서, Events](https://docs.nestjs.com/application/events)
- yongsoocho, [TypeScript로 구현하는 Observer](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227029)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 13. Observer](https://www.youtube.com/watch?v=aAA2t9VT-A0)
- [TypeScript Handbook, Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [MDN, Private elements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements)

## 관련 문서

- [[PublisherSubscriber패턴이란|Publisher-Subscriber 패턴]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Event-Sourcing|Event Sourcing]]
