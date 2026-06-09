---
tags: [reliability, backup, restore, rto, rpo, pitr, disaster-recovery]
status: done
category: "안정성엔지니어링(Reliability)"
aliases: ["Backup Restore", "백업 복원", "데이터 복구", "Data Recovery", "RTO RPO", "PITR"]
---

# 백업과 복원 (Backup / Restore)

백업의 목적은 파일을 남기는 게 아니라 **정해진 시간 안에(RTO) 정해진 손실만으로(RPO) 복구**하는 것이다. 이 두 수치가 백업 방식을 결정한다. 그리고 **복원을 검증하지 않은 백업은 백업이 아니다.**

## RTO와 RPO — 모든 결정의 기준

- **RPO (Recovery Point Objective)**: 얼마만큼의 데이터 손실을 감수하나. "최대 5분 전 상태로 돌아가도 됨" → RPO 5분. 백업 주기/복제 지연이 결정.
- **RTO (Recovery Time Objective)**: 복구에 얼마나 걸려도 되나. "1시간 안에 서비스 재개" → RTO 1시간. 복구 절차의 속도가 결정.

요구가 빡셀수록(RPO, RTO가 작을수록) 비용이 오른다. 비즈니스 영향도로 등급을 나눠 차등 적용한다.

## 백업 유형

| 축 | 종류 | 특징 |
|---|---|---|
| 방식 | **논리(logical)** | `mysqldump`/`pg_dump` — 이식성 좋음, 느림, `--single-transaction`으로 일관성 |
| | **물리(physical)** | 파일/블록 복사, 스냅샷 — 빠름, 동종 엔진 한정 |
| 범위 | **전체(full)** | 매번 전체. 단순하지만 크고 느림 |
| | **증분(incremental)** | 직전 이후 변경분만. 작고 빠름, 복원은 체인 필요 |
| 연속성 | **연속 아카이빙** | binlog/WAL을 계속 보관 → PITR의 토대 |

## PITR — 시점 복구

**전체 백업 + 트랜잭션 로그(binlog/WAL) 재생**으로 임의 시점까지 되돌린다. 실수로 `DELETE`/`DROP` 한 직전 시점으로 복구하는 핵심 수단이다. RPO를 초 단위까지 줄인다. RDS 자동 백업이 최대 35일 PITR을 제공한다. [[RDS-Aurora]]

## 스냅샷의 함정 — 복원은 생각보다 느리다

블록 레벨 스냅샷(RDS/EBS)은 증분이라 백업은 빠르지만, **복원 후 S3에서 블록을 lazy-load**하느라 한동안 I/O가 바닥이다. 대용량일수록 워밍업이 길다. **RTO에 이 워밍업 시간을 반드시 포함**한다. [[RDS-Operational-Pitfalls|스냅샷 워밍업]]

## 3-2-1 규칙

데이터 **3벌**, 서로 다른 **2개 매체**, 그중 **1벌은 오프사이트(다른 리전/계정)**. 같은 AZ나 같은 계정에만 두면 리전 장애나 계정 탈취 한 번에 백업까지 같이 날아간다. 랜섬웨어 대비로 변경 불가(immutable, object lock) 백업도 고려한다.

## 복원 리허설 — 가장 많이 빠뜨리는 것

- 백업이 존재한다와 복원이 된다는 다른 명제다. **정기적으로 실제 복원 드릴**을 돌려 RTO를 실측한다.
- 측정 항목: 복원 소요 시간, 스냅샷 워밍업, 애플리케이션 정합성, 복원 후 시퀀스/AUTO_INCREMENT 보정([[RDS-Zero-Downtime-Migration]]).
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

- [AWS — Backup and restore, RTO/RPO](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [Amazon RDS — Point-in-time recovery](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html)

## 관련 문서

- [[DR-Strategy|DR 전략 (multi-region)]]
- [[RDS-Aurora|RDS / Aurora (PITR, 스냅샷, 자동 백업)]]
- [[MySQL-Backup|MySQL 백업 (mysqldump, XtraBackup, binlog PITR)]]
- [[RDS-Migration-Scenarios|RDS 데이터 마이그레이션 시나리오]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정 (스냅샷 워밍업)]]
