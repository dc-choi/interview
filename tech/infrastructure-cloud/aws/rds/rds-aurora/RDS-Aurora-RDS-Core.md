---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS 핵심 기능", "Multi-AZ vs Read Replica"]
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
- **지원 엔진**: MySQL, MariaDB, PostgreSQL, Oracle, MS SQL, Aurora
- **Instance Storage**: **EBS** 기반. 필요 시 여러 EBS 볼륨에 자동 분할 저장, **Storage Auto Scaling** 지원
- **스토리지 유형**
  - 범용 SSD(gp) — 대부분 워크로드의 기본값
  - 프로비저닝 IOPS(io1) — 일관적 저지연, 고 I/O 요구
  - 마그네틱 — 접속 빈도 낮은 워크로드용 레거시

### 지원 엔진과 Read Replica 한계

| 엔진 | 최대 Read Replica |
|---|---|
| MySQL / MariaDB / PostgreSQL / SQL Server | **15개** |
| Oracle | **5개** |
| Aurora (MySQL/PostgreSQL 호환) | **15개** (공유 스토리지 기반) |

### 핵심 기능

- **Multi-AZ**: 다른 AZ에 동기 복제 standby. 장애 시 자동 failover (보통 1~2분), 단일 DNS 네임 공유
- **자동 백업 + PITR**: 초 단위 시점 복구(Point-In-Time Recovery)
- **Read Replica**: 비동기 복제. 읽기 분산, 재해 복구용. **수동 승격** 가능
- **Cross-Region Replica**: 리전 간 복제로 DR 구성
- **RDS Proxy**: Lambda, 애플리케이션 앞단에 두어 커넥션 폭주 방어
- **Blue/Green Deployment**: 운영 DB와 동일한 복제본을 만들어 무중단 스키마 변경, 버전 업그레이드

### Multi-AZ 상세

- 마스터에서 캡쳐한 스냅샷을 기반으로 다른 AZ에 **동기식 standby** 생성 → Active(AZ A) - Standby(AZ B, C) 구조
- Standby는 **읽기, 쓰기 불가** (예비 전용). 동기 복제 때문에 단일 AZ 대비 쓰기, 저장 지연이 다소 증가
- Single-AZ → Multi-AZ 전환 시 **다운타임은 없으나** 변환 중 성능 영향 가능
- standby가 **백업, 스냅샷 작업을 대신 수행**해 마스터 부하를 덜어준다
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
| 추가 구성 | — | **Read Replica 자체에도 Multi-AZ 지정 가능** |
