---
tags: [infrastructure, aws, ec2, auto-scaling, asg, elasticity]
status: done
category: "Infrastructure - AWS"
aliases: ["Auto Scaling", "EC2 Auto Scaling", "ASG", "Auto Scaling Group"]
verified_at: 2026-07-21
---

# EC2 Auto Scaling

EC2 인스턴스 수를 **부하, 일정, 헬스 상태에 맞춰 자동 증감**시키는 서비스. 핵심 목표는 (1) 트래픽 변동에 대응한 **성능 유지**, (2) 유휴 자원 축소로 **비용 절감**, (3) 비정상 인스턴스 **자동 교체**.

## 핵심 구성

| 요소 | 역할 |
|------|------|
| **Auto Scaling Group (ASG)** | 인스턴스 풀, 최소, 목표, 최대 크기를 정의 |
| **Launch Template / Configuration** | 새 인스턴스 생성 시 사용할 AMI, 인스턴스 타입, SG, 스토리지 등 청사진 |
| **Scaling Policy** | 언제 얼마나 늘릴지, 줄일지 규칙 |
| **Health Check** | EC2 상태 검사 + ELB 상태 검사로 비정상 탐지 |
| **Lifecycle Hook** | 인스턴스 시작/종료 직전에 사용자 작업 끼워넣기 |

ASG는 인스턴스를 시작할 Launch Template을 사용한다. 기존 그룹은 Launch Configuration을 사용할 수 있고, Mixed Instances Policy는 Launch Template을 기준으로 인스턴스 유형, 구매 옵션 등의 오버라이드를 조합한다. 조정 정책이 없어도 그룹은 **목표 크기(Desired Capacity)** 와 헬스 상태를 유지한다.

## Launch Template vs Launch Configuration

| 구분 | Launch Configuration (legacy) | Launch Template (권장) |
|------|------------------------------|------------------------|
| 수정 | **불가** — 복사, 삭제만 | 버전 관리 가능 |
| 기능 | 기본 EC2 옵션 | Spot, On-Demand 혼합, 다중 인스턴스 타입, T2 Unlimited 등 |
| 신규 도입 | 권장하지 않음 | AWS 권장 |

Launch Configuration은 한번 만들면 못 바꾸므로 변경 시 **새로 만들어 ASG에 교체**해야 한다.

## Scaling Policy — 3가지 동적 정책

| 정책 | 트리거 | 동작 |
|------|--------|------|
| **Target Tracking (대상 추적)** | 지표 평균값이 목표값에 수렴하도록 | 가장 간단, 권장. CPU 50%, ALB Request/Target 1000 등 |
| **Simple Scaling (단순 조정)** | CloudWatch Alarm 1개 | 정해진 수만큼 증감 후 Cooldown 대기 |
| **Step Scaling (단계 조정)** | Alarm + 여러 임계 단계 | 위반 폭에 따라 증감 폭을 다르게 |

추가 모드:
- **Scheduled Scaling (예약 조정)** — 트래픽 패턴이 예측 가능할 때 (예: 평일 09시 +5, 22시 -3)
- **Predictive Scaling** — ML로 부하 예측해 선제 증설

대상 추적 지표 예: `ASGAverageCPUUtilization`, `ASGAverageNetworkIn/Out`, `ALBRequestCountPerTarget`.

## Cooldown과 Instance Warmup — 중복 조정 방지

```
[Simple Scaling] → 용량 변경 → 기본 Cooldown 300초 → 다음 Simple Scaling 동작
```

그룹 기본 cooldown은 주로 Simple Scaling에 적용된다. Step Scaling과 Target Tracking은 인스턴스 warmup을 사용한다. EC2 Auto Scaling의 Target Tracking 정책은 정책별 cooldown 값을 사용하지 않으며, warmup 중인 인스턴스를 집계 지표에서 제외하는 방식과 scale-out, scale-in 규칙도 다르다. 따라서 모든 조정이 300초 동안 차단된다고 해석하면 안 된다. AWS는 여러 정책에서 일관된 동작을 위해 그룹의 default instance warmup 구성을 권장한다.

## Lifecycle Hook — In Service 진입 전 작업

```
Scale Out 결정 → Pending → [Hook: Pending:Wait] → InService
Scale In 결정  → Terminating → [Hook: Terminating:Wait] → Terminated
```

| 항목 | 값 |
|------|-----|
| 기본 heartbeat timeout | **3600초**. 전체 대기 한도는 48시간 또는 heartbeat timeout의 100배 중 작은 값 |
| 용도 | 부트스트랩 스크립트, 설정 다운로드, 캐시 워밍, 종료 전 graceful drain |
| 연계 | CloudWatch Events/EventBridge → Lambda, SNS, SQS 호출 |

Scale In/Out 용어:
- **Scale Out** = 인스턴스 수 증가 (수평 확장)
- **Scale In** = 인스턴스 수 감소

## Health Check — 비정상 인스턴스 교체

| 타입 | 검사 대상 |
|------|----------|
| **EC2 Health Check** (기본) | 인스턴스 상태 (System / Instance Status) |
| **ELB Health Check** | ELB의 Target Health (HTTP, TCP) — 활성화 필요 |

EC2, ELB, VPC Lattice, EBS 또는 사용자 지정 헬스 체크가 인스턴스를 비정상으로 판정하면 Auto Scaling은 해당 인스턴스를 교체 대상으로 처리한다. Target Group의 트래픽 제외, 종료, 새 인스턴스 시작과 등록 시점은 헬스 체크 설정, 종료 정책, 용량 가용성, lifecycle hook, warmup에 따라 달라지므로 완료 시간을 고정값으로 보장할 수 없다.

**Health Check Grace Period** — 인스턴스가 `InService`가 된 뒤 지정 시간 동안 일부 추가 헬스 체크 결과를 무시해 초기화 중 조기 교체를 줄인다. 시작 완료나 애플리케이션 준비 시간을 보장하는 기능은 아니다. 콘솔 생성 기본값과 CLI, SDK 기본값이 다를 수 있으므로 명시적으로 설정한다.

## ELB와의 결합

```
사용자 트래픽 → ELB (Target Group) → ASG의 EC2들
```

- ASG 생성 시 **Target Group**을 연결하면, 신규 인스턴스가 자동으로 Target Group에 등록되고 종료 시 자동 제거
- ELB Health Check를 ASG Health Check Type으로 지정하면 애플리케이션 레이어 장애도 자동 복구

## CloudWatch, EventBridge 연계

- 그룹 지표 수집을 활성화하면 `GroupDesiredCapacity`, `GroupInServiceInstances` 등의 **CloudWatch Metric**을 사용할 수 있다. EC2 인스턴스 지표와 수집 설정은 별도다
- **Alarm**이 Simple/Step Scaling의 트리거
- Lifecycle 이벤트는 **EventBridge**로 라우팅 → Lambda, SNS 호출

## 시험 체크포인트

- 비정상 인스턴스 교체는 선택한 헬스 체크, grace period, lifecycle hook과 용량 가용성에 영향을 받는다
- Launch **Configuration은 수정 불가**, Launch **Template은 버전 관리 가능**
- 그룹 기본 Cooldown은 **300초**, Lifecycle Hook 기본 heartbeat timeout은 **3600초**이며 적용 범위를 구분한다
- Target Tracking이 가장 단순, 권장, Step은 위반 폭에 따라 차등
- 예약된 일정(Scheduled Scaling)은 수요 변화가 **예측 가능**할 때
- Scale **Out = 증가, In = 감소** (헷갈리기 쉬움)
- 현행 설계는 Launch Template을 기준으로 하며 Mixed Instances Policy에서 여러 인스턴스 유형과 구매 옵션을 조합할 수 있다

## 출처
- [EC2 Auto Scaling의 Launch Template](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-templates.html)
- [Mixed Instances Group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html)
- [Scaling cooldown](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scaling-cooldowns.html)
- [Default instance warmup](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-default-instance-warmup.html)
- [Auto Scaling health check](https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html)
- [Lifecycle hook 고려사항](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)

## 관련 문서
- [[EC2|EC2]]
- [[ELB|Elastic Load Balancing]]
- [[VPC|VPC]]
- [[CloudWatch|CloudWatch]]
- [[EventBridge|EventBridge]]
- [[AWS-Lambda|Lambda]]
