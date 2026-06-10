---
tags: [observability, aws, cloudwatch, monitoring, logs, metrics]
status: done
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
