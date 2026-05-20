---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS", "Aurora", "Managed Database", "관리형 DB", "RDS vs Aurora"]
---

# 관리형 DB — AWS RDS · Aurora · 클라우드 DB

백업·패치·HA·장애 조치 같은 **DB 운영 작업을 클라우드 제공자가 자동화**해주는 서비스. 직접 설치·운영하는 대신 스펙·정책만 설정하면 되며, 개발자는 애플리케이션·쿼리에 집중할 수 있다.

## 관리형 DB가 자동화하는 작업

| 영역 | 직접 운영(Self-managed) | 관리형 DB |
|---|---|---|
| 설치·프로비저닝 | OS·DB 설치·버전 선택 | 콘솔 몇 번 클릭 |
| 백업 | 크론 스크립트·별도 백업 서버 | 자동 스냅샷·PITR |
| 장애 복구 | 수동 failover | 자동 standby 승격 |
| 패치·업그레이드 | 다운타임 계획·테스트 | 유지보수 윈도 자동 적용 |
| 모니터링 | Prometheus·Zabbix 구축 | 내장 대시보드 |
| 복제 | my.cnf 수동 구성 | 클릭 한 번에 Read Replica |

대신 **DB 인스턴스 SSH·OS 제어가 불가**하고 일부 확장 설치가 제약된다. 이 트레이드오프가 관리형 DB 채택의 핵심 판단점.

## AWS RDS

### DB Instance · Storage 구성

- **DB Instance**: 클라우드에서 격리되어 실행되는 DB 환경. 하나의 AZ에 격리되어 인스턴스로 동작. EC2처럼 다양한 클래스 선택(`db.m5`, `db.r5` 등)
- **지원 엔진**: MySQL · MariaDB · PostgreSQL · Oracle · MS SQL · Aurora
- **Instance Storage**: **EBS** 기반. 필요 시 여러 EBS 볼륨에 자동 분할 저장, **Storage Auto Scaling** 지원
- **스토리지 유형**
  - 범용 SSD(gp) — 대부분 워크로드의 기본값
  - 프로비저닝 IOPS(io1) — 일관적 저지연·고 I/O 요구
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
- **Read Replica**: 비동기 복제. 읽기 분산·재해 복구용. **수동 승격** 가능
- **Cross-Region Replica**: 리전 간 복제로 DR 구성
- **RDS Proxy**: Lambda·애플리케이션 앞단에 두어 커넥션 폭주 방어
- **Blue/Green Deployment**: 운영 DB와 동일한 복제본을 만들어 무중단 스키마 변경·버전 업그레이드

### Multi-AZ 상세

- 마스터에서 캡쳐한 스냅샷을 기반으로 다른 AZ에 **동기식 standby** 생성 → Active(AZ A) - Standby(AZ B, C) 구조
- Standby는 **읽기·쓰기 불가** (예비 전용). 동기 복제 때문에 단일 AZ 대비 쓰기·저장 지연이 다소 증가
- Single-AZ → Multi-AZ 전환 시 **다운타임은 없으나** 변환 중 성능 영향 가능
- standby가 **백업·스냅샷 작업을 대신 수행**해 마스터 부하를 덜어준다
- **자동 Failover 트리거**
  - AZ 중단
  - 마스터 DB 인스턴스 오류
  - DB 인스턴스 서버 유형(인스턴스 클래스) 변경
  - 마스터 OS 소프트웨어 패치
  - 장애 조치 재부팅(Failover) 수동 실시

### Multi-AZ vs Read Replica — 혼동 포인트

| 구분 | Multi-AZ (Standby) | Read Replica |
|---|---|---|
| 목적 | HA·자동 failover | 읽기 확장·DR |
| 복제 방식 | **동기** | **비동기** |
| 앱 접근 | 평상시 접근 불가 | 읽기 전용 엔드포인트 |
| 승격 | 자동 | 수동(독립 인스턴스로 승격 가능) |
| 추가 구성 | — | **Read Replica 자체에도 Multi-AZ 지정 가능** |

## 백업·복구 — Automated Backup vs Snapshot

| 항목 | Automated Backup | Manual Snapshot |
|---|---|---|
| 대상 | DB 인스턴스 전체 | DB 인스턴스 전체 |
| 생성 | 매일 자동 | 자동·수동 모두 가능 |
| 보존 기간 | **CLI 생성 시 1일 / 콘솔 7일** (1~35일, 0이면 비활성) | 만료 없음 |
| 복원 시점 | **PITR — 최근 5분 단위 임의 시점** | 스냅샷 캡쳐 시점만 |
| 복원 결과 | **새 DB 인스턴스** 생성 (기존 인스턴스 덮어쓰기 불가) | 동일 — 새 인스턴스 |
| 복사·공유 | — | 다른 계정·리전으로 복사·공유·마이그레이션 가능 |
| I/O 영향 | **단일 AZ**: 백업·스냅샷 중 I/O 일시 중단 가능. **Multi-AZ**(MariaDB·MySQL·Oracle·PostgreSQL): 기본 AZ에서 I/O 중단 없음 (standby에서 수행) | 동일 |

## RDS Proxy 보강

- **Serverless**, Multi-AZ·Auto Scaling 내장
- Failover 시 standby로 바로 라우팅 → 장애 조치 체감 시간 단축
- **IAM 인증 강제** 가능, **퍼블릭 액세스 불가** (인터넷 직접 접근 차단)
- 지원: MySQL · PostgreSQL · MariaDB · Aurora
- Lambda 처럼 **연결이 빠르게 생성·소멸**하는 워크로드에 특히 유효

## Enhanced Monitoring

- **인스턴스 내부 에이전트**가 지표 수집 (일반 모니터링은 **하이퍼바이저** 레벨에서 수집)
- 최소 **1초 단위** 수집 가능 — OS 레벨 프로세스·CPU·메모리 세부 지표 확보
- CloudWatch Logs에 **30일간 보존**

## RDS vs EC2 자체 설치

- EC2 설치형: `my.cnf`·OS 튜닝·확장 설치 자유, SSH 접속 가능. 단 백업·패치·HA·모니터링 **전부 직접 운영**
- RDS: 위 운영을 자동화하지만 SSH·OS 제어·일부 확장 불가

## Aurora — RDS와 무엇이 다른가

Amazon이 **MySQL·PostgreSQL 호환**으로 재설계한 클라우드 네이티브 DB. 기존 RDS와 **스토리지 아키텍처**가 근본적으로 다르다.

### 공유 스토리지 아키텍처

- 기존 RDS: 각 인스턴스(primary/replica)가 **독립 스토리지**에 복제
- Aurora: primary·replica 모두 **같은 분산 스토리지**를 참조
  - **6-way 복제(3 AZ × 2 복사본)** — 스토리지 레이어에서 처리
  - 읽기/쓰기 시 6개 사본 중 **일부만 사용**하여 가용성 확보 (쿼럼)
  - 스토리지 자체가 **최대 128 TB까지 자동 확장**
  - 오류를 스스로 감지·복구하는 **Self-healing** 내장
  - Replica는 데이터 복사 불필요 → **추가 비용↓·Lag ~ms**

### Aurora DB Cluster · Endpoints

- **클러스터** = 기본(writer) DB 인스턴스 + 읽기 복제본(reader) 인스턴스 묶음
- 읽기 복제본 **최대 15개**, 백업·스냅샷이 퍼포먼스에 영향 없음
- **Writer Endpoint** — 항상 마스터(writer) DB만 가리킴 (쓰기 트래픽 진입점)
- **Reader Endpoint** — 모든 읽기 복제본과 자동 연결, **부하 분산** 수행
- 마스터 장애 시 복제본으로 **자동 Failover**

### Aurora Auto Scaling

- 클러스터에 프로비저닝된 **Read Replica 수를 동적 조정**
- MySQL·PostgreSQL 모두 지원
- 트래픽 패턴에 맞춰 항상 적절한 replica 수 유지

### 주요 특장점

| 항목 | 설명 |
|---|---|
| **빠른 Replica 승격** | 공유 스토리지이므로 primary 장애 시 초~십여 초 내 자동 승격 |
| **Replica Lag 최소화** | 보통 100ms 이하. 일반 RDS는 수 초까지 튈 수 있음 |
| **Aurora Global Database** | 1개 기본 리전 + **보조 리전 최대 5개**. RPO ~1초, RTO 1분 미만. 기본 리전 장애 시 보조 리전을 기본으로 승격 |
| **Aurora Serverless v2** | 초 단위 오토스케일, idle 시 낮은 비용. 가변 워크로드용 |
| **Backtrack** (MySQL) | 언두(undo) 스타일의 72시간 내 시간 되돌리기 |
| **Aurora Limitless Database** | 자동 샤딩으로 페타바이트 규모 + 초당 수백만 쓰기 트랜잭션. 2023 re:Invent 발표 |

### 언제 RDS 대신 Aurora를 고르나

- 읽기 트래픽이 많고 Lag에 민감한 서비스
- Multi-AZ + 다수 Read Replica 구성이 필요한 프로덕션
- 초단위 오토스케일이 필요한 SaaS(Aurora Serverless)
- 비용: 인스턴스 단가는 Aurora가 비싸지만 **스토리지·I/O·Replica 구성 총비용**은 낮은 경우가 많음

## 기타 클라우드의 관리형 MySQL — NCP 예

네이버클라우드(NCP)의 **Cloud DB for MySQL**은 AWS RDS에 대응하는 국내 관리형 MySQL 서비스.

| 항목 | NCP Cloud DB for MySQL |
|---|---|
| 자동화 | 설치·백업·패치·장애 복구 자동 |
| HA | **Standby Master**로 동기 이중화 (AWS Multi-AZ와 유사) |
| 읽기 분산 | **Read Slave** 구성 지원 |
| 모니터링 | 콘솔 내장 대시보드·알람 |
| 차별점 | 국내 리전·한국어 서포트·공공/금융 컴플라이언스 요구 대응 |

개념은 AWS RDS와 거의 동일(**Primary + Standby + Read Slave**). 선택 기준은 **지리적 위치·컴플라이언스·기존 인프라 통합·가격**으로 갈린다.

## 관리형 DB 선택 기준

- **규제·데이터 주권**: 국내 공공·금융은 NCP·KT 같은 국내 클라우드가 선호됨
- **생태계 통합**: AWS 전반을 쓴다면 RDS/Aurora가 Lambda·S3·IAM과 바로 연결
- **성능·스케일**: 읽기 부하가 크면 Aurora, 표준 요구면 RDS/NCP
- **비용**: 작은 워크로드는 RDS가 저렴, 대규모·고가용성은 Aurora가 총비용↓가 될 수 있음
- **운영 숙련도**: 팀이 my.cnf까지 건드려야 하면 Self-managed, 기능이 충분하면 관리형

## 흔한 함정

- **자동 백업만 믿고 DR 리허설 안 함** — 복구 속도·데이터 손실 허용량(RTO·RPO) 모름
- **Maintenance Window를 프로덕션 피크 시간에 설정** — 의도치 않은 재시작
- **Read Replica로 read-after-write 가정** — 비동기 복제 Lag 무시 (→ [[Read-Replica-Routing|Read Replica 라우팅]])
- **파라미터 그룹 기본값 사용** — 기본값이 워크로드에 안 맞는 경우 많음
- **Security Group을 0.0.0.0/0에 노출** — 반드시 VPC·SG로 제한 (→ [[RDS-Security-Group|RDS Security Group]])
- **Snapshot으로 기존 인스턴스 덮어쓰기 시도** — 복원은 항상 새 인스턴스 생성

## 시험 체크포인트 (SAA-C03)

- 관리형 DB가 자동화하는 **운영 영역**과 SSH·OS 제어 제약
- **Multi-AZ vs Read Replica** 차이 (동기·비동기, HA·확장, 자동·수동 승격)
- Multi-AZ **Failover 트리거 5가지** (AZ 중단·마스터 오류·인스턴스 유형 변경·OS 패치·수동 재부팅)
- **Automated Backup vs Snapshot** — 보존기간·복원 시점·만료 여부·복원 결과
- 백업·스냅샷 중 **단일 AZ는 I/O 중단**, Multi-AZ는 기본 AZ I/O 영향 없음
- PITR — 최근 **5분 단위** 임의 시점 복구
- Read Replica 수 한계(엔진별 15 / Oracle 5)
- **RDS Proxy + Lambda** 조합과 IAM 인증·퍼블릭 액세스 불가
- **Enhanced Monitoring** — 에이전트 vs 하이퍼바이저, 1초 단위, CW Logs 30일
- **RDS vs Aurora** 선택 기준과 공유 스토리지의 이점 (6-way · 128 TB · self-healing)
- Aurora **Writer / Reader Endpoint**의 역할 분리
- Aurora Global Database — 보조 리전 최대 5개, RPO 1초·RTO 1분 미만
- Blue/Green Deployment를 이용한 무중단 스키마 변경
- 국내 클라우드(NCP·KT)를 선택해야 하는 상황과 AWS와의 차이점

## 출처
- [AWS RDS Read Replicas — 공식 문서](https://aws.amazon.com/ko/rds/features/read-replicas/)
- [NCP Cloud DB for MySQL](https://www.ncloud.com/product/database/cloudDbMysql)
- [AWS SAA C03 학습 자료 — SAA #7 RDS-1](/Users/dc-choi/Downloads/AWS%20SAA%20C03%20시험%20핵심%20서비스%20주요%20개념/SAA%20%237,%20RDS%20-%201.pdf)
- [AWS SAA C03 학습 자료 — SAA #8 RDS-2](/Users/dc-choi/Downloads/AWS%20SAA%20C03%20시험%20핵심%20서비스%20주요%20개념/SAA%20%238,%20RDS%20-%202.pdf)
- [AWS SAA C03 학습 자료 — SAA #9 Amazon Aurora](/Users/dc-choi/Downloads/AWS%20SAA%20C03%20시험%20핵심%20서비스%20주요%20개념/SAA%20%239,%20Amazon%20Aurora.pdf)

## 관련 문서
- [[Replication|Replication (sync/async, Binary Log)]]
- [[Read-Replica-Routing|Read Replica 라우팅 (앱 레이어 전략)]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[AWS-Lambda|AWS Lambda + RDS Proxy]]
- [[Cloud-Service-Models|IaaS·PaaS·FaaS 모델]]
