---
tags: [observability, aws, cloudwatch, monitoring, logs, metrics]
status: done
verified_at: 2026-08-12
category: "Observability"
aliases: ["CloudWatch Metrics", "CloudWatch EMF"]
---

# CloudWatch Metrics

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
| **기본 모니터링 (EC2)** | EC2 자동 수집 | **5분** | 추가 과금 없음, 자동 활성화 |
| **상세 모니터링 (EC2)** | EC2 옵션 활성화 | **1분** | 추가 비용, 선택 사항 |
| **커스텀 메트릭** | 앱이 `PutMetricData`로 전송 (AWS CLI/API) | 임의 | 메트릭당 월정액 |
| **고해상도** | 1초 단위 (high-resolution) | 1초 | 비용↑↑ |

EC2 기본 수집 항목: **CPU, Network, Disk, Status Check**. **메모리(Memory)는 기본 메트릭에 없음** — 시험 단골. 메모리, 디스크 사용률은 CloudWatch Agent로 커스텀 메트릭 수집.

**기본/상세(5분 대 1분)는 EC2의 개념** — 다른 서비스의 기본 게시 주기는 서비스마다 다르다. ALB는 요청이 흐르는 동안 60초 간격으로(무트래픽 구간은 데이터포인트 결측), RDS는 기본 1분 주기로 메트릭을 보내므로 1분 지표를 얻으려고 상세 모니터링을 켤 필요가 없다. RDS의 Enhanced Monitoring은 CloudWatch 메트릭 주기를 바꾸는 기능이 아니라 OS 레벨 지표를 CloudWatch Logs로 보내는 별개 기능이다.

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

## 출처

- [CloudWatch metrics for your Application Load Balancer — AWS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html)
- [Monitoring Amazon RDS metrics with Amazon CloudWatch — AWS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/monitoring-cloudwatch.html)
- [Amazon CloudWatch Pricing — AWS](https://aws.amazon.com/cloudwatch/pricing/)
