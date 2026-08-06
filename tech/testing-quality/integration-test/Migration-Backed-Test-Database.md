---
tags: [testing, integration-test, database, migration, testcontainers, build-cache]
status: done
verified_at: 2026-08-04
category: "테스트&품질(Testing&Quality)"
aliases: ["Migration-backed Test Database", "Build-declared Test Database", "마이그레이션 기반 테스트 DB"]
---

# 마이그레이션 기반 테스트 데이터베이스

## 정의

운영 스키마가 Liquibase나 Flyway changelog에서 만들어진다면 테스트 데이터베이스도 같은 변경 이력을 실제 엔진에 적용해 구성해야 한다. ORM entity나 별도의 `schema.sql`을 스키마 원본으로 삼으면 운영과 테스트의 구조가 조용히 갈라질 수 있다.

핵심은 테스트 DB 구성을 사람의 실행 순서가 아니라 빌드 입력으로 선언하는 것이다. 느린 초기화는 재현 가능한 dump cache로 줄이되, cache는 언제든 원본 migration에서 다시 만들 수 있는 파생 산출물이어야 한다.

## 서로 다른 두 검증 목표

| 목표 | 검증하는 것 | 필요한 경로 |
|---|---|---|
| Migration path correctness | 변경 순서, 중간 constraint, 엔진별 DDL 동작 | 빈 DB 또는 지원 기준 버전에서 changelog 재생 |
| Final schema compatibility | Repository와 service가 최종 schema에서 동작하는지 | 동일 migration으로 만든 최종 DB에 통합 테스트 실행 |

정적 `schema.sql` 병합은 최종 형태를 비슷하게 만들 수 있지만 migration 순서, 중간 상태와 실제 엔진 동작을 건너뛴다. 빠른 테스트용 snapshot은 두 번째 목표를 가속할 뿐 첫 번째 목표를 대체하지 않는다.

## DB variant를 빌드 입력으로 선언한다

한 애플리케이션이 여러 schema module을 조합한다면 구성 자체를 명시적 variant로 만든다.

```yaml
variant: billing-with-member
engine_image: mysql@sha256:...
database: app_test
schema_modules:
  - member/changelog-root.yaml
  - billing/changelog-root.yaml
migration_tool_version: liquibase-version
contexts: [test]
init_settings:
  timezone: UTC
  charset: utf8mb4
```

최소 입력은 다음을 포함한다.

- 데이터베이스 엔진 image, version 또는 digest
- database와 namespace 구성
- 순서가 보존된 schema module과 changelog reference
- migration plugin과 classpath version
- 초기 role, extension, SQL mode, timezone, charset과 collation
- Liquibase context/label 또는 Flyway location 같은 실행 선택 조건

순서는 의미가 있다. module 목록을 set처럼 정렬하거나 누락하면 동일한 파일 집합에서도 다른 schema가 나올 수 있다.

## Cold path와 warm path

```text
Cold path
variant 해석 -> 실제 엔진 시작 -> 초기 설정 -> migration 순서대로 적용
             -> schema 검증 -> dump 생성 -> 통합 테스트

Warm path
동일 cache key 확인 -> 파생 dump 복원 -> 통합 테스트
```

Cold path는 실제 migration을 실행해 기준 산출물을 만든다. Warm path는 모든 의미 입력이 동일할 때만 그 산출물을 복원한다. Cache miss는 오류가 아니라 원본 경로로 돌아가야 한다는 뜻이다.

## Cache key와 결정적 dump

Cache key에는 최종 SQL 파일뿐 아니라 결과에 영향을 주는 모든 입력을 포함한다.

- 순서가 보존된 changelog와 include 대상의 content hash
- migration tool, plugin과 JDBC driver version
- 엔진 image version 또는 digest
- dump/restore tool version과 option
- init SQL, role, extension과 schema module 순서
- charset, collation, timezone, SQL mode
- context, label과 placeholder
- snapshot에 fixture를 넣었다면 fixture 내용과 생성기 version

Dump에는 생성 시각, owner, 환경별 경로처럼 의미 없는 noise가 들어갈 수 있다. 해당 필드가 복원 결과에 영향을 주지 않는다는 것을 먼저 증명한 뒤에만 normalize한다. Owner, definer, sequence, auto-increment, permission과 session setting을 무조건 제거하면 의미가 달라질 수 있다.

Gradle task 관점에서는 variant 입력과 migration 파일을 task input으로, 정규화된 dump를 output으로 선언한다. 같은 입력에서 byte-identical output을 만들 수 없으면 build cache hit가 불안정해진다.

## 격리는 세 층으로 나눈다

| 층 | 목적 | 예시 |
|---|---|---|
| Engine lifecycle | 외부 프로세스와 version 격리 | Suite 단위 Testcontainers instance |
| Namespace | 서로 다른 variant 격리 | Database 또는 schema 분리 |
| Test data | 테스트 간 상태 격리 | TRUNCATE, fixture 재적재, 별도 schema |

Random port는 host 충돌만 줄인다. 같은 database와 table을 공유하면 병렬 테스트의 데이터 경합은 그대로다. Container 재사용 여부와 test data reset 전략도 별도로 정해야 한다.

## CI 검증 행렬

- 일반 pull request: cache hit를 허용한 final schema integration test
- 정기 또는 전용 job: 빈 DB에서 전체 migration cold replay
- migration 변경 pull request: cold replay와 schema diff 확인
- 파괴적 변경: 지원하는 과거 release baseline에서 upgrade test
- 엔진 version 변경: 이전과 새 version 양쪽에서 migration과 restore 확인

빈 DB에서 최신까지 성공했다는 사실은 기존 운영 데이터와 schema를 가진 환경의 upgrade 안전성을 보장하지 않는다. Rename, backfill, index 생성과 constraint 강화는 지원 baseline에서 별도로 검증한다.

## 실패 처리와 보안

- Migration 실패를 빈 schema 생성이나 ORM DDL로 우회하지 않는다.
- Cache restore 실패는 cold path로 fallback하고 손상된 artifact를 격리한다.
- 원격 cache에는 schema와 합성 데이터만 저장한다. 운영 dump, credential과 개인정보를 넣지 않는다.
- CI를 cache writer로 두고 개발자와 agent를 reader로 제한하면 오염 범위를 줄일 수 있다.
- Cache artifact에 engine, migration tool, variant와 source revision metadata를 남긴다.

DDL transaction 지원은 엔진마다 다르다. 예를 들어 MySQL은 여러 DDL 문에서 implicit commit이 발생한다. 모든 migration이 한 transaction으로 rollback된다고 가정하지 않는다.

Migration이 적용됐다는 믿음 자체도 검증 대상이다.

- **`CREATE TABLE IF NOT EXISTS`는 드리프트를 만든다** — 테이블이 이미 존재하면 문장이 통째로 무시되므로, 이전 버전으로 만들어진 테이블에는 이후 migration 파일을 아무리 고쳐도 반영되지 않는다. 기본값이나 컬럼 변경은 별도의 ALTER migration으로 강제한다. 실제 스키마와 파일의 일치는 `information_schema` 조회로 확인할 수 있다.
- **배포 이미지에 migration 파일이 실제로 들어갔는지 확인한다** — Dockerfile COPY 누락이면 시작 시 migration을 적용하는 코드가 존재하지 않는 폴더를 glob해 빈 리스트를 받고 조용히 아무것도 하지 않고 지나간다. 에러가 없는 것이 적용의 증거가 아니므로, 시작 로그에 적용된 migration 목록을 남겨 확인 가능하게 한다. 같은 레포의 형제 서비스에서 고친 버그가 다른 서비스에 남아 있는 복제 실수도 이 유형에서 잦다.

## 선택 기준

| 상황 | 권장 접근 |
|---|---|
| Migration 파일이 schema 원본 | 실제 엔진에 migration 적용 |
| 빠른 repository test가 주목적 | 검증된 dump cache로 warm start |
| Migration 자체가 변경됨 | Cold replay 필수 |
| 운영 upgrade 위험이 큼 | 지원 baseline에서 upgrade test |
| DB 기능을 거의 사용하지 않는 단위 테스트 | DB 없이 fake 또는 좁은 test double 고려 |

## 면접 체크포인트

- Schema source of truth가 entity, SQL snapshot, migration 중 무엇인지 명확한가?
- Migration path와 final schema compatibility를 별도 test로 다루는가?
- DB 조합과 순서를 빌드 입력으로 선언했는가?
- Cache key가 엔진과 환경 설정까지 포함하는가?
- Engine, namespace와 test data 격리를 구분하는가?
- 빈 DB 재생 외에 실제 upgrade path를 검증하는가?

## 출처

- [DDL이 코드 밖에서 온다면, 테스트 DB 구성을 빌드 안에 선언한다 - flex](https://flex.team/blog/2026/07/23/backend33)
- [What is a changelog? - Liquibase](https://docs.liquibase.com/concepts/changelogs/home.html)
- [Liquibase update command](https://docs.liquibase.com/reference-guide/init-update-and-rollback-commands/update)
- [Database containers - Testcontainers for Java](https://java.testcontainers.org/modules/databases/)
- [Manual container lifecycle control - Testcontainers for Java](https://java.testcontainers.org/test_framework_integration/manual_lifecycle_control/)
- [Build Cache - Gradle](https://docs.gradle.org/current/userguide/build_cache.html)
- [Repeatable task outputs - Gradle](https://docs.gradle.org/current/userguide/build_cache_concepts.html)
- [Statements That Cause an Implicit Commit - MySQL](https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)
- [유닛 테스트 209개를 통과한 PR인데, 실제로 돌려보니 저장이 한 건도 안 됐다 — velog](https://velog.io/@donghoong2/OCR-WORKER-%EC%9C%A0%EB%8B%9B-%ED%85%8C%EC%8A%A4%ED%8A%B8-209%EA%B0%9C%EB%A5%BC-%ED%86%B5%EA%B3%BC%ED%95%9C-PR%EC%9D%B8%EB%8D%B0-%EC%8B%A4%EC%A0%9C%EB%A1%9C-%EB%8F%8C%EB%A0%A4%EB%B3%B4%EB%8B%88-%EC%A0%80%EC%9E%A5%EC%9D%B4-%ED%95%9C-%EA%B1%B4%EB%8F%84-%EC%95%88-%EB%90%90%EB%8B%A4)

## 관련 문서

- [[Integration-Test-Environment|통합 테스트 환경]]
- [[TestContainers-Integration|Testcontainers 통합 테스트]]
- [[Test-Isolation|테스트 격리]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 마이그레이션]]
- [[Spring-Data-JPA-Essentials|Spring Data JPA 핵심]]
