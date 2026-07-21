---
tags: [infrastructure, aws, dynamodb, nosql, serverless, database]
status: done
category: "Infrastructure - AWS"
aliases: ["DynamoDB", "Amazon DynamoDB", "DAX"]
verified_at: 2026-07-21
---

# Amazon DynamoDB

AWS 완전관리형 **서버리스 NoSQL** 키-값/문서 데이터베이스. 인스턴스를 직접 프로비저닝하지 않고 테이블의 용량 모드를 선택하며, 일반적인 키 기반 요청에 한 자릿수 ms 지연시간을 목표로 한다. 테이블 크기에는 실질적인 상한을 두지 않지만 항목 크기, 처리량, 계정 및 테이블별 서비스 할당량은 적용된다.

## 핵심 특징

- **서버리스**: 인스턴스 프로비저닝 불필요. On-Demand는 요청량 기반, Provisioned는 설정한 RCU/WCU 기반으로 과금
- **NoSQL**: 스키마를 사전에 모두 정의할 필요 없음. 키 기반 액세스에 최적
- **트랜잭션 지원**: ACID 트랜잭션 (TransactWriteItems, TransactGetItems)
- **IAM 통합** 보안. 빠른 스키마 전개에 적합
- **한 자릿수 ms 지연시간**을 목표로 설계. 처리량은 Provisioned 또는 On-Demand 모드로 확장하지만 서비스 할당량과 파티션별 처리 특성에 따라 스로틀링될 수 있음

## 키 구조

- **Partition Key (PK)** 단독 또는 **PK + Sort Key (SK)** 복합
- 같은 PK = 같은 파티션 = 같이 정렬 저장 (SK 순)
- 쿼리는 PK 일치 + SK 조건이 기본. 비키 필드 검색은 **Scan** 또는 **GSI/LSI** 필요

## 테이블 클래스

| 클래스 | 용도 |
|--------|------|
| **Standard** | 자주 액세스되는 데이터 (기본) |
| **Standard-IA** (Infrequent Access) | 자주 액세스되지 않는 데이터. 스토리지 단가는 낮고 읽기/쓰기 단가는 높으므로 리전별 최신 요금으로 비교 |

## 용량 모드

| 모드 | 특징 |
|------|------|
| **Provisioned** | RCU/WCU 사전 예약. Auto Scaling 가능. 예측 가능한 트래픽 |
| **On-Demand** | 요청량 기반 과금. 트래픽이 변동하거나 예측하기 어려울 때 유리할 수 있으며 Provisioned 대비 비용은 리전과 사용 패턴에 따라 달라짐 |

On-Demand 테이블의 기본 테이블별 할당량은 초당 읽기 40,000 request units와 쓰기 40,000 request units이며 조정 요청이 가능하다. On-Demand에는 provisioned mode와 같은 계정 수준 read/write throughput quota가 적용되지 않는다. 다만 사용자가 정한 최대 처리량, 테이블별 할당량, 이전 피크 대비 급격한 증가와 파티션 키 분포에 따라 요청이 스로틀링될 수 있으므로 자동 확장을 무제한 처리량으로 해석하면 안 된다.

## DAX (DynamoDB Accelerator)

- **DynamoDB 호환 인메모리 캐시**. eventually consistent read의 cache hit에서 마이크로초 단위 응답을 목표로 하며 strongly consistent read는 DynamoDB로 통과시킴
- 애플리케이션에 AWS 제공 DAX client를 사용하고 DAX cluster endpoint를 지정해야 한다. DynamoDB API와 호환돼 기능 변경은 작을 수 있지만 연결, consistency, cluster 용량과 장애 동작을 검증해야 함
- 개별 객체 캐시 + 쿼리/스캔 캐시 처리
- cf. **ElastiCache**는 일반적 인메모리 캐시 — **집계 결과 저장**에 적합

## DynamoDB Streams

- 테이블 수정사항을 실시간 스트림으로 노출
- 보관 24시간. 소비자는 무제한이 아니며 shard당 동시 읽기 제한이 있다. Lambda, Kinesis Client Library, EventBridge Pipes 등 소비 방식별 한도를 함께 봐야 한다.
- Lambda 트리거로 후속 작업 가능 (이벤트 소싱, CQRS 패턴)

## Global Table

- 여러 리전 간 **다중 활성** 복제 (Multi-Active, Multi-Region)
- 각 리전에서 로컬 replica를 읽고 쓰는 다중 리전 구성을 지원한다. 실제 저지연과 DR은 consistency mode, 애플리케이션 라우팅과 failover, 충돌 처리, RTO/RPO 시험까지 갖춰야 달성됨

## 백업, 복구

- **PITR (Point-In-Time Recovery)**: 기본 35일, 1-35일로 설정 가능한 연속 백업에서 초 단위 복원 지점 선택
- **On-Demand 백업**: 삭제할 때까지 무기한 보존

## S3 통합

- **Export to S3** (PITR 필요): Dynamo → S3 → Athena 쿼리 가능
- **Import from S3** (CSV/JSON/ION): S3 객체를 새 테이블로 가져오기

## 시험 빈출 포인트

- "**서버리스, NoSQL, 자동 확장**" 키워드 → DynamoDB
- "반복되는 eventually consistent read에서 마이크로초 단위 cache 응답 필요" → DAX 검토
- "집계 결과 캐싱" → ElastiCache
- "여러 리전 active-active" → Global Table
- "테이블 변경 → Lambda 트리거" → DynamoDB Streams
- "S3 객체에서 Athena로 쿼리" → DynamoDB Export to S3

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS DynamoDB 서비스 할당량](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html)
- [AWS DynamoDB On-Demand 용량 모드와 최대 처리량](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode-max-throughput.html)
- [AWS DynamoDB Accelerator 개요](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html)
- [AWS DynamoDB PITR](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html)
