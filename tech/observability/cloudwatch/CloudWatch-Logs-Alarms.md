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

### VPC Flow Logs로 연결 실패 후보를 좁힌다

2026-10-16 AWS 공식 문서 대조 기준. Flow Logs를 받는 로그 그룹과 장애 시간 범위를 선택하고, 실제로 발견된 필드를 먼저 확인한다. Logs Insights의 VPC 필드명은 `interfaceId`, `srcAddr`, `dstAddr`, `srcPort`, `dstPort`, `action`, `logStatus`다. 원시 레코드의 `interface-id`, `srcaddr` 표기를 쿼리에 그대로 옮기지 않는다.

- **거부 흐름:** 대상 `interfaceId`와 `action = "REJECT"`로 좁힌 뒤 주소, 포트와 프로토콜을 확인한다. `REJECT`는 SG나 NACL 차단뿐 아니라 연결 종료 후 도착한 패킷에서도 나타날 수 있으므로 특정 규칙을 원인으로 바로 확정하지 않는다.
- **서브넷 범위:** IP 문자열 일부를 검색하는 대신 `isIpv4InSubnet(srcAddr, "192.0.2.0/24")`처럼 CIDR 포함 여부를 검사한다. 예시 주소는 실제 조사 대상 범위로 바꾼다.
- **집계 단위:** `count(*)`는 flow log 레코드 수다. 패킷 수와 전송량은 각각 `sum(packets)`, `sum(bytes)`로 구분한다. 레코드는 집계 구간의 네트워크 흐름이므로 요청 수나 HTTP 오류 수로 읽지 않는다.
- **빈 결과:** `logStatus = "SKIPDATA"`는 일부 기록이 생략됐다는 뜻이다. 로그 전달도 best effort이므로 결과가 없다는 사실만으로 통신 정상이나 트래픽 부재를 확정하지 않는다.

HTTP 503이나 timeout의 원인을 조사할 때는 같은 시각의 애플리케이션과 로드 밸런서 로그를 함께 대조한다(운영 점검 제안). Flow Logs의 허용/거부 기록만으로 애플리케이션 응답 원인을 확정할 수 없다. 이번 대조는 필드와 해석 범위에 한정하며 실제 AWS 계정에서 쿼리를 실행한 결과는 아니다. 기존 절 전체를 재검증하지 않아 frontmatter 검증일은 유지한다.

### SMS 발송 이벤트를 CloudWatch Logs로 받기

2026-10-15 AWS End User Messaging SMS 공식 문서 기준이다. 이벤트 목적지는 발송 상태를 관측하는 경로이며, 고객이 보낸 메시지를 받는 [[End-User-Messaging-Two-Way-SMS|양방향 SMS 수신 경로]]와 구분한다.

1. 로그 그룹과 쓰기용 IAM 역할을 준비하고 각각의 ARN을 확인한다.
2. configuration set에 CloudWatch 이벤트 목적지를 연결한다. 목적지에 로그 그룹 ARN과 역할 ARN을 지정하고 Event publishing을 켜며 필요한 SMS, MMS, 음성 이벤트 유형을 선택한다.
3. `SendTextMessage`의 `ConfigurationSetName`에 해당 구성 세트의 이름 또는 ARN을 전달한다. 목적지만 만들어 놓고 실제 발송 요청이 그 구성 세트를 참조하는지 확인하지 않으면 로그 경로를 검증한 것이 아니다.
4. 이벤트가 보이지 않으면 발송 요청의 구성 세트, 이벤트 유형과 활성화 상태, 역할의 신뢰 정책과 로그 쓰기 권한을 나누어 확인한다.

공식 역할 예시는 `sms-voice.amazonaws.com`의 `sts:AssumeRole`을 허용하고, 대상 로그 그룹에 `logs:CreateLogStream`, `logs:DescribeLogStreams`, `logs:PutLogEvents`를 부여한다. 신뢰 정책의 `aws:SourceAccount`와 `aws:SourceArn` 조건은 권장 사항이며, SourceArn의 대상은 **configuration set ARN**이다. 로그 그룹 ARN과 혼동하지 않는다.

통신사가 생성하는 이벤트와 배달 확인(DLR)은 수신까지 최대 72시간이 걸릴 수 있다. 이는 로깅 설정이 적용되기까지 일률적으로 72시간 기다려야 한다는 뜻이 아니다. 이 지연만으로 실제 발송이 지연됐다고 판단하지 않으며, AWS가 72시간 동안 최종 이벤트를 받지 못하면 `messageStatus`를 `UNKNOWN`으로 반환한다.

이 절은 설정과 해석 기준을 대조한 것이며 실제 계정에서 메시지를 발송하거나 로그 도착을 시험한 결과는 아니다.

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

### 자원 부하, 인스턴스 상태와 사용자 경로를 구분한다

부분 검증(2026-10-30): AWS의 EC2 status checks와 CloudWatch Synthetics 문서로 아래 범위를 대조했다. CPU 임계 알람 하나를 서비스 가용성 전체의 판정으로 쓰지 않고, 무엇을 검사한 결과인지 구분한다.

- **인프라와 인스턴스:** EC2의 system check는 기반 AWS 시스템을, instance check는 개별 인스턴스의 소프트웨어와 네트워크 연결을 점검한다. 상태 검사는 매분 수행되며 결과로 CloudWatch 알람을 구성할 수 있다. 네트워크 준비가 먼저 끝나면 다른 부팅 작업이 끝나기 전에 instance check가 정상일 수 있다.
- **애플리케이션 응답:** EC2 application status check는 사용자가 생성하고 인스턴스에 연결하는 선택 기능이다. 지정한 HTTP/HTTPS 경로와 정상으로 인정할 응답 코드를 검사하므로, 기본 인프라 검사만으로 이 경로까지 확인했다고 판단하지 않는다.
- **사용자 경로:** CloudWatch Synthetics canary는 정해진 일정으로 endpoint와 API를 요청해 실제 고객 트래픽이 없어도 가용성과 지연을 관측한다. 검사한 경로의 성공과 서비스 전체의 정상 여부는 구분한다.

운영 제안: 핵심 사용자 경로의 실패 신호, 알림 수신과 대응 담당자를 연결하고, 아래의 알림 전용 테스트로 전달 경로도 따로 확인한다. 이 절은 설정 선택의 기준이며 실제 계정에서 장애나 알림 전달을 시험하지 않았다. 기존 절 전체의 검증일은 유지한다.

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

- [Amazon EC2 — Status checks for Amazon EC2 instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-system-instance-status-check.html)
- [Amazon CloudWatch — Synthetic monitoring (canaries)](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html)

- [Amazon CloudWatch Logs — Supported logs and discovered fields](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_AnalyzeLogData-discoverable-fields.html)
- [Amazon CloudWatch Logs — Sample queries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html)
- [Amazon VPC — Flow log records](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html)
- [AWS End User Messaging SMS — Set up an Amazon CloudWatch event destination](https://docs.aws.amazon.com/sms-voice/latest/userguide/configuration-sets-cloud-watch.html)
- [AWS End User Messaging SMS — Create an Amazon CloudWatch event destination](https://docs.aws.amazon.com/sms-voice/latest/userguide/configuration-sets-cloud-watch-add.html)
- [AWS End User Messaging SMS — IAM policy for Amazon CloudWatch](https://docs.aws.amazon.com/sms-voice/latest/userguide/configuration-sets-cloud-watch-creating-role.html)
- [AWS End User Messaging SMS — SendTextMessage](https://docs.aws.amazon.com/pinpoint/latest/apireference_smsvoicev2/API_SendTextMessage.html)
- [AWS End User Messaging SMS — Event destinations](https://docs.aws.amazon.com/sms-voice/latest/userguide/configuration-sets-event-destinations.html)
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
