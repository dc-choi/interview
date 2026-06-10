---
tags: [observability, aws, cloudwatch, monitoring, logs, metrics]
status: done
category: "Observability"
aliases: ["CloudWatch Metrics", "CloudWatch EMF"]
---

# CloudWatch Metrics와 EMF

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
