---
tags: [database]
status: index
category: "데이터&저장소(Data&Storage)"
aliases: ["데이터&저장소(Data&Storage)", "Data & Storage"]
---

# 데이터&저장소(Data&Storage)

## 목차

- [[tech/database/rdbms/RDBMS|RDBMS (OLTP)]] — 스키마, 인덱스, 트랜잭션, 격리 수준, Lock, 샤딩, 복제, 제품 비교
- [[tech/database/in-memory/캐시&KV(Redis)|Cache & KV Store (Redis)]] — 자료구조, TTL, 캐시 전략, 분산 Lock, Stampede
- [[tech/database/nosql/nosql|NoSQL (Document, 검색, OLAP)]] — MongoDB 스키마 설계, OpenSearch, ClickHouse
- [[tech/database/vector/vector|벡터 검색 (Vector)]] — 임베딩 유사도, HNSW, pgvector, OpenSearch k-NN, hybrid와 embedding pipeline
- [[tech/database/orm/ORM허브(ORMHub)|ORM, 도메인 모델링 (ORM)]] — 임피던스 불일치, Aggregate 경계, Domain Model

## 워크로드 분류
- [[OLTP-vs-OLAP|OLTP vs OLAP]] — 트랜잭션 처리 vs 분석 처리, 운영/분석 DB 분리 구조

## DB 운영, 자동화
- [[Database-Operations-Automation|DB 운영 자동화 (DBA 플랫폼 엔지니어링)]] — toil 감소 선순환, 설치/스키마/오토스케일링/K8s Operator 자동화, DBA 역할 진화
- [[DB-Provisioning-Pipeline|DB 프로비저닝 자동화 파이프라인]] — 이벤트 체인 + 보상 롤백, 클러스터별 전용 서브넷/SG, 파라미터 템플릿, AWS Backup, 로그 Export, 후처리
- [[MongoDB-Kubernetes-Operator|MongoDB Kubernetes Operator (PSMDB)]] — 선언적 관리, Reconcile Loop, K8s+AWS 컨트롤러 협력, 외부 접속(Split Horizon+SNI), EBS Volume Clone 빠른 프로비저닝

## DB 장애 진단
- [[DB-Incident-Triage|DB 장애 분석 방법론 (시점 비교, 장애 분류)]] — "평소와 달라진 것" 찾기, AAS 주의, 장애 3유형(신규/호출량/레이턴시), 실행계획+통계, MongoDB
- [[Self-Service-DB-Diagnostics|셀프서비스 DB 진단 플랫폼]] — 흩어진 모니터링 통합, 개발자 직접 분석, Slack 문의, AI/MCP 반자동 분석, 보안 설계

## Data Modeling
- [[SCD-Type2|SCD Type 2 (이력 차원 관리)]] — Slowly Changing Dimension, KPI 분석용 시계열 보존

## 미작성 — Data Modeling
- [ ] `ERD` (작성 예정)
- [ ] Data consistency rule (작성 예정: `Data-Consistency-Rule`)
- [ ] Schema versioning (작성 예정: `Schema-Versioning`)
- [ ] Backward compatibility (작성 예정: `Backward-Compatibility`)

## 현장사례
- [[SSG-Ecommerce-Seminar#데이터베이스|SSG DB 선택]] — MySQL vs PostgreSQL (UPDATE vs INSERT)
- [[Kakao-Ent-Seminar#데이터베이스|카카오엔터 DB]] — RDB vs NoSQL 선택 기준
- [[Elegant-OOP-Design#객체참조의문제점|우아한 객체지향: 트랜잭션 경계]] — 객체 참조와 Lock 경합
