---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["관리형 DB 선택 기준", "RDS SAA-C03 체크포인트"]
---

# 관리형 DB 선택 기준과 시험 체크포인트

## 기타 클라우드의 관리형 MySQL — NCP 예

네이버클라우드(NCP)의 **Cloud DB for MySQL**은 AWS RDS에 대응하는 국내 관리형 MySQL 서비스.

| 항목 | NCP Cloud DB for MySQL |
|---|---|
| 자동화 | 설치, 백업, 패치, 장애 복구 자동 |
| HA | **Standby Master**로 동기 이중화 (AWS Multi-AZ와 유사) |
| 읽기 분산 | **Read Slave** 구성 지원 |
| 모니터링 | 콘솔 내장 대시보드, 알람 |
| 차별점 | 국내 리전, 한국어 서포트, 공공/금융 컴플라이언스 요구 대응 |

개념은 AWS RDS와 거의 동일(**Primary + Standby + Read Slave**). 선택 기준은 **지리적 위치, 컴플라이언스, 기존 인프라 통합, 가격**으로 갈린다.

## 관리형 DB 선택 기준

- **규제, 데이터 주권**: 국내 공공, 금융은 NCP, KT 같은 국내 클라우드가 선호됨
- **생태계 통합**: AWS 전반을 쓴다면 RDS/Aurora가 Lambda, S3, IAM과 바로 연결
- **성능, 스케일**: 읽기 부하가 크면 Aurora, 표준 요구면 RDS/NCP
- **비용**: 작은 워크로드는 RDS가 저렴, 대규모, 고가용성은 Aurora가 총비용↓가 될 수 있음
- **운영 숙련도**: 팀이 my.cnf까지 건드려야 하면 Self-managed, 기능이 충분하면 관리형

## 흔한 함정

- **자동 백업만 믿고 DR 리허설 안 함** — 복구 속도, 데이터 손실 허용량(RTO, RPO) 모름
- **Maintenance Window를 프로덕션 피크 시간에 설정** — 의도치 않은 재시작
- **Read Replica로 read-after-write 가정** — 비동기 복제 Lag 무시 (→ [[Read-Replica-Routing|Read Replica 라우팅]])
- **파라미터 그룹 기본값 사용** — 기본값이 워크로드에 안 맞는 경우 많음
- **Security Group을 0.0.0.0/0에 노출** — 반드시 VPC, SG로 제한 (→ [[RDS-Security-Group|RDS Security Group]])
- **Snapshot으로 기존 인스턴스 덮어쓰기 시도** — 복원은 항상 새 인스턴스 생성

## 시험 체크포인트 (SAA-C03)

- 관리형 DB가 자동화하는 **운영 영역**과 SSH, OS 제어 제약
- **Multi-AZ vs Read Replica** 차이 (동기, 비동기, HA, 확장, 자동, 수동 승격)
- Multi-AZ **Failover 트리거 5가지** (AZ 중단, 마스터 오류, 인스턴스 유형 변경, OS 패치, 수동 재부팅)
- **Automated Backup vs Snapshot** — 보존기간, 복원 시점, 만료 여부, 복원 결과
- 백업, 스냅샷 중 **단일 AZ는 I/O 중단**, Multi-AZ는 기본 AZ I/O 영향 없음
- PITR — 최근 **5분 단위** 임의 시점 복구
- Read Replica 수 한계(엔진별 15 / Oracle 5)
- **RDS Proxy + Lambda** 조합과 IAM 인증, 퍼블릭 액세스 불가
- **Enhanced Monitoring** — 에이전트 vs 하이퍼바이저, 1초 단위, CW Logs 30일
- **RDS vs Aurora** 선택 기준과 공유 스토리지의 이점 (6-way, 128 TB, self-healing)
- Aurora **Writer / Reader Endpoint**의 역할 분리
- Aurora Global Database — 보조 리전 최대 5개, RPO 1초, RTO 1분 미만
- Blue/Green Deployment를 이용한 무중단 스키마 변경
- 국내 클라우드(NCP, KT)를 선택해야 하는 상황과 AWS와의 차이점

## 출처
- [AWS RDS Read Replicas — 공식 문서](https://aws.amazon.com/ko/rds/features/read-replicas/)
- [NCP Cloud DB for MySQL](https://www.ncloud.com/product/database/cloudDbMysql)
- [Amazon RDS 사용 설명서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html)
- [Amazon Aurora 사용 설명서](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html)
