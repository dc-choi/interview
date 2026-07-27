---
tags: [finops, aws, autoscaling, cost, spot, warm-pool, ecs, hpa]
status: done
category: "비용&운영(FinOps)"
aliases: ["Autoscaling Cost", "Autoscaling 비용 최적화", "오토스케일링 비용", "scaling cost"]
---

# 오토스케일링 비용 최적화

오토스케일링은 본래 **가용성 도구이자 비용 도구**다. 트래픽에 맞춰 용량을 늘리고 줄여 **유휴 자원을 없앤다**. 하지만 잘못 튜닝하면 과도한 스케일아웃으로 오히려 돈을 태운다. 핵심은 "필요할 때만 켜고, 안 쓰면 빠르게 끄되, 깜빡임은 막는" 균형이다. [[Auto-Scaling]]

## 스케일링 정책별 비용 성격

| 정책 | 동작 | 비용 관점 |
|---|---|---|
| **Target Tracking** | 목표 지표(CPU 50%) 유지 | 기본, 단순. 목표를 낮게 잡으면 과프로비저닝 |
| **Step Scaling** | 임계 구간별 증감 | 급변 트래픽에 세밀 대응 |
| **Scheduled** | 시간표 기반 | **예측 가능한 패턴**(업무시간, 야간 축소)에 최적 |
| **Predictive** | ML 예측 선제 증설 | 주기적 피크에 콜드스타트 회피 |

## 비용을 좌우하는 튜닝 포인트

- **Scale-in을 적극적으로**: 늘리는 건 빠르게, **줄이는 걸 주저하면 유휴 비용**이 쌓인다. 단 너무 공격적이면 깜빡임(flapping).
- **쿨다운/안정화 창**: 짧은 스파이크에 매번 증설하지 않게.
- **최소 용량 최소화**: min capacity를 트래픽 하한에 맞춰 야간 유휴 제거.
- **단위 인스턴스 right-sizing**: 스케일 단위 자체가 과대하면 한 칸 늘릴 때마다 낭비. [[Resource-Right-Sizing]]

## Spot + 약정 혼합

오토스케일링의 비용 효과는 **구매 모델과 결합**할 때 극대화된다.

- **기저 부하 = On-Demand + Savings Plans**, 변동 피크 = **Spot**. [[Reserved-Instance]]
- ASG **Mixed Instances Policy**로 On-Demand/Spot 비율과 인스턴스 타입 다양화 → 중단 위험 분산 + 단가↓. [[AWS-Cost-Optimization|Jenkins on Spot 사례]]
- **Warm Pool**: 미리 초기화한 인스턴스를 정지 상태로 대기 → 스케일아웃 지연/콜드스타트 비용 절감(정지 인스턴스는 EBS만 과금).

## 컨테이너/서버리스

- **ECS Service Auto Scaling**: 태스크 수를 지표로 조절. [[ECS-Service-AutoScaling]]
- **K8s HPA/Cluster Autoscaler/Karpenter**: 파드 + 노드 동시 스케일, 빈 노드 회수. 파드 request/limit이 곧 비용 단위. [[K8s-Resource-Right-Sizing]]
- **Fargate/Lambda**: 스케일은 자동이나 단가가 높아, 상시 고부하면 EC2가 쌀 수 있음. [[AWS-Pricing]]

## 흔한 함정

- scale-in을 막아두고(보수적) 유휴 인스턴스 누적
- min capacity를 피크 기준으로 잡아 야간에도 과프로비저닝
- target을 너무 낮게(CPU 20%) → 상시 과증설
- 깜빡임(flapping) — 쿨다운 미설정으로 증감 반복
- Spot 미사용으로 변동 피크를 전부 On-Demand로 흡수

## 면접 체크포인트

- 오토스케일링이 가용성이자 비용 도구인 이유(유휴 제거)
- Target/Step/Scheduled/Predictive의 비용 성격
- scale-in 적극성 vs flapping의 균형, min capacity 튜닝
- 기저=약정, 피크=Spot, Mixed Instances/Warm Pool 활용
- 스케일 단위 right-sizing이 선행돼야 하는 이유

## 출처

- [AWS — EC2 Auto Scaling scaling policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/scaling-overview.html)
- [AWS — ASG with Mixed Instances & Spot](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html)

## 관련 문서

- [[Auto-Scaling|Auto Scaling]]
- [[ECS-Service-AutoScaling|ECS 서비스 오토스케일링]]
- [[Reserved-Instance|RI / Savings Plans (기저 부하)]]
- [[Resource-Right-Sizing|리소스 적정화 (스케일 단위)]]
- [[AWS-Cost-Optimization|AWS 비용 최적화 (Spot 사례)]]
