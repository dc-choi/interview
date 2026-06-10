---
tags: [observability, aws, cloudwatch, monitoring, logs, metrics]
status: done
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
