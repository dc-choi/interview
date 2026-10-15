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

### 혼합 인스턴스의 가중치와 용량 단위

부분 검증(2026-10-16): AWS의 instance weights 문서를 대조했다. 가중치를 쓰면 최소, 목표, 최대 용량을 인스턴스 대수가 아닌 같은 용량 단위로 지정한다. 가중치는 인스턴스가 용량에 기여하는 양이며, 실제 타입을 고르는 allocation strategy와 다르다.

- 예를 들어 가중치 2와 12인 타입을 함께 쓰고 남은 목표가 5단위인데 12단위 인스턴스가 시작되면 목표를 7단위 초과한다. 정수 대수로 공급하므로 목표와 실제 용량이 꼭 같지는 않다.
- 가중치 그룹은 AZ 균형과 allocation strategy를 따르면서 최대 용량 설정을 초과할 수도 있다. 공식 문서가 설명하는 강제 상한은 목표 용량에 가장 큰 가중치를 더한 값이다. 최대값을 인스턴스 대수나 절대 비용 상한으로 읽지 않는다.
- 기존 그룹의 가중치를 바꾸면 새 단위의 목표에 맞춰 인스턴스가 시작되거나 종료될 수 있다. 단위 변경을 단순한 표시 수정으로 취급하지 않는다.

운영 점검 제안: 타입별 처리 성능과 비용을 같은 단위로 비교하고, 변경 전후 대수와 가중 용량을 함께 확인한다. 실제 ASG 변경은 실행하지 않았으며 다른 절의 검증일은 유지한다.

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

### 여러 대상 추적 정책의 조합과 지표 선택

2026-10-16 공식 문서 부분 대조 기준이다. 서로 다른 지표를 쓰는 target tracking 정책을 함께 설정하면, 하나라도 확장을 요구할 때 scale-out할 수 있다. 축소는 **scale-in이 활성화된 모든 target tracking 정책**이 축소할 준비가 되었을 때만 한다. 이 규칙을 다른 종류의 정책이나 수동 조정까지 포함한 전체 ASG의 축소 금지로 해석하지 않는다.

- 대상 추적에는 용량 변화에 비례해 인스턴스당 부하가 변하는 지표를 고른다. 전체 `RequestCount`, 지연 시간, SQS의 전체 메시지 수를 그대로 목표로 삼는 것은 부적합하다. 요청 수는 `ALBRequestCountPerTarget`, 큐 적체는 인스턴스당 메시지 수 같은 지표를 검토한다.
- 예를 들어 CPU와 target당 요청 수 정책을 함께 쓰면 CPU가 낮아도 요청 수 정책이 확장을 요구할 수 있다. 두 정책의 목표값을 평균내어 하나의 조건으로 판단하는 방식이 아니다.
- 해당 지표의 데이터가 빠져 경보가 `INSUFFICIENT_DATA`가 되면 그 대상 추적 정책으로 조정할 수 없다. 관측 누락을 부하 0으로 취급하지 않는다. 다른 정책과 수동 조정의 실행 여부는 별도로 확인한다.
- 위기 구간에 더 큰 폭의 확장이 필요하면 step scaling을 추가로 검토할 수 있다. 확장과 축소 임계값에는 여유를 두어 반복 증감(flapping)을 피한다.

운영 점검 제안: 부하 테스트에서 목표값뿐 아니라 정책별 경보, 실제 용량 변화와 애플리케이션 지연을 함께 확인한다. 이 절은 정책 동작의 문서 대조이며 실제 ASG에서 실행한 결과는 아니다.

## 예정된 급증은 준비 완료 시각에서 역산한다

2026-10-07 공식 문서 대조 기준이다. 광고나 판매 시작처럼 시각을 아는 부하는 scheduled action으로 미리 용량을 확보하고, 예측 오차는 동적 정책으로 대응한다. 예약 실행 시각과 애플리케이션이 트래픽을 받을 수 있는 시각은 다르다.

- EC2 scheduled action은 원하는 용량과 필요 시 최소, 최대 용량을 설정한다. 실행이 최대 2분 늦어질 수 있으므로 인스턴스 시작, 초기화와 상태 확인 시간도 포함해 여유를 둔다.
- 예약 뒤에도 동적 정책이 작동한다. 행사 전 낮은 사용률로 다시 축소되지 않도록 필요한 최소 용량을 검토하고, 종료 후 원래 범위로 돌리는 별도 action을 계획한다. 반복 예약의 종료 시각은 반복을 멈추는 조건이며 이전 용량을 복원하는 기능이 아니다.
- 반복 일정의 시간대와 CLI/SDK 시작, 종료 시각의 UTC 표현을 구분한다. 여러 ASG 사이의 실행 순서는 보장되지 않는다.

운영 판단 예시로, 증설 뒤 목표 대수만 확인하지 않고 정상 target 수, 실제 요청 지연과 오류를 확인한다. 앱 대수가 늘어도 DB 연결 풀이나 하위 서비스가 병목이면 문제가 남는다. `default instance warmup`은 `InService` 뒤 지표 집계에 참여하는 시간을 조절하며, 애플리케이션 준비 완료 검사를 대신하지 않는다.

## 시각을 모르는 급증은 원인 이벤트에서 증설을 시작한다

2026-10-14 공식 문서 대조 기준이다. 대량 푸시 발송처럼 급증의 원인을 애플리케이션이 먼저 아는 경우가 있다. Target tracking은 지표가 목표값을 벗어난 뒤에 움직이고, CPU 사용률 같은 EC2 지표는 기본 5분 간격이며 세부 모니터링을 켜야 1분 간격이 된다. 여기에 인스턴스 시작과 warmup 시간이 더해지므로, 원인 이벤트가 생긴 시점에 API로 용량을 올리는 수동 조정을 동적 정책과 함께 쓸 수 있다.

- `SetDesiredCapacity`는 목표 용량만 바꾼다. 수동 조정은 기본적으로 cooldown을 기다리지 않으며 `HonorCooldown`을 주면 기다린다.
- `UpdateAutoScalingGroup`은 최소, 최대와 목표 용량을 함께 바꾼다. 목표 용량은 최소 이상 최대 이하여야 하고, 목표 용량 없이 최소를 현재 대수보다 크게 올리면 목표 용량도 새 최소가 된다.
- 수동 조정 뒤에도 조정 정책과 예약 작업은 다시 동작한다. 부하가 지표에 반영되기 전에 정책이 축소하지 않도록 유지할 대수를 최소 용량으로도 올린다. 충돌을 피하려고 정책과 예약 작업을 잠시 끄는 방법도 있다.
- 되돌릴 때 목표 용량을 직접 낮추면 그 값까지 축소하며 종료할 인스턴스는 종료 정책으로 고른다. 요청에 넣지 않은 속성은 바뀌지 않으므로 최소만 원래 값으로 낮추면 목표 용량은 그대로 남고 이후 축소는 동적 정책이 판단한다. 최대를 현재 대수보다 낮추면 목표 용량도 새 최대로 내려가 축소 활동이 시작된다(scale-in protection이 걸린 인스턴스는 보호 해제 전까지 종료되지 않는다). Target tracking은 트래픽이 줄 때 더 점진적으로 축소한다.
- 진행 중인 조정 활동이나 대기 중인 갱신과 겹치면 `ScalingActivityInProgress`나 `ResourceContention` 오류가 날 수 있다.

증설을 일찍 시작해도 인스턴스가 요청을 받기까지의 시간은 남는다. 시작할 때마다 애플리케이션과 의존성을 설치하는 bootstrapping은 설치가 크거나 복잡하면 배포와 확장을 늦춘다. 산출물의 상당 부분을 AMI에 미리 넣는 prebaking은 시작과 투입을 앞당길 수 있고, 환경별 구성만 시작 때 적용하는 식으로 둘을 조합할 수 있다. 초기화 자체가 길면 아래 Warm Pool을 검토한다.

운영 점검 제안: 같은 사건이 호출을 여러 번 만들어도 결과 용량이 같도록 요청값을 정하고, 위 오류는 재시도한다. 축소 조건은 최소 유지 시간과 트래픽이 증설 전 수준으로 돌아왔는지를 함께 본다. 원인 이벤트, API 호출 결과와 최종 용량을 운영 채널에 남겨 사람이 증설을 알 수 있게 한다. 최대 용량을 올리면 그 대수의 커넥션 풀 합계가 DB 연결 상한 안에 드는지도 확인한다 — [[MySQL-Connection-Management|MySQL 연결 관리]]. 이 절은 문서 대조이며 실제 그룹에서 실행한 기록은 아니다.

사례(2020년 발표 기준): 평상시의 약 100배까지 요청이 순간적으로 몰리던 팬 커뮤니티 서비스는 아티스트 게시물처럼 시각을 모르는 이벤트가 생기면 푸시 발송과 동시에 API Gateway를 거쳐 Lambda를 호출해 목표, 최소, 최대 용량을 올렸다. 약 30분 유지한 뒤 트래픽이 증설 전 수준으로 내려왔을 때만 되돌렸다. 판매 일정처럼 미리 아는 행사는 Lambda가 일정 캘린더를 주기적으로 조회해 같은 방식으로 증설했고, 두 경우 모두 결과를 메신저 채널로 알렸다. 기본 AMI에서 부팅할 때 구성하던 방식을 JAR 배포 직전까지 구성한 서비스별 AMI로 바꿔 새 서버가 투입되기까지의 시간을 약 5분에서 3분으로 줄였다.

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

## Warm Pool — 초기화와 서비스 준비를 나눈다

2026-10-09 공식 문서 부분 대조 기준이다. Warm Pool은 ASG 옆에 미리 초기화한 EC2 인스턴스를 두고 확장 시 가져오는 방식이다. 큰 컨테이너 이미지나 모델 파일을 준비하는 시간이 병목일 때 검토한다. `default instance warmup`과 별개이며, 재시작과 애플리케이션 준비 시간을 없애지는 않는다.

- `Stopped` 상태에서도 EBS와 연결된 Elastic IP 비용은 남는다. `Hibernated`는 RAM을 EBS에 보존하며, 인스턴스의 최대 절전 지원 조건을 별도로 충족해야 한다.
- 초기화가 끝나기 전에 인스턴스가 중지되지 않도록 launch lifecycle hook으로 `Warmed:Pending:Wait`에서 기다린다. 준비가 끝나면 `CompleteLifecycleAction`으로 완료를 알린다.
- 웜 풀에서 나와 서비스로 진입할 때는 `Pending:Wait`에서 서비스 준비를 확인할 수 있다. cloud-init의 user data는 기본적으로 첫 부팅에만 실행되므로 재시작 때 자동 재실행된다고 가정하지 않는다.
- scale-in 뒤 인스턴스를 풀로 돌려보내려면 instance reuse policy를 설정한다. 기본 동작은 종료이며, 풀의 용량 설정에 따라 재사용 인스턴스도 종료될 수 있다.
- 풀이 고갈되면 새 인스턴스가 ASG로 직접 시작하는 cold start 경로가 남는다. launch template을 바꿔도 기존 풀 인스턴스는 갱신되지 않으므로 instance refresh 등으로 교체한다.

GPU 워커에 적용할 때는 이미지와 모델 파일의 디스크 준비, 프로세스 시작, GPU 메모리 적재와 첫 추론 완료를 나누어 측정한다. 이 구분은 운영 점검 제안이다. 정지된 인스턴스에 파일이 있다는 이유만으로 추론 준비가 끝났다고 판정하지 않는다.

### 처리 중인 작업과 scale-in 보호

작업 중인 인스턴스는 scale-in protection으로 축소 대상에서 보호할 수 있다. 보호는 `InService`부터 적용되며, 모든 인스턴스가 보호된 상태에서도 desired capacity는 내려갈 수 있지만 실제 종료는 보호 해제까지 미뤄진다.

이 보호는 헬스 체크에 따른 교체, Spot 중단과 수동 종료를 막지 않는다. 워커 설계에서는 작업 결과의 내구성, 재시도와 멱등성을 따로 확보하고, 작업 완료 뒤 보호를 해제하는 절차를 둔다. 컨테이너 태스크 수와 GPU 인스턴스 용량의 구분은 [[ECS-GPU-Inference|ECS GPU 추론]]을 참고한다.

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
- [AWS, Configure an Auto Scaling group to use instance weights](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html)
- [EC2 Auto Scaling의 Launch Template](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-templates.html)
- [Mixed Instances Group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html)
- [Scaling cooldown](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scaling-cooldowns.html)
- [Default instance warmup](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-default-instance-warmup.html)
- [Auto Scaling health check](https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html)
- [Lifecycle hook 고려사항](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [Scheduled scaling for Amazon EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html)
- [Decrease latency for applications with long boot times using warm pools](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html)
- [Use lifecycle hooks with a warm pool in Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/warm-pool-instance-lifecycle.html)
- [Use instance scale-in protection to control instance termination](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-instance-protection.html)
- [Manual scaling for Amazon EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scaling-manually.html)
- [SetDesiredCapacity API Reference](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_SetDesiredCapacity.html)
- [UpdateAutoScalingGroup API Reference](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_UpdateAutoScalingGroup.html)
- [Target tracking scaling policies for Amazon EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html)
- [Step and simple scaling policies for Amazon EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-simple-step.html)
- [Prebaking vs. bootstrapping AMIs](https://docs.aws.amazon.com/whitepapers/latest/overview-deployment-options/prebaking-vs.-bootstrapping-amis.html)
- [전 세계 팬들이 모일 수 있는 플랫폼 만들기 — AWS Community Day 2020, 강진우](https://www.youtube.com/watch?v=X2I4NuTOWS8)

## 관련 문서
- [[EC2|EC2]]
- [[ELB|Elastic Load Balancing]]
- [[VPC|VPC]]
- [[CloudWatch|CloudWatch]]
- [[EventBridge|EventBridge]]
- [[AWS-Lambda|Lambda]]
- [[Capacity-Planning|캐퍼시티 플래닝]] — 시각을 아는 급증의 사전 확장과 준비 완료 검증
- [[Notification-Broadcast-System|대규모 알림 시스템]] — 알림 뒤 동시 진입으로 생기는 백엔드 급증
