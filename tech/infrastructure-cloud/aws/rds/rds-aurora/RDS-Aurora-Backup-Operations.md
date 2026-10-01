---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS 백업과 복구", "RDS Proxy와 Enhanced Monitoring"]
verified_at: 2026-09-30
---

# RDS 백업, 복구와 운영 보강

## 백업, 복구 — Automated Backup vs Snapshot

| 항목 | Automated Backup | Manual Snapshot |
|---|---|---|
| 대상 | DB 인스턴스 전체 | DB 인스턴스 전체 |
| 생성 | 매일 자동 | 자동, 수동 모두 가능 |
| 보존 기간 | **CLI 생성 시 1일 / 콘솔 7일** (1~35일, 0이면 비활성) | 만료 없음 |
| 복원 시점 | **PITR — 보존 기간 안 임의 시점**. 트랜잭션 로그를 5분마다 S3에 올려 LatestRestorableTime은 보통 현재보다 몇 분 전 | 스냅샷 캡쳐 시점만 |
| 복원 결과 | **새 DB 인스턴스** 생성 (기존 인스턴스 덮어쓰기 불가) | 동일 — 새 인스턴스 |
| 복사, 공유 | — | 다른 계정, 리전으로 복사, 공유, 마이그레이션 가능 |
| I/O 영향 | **단일 AZ**: 백업, 스냅샷 중 I/O 일시 중단 가능. **Multi-AZ**(MariaDB, MySQL, Oracle, PostgreSQL): 기본 AZ에서 I/O 중단 없음 (standby에서 수행) | 동일 |

backup window는 UTC로 지정한다. 콘솔의 PITR 화면은 로컬 시간대를 UTC 오프셋과 함께 보여 주고, CLI `--restore-time`은 UTC ISO 8601 값을 받는다.

## 삭제와 복원이 백업, 엔드포인트, 연결에 주는 영향

**인스턴스를 삭제할 때**
- 자동 백업(시스템 스냅샷과 트랜잭션 로그)은 인스턴스에 딸린 백업이다. 삭제 때 Retain automated backups를 고르지 않으면 같은 Region의 자동 백업이 함께 삭제되어 복구할 수 없다. 다른 Region으로 복제한 자동 백업과 수동 스냅샷, 최종 스냅샷은 남는다
- 보존을 고르면 삭제 시점의 보존 기간만큼 남고 마지막 시스템 스냅샷이 만료되면 사라진다. 그 기간 안의 시점으로 삭제된 인스턴스를 복원할 수 있다
- 보존 자동 백업 제약: Region당 40개(DB 인스턴스 할당량과 별도), parameter group과 option group 정보 미포함, 수정 불가, Multi-AZ DB cluster는 보존 불가. 비용은 연결된 시스템 스냅샷 저장량만 백업 저장소 요금 규칙으로 과금된다
- 보존 자동 백업은 결국 만료되므로 AWS는 보존과 별개로 최종 스냅샷을 권한다. 최종 스냅샷은 만료되지 않는다
- 콘솔로 만든 인스턴스는 deletion protection이 기본으로 켜져 있어 먼저 꺼야 삭제된다

**복원할 때**
- 스냅샷 복원과 PITR은 기존 인스턴스를 덮어쓰지 않고 새 식별자의 새 인스턴스, 새 엔드포인트를 만든다. 애플리케이션 연결 문자열을 바꾸거나, 트래픽을 멈춘 뒤 원본 인스턴스 이름을 바꾸고 복원 인스턴스에 원래 이름을 붙여 엔드포인트를 이어받는다. 이름 변경은 인스턴스를 재부팅하고 새 DNS 이름은 약 10분 뒤 유효해진다
- 따로 지정하지 않으면 복원 인스턴스에는 기본 VPC, DB subnet group, 기본 VPC security group, 기본 DB parameter group(사용자 지정 설정 없음), 대부분의 경우 기본 option group이 붙는다. 앱 서버 security group을 허용하는 인바운드 규칙이 없어 연결이 실패하거나 문자셋, `max_connections` 같은 사용자 지정 파라미터가 빠진다. 복원 요청에 지정하거나 복원 직후 수정하고, 스냅샷을 만든 인스턴스의 parameter group을 보존한다
- 복원 인스턴스는 S3에서 데이터를 lazy loading하므로 직후 I/O가 느리다. RTO 영향은 [[RDS-Operational-Pitfalls|RDS 운영 함정]] 7절

## RDS Proxy 보강

- **Serverless**, Multi-AZ, Auto Scaling 내장
- Failover 시 standby로 바로 라우팅 → 장애 조치 체감 시간 단축
- **IAM 인증 강제** 가능, **퍼블릭 액세스 불가** (인터넷 직접 접근 차단)
- 2026-09-03 기준 지원: MySQL, PostgreSQL, MariaDB, Microsoft SQL Server, Aurora. SQL Server는 2022와 2014 메이저 버전 미지원 등 엔진별 제약이 있으므로 지원 조합을 확인한다
- Lambda 처럼 **연결이 빠르게 생성, 소멸**하는 워크로드에 특히 유효

## Enhanced Monitoring

- **인스턴스 내부 에이전트**가 지표 수집 (일반 모니터링은 **하이퍼바이저** 레벨에서 수집)
- 최소 **1초 단위** 수집 가능 — OS 레벨 프로세스, CPU, 메모리 세부 지표 확보
- CloudWatch Logs에 **30일간 보존**

## RDS vs EC2 자체 설치

- EC2 설치형: `my.cnf`, OS 튜닝, 확장 설치 자유, SSH 접속 가능. 단 백업, 패치, HA, 모니터링 **전부 직접 운영**
- RDS: 위 운영을 자동화하지만 SSH, OS 제어, 일부 확장 불가

## 출처

- [AWS 공식 문서, Amazon RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- [AWS 공식 문서, Backup retention period](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html)
- [AWS 공식 문서, Managing automated backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ManagingAutomatedBackups.html)
- [AWS 공식 문서, Retaining automated backups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.Retaining.html)
- [AWS 공식 문서, Deleting a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html)
- [AWS 공식 문서, Restoring to a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html)
- [AWS 공식 문서, Restoring a DB instance to a specified time](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html)
- [AWS 공식 문서, Renaming a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RenameInstance.html)
- [AWS 공식 문서, Monitoring OS metrics with Enhanced Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html)
- [인프런, Sungmin Kim, Database Back-ups](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43737)
- [인프런, Sungmin Kim, RDS 실습 2부](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=43741)
