---
tags: [nestjs, graphql, dataloader, subscription]
status: index
verified_at: 2026-07-20
category: "OS & Runtime - NestJS"
aliases: ["NestJS GraphQL", "NestJS GraphQL 통합"]
---

# NestJS GraphQL (nestjs-graphql 인덱스)

`@nestjs/graphql`은 Apollo, Mercurius를 백엔드로 GraphQL을 NestJS DI와 모듈 시스템에 통합한다. code-first와 schema-first를 모두 제공하며 공식 문서는 한쪽을 보편적 권장안으로 지정하지 않는다 — 팀의 단일 진실 소스와 schema 협업 방식으로 선택한다.

## 하위 문서

- [[NestJS-GraphQL-Schema-Mapping|스키마 접근과 타입 매핑 — code-first vs schema-first, @Field/@InputType 계약, 스칼라, 디렉티브]]
- [[NestJS-GraphQL-DataLoader|Resolver와 DataLoader — ResolveField, N+1 해결, GqlExecutionContext Guard]]
- [[NestJS-GraphQL-Subscription|Subscription — PubSub, graphql-ws 전송, connectionParams 인증, 수평 확장]]

## 관련 문서

- [[GraphQL-Architecture-Map|GraphQL 전체 그림 지도 (NestJS resolver, DataLoader가 흐름 어디에 앉나)]]
- [[NestJS|NestJS 개요]]
- [[Apollo-Server|Apollo Server (드라이버 구현 정본)]]
- [[API-Comparison|REST vs GraphQL]]
