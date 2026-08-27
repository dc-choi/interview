---
tags: [database, mysql, backup, xtrabackup, mysqldump, pitr]
status: note
category: "데이터&저장소(Data&Storage)"
aliases: ["MySQL Backup", "MySQL 백업", "XtraBackup", "mysqldump"]
verified_at: 2026-08-27
---

# MySQL/MariaDB 백업, 복원 전략

> 실행 명령은 설치된 client와 server 버전을 먼저 확인한다. 아래 binary log 위치 옵션은 2026-08-27 공식 문서 기준이다.

운영 장애는 **"백업이 있었느냐"가 아니라 "복원이 되느냐"** 로 갈린다. `mysqldump`, Percona XtraBackup, binary log 리플레이를 조합해 **전체/증분/지정 시점 복구(PITR)** 시나리오를 설계한다. 백업은 정기 검증(리스토어 테스트)까지 해야 진짜 백업이다.

## 논리적 vs 물리적 백업

| 축 | 논리적 백업(`mysqldump`) | 물리적 백업(XtraBackup) |
|---|---|---|
| 방식 | SQL(INSERT/CREATE) 스크립트로 덤프 | 데이터 파일(`*.ibd`)과 redo log를 그대로 복사 |
| 속도 | SQL 생성과 재실행 비용이 있어 대용량에서 느려지기 쉬움 | 파일 단위라 대용량에서 유리할 수 있음 |
| 크기 | 텍스트 형식이며 압축률은 데이터에 따라 다름 | 데이터 페이지를 복사하며 압축 여부에 따라 다름 |
| 복원 | 읽어 들이며 재생성 — 느림 | 파일 교체 + 로그 재생 — 빠름 |
| 호환성 | 물리 백업보다 이식성이 높지만 SQL dialect와 버전 호환성 확인 필요 | 도구와 대상 server 계열의 호환성 확인 필수 |
| 잠금 | InnoDB는 `--single-transaction`으로 일관된 snapshot을 읽음 | 온라인 백업이 가능하지만 metadata와 backup lock이 생길 수 있음 |
| 용도 | 소규모, 이식, 부분 테이블 | 대규모, 빠른 복원, PITR 기반 |

## mysqldump와 mariadb-dump

- **논리적 백업**의 표준 도구. MySQL은 `mysqldump`, MariaDB는 `mariadb-dump`로 SQL 문장을 덤프
- `--single-transaction` — InnoDB 테이블에서 일관된 snapshot 확보. `--source-data` 또는 `--master-data`와 함께 쓰면 시작할 때 짧은 global read lock이 필요할 수 있음
- MySQL 8.0.26 이상: `--source-data=2`. MySQL 8.0.25 이하: `--master-data=2`
- MariaDB: `mariadb-dump --master-data=2`. MariaDB 11.0의 Docker Official Image부터 `mysqldump` symlink가 제거됐으므로 client 이름을 혼용하지 않는다
- `--routines --triggers --events` — 스토어드 프로시저, 트리거, 이벤트 포함
- 약점: 데이터가 커질수록 SQL 생성과 재실행 시간, 임시 디스크 사용량이 커지므로 실제 restore 시간으로 적용 한계를 정함

## Percona XtraBackup / MariaDB mariabackup

- **물리적 online backup** — 파일을 복사하고 prepare 단계에서 redo log를 적용해 일관된 상태를 만듦. 동작 중 metadata와 backup lock이 생길 수 있으므로 완전한 무잠금으로 보지 않음
- server와 backup tool의 지원 계열을 맞춘다. 예를 들어 Percona XtraBackup 8.4는 MySQL 8.4와 Percona Server for MySQL 8.4 백업을 prepare함
- 주요 모드:
  - **Full backup** — 전체 데이터 복사
  - **Incremental backup** — 마지막 LSN(Log Sequence Number) 이후 변경분만
- 핵심 단계: **backup → `--prepare` → restore**. incremental chain은 순서대로 full backup에 적용한 뒤 최종 prepare 상태를 만든다

## Binary Log, PITR

- **Binary log(binlog)** — 활성화된 server의 변경 이벤트를 기록. `ROW`, `STATEMENT`, `MIXED` 포맷
- **Point-in-Time Recovery**: 전체 백업 복원 후 **binlog를 특정 시점까지 리플레이** → 장애 직전 상태 복원
- 절차:
  1. 전체 백업 복원 → 기준점 확보
  2. `mysqlbinlog --start-position=... --stop-datetime='2026-04-17 10:29:59'`로 원하는 시점까지 재생
  3. 파이프로 mysql 클라이언트에 주입
- 주의: engine과 version에 맞는 binlog 만료 설정을 사용하고, 복구하려는 구간의 log가 full backup 이후까지 남도록 보존한다

## 백업 전략 예시

고정 주기나 데이터 크기만으로 정하지 않는다. RPO, RTO, 변경량, 저장 비용과 실제 restore 시간으로 full, incremental과 binlog 보존 주기를 정한다.

### 논리 백업으로 RTO를 만족하는 경우

- MySQL 8.0.26 이상: **`mysqldump --single-transaction --source-data=2`**
- MySQL 8.0.25 이하: **`mysqldump --single-transaction --master-data=2`**
- MariaDB: **`mariadb-dump --single-transaction --master-data=2`**
- 복원: dump 로드 + binlog 재생

### 논리 복원 시간이 RTO를 넘는 경우

- 호환되는 XtraBackup 또는 mariadb-backup의 **Full + Incremental** 조합을 검토
- full backup 이후 필요한 구간의 binlog를 별도 보존
- 복원: Full → Incrementals prepare → binlog 재생
- 스냅샷(EBS, ZFS) 활용 가능하지만 **파일 시스템 일관성 보장** 필요

### 관리형 서비스(RDS, Aurora)

- 자동 백업을 활성화하면 지정 시점 복구(PITR)를 사용할 수 있음
- 보존 기간, 복구 시간과 새 instance 또는 cluster로 복원되는 방식을 서비스 문서에서 확인

## 복원은 백업만큼 중요하다

- **복원 시간(RTO)** — 100GB dump 복원은 수 시간. Prod SLA 내 복원 가능한가?
- **데이터 손실 허용(RPO)** — 마지막 백업 시점부터의 손실. PITR 있어도 binlog 유실 시 의미 없음
- **정기 복원 드릴** — 요구 RTO와 변경 빈도에 맞는 주기로 격리 환경에 실제 복원
- **부분 복원 능력** — 논리 백업은 객체 단위 복원이 비교적 쉽지만, 물리 백업의 부분 복원 절차와 제약은 도구 및 server version별로 확인

## 백업 보안, 무결성

- **오프사이트 저장** — 다른 장애 도메인에 보관하고 S3라면 Object Lock 같은 변경 방지 기능을 검토
- **암호화** — 백업 파일 자체 암호화(XtraBackup `--encrypt`, mysqldump + gpg/age)
- **무결성 검증** — `sha256sum` 같은 checksum 검증과 실제 복원 테스트를 함께 수행
- **액세스 제어** — 백업 저장소 권한을 최소 인원, 자동화 역할에만

## 실수, 사고 유형

- **테이블 DROP 장애** — `DROP TABLE`은 DDL이라 `ROLLBACK` 불가. binlog가 있으면 과거 데이터를 재주입 가능
- **binlog가 없어 PITR 불가** — 백업만 하고 binlog는 수일만 보관 → 오래된 논리 삭제는 복구 불가
- **prepare하지 않은 물리 백업 복원 시도** → 일관되지 않은 data file은 복원본으로 바로 사용할 수 없음
- **복원 테스트 없이 자신** — 실제 장애 시 복원 스크립트가 망가져 있음을 발견
- **스키마, 데이터 분리 실패** — DDL 변경을 backup에 넣지 않아 복원 후 앱 에러

## 면접 체크포인트

- 논리적 vs 물리적 백업의 트레이드오프
- `mysqldump --single-transaction`이 일관성을 유지하는 원리(트랜잭션 기반 스냅샷)
- XtraBackup과 mariadb-backup에서 **prepare**가 필요한 이유
- PITR을 위해 **binlog 보관 기간**이 왜 중요한가
- RTO, RPO 관점에서 백업 전략을 구성하는 방법
- "복원 드릴 없는 백업은 믿을 수 없다"는 명제의 근거

## 출처
- [MySQL 8.0 Reference Manual, mysqldump](https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- [MySQL 8.4 Reference Manual, mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)
- [MariaDB Documentation, mariadb-dump](https://mariadb.com/docs/server/clients-and-utilities/backup-restore-and-import-clients/mariadb-dump)
- [MariaDB Documentation, Backup and Restore Overview](https://mariadb.com/docs/server/server-usage/backup-and-restore/backup-and-restore-overview)
- [Percona XtraBackup 8.4, Prepare a full backup](https://docs.percona.com/percona-xtrabackup/8.4/prepare-full-backup.html)
- [AWS, Backing up and restoring your Amazon RDS DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/managing-backup-restore.html)
- [AWS, Restoring an Aurora DB cluster to a specified time](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-pitr.html)
- [우아한형제들 — XtraBackup 도입기](https://techblog.woowahan.com/2576/)

## 관련 문서
- [[Replication|Replication (sync / async)]]
- [[Transactions|ACID]]
- [[Isolation-Level|Isolation Level]]
- [[Sharding|Sharding]]
- [[MySQL-Gap-Lock|MySQL Gap Lock]]
- [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 시나리오 (스냅샷, 덤프, DMS)]]
- [[RDS-Storage-Shrink-Runbook|RDS 스토리지 축소 런북 (일관 덤프 + 복제)]]
