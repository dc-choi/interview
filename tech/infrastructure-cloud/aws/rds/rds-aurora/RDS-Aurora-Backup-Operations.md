---
tags: [infrastructure, aws, rds, aurora, managed-db, database, ncp, saa-c03]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS 백업과 복구", "RDS Proxy와 Enhanced Monitoring"]
---

# RDS 백업, 복구와 운영 보강

## 백업, 복구 — Automated Backup vs Snapshot

| 항목 | Automated Backup | Manual Snapshot |
|---|---|---|
| 대상 | DB 인스턴스 전체 | DB 인스턴스 전체 |
| 생성 | 매일 자동 | 자동, 수동 모두 가능 |
| 보존 기간 | **CLI 생성 시 1일 / 콘솔 7일** (1~35일, 0이면 비활성) | 만료 없음 |
| 복원 시점 | **PITR — 최근 5분 단위 임의 시점** | 스냅샷 캡쳐 시점만 |
| 복원 결과 | **새 DB 인스턴스** 생성 (기존 인스턴스 덮어쓰기 불가) | 동일 — 새 인스턴스 |
| 복사, 공유 | — | 다른 계정, 리전으로 복사, 공유, 마이그레이션 가능 |
| I/O 영향 | **단일 AZ**: 백업, 스냅샷 중 I/O 일시 중단 가능. **Multi-AZ**(MariaDB, MySQL, Oracle, PostgreSQL): 기본 AZ에서 I/O 중단 없음 (standby에서 수행) | 동일 |

## RDS Proxy 보강

- **Serverless**, Multi-AZ, Auto Scaling 내장
- Failover 시 standby로 바로 라우팅 → 장애 조치 체감 시간 단축
- **IAM 인증 강제** 가능, **퍼블릭 액세스 불가** (인터넷 직접 접근 차단)
- 지원: MySQL, PostgreSQL, MariaDB, Aurora
- Lambda 처럼 **연결이 빠르게 생성, 소멸**하는 워크로드에 특히 유효

## Enhanced Monitoring

- **인스턴스 내부 에이전트**가 지표 수집 (일반 모니터링은 **하이퍼바이저** 레벨에서 수집)
- 최소 **1초 단위** 수집 가능 — OS 레벨 프로세스, CPU, 메모리 세부 지표 확보
- CloudWatch Logs에 **30일간 보존**

## RDS vs EC2 자체 설치

- EC2 설치형: `my.cnf`, OS 튜닝, 확장 설치 자유, SSH 접속 가능. 단 백업, 패치, HA, 모니터링 **전부 직접 운영**
- RDS: 위 운영을 자동화하지만 SSH, OS 제어, 일부 확장 불가
