---
tags: [reliability, backup, restore, rto, rpo, pitr, disaster-recovery]
status: done
category: "안정성엔지니어링(Reliability)"
aliases: ["Backup Restore", "백업 복원", "데이터 복구", "Data Recovery", "RTO RPO", "PITR"]
verified_at: 2026-09-03
---

# 백업과 복원 (Backup / Restore)

백업의 목적은 파일을 남기는 게 아니라 **정해진 시간 안에(RTO) 정해진 손실만으로(RPO) 복구**하는 것이다. 이 두 수치가 백업 방식을 결정한다. 그리고 **복원을 검증하지 않은 백업은 백업이 아니다.**

## RTO와 RPO — 모든 결정의 기준

- **RPO (Recovery Point Objective)**: 허용할 데이터 손실을 시간으로 정한 목표. 최대 5분의 최근 변경 손실을 허용하면 RPO 5분이다. 실제 복구 가능한 시점은 백업 성공 여부와 로그 보관, 복제 지연으로 확인한다.
- **RTO (Recovery Time Objective)**: 서비스 복구까지 허용할 시간 목표. 1시간 안에 서비스 재개가 목표라면 RTO 1시간이다. 감지와 판단, 복원, 전환 및 정상 동작 확인을 포함한 소요 시간을 실측한다.

요구가 빡셀수록(RPO, RTO가 작을수록) 비용이 오른다. 비즈니스 영향도로 등급을 나눠 차등 적용한다.

## 백업 유형

| 축 | 종류 | 특징 |
|---|---|---|
| 방식 | **논리(logical)** | `mysqldump`/`pg_dump` — 이식성 좋음, 느림. `pg_dump`는 별도 옵션 없이 일관된 덤프를 만들고, `mysqldump --single-transaction`은 InnoDB 같은 트랜잭션 엔진에서 일관성을 제공한다 |
| | **물리(physical)** | 파일/블록 복사, 스냅샷 — 빠름, 동종 엔진 한정 |
| 범위 | **전체(full)** | 매번 전체. 단순하지만 크고 느림 |
| | **증분(incremental)** | 직전 이후 변경분만. 작고 빠름, 복원은 체인 필요 |
| 연속성 | **연속 아카이빙** | binlog/WAL을 계속 보관 → PITR의 토대 |

MySQL 8.4의 `--single-transaction`은 비트랜잭션 테이블까지 일관되게 만들지 않는다. 덤프 대상의 `ALTER`, `DROP`, `TRUNCATE` 등 동시 DDL도 덤프를 실패시키거나 내용을 어긋나게 할 수 있으므로 백업 동안 별도로 통제한다.

## PITR — 시점 복구

**엔진이 지원하는 기반 백업 + 연속된 트랜잭션 로그 재생**으로 보존된 복구 구간의 시점을 선택한다. PostgreSQL은 물리 base backup과 필요한 WAL이 있어야 하며, `pg_dump` 논리 덤프에 WAL을 적용하는 방식은 지원하지 않는다. MySQL은 일관된 백업과 그 시점에 대응하는 binlog 위치를 함께 확보한다.

복구 시점을 초 단위로 지정할 수 있다는 것과 데이터 손실이 1초 이내라는 것은 다르다. 로그 아카이빙 지연과 누락이 실제 복구 가능한 끝 시점을 제한한다. RDS DB 인스턴스의 자동 백업 보존은 최대 35일이며 0일이면 비활성화된다. 실제 PITR 범위는 설정된 보존 기간과 `LatestRestorableTime`으로 확인한다. [[RDS-Aurora]]

## 스냅샷의 함정 — 복원은 생각보다 느리다

RDS DB 인스턴스의 스냅샷 복원은 `available` 이후에도 S3에서 데이터를 lazy-load할 수 있어, 아직 로드되지 않은 데이터의 첫 접근이 느릴 수 있다. 모든 스냅샷이 같은 성능 저하를 보인다고 가정하지 말고 실제 복원 경로와 주요 쿼리를 측정한다. 서비스가 요구하는 성능까지의 워밍업도 RTO에 포함한다. [[RDS-Operational-Pitfalls|스냅샷 워밍업]]

## 3-2-1 규칙

데이터 **3벌**, 서로 다른 **2개 매체**, 그중 **1벌은 오프사이트(다른 리전/계정)**. 같은 AZ나 같은 계정에만 두면 리전 장애나 계정 탈취 한 번에 백업까지 같이 날아간다. 랜섬웨어 대비로 변경 불가(immutable, object lock) 백업도 고려한다.

## 복원 리허설 — 가장 많이 빠뜨리는 것

- 백업이 존재한다와 복원이 된다는 다른 명제다. **정기적으로 실제 복원 드릴**을 돌려 RTO를 실측한다.
- 측정 항목: 복원 소요 시간, 스냅샷 워밍업, 애플리케이션 정합성, 복원 후 시퀀스/AUTO_INCREMENT 보정([[RDS-Zero-Downtime-Migration]]).
- 최신 복구 레코드로 실제 손실 구간을 확인하고 핵심 읽기, 쓰기와 제약조건을 검증한다. 복원 리소스 생성 성공만으로 데이터가 사용 가능하다고 판정하지 않는다.
- 데이터 외에 설정, 애플리케이션 버전과 복호화 키 접근 권한도 복구할 수 있어야 한다. 운영 계정 침해 때 백업 삭제 권한까지 공유되는지 확인하고 보존, 암호화와 복원 권한을 분리한다.
- 리허설을 안 하면 진짜 장애 때 "백업은 있는데 복구가 안 되는" 최악을 만난다.

## 데이터 복구 시나리오

- **실수 삭제(DELETE/DROP)**: PITR로 직전 시점 복구. 운영 인스턴스 덮어쓰기가 아니라 새 인스턴스로 복원해 데이터를 옮긴다.
- **논리적 손상/버그**: 손상 시작 시점 이전으로 PITR.
- **리전 장애**: 오프사이트(크로스 리전) 백업에서 복구 → [[DR-Strategy]].

## 흔한 함정

- 복원을 한 번도 안 해봄 (가장 흔하고 가장 치명적)
- 백업을 운영과 같은 AZ/리전/계정에만 보관
- 보존 기간이 컴플라이언스 요구보다 짧음
- 대용량 논리 덤프가 RTO 안에 못 끝남(물리/스냅샷 고려)
- 수동 스냅샷을 방치해 비용 누적([[RDS-Connection-Credentials|백업 스토리지 과금]])

## 면접 체크포인트

- RTO와 RPO의 정의와 그것이 백업 방식을 결정하는 방식
- 논리 vs 물리, 전체 vs 증분, PITR의 동작(전체 + 로그 재생)
- 스냅샷 복원의 lazy-load 워밍업을 RTO에 포함해야 하는 이유
- 3-2-1 규칙과 오프사이트/immutable 백업의 이유
- 복원 리허설을 안 하면 생기는 문제

## 출처

2026-10-02에는 MySQL 8.4 덤프 일관성, PostgreSQL 물리 PITR, RDS 보존과 lazy loading 및 복원 검증 범위를 대조했다. 연결한 다른 문서의 마이그레이션 절차 전체를 검증한 기록은 아니다.

- [PostgreSQL 18 — Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/18/continuous-archiving.html)
- [Amazon RDS — Backup retention period](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html)
- [Amazon RDS — Restoring to a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html)
- [AWS Well-Architected — REL09-BP04 Perform periodic recovery of the data to verify backup integrity and processes](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_backing_up_data_periodic_recovery_testing_data.html)
- [AWS Well-Architected — REL09-BP02 Secure and encrypt backups](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_backing_up_data_secured_backups_data.html)
- [AWS — Backup and restore, RTO/RPO](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [Amazon RDS — Point-in-time recovery](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html)
- [PostgreSQL — pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [MySQL 8.4 — mysqldump](https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html)

## 관련 문서

- [[DR-Strategy|DR 전략 (multi-region)]]
- [[RDS-Aurora|RDS / Aurora (PITR, 스냅샷, 자동 백업)]]
- [[MySQL-Backup|MySQL 백업 (mysqldump, XtraBackup, binlog PITR)]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영 (pgBackRest PITR, 논리 덤프의 한계)]]
- [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 시나리오]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정 (스냅샷 워밍업)]]
