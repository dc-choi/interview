---
tags: [database, rdbms]
status: index
category: "Database - RDBMS"
aliases: ["RDBMS", "OLTP"]
---

# RDBMS (OLTP)

스키마 설계·인덱스·트랜잭션·격리 수준·Lock·실행 계획·샤딩/복제 — 관계형 DB의 면접 필수.

## 스키마 & 설계
- [x] [[Schema-Design|Schema design]]
- [x] [[Normalization|Normalization / Denormalization]]
- [x] [[Data-Dictionary|데이터 딕셔너리 (Oracle vs MySQL)]]
- [x] [[Business-Logic-App-vs-DB|비즈니스 로직 위치 (App vs DB, Stored Procedure 기피, 확장성 비대칭)]]
- [x] [[Primary-Key-Strategy|PK 생성 전략 (AUTO_INCREMENT/UUID v4·v7/ULID/Snowflake, 클러스터링 인덱스 영향)]]
- [x] [[MySQL-Enum-Antipattern|MySQL ENUM 안티패턴 (정규화 위반·확장 불가·이식성 부족 8가지 이유)]]
- [x] [[Schema-Migration-Large-Table|대용량 테이블 스키마 변경 (INSTANT/INPLACE/COPY, pt-osc, gh-ost)]]

## MySQL 엔진
- [x] [[MySQL-Architecture|MySQL 아키텍처 · SQL 처리 파이프라인 (2계층 구조·파서/옵티마이저/실행기·스토리지 엔진·뷰)]]

## 인덱스 & 쿼리
- [x] [[Index|Index design (B-Tree, covering index)]]
- [x] [[B-Tree-Index-Depth|B-Tree 인덱스 깊이 분석 (InnoDB 페이지·PK 사이즈·1억 건도 깊이 4)]]
- [x] [[Covering-Index|커버링 인덱스 (Using index, 랜덤 I/O 제거, ORDER BY 인덱스 매칭)]]
- [x] [[Pagination-Optimization|페이징 성능 최적화 (No Offset·Covering Index·COUNT 캐싱·고정 페이지 수)]]
- [x] [[Execution-Plan|Execution plan · EXPLAIN/ANALYZE/EXPLAIN ANALYZE · 단일 테이블 필터 활용]]
- [x] [[SQL-Tuning-Terminology|SQL 튜닝 용어 (옵티마이저·접근 방식·조건·서브쿼리·콜레이션·통계)]]
- [x] [[SQL-Joins|SQL 조인 (INNER/OUTER/CROSS/NATURAL, 드라이빙·드리븐, NL/BNL/BKA/Hash 알고리즘)]]
- [x] [[Sorting-Operations|정렬이 발생하는 5가지 연산]]
- [x] [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발 (동적 쿼리 함정, MySQL+Node.js 사례)]]
- [x] [[Spatial-Index-MySQL|공간 데이터·공간 색인 (GIS 함수, R-Tree, H3 격자 — 쿠팡 사례)]]
- [x] [[SQL|SQL 기초]]

## 트랜잭션 & 격리 수준
- [x] [[Transactions|ACID · MVCC · Consistent Read vs Current Read]]
- [x] [[Isolation-Level|Isolation Level (Oracle→MySQL 이관 잔액 사례 포함)]]
- [x] [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계 · Strict Serializable (Snapshot Isolation, Linearizable, 분산 DB)]]
- [x] [[Lock|Lock (row / gap / next-key, Pessimistic vs Optimistic, 데드락 예방)]]
- [x] [[MySQL-Gap-Lock|MySQL Gap Lock (Next-Key Lock, INSERT Intention, 데드락 시나리오, 회피 전략)]]
- [x] [[Race-Condition-Patterns|Race Condition 패턴 (3계층 해결·도구 선택 플로차트·카카오 사례)]]

## 확장 & 운영
- [x] [[Sharding|Sharding]]
- [x] [[Replication|Replication (sync / async)]]
- [x] [[Clustering|Clustering]]
- [x] [[MySQL-Backup|MySQL 백업·복원 (mysqldump·XtraBackup·binlog PITR, RTO/RPO)]]
- [x] [[Read-Replica-Routing|Read Replica 라우팅 (자동 분기·Read-After-Write·트랜잭션·Prisma/TypeORM 구현)]]

## 제품 비교
- [x] [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (프로세스 모델·MVCC·Hash Join·Partial Index, Aurora 이관 사례)]]
- [x] [[JSON-vs-Text-Column|JSON vs TEXT 컬럼 (MySQL/PostgreSQL, 접근 패턴 기반 선택)]]
