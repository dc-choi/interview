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
| **마이그레이션 작업(Task)** | 대상 테이블, 이전 방식과 범위 정의 — 매핑 규칙 포함 |

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

### Endpoint settings 변경의 우선순위와 교체 범위

부분 검증(2026-10-14): endpoint 생성 가이드와 `ModifyEndpoint` API를 대조했다. Endpoint settings는 연결별 추가 설정이며 지원 키와 값은 소스 또는 대상 엔진에 따라 확인한다. 같은 속성을 Endpoint settings와 Extra connection attributes(ECA)에 함께 지정하면 **Endpoint settings가 우선**한다. ECA만 고쳤는데 동작이 그대로라면 중복 설정부터 확인한다.

`ModifyEndpoint`의 `ExactSettings=false`는 같은 이름의 설정을 새 값으로 바꾸고 새 이름의 설정을 추가한다. `true`는 요청에 지정한 설정으로 기존 endpoint settings 전체를 교체하므로, 전달하지 않은 기존 설정을 유지하는 부분 수정과 다르다. ECA 문자열 자체를 초기화할 때는 `ExtraConnectionAttributes`에 빈 문자열을 전달한다.

운영 적용 제안: 변경 전 설정을 보존하고 원하는 변경 범위와 API 옵션을 대조한다. 변경 뒤 실제 저장된 설정을 확인하고, 해당 복제 인스턴스에서 연결을 재검사한 다음 Full Load 또는 CDC 반영을 검증한다. endpoint 생성이나 수정 API 성공만으로 연결과 데이터 이전 성공을 판단하지 않는다. 실제 endpoint는 변경하지 않았으며 기존 절의 검증일은 유지한다.

### 연결 실패는 출발지와 왕복 경로로 좁힌다

2026-10-09 AWS 네트워크 보안과 NACL 문서를 대조한 DMS Standard 진단 절차다. 연결 오류를 보고 DB 비밀번호부터 바꾸기보다 복제 인스턴스에서 각 endpoint까지 실제로 허용된 경로를 확인한다.

1. **출발지 확인:** 복제 인스턴스의 서브넷, 보안 그룹과 IP를 확인한다. DB가 보는 출발지는 구성에 따라 private IP, public IP 또는 NAT 주소가 되므로 실제 경로와 DB 수신 규칙을 맞춘다.
2. **보안 그룹 확인:** 복제 인스턴스의 outbound가 endpoint의 DB 포트를 허용하고, DB의 inbound가 해당 출발지에서 오는 DB 포트 연결을 허용하는지 확인한다.
3. **NACL 확인:** 관련 서브넷의 NACL은 stateless이므로 요청과 응답 방향을 모두 확인한다. DB 포트로 나간 요청의 응답은 클라이언트가 고른 임시 포트로 돌아온다. DB 포트만 양방향으로 열었다고 왕복 통신이 증명되지는 않는다.
4. **규칙 순서 확인:** 작은 번호부터 평가되는 규칙에서 먼저 일치하는 거부가 있는지, 허용 CIDR이 실제 양쪽 서브넷과 맞는지 확인한다. 임시 포트 범위는 클라이언트와 경로에 맞추며 공개 예제의 전체 대역 허용을 그대로 복사하지 않는다.

변경 뒤에는 같은 복제 인스턴스와 endpoint 조합으로 연결을 다시 검사한다. 네트워크 경로와 별개로 TLS와 인증 설정을 확인하며, 연결 성공을 CDC나 데이터 정합성 검증으로 확대하지 않는다.

### Oracle 소스의 권한은 운영 형태와 CDC 방식으로 나눈다

2026-10-09 Oracle 소스 공식 문서 대조 기준이다. endpoint에 지정한 Oracle 계정의 DB 권한을 확인한다. AWS API를 호출하는 IAM 권한과는 별개다.

| 조건 | 권한 검토 기준 |
|---|---|
| 자체 운영 Oracle | 기본 접속, 트랜잭션과 사전 뷰, 대상 테이블 권한을 확인한다. `V$` synonym 대신 `V_$` 실제 객체에 부여하는 항목을 구분한다. |
| RDS for Oracle | `SYS` 객체의 `SELECT`, `EXECUTE` 권한은 `rdsadmin.rdsadmin_util.grant_sys_object` 절차로 부여한다. 자체 운영용 SQL을 그대로 복사하지 않는다. |
| CDC | LogMiner와 Binary Reader 중 실제 사용할 방식에 맞춰 추가 권한과 로그 접근을 준비한다. 자체 운영 LogMiner의 추가 권한과 RDS의 기본 권한 묶음은 구성이 다르다. |
| 선택 기능 | ASM, TDE, Standby, LOB 검증과 Serverless에 해당하는 조건부 권한을 별도로 확인한다. |

LogMiner는 Oracle API로 redo log를 읽고 Binary Reader는 원시 redo log를 직접 읽고 해석한다. 두 방식의 전환에는 CDC task 재시작이 필요하다. 권한 목록은 Oracle 버전과 구성에 따라 달라지므로 단일 범용 GRANT 스크립트로 고정하지 않는다. endpoint 연결 성공 뒤에도 CDC 로그 접근과 실제 변경 반영을 별도로 검증한다.

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
- 운영 중단을 줄이는 마이그레이션의 일반적인 패턴

### MySQL CDC의 Error 1236은 세부 메시지로 나눈다

부분 검증(2026-10-13): AWS DMS MySQL 소스 문서와 AWS Knowledge Center의 오류 분류를 대조했다. `Error 1236`만 보고 보존 시간을 늘리거나 같은 위치에서 반복 재시작하지 않는다.

| 세부 증상 | 확인할 것과 대응 |
|---|---|
| 필요한 binlog 파일이 없음 | `SHOW BINARY LOGS` 결과와 task가 요청한 파일을 대조한다. 보존 기간 부족이나 task 장기 중단으로 삭제됐다면 보존 설정을 보완하고 Full Load 재실행 등 초기 동기화를 다시 설계한다. 보존 시간을 늘려도 삭제된 로그가 돌아오지는 않는다. |
| `max_allowed_packet` 초과 | 큰 행, BLOB, 트랜잭션과 로그 손상을 구분한다. 필요한 패킷 크기를 확인하며, AWS 오류 가이드가 제시한 상한은 1 GB다. 값을 올려도 지속되면 binlog 손상을 조사한다. |
| 이벤트 중간에서 binlog가 잘림 | 소스의 `sync_binlog`와 로그 손상을 확인한다. `sync_binlog=1` 설정만으로 이미 손상된 파일이 복구됐다고 보지 않는다. |
| 요청한 복제 위치가 유효하지 않음 | 소스의 비정상 종료와 요청 파일, 위치를 확인한다. CDC-only의 시작 위치를 건너뛰면 누락 구간이 생길 수 있으므로, 복구 후 대상 정합성을 별도로 확인한다. |

자체 운영 MySQL 8.0 이상은 `binlog_expire_logs_seconds`를 확인한다. `expire_logs_days`는 8.0에서 deprecated되고 8.4에서 제거됐으므로 오래된 절차를 그대로 쓰지 않는다. RDS for MySQL과 Aurora MySQL은 `mysql.rds_show_configuration`과 `mysql.rds_set_configuration`의 `binlog retention hours` 설정을 확인한다. 보존 시간은 장애 감지와 복구, CDC 지연을 감당하도록 정한다.

위 대응은 오류 진단과 복구 계획이다. 실제 재적재와 CDC 시작점 변경은 task 유형, target table preparation 및 기존 대상 데이터를 확인한 뒤 수행한다. task가 다시 실행된다는 사실만으로 누락과 중복이 없다고 판단하지 않는다.

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

### 타입 호환성은 소스, DMS와 대상의 매핑을 연결해서 본다

부분 검증(2026-10-14): Oracle 소스와 MySQL 대상의 공식 타입 매핑을 대조했다. 문서 전체의 검증일은 유지한다. 이기종 이전에서는 소스 타입의 이름뿐 아니라 DMS 내부 타입을 거쳐 대상에 저장되는 표현을 확인한다.

| 소스와 설정 | 확인할 변환 경계 |
|---|---|
| Oracle `NUMBER(p,s)`의 `s < 0` | 기본 매핑은 DMS `REAL8`이고, MySQL 대상에서는 `DOUBLE PRECISION`이다. 이를 정확한 십진수 표현이 그대로 보존된다는 보장으로 해석하지 않는다. |
| Oracle `TIMESTAMP WITH TIME ZONE`, `TIMESTAMP WITH LOCAL TIME ZONE` | DMS 기본 매핑은 시간대 정보를 나타내는 `STRING`이다. 일반 `TIMESTAMP`의 `DATETIME` 매핑과 구분한다. |
| Oracle endpoint의 `ConvertTimestampWithZoneToUTC` | 기본값은 `false`이며, `true`로 설정하면 두 시간대 타입의 값을 UTC로 변환한다. 대상 컬럼과 애플리케이션의 시간 해석도 함께 확인한다. |

검증 제안: 숫자의 경계값과 소수 정밀도, 같은 시각을 서로 다른 시간대로 표현한 값을 작은 시험 테이블로 비교한다. Full Load와 CDC의 변경 반영을 각각 검사하고, 필요하면 명시적 타입 변환과 대상 DDL을 설계한다. 한 프로젝트가 쓴 중간 테이블을 모든 이관의 필수 구성으로 삼지 않는다.

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

### Kinesis로 전달한 CDC와 최종 테이블 반영을 나눈다

부분 검증(2026-10-14): DMS의 Kinesis Data Streams 대상 문서를 대조했다. DMS는 소스 행 변경을 JSON 레코드로 발행한다. 스트림 전송 완료와 후속 데이터 레이크의 최신 상태 반영은 서로 다른 완료 조건이다.

- 소스 트랜잭션과 무관하게 행 변경마다 개별 레코드를 발행하며, 소비자가 중복을 처리해야 한다. 레코드 수신만으로 다중 행 트랜잭션의 원자적 적용을 가정하지 않는다.
- `IncludeTransactionDetails`의 기본값은 `false`다. 지원 소스(Oracle, SQL Server, PostgreSQL, MySQL)에서 활성화하면 커밋 시각, 로그 위치와 트랜잭션 식별 정보를 포함할 수 있지만, 이 정보가 대상 테이블의 트랜잭션 적용을 대신하지 않는다.
- Kinesis 대상에는 `BatchApply`를 사용하지 않는다. 공식 문서는 활성화 시 task 실패와 데이터 손실 위험을 명시한다. 후속 소비자의 마이크로배치 처리와 DMS의 이 설정을 혼동하지 않는다.

검증 제안: 같은 키의 삽입, 갱신과 삭제를 보내고 소비자 재시작 및 중복 재전달 뒤 최종 조회 결과를 비교한다. 소스 변경 시점, 스트림 도착 시점과 대상 테이블 반영 시점을 나누어 지연을 측정한다. 실제 파이프라인 실행은 하지 않았으며, 이번 보강은 전달 계약에 한정해 기존 문서 전체의 검증일을 유지한다.

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

- [AWS DMS, Using Amazon Kinesis Data Streams as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Kinesis.html)
- [AWS DMS, ModifyEndpoint](https://docs.aws.amazon.com/dms/latest/APIReference/API_ModifyEndpoint.html)
- [AWS DMS, Using a MySQL-compatible database as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.MySQL.html)
- [AWS DMS, Using a MySQL-compatible database as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html)
- [Why did my AWS DMS CDC task fail with Error 1236 when I used MySQL as the source? — AWS re:Post](https://repost.aws/knowledge-center/dms-cdc-error-1236-msql)
- [AWS DMS, Using an Oracle database as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html)
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
