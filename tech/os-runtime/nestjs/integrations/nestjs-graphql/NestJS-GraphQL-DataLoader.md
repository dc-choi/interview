---
tags: [nestjs, graphql, dataloader, n+1, resolver]
status: done
verified_at: 2026-07-20
category: "OS & Runtime - NestJS"
aliases: ["NestJS GraphQL Resolver", "DataLoader", "N+1 해결"]
---

# NestJS GraphQL — Resolver와 DataLoader

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

`@Args`, `@Info`, `@Context`, `@Parent`는 GraphQL 전용 데코레이터. HTTP의 `@Body`/`@Query`와는 다른 계열. 타입 매핑 규칙(@Field, @InputType, nullable)은 [[NestJS-GraphQL-Schema-Mapping]].

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

**enhancer는 기본으로 최상위 @Query/@Mutation에만 실행된다** — 가드, 인터셉터, 필터가 `@ResolveField` 레벨에서는 돌지 않는다. `GraphQLModule.forRoot({ fieldResolverEnhancers: ['interceptors', 'guards', 'filters'] })`로 켤 수 있지만, 대량 레코드에서 필드 리졸버가 수천 번 실행되면 성능 문제가 되므로 **필수가 아닌 enhancer는 필드 해석 중인지 판별하는 헬퍼(GqlExecutionContext의 info로 `isResolvingGraphQLField` 구현)로 skip**하는 것이 공식 권장이다.

## 흔한 실수

- **DataLoader 없이 ResolveField 남발** → N+1 폭발. 리스트 조회 시 직접 Service에서 batch select 또는 DataLoader.
- **DataLoader 결과 순서 안 맞춤** → 키와 값 매칭 깨져 잘못된 데이터 반환. 입력 순서 보존 필수.
- **DataLoader를 싱글톤으로** → 요청 간 캐시 공유 → 사용자별 데이터 누수. Nest REQUEST scope나 GraphQL context factory로 request-local instance를 만든다.
- **GraphQL Guard에서 HTTP Request 추출** → undefined. `GqlExecutionContext` 사용.
- **모든 필드를 ResolveField로 분리** → 작은 객체 조회도 라운드트립 증가. 단순 필드는 메인 Query에서 한꺼번에.

## 면접 체크포인트

- N+1 문제와 DataLoader 동작 원리 (tick 단위 batch + 입력 순서 보존)
- DataLoader가 request-local이어야 하는 이유와 Nest REQUEST scope, GraphQL context factory 선택
- GraphQL ExecutionContext와 HTTP ExecutionContext 차이 (GqlExecutionContext.create)
- `@Info` 활용 — 클라이언트가 요청한 필드만 select해 DB 부하 낮추기
- ResolveField vs Query 한 번에 join — 트레이드오프

## 관련 문서

- [[NestJS-GraphQL|NestJS GraphQL (TOC)]]
- [[NestJS-GraphQL-Schema-Mapping|스키마 접근과 타입 매핑]]
- [[NestJS-ExecutionContext|ExecutionContext (GqlExecutionContext)]]
- [[NestJS-Guards|Guards (GraphQL Guard 차이)]]

## 출처

- [NestJS — GraphQL Resolvers](https://docs.nestjs.com/graphql/resolvers)
- [NestJS — GraphQL Other features](https://docs.nestjs.com/graphql/other-features)
- [DataLoader — request-scoped caching](https://github.com/graphql/dataloader)
