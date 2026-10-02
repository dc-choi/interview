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

표의 시간은 전략의 상대적 차이를 이해하는 예시이며 제품 SLA나 달성 보장이 아니다. 실제 RTO/RPO는 데이터 크기, 복제 방식, 의존성, 탐지와 전환 절차로 달라진다. Active/Active도 삭제와 논리 손상이 여러 리전에 퍼지면 이전 백업으로 복구해야 하므로 RPO 0을 보장하지 않는다.

핵심 직관: **데이터를 미리 복제해 둘수록 RPO가 줄고(손실↓), 컴퓨팅을 미리 띄워 둘수록 RTO가 준다(복구↓)**. 둘 다 미리 할수록 비싸진다.

## 구성 요소

- **데이터 복제**: 크로스 리전 Read Replica 승격, **Aurora Global Database**, S3 CRR, DynamoDB Global Table. Aurora의 계획된 switchover는 정상 클러스터를 먼저 동기화해 RPO 0을 제공하지만, 비계획 failover는 장애 당시 리전 간 복제 지연만큼 손실이 생길 수 있다. DB 승격 시간과 전체 서비스 복구 시간도 구분한다. [[RDS-Aurora]], [[RDS-Migration-Scenarios]]
- **트래픽 전환**: Route 53 헬스체크 기반 DNS failover. **TTL을 낮춰둬야** 전환이 빠르다([[RDS-Zero-Downtime-Migration|엔드포인트 전환]]).
- **재프로비저닝**: 인프라를 코드로(IaC) 두어 DR 리전에 동일하게 재현. 수동 구성은 재해 때 못 따라간다.
- **런북 + 정기 DR 드릴**: 절차 문서화 + 주기적 실제 전환 훈련. 안 돌려본 DR은 작동하지 않는다.

## 전략 선택

비즈니스가 요구하는 RTO/RPO, 중단과 손실의 비용 및 운영 역량으로 정한다. 결제나 주문이라는 도메인 이름만으로 Warm Standby 이상을 필수로 정하지 않는다. 선택한 전략이 실제 거래 복구와 정합성 목표를 충족하는지 드릴로 확인한다.

## 흔한 함정

- **DR을 한 번도 드릴 안 함** — 진짜 재해 때 처음 돌려보다 실패
- **리전 간 설정 드리프트** — DR 리전 구성이 운영과 어긋나 전환 실패
- **상태 데이터 미복제** — 컴퓨팅만 이중화하고 DB/캐시/세션을 안 옮김
- **DNS TTL이 높음** — 전환해도 옛 리전으로 트래픽이 한참 감
- **리전별 의존성 누락** — KMS 키, Secrets, ACM 인증서는 리전마다 따로 필요
- **복제본을 백업으로 오해** — 잘못된 쓰기나 삭제도 복제되므로 이전 시점의 독립 백업과 복원 경로를 유지한다.
- **전환 후 쓰기 충돌** — 옛 리전의 쓰기를 차단하고 새 writer, DNS 캐시와 연결 풀을 확인한다. 복귀(failback) 때도 변경 데이터를 정합하게 합치는 절차를 별도로 검증한다.
- **복구 리전의 용량 부족** — 서비스 quota, 실제 확보 가능한 용량과 스케일업 의존성을 사전에 확인한다.

## 면접 체크포인트

- DR(리전 재해)과 HA(Multi-AZ)의 층위 차이
- 4가지 전략과 RTO/RPO/비용 트레이드오프, "데이터 복제 = RPO, 컴퓨팅 상시화 = RTO"
- Aurora Global Database의 RPO/RTO와 크로스 리전 복제본 승격
- Route 53 헬스체크 failover와 TTL의 역할
- DR 드릴과 설정 드리프트, 리전별 KMS/Secrets 의존성

## 출처

2026-10-02에는 전략별 시간 예시의 한계, 백업과 복제의 구분 및 Aurora switchover/failover 계약을 대조했다. 특정 서비스가 표의 목표를 달성했다는 운영 검증은 아니다.

- [Amazon Aurora — Using switchover or failover in Amazon Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html)
- [AWS — Disaster recovery options in the cloud (4 strategies)](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [AWS — Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)

## 관련 문서

- [[Backup-Restore|백업과 복원 (RTO/RPO, PITR)]]
- [[RDS-Aurora|RDS / Aurora (Global Database, Multi-AZ)]]
- [[RDS-Migration-Scenarios|RDS 마이그레이션 (크로스 리전 복제본)]]
- [[RDS-Zero-Downtime-Migration|무중단 컷오버 (엔드포인트 전환, TTL)]]
- [[Route53|Route 53 (헬스체크 DNS failover)]]
