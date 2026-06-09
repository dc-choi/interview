---
tags: [infrastructure, aws, rds, migration, dms, snapshot, blue-green]
status: done
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

- **스토리지 축소** — 스토리지는 늘리기만 되고 줄일 수 없다. 잘못 크게 잡았으면 작은 스토리지로 새 인스턴스를 만들고 덤프/복원이나 DMS로 옮긴다.

```bash
mysqldump -h old-host -u admin -p --single-transaction --routines mydb \
  | mysql -h new-small-host -u admin -p mydb   # --single-transaction = InnoDB 락 없는 일관 스냅샷
```

- **lower_case_table_names (MySQL, 니치)** — 테이블 이름 대소문자 구분 여부는 생성 시점에만 정해지고 이후 변경 불가. 바꿔야 하면 결국 마이그레이션이 된다.

### 2. 엔진/버전 차원의 큰 변경

- **이기종 엔진 전환** (MySQL ↔ PostgreSQL, Oracle → PostgreSQL 등) — 제자리 개념이 아예 없다. **DMS + SCT**로 스키마를 변환하고 데이터를 옮긴다. 타입 매핑과 SQL 방언 차이로 손이 가장 많이 간다. 메커니즘은 [[DMS]].
- **일반 RDS ↔ Aurora** — Aurora 전환도 마이그레이션이지만, 호환 엔진(Aurora MySQL ← RDS MySQL)이면 스냅샷 복원이나 **Aurora 읽기 복제본을 만들어 승격**하는 쉬운 경로가 있다.
- **메이저 버전 점프 / EOL 엔진** — 메이저 업그레이드는 제자리로 되는 경우가 많지만, 여러 버전을 건너뛰거나 제자리 업그레이드가 위험하면 새 버전 인스턴스로 옮기는 게 안전하다. 이때 **Blue/Green Deployment**로 green을 띄워 검증 후 빠르게 컷오버한다.

### 3. 인프라/위치 변경

- **리전 이동** — 스냅샷을 대상 리전으로 복사해 복원하거나, **크로스 리전 Read Replica를 만들어 승격**한다. 후자가 다운타임이 더 적다.
- **계정 간 이동** — 스냅샷을 다른 계정에 공유해 거기서 복원한다. 암호화된 스냅샷이면 **KMS 키도 함께 공유**해야 복원된다.

### 4. 데이터 자체를 고쳐야 할 때

- **깨진 인코딩 복구** — latin1에 UTF-8 바이트가 잘못 담긴 경우, 제자리 CONVERT는 데이터를 더 망가뜨린다. 사실상 컬럼 데이터를 바이너리 경유로 옮겨 고치는 마이그레이션이다(절차는 [[MySQL-Charset-Migration]]).
- **대규모 스키마 재설계 / 샤딩, 분할, 통합** — 구조를 크게 바꾸거나 DB를 쪼개고 합칠 때 새 구조로 데이터를 옮긴다(→ [[Sharding]]).

## 도구 선택 매트릭스

| 도구 | 적합 상황 | 다운타임 | 비고 |
|---|---|---|---|
| **스냅샷 복원** | 동종, 암호화 켜기, 리전/계정 이동 | 중 | 가장 간단 |
| **논리 덤프** (mysqldump/pg_dump) | 스토리지 축소, 소규모, 선택적 이전 | 큼 | 유연하지만 느림 |
| **DMS (+SCT)** | 이기종, 대용량, 온프레미스 | 최소 (CDC) | 가장 무겁고 강력 (→ [[DMS]]) |
| **Read Replica 승격** | 동종, 저다운타임 컷오버, 크로스 리전 | 매우 적음 | 복제본을 독립 승격(비가역) |
| **Blue/Green Deployment** | 업그레이드, 위험한 변경 | 매우 적음 | green 검증 후 컷오버 |

무중단(최소 다운타임)이 핵심이면 갈림길은 둘이다. **DMS의 Full Load + CDC**(소스를 계속 가동한 채 변경분을 따라잡아 컷오버 직전까지 동기화)와 **Read Replica 승격 컷오버**(동종 한정, 가장 빠름). 다운타임을 거의 0으로 만드는 게 보통 가장 까다롭다. 공통 골격, 컷오버 시퀀스, AUTO_INCREMENT 드리프트 같은 실전 함정은 → [[RDS-Zero-Downtime-Migration|무중단(near-zero) 마이그레이션]].

## 면접 체크포인트

- 제자리로 되는 변경과 마이그레이션이 강제되는 변경의 경계("제자리 불가 = 마이그레이션")
- 생성 시 고정 속성 3가지: 암호화, 스토리지 축소 불가, lower_case_table_names
- 이기종 전환에서 DMS(데이터)와 SCT(스키마)의 역할 분리
- 리전 이동에서 스냅샷 복사 vs 크로스 리전 Read Replica 승격의 다운타임 차이
- 무중단에 가까운 두 경로: DMS Full Load + CDC, Read Replica 승격 컷오버
- 암호화 스냅샷을 계정 간 공유할 때 KMS 키도 공유해야 하는 이유

## 출처

- [Amazon RDS — Backing up, restoring, and exporting data](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)
- [Amazon RDS Blue/Green Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-overview.html)

## 관련 문서

- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[DMS|AWS Database Migration Service (Full Load + CDC, SCT)]]
- [[MySQL-Charset-Migration|utf8mb4 마이그레이션 안전 절차]]
- [[RDS-Operational-Pitfalls-Rare|RDS 운영 함정 (암호화 사후불가, 승격 비가역)]]
- [[KMS|KMS (스냅샷 암호화 키)]]
- [[Sharding|Sharding]]
