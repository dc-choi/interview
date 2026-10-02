---
tags: [nestjs, graphql, federation, deployment]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
---

# NestJS GraphQL 드라이버와 Federation 운영

schema/resolver 계약이 같아도 Apollo와 Mercurius의 context, PubSub, HTTP 처리와 종료 API까지 같지는 않다. driver를 바꾸는 작업은 schema 재사용과 전송 동작을 나눠 검증한다.

## 요청, 실행 오류와 계측

ApolloDriverConfig의 `autoTransformHttpErrors`는 HttpException을 GraphQL 오류로 매핑한다. `preserveHttpStatusForExecutionErrors`는 execution error의 HTTP 상태 처리에 대한 별도 옵션이다. GraphQL의 `{ data, errors }`와 HTTP status를 함께 해석하고 200 하나만 성공 기준으로 삼지 않는다.

`ResolverDecoratorHost.setOnRequestStartHook/setOnRequestEndHook`는 operation 처리 전후의 계측 hook이다. start의 반환 state를 end에서 받아 span/timing을 정리하며 raw document, variables와 context의 민감값을 통째로 기록하지 않는다. `stopOnApplicationShutdown`은 GraphQL server 종료를 onModuleDestroy에서 뒤로 미뤄 beforeApplicationShutdown 중에도 요청을 받을 수 있게 한다. load balancer drain과 새로운 요청 차단 정책은 별도로 맞춘다.

Mercurius sample은 `@Context('pubsub')`로 driver의 PubSub를 받아 `publish({ topic, payload })`, `subscribe(topic)`를 사용한다. Apollo sample의 `graphql-subscriptions.publish(trigger, payload)`와 `asyncIterableIterator(trigger)`를 그대로 복사하지 않는다. 두 sample의 mock service 반환값이나 in-memory PubSub가 실제 데이터 저장, 분산 전달을 보장하지는 않는다.

## Subgraph와 Gateway의 배포 계약

subgraph는 자신의 SDL과 entity resolver를 소유한다. `@key`의 field, ID의 wire 표현과 `@ResolveReference()`가 받는 representation을 일치시킨다. TypeScript의 number 선언이 GraphQL ID 문자열을 숫자로 변환하는 것은 아니다. 필요하면 pipe와 service normalization을 명시한다.

Gateway가 static `supergraphSdl`을 읽으면 매번 startup에서 live subgraph introspection을 할 필요가 줄어든다. 대신 합성 결과를 빌드/배포 산출물로 만들고 실제 실행 경로에 포함해야 한다. `.graphql`, `.proto`, view와 HTML 같은 비 TS asset도 build 설정에서 복사하는지 확인한다. TS build 성공만으로 파일 존재가 보장되지는 않는다.

공식 Federation sample의 local generator는 단순화한 문자열 조합이다. README의 production-ready 표현만으로 실제 query plan용 합성 계약이 검증됐다고 보지 않는다. 운영에서는 Rover 등 실제 Federation composition 경로로 subgraph 간 field ownership/타입 호환성을 확인하고, 정적 schema 파일을 배포한 뒤 **두 subgraph를 가로지르는 query**의 data/errors를 시험한다.

`ApolloGatewayDriverConfig.transformSchema`는 초기 composition 때 적용한다. 현재 API 설명상 startup 뒤 polling으로 들어오는 schema update는 synchronous listener를 거쳐 변환 없이 전달된다. runtime update에도 변환이 유지된다고 가정하지 않는다. 지속적 변환이 필수라면 composition/update 경로와 driver 구현을 확인하고 그 조건을 만족하는 배포 방식을 고른다.

## 검증 경계

- schema 생성 테스트는 타입/필드 계약을 본다. resolver를 직접 호출한 테스트는 transport, validation과 authorization pipeline을 시험하지 않는다.
- Gateway source에 `readFileSync`가 있는지만 확인하는 테스트는 deploy artifact의 존재와 routing을 증명하지 않는다.
- root resolver뿐 아니라 entity reference, nullable 결과, 한 subgraph 장애와 권한 전파를 별도로 확인한다.
- schema-first 생성 TS 파일을 직접 고치지 않는다. SDL 정본에서 생성하고 별도 DTO/resolver에서 validation을 보완한다.

## 관련 문서

- [[NestJS-GraphQL-Schema-Mapping]]
- [[NestJS-GraphQL-Subscription]]
- [[GraphQL-Federation]]
- [[NestJS-Testing-Transport-and-Contracts]]

## 출처

- [NestJS API, ApolloDriverConfig](https://api-references-nestjs.netlify.app/api/apollo/ApolloDriverConfig)
- [NestJS API, ApolloGatewayDriverConfig](https://api-references-nestjs.netlify.app/api/apollo/ApolloGatewayDriverConfig)
- [NestJS API, GqlModuleOptions](https://api-references-nestjs.netlify.app/api/graphql/GqlModuleOptions)
- [NestJS API, ResolverDecoratorHost](https://api-references-nestjs.netlify.app/api/graphql/ResolverDecoratorHost)
- [NestJS sample, Mercurius resolver](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/33-graphql-mercurius/src/recipes/recipes.resolver.ts)
- [NestJS sample, Federation composition](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/31-graphql-federation-code-first/gateway/generate-supergraph.ts)
- [NestJS sample, schema-first composition](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/32-graphql-federation-schema-first/gateway/generate-supergraph.ts)
