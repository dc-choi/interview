---
tags: [infrastructure, aws, ecs, auto-scaling, sqs, fargate]
status: done
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

## 정책 3종

| 정책 | 동작 | 쓸 때 |
|---|---|---|
| **Target Tracking** | 지표 하나를 목표값으로 유지(온도조절기). 알람 자동 생성 | 90%는 이것 (손 제일 덜 감) |
| **Step Scaling** | CloudWatch 알람 + 임계 단계별 조정량 직접 정의 | 폭증에 단계별로 공격적 대응 |
| **Scheduled Scaling** | cron으로 시간대별 min/max 변경 | 예측 가능한 패턴(업무시간, 배치) |

실무는 Scheduled로 바닥(floor)을 깔고 + Target Tracking으로 그 안의 변동을 처리하는 조합을 많이 쓴다.

## 지표 선택 — SQS 워커에 CPU는 함정

ECS 기본 Target Tracking 지표는 `ECSServiceAverageCPUUtilization`, `ECSServiceAverageMemoryUtilization`, `ALBRequestCountPerTarget` 셋이다. 그런데 SQS 워커한테 CPU와 메모리는 **나쁜 신호**다.

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

### 구현 A — Metric Math (Lambda 불필요, 요즘 추천)

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

그 다음 단일 CustomizedMetricSpecification(Namespace `SQS-ECS-Scaling`, MetricName `BacklogPerTask`)을 TargetValue 1000으로 건다. 오래된 AWS 정석 패턴이다.

### Step Scaling으로 거는 경우 (세밀 제어)

BacklogPerTask 알람에 단계별 조정을 직접 정의한다. 살짝 넘으면 +2, 많이 넘으면 +10 식으로 폭증에 공격적으로 대응. 대신 알람과 정책을 직접 관리해 손이 더 간다.

```json
{ "AdjustmentType": "ChangeInCapacity", "MetricAggregationType": "Average",
  "StepAdjustments": [
    { "MetricIntervalLowerBound": 0,    "MetricIntervalUpperBound": 1000, "ScalingAdjustment": 2 },
    { "MetricIntervalLowerBound": 1000, "MetricIntervalUpperBound": 5000, "ScalingAdjustment": 5 },
    { "MetricIntervalLowerBound": 5000,                                   "ScalingAdjustment": 10 } ] }
```

## 실무 팁 (빼먹으면 고생)

- **Cooldown 비대칭**: ScaleOut은 짧게(스파이크 빠른 반응), ScaleIn은 길게(섣불리 줄였다 늘리는 flapping 방지). 위 60/300이 그 이유
- **Graceful shutdown 필수**: scale-in 시 task가 SIGTERM을 받는다. `onApplicationShutdown`으로 in-flight 메시지를 다 처리하고 종료해야 유실과 중복이 안 생긴다. ECS task의 `stopTimeout`(기본 30초)도 처리 시간에 맞춰 늘린다 (→ [[SQS-Consumer-Lambda-vs-ECS]], [[Container-Entrypoint-Signals]])
- **`ApproximateAgeOfOldestMessage` 별도 알람**: 오토스케일링이 못 따라가는 비정상(다운스트림 장애 등)을 잡는 안전망
- **Scale-to-zero는 별도 처리**: 0까지 내리면 폴링할 task가 없어 백로그를 못 줄이고 BacklogPerTask도 0 나누기가 된다. 진짜 0으로 가려면 "메시지 0 초과 알람 → 0에서 1 깨우기"를 Step Scaling이나 Lambda로 따로 건다. 부담이면 min 1이 현실적
- **여러 정책 동시 사용**: Target Tracking과 다른 정책이 같이 있으면 ECS는 더 큰 task 수를 우선한다(안전한 방향), scale-in은 보수적으로 동작

## Fargate vs EC2 차이 — 스케일링 레이어 1개 vs 2개

핵심은 **Fargate는 스케일링 레이어가 1개, EC2는 2개**라는 것.

- **Fargate (레이어 1)**: 인스턴스 개념이 없어 AWS가 밑단 컴퓨팅을 댄다. 서비스의 task 수(backlog-per-task)만 조절하면 끝. 자리 걱정이 없다.
- **EC2 (레이어 2)**:
  - 레이어 1 = 서비스 오토스케일링(task 수) — Fargate와 동일, backlog-per-task 그대로
  - 레이어 2 = 클러스터 캐파시티(EC2 인스턴스 수) — EC2에만 추가. task를 늘려도 인스턴스에 빈 자리(CPU나 메모리)가 없으면 task가 `PROVISIONING`에서 멈춘다. 인스턴스 fleet도 같이 스케일해야 한다.

**레이어 2 거는 법**: 옛날엔 ASG를 CPUReservation이나 MemoryReservation으로 직접 스케일했지만 부정확했다. 현대 정석은 **Capacity Provider + Managed Scaling**이다. 캐파시티 프로바이더가 ASG를 감싸고 ECS가 `CapacityProviderReservation` 메트릭을 **target_capacity %**에 맞춰 인스턴스를 자동 증감한다. **Managed Termination Protection**으로 task가 도는 인스턴스는 scale-in에서 보호한다 (ASG `protect_from_scale_in = true`와 짝).

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

- [Scaling based on Amazon SQS — AWS Auto Scaling 공식 문서](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html)
- [Amazon ECS service auto scaling — AWS 공식 문서](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html)
</content>
