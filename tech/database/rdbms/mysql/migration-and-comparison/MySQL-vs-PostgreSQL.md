---
tags: [database, rdbms, mysql, postgresql, comparison]
status: done
verified_at: 2026-09-29
category: "Database - RDBMS"
aliases: ["MySQL vs PostgreSQL", "MySQL PostgreSQL 비교", "Aurora MySQL vs Aurora PostgreSQL"]
---

# MySQL vs PostgreSQL

가장 많이 쓰이는 두 오픈소스 RDBMS. 둘 다 SQL 표준을 따르지만 **아키텍처 철학, 기능 범위, 쿼리 최적화 전략**이 달라 워크로드에 따라 유, 불리가 갈린다. "대세"가 있는 문제가 아니라 **선택 기준**을 이해하는 문제.

## 한 줄 정의

- **MySQL** — 스토리지 엔진 교체형 **관계형 DB**. InnoDB(기본) + MyISAM + NDB 등. 가볍고 빠른 OLTP에 최적화
- **PostgreSQL** — 단일 엔진 기반 **객체-관계형 DB**. 타입 시스템, 쿼리 옵티마이저, 확장성(익스텐션)이 강점

## 아키텍처 차이

| 축 | MySQL | PostgreSQL |
|---|---|---|
| 프로세스 모델 | **멀티스레드**(커넥션당 스레드) | **멀티프로세스**(커넥션당 프로세스) |
| 커넥션 비용 | 가벼움 | 무거움(프로세스 fork + 10MB 내외) → PgBouncer 권장 |
| 스토리지 엔진 | 교체 가능(InnoDB, MyISAM, MEMORY) | 단일 엔진 |
| MVCC | InnoDB가 **언두 로그** 기반 | **튜플 버전**을 테이블에 남김 → VACUUM 필요 |
| 복제 | 바이너리 로그 기반(row/statement/mixed), 그룹 복제 | 물리 스트리밍 복제 + 논리 복제 |
| 확장성 | 내장 기능 중심 | **익스텐션**(PostGIS, TimescaleDB, pgvector) |

MySQL의 커넥션당 스레드 모델은 기본값이다. 진짜 **스레드 풀**은 MySQL Enterprise Edition 플러그인 전용이고, 커뮤니티 에디션에서 스레드 풀이 필요하면 Percona Server나 MariaDB의 오픈소스 구현을 쓴다.

## 기능 스펙트럼

| 기능 | MySQL | PostgreSQL |
|---|---|---|
| ACID, 내구성 범위 | InnoDB가 일반적인 OLTP 엔진이며 NDB도 ACID 트랜잭션 지원 | 일반 logged table은 WAL 기반, unlogged table은 crash-safe 아님 |
| JOIN 알고리즘 | Nested Loop 중심(8.0부터 Hash Join) | Nested Loop / Hash / Merge 모두 성숙 |
| 인덱스 타입 | B-Tree, Hash(MEMORY), R-Tree, Full-text, JSON 가상 컬럼 | **B-Tree, Hash, GiST, SP-GiST, GIN, BRIN** (BLOOM은 contrib `bloom` 확장 설치 시) |
| 데이터 타입 | 기본 타입 + JSON | + 배열, 범위, 사용자 정의, UUID, JSONB |
| 윈도우 함수 | 8.0+ | 예전부터 성숙 |
| CTE / 재귀 | 8.0+ | 예전부터 |
| Materialized View | ✗ (가상만) | ✓ |
| Partial Index | ✗ | **✓** — 조건부 인덱스로 크기 크게 절약 |
| INSTEAD OF Trigger | ✗ | ✓ |

ACID 보장은 제품 이름만으로 나누지 않는다. MySQL은 스토리지 엔진을, PostgreSQL은 table 유형과 내구성 설정을 확인한다. 예를 들어 PostgreSQL unlogged table은 crash 뒤 비워지고, `synchronous_commit = off`에서는 최근에 완료를 알린 트랜잭션이 유실될 수 있다.

## 쿼리 옵티마이저 차이

- **MySQL**: 옵티마이저가 상대적으로 단순. 간단한 OLTP 쿼리에서 예측 가능, 빠름. 복잡한 JOIN, 서브쿼리에서 튜닝 민감
- **PostgreSQL**: 비용 기반 옵티마이저가 정교. **Hash Join, Merge Join 자동 선택**, 큰 조인, 집계에서 유리. 통계가 중요 → `ANALYZE` 주기 관리

실전 예: 1,000만 건 테이블 간 조인에서 PostgreSQL이 Hash Join으로 MySQL Nested Loop 대비 **수 배 빠른 케이스**가 드물지 않음. 반대로 PK 단일 조회처럼 가벼운 OLTP는 MySQL이 약간 빠를 수 있음.

## 동시성, MVCC

- **MySQL InnoDB** — 언두 로그에 이전 버전 보관. 읽기는 락 없음, Gap Lock, Next-Key Lock으로 팬텀 방지. 자세한 내용은 [[MySQL-Gap-Lock]]
- **PostgreSQL** — 같은 행을 수정하면 **새 튜플을 테이블에 추가**, 옛 튜플을 "dead tuple"로 남김. 주기적 `VACUUM`이 공간을 회수. 방치하면 테이블 비대화(bloat)
- 두 DB는 기본 격리 수준이 다르다. MySQL InnoDB는 REPEATABLE READ라 같은 트랜잭션의 일반 SELECT가 첫 읽기 시점 snapshot을 재사용하고, locking read와 쓰기는 고유 조건이 아닌 탐색에서 next-key lock으로 범위를 잠근다. PostgreSQL은 READ COMMITTED라 statement마다 새 snapshot을 얻는다. 같은 트랜잭션 코드가 두 DB에서 다른 결과와 다른 대기, 데드락 양상을 보일 수 있으므로 기본값에 기대지 말고 필요한 격리 수준을 명시한다([[Isolation-Level|Isolation Level]])
- 구현은 달라도 공통의 적은 오래 열린 트랜잭션이다. InnoDB에서는 오래된 read view가 purge를 붙잡아 History List Length가 늘고 undo를 따라가는 읽기가 느려진다([[MySQL-Undo-Purge-HLL|Undo Purge와 HLL]]). PostgreSQL에서는 VACUUM이 dead tuple을 회수하지 못해 bloat가 쌓이고, 방치하면 XID wraparound 방지 작업이 가용성 문제로 번진다. 비교 축은 [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]에 정리한다

## 긴 쿼리와 트랜잭션 안전장치

| 장치 | MySQL 8.4 | PostgreSQL |
|---|---|---|
| 문장 실행 시간 | `max_execution_time`(ms, 기본 0). 읽기 전용 `SELECT`에만 적용되고 stored program 안의 `SELECT`에는 무시된다. 쿼리 단위는 `MAX_EXECUTION_TIME(N)` 힌트 | `statement_timeout`(ms, 기본 0). 서버에 도착한 모든 문장에 적용 |
| 락 대기 | `innodb_lock_wait_timeout`(초, 기본 50). row lock 대기만 제한 | `lock_timeout` |
| 트랜잭션 전체 | 대응하는 제한 변수를 두지 않는다. `wait_timeout`은 활동 없는 연결을 닫는 설정이라 트랜잭션 단위 제한이 아니다 | `idle_in_transaction_session_timeout`, 17부터 `transaction_timeout` |

MySQL에서 오래 걸리는 `UPDATE`, `DELETE`나 방치된 `BEGIN`은 `max_execution_time`으로 끊기지 않는다. 드라이버와 풀의 query timeout, 장기 트랜잭션 탐지 쿼리와 kill 절차를 따로 둔다. PostgreSQL 문서도 `statement_timeout`을 `postgresql.conf`에 전역으로 두는 것을 권하지 않는다. 배치와 마이그레이션까지 끊기므로 role이나 세션 단위로 나눠 설정한다.

## 복제와 CDC 생태계

- MySQL은 binlog가 복제와 CDC의 공통 원천이다. 8.4 기본값은 ROW 포맷이고, binlog를 읽는 Debezium, Maxwell, Canal 같은 도구와 운영 경험이 오래 쌓였다
- PostgreSQL은 WAL 하나로 물리 스트리밍 복제와 logical decoding 기반 논리 복제, CDC를 모두 처리한다. 논리 복제는 publication 단위로 테이블을 골라 보낼 수 있다
- 두 엔진 모두 로그 보존과 소비 위치 관리가 운영 책임이다. MySQL은 binlog 보존 기간, PostgreSQL은 replication slot이 붙잡는 WAL을 관리한다([[Transaction-Logs-Replication-CDC|트랜잭션 로그와 복제, PITR, CDC]])

## Online DDL 성능 차이

운영 중 스키마 변경은 도구, DB별로 천차만별.

- **컬럼 추가** — PostgreSQL(11+)은 **메타데이터만 변경**으로 즉시 완료. MySQL 8.0도 `ALGORITHM=INSTANT` 지원하지만 조건부
- **인덱스 생성** — 둘 다 Online DDL 지원. 대용량 테이블에서 PostgreSQL의 `CREATE INDEX CONCURRENTLY`가 비교적 안전
- **Partial Index 활용** — PostgreSQL은 "활성 상태인 레코드만" 같은 조건부 인덱스로 **크기를 수십~수백배 줄일 수 있음** (예: 755MB → 57MB 보고 사례)

## JSON 지원

- **MySQL JSON** — 바이너리 저장(내부적으로 JSON은 이미 바이너리 포맷), 가상 컬럼 + 인덱스, `JSON_EXTRACT`/`->` 연산자
- **PostgreSQL JSONB** — 바이너리 저장 + GIN 인덱스로 중첩 키 검색이 강점. 반면 `jsonb`는 키 순서와 중복을 보존하지 않고, 저장 시 파싱, 정규화 비용이 있어 텍스트 `json`보다 쓰기가 느릴 수 있음

문서형 데이터에서 중첩 키 조건 검색 비중이 높으면 PostgreSQL JSONB의 GIN 인덱스 이점이 크다. 단순 저장, 통째 조회 위주면 두 DB 차이가 작다. 단, 본격 문서 스토어는 MongoDB 같은 전용 제품 고려.

## 선택 가이드

**MySQL 권장**
- 읽기 중심, 단순 쿼리, Web OLTP
- 빠른 학습, 운영 표준화가 우선
- 파트너, 호스팅 생태계(Aurora, PlanetScale)가 풍부한 환경
- AWS Aurora MySQL 같은 관리형 서비스의 장점 활용

**PostgreSQL 권장**
- 복잡한 JOIN, 집계, 분석성 쿼리 비중 높음
- **대량 쓰기 + 복잡 쿼리** 혼합 OLTP
- JSONB, 배열, 지리 공간, 벡터(pgvector) 같은 풍부한 타입 필요
- Partial Index, Materialized View가 이득을 주는 스키마
- 확장성(`CREATE EXTENSION`)으로 기능을 덧붙이고 싶음

**두 DB가 거의 동일한 상황**
- 단순 CRUD, 트래픽 낮음, 기존 팀의 숙련도가 결정적

### 선택 기준: 기능보다 운영할 사람

기능 비교는 대부분 한쪽으로도 우회할 수 있지만, 장애 때 원인을 찾고 튜닝할 사람은 우회하기 어렵다. 다음 순서로 판단한다.

1. 팀에 운영 경험이 있는 엔진이 있으면 그 엔진을 기본값으로 둔다. 반대 엔진이 필요한 이유가 기능 목록이 아니라 측정된 요구인지 확인한다.
2. 그 엔진을 운영할 사람을 채용하고 도움받을 수 있는지 본다. 국내에서 MySQL 경험자가 많은 배경은 기술 우위보다 LAMP 스택, 포털과 커머스의 초기 선택, Aurora MySQL 확산 같은 역사라는 관점이 있다(DBA 실무자 의견이며 통계로 확인한 사실은 아님).
3. 경험자가 없고 요구가 단순하면 채용 풀과 참고 자료가 많은 MySQL이 무난하다는 실무 의견이 있다. 복잡한 도메인 모델, JSON과 배열 같은 타입, 트랜잭션 DB 위의 가벼운 분석 비중이 크면 PostgreSQL 쪽으로 기운다.
4. 규모가 커지면 한 엔진으로 모든 접근 패턴을 풀기보다 용도별 저장소를 나누는 경우가 많다. 이때 늘어나는 동기화와 운영 비용은 [[Polyglot-Persistence|Polyglot Persistence]]에서 따진다.

## 이관(migration) 고려사항

- **호환 확인**: 함수명 차이(`IFNULL` → `COALESCE`, `GROUP_CONCAT` → `string_agg`, `DATE_FORMAT` → `to_char`), 같은 이름이지만 동작이 다른 `NOW()`(PostgreSQL은 트랜잭션 시작 시각, MySQL은 문장 시작 시각), `ON CONFLICT`(PG) vs `INSERT ... ON DUPLICATE KEY UPDATE`(MySQL), 대소문자 구분(PG는 기본 lower)
- **커넥션 모델**: PostgreSQL 전환 시 PgBouncer 등 커넥션 풀러 도입 거의 필수
- **운영 도구 변화**: `pg_dump`/`pg_restore`, `pg_stat_statements`, VACUUM 정책
- **드라이버, ORM**: Prisma, TypeORM, Hibernate 모두 지원하지만 기능 차이 존재
- **점진적 이관**: 논리 복제로 듀얼 라이트 후 리드 스위치 → 쓰기 스위치

## 흔한 오해

- "PostgreSQL이 항상 빠르다" — 단순 OLTP에서는 MySQL이 동등하거나 빠를 수 있음
- "MySQL은 엔터프라이즈용이 아니다" — Facebook, Uber 등 대규모 워크로드에 쓰임
- "JSON은 PostgreSQL만 가능" — MySQL도 바이너리 JSON을 지원. 다만 중첩 키 인덱싱은 PostgreSQL JSONB + GIN이 앞섬
- "PostgreSQL VACUUM은 자동이라 신경 안 써도 된다" — 대량 업데이트 테이블에선 bloat 관리 필수

## 면접 체크포인트

- 프로세스 모델과 커넥션 비용 차이가 운영에 미치는 영향
- MVCC 구현 차이(InnoDB 언두 vs PG 튜플 버전 + VACUUM)
- Hash Join, Partial Index, JSONB 같은 PostgreSQL 고유 기능
- Online DDL 차이(컬럼 추가, 인덱스 생성)
- 이관 시 고려해야 할 호환성, 도구 변화
- 기본 격리 수준 차이가 같은 코드의 결과를 어떻게 바꾸는가
- MySQL `max_execution_time`이 쓰기와 장기 트랜잭션을 막지 못하는 이유와 보완책

## 출처
- [MySQL 8.4 Reference Manual, MySQL Enterprise Thread Pool](https://dev.mysql.com/doc/refman/8.4/en/thread-pool.html)
- [MySQL 8.4 Reference Manual, MySQL Replication Formats](https://dev.mysql.com/doc/refman/8.4/en/replication-formats.html)
- [MySQL 8.4 Reference Manual, Server System Variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html#sysvar_max_execution_time)
- [MySQL 8.4 Reference Manual, Transaction Isolation Levels](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)
- [MySQL 8.4 Reference Manual, InnoDB Startup Options and System Variables](https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_lock_wait_timeout)
- [MySQL 8.4 Reference Manual, Binary Logging Options and Variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-binary-log.html#sysvar_binlog_format)
- [MySQL NDB Cluster API, NDB transactions](https://dev.mysql.com/doc/ndbapi/en/overview-ndb-api.html)
- [PostgreSQL 공식 문서, JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL 공식 문서, bloom extension](https://www.postgresql.org/docs/current/bloom.html)
- [PostgreSQL Documentation, Date and Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL 공식 문서, CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL 공식 문서, WAL 설정](https://www.postgresql.org/docs/current/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT)
- [PostgreSQL 공식 문서, Client Connection Defaults](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [PostgreSQL 17 Release Notes](https://www.postgresql.org/docs/release/17.0/)
- [AWS — MySQL vs PostgreSQL 비교](https://aws.amazon.com/ko/compare/the-difference-between-mysql-vs-postgresql/)
- [minji.sql — PostgreSQL, MySQL 비교](https://medium.com/@minji.sql/postgresql-mysql-%EB%B9%84%EA%B5%90-4b32bedb187e)
- [우아한형제들 — Aurora MySQL에서 Aurora PostgreSQL로 이관](https://techblog.woowahan.com/6550/)
- [DBA의 MySQL vs PostgreSQL 비교 — Threads, bear_dba](https://www.threads.com/@bear_dba/post/DbSHO6jGH_c)

## 관련 문서
- [[Isolation-Level|Isolation Level]]
- [[MySQL-Gap-Lock|MySQL Gap Lock]]
- [[Index|Index 기본]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[Replication|Replication]]
- [[Execution-Plan|실행 계획 분석]]
- [[MVCC-Implementation-Tradeoffs|MVCC 구현 트레이드오프]]
- [[Transaction-Logs-Replication-CDC|트랜잭션 로그와 복제, PITR, CDC]]
- [[Polyglot-Persistence|Polyglot Persistence]]
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL 이기종 마이그레이션 (타입 매핑, 함수 재작성, DMS)]]
