---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora 공유 스토리지", "Aurora 클러스터와 엔드포인트"]
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
  - 스토리지 자체가 **최대 128 TB까지 자동 확장**
  - 오류를 스스로 감지, 복구하는 **Self-healing** 내장
  - Replica는 데이터 복사 불필요 → **추가 비용↓, Lag ~ms**

## Redo Log 중심 쓰기

일반 MySQL은 메모리에서 데이터를 바꾸고 트랜잭션 로그와 binlog를 기록한 뒤, 체크포인트로 데이터 페이지를 디스크에 반영한다. Aurora는 Writer 노드가 변경 내용을 **redo log 형태로 분산 스토리지에 전달**하고, **스토리지 계층이 그 로그로 실제 데이터 페이지를 구성**한다.

- 컴퓨트 노드의 **체크포인트 부담이 줄고 쓰기 경로가 단순**해진다. 컴퓨트는 데이터 페이지를 직접 정리하기보다 변경 명세를 빠르게 넘기는 역할에 가깝다.
- Writer와 Reader가 **같은 클러스터 스토리지 볼륨을 공유**하므로, 클러스터 내부 Reader를 늘려도 일반적인 **binlog 복제 오버헤드가 없다**. 읽기 확장과 장애 조치에 유리하다.
- 단, 외부 MySQL로 복제하거나 특수 목적으로 **binlog를 켜면** 그로 인한 쓰기 지연이 생길 수 있다 (Aurora MySQL 2.10+의 binlog I/O cache로 완화).

## 컴퓨트 노드 AZ 배치

스토리지는 자동으로 3개 AZ에 분산되지만, **Writer와 Reader 같은 컴퓨트 노드 배치는 사용자 책임**이다. 한 AZ에 노드를 몰아두면 그 AZ 장애 시 서비스가 중단된다.

- 최소 권장: **2개 AZ**에 노드 분산
- 권장: **3개 AZ에 각각 최소 1개 이상**

## Aurora DB Cluster, Endpoints

- **클러스터** = 기본(writer) DB 인스턴스 + 읽기 복제본(reader) 인스턴스 묶음
- 읽기 복제본 **최대 15개**, 백업, 스냅샷이 퍼포먼스에 영향 없음
- **Writer Endpoint** — 항상 마스터(writer) DB만 가리킴 (쓰기 트래픽 진입점)
- **Reader Endpoint** — 모든 읽기 복제본과 자동 연결, **부하 분산** 수행
- 마스터 장애 시 복제본으로 **자동 Failover**

## Aurora Auto Scaling

- 클러스터에 프로비저닝된 **Read Replica 수를 동적 조정**
- MySQL, PostgreSQL 모두 지원
- 트래픽 패턴에 맞춰 항상 적절한 replica 수 유지

## 주요 특장점

| 항목 | 설명 |
|---|---|
| **빠른 Replica 승격** | 공유 스토리지이므로 primary 장애 시 초~십여 초 내 자동 승격 |
| **Replica Lag 최소화** | 보통 100ms 이하. 일반 RDS는 수 초까지 튈 수 있음 |
| **Aurora Global Database** | 1개 기본 리전 + **보조 리전 최대 5개**. 리전 간 복제를 binlog가 아니라 **스토리지 로그 전달**로 처리해 효율적. RPO ~1초, RTO 1분 미만. 기본 리전 장애 시 보조 리전을 기본으로 승격 |
| **Aurora Serverless v2** | 초 단위 오토스케일, idle 시 낮은 비용. 가변 워크로드용 |
| **Backtrack** (MySQL) | 언두(undo) 스타일의 72시간 내 시간 되돌리기 — 백업 복원, 접속정보 변경 없이 빠르게 과거 시점으로 |
| **Database Cloning** | 운영 DB의 특정 시점을 빠르게 복제 DB로. 전체 물리 복사 대신 **스토리지 페이지 공유(copy-on-write)** 라 빠르고 저렴 |
| **Aurora Limitless Database** | 자동 샤딩으로 페타바이트 규모 + 초당 수백만 쓰기 트랜잭션. 2023 re:Invent 발표 |

## 언제 RDS 대신 Aurora를 고르나

- 읽기 트래픽이 많고 Lag에 민감한 서비스
- Multi-AZ + 다수 Read Replica 구성이 필요한 프로덕션
- 초단위 오토스케일이 필요한 SaaS(Aurora Serverless)
- 비용: 인스턴스 단가는 Aurora가 비싸지만 **스토리지, I/O, Replica 구성 총비용**은 낮은 경우가 많음
