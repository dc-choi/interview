---
tags: [database, orm, mikroorm, operations, migrations, performance]
status: index
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["MikroORM Operations", "MikroORM 운영"]
---

# MikroORM 운영

MikroORM v7.1.11을 기준으로 schema 변경, 성능 진단, 테스트, 배포와 v6에서 v7로의 전환을 다룬다. ORM의 편의 API와 운영 안전성은 별개다. 특히 schema generator의 실행 성공은 production schema 변경 승인 근거가 아니다.

## 운영 학습 순서

1. [[MikroORM-Migrations-Schema|Migration과 Schema]]에서 개발용 schema generator와 production migration의 경계를 먼저 익힌다.
2. [[MikroORM-Testing|테스트 전략]]으로 metadata, SQL dialect, migration과 transaction을 분리해 검증한다.
3. [[MikroORM-Performance-Troubleshooting|성능과 장애 진단]]에서 query 수, SQL shape, replica와 cache의 관찰 방법을 익힌다.
4. [[MikroORM-Deployment|배포와 산출물]]에서 ESM, entity discovery, metadata cache와 migration artifact를 함께 고정한다.
5. v6 코드베이스라면 [[MikroORM-v7-Upgrade|v7 업그레이드]]의 breaking change 목록과 검증 gate를 순서대로 통과한다.

## 운영의 세 경계

| 경계 | 개발과 테스트 | production |
|---|---|---|
| Schema | `schema:*` 명령으로 빠른 피드백 가능 | review된 migration만 적용 |
| 실행 산출물 | TypeScript source와 loader를 써도 됨 | compiled ESM, migration 경로와 cache artifact를 실제 image에서 검증 |
| 성능 | debug log와 작은 fixture로 가설 탐색 | 대표 cardinality와 실제 DB plan, 지표로 검증 |

## 관련 문서

- [[MikroORM|MikroORM 학습 지도]]
- [[MikroORM-Architecture|MikroORM 아키텍처]]
- [[MikroORM-Transactions-Concurrency|트랜잭션과 동시성]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]

## 출처

- [MikroORM documentation versions](https://mikro-orm.io/versions)
- [MikroORM v7.1.11 release](https://github.com/mikro-orm/mikro-orm/releases/tag/v7.1.11)
