---
tags: [observability, aws, cloudwatch, monitoring, logs, metrics]
status: done
verified_at: 2026-08-25
category: "Observability"
aliases: ["CloudWatch Agent", "CloudWatch 운영과 비용 함정"]
---

# CloudWatch 운영 — Agent, Insights, 비용 함정

## Container Insights, Lambda Insights

| 인사이트 | 자동 수집 |
|---------|---------|
| **Container Insights** | ECS, EKS Task별 CPU, 메모리, 네트워크, 디스크 |
| **Lambda Insights** | Lambda 콜드스타트, Init duration, 메모리, CPU |
| **Application Insights** | .NET, Java 서비스의 자동 모니터링 |
| **Synthetics** | Canary로 외부에서 주기적 헬스 체크 |

## CloudWatch Agent

EC2, 온프레미스 호스트에 설치 — 시스템 메트릭(CPU, 메모리, 디스크), 로그 수집:

```
CloudWatch Agent (EC2)
  ├── 메트릭: mem_used_percent, disk_used_percent (기본 메트릭에 없음)
  ├── 로그: /var/log/* → CloudWatch Logs
  └── StatsD, collectd 호환
```

기본 EC2 메트릭에는 메모리와 파일시스템 공간 사용률이 없다. EC2의 디스크 I/O 메트릭과 파일시스템 사용률을 구분한다. CloudWatch Agent는 이 OS 지표를 수집하는 방법이며 직접 커스텀 메트릭을 보내는 다른 수집기도 사용할 수 있다.

### 설치, 설정 적용과 수신 확인을 나눈다

이 절과 위 EC2 기본 지표의 구분은 2026-10-09 AWS 공식 문서로 대조했다. 다른 절 전체의 검증일을 갱신한 것은 아니다.

1. EC2에 연결한 IAM 역할의 전송 권한을 확인한다. AWS의 `CloudWatchAgentServerPolicy`를 출발점으로 실제 수집 범위에 맞는 권한을 검토한다.
2. 에이전트를 설치하고 수집 설정을 작성한다. Linux에서는 `mem`의 `used_percent`와 `disk`의 `used_percent`로 메모리와 파일시스템 사용률을 지정할 수 있다. 전송되는 기본 지표 이름은 각각 `mem_used_percent`, `disk_used_percent`다.
3. 로컬 설정은 `amazon-cloudwatch-agent-ctl`의 `fetch-config`로 적용하고 시작한다. 파일 수정이나 패키지 설치만으로 실행 중인 수집 설정이 바뀌었다고 판단하지 않는다.
4. 프로세스 상태와 로그를 확인한 뒤 CloudWatch에서 최근 데이터포인트가 도착하는지 확인한다. 기본 네임스페이스는 `CWAgent`이며 설정으로 바꿀 수 있다.

메모리와 디스크는 차원 조합이 다를 수 있다. 알람을 만들기 전에 실제 게시된 네임스페이스, 지표 이름과 차원을 선택한다. 프로세스가 실행 중이라는 사실과 올바른 대상의 지표가 도착했다는 사실은 별도로 확인한다. 위 절차는 공식 문서 대조이며 실제 EC2 실행 검증은 아니다.

## EventBridge (구 CloudWatch Events)

상태 변화 이벤트 라우팅 — EC2 인스턴스 상태, CodeDeploy 배포, CloudWatch Alarm 발화 등을 Lambda, SQS, Step Functions로:

```
이벤트 패턴 매칭 → 타겟 라우팅
```

자세한 건 [[EventBridge]].

## ServiceLens, X-Ray, 비용 함정

X-Ray 분산 추적과 CloudWatch 메트릭, 로그 통합 뷰 (트레이스 → 메트릭 → 로그). 비용 함정: Log retention 무기한, 고카디널리티 Dimension, 고해상도 메트릭 남발, Log Insights 넓은 시간 범위, Custom 메트릭 무분별 — 환경별 retention 정책, EMF 통합, 태그 활용으로 절감.

## 흔한 실수

- **로그에 시크릿 평문** — 데이터 보호 정책으로 감사, 마스킹하고 로그 그룹은 KMS 키로 암호화. Subscription Filter는 Kinesis Data Streams, Firehose, Lambda로 로그를 실시간 전달
- **Alarm 임계값을 인스턴스 단위로** — Composite, Anomaly Detection로 그룹, 동적
- **메모리 메트릭 없는데 알람 못 만든다고 포기** — CloudWatch Agent로 수집
- **Lambda 로그를 Lambda Insights 없이 디버깅** — 콜드 스타트, 메모리 분리 분석 어려움
- **Log Group retention 미설정** — 기본 무기한, 비용 누적
- **PutMetricData를 hot path에서 동기 호출** — 로그+EMF로 비동기화

## 면접 / 시험 체크포인트

- 메트릭, 로그, 알람, 이벤트의 통합 구조
- 기본 모니터링 **5분 / 상세 모니터링 1분** (상세는 옵션, 유료)
- EC2의 디스크 I/O와 메모리, 파일시스템 사용률 구분, Agent 설정 적용과 수신 확인
- EMF가 PutMetricData보다 비용, 디버깅에서 우월한 이유
- Dimension 고카디널리티의 함정과 대안 (태그, 로그)
- Composite Alarm vs Static Threshold — 오탐 감소
- Alarm Action으로 EC2 **중지, 종료, 재부팅, 복구** + Auto Scaling 트리거 가능
- Log Insights 쿼리 구조 (filter, stats, bin)
- Logs 소스: **CloudTrail, VPC Flow Log, Route 53, EC2(Agent), Lambda**
- Container Insights, Lambda Insights, X-Ray의 역할 분리
- Log Retention 기본 **무기한** → 비용 함정

## 출처

- [AWS, CloudWatch metrics that are available for your instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html)
- [AWS, CloudWatchAgentServerPolicy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html)
- [AWS, Manually create or edit the CloudWatch agent configuration file](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html)
- [AWS, Create the CloudWatch agent configuration file](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file.html)
- [AWS, Metrics collected by the CloudWatch agent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html)
- [AWS, PutAccountPolicy](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutAccountPolicy.html)
- [AWS, Encrypt log data in CloudWatch Logs using AWS Key Management Service](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html)
