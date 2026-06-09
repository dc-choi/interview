---
tags: [observability, aws, cloudwatch, monitoring, logs, metrics]
status: done
category: "Observability"
aliases: ["CloudWatch", "Amazon CloudWatch"]
---

# Amazon CloudWatch

AWS의 통합 옵저버빌리티 — **Metrics, Logs, Alarms, Events, Insights** 서비스. AWS 리소스의 기본 메트릭이 자동 수집되며, 커스텀 메트릭, 로그, 대시보드, 알람을 통합 관리.

## 4가지 핵심 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| **Metrics** | 시계열 수치 데이터 (CPU, 요청수, 지연시간) |
| **Logs** | 텍스트, 구조화 로그 스트림 |
| **Alarms** | 메트릭 임계값 위반 시 알림 (SNS, Auto Scaling) |
| **Events / EventBridge** | 상태 변화 이벤트 라우팅 |

## Metrics 계층

| 계층 | 출처 | 주기 | 비용 |
|------|------|------|------|
| **기본 모니터링** | AWS 서비스 자동 (EC2 CPU, ALB Request, RDS) | **5분** | 무료, 자동 활성화 |
| **상세 모니터링** | EC2 등 옵션 활성화 | **1분** | 추가 비용, 선택 사항 |
| **커스텀 메트릭** | 앱이 `PutMetricData`로 전송 (AWS CLI/API) | 임의 | 메트릭당 월정액 |
| **고해상도** | 1초 단위 (high-resolution) | 1초 | 비용↑↑ |

EC2 기본 수집 항목: **CPU, Network, Disk, Status Check**. **메모리(Memory)는 기본 메트릭에 없음** — 시험 단골. 메모리, 디스크 사용률은 CloudWatch Agent로 커스텀 메트릭 수집.

### Namespace, Dimension, Metric

```
Namespace: MyApp/Performance
  Metric: ResponseTime
    Dimensions: { Environment: Production, Service: orders }
    Value: 123.45 ms
```

| 개념 | 의미 |
|------|------|
| **Namespace** | 메트릭 그룹 (서비스 단위) |
| **Metric Name** | 측정하는 값의 이름 |
| **Dimensions** | 메트릭 차원 (최대 30, 같은 차원 조합 = 다른 시계열) |

**Dimension cardinality 함정** — 사용자 ID, trace ID 같은 고카디널리티를 dimension에 넣으면 메트릭 비용 폭증. 로그, 태그로.

## Embedded Metric Format (EMF) — 로그+메트릭 동시

JSON 로그 안에 메트릭을 임베드하면 CloudWatch가 자동 파싱:

```json
{
  "_aws": {
    "Timestamp": 1733564000000,
    "CloudWatchMetrics": [{
      "Namespace": "MyApp",
      "Dimensions": [["Environment"]],
      "Metrics": [{ "Name": "ResponseTime", "Unit": "Milliseconds" }]
    }]
  },
  "Environment": "Production",
  "ResponseTime": 123.45,
  "RequestId": "abc-123"
}
```

장점:
- **PutMetricData API 호출 0** — 로그 송출만으로 메트릭화
- 로그, 메트릭 동일 시점 (디버깅 시 메트릭 → 로그 연결)
- Lambda, ECS에 EMF SDK 적용 — 비용, 코드 단순화

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
| **Metric Filter** | 로그 패턴 매칭 → 메트릭 자동 생성 |
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

지원 연산: `filter`, `stats`, `sort`, `bin`, `parse` (정규식 추출), `display`. 인덱스 없음 — 스캔 기반이라 시간 범위 좁힐수록 빠름, 저렴.

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

### Alarm Action — 자동 대응

알람 상태 변화에 따라 **자동화 작업**을 트리거:

| 대상 | 가능한 액션 |
|------|------------|
| **EC2** | 인스턴스 **중지, 종료, 재부팅, 복구(recover)** |
| **Auto Scaling** | Simple / Step Scaling Policy 트리거 |
| **SNS** | 토픽으로 알림 → 이메일, Lambda, SQS 팬아웃 |
| **Systems Manager** | Incident, OpsItem 자동 생성 |

### Composite Alarm

여러 알람을 **AND, OR, NOT**으로 묶음:
```
ALARM(CPU_High) AND ALARM(Memory_High) → Composite ALARM
```
오탐 줄이고 진짜 사고만 알림.

### Anomaly Detection

ML 기반 정상 범위 자동 학습 — 정적 임계값 대신 동적 밴드. 트래픽 패턴이 시간대마다 다른 서비스에 적합.

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

기본 EC2 메트릭에는 **메모리, 디스크가 없음** — Agent 필수.

## EventBridge (구 CloudWatch Events)

상태 변화 이벤트 라우팅 — EC2 인스턴스 상태, CodeDeploy 배포, CloudWatch Alarm 발화 등을 Lambda, SQS, Step Functions로:

```
이벤트 패턴 매칭 → 타겟 라우팅
```

자세한 건 [[EventBridge]].

## ServiceLens, X-Ray, 비용 함정

X-Ray 분산 추적과 CloudWatch 메트릭, 로그 통합 뷰 (트레이스 → 메트릭 → 로그). 비용 함정: Log retention 무기한, 고카디널리티 Dimension, 고해상도 메트릭 남발, Log Insights 넓은 시간 범위, Custom 메트릭 무분별 — 환경별 retention 정책, EMF 통합, 태그 활용으로 절감.

## 흔한 실수

- **로그에 시크릿 평문** — Subscription Filter로 KMS 암호화, 마스킹
- **Alarm 임계값을 인스턴스 단위로** — Composite, Anomaly Detection로 그룹, 동적
- **메모리 메트릭 없는데 알람 못 만든다고 포기** — CloudWatch Agent로 수집
- **Lambda 로그를 Lambda Insights 없이 디버깅** — 콜드 스타트, 메모리 분리 분석 어려움
- **Log Group retention 미설정** — 기본 무기한, 비용 누적
- **PutMetricData를 hot path에서 동기 호출** — 로그+EMF로 비동기화

## 면접 / 시험 체크포인트

- 메트릭, 로그, 알람, 이벤트의 통합 구조
- 기본 모니터링 **5분 / 상세 모니터링 1분** (상세는 옵션, 유료)
- EC2 기본 메트릭에 **메모리, 디스크 없음** → CloudWatch Agent로 커스텀 수집
- EMF가 PutMetricData보다 비용, 디버깅에서 우월한 이유
- Dimension 고카디널리티의 함정과 대안 (태그, 로그)
- Composite Alarm vs Static Threshold — 오탐 감소
- Alarm Action으로 EC2 **중지, 종료, 재부팅, 복구** + Auto Scaling 트리거 가능
- Log Insights 쿼리 구조 (filter, stats, bin)
- Logs 소스: **CloudTrail, VPC Flow Log, Route 53, EC2(Agent), Lambda**
- Container Insights, Lambda Insights, X-Ray의 역할 분리
- Log Retention 기본 **무기한** → 비용 함정

## 출처
- AWS 핵심 서비스 정리 — 학습 메모
- AWS SAA C03 학습 자료 (로컬)

## 관련 문서
- [[관측가능성(Observability)|Observability]]
- [[Logs-vs-Metrics|Logs vs Metrics]]
- [[Application-Performance-Monitoring|APM]]
- [[Structured-Logging|구조화 로깅]]
- [[Container-Monitoring|컨테이너 모니터링]]
- [[Ops-Level-Indicator|운영 지표]]
- [[EventBridge|EventBridge]]
- [[AWS|EC2]]
- [[AWS-Lambda|Lambda]]
- [[Auto-Scaling|EC2 Auto Scaling]]
