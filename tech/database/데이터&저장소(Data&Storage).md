---
tags: [database]
status: index
category: "데이터&저장소(Data&Storage)"
aliases: ["데이터&저장소(Data&Storage)", "Data & Storage"]
---

# 데이터&저장소(Data&Storage)

Database란 사용자가 필요한 정보를 얻기 위해 논리적으로 연관된 데이터를 모아 구조적으로 통합해 놓은 것입니다.

DBMS는 Database Management System의 약자로 사용자와 데이터베이스를 연결해주는 소프트웨어입니다. 즉, DB를 관리하기 위한 시스템입니다.

## 현장사례
- [[SSG-Ecommerce-Seminar#데이터베이스|SSG DB 선택]] — MySQL vs PostgreSQL (UPDATE vs INSERT), DB별 장단점
- [[Kakao-Ent-Seminar#데이터베이스|카카오엔터 DB]] — RDB vs NoSQL 선택 기준
- [[Elegant-OOP-Design#객체참조의문제점|우아한 객체지향: 트랜잭션 경계]] — 객체 참조와 Lock 경합, 경계 안(참조) vs 밖(ID+Repository)
- [x] [[ORM-Impedance-Mismatch|ORM과 임피던스 불일치]]
- [x] [[Aggregate-Boundary|Aggregate 경계와 데이터 접근]]

## RDB (OLTP)
- [x] [[Schema-Design|Schema design]]
- [x] [[Normalization|Normalization / Denormalization]]
- [x] [[Index|Index design (B-Tree, covering index)]]
- [x] [[B-Tree-Index-Depth|B-Tree 인덱스 깊이 분석 (InnoDB 페이지·PK 사이즈·1억 건도 깊이 4)]]
- [x] [[Transactions|ACID]]
- [x] [[Isolation-Level|Isolation Level]]
- [x] [[Isolation-Level-Beyond-ANSI|ANSI 격리 수준의 한계 · Strict Serializable (Snapshot Isolation, Linearizable, 분산 DB)]]
- [x] [[MySQL-Gap-Lock|MySQL Gap Lock (Next-Key Lock, INSERT Intention, 데드락 시나리오, 회피 전략)]]
- [x] [[Lock|Lock (row / gap / next-key, Pessimistic vs Optimistic, 데드락 예방)]]
- [ ] [[Deadlock|Deadlock handling]]
- [x] [[Execution-Plan|Execution plan 분석]]
- [x] [[Sorting-Operations|정렬이 발생하는 5가지 연산]]
- [x] [[Prepared-Statement-Cache|Prepared Statement 캐시 폭발 (동적 쿼리 함정, MySQL+Node.js 사례)]]
- [x] [[Data-Dictionary|데이터 딕셔너리(Oracle vs MySQL)]]
- [ ] [[Partitioning]]
- [x] [[Sharding]]
- [x] [[Replication|Replication (sync / async)]]
- [ ] [[Read-Replica-Lag|Read replica lag 대응]]
- [ ] [[Zero-Downtime-Migration|Zero-downtime migration]]
- [x] [[SQL|SQL 기초]]
- [x] [[Clustering]]
- [x] [[MySQL-vs-PostgreSQL|MySQL vs PostgreSQL (프로세스 모델·MVCC·Hash Join·Partial Index, Aurora 이관 사례)]]
- [x] [[JSON-vs-Text-Column|JSON vs TEXT 컬럼 (MySQL/PostgreSQL, 접근 패턴 기반 선택)]]
- [x] [[MySQL-Backup|MySQL 백업·복원 (mysqldump·XtraBackup·binlog PITR, RTO/RPO)]]
- [x] [[Business-Logic-App-vs-DB|비즈니스 로직 위치 (App vs DB, Stored Procedure 기피, 확장성 비대칭)]]

## Cache & KV Store (Redis)
- [x] [[Redis-Data-Structures|Redis 자료구조]]
- [x] [[TTL|TTL 전략]]
- [x] [[Cache-Strategies|Cache Aside / Write Through / Write Behind]]
- [x] [[Cache-Invalidation|Cache invalidation (TTL, Write-Through, 이벤트 기반, Race Condition)]]
- [x] [[Hot-Key|Hot key 대응]]
- [x] [[Session-Store|Session store]]
- [x] [[Distributed-Lock|Distributed lock (Redlock, fencing token)]]
- [x] [[Cache-Stampede|Cache stampede 방지]]
- [x] [[Cache-Basics|Cache 기초]]
- [x] [[Persistence]]
- [x] [[Redis-Architecture|Redis Architecture]]
- [x] [[Redis-vs-Memcached|Redis vs Memcached]]
- [x] [[Use-Cases|Use Cases]]
- [x] [[Operations]]

## NoSQL (Document)
- [x] [[MongoDB-Schema-Design|MongoDB 스키마 설계 (Embed vs Reference, Cardinality, Bucket/Extended Reference 패턴)]]

## Data Modeling
- [ ] [[ERD]]
- [ ] [[Domain-Model|Domain model]]
- [ ] [[Data-Consistency-Rule|Data consistency rule]]
- [ ] [[Schema-Versioning|Schema versioning]]
- [ ] [[Backward-Compatibility|Backward compatibility]]

## RDBMS와 NoSQL의 차이

1. RDBMS(Relational Database Management System)
    - 데이터는 스키마에 정의된 2차원 테이블에 저장
    - 각 열은 하나의 속성에 대한 정보를 저장
    - 각 행은 각 열의 데이터 형식에 맞는 데이터가 저장
    - 데이터 관리를 위해 테이블 간의 관계를 구조화 하는 것이 중요 (관계를 나타내기 위해 외래키를 사용한다.)
    - 데이터의 일관성을 보장한다.
    - 테이블과 테이블간의 관계가 많아질 수 록 조인 연산이 많은 복잡한 쿼리가 만들어짐
    - Scale-out시 Nosql에 비해서 번거롭다. Scale-out을 할 경우 각각 다른 테이블의 데이터가 다른 영역에 저장될 수 있기 때문이다.
2. NoSQL
    - CAP 이론을 따른다. CAP의 총 3가지중 2가지만 충족해도 된다는 이론이다.
        1. 일관성(Consistency): 분산된 노드 중 어느 노드로 접근하더라도 데이터 값이 같아야 함.
        2. 가용성(Availability): 클러스터링 된 노드 중 하나 이상의 노드가 실패되더라도 정상적으로 요청을 처리할 수 있는 기능을 제공.
        3. 분산 허용(Partitioning Tolerance): 클러스터링 노드 간에 통신하는 네트워크의 장애가 발생하더라도 정상적으로 서비스를 수행한다. 노드 간 물리적으로 전혀 다른 네트워크 공간에 위치도 가능하다.
    - Document 방식: Document(XML, JSON, YAML)을 사용해서 레코드를 저장한다. 대표적으로 MongoDB가 있다. (Table == Collection, Row == Document, Column == Key, PK == ObjectId(_id))
    - JOIN의 경우 Embedded Documents나 $lookup 연산자로 대체 할 수 있다.
    - Embedded Documents의 경우 하나의 문서안에서 다른 문서를 내장시키는 기능
    - $lookup 연산자의 경우 여러 컬렉션 간의 매치 작업을 수행하고, 매칭된 결과를 결합하여 새로운 필드로 반환하는 기능
    - 분산처리와 병렬처리가 가능하여 빅데이터 처리에 효과적이다.
    - Auto Sharding을 지원한다.
