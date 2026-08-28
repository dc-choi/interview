---
tags: [infrastructure, aws, ec2, compute, cost]
status: done
verified_at: 2026-08-28
category: "Infrastructure - AWS"
aliases: ["EC2 비용 모델", "Savings Plans, Spot, Capacity Reservations"]
---

# AWS EC2 — 비용 모델

## 구매 옵션

| 모델 | 비용 조건 | 적합 |
|------|------|------|
| On-Demand | 장기 약정 없는 사용량 기반 요금 | 단기, 예측 불가 |
| Reserved Instances (1, 3년) | 유형, 기간과 결제 방식에 따른 할인 | 안정적 24/7 워크로드 |
| **Savings Plans** (Compute, EC2) | 시간당 사용 금액 약정, plan과 기간에 따른 할인 | 유연한 약정 — 상세는 [[AWS-Cost-Optimization]] |
| **Spot** | 여유 capacity의 변동 가격 | 중단 허용 배치, stateless |
| Dedicated Host | premium | 라이선스 BYOL, 컴플라이언스 |

Spot은 AWS 여유 capacity를 쓰는 모델이다. 중단 notice는 일반적으로 stop 또는 terminate 약 2분 전에 제공되지만 전달을 보장된 checkpoint로 가정하지 않는다. fault-tolerant workload에서 상태 저장과 재시작을 설계한다.

## On-Demand Capacity Reservations

특정 AZ에 **EC2 용량을 사전 예약**하는 옵션 (구매 약정 별개).

- **즉시 시작** — 기간 약정 없이 수정, 취소 가능
- **미래 시작** — 시작 시점과 최소 유지 기간을 약정하며, 약정 기간 중 취소하면 비용이 발생할 수 있음
- 예약된 용량은 다른 사용자에게 할당되지 않음 — **용량 부족(Insufficient Capacity) 회피**
- 사용 여부와 무관하게 **예약된 용량에 대해 On-Demand 요금 청구**
- 조건이 맞는 Savings Plans와 Regional Reserved Instances 할인은 적용될 수 있지만, Zonal Reserved Instances 할인은 Capacity Reservation에 적용되지 않음
- 적합: 재해 복구 사이트, 분기 결산, 이벤트성 대용량 처리, 특정 AZ 용량 보장 필요

비교: **Savings Plans**는 비용 약정으로 할인만, **Capacity Reservations**는 용량 확보 목적. 둘은 직교 개념.

## 관련 문서
- [[EC2|AWS EC2 (목차)]]
- [[EC2-Compute|컴퓨트 아키텍처]]
- [[EC2-Checkpoints|흔한 실수와 체크포인트]]

## 출처

- [Amazon EC2 pricing](https://aws.amazon.com/ec2/pricing/)
- [Amazon EC2 Reserved Instances pricing](https://aws.amazon.com/ec2/pricing/reserved-instances/pricing/)
- [Amazon EC2 Spot interruptions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html)
- [Amazon EC2, On-Demand Capacity Reservations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-capacity-reservations.html)
- [Amazon EC2, Capacity Reservation pricing and billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-reservations-pricing-billing.html)
