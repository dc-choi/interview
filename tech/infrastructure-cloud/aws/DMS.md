---
tags: [infrastructure, aws, dms, migration, database, cdc, sct]
status: done
category: "Infrastructure - AWS"
aliases: ["DMS", "AWS DMS", "Database Migration Service", "데이터 마이그레이션 서비스"]
---

# AWS Database Migration Service (DMS)

**관계형 DB·데이터 웨어하우스·NoSQL·기타 데이터 저장소**를 AWS로(또는 AWS 내부 간) 마이그레이션. 운영 중인 소스를 **계속 가동한 채** 가동 중지 시간을 최소화해 이전한다.

## 동작 모델

| 구성요소 | 역할 |
|---------|------|
| **복제 인스턴스(Replication Instance)** | DMS 작업을 실행하는 EC2 — 소스에서 읽고 대상에 쓰는 워커 |
| **소스 엔드포인트(Source Endpoint)** | 원본 DB 연결 정보 (호스트·포트·자격증명) |
| **대상 엔드포인트(Target Endpoint)** | 마이그레이션 대상 DB 연결 정보 |
| **마이그레이션 작업(Task)** | "어떤 테이블을, 어떤 방식으로, 언제까지" 정의 — 매핑 규칙 포함 |

복제 인스턴스가 소스에서 데이터를 가져와 대상에 쏟아붓는 구조. 소스·대상 모두 AWS 외부도 가능 (온프레미스 ↔ RDS 등).

## 마이그레이션 유형 3가지

### 1. Full Load (전체 로드)

- 소스의 기존 데이터를 한 번에 대상으로 복사
- 운영 중 데이터 변경은 반영 안 됨 → **다운타임 필요**

### 2. CDC (Change Data Capture) — 핵심

- **진행 중인 변경 사항만** 캡처해 대상으로 복제
- 소스 DB의 트랜잭션 로그(MySQL binlog, PostgreSQL WAL, Oracle redo log 등)를 읽어 변경 전파
- **가동 중지 시간 최소화**의 핵심 메커니즘

### 3. Full Load + CDC (실전 기본)

- 초기 전체 로드 + 그 동안의 변경을 CDC로 따라잡기
- **컷오버 직전까지 양쪽이 거의 동기화** → 짧은 점검 시간만으로 전환 가능
- "운영 중단 없이 마이그레이션" 시나리오의 표준 패턴

## 이기종 마이그레이션 — DMS + SCT 조합

다른 엔진 간 마이그레이션 (예: **SQL Server → Aurora PostgreSQL**, Oracle → MySQL).

| 도구 | 역할 |
|------|------|
| **DMS** | **데이터** 전송 (행 단위) |
| **AWS Schema Conversion Tool (SCT)** | **스키마·저장 프로시저·뷰·트리거·코드** 변환 |

- SCT는 데스크톱 앱 — 소스 스키마를 분석해 대상 엔진 호환 DDL 생성
- 자동 변환 불가한 객체는 리포트로 표시 → 수동 수정
- **시험 패턴**: "Oracle → Aurora" 같이 엔진이 다른 케이스 → **SCT(스키마) + DMS(데이터)** 함께
- 같은 엔진 버전 업그레이드(예: MySQL 5.7 → 8.0)는 SCT 불필요

## 동종 마이그레이션 — DMS 단독

같은 엔진 계열 간 마이그레이션은 **SCT 없이 DMS만으로** 가능.

- MySQL on-prem → **RDS MySQL** / Aurora MySQL
- PostgreSQL on-prem → RDS PostgreSQL / Aurora PostgreSQL
- MongoDB → **DocumentDB** (DocumentDB가 MongoDB 호환 API)
- Oracle on-prem → **RDS for Oracle**

## DocumentDB 마이그레이션 — 3가지 접근

| 모드 | 다운타임 | 방식 |
|------|---------|------|
| **오프라인** | 큼 | 소스 정지 → `mongodump`/`mongorestore` 또는 DMS Full Load → 컷오버 |
| **온라인** | 최소 | DMS Full Load + CDC → 거의 동기화 후 짧은 컷오버 |
| **하이브리드** | 중간 | 큰 컬렉션은 오프라인 덤프, 작은/핫 컬렉션은 온라인 CDC |

## 지원 소스·대상 — 시험 빈출

- **소스**: Oracle, SQL Server, MySQL, PostgreSQL, MariaDB, MongoDB, SAP, Db2, **Azure SQL/RDS/S3/온프레미스 DB**
- **대상**: RDS 패밀리, Aurora, Redshift, DynamoDB, **S3**, OpenSearch, Kinesis Data Streams, **DocumentDB**, Apache Kafka

> S3·Kinesis·Kafka·OpenSearch가 **대상**이 될 수 있다는 점 주의 — DB→데이터 레이크/스트리밍 시나리오에 활용.

## S3로 마이그레이션 시

- 대상이 S3면 **CSV가 기본 형식** (Parquet도 선택 가능)
- 데이터 레이크(Athena·Redshift Spectrum·Glue) 적재 파이프라인의 일부로 활용

## 다중 AZ 복제 인스턴스

- 복제 인스턴스를 **Multi-AZ**로 배포하면 동기 스탠바이 보유 → 마이그레이션 중 HA 보장
- 장기 CDC(수일~수주) 운영 시 권장

## 시험 체크포인트

- **DMS = 데이터, SCT = 스키마/코드** — 가장 자주 나오는 분리 개념
- **다운타임 최소화** → Full Load + **CDC**
- **이기종 마이그레이션** (Oracle → Aurora, SQL Server → MySQL) → **SCT 필수**
- **동종 마이그레이션** (MySQL → RDS MySQL) → DMS만으로 충분, SCT 불필요
- **MongoDB → DocumentDB**: DMS 지원, 호환 API
- **온프레미스 → AWS** 마이그레이션 시 운영 지속 필요 → DMS CDC
- **DB → S3/Kinesis/Kafka** → DMS 대상으로 가능 (스트리밍/데이터 레이크 시나리오)
- **장시간 운영** 마이그레이션 → 복제 인스턴스 Multi-AZ

## 관련 문서

- [[RDS-Aurora]], [[DynamoDB]], [[S3]], [[Storage-Gateway-DataSync]], [[AWS-Lambda|Lambda]]
- [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 시나리오 (언제 DMS를 쓰나)]]
- [[RDS-Zero-Downtime-Migration|무중단 마이그레이션 (Full Load + CDC 컷오버)]]
- [[MySQL-to-PostgreSQL-Migration|MySQL → PostgreSQL 이기종 마이그레이션 (DMS + 스키마 변환)]]

## 출처

- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
