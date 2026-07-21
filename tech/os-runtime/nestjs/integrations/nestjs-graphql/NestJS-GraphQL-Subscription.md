---
tags: [nestjs, graphql, subscription, websocket, pubsub]
status: done
verified_at: 2026-07-21
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

활성화는 드라이버 설정의 `subscriptions: { 'graphql-ws': true }`. WebSocket 인증 정보는 클라이언트가 연결 시 보내는 **connectionParams**로 전달할 수 있다. 현행 `graphql-ws`에서는 `onConnect`가 반환한 객체가 GraphQL context로 자동 복사되지 않는다. `onConnect`에서 검증한 사용자를 `context.extra`에 보관하고 GraphQL `context` factory에서 명시적으로 노출한다. 반면 레거시 `subscriptions-transport-ws`의 `onConnect` 반환 객체는 연결 context로 사용됐다. 두 라이브러리의 예제를 섞지 않는다.

```ts
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  subscriptions: {
    'graphql-ws': {
      onConnect: async (context) => {
        context.extra.user = await verifyToken(context.connectionParams?.authToken);
      },
    },
  },
  context: ({ extra }) => ({ user: extra?.user }),
});
```

`connectionParams`와 `extra`는 연결이 없거나 인증 전이면 비어 있을 수 있으므로 애플리케이션 타입과 런타임 검사를 함께 둔다.

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
