---
tags: [nestjs, graphql, subscription, websocket, pubsub]
status: done
verified_at: 2026-07-20
category: "OS & Runtime - NestJS"
aliases: ["NestJS GraphQL Subscription", "PubSub", "graphql-ws"]
---

# NestJS GraphQL — Subscription

WebSocket 위에 GraphQL Subscription. `PubSub` 기반으로 이벤트 발행 → 구독자에 푸시.

```ts
@Subscription(() => User, {
  filter: (payload, variables) => payload.userAdded.role === variables.role,
})
userAdded(@Args('role') role: string) {
  return this.pubSub.asyncIterableIterator('userAdded');
}

// 어디선가
this.pubSub.publish('userAdded', { userAdded: newUser });
```

`filter`로 조건 분기, `resolve`로 페이로드 변환 가능. 다중 인스턴스 환경에서는 `PubSub` 인메모리 대신 **Redis PubSub**으로 전파.

## 전송 계층과 수평 확장

전송 프로토콜은 GraphQL 스펙이 정하지 않고 서버가 고른다. WebSocket이 흔하며 현행 구현은 `graphql-ws`, 레거시는 deprecated된 `subscriptions-transport-ws`이고, SSE도 대안이다. 이 WebSocket 전송 계층은 Apollo Server 코어에 내장된 것이 아니라 옆에 세우는 별도 구성이고([[Apollo-Server|Apollo의 subscription 지원 형태]]), NestJS 드라이버 설정이 그 배선을 대신 잡아 준다. Subscription은 stateful long-lived 연결이라 — 서버가 구독 수명 내내 GraphQL document, variables, 컨텍스트를 유지해야 한다 — 각 구독 클라이언트가 특정 서버 인스턴스에 묶인다. 수평 확장에서 Redis PubSub이 필요한 이유가 이것 — 어느 인스턴스가 발행한 이벤트든 모든 구독자에 닿게 하려면 pub/sub으로 인스턴스 간 전파해야 한다. 한 subscription 연산은 루트 필드 하나만 가질 수 있다(스펙 규칙).

활성화는 드라이버 설정의 `subscriptions: { 'graphql-ws': true }`. WebSocket 인증은 HTTP 헤더가 아니라 클라이언트가 연결 시 보내는 **connectionParams**로 한다 — subscriptions 옵션의 `onConnect` 콜백에서 `connectionParams.authToken`을 검증하고, 반환값이 연결 context로 들어가 이후 구독 리졸버에서 쓰인다 (context가 비어 있을 가능성을 항상 체크).

언제 쓰나: 자주, 증분으로 바뀌는 데이터를 실시간에 가깝게 밀 때. 드문 변경은 폴링, 푸시 알림, refetch가 낫다.

클라이언트 쪽 부담도 있다: 연결이 끊기면 재구독하는 로직, 초기 쿼리 결과와 구독으로 밀려온 업데이트 사이의 race condition 처리가 클라이언트 라이브러리에 필요하다. 일부 구현이 제공하는 live query(쿼리 결과 전체를 계속 최신으로 유지하는, 느슨하게 정의된 기능으로 정식 스펙화는 논의 단계)와는 별개 개념이다 — subscription은 이벤트 단위 증분 스트림이다.

## 흔한 실수와 체크포인트

- **Subscription을 메모리 PubSub만으로 다중 인스턴스 운영** → 한 인스턴스가 발행한 이벤트가 다른 인스턴스 구독자에 안 도달. Redis 등 외부 PubSub 필요.
- Subscription 다중 인스턴스 — stateful 연결이라 클라이언트가 특정 인스턴스에 묶이는 것이 Redis PubSub 필요성의 근원
- Subscription을 언제 쓰나 — 잦은 증분 실시간이면 subscription, 드문 변경이면 폴링이나 refetch. 전송은 WebSocket(graphql-ws)이나 SSE

## 관련 문서

- [[NestJS-GraphQL|NestJS GraphQL (TOC)]]
- [[Apollo-Server|Apollo Server (subscription 전송 계층)]]
- [[Realtime-Communication-Comparison|실시간 통신 비교]]
- [[NestJS-WebSocket-Gateway|WebSocket Gateway (Nest WS 축)]]

## 출처

- [NestJS — GraphQL subscriptions](https://docs.nestjs.com/graphql/subscriptions)
- [graphql.org — Subscriptions](https://graphql.org/learn/subscriptions/)
- [graphql-subscriptions](https://github.com/apollographql/graphql-subscriptions)
