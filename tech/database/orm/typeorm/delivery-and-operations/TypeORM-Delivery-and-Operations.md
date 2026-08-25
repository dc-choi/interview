---
tags: [database, orm, typeorm, migration, deployment, testing, version]
status: index
category: "Database - ORM"
aliases: ["TypeORM Delivery and Operations", "TypeORM 배포와 운영"]
---

# TypeORM 배포와 운영

TypeORM `1.1.0` 애플리케이션을 실제 환경에 올리고 유지하는 계약을 묶는다. schema를 운영에 옮기는 migration 배포, 생성 SQL과 transaction 경계를 증거로 확인하는 운영 검증, 0.3에서 올릴 때 통과해야 할 버전과 실행 환경 gate를 한 흐름으로 읽는다. API 호출이 오류 없이 끝났다는 사실은 배포 승인 근거가 아니다.

- [[TypeORM-Migrations-and-Delivery|마이그레이션과 배포]]: migration 계약이 되는 DataSource, up과 down, CLI 최소 명령과 산출물, transaction mode와 DDL 경계, expand, migrate, contract 순서와 revert 복구
- [[TypeORM-Testing-and-Operations|테스트와 운영 진단]]: 검증 층 구분, 단위와 통합 테스트, SQL 회귀 증거, logging, subscriber, query result cache와 운영 체크리스트
- [[TypeORM-Version-Guide|1.1.0 버전 가이드]]: 실행 환경과 driver, 제거된 전역 API와 안전 기본값, NestJS 호환 조합, 0.3에서 1.1.0으로 올리는 순서와 완료 조건

## 함께 볼 문서

- [[TypeORM|TypeORM 허브]]
