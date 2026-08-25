---
tags: [database, schema, migration, versioning]
status: done
verified_at: 2026-08-24
category: "Data & Storage - RDB"
aliases: ["Schema Versioning", "스키마 버전 관리"]
---

# 스키마 버전 관리 (Schema Versioning)

스키마 변경을 순서 있는 마이그레이션 파일로 남겨 코드처럼 버전 관리하는 방식이다. 정본은 지금 DB에 있는 스키마가 아니라 마이그레이션 히스토리이고, 어떤 환경의 스키마든 히스토리를 처음부터 재생하면 같은 상태가 나와야 한다.

## 동작 원리

- 변경 하나가 마이그레이션 파일 하나다. 파일에는 순번 또는 타임스탬프가 붙고, DB 안의 마이그레이션 테이블이 어디까지 적용했는지를 기록한다.
- 새 환경(로컬, 테스트, 신규 리전)은 히스토리 전체 재생으로 만들어진다. 이것이 되지 않으면 버전 관리가 아니라 변경 로그일 뿐이다.
- 적용된 마이그레이션 파일은 수정하지 않는다. 이미 재생된 환경과 아직인 환경이 갈라진다. 잘못됐으면 되돌리는 마이그레이션을 새로 추가한다. 도구가 체크섬 검증으로 이를 강제해 주지 않는 환경에서는 리뷰 규율로 지킨다.

## 드리프트를 막는 규칙

버전 관리가 무너지는 경로는 대부분 마이그레이션 밖의 변경이다.

- 콘솔이나 GUI로 운영 스키마를 직접 바꾸지 않는다. 장애 대응으로 직접 변경했다면 같은 내용을 마이그레이션으로 역기입해 히스토리와 실제를 다시 맞춘다.
- ORM의 자동 동기화(synchronize 류)는 운영에서 쓰지 않는다. TypeORM 기준 세부 규칙은 [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]가 소유한다.
- 환경 간 비교(마이그레이션 테이블 대조, 스키마 덤프 diff)를 배포 파이프라인에 두면 드리프트를 조기에 잡는다.

## up/down과 roll-forward

- down 마이그레이션은 완전한 보험이 아니다. 컬럼 삭제나 타입 축소처럼 데이터를 잃는 변경은 down을 써도 데이터가 돌아오지 않는다.
- 그래서 실무 기본값은 roll-forward다. 문제가 생기면 앞으로 가는 수정 마이그레이션을 추가하고, 배포 롤백은 스키마를 되돌리는 게 아니라 구버전 앱이 신 스키마 위에서 돌 수 있는 전후방 호환으로 버틴다. TypeORM 기준의 구체 절차는 [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]가 소유한다.

## 배포와의 결합

- 마이그레이션 실행은 앱 기동과 분리한 배포 전 단계로 둔다. TypeORM이면 `migrationsRun: false`로 두어 기동에 묶지 않는 것이 그 구체형이다. 여러 인스턴스가 동시에 기동하며 각자 마이그레이션을 실행하는 구조는 잠금 경합과 부분 적용을 만들 수 있다. TypeORM 기준 실행 시점 결정은 [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]를 따른다.
- 배포 중에는 구버전과 신버전 앱이 같은 스키마를 동시에 쓴다. 따라서 각 마이그레이션은 직전 앱 버전과 호환되어야 하고, 파괴적 변경은 확장(expand) 후 수축(contract)으로 쪼갠다. 개념은 [[Blue-Green|Blue-Green 배포]]의 DB 스키마 절, TypeORM에서의 실행 순서와 backfill은 [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]가 소유한다.
- 큰 테이블의 ALTER는 마이그레이션 파일에 넣기 전에 실행 전략부터 정한다. Online DDL과 OSC 도구 선택은 [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]이 소유한다.

## 면접 체크포인트

- 정본이 DB 상태가 아니라 마이그레이션 히스토리인 이유를 새 환경 재현 관점에서 설명할 수 있는가.
- down 마이그레이션이 있는데도 roll-forward가 기본인 이유를 데이터 소실형 변경으로 설명할 수 있는가.
- 배포 롤백과 스키마 롤백이 왜 분리되는지, 그 간극을 무엇이 메우는지(전후방 호환) 말할 수 있는가.
- 적용된 마이그레이션 파일을 수정하면 안 되는 이유를 환경 간 재생 관점에서 설명할 수 있는가.

## 관련 문서

- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]
- [[TypeORM-Migrations-and-Delivery|TypeORM 마이그레이션과 배포]]
- [[MySQL-Data-and-Access-Safety|MySQL 데이터와 접근 안전성]]
- [[Blue-Green|Blue-Green 배포 (Expand-Contract)]]
- [[Schema-Design|스키마 설계]]
- [[NestJS-Database|NestJS와 TypeORM 데이터베이스 통합]]

## 출처

- [Evolutionary Database Design — Martin Fowler, Pramod Sadalage](https://martinfowler.com/articles/evodb.html)
- [TypeORM, How migrations work?](https://typeorm.io/docs/migrations/why/)
- [TypeORM, Executing and reverting](https://typeorm.io/docs/migrations/executing/)
- [TypeORM, Data Source Options](https://typeorm.io/docs/data-source/data-source-options/)
