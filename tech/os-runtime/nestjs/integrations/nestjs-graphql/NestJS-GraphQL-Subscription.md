---
tags: [nestjs, graphql, subscription, websocket, pubsub]
status: done
verified_at: 2026-09-30
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

## 발행 시점과 trigger 계약

- 발행은 쓰기가 성공한 뒤에 한다. 먼저 발행하면 저장에 실패한 데이터의 이벤트가 구독자에게 나간다. 트랜잭션 안의 쓰기라면 커밋 뒤에 발행한다. 커밋과 발행 사이에 프로세스가 죽으면 이벤트가 사라지므로 전달 보장이 필요하면 [[Transactional-Outbox]]로 넘어간다.

```ts
async createComment(input: CreateCommentInput) {
  const comment = await this.commentRepository.save(input); // 쓰기 완료 후 발행
  await this.pubSub.publish(COMMENT_ADDED, { commentAdded: comment });
  return comment;
}
```

- 발행과 구독은 같은 PubSub 인스턴스를 써야 한다. NestJS 문서도 지역 인스턴스 대신 provider로 등록해 앱 전체에서 한 인스턴스를 주입하는 방식을 권한다.
- trigger 이름은 발행자와 구독자가 공유하는 상수로 둔다. graphql-subscriptions의 인메모리 `PubSub.publish()`는 `EventEmitter.emit()`을 호출한 뒤 listener가 없어도 그대로 resolve하므로, 이름 오타는 오류 없이 이벤트가 사라지는 장애가 된다. 3.0부터는 `PubSub<Events>` 제네릭으로 trigger 이름과 payload 타입을 묶을 수 있다.
- API 이름은 버전을 탄다. graphql-subscriptions 3.0에서 `asyncIterator`가 `asyncIterableIterator`로 바뀌었다. NestJS 문서는 새 이름을 쓰지만 2026-09-30 확인한 Apollo Server subscriptions 문서 예제는 아직 `pubsub.asyncIterator`를 쓴다. 설치된 버전의 이름을 확인한다.

## 전송 계층과 수평 확장

전송 프로토콜은 GraphQL 스펙이 정하지 않고 서버가 고른다. WebSocket이 흔하며 현행 구현은 `graphql-ws`, 레거시는 deprecated된 `subscriptions-transport-ws`이고, SSE도 대안이다. 이 WebSocket 전송 계층은 Apollo Server 코어에 내장된 것이 아니라 옆에 세우는 별도 구성이고([[Apollo-Server|Apollo의 subscription 지원 형태]]), NestJS 드라이버 설정이 그 배선을 대신 잡아 준다. Subscription은 stateful long-lived 연결이라 — 서버가 구독 수명 내내 GraphQL document, variables, 컨텍스트를 유지해야 한다 — 각 구독 클라이언트가 특정 서버 인스턴스에 묶인다. 수평 확장에서 Redis PubSub이 필요한 이유가 이것 — 어느 인스턴스가 발행한 이벤트든 모든 구독자에 닿게 하려면 pub/sub으로 인스턴스 간 전파해야 한다. 한 subscription 연산은 루트 필드 하나만 가질 수 있다(스펙 규칙).

활성화는 드라이버 설정의 `subscriptions: { 'graphql-ws': true }`. WebSocket 인증 정보는 클라이언트가 연결 시 보내는 **connectionParams**로 전달할 수 있다. 현행 `graphql-ws`에서는 `onConnect`가 반환한 객체가 GraphQL context로 자동 복사되지 않는다. `onConnect`에서 검증한 사용자를 `context.extra`에 보관하고 GraphQL `context` factory에서 명시적으로 노출한다. 반면 레거시 `subscriptions-transport-ws`의 `onConnect` 반환 객체는 연결 context로 사용됐다. 두 라이브러리의 예제를 섞지 않는다. `@nestjs/graphql` v14에서는 `subscriptions-transport-ws` 지원이 제거돼 `subscriptions` 옵션이 그 key를 받지 않으며, 두 프로토콜은 wire 호환이 없어 옛 클라이언트는 연결에 실패한다.

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
- [graphql-subscriptions — CHANGELOG 3.0.0](https://github.com/apollographql/graphql-subscriptions/blob/master/CHANGELOG.md) (`asyncIterator`에서 `asyncIterableIterator`로, `PubSub` 제네릭)
- [pubsub.ts — graphql-subscriptions GitHub](https://github.com/apollographql/graphql-subscriptions/blob/master/src/pubsub.ts) (listener 유무와 무관한 `publish`)
- [Apollo Server — Subscriptions](https://www.apollographql.com/docs/apollo-server/data/subscriptions)
- [인프런, Hong, 비동기 및 이벤트 통신(PubSub)을 위한 Subscription 패턴](https://www.inflearn.com/courses/lecture?courseId=341963&unitId=449788)
