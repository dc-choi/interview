---
tags: [infrastructure, aws, ec2, compute, cost]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 비용 모델", "Savings Plans, Spot, Capacity Reservations"]
---

# AWS EC2 — 비용 모델

## 구매 옵션

| 모델 | 할인 | 적합 |
|------|------|------|
| On-Demand | 0% | 단기, 예측 불가 |
| Reserved Instances (1, 3년) | ~30-60% | 안정적 24/7 워크로드 |
| **Savings Plans** (Compute, EC2) | ~30-66% | 유연한 약정 (RI 후속) |
| **Spot** | ~70-90% | 중단 허용 배치, stateless |
| Dedicated Host | premium | 라이선스 BYOL, 컴플라이언스 |

Spot은 AWS 여유 용량을 빌리는 모델 — 2분 통보 후 회수. fault-tolerant 워크로드(배치, ML 학습, ECS Spot)에 한정.

## On-Demand Capacity Reservations

특정 AZ에 **EC2 용량을 사전 예약**하는 옵션 (구매 약정 별개).

- **약정 없음** — 원하는 기간만 예약하고 해제 가능
- 예약된 용량은 다른 사용자에게 할당되지 않음 — **용량 부족(Insufficient Capacity) 회피**
- 사용 여부와 무관하게 **예약된 용량에 대해 On-Demand 요금 청구**
- Reserved Instances, Savings Plans 할인과 **결합 가능**
- 적합: 재해 복구 사이트, 분기 결산, 이벤트성 대용량 처리, 특정 AZ 용량 보장 필요

비교: **Savings Plans**는 비용 약정으로 할인만, **Capacity Reservations**는 용량 확보 목적. 둘은 직교 개념.

## 관련 문서
- [[EC2|AWS EC2 (목차)]]
- [[EC2-Compute|컴퓨트 아키텍처]]
- [[EC2-Checkpoints|흔한 실수와 체크포인트]]
