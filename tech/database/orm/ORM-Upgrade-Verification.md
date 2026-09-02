---
tags: [database, orm, typeorm, migration, upgrade, testing]
status: done
verified_at: 2026-08-13
category: "Database - ORM"
aliases: ["ORM Upgrade Verification", "ORM 업그레이드 검증"]
---

# ORM 업그레이드 검증

ORM 업그레이드는 package version을 바꾸고 unit test를 통과시키는 작업이 아니다. 애플리케이션 부팅, entity metadata, transaction 경계, migration 탐색과 실제 배포 산출물이 같은 계약을 유지하는지 확인하는 작업이다.

## 호환성 확인과 운영 전환을 분리한다

- **호환성 spike**: 목표 version에서 build, test와 대표 DB 동작이 가능한지 빠르게 확인한다.
- **운영 전환**: 고정된 산출물, migration 순서, 관측 지표, canary와 rollback 조건으로 실제 traffic을 옮긴다.

Spike 성공은 배포 승인 근거의 일부일 뿐이다. 계획 문서가 검토되었거나 test가 한 번 통과했다는 사실도 운영 gate가 충족되었다는 증거는 아니다.

## 먼저 고정할 계약

| 표면 | 확인할 계약 |
|---|---|
| 부팅 | `DataSource.initialize()`와 connection pool 생성, 종료 시 정리 |
| Metadata | 배포 산출물에서 entity, subscriber와 migration 경로가 실제 파일을 찾음 |
| Repository | 대표 `find`, relation, QueryBuilder가 같은 결과와 query shape를 냄 |
| Transaction | callback이 전달한 `EntityManager` 또는 같은 `QueryRunner`만 사용 |
| Migration | pending 탐색, 적용 순서, transaction mode와 revert 경로 |
| Schema | 생성 SQL의 FK, index, nullability와 destructive change 검토 |
| 배포 | staging에서 검증한 동일한 lockfile과 image를 production에도 사용 |

TypeORM transaction 안에서는 전역 manager나 평소 주입받은 repository를 섞지 않고 callback이 제공한 transaction 전용 manager에서 repository를 얻는다. Upgrade가 이 경계를 새로 만들지는 않지만, 내부 동작 변화가 숨어도 단위 test만으로는 잡기 어려운 대표 계약이다.

## 가장 작은 증거 사다리

1. **현재 version 기준선**: 실제와 같은 DB engine에서 cold boot, 대표 query, transaction commit과 rollback, migration run과 revert를 기록한다.
2. **목표 version spike**: dependency와 lockfile을 고정하고 같은 검증을 반복한다. 실패는 애플리케이션 문제와 ORM 또는 driver 호환성 문제로 나눈다.
3. **산출물 검증**: source tree가 아니라 실제 build 결과나 image에서 entity와 migration을 탐색하고 실행한다. TypeScript glob이 개발에서는 맞지만 compiled JavaScript 경로에서는 빗나갈 수 있다.
4. **제한 배포**: startup error, connection pool, query error, slow query, transaction rollback과 migration 상태를 관찰한다.
5. **확대 또는 중단**: 사전에 정한 관찰 창과 중단 조건을 통과한 뒤에만 다음 단위로 넓힌다.

현재 version 기준선이 먼저 있어야 목표 version에서 새로 생긴 회귀와 원래 있던 결함을 구분할 수 있다. Mock DB만 통과한 결과는 SQL dialect, isolation, connection과 migration 계약의 증거가 아니다.

## 증거가 무효가 되는 변경

아래 항목이 바뀌면 이전 검증을 그대로 재사용하지 않는다.

- ORM, DB driver, Node.js runtime 또는 DB engine version
- entity, migration, naming strategy와 subscriber
- build target, 파일 확장자, glob과 image layout
- connection, pool, isolation과 migration transaction 설정
- 배포 산출물 또는 lockfile

변경 단위를 작게 유지하면 어떤 변화가 증거를 무효화했는지 좁힐 수 있다. ORM upgrade와 대규모 schema 변경을 한 배포에 섞지 않는 이유다.

## Rollback도 실행 계약이다

- 애플리케이션 rollback과 schema rollback을 구분한다.
- 새 코드가 이미 기록한 데이터를 이전 코드가 읽을 수 있는지 확인한다.
- destructive migration은 단순 revert가 불가능할 수 있으므로 expand and contract를 우선한다.
- rollback 명령의 존재가 아니라 격리 환경에서의 실제 성공과 소요 시간을 기록한다.

## 완료 체크리스트

- [ ] 공식 breaking change와 현재 사용 API의 교집합을 확인했다.
- [ ] 실제 DB engine으로 현재와 목표 version의 기준선을 비교했다.
- [ ] transaction commit과 rollback이 같은 connection 경계에서 동작했다.
- [ ] 실제 산출물에서 entity와 migration을 찾고 실행했다.
- [ ] canary 지표, 관찰 창과 자동 또는 수동 중단 조건이 있다.
- [ ] 애플리케이션과 schema rollback을 각각 실행해 보았다.

## 관련 문서

- [[ORM|ORM과 NestJS 영속성 선택]]
- [[Transactions|트랜잭션]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경]]
- [[Version-Upgrade-Difficulty|버전 업그레이드의 난이도 구조]]

## 출처

- [DataSource — TypeORM](https://typeorm.io/docs/data-source/data-source/)
- [Data Source Options — TypeORM](https://typeorm.io/docs/data-source/data-source-options/)
- [Transactions — TypeORM](https://typeorm.io/docs/transactions/)
- [Migration setup — TypeORM](https://typeorm.io/docs/migrations/setup/)
