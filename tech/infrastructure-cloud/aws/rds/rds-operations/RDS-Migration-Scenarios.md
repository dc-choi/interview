---
tags: [infrastructure, aws, rds, migration, dms, snapshot, blue-green]
status: done
verified_at: 2026-10-10
category: "Infrastructure - AWS"
aliases: ["RDS Migration Scenarios", "RDS 데이터 마이그레이션", "마이그레이션이 필요한 상황", "in-place vs migration"]
---

# RDS 데이터 마이그레이션 — 언제 필요하고 무엇으로 하나

> 상위 문서: [[RDS-Aurora|RDS / Aurora 관리형 DB]]

RDS 변경의 대부분은 **제자리(in-place)** 로 된다. 인스턴스 리사이즈, 스토리지 증설, 마이너 버전 패치, 파라미터 변경, Multi-AZ 토글, Read Replica 추가, utf8mb3→utf8mb4 CONVERT까지 새 인스턴스 없이 처리된다. 데이터를 새 인스턴스/클러스터로 옮겨야 하는 건 **일부 속성이 생성 시 고정이거나 제자리 변경이 불가능할 때**다. 멘탈 모델은 하나다 — **제자리로 안 되는 것 = 마이그레이션 필요**.

## 마이그레이션이 필요한 상황

### 1. 생성 시 고정되는 속성

- **암호화 켜기/끄기** — 암호화 없이 만든 인스턴스에 나중에 암호화를 직접 못 켠다. 스냅샷을 암호화해서 복사한 뒤 복원하는 데이터 이동이 필요하다.

```bash
# 스냅샷을 암호화해 복사 → 그 스냅샷에서 새 인스턴스 복원
aws rds copy-db-snapshot --source-db-snapshot-identifier my-unencrypted-snap \
  --target-db-snapshot-identifier my-encrypted-snap --kms-key-id alias/my-rds-key
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mydb-encrypted --db-snapshot-identifier my-encrypted-snap
```

- **스토리지 축소** — 기존 인스턴스의 할당 용량은 제자리에서 줄일 수 없다. 2026-09-22 AWS 문서 기준, 지원되는 엔진과 버전에서는 Blue/Green 생성 시 더 작은 green 스토리지를 지정할 수 있다. 목표 용량은 현재 사용량보다 최소 20% 커야 하며 리전과 스토리지 조건도 확인한다. 적용하기 어려우면 작은 인스턴스로 덤프/복원이나 DMS 이전을 검토한다.

```bash
mysqldump -h old-host -u admin -p --single-transaction --routines mydb \
  | mysql -h new-small-host -u admin -p mydb   # --single-transaction = InnoDB 락 없는 일관 스냅샷
```

- **lower_case_table_names (MySQL, 니치)** — 테이블 이름 대소문자 구분 여부는 생성 시점에만 정해지고 이후 변경 불가. 바꿔야 하면 결국 마이그레이션이 된다.

### 2. 엔진/버전 차원의 큰 변경

- **이기종 엔진 전환** (MySQL ↔ PostgreSQL, Oracle → PostgreSQL 등) — 제자리 개념이 아예 없다. DMS로 데이터를 옮기고 **DMS Schema Conversion 또는 수동 DDL**로 target schema를 준비한다. 타입 매핑과 SQL 방언 차이로 손이 가장 많이 간다. 메커니즘은 [[DMS]].
- **일반 RDS ↔ Aurora** — Aurora 전환도 마이그레이션이지만, 호환 엔진(Aurora MySQL ← RDS MySQL)이면 스냅샷 복원이나 **Aurora 읽기 복제본을 만들어 승격**하는 쉬운 경로가 있다.
- **메이저 버전 점프 / EOL 엔진** — 메이저 업그레이드는 제자리로 되는 경우가 많지만, 여러 버전을 건너뛰거나 제자리 업그레이드가 위험하면 새 버전 인스턴스로 옮기는 게 안전하다. 이때 **Blue/Green Deployment**로 green을 띄워 검증 후 빠르게 컷오버한다.

### 3. 인프라/위치 변경

- **리전 이동** — 스냅샷을 대상 리전으로 복사해 복원하거나, **크로스 리전 Read Replica를 만들어 승격**한다. 후자가 다운타임이 더 적다.
- **계정 간 이동** — 2026-09-03 AWS 문서 기준, 미암호화 스냅샷은 공유받은 계정이 바로 복원할 수 있다. 암호화된 스냅샷은 공유받은 계정에서 직접 복원할 수 없으므로, 고객 관리형 KMS 키로 암호화한 스냅샷과 키 사용 권한을 공유하고 대상 계정이 자기 KMS 키로 복사한 뒤 그 복사본에서 복원한다. 계정 기본 KMS 키로 암호화된 스냅샷은 공유 자체가 불가능해 먼저 고객 관리형 키로 복사해야 한다.

### 4. 데이터 자체를 고쳐야 할 때

- **깨진 인코딩 복구** — latin1에 UTF-8 바이트가 잘못 담긴 경우, 제자리 CONVERT는 데이터를 더 망가뜨린다. 사실상 컬럼 데이터를 바이너리 경유로 옮겨 고치는 마이그레이션이다(절차는 [[MySQL-Charset-Migration]]).
- **대규모 스키마 재설계 / 샤딩, 분할, 통합** — 구조를 크게 바꾸거나 DB를 쪼개고 합칠 때 새 구조로 데이터를 옮긴다(→ [[Sharding]]).

## MySQL의 계정 간, 리전 간 지속 복제

2026-10-10 AWS 문서 기준, RDS for MySQL의 다른 계정으로 향하는 크로스 리전 읽기 복제본은 콘솔이나 CLI의 관리형 읽기 복제본 생성으로 직접 만들 수 없다. DMS 또는 두 DB 인스턴스 사이의 외부 binlog 복제를 검토한다. 스냅샷 공유만으로 이후 변경까지 동기화되지는 않는다.

외부 복제의 초기 데이터와 시작 위치를 맞추는 흐름은 다음과 같다.

1. 원본 계정에서 binlog를 활성화하고, 복제 전용 사용자를 준비한다. 초기 데이터 이전과 복구에 필요한 로그가 지워지지 않도록 보존 시간을 정한다.
2. 원본 계정 안에서 대상 리전에 읽기 복제본을 만든다. 동기화를 확인한 뒤 **복제본에서** 복제를 멈추고 적용 완료한 원본 binlog 파일과 위치를 기록한다.
3. 멈춘 복제본의 스냅샷을 대상 계정에 공유해 복원한다. 암호화 스냅샷은 KMS 권한을 공유하고 대상 계정에서 복사한 뒤 복원한다.
4. 두 계정의 네트워크와 보안 그룹을 구성한다. 대상 DB에서 원본 DB 엔드포인트와 앞서 기록한 위치를 사용해 외부 복제를 설정하고 시작한다.

RDS MySQL 8.4 이상은 `mysql.rds_set_external_source`, 8.0 이하는 `mysql.rds_set_external_master`를 사용한다. 두 프로시저는 `autocommit` 활성화가 필요하며 `ssl_encryption` 인자를 포함한 공식 시그니처를 확인한다. TLS를 사용할 때 이 값은 `1`이다. 접속 사용자는 복제 전용으로 제한하고 원본에는 `REPLICATION CLIENT`, `REPLICATION SLAVE` 권한을 부여한다.

복제 재개 뒤에는 지연뿐 아니라 복제 오류와 데이터 반영을 확인한다. 리전 간 지연과 전송 비용이 있고, 외부 복제가 연결됐다는 사실만으로 애플리케이션 전환이나 장애 복구 검증이 끝난 것은 아니다. 이번 확인은 계정 간 복제와 스냅샷 공유 경계에 대한 부분 검증이다.

## 도구를 고르기 전의 사전 점검

2026-10-14 AWS 마이그레이션 준비 가이드와 DMS 모범 사례 대조 기준. 데이터 복사 도구를 정하기 전에 애플리케이션 의존성과 대상 환경의 제약을 확인한다. 다음은 Oracle 동종 이전 가이드의 점검 항목을 일반적인 이전 검토에 적용한 목록이며, 엔진별 지원 조건은 별도로 확인한다.

| 점검 대상 | 확인할 내용 |
|---|---|
| 호출과 연계 | 직접 연결하는 앱, 다른 DB와의 링크, 외부 스케줄러, 함께 옮기지 않는 시스템과의 지연 |
| 호스트 의존성 | DB 서버의 파일 시스템에 쓰는 보고서, 설치 소프트웨어, 특정 옵션과 패치 요구를 대상 환경에서도 충족할 수 있는지 |
| 실제 부하 | CPU, 메모리, I/O와 트랜잭션 특성, 배치와 보고서 작업, 변경 로그 발생량 |
| 중단 조건 | 업무가 허용하는 중단 시간과 온라인 또는 오프라인 이전의 적합성 |

일반 DMS 복제 작업은 테이블과 기본 키 같은 기본 스키마를 만들 수 있지만, 보조 인덱스, 외래 키와 사용자 계정까지 자동으로 재현하지는 않는다. 이 경로에서는 같은 엔진의 네이티브 스키마 도구나 DMS Schema Conversion 등으로 준비할 범위를 분리한다.

별도 기능인 **Homogeneous data migrations**에는 다른 규칙이 적용된다. 예를 들어 PostgreSQL 동종 이전의 `Drop tables on target` 모드는 대상 테이블을 삭제한 뒤 다시 만들며, 소스 테이블 메타데이터에 정의된 보조 인덱스 등도 생성한다. 단, PostgreSQL의 스키마 사용자는 미리 만들어야 한다. PostgreSQL의 CDC 전용 이전은 대상 스키마와 객체가 이미 존재해야 한다. 동종 엔진이라는 사실만으로 자동 이전 범위를 정하지 말고, 사용하는 DMS 기능과 이전 유형, 대상 테이블 준비 모드를 함께 확인한다.

지원하지 않는 데이터 타입과 소스/대상 설정도 확인한다. 데이터 적재 성공을 스키마와 애플리케이션 호환성 검증 완료로 보지 않는다. 세부 절차는 [[DMS]], 전환과 복구 조건은 [[RDS-Zero-Downtime-Migration]]을 따른다.

## SQL Server 네이티브 백업 복원의 실패 경계

부분 검증(2026-10-14): RDS for SQL Server의 네이티브 백업, 복원 설정과 오류 문서를 대조했다. 이 경로를 일반 RDS 스냅샷 복원이나 DMS 이전과 구분한다.

### 이전 전 호환성과 용량 평가

RDS Discovery는 사용 중인 SQL Server 버전, 에디션, 기능과 고가용성 구성을 수집해 RDS 지원 여부와 Enterprise 전용 기능 의존성을 점검한다. SQLServerAssessment(SSAT)는 관측 기간의 CPU, 메모리, IOPS와 처리량으로 대상 크기를 제안한다. **기능 호환성 평가와 부하 기반 용량 산정은 서로 다른 결과**다.

운영 검토 제안: 짧은 시연 구간의 측정치만으로 운영 크기를 확정하지 않는다. 배치와 피크가 포함됐는지 확인하고, 추천 인스턴스에서 애플리케이션을 검증한다. AWS의 도구 소개는 SQL Server 시스템 관리자 자격증명을 요구한다고 설명하므로 실행 전 권한과 운영 접근 범위를 검토한다. 도구 결과만으로 이전 성공을 보장하지 않는다.

### 복원 설정과 상태 확인

- **옵션 활성화:** 대상 DB 인스턴스에 연결된 option group에 `SQLSERVER_BACKUP_RESTORE`가 있는지 확인한다.
- **파일 접근:** `Access Denied`는 DB 접속 비밀번호 문제로 단정하지 않는다. 백업 객체의 S3 ARN, 버킷과 파일 경로, option에 연결한 IAM 역할의 권한을 확인한다. 다른 계정의 버킷이면 해당 객체에 대한 교차 계정 접근 권한도 함께 확인한다.
- **SQL 실행 권한:** `rds_backup_database`, `rds_restore_database`의 `EXECUTE permission` 오류는 S3 접근 오류와 구분한다. 공식 가이드는 master user 사용과 그 사용자의 권한 상태를 확인하도록 안내한다.
- **진행 상태:** `msdb.dbo.rds_task_status`의 `lifecycle`과 `task_info`로 결과를 확인한다. 호출 직후 `CREATED`는 완료가 아니며, `IN_PROGRESS`로 바뀌기까지 최대 5분이 걸릴 수 있다. 상태는 약 2분마다 갱신된다.

검증 제안: 복원 task의 `SUCCESS` 뒤에도 대상 DB의 데이터와 애플리케이션 동작을 확인한다. 오류를 없애려고 기존 백업을 덮어쓰거나 원본 DB의 암호화를 해제하는 조치를 먼저 적용하지 않는다. 이 절은 문서 기반 진단이며 실제 복원 시험은 수행하지 않았다.

### 전체 백업 뒤 로그를 이어 적용하는 경로

2026-10-14 공식 문서 대조 기준. 전체 백업 이후 변경분을 적용하려면 복원 task 완료와 DB를 온라인으로 여는 시점을 구분한다.

1. 원본의 전체 백업을 S3로 옮겨 `msdb.dbo.rds_restore_database`의 `@with_norecovery=1`로 복원한다. task가 성공해도 DB는 `RESTORING` 상태로 남는다.
2. 이어지는 원본 로그 백업을 `msdb.dbo.rds_restore_log`의 `@with_norecovery=1`로 순서대로 적용한다. 다음 로그를 적용하기 전 앞선 task의 성공과 로그 체인 연결을 확인한다.
3. 전환 때는 원본 쓰기를 멈추고 마지막 변경까지 담은 로그를 확보한다. 마지막 로그를 `@with_norecovery=0`으로 복원하면 DB가 온라인이 된다. 이미 온라인인 DB에는 후속 로그 백업을 계속 복원할 수 없다.

`RESTORING` 상태이고 대기 중인 복원 task가 없을 때는 `msdb.dbo.rds_finish_restore`로 복원을 마칠 수도 있다. 데이터 대사, 접속 전환과 복구 기준은 [[RDS-Zero-Downtime-Migration]]을 따른다. 이 경로도 최종 쓰기 중단과 검증 시간을 없애지는 않는다.

Multi-AZ를 먼저 해제해야 한다는 과거 제약을 그대로 적용하지 않는다. 2026-01 AWS 발표 이후 Multi-AZ 및 같은 리전의 읽기 복제본을 둔 인스턴스에도 차등 백업과 로그 복원이 지원된다. 실제 엔진과 구성의 제한은 실행 시 공식 문서를 확인한다. 도구 실행과 실제 데이터 이전은 검증하지 않았으며 기존 절 전체의 검증일은 유지한다.

## SQL Server 에디션 변경 경로

2026-10-14 부분 검증: RDS 스냅샷 복원 문서와 SQL Server 에디션 하향 가이드를 대조했다. 엔진 버전 업그레이드와 Express, Web, Standard, Enterprise 사이의 에디션 변경은 별도로 판단한다.

- **스냅샷을 이용한 상향:** Standard에서 Enterprise로, Web에서 Standard 또는 Enterprise로, Express에서 Web, Standard 또는 Enterprise로 복원할 수 있다. 기존 인스턴스에 덮어쓰는 방식이 아니라 새 인스턴스를 만들며, 스냅샷에 대상 에디션에 충분한 스토리지가 할당되어 있어야 한다.
- **하향과 다른 경로:** 스냅샷 복원이 지원하지 않는 에디션 변경은 네이티브 백업과 복원을 검토한다. 사용하는 SQL Server 기능이 대상 에디션과 호환되는지 확인한다. Enterprise에서 Standard로 이전할 때 중단 시간을 줄이려면 지원 버전과 에디션 조건을 확인한 DMS의 전체 적재와 변경분 동기화를 비교한다.
- **복원 후 설정:** 사용자 지정 parameter group, VPC, subnet group과 security group이 자동으로 그대로 연결된다고 가정하지 않는다. 복원 시 지정한 값과 실제 연결 상태를 확인한다.

검증 제안: 복원 성공과 애플리케이션 전환 성공을 나누어 확인하고, 데이터 정합성과 접속을 검증하기 전 원본을 삭제하지 않는다. 실제 에디션 변경 시험은 수행하지 않았으며 기존 절 전체의 검증일은 유지한다.

## Oracle 이전에서 파일 전달과 데이터 반영을 구분한다

부분 검증(2026-10-14): RDS for Oracle의 S3 통합과 AWS DMS LOB 문서를 대조했다. 네이티브 덤프 전달과 DMS 행 복제는 서로 다른 경로다.

- **S3 통합 준비:** DB 인스턴스와 버킷은 같은 리전이어야 한다. 필요한 S3 접근 권한을 가진 IAM 역할의 연결과 `S3_INTEGRATION`이 포함된 option group을 확인한다. Data Pump 파일을 전달해도 DB에 import하는 단계는 별도로 남는다.
- **전달 완료 확인:** `rdsadmin.rdsadmin_s3_tasks.upload_to_s3`와 `download_from_s3`는 비동기 작업이다. 반환된 task ID로 `BDUMP`의 `dbtask-<task-id>.log`와 RDS 이벤트를 확인한다. task ID 반환을 전송 완료로 처리하지 않는다.
- **다운로드 재실행:** Oracle 대상 디렉터리에 같은 이름의 파일이 있으면 다운로드를 건너뛴다. S3 prefix에 맞는 객체가 없어도 기본 설정에서는 실패하지 않으며, 필요하면 `p_error_on_zero_downloads=TRUE`로 무일치 오류를 켠다. 따라서 성공 상태와 예상 파일의 존재, 내용은 따로 확인한다.
- **DMS LOB 크기:** limited LOB 모드는 설정한 최대 크기를 넘는 값을 잘라낸다. 원천 LOB 크기를 조사하고 경계값과 이전 결과를 대사한다. CDC에서 LOB가 있는 테이블에는 primary key 또는 unique index가 필요하므로, 성능을 이유로 키와 인덱스를 일괄 제거하지 않는다.

검수 제안: 파일 전송, import 또는 복제, 데이터 대사, 애플리케이션 SQL 검증을 각각 완료 조건으로 둔다. 실제 이전 시험은 수행하지 않았으며 기존 절 전체의 검증일은 유지한다.

## 도구 선택 매트릭스

| 도구 | 적합 상황 | 다운타임 | 비고 |
|---|---|---|---|
| **스냅샷 복원** | 동종, 암호화 켜기, 리전/계정 이동 | 중 | 가장 간단 |
| **논리 덤프** (mysqldump/pg_dump) | 스토리지 축소, 소규모, 선택적 이전 | 큼 | 유연하지만 느림 |
| **DMS + schema 준비** | 이기종, 대용량, 온프레미스 | 최소 (CDC) | DMS Schema Conversion 또는 수동 DDL 병행 (→ [[DMS]]) |
| **Read Replica 승격** | 동종, 저다운타임 컷오버, 크로스 리전 | 매우 적음 | 복제본을 독립 승격(비가역) |
| **Blue/Green Deployment** | 업그레이드, 지원 조건에 맞는 스토리지 축소 | 매우 적음 | green 검증 후 컷오버. 엔진과 버전별 제약 확인 |

다운타임을 줄이려면 **DMS의 Full Load + CDC**, **Read Replica 승격 컷오버**, **Blue/Green 전환**을 변경 목적과 지원 조건에 따라 비교한다. 소스를 계속 가동하며 변경분을 동기화해도 최종 쓰기 전환과 연결 재설정 시간은 남는다. 공통 골격, 컷오버 시퀀스, AUTO_INCREMENT 드리프트 같은 실전 함정은 → [[RDS-Zero-Downtime-Migration|무중단(near-zero) 마이그레이션]].

## 면접 체크포인트

- 제자리로 되는 변경과 마이그레이션이 강제되는 변경의 경계(제자리 불가 = 마이그레이션)
- 제자리 변경이 제한되는 항목: 암호화, 할당 스토리지 축소, lower_case_table_names. 스토리지 축소는 조건에 맞는 Blue/Green 전환도 검토
- 이기종 전환에서 DMS(데이터)와 DMS Schema Conversion 또는 수동 DDL(스키마)의 역할 분리
- 리전 이동에서 스냅샷 복사 vs 크로스 리전 Read Replica 승격의 다운타임 차이
- 저다운타임 경로 비교: DMS Full Load + CDC, Read Replica 승격, Blue/Green 전환
- 암호화 스냅샷의 계정 간 이전 순서: 고객 관리형 KMS 키 권한 공유 → 스냅샷 공유 → 대상 계정 키로 복사 → 복사본 복원

## 출처

- [Amazon RDS, Amazon S3 integration](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.html)
- [Amazon RDS, Configuring IAM permissions for RDS for Oracle integration with Amazon S3](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.preparing.html)
- [Amazon RDS, Adding the Amazon S3 integration option](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.preparing.option-group.html)
- [Amazon RDS, Transferring files between Amazon RDS for Oracle and an Amazon S3 bucket](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-s3-integration.using.html)
- [AWS DMS, Setting LOB support for source databases in an AWS DMS task](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.LOBSupport.html)
- [Automate SQL Server discovery and assessment to accelerate migration to AWS — AWS Database Blog](https://aws.amazon.com/blogs/database/automate-sql-server-discovery-and-assessment-to-accelerate-migration-to-aws/)
- [Amazon RDS for SQL Server enhances differential and transaction log restores support — AWS](https://aws.amazon.com/about-aws/whats-new/2026/01/amazon-rds-sql-server-diff-and-log-restores-for-maz-and-rr/)
- [Amazon RDS, Restoring to a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html)
- [AWS Prescriptive Guidance, Evaluate downgrading Microsoft SQL Server from Enterprise edition to Standard edition on AWS — Next steps](https://docs.aws.amazon.com/prescriptive-guidance/latest/evaluate-downgrading-sql-server-edition/next-steps.html)
- [Amazon RDS, Setting up for native backup and restore](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.Native.Enabling.html)
- [Amazon RDS, Troubleshooting native backup and restore](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.Native.Troubleshooting.html)
- [Amazon RDS, Using native backup and restore](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.Procedural.Importing.Native.Using.html)
- [AWS Prescriptive Guidance, Strategies for homogeneous migration of Oracle databases — Phase 1: Prepare](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-oracle-database-homogeneous-migration/prepare.html)
- [AWS DMS, Best practices for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html)
- [AWS DMS, Target table preparation mode](https://docs.aws.amazon.com/dms/latest/userguide/dm-migrating-data-table-prep.html)
- [AWS DMS, Migrating data from PostgreSQL databases with homogeneous data migrations in AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/dm-migrating-data-postgresql.html)
- [Amazon RDS — Backing up, restoring, and exporting data](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)
- [Amazon RDS Blue/Green Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-overview.html)
- [Amazon RDS, Creating a blue/green deployment — Modify storage and performance settings](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-creating.html#blue-green-deployments-creating-storage)
- [AWS DMS, Converting database schemas using DMS Schema Conversion](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html)
- [Amazon RDS, Sharing a DB snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html)
- [How do I create a cross-Region read replica of my Amazon RDS for MySQL DB instance in another AWS account? — AWS re:Post](https://repost.aws/knowledge-center/rds-mysql-cross-region-replica)
- [Amazon RDS, Configuring binary log file position replication with an external source instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Procedural.Importing.External.Repl.html)
- [Amazon RDS, Configuring, starting, and stopping binary log replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/mysql-stored-proc-replicating.html)

## 관련 문서

- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[DMS|AWS Database Migration Service (Full Load + CDC, schema conversion)]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션 안전 절차]]
- [[RDS-Operational-Pitfalls-Rare|RDS 운영 함정 (암호화 사후불가, 승격 비가역)]]
- [[KMS|KMS (스냅샷 암호화 키)]]
- [[Sharding|Sharding]]
