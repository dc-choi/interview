---
tags: [database, rdbms]
status: index
category: "Database - RDBMS"
aliases: ["RDBMS", "OLTP"]
---

# RDBMS (OLTP)

스키마 설계, 인덱스, 트랜잭션, 격리 수준, Lock, 실행 계획, 샤딩/복제 — 관계형 DB의 면접 필수.

## 스키마 & 설계
- [x] [[Schema-Design|Schema design]]
- [x] [[Data-Modeling-Workflow|데이터 모델링 절차 (개념, 논리, 물리 모델과 검증)]]
- [x] [[Relational-Relationship-Modeling|관계형 관계 모델링 (1:1, 1:N, M:N, 식별/비식별 관계)]]
- [x] [[Data-Integrity-Constraints|데이터 무결성 제약 (NOT NULL, UNIQUE, CHECK, FK, cross-row invariant)]]
- [x] [[Normalization|Normalization / Denormalization]]
- [x] [[Data-Dictionary|데이터 딕셔너리 (Oracle vs MySQL)]]
- [x] [[Business-Logic-App-vs-DB|비즈니스 로직 위치 (App vs DB, Stored Procedure 기피, 확장성 비대칭)]]
- [x] [[Primary-Key-Strategy|PK 생성 전략 (AUTO_INCREMENT/UUID v4, v7/ULID/Snowflake, 클러스터링 인덱스 영향)]]
- [x] [[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴 (정규화 위반, 확장 불가, 이식성 부족 8가지 이유)]]
- [x] [[Flexible-Attribute-Modeling|가변 속성 모델링 (일반 컬럼, 보조 테이블, EAV, JSON hybrid)]]
- [x] [[Hierarchical-Data-Modeling|계층형 데이터 모델링 (adjacency list, recursive CTE, closure table)]]
- [x] [[Operational-Data-History-and-Audit|운영 데이터 이력과 감사 (snapshot, temporal history, audit log)]]
- [x] [[Soft-Delete-and-Data-Lifecycle|소프트 삭제와 데이터 생명주기]]
- [x] [[Aggregate-Summary-Table-Patterns|집계 요약 테이블 (grain, 증분 집계, 재처리와 정합성)]]
- [x] [[Relational-Inheritance-Mapping|관계형 상속 매핑 (concrete, single table, joined)]]
- [x] [[Recurring-Event-Modeling|반복 일정 모델링 (series, exception, occurrence 투영)]]
- [x] [[Foreign-Key-Integrity|외래 키와 참조 무결성 (보장 범위, referential action, 앱 관리 대안)]]
- [x] [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경 (INSTANT/INPLACE/COPY, pt-osc, gh-ost)]]
- [x] [[MySQL-Charset-Migration|utf8mb4 마이그레이션 안전 절차 (인덱스 키 길이 767/3072, collation 충돌, latin1 복구)]]

## MySQL 엔진
- [x] [[mysql|MySQL 폴더 인덱스 (엔진 내부, 튜닝, 백업, 파티셔닝, PostgreSQL 비교)]]
- [x] [[MySQL-Architecture|MySQL 아키텍처, SQL 처리 파이프라인 (2계층 구조, 파서/옵티마이저/실행기, 스토리지 엔진, 뷰)]]
- [x] [[DML-Conflict-and-Batch-Patterns|MySQL DML 충돌 처리와 배치 패턴 (IGNORE, UPSERT, REPLACE, 조건부 갱신)]]
- [x] [[MySQL-InnoDB-Tuning|InnoDB 튜닝 (Buffer Pool, flush_log_at_trx_commit, io_capacity, 압축)]]
- [x] [[MySQL-Partitioning|MySQL Partitioning (RANGE/HASH/LIST, Partition Pruning, DROP PARTITION)]]
- [x] [[MySQL-Slow-Query-Diagnosis|Slow Query 진단 (Slow Query Log, performance_schema, processlist, 락 대기)]]
- [x] [[MySQL-Digest-Statistics|Digest 통계 운영 (max_digest_length, performance_schema_digests_size, Prepared Statement, PG 비교)]]

## Oracle
- [x] [[oracle|Oracle Database 폴더 인덱스 (SQL 방언, sequence, 계층 query, PL/SQL, 11g 역사 자료)]]
- [x] [[Oracle-SQL-Dialect|Oracle SQL 방언 (DUAL, NVL/DECODE, ROLLUP, 외부 조인, DDL transaction)]]
- [x] [[Oracle-Sequences-and-Hierarchical-Queries|Oracle sequence와 계층형 query]]
- [x] [[PL-SQL-Fundamentals|PL/SQL 기본기 (block, record, collection, bind, 제어문)]]
- [x] [[PL-SQL-Cursors-Routines-and-Triggers|PL/SQL 커서, 예외, subprogram, package와 trigger]]
- [x] [[Oracle-Tablespaces|Oracle tablespace와 공간 관리]]
- [x] [[Oracle-Users-Privileges-and-Roles|Oracle user, privilege, role과 profile]]
- [x] [[Oracle-Index-Features|Oracle index 기능과 운영]]

## 인덱스 & 쿼리
- [x] [[Index|Index design (B-Tree, covering index)]]
- [x] [[B-Tree-Index-Depth|B-Tree 인덱스 깊이 분석 (InnoDB 페이지, PK 사이즈, 1억 건도 깊이 4)]]
- [x] [[Covering-Index|커버링 인덱스 (Using index, 랜덤 I/O 제거, ORDER BY 인덱스 매칭)]]
- [x] [[Pagination-Optimization|페이징 성능 최적화 (No Offset, Covering Index, COUNT 캐싱, 고정 페이지 수)]]
- [x] [[Execution-Plan|Execution plan, EXPLAIN/ANALYZE/EXPLAIN ANALYZE, 단일 테이블 필터 활용]]
- [x] [[SQL-Tuning-Terminology|SQL 튜닝 용어 (옵티마이저, 접근 방식, 조건, 서브쿼리, 콜레이션, 통계)]]
- [x] [[SQL-Joins|SQL 조인 (INNER/OUTER/CROSS/NATURAL, 드라이빙, 드리븐, NL/BNL/BKA/Hash 알고리즘)]]
- [x] [[SQL-Query-Composition|SQL 쿼리 조합 (JOIN, subquery, UNION, CASE, 결과 grain)]]
- [x] [[SQL-Window-Functions|SQL window function (partition, order, frame, ranking, top-N)]]
- [x] [[Database-Views-and-Programmability|View와 DB 저장 프로그램 (procedure, function, trigger)]]
- [x] [[Query-Antipatterns|SQL 쿼리 안티패턴 (행 증폭, DISTINCT 오용, LEFT JOIN 조건, 뷰 중첩)]]
- [x] [[Sorting-Operations|정렬이 발생하는 5가지 연산]]
- [x] [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발 (동적 쿼리 함정, MySQL+Node.js 사례)]]
- [x] [[Spatial-Index-MySQL|공간 데이터, 공간 색인 (GIS 함수, R-Tree, H3 격자 — 쿠팡 사례)]]
- [x] [[SQL|SQL 폴더 인덱스]]
- [x] [[SQL-Fundamentals|SQL 기본기 (SELECT, NULL, 집계, DDL/DML, transaction)]]
- [x] [[PostgreSQL-SQL-Patterns|PostgreSQL SQL 패턴 (RETURNING, UPSERT, CTE, 윈도 함수, timestamptz)]]

## 트랜잭션 & 격리 수준
- [x] [[transactions-locks|트랜잭션과 락 폴더 인덱스 (ACID, MVCC, 격리 수준, Lock)]]
- [x] [[Transactions|ACID, MVCC, Consistent Read vs Current Read]]
- [x] [[Isolation-Level|Isolation Level (Oracle→MySQL 이관 잔액 사례 포함)]]
- [x] [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계, Strict Serializable (Snapshot Isolation, Linearizable, 분산 DB)]]
- [x] [[Lock|Lock (row / gap / next-key, Pessimistic vs Optimistic, 데드락 예방)]]
- [x] [[MySQL-Gap-Lock|MySQL Gap Lock (Next-Key Lock, INSERT Intention, 데드락 시나리오, 회피 전략)]]
- [x] [[Race-Condition-Patterns|Race Condition 패턴 (3계층 해결, 도구 선택 플로차트, 카카오 사례)]]

## 확장 & 운영
- [x] [[scaling-operations|확장과 운영 폴더 인덱스 (샤딩, 복제, 클러스터링, Read Replica 라우팅)]]
- [x] [[PostgreSQL-Production-Operations|PostgreSQL 운영 (실행 계획, Online DDL, vacuum, partitioning, pgAudit 감사 로깅)]]
- [x] [[PostgreSQL-Extensions|PostgreSQL 확장 생태계 (PostGIS, 검색, pg_cron, Citus)]]
- [x] [[Sharding|Sharding]]
- [x] [[Replication|Replication (sync / async)]]
- [x] [[Clustering|Clustering]]
- [x] [[MySQL-Backup|MySQL 백업, 복원 (mysqldump, XtraBackup, binlog PITR, RTO/RPO)]]
- [x] [[Read-Replica-Routing|Read Replica 라우팅 (자동 분기, Read-After-Write, 트랜잭션, Prisma/TypeORM 구현)]]

## 제품 비교
- [x] [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (프로세스 모델, MVCC, Hash Join, Partial Index, Aurora 이관 사례)]]
- [x] [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL 이기종 마이그레이션 (타입 매핑, 함수 재작성, DMS, 시퀀스 보정)]]
- [x] [[JSON-vs-Text-Column|JSON vs TEXT 컬럼 (MySQL/PostgreSQL, 접근 패턴 기반 선택)]]
