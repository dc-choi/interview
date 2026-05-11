---
tags: [database]
status: index
category: "데이터&저장소(Data&Storage)"
aliases: ["데이터&저장소(Data&Storage)", "Data & Storage"]
---

# 데이터&저장소(Data&Storage)

## 목차

- [[tech/database/rdbms/RDBMS|RDBMS (OLTP)]] — 스키마·인덱스·트랜잭션·격리 수준·Lock·샤딩·복제·제품 비교
- [[tech/database/in-memory/캐시&KV(Redis)|Cache & KV Store (Redis)]] — 자료구조·TTL·캐시 전략·분산 Lock·Stampede
- [[tech/database/nosql/MongoDB-Schema-Design|NoSQL (Document) — MongoDB 스키마 설계]]
- [[tech/database/nosql/OpenSearch|검색 엔진 — OpenSearch · Elasticsearch]]
- [[tech/database/nosql/ClickHouse|OLAP — ClickHouse (컬럼 지향 분석 DB)]]
- [[tech/database/orm/ORM허브(ORMHub)|ORM · 도메인 모델링 (ORM)]] — 임피던스 불일치·Aggregate 경계·Domain Model

## 워크로드 분류
- [[OLTP-vs-OLAP|OLTP vs OLAP]] — 트랜잭션 처리 vs 분석 처리, 운영/분석 DB 분리 구조

## Data Modeling
- [[SCD-Type2|SCD Type 2 (이력 차원 관리)]] — Slowly Changing Dimension, KPI 분석용 시계열 보존

## 미작성 — Data Modeling
- [ ] [[ERD]]
- [ ] [[Data-Consistency-Rule|Data consistency rule]]
- [ ] [[Schema-Versioning|Schema versioning]]
- [ ] [[Backward-Compatibility|Backward compatibility]]

## 현장사례
- [[SSG-Ecommerce-Seminar#데이터베이스|SSG DB 선택]] — MySQL vs PostgreSQL (UPDATE vs INSERT)
- [[Kakao-Ent-Seminar#데이터베이스|카카오엔터 DB]] — RDB vs NoSQL 선택 기준
- [[Elegant-OOP-Design#객체참조의문제점|우아한 객체지향: 트랜잭션 경계]] — 객체 참조와 Lock 경합
