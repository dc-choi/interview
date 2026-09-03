---
tags: [infrastructure, aws, ecs, auto-scaling, sqs, fargate]
status: done
verified_at: 2026-09-03
category: "Infrastructure - AWS"
aliases: ["ECS Service Auto Scaling", "ECS 오토스케일링", "Backlog per Task", "SQS 워커 오토스케일링"]
---

# ECS Service Auto Scaling

> 상위 문서: [[ECS|Amazon ECS]]

ECS 서비스의 **DesiredCount(task 개수)** 를 부하에 맞춰 자동 증감시키는 것. 내부적으로 **AWS Application Auto Scaling** 위에서 돈다. SQS 워커처럼 CPU가 부하 신호가 아닌 워크로드에선 지표 선택이 핵심이다.

## 토대 — Scalable Target 등록 후 정책 부착

두 단계다.

1. **Scalable target 등록**: 이 서비스의 task 수를 min에서 max 범위에서 조절하겠다고 선언
2. **Scaling policy 부착**: 어떻게 조절할지 규칙 부착

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/my-cluster/order-worker \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 --max-capacity 20
```

min과 max가 안전벨트다. 폭주해도 20을 안 넘고 1 밑으로 안 내려간다.

## 스케일링 유형 4종

| 유형 | 분류 | 동작과 용도 |
|---|---|---|
| **Target Tracking** | 스케일링 정책 | 지표 하나를 목표값으로 유지한다. 알람이 자동 생성돼 일반적인 기본 선택이다 |
| **Step Scaling** | 스케일링 정책 | CloudWatch 알람과 임계 단계별 조정량을 직접 정의해 폭증에 대응한다 |
| **Predictive Scaling** | 스케일링 정책 | 과거 부하를 학습해 향후 용량을 예측한다. Application Auto Scaling에서는 ECS 서비스에 지원된다 |
| **Scheduled Scaling** | 예약 작업 | cron으로 시간대별 min/max를 바꾼다. 정책이 아니라 scheduled action이다 |

실무는 Scheduled로 바닥(floor)을 깔고 + Target Tracking으로 그 안의 변동을 처리하는 조합을 많이 쓴다.

## 지표 선택 — SQS 워커에 CPU는 함정

ECS에 적용할 수 있는 사전 정의 Target Tracking 지표는 `ECSServiceAverageCPUUtilization`, `ECSServiceAverageMemoryUtilization`, `ALBRequestCountPerTarget`과 20초 주기의 `ECSServiceAverageCPUUtilizationHighResolution`, `ECSServiceAverageMemoryUtilizationHighResolution` 다섯 가지다. 고해상도 지표는 ECS에서 먼저 활성화해야 한다. 그런데 SQS 워커한테 CPU와 메모리는 **나쁜 신호**다.

워커가 외부 API나 느린 DB에 막혀 있으면 CPU는 한가한데 큐에는 메시지가 산더미일 수 있다. CPU로 스케일하면 "CPU 낮으니 줄이자"며 백로그를 방치한다. SQS 워커는 **큐에 일이 얼마나 밀렸나**를 봐야 하고, 그게 backlog-per-task다.

## Backlog-per-task 패턴 (핵심)

**왜 `ApproximateNumberOfMessagesVisible`를 직접 타게팅하면 안 되나**: 그건 절대값이다. Target Tracking의 수학은 **task당 비율(per-task ratio)** 을 전제로 동작한다. 절대값을 목표로 잡으면 task를 늘려도 그 숫자가 task 수에 비례해 줄지 않아 수렴이 깨진다. 그래서 task 수로 나눠 정규화한다.

```
BacklogPerTask = ApproximateNumberOfMessagesVisible / RunningTaskCount
```

**목표값(target) 계산**:
```
task당 허용 백로그 = 허용 지연(초) / 메시지 1건 평균 처리 시간(초)
```
예: 5분(300초) 안에 처리하고 싶고 1건이 0.3초면 → task 1개가 5분에 처리 가능한 양 = 300 / 0.3 = **1,000** → target = 1000. 허용 지연을 1분으로 빡세게 잡으면 target이 작아져 더 공격적으로 스케일아웃한다.

### 구현 A — Metric Math (Lambda 불필요)

Target Tracking의 customized metric에서 metric math로 나눗셈을 시킨다.

```json
{
  "TargetValue": 1000.0,
  "CustomizedMetricSpecification": {
    "Metrics": [
      { "Id": "visible", "ReturnData": false, "MetricStat": {
        "Metric": { "Namespace": "AWS/SQS", "MetricName": "ApproximateNumberOfMessagesVisible",
          "Dimensions": [{ "Name": "QueueName", "Value": "order-queue" }] }, "Stat": "Average" } },
      { "Id": "tasks", "ReturnData": false, "MetricStat": {
        "Metric": { "Namespace": "ECS/ContainerInsights", "MetricName": "RunningTaskCount",
          "Dimensions": [{ "Name": "ClusterName", "Value": "my-cluster" },
                         { "Name": "ServiceName", "Value": "order-worker" }] }, "Stat": "Average" } },
      { "Id": "backlogPerTask", "Expression": "visible / tasks", "ReturnData": true }
    ]
  },
  "ScaleInCooldown": 300, "ScaleOutCooldown": 60
}
```

주의 두 가지:
- `RunningTaskCount`는 **Container Insights** 지표(`ECS/ContainerInsights`)다. 클러스터에 Container Insights가 꺼져 있으면 안 나온다 → 켜거나 구현 B로
- `visible / tasks`에서 tasks가 0이면 0 나누기가 된다 → min-capacity를 1로 둔 이유 (scale-to-zero가 까다로운 이유)

### 구현 B — Lambda로 직접 publish (Container Insights 없어도 됨)

EventBridge로 1분마다 Lambda를 돌려 BacklogPerTask를 계산해 커스텀 지표로 발행하고, 그 지표를 Target Tracking 한다. 0 나누기를 코드에서 막는 게 장점이다.

```typescript
const { Attributes } = await sqs.send(new GetQueueAttributesCommand({
  QueueUrl, AttributeNames: ['ApproximateNumberOfMessages'] }));
const backlog = Number(Attributes!.ApproximateNumberOfMessages);
const { services } = await ecs.send(new DescribeServicesCommand({
  cluster: 'my-cluster', services: ['order-worker'] }));
const running = services?.[0]?.runningCount || 1; // 0 방지
await cw.send(new PutMetricDataCommand({
  Namespace: 'SQS-ECS-Scaling',
  MetricData: [{ MetricName: 'BacklogPerTask', Value: backlog / running, Unit: 'Count',
    Dimensions: [{ Name: 'ServiceName', Value: 'order-worker' }] }] }));
```

그 다음 단일 CustomizedMetricSpecification(Namespace `SQS-ECS-Scaling`, MetricName `BacklogPerTask`)을 TargetValue 1000으로 건다. Metric Math를 쓰지 않을 때 선택할 수 있는 방식이다.

### Step Scaling으로 거는 경우 (세밀 제어)

BacklogPerTask 알람에 단계별 조정을 직접 정의한다. 살짝 넘으면 +2, 많이 넘으면 +10 식으로 폭증에 공격적으로 대응. 대신 알람과 정책을 직접 관리해 손이 더 간다.

`MetricIntervalLowerBound`와 `MetricIntervalUpperBound`는 지표 절대값이 아니라 CloudWatch 알람 임계값과의 차이다. 예를 들어 알람 임계값이 1,000이면 아래의 `0`에서 `1000` 구간은 실제 지표 1,000 이상 2,000 미만을 뜻한다.

```json
{ "AdjustmentType": "ChangeInCapacity", "MetricAggregationType": "Average",
  "StepAdjustments": [
    { "MetricIntervalLowerBound": 0,    "MetricIntervalUpperBound": 1000, "ScalingAdjustment": 2 },
    { "MetricIntervalLowerBound": 1000, "MetricIntervalUpperBound": 5000, "ScalingAdjustment": 5 },
    { "MetricIntervalLowerBound": 5000,                                   "ScalingAdjustment": 10 } ] }
```

## 실무 팁 (빼먹으면 고생)

- **Cooldown 비대칭**: ScaleOut은 짧게(스파이크 빠른 반응), ScaleIn은 길게(섣불리 줄였다 늘리는 flapping 방지). 위 60/300이 그 이유
- **Graceful shutdown 필수**: scale-in 시 task가 SIGTERM을 받는다. `onApplicationShutdown`으로 in-flight 메시지를 마무리해 강제 중단 가능성을 낮추고, 중복 처리는 visibility timeout과 멱등성으로 별도 방어한다. ECS task의 `stopTimeout`(기본 30초)도 처리 시간에 맞춰 늘린다 (→ [[SQS-Consumer-Lambda-vs-ECS]], [[Container-Entrypoint-Signals]])
- **`ApproximateAgeOfOldestMessage` 별도 알람**: 오토스케일링이 못 따라가는 비정상(다운스트림 장애 등)을 잡는 안전망
- **Metric Math의 Scale-to-zero는 별도 처리**: 구현 A의 `visible / tasks`는 task가 0이면 값을 만들 수 없다. 이 방식으로 0까지 내리려면 "메시지 0 초과 알람 → 0에서 1 깨우기"를 Step Scaling이나 Lambda로 따로 건다. 구현 B처럼 0일 때도 분모를 1로 두고 지표를 계속 발행하면 Target Tracking 자체가 0에서 scale-out할 수 있다. 단순한 운영이 우선이면 min 1이 현실적이다
- **여러 Target Tracking 정책 동시 사용**: 하나라도 scale-out 조건이면 늘리고, scale-in이 활성화된 모든 정책이 scale-in 조건일 때만 줄인다

## Fargate vs EC2 차이 — 스케일링 레이어 1개 vs 2개

핵심은 **Fargate는 스케일링 레이어가 1개, EC2는 2개**라는 것.

- **Fargate (레이어 1)**: 인스턴스 개념이 없어 AWS가 밑단 컴퓨팅을 댄다. 서비스의 task 수(backlog-per-task)만 조절하면 끝. 자리 걱정이 없다.
- **EC2 (레이어 2)**:
  - 레이어 1 = 서비스 오토스케일링(task 수) — Fargate와 동일, backlog-per-task 그대로
  - 레이어 2 = 클러스터 캐파시티(EC2 인스턴스 수) — EC2에만 추가. task를 늘려도 인스턴스에 빈 자리(CPU나 메모리)가 없으면 task가 `PROVISIONING`에서 멈춘다. 인스턴스 fleet도 같이 스케일해야 한다.

**레이어 2 거는 법**: AWS 관리형 선택지는 **Capacity Provider + Managed Scaling**이다. 캐파시티 프로바이더가 ASG를 감싸고 ECS가 `CapacityProviderReservation` 메트릭을 **target_capacity %**에 맞춰 인스턴스를 자동 증감한다. **Managed Termination Protection**으로 task가 도는 인스턴스는 scale-in에서 보호한다 (ASG `protect_from_scale_in = true`와 짝).

맞물리는 체인: 백로그 증가 → (레이어1) task 추가 → 자리 필요 → `CapacityProviderReservation` 증가 → (레이어2) EC2 인스턴스 추가.

전체 Terraform 코드화(공통 + Fargate/EC2 옵션)는 → [[ECS-SQS-Worker-Terraform|SQS 워커 ECS 오토스케일링 Terraform]]

## 표준 셋업 요약

토대(scalable target) → Target Tracking 한 방 → 지표는 CPU 말고 backlog-per-task(Metric Math 또는 Lambda publish) → cooldown 비대칭 + graceful shutdown + age 알람.

## 관련 문서

- [[ECS|Amazon ECS]]
- [[Auto-Scaling|EC2 Auto Scaling (ASG)]]
- [[SQS-Consumer-Lambda-vs-ECS|SQS 컨슈머 선택: Lambda vs ECS]]
- [[SQS|Amazon SQS]]
- [[CloudWatch|CloudWatch]]

## 출처

- [AWS Auto Scaling 공식 문서, Scaling based on Amazon SQS](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html)
- [AWS 공식 문서, Amazon ECS service auto scaling](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
- [Application Auto Scaling API, PutScalingPolicy](https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PutScalingPolicy.html)
- [Application Auto Scaling API, PredefinedMetricSpecification](https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PredefinedMetricSpecification.html)
