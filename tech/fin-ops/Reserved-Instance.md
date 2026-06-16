---
tags: [finops, aws, reserved-instance, savings-plans, commitment, cost]
status: done
category: "비용&운영(FinOps)"
aliases: ["Reserved Instance", "Reserved Instance / Savings Plan", "RI", "Savings Plans", "약정 할인"]
---

# Reserved Instance / Savings Plans

**일정 사용량을 1년 또는 3년 약정**하면 On-Demand 대비 단가를 30~70% 깎아주는 할인 모델. 기저 부하(상시 켜져 있는 서버)에 쓴다. 약정은 곧 **유연성을 비용과 맞바꾸는** 결정이다. [[AWS-Cost-Optimization]]에서 개요를, 여기서 선택 기준을 다룬다.

## RI vs Savings Plans

| | Reserved Instance | Savings Plans |
|---|---|---|
| 약정 대상 | 특정 인스턴스 속성 | **시간당 일정 금액($/h)** |
| 유연성 | 낮음(Standard) ~ 중간(Convertible) | 높음(Compute SP는 타입/리전/서비스 무관) |
| 적용 범위 | EC2, RDS, ElastiCache, Redshift 등 | EC2, Fargate, Lambda(Compute SP) |
| 대세 | 레거시 | **권장 (관리 단순)** |

요즘은 대부분 **Savings Plans**를 기본으로 한다. 약정 관리가 훨씬 단순하기 때문이다.

## RI 세부 축

- **Standard vs Convertible**: Standard는 할인 크지만 변경 불가, Convertible은 타입 변경 가능하나 할인 작음.
- **Regional vs Zonal**: Regional은 AZ 유연 + 적용 범위 넓음, Zonal은 **용량 예약**까지 보장(특정 AZ 자리 확보).
- **결제 옵션**: All Upfront(최대 할인) > Partial > No Upfront(현금 흐름 유리, 할인 적음).

### RDS, Aurora RI의 용량 정규화

RDS, Aurora RI는 특정 인스턴스 크기, 대수가 아니라 **예약 용량(normalized capacity)** 기준으로 적용된다. 그래서 약정을 유지한 채 같은 용량 안에서 **인스턴스를 다운사이징**할 수 있다. 예: `r6i.4xlarge` 1대를 `r6i.2xlarge` 2대로 바꿔도(용량 동일) 기존 RI가 그대로 덮인다. RI 만료 시점에 맞춰 점진적으로 Scale-In을 계획하면 약정을 버리지 않고도 사이즈를 줄여 절감한다. 전환은 사용자가 적은 시간대에 rolling 방식으로 수행한다.

## Savings Plans 종류

- **Compute SP**: 가장 유연. 인스턴스 패밀리/리전/OS/테넌시 무관, Fargate/Lambda까지 적용. 할인은 약간 작음.
- **EC2 Instance SP**: 특정 패밀리+리전에 한정, 할인 더 큼.
- **SageMaker SP**: ML 워크로드용.

## 커버리지와 활용률 — 두 지표

- **Coverage(커버리지)**: 전체 사용량 중 약정으로 덮인 비율. 너무 낮으면 절감 기회 손실.
- **Utilization(활용률)**: 산 약정 중 실제로 쓴 비율. 100%여야 낭비 없음. **남는 약정은 그냥 버려지는 돈**.

목표: 기저 부하만큼만 약정해 활용률 100%를 유지하고, 변동 피크는 On-Demand/Spot로 흡수. 과약정은 미사용 약정을, 과소약정은 비싼 On-Demand를 남긴다.

## 약정 전략

- **기저 부하 분석 먼저**: 최근 수개월 사용량의 하한선만큼 약정.
- **3년 vs 1년**: 안정적 워크로드는 3년(할인 큼), 불확실하면 1년.
- **점진적 약정**: 한 번에 100% 약정하지 말고 커버리지를 단계적으로 올림.
- **Spot과 분리**: 약정은 상시 부하, Spot은 중단 가능 배치. 역할을 섞지 않는다.

## 흔한 함정

- 변동 큰 워크로드에 과약정 → 미사용 약정 = 손실
- Standard RI로 묶고 인스턴스 타입 바꿔야 해 발 묶임 → Convertible/SP가 나음
- 커버리지만 높이고 활용률을 안 봐 약정이 놀고 있음
- 3년 약정 후 아키텍처 변경(Graviton 이전 등)으로 무용지물
- Spot으로 충분한 워크로드까지 약정

## 면접 체크포인트

- RI와 Savings Plans의 차이, 왜 요즘 SP가 기본인지
- Standard/Convertible, Regional/Zonal, 결제 옵션의 트레이드오프
- Coverage와 Utilization 두 지표의 의미와 목표
- 기저 부하는 약정, 피크는 On-Demand/Spot의 분리 전략
- 과약정/과소약정 각각의 손실 형태

## 출처

- [AWS — Savings Plans vs Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [AWS — Reserved Instances (Standard vs Convertible, Regional vs Zonal)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화 (Spot/RI/SP 개요)]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[Resource-Right-Sizing|리소스 적정화 (약정 전 선행)]]
- [[Autoscaling-Cost|오토스케일링 비용 (피크 흡수)]]
