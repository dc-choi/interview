---
tags: [database, orm, typeorm, nestjs]
status: index
category: "Database - ORM"
aliases: ["TypeORM Hub", "TypeORM 허브"]
---

# TypeORM

TypeORM의 모델링, 조회, 트랜잭션과 운영을 한 흐름으로 읽기 위한 인덱스다. 모든 학습 본문과 예제는 TypeORM `1.1.0`을 기준으로 한다.

## 학습 순서

1. [[TypeORM-Overview-and-DataSource|개요와 DataSource]]: 책임, 초기화, API 선택과 운영 기본값
2. [[TypeORM-Entities-and-Columns|Entity와 Column]]: 테이블 매핑, 타입, 특수 컬럼과 모델 경계
3. [[TypeORM-Relations|Relation]]: FK 소유권, 로딩, cascade와 관계 변경
4. [[TypeORM-Repository-and-Find-Options|Repository와 Find Options]]: 저장 API와 타입 기반 조회
5. [[TypeORM-QueryBuilder|QueryBuilder]]: 동적 SQL, join, projection, pagination과 lock
6. [[TypeORM-Transactions-and-Replication|트랜잭션과 복제]]: manager 경계, QueryRunner와 read replica
7. [[TypeORM-Migrations-and-Delivery|마이그레이션과 배포]]: CLI, 산출물, 적용과 복구
8. [[TypeORM-Testing-and-Operations|테스트와 운영 진단]]: subscriber, logging, cache와 검증
9. [[TypeORM-Version-Guide|1.1.0 버전 가이드]]: 실행 환경, 안전 기본값과 0.3 업그레이드 gate
10. [[ORM|세 ORM 선택 기준]], [[MikroORM-vs-TypeORM|MikroORM 비교]]: TypeORM의 트레이드오프와 전환 조건

## NestJS와 데이터베이스 원리

- [[NestJS-Database|@nestjs/typeorm 통합]]
- [[Transactions|트랜잭션]], [[Lock|DB Lock]], [[SQL|SQL]]
- [[ORM-Upgrade-Verification|ORM 업그레이드 검증]]
