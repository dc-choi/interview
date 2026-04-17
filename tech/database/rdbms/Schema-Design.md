---
tags: [database, schema]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["Schema Design", "스키마 설계"]
---

# Schema Design

데이터베이스 스키마를 설계할 때 고려해야 할 패턴과 원칙이다.

## 네이밍 컨벤션

**DB 컬럼:** `snake_case` — DB 표준에 따름 (예: `created_at`, `deleted_at`)
**애플리케이션:** `camelCase` — 언어 컨벤션에 따름 (예: `createdAt`, `deletedAt`)
**매핑:** ORM의 `@map` 기능으로 DB 컬럼명과 애플리케이션 필드명을 분리

이렇게 하면 DB 쿼리 시에는 SQL 표준, 코드에서는 언어 컨벤션을 각각 지킬 수 있다.

## Soft Delete 패턴

레코드를 물리적으로 삭제하지 않고 `deletedAt` 타임스탬프를 기록하는 방식이다.

**장점:**
- 실수로 삭제된 데이터를 복구할 수 있음
- 감사(audit) 추적이 가능
- 외래 키 참조 무결성을 유지하면서 논리적 삭제

**주의점:**
- 모든 조회 쿼리에 `WHERE deleted_at IS NULL` 조건 필요
- 인덱스에 `deletedAt`을 포함해야 성능 유지
- 시간이 지나면 논리 삭제된 데이터를 물리 삭제하는 정책 필요

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

조직 구조처럼 계층이 있는 데이터는 외래 키 체인으로 표현한다.

예: `Parish → Church → Organization → Group → Student`

각 레벨이 상위 레벨의 FK를 가지며, 권한 검증 시 "이 리소스가 현재 사용자의 Organization에 속하는가?"를 체크한다.

## 다대다(M:N) 관계

Junction Table(연결 테이블)로 구현한다.

예: Student ↔ Group → `StudentGroup` 테이블
- `studentId` (FK → Student)
- `groupId` (FK → Group)
- 복합 유니크 제약: `@@unique([studentId, groupId])`

## 인덱스 설계

**기본 원칙:**
- 외래 키 컬럼에 인덱스 (JOIN 성능)
- 자주 조회되는 조합에 복합 인덱스
- `deletedAt`을 포함하는 복합 인덱스 (Soft Delete 시 필수)

**예시:**
- `@@index([organizationId, deletedAt])` — 조직별 활성 데이터 조회
- `@@index([studentId, groupId])` — 학생-그룹 관계 조회
- `@@unique([accountId, familyId])` — 토큰 패밀리별 유일성

## Snapshot 패턴 (감사 추적)

중요한 데이터 변경 시 변경 전 상태를 별도 테이블에 기록한다.

- `AccountSnapshot`, `StudentSnapshot`, `GroupSnapshot` 등
- 원본 테이블과 동일한 구조 + 스냅샷 생성 시간
- 데이터 변경 이력을 추적하고, 문제 발생 시 특정 시점으로 복원 가능

## Enum 활용

상태값, 역할, 타입 등 제한된 선택지가 있는 컬럼에 Enum을 사용한다.

- `Role: ADMIN | TEACHER` — 사용자 역할
- `Gender: MALE | FEMALE` — 성별
- `GroupType: GRADE | CLASS` — 그룹 유형
- `JoinStatus: PENDING | APPROVED | REJECTED` — 가입 요청 상태

DB 수준에서 유효하지 않은 값의 삽입을 방지한다.

## 면접 포인트

Q. 스키마 설계 시 어떤 점을 고려하는가?
- Soft Delete + 인덱스, BigInt ID + 직렬화 처리, 계층 구조와 FK 설계
- Snapshot 패턴으로 변경 이력 추적, Enum으로 도메인 제약 표현

Q. Soft Delete의 단점은?
- 모든 쿼리에 조건 추가 필요, 인덱스 설계 복잡
- 시간이 지나면 물리 삭제 정책이 필요 (저장 비용)

## 관련 문서
- [[Normalization|Normalization / Denormalization]]
- [[Index|Index design (B-Tree, covering index)]]
- [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
