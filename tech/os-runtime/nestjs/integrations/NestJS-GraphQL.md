---
tags: [nestjs, graphql, dataloader, n+1, subscription]
status: done
verified_at: 2026-07-20
category: "OS & Runtime - NestJS"
aliases: ["NestJS GraphQL", "DataLoader", "Resolver"]
---

# NestJS GraphQL — Resolver, DataLoader, Subscription

`@nestjs/graphql`은 Apollo, Mercurius를 백엔드로 GraphQL을 NestJS DI와 모듈 시스템에 통합한다. NestJS는 code-first와 schema-first를 모두 제공하며 공식 문서는 한쪽을 보편적 권장안으로 지정하지 않는다. 팀의 단일 진실 소스와 schema 협업 방식으로 선택한다.

## code-first vs schema-first

| 축 | code-first | schema-first |
|----|------------|--------------|
| 단일 진실 소스 | TypeScript 클래스 | `.graphql` 스키마 파일 |
| 타입 동기화 | 자동 — 코드 변경 → 스키마 재생성 | 수동 — 스키마와 코드 모두 유지 |
| 협업 (FE/BE 분리) | BE가 주도 | 양쪽 합의 |
| 선택 기준 | TypeScript 모델을 정본으로 둘 때 | SDL contract를 정본으로 둘 때 |

schema-first의 수동 동기화 부담은 GraphQL Code Generator(typescript-resolvers)로 상쇄할 수 있다 — 스키마에서 Resolvers, context 타입을 생성해 resolver 구현과 스키마의 불일치를 런타임이 아니라 컴파일 타임에 잡는다.

## Resolver 기본 구조

```ts
@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  @Query(() => [User])
  async users(
    @Args() args: GetUsersArgs,
    @Info() info: GraphQLResolveInfo,    // 필요한 필드만 골라 select
    @Context() context: GqlContext,
  ) {
    return this.userService.findMany(args);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async createUser(@Args('input') input: CreateUserInput) {
    return this.userService.create(input);
  }
}
```

`@Args`, `@Info`, `@Context`, `@Parent`는 GraphQL 전용 데코레이터. HTTP의 `@Body`/`@Query`와는 다른 계열.

## ResolveField — 필드별 비동기 해결

GraphQL은 객체 그래프를 클라이언트 요청 모양대로 해결. `User`의 `posts` 필드를 별도 Resolver로 두면 필요할 때만 조회.

```ts
@Resolver(() => User)
export class UserResolver {
  @ResolveField(() => [Post])
  async posts(@Parent() user: User) {
    return this.postService.findByUserId(user.id);
  }
}
```

문제: 사용자 100명 조회 → `posts` 필드 100번 호출 → **N+1 쿼리**.

## DataLoader — N+1 해결

`DataLoader`는 같은 tick 안의 호출을 모아 **batch 1회**로 처리한다. Cache가 사용자와 요청 context를 포함할 수 있으므로 loader instance는 요청마다 새로 만들어야 한다. Nest REQUEST scope provider도 가능하지만 아래처럼 GraphQL context factory에서 request-local loader를 만드는 방식도 가능하다.

```ts
GraphQLModule.forRootAsync<ApolloDriverConfig>({
  driver: ApolloDriver,
  inject: [PostService],
  useFactory: (postService: PostService) => ({
    autoSchemaFile: true,
    context: ({ req }) => ({
      req,
      postLoader: new DataLoader<number, Post[]>(async userIds => {
        const posts = await postService.findByUserIds([...userIds]);
        const grouped = new Map<number, Post[]>();
        for (const post of posts) {
          grouped.set(post.userId, [...(grouped.get(post.userId) ?? []), post]);
        }
        return userIds.map(id => grouped.get(id) ?? []);
      }),
    }),
  }),
});

type GqlContext = { postLoader: DataLoader<number, Post[]> };

@ResolveField(() => [Post])
async posts(@Parent() user: User, @Context() ctx: GqlContext) {
  return ctx.postLoader.load(user.id);
}
```

핵심:
- 같은 요청 내 여러 `loader.load(id)` 호출이 **하나의 배치 함수 호출**로 통합.
- 배치 함수 결과는 **입력 키 순서와 정확히 일치**해야 함 — group + map으로 보정.
- Request-local lifetime — 요청 끝나면 loader와 캐시를 버려 요청 간 데이터 누수를 막음.

## Subscription — 실시간 푸시

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

전송 프로토콜은 GraphQL 스펙이 정하지 않고 서버가 고른다. WebSocket이 흔하며 현행 구현은 `graphql-ws`, 레거시는 deprecated된 `subscriptions-transport-ws`이고, SSE도 대안이다. 이 WebSocket 전송 계층은 Apollo Server 코어에 내장된 것이 아니라 옆에 세우는 별도 구성이고([[Apollo-Server|Apollo의 subscription 지원 형태]]), NestJS 드라이버 설정이 그 배선을 대신 잡아 준다. Subscription은 stateful long-lived 연결이라 — 서버가 구독 수명 내내 GraphQL document, variables, 컨텍스트를 유지해야 한다 — 각 구독 클라이언트가 특정 서버 인스턴스에 묶인다. 수평 확장에서 Redis PubSub이 필요한 이유가 이것 — 어느 인스턴스가 발행한 이벤트든 모든 구독자에 닿게 하려면 pub/sub으로 인스턴스 간 전파해야 한다. 한 subscription 연산은 루트 필드 하나만 가질 수 있다(스펙 규칙).

언제 쓰나: 자주, 증분으로 바뀌는 데이터를 실시간에 가깝게 밀 때. 드문 변경은 폴링, 푸시 알림, refetch가 낫다.

클라이언트 쪽 부담도 있다: 연결이 끊기면 재구독하는 로직, 초기 쿼리 결과와 구독으로 밀려온 업데이트 사이의 race condition 처리가 클라이언트 라이브러리에 필요하다. 일부 구현이 제공하는 live query(쿼리 결과 전체를 계속 최신으로 유지하는, 느슨하게 정의된 기능으로 정식 스펙화는 논의 단계)와는 별개 개념이다 — subscription은 이벤트 단위 증분 스트림이다.

## Auth — Guard 호환

HTTP Guard와 GraphQL Guard는 ExecutionContext 추출이 다름. `GqlExecutionContext.create(context)`로 GraphQL 컨텍스트를 꺼내야 함.

```ts
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
```

## 흔한 실수

- **DataLoader 없이 ResolveField 남발** → N+1 폭발. 리스트 조회 시 직접 Service에서 batch select 또는 DataLoader.
- **DataLoader 결과 순서 안 맞춤** → 키와 값 매칭 깨져 잘못된 데이터 반환. 입력 순서 보존 필수.
- **DataLoader를 싱글톤으로** → 요청 간 캐시 공유 → 사용자별 데이터 누수. Nest REQUEST scope나 GraphQL context factory로 request-local instance를 만든다.
- **Subscription을 메모리 PubSub만으로 다중 인스턴스 운영** → 한 인스턴스가 발행한 이벤트가 다른 인스턴스 구독자에 안 도달. Redis 등 외부 PubSub 필요.
- **GraphQL Guard에서 HTTP Request 추출** → undefined. `GqlExecutionContext` 사용.
- **모든 필드를 ResolveField로 분리** → 작은 객체 조회도 라운드트립 증가. 단순 필드는 메인 Query에서 한꺼번에.

## 면접 체크포인트

- code-first vs schema-first 트레이드오프
- N+1 문제와 DataLoader 동작 원리 (tick 단위 batch + 입력 순서 보존)
- DataLoader가 request-local이어야 하는 이유와 Nest REQUEST scope, GraphQL context factory 선택
- Subscription 다중 인스턴스 — 메모리 PubSub의 한계와 Redis PubSub 필요성 (stateful 연결이라 클라이언트가 특정 인스턴스에 묶임)
- Subscription을 언제 쓰나 — 잦은 증분 실시간이면 subscription, 드문 변경이면 폴링이나 refetch. 전송은 WebSocket(graphql-ws)이나 SSE
- GraphQL ExecutionContext와 HTTP ExecutionContext 차이 (GqlExecutionContext.create)
- `@Info` 활용 — 클라이언트가 요청한 필드만 select해 DB 부하 낮추기
- ResolveField vs Query 한 번에 join — 트레이드오프

## 관련 문서

- [[GraphQL-Architecture-Map|GraphQL 전체 그림 지도 (NestJS resolver, DataLoader가 흐름 어디에 앉나)]]
- [[NestJS|NestJS 개요]]
- [[Apollo-Server|Apollo Server (드라이버 구현 정본)]]
- [[NestJS-ExecutionContext|ExecutionContext (GqlExecutionContext)]]
- [[NestJS-Guards|Guards (GraphQL Guard 차이)]]
- [[API-Comparison|REST vs GraphQL]]

## 출처

- [NestJS GraphQL quick start](https://docs.nestjs.com/graphql/quick-start)
- [NestJS GraphQL subscriptions](https://docs.nestjs.com/graphql/subscriptions)
- [graphql.org — Subscriptions](https://graphql.org/learn/subscriptions/)
- [Apollo Server — Generating types from a schema](https://www.apollographql.com/docs/apollo-server/workflow/generate-types)
- [DataLoader — request-scoped caching](https://github.com/graphql/dataloader)
- [graphql-subscriptions](https://github.com/apollographql/graphql-subscriptions)
