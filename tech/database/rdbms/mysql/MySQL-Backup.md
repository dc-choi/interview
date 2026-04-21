---
tags: [database, mysql, backup, xtrabackup, mysqldump, pitr]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["MySQL Backup", "MySQL 백업", "XtraBackup", "mysqldump"]
---

# MySQL/MariaDB 백업 · 복원 전략

운영 장애는 **"백업이 있었느냐"가 아니라 "복원이 되느냐"** 로 갈린다. `mysqldump`·Percona XtraBackup·binary log 리플레이를 조합해 **전체/증분/지정 시점 복구(PITR)** 시나리오를 설계한다. 백업은 정기 검증(리스토어 테스트)까지 해야 진짜 백업이다.

## 논리적 vs 물리적 백업

| 축 | 논리적 백업(`mysqldump`) | 물리적 백업(XtraBackup) |
|---|---|---|
| 방식 | SQL(INSERT/CREATE) 스크립트로 덤프 | 데이터 파일(`*.ibd`)과 redo log를 그대로 복사 |
| 속도 | 느림(데이터 양에 비례) | 빠름(파일 I/O 위주) |
| 크기 | 작음(원본 데이터) | 큼(인덱스·페이지 포함) |
| 복원 | 읽어 들이며 재생성 — 느림 | 파일 교체 + 로그 재생 — 빠름 |
| 호환성 | 다른 버전/엔진으로 이식 가능 | 동일 메이저 버전·동일 OS 권장 |
| 잠금 | 테이블 락(`--single-transaction`로 완화) | Hot backup(InnoDB, 락 없음) |
| 용도 | 소규모·이식·부분 테이블 | 대규모·빠른 복원·PITR 기반 |

## mysqldump

- **논리적 백업**의 표준 도구. SQL 문장을 파일로 덤프
- `--single-transaction` — InnoDB 테이블에서 **트랜잭션 시작 후 일관된 스냅샷** 확보, 테이블 락 회피
- `--master-data=2` / `--source-data=2` — 덤프 시점의 binary log 위치를 주석으로 기록 → PITR 기반점
- `--routines --triggers --events` — 스토어드 프로시저·트리거·이벤트 포함
- 약점: 큰 DB(100GB+)는 시간과 디스크가 부담. 복원이 특히 오래 걸림

## Percona XtraBackup / MariaDB mariabackup

- **물리적 Hot Backup** — InnoDB에서 락 없이 파일 복사 + redo log로 일관성 보장
- 대형 DB(수백GB+)에서 mysqldump 대비 **수 배 빠른 백업·복원**
- 주요 모드:
  - **Full backup** — 전체 데이터 복사
  - **Incremental backup** — 마지막 LSN(Log Sequence Number) 이후 변경분만
  - **Compact backup** — 보조 인덱스 제외(복원 시 재생성)
- 핵심 단계: **backup → prepare(`--apply-log`) → restore**. prepare는 redo log를 적용해 파일을 일관된 상태로 만드는 과정

## Binary Log · PITR

- **Binary log(binlog)** — 모든 쓰기 이벤트를 기록. `ROW`·`STATEMENT`·`MIXED` 포맷
- **Point-in-Time Recovery**: 전체 백업 복원 후 **binlog를 특정 시점까지 리플레이** → 장애 직전 상태 복원
- 절차:
  1. 전체 백업 복원 → 기준점 확보
  2. `mysqlbinlog --start-position=... --stop-datetime='2026-04-17 10:29:59'`로 원하는 시점까지 재생
  3. 파이프로 mysql 클라이언트에 주입
- 주의: binlog 보관 기간(`expire_logs_days`·`binlog_expire_logs_seconds`)을 백업 주기보다 **길게** 설정해야 PITR 가능

## 표준 백업 전략

### 소규모(수~수십 GB)

- **`mysqldump --single-transaction --master-data=2`** 매일 전체 백업
- binlog 7일 보관 → 일 단위 PITR
- 복원: dump 로드 + binlog 재생

### 중·대규모(100GB~수 TB)

- **XtraBackup Full** 주 1회 + **Incremental** 매일
- binlog 별도 S3 업로드, 2주 보관
- 복원: Full → Incrementals prepare → binlog 재생
- 스냅샷(EBS·ZFS) 활용 가능하지만 **파일 시스템 일관성 보장** 필요

### 관리형 서비스(RDS·Aurora)

- 자동 스냅샷 + binlog 기반 PITR
- 직접 운영 부담 없음 — 대신 복구 속도·보존 기간은 공급자 한도

## 복원은 백업만큼 중요하다

- **복원 시간(RTO)** — 100GB dump 복원은 수 시간. Prod SLA 내 복원 가능한가?
- **데이터 손실 허용(RPO)** — 마지막 백업 시점부터의 손실. PITR 있어도 binlog 유실 시 의미 없음
- **정기 복원 드릴** — 월 1회 이상 staging에 **실제로 복원**해보는 것만이 유효한 검증
- **부분 복원 능력** — 특정 테이블·시점만 복원할 수 있는가(XtraBackup은 가능, 신중한 prepare 필요)

## 백업 보안·무결성

- **오프사이트 저장** — S3 다른 리전, Glacier. 랜섬웨어 대비 **immutable bucket**
- **암호화** — 백업 파일 자체 암호화(XtraBackup `--encrypt`, mysqldump + gpg/age)
- **무결성 검증** — `sha256sum`·`md5sum`으로 주기 검증. 복원 실패를 사전 감지
- **액세스 제어** — 백업 저장소 권한을 최소 인원·자동화 역할에만

## 실수·사고 유형

- **테이블 DROP 장애** — `DROP TABLE`은 DDL이라 `ROLLBACK` 불가. binlog가 있으면 과거 데이터를 재주입 가능
- **binlog가 없어 PITR 불가** — 백업만 하고 binlog는 수일만 보관 → 오래된 논리 삭제는 복구 불가
- **Prepared 안 된 XtraBackup 리스토어 시도** → "Page cannot be decrypted" 같은 오류. `--apply-log`가 반드시 선행
- **복원 테스트 없이 자신** — 실제 장애 시 복원 스크립트가 망가져 있음을 발견
- **스키마·데이터 분리 실패** — DDL 변경을 backup에 넣지 않아 복원 후 앱 에러

## 면접 체크포인트

- 논리적 vs 물리적 백업의 트레이드오프
- `mysqldump --single-transaction`이 일관성을 유지하는 원리(트랜잭션 기반 스냅샷)
- XtraBackup에서 **prepare(apply-log)** 가 필요한 이유
- PITR을 위해 **binlog 보관 기간**이 왜 중요한가
- RTO·RPO 관점에서 백업 전략을 구성하는 방법
- "복원 드릴 없는 백업은 믿을 수 없다"는 명제의 근거

## 출처
- [우아한형제들 — XtraBackup 도입기](https://techblog.woowahan.com/2576/)

## 관련 문서
- [[Replication|Replication (sync / async)]]
- [[Transactions|ACID]]
- [[Isolation-Level|Isolation Level]]
- [[Sharding|Sharding]]
- [[MySQL-Gap-Lock|MySQL Gap Lock]]
