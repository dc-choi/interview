---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS 핵심 기능", "Multi-AZ vs Read Replica"]
verified_at: 2026-08-25
---

# 관리형 DB와 AWS RDS 핵심

## 관리형 DB가 자동화하는 작업

| 영역 | 직접 운영(Self-managed) | 관리형 DB |
|---|---|---|
| 설치, 프로비저닝 | OS, DB 설치, 버전 선택 | 콘솔 몇 번 클릭 |
| 백업 | 크론 스크립트, 별도 백업 서버 | 자동 스냅샷, PITR |
| 장애 복구 | 수동 failover | 자동 standby 승격 |
| 패치, 업그레이드 | 다운타임 계획, 테스트 | 유지보수 윈도 자동 적용 |
| 모니터링 | Prometheus, Zabbix 구축 | 내장 대시보드 |
| 복제 | my.cnf 수동 구성 | 클릭 한 번에 Read Replica |

대신 **DB 인스턴스 SSH, OS 제어가 불가**하고 일부 확장 설치가 제약된다. 이 트레이드오프가 관리형 DB 채택의 핵심 판단점.

## AWS RDS

### DB Instance, Storage 구성

- **DB Instance**: 클라우드에서 격리되어 실행되는 DB 환경. 하나의 AZ에 격리되어 인스턴스로 동작. EC2처럼 다양한 클래스 선택(`db.m5`, `db.r5` 등)
- **지원 엔진**: Db2, MySQL, MariaDB, PostgreSQL, Oracle, Microsoft SQL Server. Aurora는 MySQL, PostgreSQL 호환 엔진이다.
- **Instance Storage**: **EBS** 기반. 필요 시 여러 EBS 볼륨에 자동 분할 저장, **Storage Auto Scaling** 지원
- **스토리지 유형**
  - 범용 SSD(gp2/gp3) — 대부분 워크로드의 기본 선택
  - 프로비저닝 IOPS(io1/io2) — 일관적 저지연, 고 I/O 요구
  - 마그네틱 — 접속 빈도 낮은 워크로드용 레거시

### 지원 엔진과 Read Replica 한계

| 엔진 | 최대 Read Replica |
|---|---|
| MySQL / MariaDB / PostgreSQL / SQL Server | 엔진과 에디션 요건을 충족하면 소스당 **최대 15개** |
| Oracle | 에디션과 Active Data Guard 요건을 충족하면 소스당 **최대 5개** |
| Aurora (MySQL/PostgreSQL 호환) | **15개** (공유 스토리지 기반) |

정확한 한도와 지원 조합은 엔진 버전, 에디션, 리전에 따라 달라질 수 있으므로 배포 전 해당 엔진 문서와 Service Quotas를 확인한다.

### 핵심 기능

- **Multi-AZ DB instance**: 다른 AZ의 단일 standby에 동기 복제하고 장애 시 자동 failover한다. standby는 읽기 트래픽을 받지 않는다.
- **Multi-AZ DB cluster**: 지원되는 MySQL/PostgreSQL 구성에서 3개 AZ에 writer 1개와 읽기 가능한 인스턴스 2개를 둔다.
- **자동 백업 + PITR**: 초 단위 시점 복구(Point-In-Time Recovery)
- **Read Replica**: 비동기 복제. 읽기 분산, 재해 복구용. **수동 승격** 가능
- **Cross-Region Replica**: 리전 간 복제로 DR 구성
- **RDS Proxy**: Lambda, 애플리케이션 앞단에 두어 커넥션 폭주 방어
- **Blue/Green Deployment**: 동기화된 staging 환경에서 변경을 검증한 뒤 보통 1분 미만의 짧은 중단으로 전환한다. 지원 엔진, 버전과 제한을 먼저 확인한다.

### Multi-AZ 상세

- 이 절은 **Multi-AZ DB instance** 기준이다. 다른 AZ에 **동기식 standby 1개**를 유지한다. 3개 AZ에 writer와 읽기 가능한 인스턴스를 두는 Multi-AZ DB cluster와 구분한다.
- Standby는 **읽기, 쓰기 불가** (예비 전용). 동기 복제 때문에 단일 AZ 대비 쓰기, 저장 지연이 다소 증가
- Single-AZ → Multi-AZ 전환 시 **다운타임은 없으나** 변환 중 성능 영향 가능
- 백업 시 기본 인스턴스의 I/O 영향은 엔진과 배포 유형에 따라 다르므로, 엔진별 백업 동작을 확인한다.
- **자동 Failover 트리거**
  - AZ 중단
  - 마스터 DB 인스턴스 오류
  - DB 인스턴스 서버 유형(인스턴스 클래스) 변경
  - 마스터 OS 소프트웨어 패치
  - 장애 조치 재부팅(Failover) 수동 실시

### Multi-AZ vs Read Replica — 혼동 포인트

| 구분 | Multi-AZ (Standby) | Read Replica |
|---|---|---|
| 목적 | HA, 자동 failover | 읽기 확장, DR |
| 복제 방식 | **동기** | **비동기** |
| 앱 접근 | 평상시 접근 불가 | 읽기 전용 엔드포인트 |
| 승격 | 자동 | 수동(독립 인스턴스로 승격 가능) |
| 추가 구성 | — | 엔진별로 Read Replica 자체의 Multi-AZ 지원 여부 확인. SQL Server는 Multi-AZ Read Replica 미지원 |

Read Replica 수는 엔진별로 다르다. MySQL, MariaDB, PostgreSQL과 SQL Server는 소스당 최대 15개, Oracle은 5개, Db2는 read-only와 standby를 합쳐 소스당 최대 3개다. 엔진 버전과 에디션별 지원 범위도 함께 확인한다.

## 출처

- [Amazon RDS, Amazon RDS DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.DBInstance.html)
- [Amazon RDS, Multi-AZ DB instance deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html)
- [Amazon RDS, Working with DB instance read replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [Amazon RDS for SQL Server, Working with read replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/SQLServer.ReadReplicas.html)
- [Amazon RDS for Db2, Working with replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/db2-replication.html)
- [Amazon RDS, Overview of Blue/Green Deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-overview.html)
