---
tags: [infrastructure, aws, dms, migration, database, cdc, sct]
status: done
category: "Infrastructure - AWS"
aliases: ["DMS", "AWS DMS", "Database Migration Service", "데이터 마이그레이션 서비스"]
verified_at: 2026-08-28
---

# AWS Database Migration Service (DMS)

**관계형 DB, 데이터 웨어하우스, NoSQL, 기타 데이터 저장소**를 AWS로(또는 AWS 내부 간) 마이그레이션. 운영 중인 소스를 **계속 가동한 채** 가동 중지 시간을 최소화해 이전한다.

## 동작 모델

| 구성요소 | 역할 |
|---------|------|
| **복제 인스턴스(Replication Instance)** | DMS Standard에서 쓰는 EC2 기반 작업 실행 환경. 소스에서 읽고 대상에 쓰는 하나 이상의 replication task를 호스팅 |
| **Serverless replication configuration** | endpoint, table mapping과 최소, 최대 DCU를 정의하면 DMS가 실행 capacity를 provision하고 조정. Standard보다 지원 endpoint와 기능 범위가 좁을 수 있음 |
| **소스 엔드포인트(Source Endpoint)** | 원본 DB 연결 정보 (호스트, 포트, 자격증명) |
| **대상 엔드포인트(Target Endpoint)** | 마이그레이션 대상 DB 연결 정보 |
| **마이그레이션 작업(Task)** | "어떤 테이블을, 어떤 방식으로, 언제까지" 정의 — 매핑 규칙 포함 |

복제 인스턴스가 소스에서 읽고 대상에 쓰는 구조다. 소스나 대상에 온프레미스 DB를 둘 수 있지만, 적어도 한쪽 endpoint는 AWS 서비스여야 한다. 온프레미스 DB끼리의 이전은 지원하지 않는다(2026-10-07 endpoint 생성 문서 확인).

## 엔드포인트 연결과 TLS 검증

다음은 DMS Standard의 복제 인스턴스와 endpoint 연결에 대한 설명이다. 2026-10-07 공식 endpoint 생성 문서, SSL 지원 표와 CLI 예제를 대조했다. 기존 서비스 설명 전체를 재검증한 날짜는 아니다.

1. 소스와 대상 endpoint를 각각 만들고 엔진, 서버, 포트와 DB 접근 방식을 정한다. Secrets Manager를 사용하면 secret과 이를 읽을 IAM 역할을 함께 지정한다. 지원 인증 방식과 DB 사용자 권한은 엔진별 조건을 확인한다.
2. 데이터를 옮길 복제 인스턴스를 지정해 **양쪽 연결을 각각 검사**한다. 로컬 PC에서 DB에 연결된다는 사실만으로 복제 인스턴스의 접근이 증명되지는 않는다.
3. CLI의 `test-connection` 응답이 `testing`이면 검사 중이다. `describe-connections`에서 해당 인스턴스와 endpoint 쌍의 최종 상태를 확인한다.

| SSL mode | 암호화와 검증 범위 |
|---|---|
| `none` | 아래 DB 연결 모드에서는 암호화하지 않음 |
| `require` | TLS 암호화, CA 검증 없음 |
| `verify-ca` | TLS 암호화와 서버 인증서 검증 |
| `verify-full` | TLS 암호화와 서버 인증서 검증, 인증서의 호스트명 일치 확인 |

네 모드를 모든 엔진이 지원하지는 않는다. 예를 들어 MySQL 계열은 `require`를 지원하지 않고, PostgreSQL은 네 모드를 지원한다. Kinesis나 DynamoDB 같은 일부 endpoint는 이 SSL mode 설정이 적용되지 않으며 `none` 표시만으로 평문 전송이라고 판단하지 않는다. 인증서나 mode를 바꾼 뒤에도 연결을 다시 검사한다.

연결 검사는 마이그레이션 완료 판정이 아니다. CDC용 로그 설정, 테이블 접근 권한, 데이터 불일치와 애플리케이션 호환성은 아래 검증 절차에서 별도로 확인한다.

### 연결 실패는 출발지와 왕복 경로로 좁힌다

2026-10-09 AWS 네트워크 보안과 NACL 문서를 대조한 DMS Standard 진단 절차다. 연결 오류를 보고 DB 비밀번호부터 바꾸기보다 복제 인스턴스에서 각 endpoint까지 실제로 허용된 경로를 확인한다.

1. **출발지 확인:** 복제 인스턴스의 서브넷, 보안 그룹과 IP를 확인한다. DB가 보는 출발지는 구성에 따라 private IP, public IP 또는 NAT 주소가 되므로 실제 경로와 DB 수신 규칙을 맞춘다.
2. **보안 그룹 확인:** 복제 인스턴스의 outbound가 endpoint의 DB 포트를 허용하고, DB의 inbound가 해당 출발지에서 오는 DB 포트 연결을 허용하는지 확인한다.
3. **NACL 확인:** 관련 서브넷의 NACL은 stateless이므로 요청과 응답 방향을 모두 확인한다. DB 포트로 나간 요청의 응답은 클라이언트가 고른 임시 포트로 돌아온다. DB 포트만 양방향으로 열었다고 왕복 통신이 증명되지는 않는다.
4. **규칙 순서 확인:** 작은 번호부터 평가되는 규칙에서 먼저 일치하는 거부가 있는지, 허용 CIDR이 실제 양쪽 서브넷과 맞는지 확인한다. 임시 포트 범위는 클라이언트와 경로에 맞추며 공개 예제의 전체 대역 허용을 그대로 복사하지 않는다.

변경 뒤에는 같은 복제 인스턴스와 endpoint 조합으로 연결을 다시 검사한다. 네트워크 경로와 별개로 TLS와 인증 설정을 확인하며, 연결 성공을 CDC나 데이터 정합성 검증으로 확대하지 않는다.

## 마이그레이션 유형 3가지

### 1. Full Load (전체 로드)

- 소스의 기존 데이터를 한 번에 대상으로 복사
- Full Load만으로는 로드 중 소스 변경을 계속 반영하지 않는다. 정합성을 맞추려면 소스를 멈춘 뒤 컷오버하거나 CDC 또는 별도 조정 절차를 함께 설계

DMS Standard는 replication instance와 task를 만들고, DMS Serverless는 replication configuration을 만든다. Serverless도 Full Load, Full Load + CDC와 CDC를 지원하지만 endpoint와 기능 제한을 먼저 확인한다.

### 2. CDC (Change Data Capture) — 핵심

- **진행 중인 변경 사항만** 캡처해 대상으로 복제
- 소스 DB의 트랜잭션 로그(MySQL binlog, PostgreSQL WAL, Oracle redo log 등)를 읽어 변경 전파
- **가동 중지 시간 최소화**의 핵심 메커니즘

### 3. Full Load + CDC (실전 기본)

- 초기 전체 로드 + 그 동안의 변경을 CDC로 따라잡기
- **컷오버 직전까지 양쪽이 거의 동기화** → 짧은 점검 시간만으로 전환 가능
- "운영 중단 없이 마이그레이션" 시나리오의 표준 패턴

## 이기종 마이그레이션 — 데이터와 스키마를 분리

다른 엔진 간 마이그레이션 (예: **SQL Server → Aurora PostgreSQL**, Oracle → MySQL).

| 도구 | 역할 |
|------|------|
| **DMS** | **데이터** 전송 (행 단위) |
| **DMS Schema Conversion 또는 수동 DDL** | 스키마, 저장 프로시저, 뷰, 트리거와 코드 객체의 변환 및 검토 |

- AWS DMS Schema Conversion은 소스 스키마와 코드 객체를 분석해 대상 호환 DDL을 생성할 수 있다. 자동 변환되지 않는 객체는 수동으로 검토, 수정한다.
- 이기종 이전은 데이터 전송 외에 스키마와 애플리케이션 호환성 작업이 필요하다. 변환 도구를 쓸지 수동 DDL과 검증으로 할지는 객체 범위와 지원 수준에 따라 선택한다.
- 같은 엔진 계열 이전도 대상 schema, 객체와 DDL 적용 방식을 명시한다.

### 생성형 AI 변환의 적용 범위

2026-10-07 공식 문서 기준으로 DMS Schema Conversion의 생성형 AI는 지정된 action item에 해당하는 SQL 요소의 변환을 보완한다. 그 밖의 요소에는 기본 규칙 기반 변환을 사용하므로, 기능을 켰다고 모든 미변환 객체가 해결되는 것은 아니다.

Oracle에서 RDS for PostgreSQL 또는 Aurora PostgreSQL로 옮기는 경로 등이 지원된다. 실제 소스와 대상 조합, 대상 SQL 요소와 리전 지원을 확인하고 변환 옵션을 활성화한다. 이 기능은 Cross-Region inference를 사용하므로 처리 리전 조건도 확인한다.

생성한 SQL을 대상에 적용하기 전에 검토하고, 남은 action item과 업무 회귀 테스트 결과를 함께 남긴다. AI 변환은 아래의 데이터 검증과 애플리케이션 검증을 대체하지 않는다. 이 절의 추가 검증일이며 기존 서비스 설명 전체를 재검증한 날짜는 아니다.

### 자동 변환율과 업무 동작 검증은 별개다

DMS Schema Conversion의 assessment report는 자동 변환 가능한 객체와 수동 조치가 필요한 객체를 나누고, action item별 문제와 권고 조치를 제공한다. 이 결과는 변환 작업의 범위를 파악하는 근거이며 애플리케이션의 업무 동작까지 검증한 성적표는 아니다(2026-10-07 공식 문서 확인).

| 검증 대상 | 확인할 증거 |
|---|---|
| 스키마와 코드 객체 | 변환 대상 목록, 남은 action item, 프로시저와 함수의 수정 결과 |
| 이동한 데이터 | 검증을 활성화한 테이블의 validation 상태, 불일치와 대기 및 검증 불가 항목 |
| 애플리케이션 | 동일 입력에 대한 반환값과 DB 변경, 타입 변환과 예외 처리, 주요 쿼리 성능 |

DMS data validation은 지원되는 소스와 대상의 대응 행을 비교한다. 추가 쿼리와 네트워크 부하가 발생하고, 검증 대상과 제한도 확인해야 한다. 행 비교 통과로 애플리케이션 SQL, 트랜잭션이나 외부 연계의 의미까지 보존됐다고 결론 내리지 않는다.

애플리케이션 검증은 별도 설계가 필요하다. 예를 들어 DB Link를 API로 바꾸면 기존 호출의 원자성, 타임아웃과 실패 후 재시도 경계를 다시 정의한다. AI가 만든 변환 코드도 같은 회귀 기준으로 검토하며, 특정 프로젝트의 자동 변환 비율이나 기간을 다른 시스템의 보장값으로 쓰지 않는다.

## 동종 마이그레이션 — 스키마 준비와 데이터 전송

같은 엔진 계열 간에는 변환 도구가 필요하지 않을 수 있지만, 대상 schema와 객체 준비는 여전히 필요하다. DMS의 target table preparation은 테이블, primary key와 일부 unique index만 만들 수 있으므로, 그 밖의 객체와 운영 DDL은 별도 확인한다.

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

## 지원 소스, 대상 — 시험 빈출

- **소스**: Oracle, SQL Server, MySQL, PostgreSQL, MariaDB, MongoDB, SAP, Db2, **Azure SQL/RDS/S3/온프레미스 DB**
- **대상**: RDS 패밀리, Aurora, Redshift, DynamoDB, **S3**, OpenSearch, Kinesis Data Streams, **DocumentDB**, Apache Kafka

> S3, Kinesis, Kafka, OpenSearch가 **대상**이 될 수 있다는 점 주의 — DB→데이터 레이크/스트리밍 시나리오에 활용.

## S3로 마이그레이션 시

- 대상이 S3면 **CSV가 기본 형식** (Parquet도 선택 가능)
- 데이터 레이크(Athena, Redshift Spectrum, Glue) 적재 파이프라인의 일부로 활용

## 다중 AZ 복제 인스턴스

- 복제 인스턴스를 **Multi-AZ**로 배포하면 동기 스탠바이 보유 → 마이그레이션 중 HA 보장
- 장기 CDC(수일~수주) 운영 시 권장

## 시험 체크포인트

- **DMS = 데이터, schema conversion 또는 수동 DDL = 스키마/코드** — 가장 자주 나오는 분리 개념
- **다운타임 최소화** → Full Load + **CDC**
- **이기종 마이그레이션** (Oracle → Aurora, SQL Server → MySQL) → schema conversion 또는 수동 DDL과 호환성 검증을 데이터 이동과 함께 계획
- **동종 마이그레이션** (MySQL → RDS MySQL) → 데이터 이동과 대상 schema 준비를 분리해 검증
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

- [AWS DMS, Security in AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Security.html)
- [AWS DMS, Network Access Control List (NACL) configuration for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Advanced.Ednpoints.NACL.html)
- [Amazon VPC, Custom network ACLs](https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html)
- [AWS DMS, Creating source and target endpoints](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Endpoints.Creating.html)
- [AWS DMS, Using SSL with AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Security.SSL.html)
- [AWS CLI, AWS DMS code examples](https://docs.aws.amazon.com/cli/latest/userguide/cli_database-migration-service_code_examples.html)
- [AWS DMS, Converting database objects with generative AI](https://docs.aws.amazon.com/dms/latest/userguide/schema-conversion-convert.databaseobjects.html)
- [AWS DMS, Conversion assessment reports with DMS Schema Conversion](https://docs.aws.amazon.com/dms/latest/userguide/assessment-reports.html)
- [AWS DMS, AWS DMS data validation](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Validating.html)
- [AWS DMS, Components](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Introduction.Components.html)
- [AWS DMS, High-level view](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Introduction.HighLevelView.html)
- [AWS DMS, Schema conversion](https://docs.aws.amazon.com/dms/latest/userguide/schema-conversion.html)
- [AWS DMS, Working with DMS Serverless](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Serverless.html)
- AWS SAA C03 Udemy 강의 오답노트 (Stephane Maarek, 로컬)
