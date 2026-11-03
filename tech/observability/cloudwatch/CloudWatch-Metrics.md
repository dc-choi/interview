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
| **커스텀 메트릭** | 앱이 `PutMetricData`로 전송 (AWS CLI/API) | 게시 간격 설정 | 메트릭과 API 요청 비용 확인 |
| **고해상도** | 1초 단위 (high-resolution) | 1초 해상도 | 게시 빈도와 고해상도 알람 비용 확인 |

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
| **Dimensions** | 메트릭 식별자의 일부인 이름/값 쌍. 최대 30개이며 고유한 조합마다 별도 메트릭 |

**Dimension cardinality 함정** — 사용자 ID, trace ID 같은 고카디널리티를 dimension에 넣으면 메트릭 비용 폭증. 로그, 태그로.

### 조회 차원과 보존 해상도

2026-10-13 공식 문서 기준, 아래는 기존 CloudWatch 메트릭 방식의 설명이다. OpenTelemetry 메트릭의 label과 보존 정책에 그대로 적용하지 않는다.

커스텀 메트릭은 게시한 namespace, 이름과 dimension 조합으로 조회한다. `Service=orders, Environment=prod`로 게시한 데이터에서 `Service`만 생략한다고 전체 서비스 합계가 자동 생성되지는 않는다. 여러 시계열의 집계는 별도 조회나 metric math로 설계한다.

| 데이터 간격 | 해당 해상도로 조회 가능한 기간 |
|---|---|
| 60초 미만 | 3시간 |
| 1분 | 15일 |
| 5분 | 63일 |
| 1시간 | 455일 |

짧은 간격의 데이터는 장기 보관 때 더 긴 간격으로 집계된다. 따라서 오래된 장애를 조사할 때 최근 데이터와 같은 해상도가 남아 있다고 가정하지 않는다.

최근 2주간 새 데이터가 없으면 콘솔 목록과 `list-metrics`에서 보이지 않을 수 있다. 이것만으로 삭제를 판단하지 않고 보존 기간 안의 데이터를 `get-metric-data` 또는 `get-metric-statistics`로 조회한다.

비용 점검에서는 메트릭 수, API 요청과 알람을 구분한다. EMF도 로그 수집과 커스텀 메트릭 비용이 있으므로 `PutMetricData`를 직접 호출하지 않는다는 사실을 무료라는 뜻으로 해석하지 않는다.

### 평균과 백분위의 질문을 구분한다

부분 검증(2026-10-13): 아래는 기존 CloudWatch 메트릭의 통계 정의와 커스텀 메트릭의 백분위 조회 조건이다.

- `Average`는 조회 기간의 `Sum / SampleCount`다. `p95`는 그 기간 데이터 분포의 95번째 백분위 경계이며 평균이나 표준편차가 아니다.
- 평균 지연이 낮아도 일부 요청은 오래 걸릴 수 있다. 운영 점검에서는 같은 메트릭, 단위와 기간의 평균, p95 또는 p99, 표본 수를 함께 본다. 정규분포를 확인하지 않고 백분위를 평균에서 몇 표준편차 떨어진 값으로 바꾸지 않는다.
- p99가 높다는 사실만으로 전체 요청이 그만큼 느리다고 해석하지 않는다. 어떤 기간과 요청 집합을 집계했는지, 느린 요청이 어떤 경로에 속하는지 로그와 함께 확인한다.

커스텀 메트릭의 백분위 계산에는 원시 데이터포인트가 필요하다. `Min`, `Max`, `Sum`, `SampleCount`로 미리 집계한 statistic set은 다음 중 하나를 만족해야 백분위를 조회할 수 있다.

1. `SampleCount = 1`이고 `Min = Max = Sum`이다.
2. `Min = Max`이고 `Sum = Min * SampleCount`다.

메트릭 값에 음수가 있으면 백분위 통계를 사용할 수 없다. 요청별 지연의 p99가 필요하다면 평균값만 게시한 뒤 원래 요청 분포를 복원할 수 있다고 가정하지 않는다.

## 서비스 quota 대비 사용률

부분 검증(2026-11-04): 아래 내용은 CloudWatch와 Service Quotas 공식 문서로 대조했다. 사용량 지표와 quota를 연동하는 일부 서비스에 적용하며, 모든 서비스의 모든 quota가 이 방식을 지원하는 것은 아니다.

1. CloudWatch의 Metrics에서 `Usage`와 `By AWS Resource`를 선택하고 대상 사용량 지표를 고른다.
2. 선택한 지표 ID가 `m1`이면 metric math의 `SERVICE_QUOTA(m1)`으로 연결된 quota 값을 표시한다.
3. `m1/SERVICE_QUOTA(m1)*100`으로 quota 대비 사용률을 계산한다. 원시 사용량과 백분율을 혼동하지 않는다.
4. 사용률 식에 정적 임계 알람을 만들고 SNS topic을 연결한다. `Greater`와 `80`을 설정한 예시는 사용률이 80%를 **초과**할 때 ALARM 상태로 바뀐다. 80%는 예시이며 모든 워크로드의 필수 기준은 아니다.

Service Quotas 콘솔에서도 CloudWatch 알람을 지원하는 quota를 선택해 알람을 만들 수 있다. 이 경로의 알람 생성과 알림 설정은 구분하며, 알림 동작은 별도로 확인한다. 알람 생성 자체를 quota 증액 완료로 해석하지 않는다.

운영 점검 제안: 사용량 증가 속도와 증액 요청에 필요한 여유를 고려해 임계값을 정하고, [[CloudWatch-Logs-Alarms|알림 전달 경로]]를 확인한다. 이 절은 문서 대조이며 실제 AWS 계정에서 알람을 생성하거나 수신을 시험한 결과는 아니다. 기존 절 전체를 재검증하지 않았으므로 frontmatter 검증일은 유지한다.

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

- [Visualizing your service quotas and setting alarms — AWS](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Quotas-Visualize-Alarms.html)
- [Service Quotas and Amazon CloudWatch alarms — AWS](https://docs.aws.amazon.com/servicequotas/latest/userguide/configure-cloudwatch.html)
- [CloudWatch statistics definitions — AWS](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Statistics-definitions.html)
- [Metrics concepts — AWS](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html)
- [Analyzing, optimizing, and reducing CloudWatch costs — AWS](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_billing.html)
- [CloudWatch metrics for your Application Load Balancer — AWS](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html)
- [Monitoring Amazon RDS metrics with Amazon CloudWatch — AWS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/monitoring-cloudwatch.html)
- [Amazon CloudWatch Pricing — AWS](https://aws.amazon.com/cloudwatch/pricing/)

## 관련 문서

- [[CloudWatch|CloudWatch 문서 인덱스]]
- [[CloudWatch-Logs-Alarms|CloudWatch Logs와 Alarms]]
