---
tags: [nestjs, typeorm, mongoose, database, persistence]
status: index
category: "OS & Runtime - NestJS"
aliases: ["NestJS Persistence", "NestJS 영속성 통합", "NestJS 데이터베이스 통합"]
---

# NestJS 영속성 통합 (nestjs-persistence 인덱스)

DB 커넥션과 Repository, Model을 NestJS DI와 모듈 시스템에 얹는 문서들을 모은다. TypeORM, Mongoose와 Drizzle/Prisma/MikroORM/Sequelize의 배선을 비교하며, 전용 패키지를 쓰는 배선과 커스텀 프로바이더로 직접 배선하는 방식을 함께 둔다.

## 하위 문서

- [[NestJS-Database|Database — @nestjs/typeorm, forRoot 전용 옵션, forFeature, 트랜잭션, 다중 DB]]
- [[NestJS-TypeORM-Manual-Wiring|TypeORM 수동 배선 — 커스텀 async provider로 DataSource, Repository 직접 구성]]
- [[NestJS-MongoDB|MongoDB — @nestjs/mongoose, 스키마 데코레이터, CRUD 결과 계약, CastError와 unique 경쟁 조건, 세션 트랜잭션, Discriminator]]

- [[NestJS-Database-Clients-and-Contexts|데이터 클라이언트와 컨텍스트 — Drizzle 풀, Prisma 생성 코드, MikroORM Identity Map, Sequelize transaction]]

## 관련 문서

- [[integrations|NestJS 통합 인덱스]]
- [[NestJS|NestJS 개요]]
- [[ORM|ORM (Sequelize, TypeORM, Prisma 비교)]]
- [[NestJS-Testing|NestJS Testing (getRepositoryToken 기반 mock)]]
