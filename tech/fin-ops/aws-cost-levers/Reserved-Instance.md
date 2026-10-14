---
tags: [finops, aws, reserved-instance, savings-plans, commitment, cost]
status: done
verified_at: 2026-09-12
category: "비용&운영(FinOps)"
aliases: ["Reserved Instance", "Reserved Instance / Savings Plan", "RI", "Savings Plans", "약정 할인"]
---

# Reserved Instance / Savings Plans

**일정 사용량을 1년 또는 3년 약정**해 On-Demand 대비 할인을 받는 모델이다. 실제 할인율은 상품, 기간과 결제 옵션에 따라 달라지며 보편적인 최소 할인율을 전제하지 않는다. 기저 부하에 적용하되 약정 범위 밖으로 워크로드가 바뀌는 위험을 함께 본다. [[AWS-Cost-Optimization]]에서 개요를, 여기서 선택 기준을 다룬다.

## RI vs Savings Plans

| | Reserved Instance | Savings Plans |
|---|---|---|
| 약정 대상 | 특정 인스턴스 속성 | **시간당 일정 금액($/h)** |
| 유연성 | 낮음(Standard, 제한된 수정) ~ 중간(Convertible, 교환 가능) | Compute SP는 EC2의 패밀리와 리전 변경, Fargate와 Lambda로의 이동에 유연 |
| 적용 범위 | EC2, RDS, ElastiCache, Redshift 등 | EC2, Fargate, Lambda(Compute SP) |

Compute SP와 EC2 Instance SP의 선택은 서비스 이동 가능성과 특정 패밀리, 리전의 사용 지속성을 비교해 정한다. SP가 모든 워크로드의 기본값이거나 모든 AWS 비용을 할인하는 것은 아니다. 이 선택 범위와 아래 시간당 적용 규칙은 2026-10-09 AWS 문서로 대조했다.

## RI 세부 축

- **Standard vs Convertible**: Standard는 교환은 불가하지만 AZ, scope, 같은 인스턴스 family와 generation 안의 size는 조건부로 수정할 수 있다. Convertible은 할인은 작지만 같은 Region에서 family, OS, tenancy까지 바꾸는 교환이 가능하며 새 예약의 가치가 같거나 더 높아야 한다.
- **Regional vs Zonal**: Regional은 AZ 유연 + 적용 범위 넓음, Zonal은 **용량 예약**까지 보장(특정 AZ 자리 확보).
- **결제 옵션**: All Upfront(최대 할인) > Partial > No Upfront(현금 흐름 유리, 할인 적음).

### RDS, Aurora RI의 용량 정규화

2026-09-03 AWS 문서 기준, Size-flexible 예약 DB 인스턴스는 RDS for Db2, MariaDB, MySQL, Oracle BYOL, PostgreSQL과 Aurora에서만 지원한다. RDS for SQL Server와 RDS for Oracle License Included에는 적용되지 않는다. 같은 리전, DB 엔진과 인스턴스 클래스 타입 안에서 정규화 용량(normalized units) 기준으로 적용되므로, 조건을 충족하면 약정을 유지한 채 같은 용량 안에서 인스턴스 구성을 바꿀 수 있다. 예를 들어 같은 클래스 타입의 `4xlarge` 1대와 `2xlarge` 2대는 정규화 용량이 같다.

## Savings Plans 네 종류 (2026-09-03 AWS 문서 기준)

- **Compute SP**: 가장 유연. 인스턴스 패밀리/리전/OS/테넌시 무관, Fargate/Lambda까지 적용. 할인은 약간 작음.
- **Database SP**: Aurora, RDS, DynamoDB, ElastiCache, DocumentDB 등 지원 데이터베이스 서비스에 적용.
- **EC2 Instance SP**: 특정 패밀리+리전에 한정, 할인 더 큼.
- **SageMaker AI SP**: ML 워크로드용.

## 커버리지와 활용률 — 두 지표

- **Coverage(커버리지)**: 전체 사용량 중 약정으로 덮인 비율. 너무 낮으면 절감 기회 손실.
- **Utilization(활용률)**: 산 약정 중 실제로 쓴 비율. 100%여야 낭비 없음. **남는 약정은 그냥 버려지는 돈**.

목표: 기저 부하만큼만 약정해 활용률 100%를 유지하고, 변동 피크는 On-Demand/Spot로 흡수. 과약정은 미사용 약정을, 과소약정은 비싼 On-Demand를 남긴다.

## 약정 전략

- **기저 부하 분석 먼저**: 최근 수개월 사용량의 하한선만큼 약정.
- **3년 vs 1년**: 안정적 워크로드는 3년(할인 큼), 불확실하면 1년.
- **점진적 약정**: 한 번에 100% 약정하지 말고 커버리지를 단계적으로 올림.
- **Spot과 분리**: 약정은 상시 부하, Spot은 중단 가능 배치. 역할을 섞지 않는다.

## 시간당 약정과 적용 순서

시간당 약정액은 **On-Demand 지출액이 아니라 Savings Plans 요율 기준 금액**이다. 월평균 지출을 시간 수로 나눈 값만으로 구매액을 정하지 않는다. 각 시간의 남은 약정은 다음 시간으로 이월되지 않는다.

EC2와 Compute SP 적용을 계산할 때는 다음 순서를 구분한다.

1. EC2 RI를 먼저 적용하고, EC2 Instance SP를 Compute SP보다 먼저 적용한다.
2. 통합 결제에서 공유를 켰다면 소유 계정 사용량을 먼저 처리하고 다른 계정에 남은 혜택을 적용한다.
3. 해당 적용 범위 안에서는 절감률이 높은 사용량부터 처리한다. 절감률이 같으면 SP 요율이 낮은 사용량이 먼저다.
4. 약정으로 덮이지 않은 사용량은 On-Demand 요율로 계산한다.

따라서 인스턴스의 On-Demand 가격이 높다는 이유만으로 할인이 먼저 적용되는 것은 아니다. 구매 전에는 시간대별 사용량과 기존 RI/SP 적용 뒤 남은 대상 사용량을 함께 확인한다.

## 흔한 함정

### 구매 계정과 혜택을 받은 계정의 비용을 구분한다

2026-10-14 Cost Explorer 공식 가이드와 AWS의 계정별 배분 시연을 대조한 범위다. 기존 RI와 상품별 조건의 검증일은 유지한다.

Cost Explorer에서 같은 기간을 보더라도 `Unblended costs`와 `Amortized costs`는 약정 비용을 다르게 표시한다. 선결제와 상쇄 항목의 기본 해석은 [[Cost-Anomaly#선결제와 사용량 증가를 구분한다|비용 증가 조사]]를 참고한다.

| 확인할 질문 | 조회 기준 | 해석 |
|---|---|---|
| 약정을 구매한 계정이 부담하는 요금은 얼마인가 | Unblended, `Charge type`의 Savings Plan upfront fee와 recurring fee, `Linked account` | 선결제와 정기 약정 요금을 구분한다 |
| 각 계정의 사용에 얼마의 약정 비용이 배분됐는가 | Amortized, Savings Plan covered usage, `Linked account` | covered usage는 On-Demand 환산액이 아니라 Savings Plans 요율로 표시된다 |
| 사용하지 못한 약정은 얼마인가 | Amortized에서 Savings Plan recurring fee와 소유 계정 확인 | 미사용 약정 비용은 약정 소유 계정에 귀속된다. 소유자가 관리 계정이라고 고정하지 않는다 |

Amortized는 약정 비용을 적용 기간의 사용에 배분한다. 일별 화면의 미사용 약정 비용은 월초나 구매일에 나타날 수 있으므로 그 날짜의 사용량 급증과 구분한다. `Net amortized costs`는 할인도 반영하므로 내부 배부표와 비교할 때 비용 지표 이름까지 맞춘다.

운영 점검 제안: 멤버 계정의 EC2 비용을 볼 때 `Purchase option`과 EC2 running hours를 함께 확인하고, Unblended에서 Amortized로 전환해 약정 적용분을 대조한다. 계정, 기간, 필터와 비용 지표가 다른 두 화면의 차이를 곧바로 청구 오류로 판단하지 않는다. 실제 조직의 청구나 내부 배부 정책을 검증한 결과는 아니다.

### 약정 선택에서 놓치기 쉬운 조건

- 변동 큰 워크로드에 과약정 → 미사용 약정 = 손실
- Standard RI를 전혀 수정할 수 없다고 오해 → 가능한 AZ, scope, 같은 family와 generation 안의 size 변경을 놓침
- Standard RI로 묶은 뒤 family, OS, tenancy를 바꿔야 함 → Standard는 교환 불가이므로 Convertible RI나 Savings Plans 검토
- 커버리지만 높이고 활용률을 안 봐 약정이 놀고 있음
- 3년 약정 후 아키텍처 변경(Graviton 이전 등)으로 무용지물
- Spot으로 충분한 워크로드까지 약정

## 면접 체크포인트

- RI와 Savings Plans의 차이, 약정 범위와 예상 워크로드 변경을 비교하는 이유
- Standard RI의 제한된 수정과 Convertible RI의 교환 범위, Regional/Zonal, 결제 옵션의 트레이드오프
- Coverage와 Utilization 두 지표의 의미와 목표
- 기저 부하는 약정, 피크는 On-Demand/Spot의 분리 전략
- 과약정/과소약정 각각의 손실 형태

## 출처

- [AWS Cost Management, Filtering the data that you want to view](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-filtering.html)
- [AWS Cost Management, Exploring your data using Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html)
- [How to track Savings Plans allocation in AWS Cost Explorer — Amazon Web Services](https://www.youtube.com/watch?v=ayEICqKa5wU)
- [AWS — Savings Plans vs Reserved Instances](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
- [AWS — Reserved Instances (Standard vs Convertible, Regional vs Zonal)](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-reserved-instances.html)
- [Amazon EC2, Modify Reserved Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-modifying.html)
- [Amazon EC2, Exchange Convertible Reserved Instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-convertible-exchange.html)
- [Amazon RDS, Reserved DB instances](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html)
- [AWS Savings Plans, Plan types](https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html)
- [AWS Savings Plans, Understanding how Savings Plans apply to your usage](https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html)
- [AWS Savings Plans, Purchasing a custom Savings Plan commitment](https://docs.aws.amazon.com/savingsplans/latest/userguide/purchase-sp-direct.html)

## 관련 문서

- [[AWS-Cost-Optimization|AWS 비용 최적화 (Spot/RI/SP 개요)]]
- [[AWS-Pricing|AWS 요금 구조]]
- [[Resource-Right-Sizing|리소스 적정화 (약정 전 선행)]]
- [[Autoscaling-Cost|오토스케일링 비용 (피크 흡수)]]
