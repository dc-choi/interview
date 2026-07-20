---
tags: [nestjs, graphql, code-first, schema-first, decorator]
status: done
verified_at: 2026-07-20
category: "OS & Runtime - NestJS"
aliases: ["NestJS GraphQL 스키마 접근", "code-first vs schema-first", "타입 매핑 계약"]
---

# NestJS GraphQL — 스키마 접근과 타입 매핑

## code-first vs schema-first

| 축 | code-first | schema-first |
|----|------------|--------------|
| 단일 진실 소스 | TypeScript 클래스 | `.graphql` 스키마 파일 |
| 타입 동기화 | 자동 — 코드 변경 → 스키마 재생성 | 수동 — 스키마와 코드 모두 유지 |
| 협업 (FE/BE 분리) | BE가 주도 | 양쪽 합의 |
| 선택 기준 | TypeScript 모델을 정본으로 둘 때 | SDL contract를 정본으로 둘 때 |

NestJS는 둘 다 제공하며 공식 문서는 한쪽을 보편적 권장안으로 지정하지 않는다. schema-first의 수동 동기화 부담은 GraphQL Code Generator(typescript-resolvers)로 상쇄할 수 있다 — 스키마에서 Resolvers, context 타입을 생성해 resolver 구현과 스키마의 불일치를 런타임이 아니라 컴파일 타임에 잡는다.

## GraphQLModule 배선 시맨틱

- **code-first**: `autoSchemaFile`에 경로를 주면 생성된 스키마를 파일로 쓰고, `true`면 인메모리로만 on-the-fly 생성. 스키마 타입 순서는 기본이 모듈 정의 순서라 `sortSchema: true`로 사전순 고정 (diff 안정화).
- **code-first의 오프라인 SDL 생성**: 앱을 띄우지 않고(DB 연결, 리졸버 배선 없이) SDL만 뽑으려면 `GraphQLSchemaBuilderModule`을 부팅해 `GraphQLSchemaFactory.create([리졸버 클래스들], [스칼라들])` → `printSchema()` — CI에서 스키마 산출물 생성용.
- **schema-first**: `typePaths: ['./**/*.graphql']` 글롭의 SDL 파일들을 인메모리에서 병합 — 스키마를 리졸버 옆에 파일 단위로 분산 배치할 수 있다. `definitions: { path, outputAs: 'class' }`로 SDL AST에서 TS 타입을 자동 생성 (기본은 interface). 앱 시작마다 동적 생성되므로, 대신 `GraphQLDefinitionsFactory` 스크립트로 온디맨드(watch 포함) 생성하는 경로도 공식 제공 — GraphQL Code Generator는 이 내장 생성의 외부 대안이다.

## code-first 타입 매핑 계약

- `@Field()`의 타입 함수는 string, boolean이면 생략 가능하지만 **number는 필수** — TS number만으로는 GraphQL Int인지 Float인지 모호해서 `@Field(() => Int)`처럼 명시해야 한다. `@Args`도 동일 (`@Args('id', { type: () => Int })`).
- 필드는 **기본 non-nullable**. `nullable: true` 외에 배열 전용 시맨틱 — `'items'`(원소만 nullable), `'itemsAndList'`(배열과 원소 둘 다).
- 쿼리명은 메서드명이 기본 — `@Query(() => Author, { name: 'author' })`로 스키마 이름과 메서드명을 분리.
- 인자가 많으면 `@ArgsType()` 클래스로 묶는다 — class-validator 검증 결합 가능.
- mutation이 객체를 인자로 받으면 `@InputType()` 클래스 — 인자로 전달 가능한 특수 객체 타입으로 `@ObjectType()`과 구분된다. 역시 TS 리플렉션 한계로 `@Field` 명시가 필요 (CLI 플러그인으로 생략 가능).
- CRUD 변형 DTO는 **@nestjs/graphql의 Mapped Types**(PartialType/PickType/OmitType/IntersectionType — 표는 [[Validation]])로 생성. 두 번째 인자로 결과 클래스의 데코레이터를 바꾼다 — 부모가 `@ObjectType`인데 update 입력을 만들려면 `PartialType(User, InputType)`. 유틸은 조합 가능 (`PartialType(OmitType(CreateUserInput, ['email'] as const))`).
- 공통 필드는 추상 클래스 상속으로 재사용하고, 커서 페이지네이션 같은 반복 구조는 **제네릭 타입 팩토리**(`Paginated(classRef)`가 edges/nodes/totalCount/hasNextPage를 가진 추상 @ObjectType 반환)로 생성한다.
- **CLI 플러그인**(opt-in, nest-cli.json 등록)이 컴파일 시 AST 변환으로 @Field 보일러플레이트를 대체한다 — input/object/args 클래스의 전 프로퍼티에 @Field 자동 부착(`@HideField` 제외), `name?: string`의 물음표로 nullable 추론, 배열 포함 타입 추론, `introspectComments`면 주석을 description으로. **파일명이 `.input.ts`, `.args.ts`, `.entity.ts`, `.model.ts` 서픽스일 때만 분석**(`typeFileNameSuffix`로 조정).
- TS Date는 기본으로 **GraphQLISODateTime**(UTC date-time 문자열)에 매핑 — `buildSchemaOptions.dateScalarMode: 'timestamp'`로 GraphQLTimestamp(숫자) 전환. 커스텀 스칼라는 `@Scalar('Date', () => Date)` 클래스가 `CustomScalar<직렬화형, 내부형>`을 구현 (serialize/parseValue/parseLiteral을 메서드로 — 동작 원리는 [[GraphQL-Schema-Types]]).

## 추상 타입(Interface, Union)과 Enum

- GraphQL interface는 `@InterfaceType()` **추상 클래스**로 정의한다 — **TS interface로는 정의할 수 없다** (리플렉션에 안 남음). 구현 타입은 `@ObjectType({ implements: () => [Character] })`.
- Union은 `createUnionType({ name, types: () => [Author, Book] as const })` — **types 배열에 const 단언 필수** (없으면 잘못된 선언 파일이 생성되어 다른 프로젝트에서 사용 시 에러).
- 두 추상 타입 모두 **기본 resolveType이 리졸버 반환값에서 타입을 추출**하므로 클래스 인스턴스를 반환해야 하고, 평문 객체를 반환하면 타입 판별이 실패한다. 판별 로직을 직접 쓰려면 `resolveType(value)` 옵션. 추상 타입 개념과 인터페이스 vs 유니언 선택은 [[GraphQL-Schema-Types]].
- Enum은 TS enum을 `registerEnumType(AllowedColor, { name, valuesMap })`으로 등록 — valuesMap으로 값별 description, deprecationReason 부여.

## Federation 배선

- **subgraph**: 드라이버를 `ApolloFederationDriver`(@nestjs/apollo)로 바꿔 등록. code-first 엔티티는 `@Directive('@key(fields: "id"))`로 마킹하고, `@ResolveReference()` 메서드가 Gateway가 참조 엔티티 인스턴스를 요구할 때(_entities 경유) 불리는 리졸버가 된다.
- **gateway**: 별도 앱에서 `ApolloGatewayDriver` + `gateway` 옵션(IntrospectAndCompose 또는 supergraphSdl)으로 구성. 합성 방식, 쿼리 플랜, 소유권 등 개념 정본은 [[GraphQL-Federation]].

## 모델 공유 — 프론트엔드 shim

code-first 모델 클래스를 모노레포의 TS 프론트엔드와 공유하면 GraphQL 데코레이터가 프론트 번들에 끌려온다. 번들러(webpack 등)에서 `@nestjs/graphql`을 공식 **model shim**(`@nestjs/graphql/dist/extra/graphql-model-shim`)으로 alias하면 데코레이터가 무동작 코드로 대체된다 — TypeORM도 동일한 shim을 제공.

## Field Middleware (code-first 전용)

필드가 해석되기 **전후에** 실행되는 함수 — 결과 변환, 인자 검증, 필드 레벨 권한 체크용. `@Field({ middleware: [fn] })`으로 필드에, `buildSchemaOptions.fieldMiddleware`로 전역 적용하고, 배열 순서대로 바깥 레이어부터 감싼다 (`await next()`가 실제 리졸버 실행, 반환값이 필드 값을 완전히 덮음).

- **DI 주입 불가** — 컨테이너 밖에서 도는 경량 함수로 설계돼 DB 조회 같은 무거운 작업 금지. 외부 데이터가 필요하면 루트 쿼리의 가드/인터셉터에서 조회해 context에 실어 두고 `MiddlewareContext`({ source, args, context, info })로 읽는다.
- ObjectType 클래스에만 적용 가능하고 `@ResolveField`에도 바인딩할 수 있다.
- **@Extensions와 결합한 필드 레벨 권한**: `@Extensions({ role: Role.ADMIN })`(code-first 전용, 필드/클래스/메서드 레벨)로 임의 메타데이터를 타입 설정에 부착하고, field middleware가 `ctx.info.parentType.getFields()[info.fieldName].extensions`로 읽어 호출자 권한과 대조 — 미달이면 throw 또는 null 반환으로 필드를 가린다.

## 쿼리 복잡도 제한

graphql-query-complexity를 Apollo 플러그인으로 얹는다 — `didResolveOperation` 훅에서 `getComplexity()`로 연산 비용을 계산해 한도 초과면 **실행 전에** GraphQLError를 던진다. estimator 체인: `fieldExtensionsEstimator()`가 `@Field({ complexity: N })` 가중치를 읽고, 폴백 `simpleEstimator({ defaultComplexity: 1 })`가 나머지 필드에 고정값. 원칙과 depth limiting 등 다른 방어층은 [[GraphQL-Security]].

## 커스텀 디렉티브 적용

- code-first는 `@Directive('@upper')` 데코레이터로 필드, 타입에 SDL 디렉티브를 부착한다 (`@Directive('@deprecated(reason: "...")')` 같은 내장 디렉티브도 동일 경로). **경고: 이렇게 붙인 디렉티브는 생성된 스키마 정의 파일에는 반영되지 않는다.**
- 디렉티브의 실행 로직은 mapSchema 기반 변환 함수를 `GraphQLModule.forRoot({ transformSchema: schema => upperDirectiveTransformer(schema, 'upper') })`로 적용한다. 디렉티브 개념과 정의 문법은 [[GraphQL-Query-Language]], [[GraphQL-Schema-Types]].

## 관련 문서

- [[NestJS-GraphQL|NestJS GraphQL (TOC)]]
- [[NestJS-GraphQL-DataLoader|Resolver, DataLoader]]
- [[GraphQL-Schema-Types|GraphQL 타입 시스템]]

## 출처

- [NestJS — GraphQL quick start](https://docs.nestjs.com/graphql/quick-start)
- [NestJS — GraphQL Resolvers](https://docs.nestjs.com/graphql/resolvers)
- [NestJS — GraphQL Mutations](https://docs.nestjs.com/graphql/mutations)
- [NestJS — GraphQL Scalars](https://docs.nestjs.com/graphql/scalars)
- [NestJS — GraphQL Directives](https://docs.nestjs.com/graphql/directives)
- [NestJS — GraphQL Interfaces](https://docs.nestjs.com/graphql/interfaces)
- [NestJS — GraphQL Unions and Enums](https://docs.nestjs.com/graphql/unions-and-enums)
- [NestJS — GraphQL Field middleware](https://docs.nestjs.com/graphql/field-middleware)
- [NestJS — GraphQL Mapped types](https://docs.nestjs.com/graphql/mapped-types)
- [NestJS — GraphQL Complexity](https://docs.nestjs.com/graphql/complexity)
- [NestJS — GraphQL Extensions](https://docs.nestjs.com/graphql/extensions)
- [NestJS — GraphQL CLI Plugin](https://docs.nestjs.com/graphql/cli-plugin)
- [NestJS — Generating SDL](https://docs.nestjs.com/graphql/generating-sdl)
- [NestJS — Sharing models](https://docs.nestjs.com/graphql/sharing-models)
- [NestJS — GraphQL Federation](https://docs.nestjs.com/graphql/federation)
- [Apollo Server — Generating types from a schema](https://www.apollographql.com/docs/apollo-server/workflow/generate-types)
