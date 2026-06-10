---
tags: [infrastructure, aws, ec2, auto-scaling, asg, elasticity]
status: done
category: "Infrastructure - AWS"
aliases: ["Auto Scaling", "EC2 Auto Scaling", "ASG", "Auto Scaling Group"]
---

# EC2 Auto Scaling

EC2 인스턴스 수를 **부하·일정·헬스 상태에 맞춰 자동 증감**시키는 서비스. 핵심 목표는 (1) 트래픽 변동에 대응한 **성능 유지**, (2) 유휴 자원 축소로 **비용 절감**, (3) 비정상 인스턴스 **자동 교체**.

## 핵심 구성

| 요소 | 역할 |
|------|------|
| **Auto Scaling Group (ASG)** | 인스턴스 풀, 최소·목표·최대 크기를 정의 |
| **Launch Template / Configuration** | 새 인스턴스 생성 시 사용할 AMI·인스턴스 타입·SG·스토리지 등 청사진 |
| **Scaling Policy** | 언제 얼마나 늘릴지·줄일지 규칙 |
| **Health Check** | EC2 상태 검사 + ELB 상태 검사로 비정상 탐지 |
| **Lifecycle Hook** | 인스턴스 시작/종료 직전에 사용자 작업 끼워넣기 |

ASG는 항상 **하나의 Launch Template/Configuration**을 가지며, 정책이 없으면 **목표 크기(Desired Capacity)** 를 유지한다.

## Launch Template vs Launch Configuration

| 구분 | Launch Configuration (legacy) | Launch Template (권장) |
|------|------------------------------|------------------------|
| 수정 | **불가** — 복사·삭제만 | 버전 관리 가능 |
| 기능 | 기본 EC2 옵션 | Spot·On-Demand 혼합, 다중 인스턴스 타입, T2 Unlimited 등 |
| 신규 도입 | 권장하지 않음 | AWS 권장 |

Launch Configuration은 한번 만들면 못 바꾸므로 변경 시 **새로 만들어 ASG에 교체**해야 한다.

## Scaling Policy — 3가지 동적 정책

| 정책 | 트리거 | 동작 |
|------|--------|------|
| **Target Tracking (대상 추적)** | 지표 평균값이 목표값에 수렴하도록 | 가장 간단·권장. CPU 50%, ALB Request/Target 1000 등 |
| **Simple Scaling (단순 조정)** | CloudWatch Alarm 1개 | 정해진 수만큼 증감 후 Cooldown 대기 |
| **Step Scaling (단계 조정)** | Alarm + 여러 임계 단계 | 위반 폭에 따라 증감 폭을 다르게 |

추가 모드:
- **Scheduled Scaling (예약 조정)** — 트래픽 패턴이 예측 가능할 때 (예: 평일 09시 +5, 22시 -3)
- **Predictive Scaling** — ML로 부하 예측해 선제 증설

대상 추적 지표 예: `ASGAverageCPUUtilization`, `ASGAverageNetworkIn/Out`, `ALBRequestCountPerTarget`.

## Cooldown — 진동 방지

```
[Scale Out] → 새 인스턴스 In Service → Cooldown (기본 300초) → 다음 결정
```

Cooldown 동안은 알람이 켜져도 추가 증감을 하지 않는다. 새 인스턴스가 부하를 흡수하기 전에 또 늘려 **오버스케일**되는 진동을 막는 장치. Target Tracking은 자체 Cooldown을 관리하므로 별도 설정 불필요.

## Lifecycle Hook — In Service 진입 전 작업

```
Scale Out 결정 → Pending → [Hook: Pending:Wait] → InService
Scale In 결정  → Terminating → [Hook: Terminating:Wait] → Terminated
```

| 항목 | 값 |
|------|-----|
| 기본 대기 시간 | **3600초 (최대 48시간)** |
| 용도 | 부트스트랩 스크립트, 설정 다운로드, 캐시 워밍, 종료 전 graceful drain |
| 연계 | CloudWatch Events/EventBridge → Lambda·SNS·SQS 호출 |

Scale In/Out 용어:
- **Scale Out** = 인스턴스 수 증가 (수평 확장)
- **Scale In** = 인스턴스 수 감소

## Health Check — 비정상 인스턴스 교체

| 타입 | 검사 대상 |
|------|----------|
| **EC2 Health Check** (기본) | 인스턴스 상태 (System / Instance Status) |
| **ELB Health Check** | ELB의 Target Health (HTTP·TCP) — 활성화 필요 |

비정상 탐지 → 교체 흐름:
1. ELB가 비정상 인스턴스를 **트래픽 대상에서 분리**
2. ASG가 해당 인스턴스 **Terminate**
3. ASG가 새 인스턴스를 **Launch → In Service**
4. 전체 소요 **약 5분 이내**

**Health Check Grace Period** — 시작 직후 N초간 헬스체크 결과 무시 (부트스트랩 시간 보장).

## ELB와의 결합

```
사용자 트래픽 → ELB (Target Group) → ASG의 EC2들
```

- ASG 생성 시 **Target Group**을 연결하면, 신규 인스턴스가 자동으로 Target Group에 등록되고 종료 시 자동 제거
- ELB Health Check를 ASG Health Check Type으로 지정하면 애플리케이션 레이어 장애도 자동 복구

## CloudWatch · EventBridge 연계

- 모든 Scaling 지표는 **CloudWatch Metric**으로 수집 (`GroupDesiredCapacity`, `GroupInServiceInstances` 등)
- **Alarm**이 Simple/Step Scaling의 트리거
- Lifecycle 이벤트는 **EventBridge**로 라우팅 → Lambda·SNS 호출

## 시험 체크포인트

- 비정상 인스턴스 교체 시 **ELB가 먼저 분리**한 뒤 ASG가 교체한다
- ASG 새 인스턴스 In Service까지 **5분 이내**
- Launch **Configuration은 수정 불가**, Launch **Template은 버전 관리 가능**
- Cooldown 기본 **300초**, Lifecycle Hook 기본 **3600초**
- Target Tracking이 가장 단순·권장, Step은 위반 폭에 따라 차등
- 예약된 일정(Scheduled Scaling)은 수요 변화가 **예측 가능**할 때
- Scale **Out = 증가, In = 감소** (헷갈리기 쉬움)
- 하나의 ASG는 하나의 Launch Template/Configuration을 **반드시** 가진다

## 출처
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[AWS|EC2]]
- [[ELB|Elastic Load Balancing]]
- [[VPC|VPC]]
- [[CloudWatch|CloudWatch]]
- [[EventBridge|EventBridge]]
- [[AWS-Lambda|Lambda]]
