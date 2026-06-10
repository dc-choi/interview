---
tags: [infrastructure, aws, dynamodb, nosql, serverless, database]
status: done
category: "Infrastructure - AWS"
aliases: ["DynamoDB", "Amazon DynamoDB", "DAX"]
---

# Amazon DynamoDB

AWS 완전관리형 **서버리스 NoSQL** 키-값/문서 데이터베이스. 프로비저닝 없이 ms 단위 응답, 무제한 확장. **DocumentDB·RDS와 달리 인스턴스 개념이 없다** — 테이블만 존재.

## 핵심 특징

- **서버리스**: 인스턴스 프로비저닝 불필요. 사용량 기반 과금
- **NoSQL**: 스키마를 사전에 모두 정의할 필요 없음. 키 기반 액세스에 최적
- **트랜잭션 지원**: ACID 트랜잭션 (TransactWriteItems, TransactGetItems)
- **IAM 통합** 보안. 빠른 스키마 전개에 적합
- **단일 자리수 ms 지연**, 무제한 처리량 (Provisioned + Auto Scaling 또는 On-Demand)

## 키 구조

- **Partition Key (PK)** 단독 또는 **PK + Sort Key (SK)** 복합
- 같은 PK = 같은 파티션 = 같이 정렬 저장 (SK 순)
- 쿼리는 PK 일치 + SK 조건이 기본. 비키 필드 검색은 **Scan** 또는 **GSI/LSI** 필요

## 테이블 클래스

| 클래스 | 용도 |
|--------|------|
| **Standard** | 자주 액세스되는 데이터 (기본) |
| **Standard-IA** (Infrequent Access) | 자주 액세스되지 않는 데이터. 스토리지 60% 저렴, 읽기/쓰기 25% 비쌈 |

## 용량 모드

| 모드 | 특징 |
|------|------|
| **Provisioned** | RCU/WCU 사전 예약. Auto Scaling 가능. 예측 가능한 트래픽 |
| **On-Demand** | 사용량 기반. 트래픽 변동 크고 예측 불가할 때. 5배 비쌈 |

## DAX (DynamoDB Accelerator)

- **DynamoDB 전용 인메모리 캐시**. 마이크로초 응답
- DynamoDB 앞단에 위치 — 앱 코드 변경 거의 없이 통합
- 개별 객체 캐시 + 쿼리/스캔 캐시 처리
- cf. **ElastiCache**는 일반적 인메모리 캐시 — **집계 결과 저장**에 적합

## DynamoDB Streams

- 테이블 수정사항을 실시간 스트림으로 노출
- 보관 24시간, 소비자 수 제한 없음
- Lambda 트리거로 후속 작업 가능 (이벤트 소싱, CQRS 패턴)

## Global Table

- 여러 리전 간 **다중 활성** 복제 (Multi-Active, Multi-Region)
- 글로벌 사용자 대상 저지연 + DR 동시에 충족

## 백업·복구

- **PITR (Point-In-Time Recovery)**: 35일 동안 임의 시점 복원
- **On-Demand 백업**: 삭제할 때까지 무기한 보존

## S3 통합

- **Export to S3** (PITR 필요): Dynamo → S3 → Athena 쿼리 가능
- **Import from S3** (CSV/JSON/ION): S3 객체를 새 테이블로 가져오기

## 시험 빈출 포인트

- "**서버리스·NoSQL·자동 확장**" 키워드 → DynamoDB
- "ms 단위 응답이 더 필요" → DAX
- "집계 결과 캐싱" → ElastiCache
- "여러 리전 active-active" → Global Table
- "테이블 변경 → Lambda 트리거" → DynamoDB Streams
- "S3 객체에서 Athena로 쿼리" → DynamoDB Export to S3

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
