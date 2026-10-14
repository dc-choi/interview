---
tags: [observability, aws, cloudwatch, monitoring, logs, metrics]
status: done
verified_at: 2026-09-30
category: "Observability"
aliases: ["CloudWatch Logs", "CloudWatch Alarms"]
---

# CloudWatch Logs와 Alarms

## Logs — Log Group, Stream, Insights

### 구조

```
Log Group (e.g., /aws/lambda/my-function)
  ├── Log Stream (인스턴스, 실행 단위)
  │     ├── Log Event (timestamp + message)
  │     └── Log Event ...
  └── ...
```

### 주요 로그 소스

- **EC2** (CloudWatch Agent 경유)
- **Lambda** (실행 로그 자동)
- **CloudTrail** — API 호출 감사 로그
- **VPC Flow Logs** — VPC 내 트래픽 메타데이터
- **Route 53** — DNS 쿼리 로깅
- **온프레미스 서버** — Agent 설치 시

| 설정 | 의미 |
|------|------|
| **Retention** | 1일~10년, 무기한 (기본 무기한 — 비용 함정) |
| **Subscription Filter** | 로그를 Kinesis, Firehose, Lambda로 실시간 스트리밍 |
| **Metric Filter** | 로그 패턴 매칭 → 메트릭 자동 생성 ([[CloudWatch-Metric-Filters\|지표 필터]]) |
| **Encryption** | KMS 암호화 옵션 |

### Log Insights 쿼리

SQL 유사 DSL:

```
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)
| sort @timestamp desc
| limit 100
```

지원 연산에는 `filter`, `filterIndex`, `stats`, `sort`, `bin`, `parse`(정규식 추출), `display` 등이 있다. 스캔량 기반 과금이라 시간 범위를 좁힐수록 빠르고 저렴하지만 인덱스가 없는 것은 아니다. 구조화 로그에는 field index를 만들 수 있고 Standard 로그 클래스에는 `@logStream`, `traceId` 같은 기본 field index가 적용된다. 인덱싱된 필드를 `=` 또는 `IN`으로 조회하면 해당 필드가 없는 event를 건너뛰어 scan volume을 줄인다. Index는 정책 생성 이후 수집된 event에 적용되고 수집 시점부터 30일간 유지된다.

## Alarms

### Static Threshold

```
CPUUtilization > 80% for 5 consecutive minutes → SNS 알림
```

| 상태 | 의미 |
|------|------|
| OK | 임계값 안 |
| ALARM | 임계값 위반 |
| INSUFFICIENT_DATA | 데이터 부족 (시작 직후, 장애) |

`INSUFFICIENT_DATA`를 장애나 정상으로 자동 해석하지 않는다. 지표 특성에 맞춰 missing data를 `missing`, `ignore`, `breaching`, `notBreaching` 중 하나로 취급한다. 지속적으로 들어와야 하는 heartbeat는 missing을 장애 신호로 볼 수 있지만, 오류가 있을 때만 생기는 sparse metric은 missing을 정상으로 보는 편이 맞다.

### Alarm Action — 자동 대응

알람 상태 변화에 따라 **자동화 작업**을 트리거:

| 대상 | 가능한 액션 |
|------|------------|
| **EC2** | 인스턴스 **중지, 종료, 재부팅, 복구(recover)** |
| **Auto Scaling** | Simple / Step Scaling Policy 트리거 |
| **SNS** | 토픽으로 알림 → 이메일, Lambda, SQS 팬아웃 |
| **Lambda** | 함수를 비동기로 직접 호출. 함수 resource policy에서 CloudWatch 알람의 호출을 허용해야 함 |
| **Systems Manager** | Incident, OpsItem 자동 생성 (ALARM 진입 시에만) |
| **CloudWatch investigations** | ALARM 진입 시 investigation 시작 |

### Composite Alarm

여러 알람을 **AND, OR, NOT**으로 묶음:
```
ALARM(CPU_High) AND ALARM(Memory_High) → Composite ALARM
```
오탐 줄이고 진짜 사고만 알림.

### Anomaly Detection

ML 기반 정상 범위 자동 학습 — 정적 임계값 대신 동적 밴드. 트래픽 패턴이 시간대마다 다른 서비스에 적합.

### Billing Alarm — EstimatedCharges

예상하지 못한 비용 증가를 금액 임계로 잡는 알람이다.

- 먼저 Billing and Cost Management의 Billing preferences > Alert preferences에서 Receive CloudWatch Billing Alerts를 켠다. root 사용자나 billing 조회 권한이 있는 IAM 사용자가 켜며, 켠 뒤에는 데이터 수집을 끌 수 없고 알람만 지울 수 있다. 처음 켜면 약 15분 뒤부터 조회된다.
- `EstimatedCharges` 지표는 전 세계 요금의 당월 추정치(전체 합계와 서비스별)지만 us-east-1에만 저장된다. 알람도 us-east-1에서 만들고 금액 단위는 USD뿐이다.
- 추정 요금은 하루 여러 번 계산돼 들어온다. 공식 절차의 예시 설정은 Statistic Maximum, Period 6시간, Datapoints 1 out of 1, missing data는 missing이다.
- 현재 청구액이 임계를 넘을 때만 울리고 월말 예측은 쓰지 않는다. 이미 넘은 상태에서 만들면 바로 ALARM이다. 월말 초과를 미리 알리는 일은 [[Budget-Alert|AWS Budgets]]의 Forecasted 알림에 맡긴다.
- 통합 결제에서는 관리(payer) 계정이 Receive Billing Alerts를 켜야 member 계정 지표도 수집되고, 관리 계정을 바꾸면 새 계정에서 다시 켠다. APN 계정에는 billing 지표가 게시되지 않는다.

### 알림 경로 점검 — SNS 이메일 구독

알람 상태가 바뀌어도 알림이 사람에게 닿는지는 별도로 확인해야 한다. [[SNS]] 이메일 구독의 확인, 정지와 반송 억제 조건은 [[SNS-Email-SES|SNS 이메일 구독 제약]]에 정리돼 있고, 알람 경로에서는 다음이 문제가 된다.

- 확인 전이거나 정지된 구독은 PendingConfirmation 상태라 알람이 울려도 메일이 가지 않는다.
- 이메일 endpoint로 초당 10건을 넘게 보내면 구독이 정지된다. 알람이 한꺼번에 몰리는 장애 순간에 이메일 경로가 끊길 수 있다.

알람을 만든 뒤 `SetAlarmState`로 상태를 잠시 바꿔 실제 수신까지 확인한다. 상태가 달라지면 그 상태에 설정된 작업이 실제로 실행되므로 EC2 중지나 종료, Auto Scaling, Lambda 호출, OpsItem이나 Incident Manager incident 생성, investigation 시작이 걸린 알람에는 쓰지 않고, 알림 topic만 action으로 둔 테스트 알람으로 확인한다. 그 topic에 Lambda나 SQS 구독이 있으면 테스트 알림도 그쪽으로 전달된다. metric alarm은 보통 몇 초 안에 실제 상태로 돌아오지만 composite alarm은 자식 알람 중 하나의 상태가 바뀌거나 설정을 고칠 때까지 강제한 상태에 머물 수 있다. 구독 상태와 반송 억제 여부는 정기 점검 항목에 넣는다.

### 암호화된 SNS 토픽 — 발행 권한과 키 권한

2026-10-14 AWS 공식 문서 기준, CloudWatch 알람에서 암호화된 SNS 토픽으로 보내려면 두 권한 경계를 확인한다.

| 경계 | 확인할 권한 |
|---|---|
| SNS 토픽 정책 | `cloudwatch.amazonaws.com`이 해당 토픽에 `sns:Publish`를 수행할 수 있는지 |
| KMS 키 정책 | 같은 서비스 주체가 해당 키의 `kms:GenerateDataKey*`, `kms:Decrypt`를 사용할 수 있는지 |

이 구성에는 대칭 암호화용 **고객 관리형 KMS 키**를 사용한다. 알람을 생성한 사용자의 권한이나 SNS 발행 허용만으로 CloudWatch 서비스의 키 사용 권한까지 충족되는 것은 아니다.

토픽 정책에서는 `aws:SourceArn`을 알림을 보내는 **알람 ARN**으로 제한하고, `aws:SourceAccount`에는 그 알람의 계정을 지정한다. 토픽 ARN을 SourceArn에 넣지 않는다. 알람 ARN에 비ASCII 문자가 있으면 CloudWatch 공식 안내대로 `aws:SourceAccount`만 사용해 제한한다. KMS 정책의 조건도 해당 서비스의 지원 범위를 따르며 EventBridge용 정책을 그대로 복사하지 않는다.

운영 점검에서는 알람 상태 전환, SNS 발행, 최종 구독 수신을 분리한다. 사용자 자격으로 SNS에 직접 보낸 테스트가 성공해도 CloudWatch 서비스 주체의 KMS 권한은 별도 확인이 필요하다. 위의 알림 전용 테스트 알람으로 실제 경로를 확인하며, 이 절은 설정 기준이지 실제 계정의 전달 성공 기록은 아니다.

## 출처

- [Amazon CloudWatch — Configuring how alarms treat missing data](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html)
- [Amazon CloudWatch — SetAlarmState API](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_SetAlarmState.html)
- [Amazon CloudWatch — Alarm actions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html)
- [Amazon CloudWatch — Invoke a Lambda function from an alarm](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-actions-Lambda.html)
- [Amazon CloudWatch Logs, Field indexes](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatchLogs-Field-Indexing.html)
- [Amazon CloudWatch — Create a billing alarm to monitor your estimated AWS charges](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html)
- [Amazon SNS — Email subscription setup and management](https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html)
- [Amazon SNS — Managing Amazon SNS encryption keys and costs](https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html)
- [Amazon CloudWatch — Notifying users on alarm changes](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Notify_Users_Alarm_Changes.html)
- [Sungmin Kim 강사 — CloudWatch란?](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=48604)
- [Sungmin Kim 강사 — CloudWatch Alarm](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=49555)
- [Sungmin Kim 강사 — CloudWatch 실습](https://www.inflearn.com/courses/lecture?courseId=325381&unitId=50085)
