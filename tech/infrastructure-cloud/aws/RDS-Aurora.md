---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp]
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

대신 **커널 접근·OS 레벨 튜닝·일부 확장 설치**가 제약된다. 이 트레이드오프가 관리형 DB 채택의 핵심 판단점.

## AWS RDS

### 지원 엔진과 Read Replica 한계

| 엔진 | 최대 Read Replica |
|---|---|
| MySQL / MariaDB / PostgreSQL / SQL Server | **15개** |
| Oracle | **5개** |
| Aurora (MySQL/PostgreSQL 호환) | **15개** (공유 스토리지 기반) |

### 핵심 기능

- **Multi-AZ**: 다른 가용영역에 동기 복제 standby. 장애 시 자동 failover (보통 1~2분)
- **자동 백업 + PITR**: 초 단위 시점 복구(Point-In-Time Recovery)
- **Read Replica**: 비동기 복제. 읽기 분산·재해 복구용. **수동 승격** 가능
- **Cross-Region Replica**: 리전 간 복제로 DR 구성
- **RDS Proxy**: Lambda·애플리케이션 앞단에 두어 커넥션 폭주 방어
- **Blue/Green Deployment**: 운영 DB와 동일한 복제본을 만들어 무중단 스키마 변경·버전 업그레이드

### Multi-AZ vs Read Replica — 혼동 포인트

| 구분 | Multi-AZ (Standby) | Read Replica |
|---|---|---|
| 목적 | HA·자동 failover | 읽기 확장·DR |
| 복제 방식 | **동기** | **비동기** |
| 앱 접근 | 평상시 접근 불가 | 읽기 전용 엔드포인트 |
| 승격 | 자동 | 수동 |

## Aurora — RDS와 무엇이 다른가

Amazon이 **MySQL·PostgreSQL 호환**으로 재설계한 클라우드 네이티브 DB. 기존 RDS와 **스토리지 아키텍처**가 근본적으로 다르다.

### 공유 스토리지 아키텍처

- 기존 RDS: 각 인스턴스(primary/replica)가 **독립 스토리지**에 복제
- Aurora: primary·replica 모두 **같은 분산 스토리지**를 참조
  - 6-way 복제(3 AZ × 2 복사본) — 스토리지 레이어에서 처리
  - Replica는 데이터 복사 불필요 → **추가 비용↓·Lag ~ms**

### 주요 특장점

| 항목 | 설명 |
|---|---|
| **빠른 Replica 승격** | 공유 스토리지이므로 primary 장애 시 초~십여 초 내 자동 승격 |
| **Replica Lag 최소화** | 보통 100ms 이하. 일반 RDS는 수 초까지 튈 수 있음 |
| **Aurora Global Database** | 리전 간 <1초 복제, DR RTO 1분 |
| **Aurora Serverless v2** | 초 단위 오토스케일, idle 시 낮은 비용 |
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

## 면접 체크포인트

- 관리형 DB가 자동화하는 **운영 영역**을 구체적으로 나열할 수 있는가
- **Multi-AZ vs Read Replica** 차이 (동기·비동기, HA·확장)
- **RDS vs Aurora** 선택 기준과 공유 스토리지의 이점
- Replica 수 한계(RDS 15 / Oracle 5)와 왜 그 값인지
- Blue/Green Deployment를 이용한 무중단 스키마 변경
- 국내 클라우드(NCP·KT)를 선택해야 하는 상황과 AWS와의 차이점

## 출처
- [AWS RDS Read Replicas — 공식 문서](https://aws.amazon.com/ko/rds/features/read-replicas/)
- [NCP Cloud DB for MySQL](https://www.ncloud.com/product/database/cloudDbMysql)

## 관련 문서
- [[Replication|Replication (sync/async, Binary Log)]]
- [[Read-Replica-Routing|Read Replica 라우팅 (앱 레이어 전략)]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[AWS-Lambda|AWS Lambda + RDS Proxy]]
- [[Cloud-Service-Models|IaaS·PaaS·FaaS 모델]]
