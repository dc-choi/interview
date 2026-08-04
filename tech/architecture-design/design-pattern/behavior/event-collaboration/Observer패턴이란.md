---
tags: [architecture, design-pattern, behavioral, observer]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Observer Pattern", "옵서버 패턴"]
---

# Observer 패턴이란?

Observer는 Subject의 상태나 사건이 바뀌면 등록된 여러 Observer에게 통지하는 일대다 의존 관계를 만드는 행동 패턴이다. Subject는 구독자의 구체 타입 대신 공통 통지 계약만 안다.

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

## Push와 Pull

- Push: Subject가 이벤트에 필요한 데이터를 함께 보낸다. 결합은 낮지만 payload가 커질 수 있다.
- Pull: Observer가 통지를 받은 뒤 Subject에서 필요한 값을 읽는다. 데이터 선택은 유연하지만 Subject의 조회 계약에 더 의존한다.

Observer는 보통 같은 프로세스의 객체 참조와 구독 등록을 전제로 한다. NestJS EventEmitter도 인프로세스 이벤트에 사용할 수 있지만, 프로세스 재시작 후 전달, 영속성, 재시도와 여러 인스턴스 간 전달이 필요하면 메시지 브로커나 Outbox 같은 별도 보장이 필요하다.

## Publisher-Subscriber와 구분

Observer에서는 Subject가 Observer 목록을 직접 관리하는 경우가 일반적이다. Publisher-Subscriber는 Topic이나 Broker가 중간에 있어 발행자와 구독자가 서로를 알지 않는다.

## 출처

- 얄팍한 코딩사전, [Observer 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243748)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [NestJS 공식 문서, Events](https://docs.nestjs.com/techniques/events)
- yongsoocho, [TypeScript로 구현하는 Observer](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227029)

## 관련 문서

- [[PublisherSubscriber패턴이란|Publisher-Subscriber 패턴]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Event-Sourcing|Event Sourcing]]
