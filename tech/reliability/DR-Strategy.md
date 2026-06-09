---
tags: [reliability, disaster-recovery, multi-region, rto, rpo, high-availability]
status: done
category: "안정성엔지니어링(Reliability)"
aliases: ["DR Strategy", "재해 복구 전략", "Disaster Recovery", "multi-region DR", "pilot light", "warm standby"]
---

# DR 전략 (Disaster Recovery)

DR은 **리전이나 사이트 단위 재해**에서 서비스를 복구하는 계획이다. 단일 인스턴스 장애를 막는 HA(Multi-AZ)와 다른 층위다. 선택은 결국 **RTO, RPO를 비용과 맞바꾸는** 문제다. 모든 서비스가 active-active일 필요는 없다.

## 4가지 전략 — 싸고 느림에서 비싸고 빠름까지

| 전략 | RTO | RPO | 비용 | 설명 |
|---|---|---|---|---|
| **Backup & Restore** | 수 시간 | 수 시간 | 최저 | 다른 리전에 백업만. 재해 시 복원, 재프로비저닝 |
| **Pilot Light** | 수십 분 | 분 | 낮음 | DB만 DR 리전에 복제(최소 가동), 나머지는 꺼둠 → 재해 시 기동 |
| **Warm Standby** | 분 | 초 | 중간 | 축소된 전체 스택이 DR에 상시 가동 → 재해 시 스케일업 |
| **Multi-site Active/Active** | ~0 | ~0 | 최고 | 여러 리전이 동시에 트래픽 처리. 가장 복잡 |

핵심 직관: **데이터를 미리 복제해 둘수록 RPO가 줄고(손실↓), 컴퓨팅을 미리 띄워 둘수록 RTO가 준다(복구↓)**. 둘 다 미리 할수록 비싸진다.

## 구성 요소

- **데이터 복제**: 크로스 리전 Read Replica 승격, **Aurora Global Database**(RPO ~1초, RTO 1분 미만), S3 CRR, DynamoDB Global Table. 상태가 있는 데이터를 어떻게 다른 리전에 두느냐가 RPO를 결정한다. [[RDS-Aurora]], [[RDS-Migration-Scenarios]]
- **트래픽 전환**: Route 53 헬스체크 기반 DNS failover. **TTL을 낮춰둬야** 전환이 빠르다([[RDS-Zero-Downtime-Migration|엔드포인트 전환]]).
- **재프로비저닝**: 인프라를 코드로(IaC) 두어 DR 리전에 동일하게 재현. 수동 구성은 재해 때 못 따라간다.
- **런북 + 정기 DR 드릴**: 절차 문서화 + 주기적 실제 전환 훈련. 안 돌려본 DR은 작동하지 않는다.

## 전략 선택

비즈니스가 요구하는 RTO/RPO와 비용 허용치로 정한다. 결제/주문 같은 핵심은 Warm Standby 이상, 분석/배치 같은 비핵심은 Backup & Restore로 차등한다. "전부 active-active"는 대부분 과투자다.

## 흔한 함정

- **DR을 한 번도 드릴 안 함** — 진짜 재해 때 처음 돌려보다 실패
- **리전 간 설정 드리프트** — DR 리전 구성이 운영과 어긋나 전환 실패
- **상태 데이터 미복제** — 컴퓨팅만 이중화하고 DB/캐시/세션을 안 옮김
- **DNS TTL이 높음** — 전환해도 옛 리전으로 트래픽이 한참 감
- **리전별 의존성 누락** — KMS 키, Secrets, ACM 인증서는 리전마다 따로 필요

## 면접 체크포인트

- DR(리전 재해)과 HA(Multi-AZ)의 층위 차이
- 4가지 전략과 RTO/RPO/비용 트레이드오프, "데이터 복제 = RPO, 컴퓨팅 상시화 = RTO"
- Aurora Global Database의 RPO/RTO와 크로스 리전 복제본 승격
- Route 53 헬스체크 failover와 TTL의 역할
- DR 드릴과 설정 드리프트, 리전별 KMS/Secrets 의존성

## 출처

- [AWS — Disaster recovery options in the cloud (4 strategies)](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [AWS — Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraGlobalDatabase.html)

## 관련 문서

- [[Backup-Restore|백업과 복원 (RTO/RPO, PITR)]]
- [[RDS-Aurora|RDS / Aurora (Global Database, Multi-AZ)]]
- [[RDS-Migration-Scenarios|RDS 마이그레이션 (크로스 리전 복제본)]]
- [[RDS-Zero-Downtime-Migration|무중단 컷오버 (엔드포인트 전환, TTL)]]
- [[Route53|Route 53 (헬스체크 DNS failover)]]
