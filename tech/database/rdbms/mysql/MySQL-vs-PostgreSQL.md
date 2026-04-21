---
tags: [database, rdbms, mysql, postgresql, comparison]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["MySQL vs PostgreSQL", "MySQL PostgreSQL 비교", "Aurora MySQL vs Aurora PostgreSQL"]
---

# MySQL vs PostgreSQL

가장 많이 쓰이는 두 오픈소스 RDBMS. 둘 다 SQL 표준을 따르지만 **아키텍처 철학·기능 범위·쿼리 최적화 전략**이 달라 워크로드에 따라 유·불리가 갈린다. "대세"가 있는 문제가 아니라 **선택 기준**을 이해하는 문제.

## 한 줄 정의

- **MySQL** — 스토리지 엔진 교체형 **관계형 DB**. InnoDB(기본) + MyISAM + NDB 등. 가볍고 빠른 OLTP에 최적화
- **PostgreSQL** — 단일 엔진 기반 **객체-관계형 DB**. 타입 시스템·쿼리 옵티마이저·확장성(익스텐션)이 강점

## 아키텍처 차이

| 축 | MySQL | PostgreSQL |
|---|---|---|
| 프로세스 모델 | **멀티스레드**(스레드 풀) | **멀티프로세스**(커넥션당 프로세스) |
| 커넥션 비용 | 가벼움 | 무거움(프로세스 fork + 10MB 내외) → PgBouncer 권장 |
| 스토리지 엔진 | 교체 가능(InnoDB·MyISAM·MEMORY) | 단일 엔진 |
| MVCC | InnoDB가 **언두 로그** 기반 | **튜플 버전**을 테이블에 남김 → VACUUM 필요 |
| 복제 | 논리/물리 복제 모두 | 스트리밍 복제 + 논리 복제 |
| 확장성 | 내장 기능 중심 | **익스텐션**(PostGIS, TimescaleDB, pgvector) |

## 기능 스펙트럼

| 기능 | MySQL | PostgreSQL |
|---|---|---|
| ACID | **InnoDB만** 완전 준수 | 모든 구성에서 준수 |
| JOIN 알고리즘 | Nested Loop 중심(8.0부터 Hash Join) | Nested Loop / Hash / Merge 모두 성숙 |
| 인덱스 타입 | B-Tree, Hash(MEMORY), R-Tree, Full-text, JSON 가상 컬럼 | **B-Tree, Hash, GiST, SP-GiST, GIN, BRIN, BLOOM** |
| 데이터 타입 | 기본 타입 + JSON | + 배열, 범위, 사용자 정의, UUID, JSONB |
| 윈도우 함수 | 8.0+ | 예전부터 성숙 |
| CTE / 재귀 | 8.0+ | 예전부터 |
| Materialized View | ✗ (가상만) | ✓ |
| Partial Index | ✗ | **✓** — 조건부 인덱스로 크기 크게 절약 |
| INSTEAD OF Trigger | ✗ | ✓ |

## 쿼리 옵티마이저 차이

- **MySQL**: 옵티마이저가 상대적으로 단순. 간단한 OLTP 쿼리에서 예측 가능·빠름. 복잡한 JOIN·서브쿼리에서 튜닝 민감
- **PostgreSQL**: 비용 기반 옵티마이저가 정교. **Hash Join·Merge Join 자동 선택**, 큰 조인·집계에서 유리. 통계가 중요 → `ANALYZE` 주기 관리

실전 예: 1,000만 건 테이블 간 조인에서 PostgreSQL이 Hash Join으로 MySQL Nested Loop 대비 **수 배 빠른 케이스**가 드물지 않음. 반대로 PK 단일 조회처럼 가벼운 OLTP는 MySQL이 약간 빠를 수 있음.

## 동시성·MVCC

- **MySQL InnoDB** — 언두 로그에 이전 버전 보관. 읽기는 락 없음, Gap Lock·Next-Key Lock으로 팬텀 방지. 자세한 내용은 [[MySQL-Gap-Lock]]
- **PostgreSQL** — 같은 행을 수정하면 **새 튜플을 테이블에 추가**, 옛 튜플을 "dead tuple"로 남김. 주기적 `VACUUM`이 공간을 회수. 방치하면 테이블 비대화(bloat)
- 두 DB 모두 기본 격리 수준이 다름: MySQL InnoDB는 REPEATABLE READ, PostgreSQL은 READ COMMITTED

## Online DDL 성능 차이

운영 중 스키마 변경은 도구·DB별로 천차만별.

- **컬럼 추가** — PostgreSQL(11+)은 **메타데이터만 변경**으로 즉시 완료. MySQL 8.0도 `ALGORITHM=INSTANT` 지원하지만 조건부
- **인덱스 생성** — 둘 다 Online DDL 지원. 대용량 테이블에서 PostgreSQL의 `CREATE INDEX CONCURRENTLY`가 비교적 안전
- **Partial Index 활용** — PostgreSQL은 "활성 상태인 레코드만" 같은 조건부 인덱스로 **크기를 수십~수백배 줄일 수 있음** (예: 755MB → 57MB 보고 사례)

## JSON 지원

- **MySQL JSON** — 가상 컬럼 + 인덱스, `JSON_EXTRACT`/`->` 연산자
- **PostgreSQL JSONB** — 바이너리 저장으로 **조회·인덱싱 모두 빠름**, GIN 인덱스로 중첩 검색

문서형 데이터 사용 빈도가 높으면 PostgreSQL JSONB의 이점이 크다. 단, 본격 문서 스토어는 MongoDB 같은 전용 제품 고려.

## 선택 가이드

**MySQL 권장**
- 읽기 중심·단순 쿼리·Web OLTP
- 빠른 학습·운영 표준화가 우선
- 파트너·호스팅 생태계(Aurora·PlanetScale)가 풍부한 환경
- AWS Aurora MySQL 같은 관리형 서비스의 장점 활용

**PostgreSQL 권장**
- 복잡한 JOIN·집계·분석성 쿼리 비중 높음
- **대량 쓰기 + 복잡 쿼리** 혼합 OLTP
- JSONB·배열·지리 공간·벡터(pgvector) 같은 풍부한 타입 필요
- Partial Index·Materialized View가 이득을 주는 스키마
- 확장성(`CREATE EXTENSION`)으로 기능을 덧붙이고 싶음

**두 DB가 거의 동일한 상황**
- 단순 CRUD, 트래픽 낮음, 기존 팀의 숙련도가 결정적

## 이관(migration) 고려사항

- **호환 확인**: 함수명 차이(`NOW()` 등), `ON CONFLICT`(PG) vs `INSERT ... ON DUPLICATE KEY UPDATE`(MySQL), 대소문자 구분(PG는 기본 lower)
- **커넥션 모델**: PostgreSQL 전환 시 PgBouncer 등 커넥션 풀러 도입 거의 필수
- **운영 도구 변화**: `pg_dump`/`pg_restore`, `pg_stat_statements`, VACUUM 정책
- **드라이버·ORM**: Prisma·TypeORM·Hibernate 모두 지원하지만 기능 차이 존재
- **점진적 이관**: 논리 복제로 듀얼 라이트 후 리드 스위치 → 쓰기 스위치

## 흔한 오해

- "PostgreSQL이 항상 빠르다" — 단순 OLTP에서는 MySQL이 동등하거나 빠를 수 있음
- "MySQL은 엔터프라이즈용이 아니다" — Facebook·Uber 등 대규모 워크로드에 쓰임
- "JSON은 PostgreSQL만 가능" — MySQL도 지원, 다만 JSONB의 성숙도가 앞섬
- "PostgreSQL VACUUM은 자동이라 신경 안 써도 된다" — 대량 업데이트 테이블에선 bloat 관리 필수

## 면접 체크포인트

- 프로세스 모델과 커넥션 비용 차이가 운영에 미치는 영향
- MVCC 구현 차이(InnoDB 언두 vs PG 튜플 버전 + VACUUM)
- Hash Join·Partial Index·JSONB 같은 PostgreSQL 고유 기능
- Online DDL 차이(컬럼 추가·인덱스 생성)
- 이관 시 고려해야 할 호환성·도구 변화

## 출처
- [AWS — MySQL vs PostgreSQL 비교](https://aws.amazon.com/ko/compare/the-difference-between-mysql-vs-postgresql/)
- [minji.sql — PostgreSQL · MySQL 비교](https://medium.com/@minji.sql/postgresql-mysql-%EB%B9%84%EA%B5%90-4b32bedb187e)
- [우아한형제들 — Aurora MySQL에서 Aurora PostgreSQL로 이관](https://techblog.woowahan.com/6550/)

## 관련 문서
- [[Isolation-Level|Isolation Level]]
- [[MySQL-Gap-Lock|MySQL Gap Lock]]
- [[Index|Index 기본]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[Replication|Replication]]
- [[Execution-Plan|실행 계획 분석]]
