---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora 공유 스토리지", "Aurora 클러스터와 엔드포인트"]
verified_at: 2026-07-21
---

# Aurora — RDS와 무엇이 다른가

Amazon이 **MySQL, PostgreSQL 호환**으로 재설계한 클라우드 네이티브 DB. 기존 RDS와 **스토리지 아키텍처**가 근본적으로 다르다.

## 엔진과 스토리지의 분리

일반 MySQL은 **MySQL 엔진**(커넥션 처리, SQL 파싱, 옵티마이저, 쿼리 실행)과 **스토리지 엔진**(데이터를 디스크에 읽고 쓰기, 주로 InnoDB)으로 나뉜다. Aurora는 이 구조를 유지하되 **InnoDB 스토리지 계층을 AWS 분산 스토리지에 맞게 커스터마이징**했다. SQL 엔진은 익숙하게 두고 스토리지만 클라우드식으로 바꾼 것이 핵심이다.

## 공유 스토리지 아키텍처

- 기존 RDS: 각 인스턴스(primary/replica)가 **독립 스토리지**에 복제
- Aurora: primary, replica 모두 **같은 분산 스토리지**를 참조
  - 데이터를 **10 GB 단위 보호 그룹(protection group)** 으로 쪼개 분산 저장
  - **6-way 복제(3 AZ × 2 복사본)** — 스토리지 레이어에서 처리
  - 쿼럼: **쓰기는 6개 중 4개 성공, 읽기는 6개 중 3개** 기준 — 한 AZ가 통째로 죽어도 읽기와 쓰기를 계속
  - 장애 난 스토리지 노드는 **자동 복구** — 사용자가 디스크 복구를 직접 하지 않음
  - 스토리지는 엔진과 버전별 최대치까지 자동 확장하며 일부 최신 Aurora 버전은 256 TiB를 지원. 대상 release의 quota 확인
  - 오류를 스스로 감지, 복구하는 **Self-healing** 내장
  - Replica가 같은 클러스터 볼륨을 사용하므로 별도 데이터 사본을 유지하는 전통적 복제와 경로가 다르다. replica lag과 비용은 부하, 인스턴스, I/O와 요금 조건에 따라 측정

## Redo Log 중심 쓰기

일반 MySQL은 메모리에서 데이터를 바꾸고 트랜잭션 로그와 binlog를 기록한 뒤, 체크포인트로 데이터 페이지를 디스크에 반영한다. Aurora는 Writer 노드가 변경 내용을 **redo log 형태로 분산 스토리지에 전달**하고, **스토리지 계층이 그 로그로 실제 데이터 페이지를 구성**한다.

- 컴퓨트 노드의 **체크포인트 부담이 줄고 쓰기 경로가 단순**해진다. 컴퓨트는 데이터 페이지를 직접 정리하기보다 변경 명세를 빠르게 넘기는 역할에 가깝다.
- Writer와 Reader가 **같은 클러스터 스토리지 볼륨을 공유**하므로, 클러스터 내부 Reader를 늘려도 일반적인 **binlog 복제 오버헤드가 없다**. 읽기 확장과 장애 조치에 유리하다.
- 단, 외부 MySQL로 복제하거나 특수 목적으로 **binlog를 켜면** 쓰기 비용과 지연이 늘 수 있다. binlog I/O cache는 Aurora MySQL v2.10부터 도입됐지만 v2는 표준 지원이 끝났으므로 현재 지원되는 v3 이상 또는 조건에 맞는 Extended Support release에서 검증한다.

## 컴퓨트 노드 AZ 배치

스토리지는 자동으로 3개 AZ에 분산되지만, **Writer와 Reader 같은 컴퓨트 노드 배치는 사용자 책임**이다. 한 AZ에 노드를 몰아두면 그 AZ 장애 시 서비스가 중단된다.

- 최소 권장: **2개 AZ**에 노드 분산
- 권장: **3개 AZ에 각각 최소 1개 이상**

## Aurora DB Cluster, Endpoints

- **클러스터** = 기본(writer) DB 인스턴스 + 읽기 복제본(reader) 인스턴스 묶음
- 프로비저닝된 Aurora Replica는 일반적으로 클러스터당 최대 15개이며 Serverless와 엔진별 quota를 확인한다. 백업과 스냅샷은 관리형 shared storage 경로를 사용하지만 워크로드 영향이 절대 0이라고 보장하지 말고 지표로 확인
- **Writer Endpoint** — 항상 마스터(writer) DB만 가리킴 (쓰기 트래픽 진입점)
- **Reader Endpoint** — DNS를 통해 connection 요청을 Aurora Replica들에 분산한다. query 단위 부하 분산기가 아니며 기존 connection은 같은 인스턴스에 유지된다. replica가 없을 때 writer로 연결될 수 있으므로 read-only 보장으로 해석하지 않는다
- 마스터 장애 시 복제본으로 **자동 Failover**

## Aurora Auto Scaling

- 클러스터에 프로비저닝된 **Read Replica 수를 동적 조정**
- MySQL, PostgreSQL 모두 지원
- 사용자가 target metric, 최소와 최대 replica 수를 구성하면 Application Auto Scaling이 그 범위에서 replica 수를 조정한다. 즉시성, connection 재분산과 애플리케이션 준비는 별도 설계

## 주요 특장점

| 항목 | 설명 |
|---|---|
| **Replica 승격** | 공유 스토리지를 사용해 전체 데이터 복사 없이 replica를 승격할 수 있다. 실제 failover 시간은 topology, priority tier, cache와 애플리케이션 재연결에 따라 측정 |
| **Replica Lag** | 전통적인 binlog 복제와 다른 shared-storage 경로를 사용하지만 lag이 0이라고 보장되지 않으므로 `AuroraReplicaLag`와 읽기 일관성 요구를 확인 |
| **Aurora Global Database** | 1개 primary Region + **최대 10개 read-only secondary Region**. 전용 인프라로 storage-level 변경을 복제하며 AWS는 일반적으로 1초 미만 지연을 설명하지만 실제 RPO/RTO는 관측된 lag, switchover/failover 절차와 애플리케이션 전환에 좌우됨 |
| **Aurora Serverless v2** | 설정한 최소, 최대 ACU 범위에서 세밀하게 용량을 조정. 0 ACU auto-pause와 지원 범위는 엔진 버전과 설정별로 확인 |
| **Backtrack** (MySQL) | 지원되는 Aurora MySQL 버전과 Region에서 구성한 window 안의 시점으로 되돌리는 기능. 최대 72시간이지만 제약, 비용과 변경 중단 영향을 확인 |
| **Database Cloning** | 운영 DB의 특정 시점을 빠르게 복제 DB로. 전체 물리 복사 대신 **스토리지 페이지 공유(copy-on-write)** 라 빠르고 저렴 |
| **Aurora PostgreSQL Limitless Database** | router와 shard로 구성된 DB shard group에서 sharded table을 수평 확장. AWS가 제시하는 petabyte, 대규모 write 처리 목표와 별개로 지원 SQL, shard key, isolation level, Region과 용량 제한을 검증 |

## 언제 RDS 대신 Aurora를 고르나

- 읽기 트래픽이 많고 Lag에 민감한 서비스
- Multi-AZ + 다수 Read Replica 구성이 필요한 프로덕션
- 초단위 오토스케일이 필요한 SaaS(Aurora Serverless)
- 비용: 인스턴스, I/O-Optimized 여부, 스토리지, replica와 cross-Region 데이터 전송을 포함한 총비용을 RDS 대안과 계산

## 출처

- [Aurora Reader Endpoint](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html)
- [Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)
- [Aurora Auto Scaling](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.html)
- [Aurora PostgreSQL Limitless Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless.html)
