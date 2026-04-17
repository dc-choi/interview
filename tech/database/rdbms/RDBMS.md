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

## 인덱스 & 쿼리
- [x] [[Index|Index design (B-Tree, covering index)]]
- [x] [[B-Tree-Index-Depth|B-Tree 인덱스 깊이 분석 (InnoDB 페이지·PK 사이즈·1억 건도 깊이 4)]]
- [x] [[Execution-Plan|Execution plan 분석]]
- [x] [[Sorting-Operations|정렬이 발생하는 5가지 연산]]
- [x] [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발 (동적 쿼리 함정, MySQL+Node.js 사례)]]
- [x] [[SQL|SQL 기초]]

## 트랜잭션 & 격리 수준
- [x] [[Transactions|ACID]]
- [x] [[Isolation-Level|Isolation Level]]
- [x] [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계 · Strict Serializable (Snapshot Isolation, Linearizable, 분산 DB)]]
- [x] [[Lock|Lock (row / gap / next-key, Pessimistic vs Optimistic, 데드락 예방)]]
- [x] [[MySQL-Gap-Lock|MySQL Gap Lock (Next-Key Lock, INSERT Intention, 데드락 시나리오, 회피 전략)]]

## 확장 & 운영
- [x] [[Sharding|Sharding]]
- [x] [[Replication|Replication (sync / async)]]
- [x] [[Clustering|Clustering]]
- [x] [[MySQL-Backup|MySQL 백업·복원 (mysqldump·XtraBackup·binlog PITR, RTO/RPO)]]

## 제품 비교
- [x] [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (프로세스 모델·MVCC·Hash Join·Partial Index, Aurora 이관 사례)]]
- [x] [[JSON-vs-Text-Column|JSON vs TEXT 컬럼 (MySQL/PostgreSQL, 접근 패턴 기반 선택)]]
