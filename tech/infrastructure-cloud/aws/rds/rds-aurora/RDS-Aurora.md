---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: index
category: "Infrastructure - AWS"
aliases: ["RDS Overview", "Aurora", "Managed Database", "관리형 DB", "RDS vs Aurora"]
---

# 관리형 DB — AWS RDS, Aurora, 클라우드 DB

백업, 패치, HA, 장애 조치 같은 **DB 운영 작업을 클라우드 제공자가 자동화**해주는 서비스. 직접 설치, 운영하는 대신 스펙, 정책만 설정하면 되며, 개발자는 애플리케이션, 쿼리에 집중할 수 있다.

- [[RDS-Aurora-RDS-Core|관리형 DB가 자동화하는 작업과 AWS RDS 핵심 — 인스턴스와 스토리지, Multi-AZ, Read Replica]]
- [[RDS-Aurora-Backup-Operations|백업과 복구(Automated Backup vs Snapshot), RDS Proxy, Enhanced Monitoring, EC2 자체 설치 비교]]
- [[RDS-Aurora-Architecture|Aurora 공유 스토리지 아키텍처와 클러스터 엔드포인트, 특장점, RDS 대신 고르는 기준]]
- [[RDS-Aurora-Graviton|Graviton(ARM) 인스턴스 전환 — 세대별 비교(R6g/R5, R7g/R6i), 벤치마크 한계, 실서비스 쿼리 검증, Aurora MySQL 2.10+]]
- [[RDS-Aurora-Endpoints|Endpoint 운영 (Writer/Reader/Custom/Instance, Reader Endpoint 함정과 Writer 폴백, Custom Endpoint 워크로드 격리, Failover read-only + AWS Advanced JDBC Wrapper)]]
- [[RDS-Aurora-AutoScaling|Auto Scaling 운영 (Custom Metric으로 배치 제외, Target Tracking vs Step Scaling, Flapping, Cooldown, Scale-out/in 커넥션 풀, Cache Warming)]]
- [[RDS-Aurora-Selection-Exam|NCP 등 타 클라우드 비교, 관리형 DB 선택 기준, 흔한 함정, SAA-C03 체크포인트]]

## 관련 문서

운영/연결/마이그레이션 패밀리: [[RDS-Connection-Credentials|연결과 자격증명]], [[RDS-Operational-Pitfalls|운영 함정 빅7]], [[RDS-Operational-Pitfalls-Rare|저빈도 함정]], [[RDS-Migration-Scenarios|마이그레이션 시나리오]], [[RDS-Zero-Downtime-Migration|무중단 마이그레이션]], [[RDS-Monitoring|모니터링]]

- [[Replication|Replication (sync/async, Binary Log)]]
- [[Read-Replica-Routing|Read Replica 라우팅 (앱 레이어 전략)]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[RDS-Security-Group|RDS Security Group 구성]]
- [[AWS-Lambda|AWS Lambda + RDS Proxy]]
- [[Cloud-Service-Models|IaaS, PaaS, FaaS 모델]]
