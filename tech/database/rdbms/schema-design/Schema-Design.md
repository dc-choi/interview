---
tags: [database, schema]
status: index
category: "데이터&저장소(Data&Storage)"
aliases: ["Schema Design", "스키마 설계"]
---

# Schema Design

데이터베이스 스키마를 설계할 때 고려해야 할 패턴과 원칙이다.

## 하위 문서

- [[Data-Modeling-Workflow|데이터 모델링 절차 (개념, 논리, 물리 모델과 검증)]]
- [[Relational-Relationship-Modeling|관계형 관계 모델링 (1:1, 1:N, M:N, 식별/비식별 관계)]]
- [[Data-Integrity-Constraints|데이터 무결성 제약 (NOT NULL, UNIQUE, CHECK, FK, cross-row invariant)]]
- [[Normalization|Normalization / Denormalization]]
- [[Primary-Key-Strategy|PK 생성 전략 (AUTO_INCREMENT, UUID v4와 v7, ULID, Snowflake, 클러스터링 인덱스 영향)]]
- [[Business-Logic-App-vs-DB|비즈니스 로직 위치 (App vs DB, Stored Procedure 기피, 확장성 비대칭)]]
- [[JSON-vs-Text-Column|JSON vs TEXT 컬럼 (MySQL/PostgreSQL, 접근 패턴 기반 선택)]]
- [[Flexible-Attribute-Modeling|가변 속성 모델링 (일반 컬럼, 보조 테이블, EAV, JSON hybrid)]]
- [[Hierarchical-Data-Modeling|계층형 데이터 모델링 (adjacency list, recursive CTE, closure table)]]
- [[Operational-Data-History-and-Audit|운영 데이터 이력과 감사 (snapshot, temporal history, audit log)]]
- [[Soft-Delete-and-Data-Lifecycle|소프트 삭제와 데이터 생명주기]]
- [[Aggregate-Summary-Table-Patterns|집계 요약 테이블 (grain, 증분 집계, 재처리와 정합성)]]
- [[Relational-Inheritance-Mapping|관계형 상속 매핑 (concrete, single table, joined)]]
- [[Recurring-Event-Modeling|반복 일정 모델링 (series, exception, occurrence 투영)]]
- [[Foreign-Key-Integrity|외래 키와 참조 무결성 (보장 범위, referential action, 앱 관리 대안)]]
- [[SCD-Type2|SCD Type 2 (차원 데이터 이력 관리, 변경 이력 행 적재)]]
- [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경 (INSTANT/INPLACE/COPY, pt-osc, gh-ost)]]
- [[Data-Dictionary|데이터 딕셔너리 (Oracle vs MySQL)]]

## 네이밍 컨벤션

**DB 컬럼:** `snake_case` — DB 표준에 따름 (예: `created_at`, `deleted_at`)
**애플리케이션:** `camelCase` — 언어 컨벤션에 따름 (예: `createdAt`, `deletedAt`)
**매핑:** ORM의 naming strategy나 명시적 column name으로 DB와 애플리케이션 표기를 분리

이렇게 하면 DB 쿼리 시에는 SQL 표준, 코드에서는 언어 컨벤션을 각각 지킬 수 있다.

## Soft Delete 패턴

`deleted_at`은 행을 기본 조회에서 숨기는 생명주기 표식이다. 비즈니스 상태, 변경 이력, 감사 로그와 개인정보 보존 정책을 대신하지 않는다.

- TypeORM의 `@DeleteDateColumn`은 기본 scope에서 삭제 행을 제외하지만 raw SQL과 별도 query builder 경로를 함께 점검한다.
- `deleted_at`을 모든 인덱스 첫 컬럼에 넣지 않는다. 실제 equality/range/order 조건과 카디널리티를 기준으로 실행 계획을 검증한다.
- 활성 행만 유일해야 한다면 PostgreSQL partial unique index나 MySQL generated active key처럼 제품별 제약을 설계한다.
- 복구 가능 기간, 최종 purge, 법적 보존과 anonymization을 별도 정책으로 둔다.

상세한 DDL, 유니크 제약과 복구 경계는 [[Soft-Delete-and-Data-Lifecycle]]에서 다룬다.

## ID 전략

**BigInt 사용:** 대규모 데이터를 다룰 수 있도록 ID를 BigInt로 설정한다.
- MySQL의 `BIGINT`는 최대 9,223,372,036,854,775,807까지 수용
- 애플리케이션에서는 JSON 직렬화 시 Number 범위를 초과할 수 있으므로 **String으로 변환**하여 전달
- tRPC + SuperJSON 같은 트랜스포머를 사용하면 BigInt 직렬화를 자동 처리

**Auto Increment vs UUID:**

| 구분 | Auto Increment | UUID |
|---|---|---|
| 크기 | 8byte (BigInt) | 16byte |
| 정렬 | 자연 순서 | 불가 (UUIDv7 제외) |
| 분산 생성 | 불가 (단일 시퀀스) | 가능 |
| 보안 | ID 추측 가능 | 추측 어려움 |

## 계층 구조 설계

같은 종류의 노드가 깊이를 바꿀 수 있으면 adjacency list와 recursive CTE를 먼저 검토한다. 조상, 자손 조회가 매우 빈번하고 쓰기 비용을 감수할 수 있으면 closure table을 고려한다. 서로 다른 고정 단계의 엔티티를 단순히 한 트리 테이블로 합치지 않는다. 자세한 선택 기준은 [[Hierarchical-Data-Modeling]]에 있다.

## 다대다(M:N) 관계

Junction Table(연결 테이블)로 구현한다.

예: Student ↔ Group → `StudentGroup` 테이블
- `studentId` (FK → Student)
- `groupId` (FK → Group)
- 복합 유니크 제약: `@@unique([studentId, groupId])`

## 인덱스 설계

**기본 원칙:**
- FK 컬럼은 조인과 부모 삭제/갱신 경로의 인덱스 필요성을 검토한다.
- 자주 실행되는 equality, range, 정렬 조합과 selectivity에 맞춰 복합 인덱스 순서를 정한다.
- soft delete 조건은 실제 query shape에 포함될 때만 인덱스 후보이며, 실행 계획으로 효과를 확인한다.

## 이력과 감사

행 snapshot, 유효 기간을 가진 temporal history, 변경 이벤트 audit log는 답하는 질문이 다르다. 현재 행 변경과 이력 기록을 같은 트랜잭션에서 다루고, 보존 기간과 개인정보 삭제 정책도 설계한다. 자세한 비교는 [[Operational-Data-History-and-Audit]]를 참고한다.

## 제한된 선택지 컬럼: Enum vs 참조 테이블

상태값, 역할, 타입처럼 허용 값이 정해진 컬럼은 두 갈래로 나눠서 고른다. 기준은 **값 집합이 앞으로 늘거나 바뀔 여지가 있는가**이다.

| 성격 | 예 | 권장 |
|---|---|---|
| 항목이 늘거나 바뀔 수 있음 | `Role`(권한 추가), `GroupType`, `JoinStatus`(상태 단계 추가) | **참조 테이블(lookup table)** — 값 추가가 `INSERT` 한 줄, 라벨, 색상 같은 부가 속성도 붙일 수 있고 FK로 무결성 보장 |
| 사실상 불변인 소수 상태값 | `Gender: MALE\|FEMALE\|OTHER` | **DB enum 또는 `CHECK` 제약도 선택지** — 조인 없이 간단, 대신 나중에 값이 늘면 마이그레이션 부담 |

- DB 네이티브 ENUM은 값 추가 시 테이블 재구성, 이식성 저하 등 함정이 많아 기본값으로 남발하지 않는다. 자세한 트레이드오프와 안티패턴은 [[MySQL-Enum-Antipattern]] 참고.
- 어느 쪽이든 목표는 **DB 수준에서 유효하지 않은 값의 삽입을 방지**하는 것. 참조 테이블은 FK로, enum/CHECK는 제약으로 그 방어선을 만든다.
- 표시 메타데이터, 캐시와 애플리케이션 타입까지 포함한 선택은 [[Common-Code-Management|공통 코드 관리]]를 참고한다.

## 면접 포인트

Q. 스키마 설계 시 어떤 점을 고려하는가?
- 도메인 불변식, 조회와 변경 패턴, 데이터 생명주기, 동시성과 마이그레이션 경계를 먼저 확인한다.
- 무결성, 쓰기 비용, 읽기 비용과 운영 복구 가능성 사이의 선택을 DDL과 검증 절차로 남긴다.

Q. Soft Delete의 단점은?
- 모든 쿼리에 조건 추가 필요, 인덱스 설계 복잡
- 시간이 지나면 물리 삭제 정책이 필요 (저장 비용)

## 관련 문서
- [[Normalization|Normalization / Denormalization]]
- [[Index|Index design (B-Tree, covering index)]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
