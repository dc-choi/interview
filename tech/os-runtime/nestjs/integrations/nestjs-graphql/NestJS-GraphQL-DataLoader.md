---
tags: [nestjs, graphql, dataloader, n+1, resolver]
status: done
verified_at: 2026-09-30
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

## ResolveField vs 부모 resolver에서 한 번에 조회

관계를 어디서 채우느냐의 트레이드오프다.

**부모 resolver에서 붙이기**: root resolver가 ORM의 eager 로딩(Prisma `include`, TypeORM `relations`나 `leftJoinAndSelect`)으로 관계까지 읽어 반환한다. query 수는 적지만 두 비용이 생긴다.

- **선택과 무관한 조회**: 클라이언트가 관계 필드를 고르지 않아도 조회가 돈다. 실행기는 선택되지 않은 필드를 응답에서 뺄 뿐 이미 한 DB 읽기와 객체 생성을 되돌리지 않는다. 낭비가 응답 크기에 드러나지 않으므로 요청당 query 수와 query 로그로 판단한다.
- **진입점마다 달라지는 완전성**: 관계는 그것을 붙인 resolver가 만든 객체에만 있다. `teams` resolver에서만 각 Team에 `supplies`를 붙였다면, `team(id)`나 다른 타입의 필드를 거쳐 같은 `Team`에 도달할 때 `supplies` 프로퍼티가 없어 기본 resolver가 `null`을 돌려주고, `[Supply!]!`로 선언했다면 non-null 오류가 부모 필드로 전파된다. 일관성을 맞추려면 진입점마다 로딩 코드를 복제해야 한다.

**필드 resolver로 두기**: `@ResolveField`는 필드가 선택될 때만, 어느 경로로 도달하든 같은 방식으로 실행된다. 대가는 N+1이다. resolver는 필드 단위로 실행되고 자기가 처리하는 부모가 목록의 하나라는 사실을 모른다. 곱셈은 관계 단계마다 일어나서, Post 10개에 `author`, `comments`, 각 comment의 `author`를 필드 resolver로 두면 1 + 10 + 10 + 댓글 수만큼 query가 나간다.

**DataLoader로 막기**: 필드 resolver를 유지하고 단계마다 loader를 둔다. `Post.author`와 `Comment.author`를 `userLoader.load(parent.authorId)`로 바꾸면 batch 함수가 개별 SELECT 대신 `WHERE id IN (...)` 한 번으로 읽는다. user loader만 두면 `Post.comments`는 여전히 Post마다 1회이므로 postId를 key로 하는 loader를 더해야 comments 단계도 상수가 된다. batch 함수는 입력 key 배열과 길이, 순서가 같은 배열을 돌려줘야 한다. DB 결과 순서는 보장되지 않으므로 id로 매핑하고, 없는 key 자리에는 `null`이나 `Error`를 넣는다.

| 상황 | 선택 |
|---|---|
| 부모 행과 함께 이미 읽힌 값 | 부모 resolver가 채운다 |
| 관계가 거의 항상 함께 요청되고 진입점이 하나 | eager 로딩이 단순하다 |
| 관계가 선택적으로 요청되거나 여러 진입점에서 도달 | `@ResolveField`와 DataLoader |
| 선택될 때만 join하고 싶다 | `@Info`의 selection set을 보고 요청된 관계만 부모 query에서 join |

Prisma `include`가 실제로 join 한 번인지는 `relationLoadStrategy`와 preview 설정에 따라 다르다. 어느 쪽이든 부모 수에 비례하지 않으므로 N+1은 아니다([[Prisma-Query-Performance#relationLoadStrategy]]). [[GraphQL-Architecture-Map]]의 얕게 유지 원칙이 필요한 이유가 위의 두 비용이다.

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
- [DataLoader — request-scoped caching](https://github.com/graphql/dataloader) (batch 함수의 길이, 순서 계약과 없는 key의 `null`)
- [GraphQL Specification, October 2021, Handling Field Errors](https://spec.graphql.org/October2021/#sec-Handling-Field-Errors) (non-null 필드의 null 전파)
- [인프런, Hong, Prisma 연동과 N+1 문제 및 Include 강제 패턴](https://www.inflearn.com/courses/lecture?courseId=341963&unitId=449783)
- [인프런, Hong, Database의 가장 치명적인 문제 N+1 문제 방지를 위한 DataLoader 패턴](https://www.inflearn.com/courses/lecture?courseId=341963&unitId=449785)
- [인프런, 얄팍한 코딩사전, Query 구현하기](https://www.inflearn.com/courses/lecture?courseId=326283&unitId=63139)
