---
tags: [aws, rds, monitoring, cloudwatch, observability, performance-insights]
status: done
verified_at: 2026-08-26
category: "Infrastructure - AWS"
aliases: ["RDS Monitoring Metrics", "RDS 모니터링 지표와 알람"]
---

# RDS 모니터링 — 지표와 알람 기준

## 모니터링 3계층

| 계층 | 도구 | 관찰 대상 |
|---|---|---|
| **인프라 지표** | CloudWatch Metrics | CPU, 메모리, 디스크, 네트워크, 커넥션 수 |
| **DB 내부 지표** | CloudWatch Database Insights와 Performance Insights 데이터 | 쿼리 대기 이벤트, Top SQL, 세션 활동 |
| **쿼리 로그** | RDS Log + CloudWatch Logs | Slow Query, DDL, Error |

세 계층을 결합해야 "왜 느려졌는가"에 답할 수 있다. CloudWatch만 보면 CPU 90% 사실만 알지 어떤 쿼리 때문인지 모름.

## CloudWatch 핵심 지표

| 지표 | 관찰 기준 예시 | 의미 |
|---|---|---|
| `CPUUtilization` | 평소 대비 지속 상승 | DB Load의 CPU wait, 쿼리와 인덱스를 함께 확인 |
| `DatabaseConnections` | 실제 `max_connections`의 80% 접근 | 커넥션 고갈 위험 — 풀 사이즈, 애플리케이션 누수 확인 |
| `FreeableMemory` | 하락 추세와 `SwapUsage` 상승 | 캐시 사용을 메모리 부족으로 단정하지 말고 swap, 엔진 메모리와 함께 확인 |
| `FreeStorageSpace` | 자동 확장 최대치와 증설 소요 시간 접근 | 즉시 증설을 가정하지 말고 증가율과 최대 storage threshold 확인 |
| `ReadIOPS` / `WriteIOPS` | gp3의 baseline 또는 provisioned IOPS, throughput 대비 | gp3 설정 한도 포화 가능성 — IOPS, throughput, 큐와 지연을 함께 확인 |
| `ReplicaLag` | 서비스의 허용 지연, RPO 초과 | lag가 0보다 크면 read-after-write가 깨질 수 있어 라우팅 정책과 함께 확인 |
| `DiskQueueDepth` | 정상 기준선 대비 지속 상승 | 지연, IOPS와 함께 I/O 병목 여부 판단 |
| `BurstBalance` | gp2에서 지속 하락 | 버스트 크레딧 소진 전에 스토리지 유형과 용량 재검토 |

### 알람 임계치 설계 원칙

- **P99, 정적값보다 변화량** — "평소 30% → 80% 증가"가 "80% 상태"보다 유의미
- **복합 조건** — "CPU > 80% **AND** Connection > 150" 식으로 오탐 감소
- **서비스 중요도별 차등** — 결제 DB는 P95 5ms, 분석 DB는 P95 500ms 등

## Database Insights와 Performance Insights 전환

AWS는 Performance Insights 독립 콘솔 경험을 **2026-07-31** 종료하고 CloudWatch Database Insights로 전환한다. Performance Insights API와 파라미터는 계속 유지되지만 청구는 Database Insights 항목으로 표시된다. 아무 조치가 없으면 Performance Insights를 사용하던 인스턴스는 기존 retention을 유지한 Database Insights Standard mode로 전환된다.

- **Standard**: DB Load의 주요 contributor와 기본 분석, 유연한 retention을 제공한다.
- **Advanced**: fleet view, 일부 엔진의 lock과 execution plan 진단, on-demand analysis 같은 확장 기능을 제공한다. 기능과 Region 지원 여부를 확인한다.
- 생성 wizard의 기본값과 지원 기능은 엔진, Region과 시점에 따라 달라질 수 있다. 콘솔 표시만 믿지 말고 각 DB의 Database Insights mode, retention과 수집 상태를 API 또는 IaC 설정으로 확인한다.
- **DB Load** = 평균 활성 세션(AAS), 즉 CPU에서 실행 중이거나 wait 중인 세션의 평균. vCPU 선은 해석 기준이지만 wait event 분해가 필요하다.
- 시간대별 Top SQL과 엔진, 버전별 대기 이벤트 분포를 그래프로 본다. 예를 들어 Aurora MySQL v2의 `io/aurora_redo_log_flush`, v3의 `io/redo_log_flush`, PostgreSQL 계열의 lock wait처럼 실제 엔진 문서에 정의된 이름을 사용
- 문제 쿼리 식별 후 `EXPLAIN`, 인덱스 조정으로 연결
- 총 AAS가 vCPU 선을 넘으면 CPU, I/O, lock 등 기여도를 먼저 나눈다. CPU load 자체가 vCPU 용량에 근접하면 쿼리와 인스턴스 CPU를 검토하고, wait가 주원인이면 해당 병목을 해결한다.

## Enhanced Monitoring

RDS의 기본 CloudWatch 지표는 보통 1분 단위로 게시된다. **Enhanced Monitoring**은 활성화할 때 **1, 5, 10, 15, 30, 60초 중 하나**의 수집 간격으로 OS 레벨 지표를 수집한다.

- `top` 스타일 OS 프로세스 목록. SQL 원인 분석은 Database Insights와 쿼리 로그를 함께 본다.
- Linux I/O 통계(swap, iowait, context switch)
- 짧은 피크를 놓치지 않음 (기본 CloudWatch는 1분 평균이라 스파이크 묻힘)

추가 비용과 수집 오버헤드를 확인하고, 짧은 OS 스파이크 분석이 필요한 핵심 DB와 튜닝 환경에서 사용한다.

## 출처

- [AWS RDS, Performance Insights overview and 2026 transition](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html)
- [CloudWatch Database Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Database-Insights.html)
- [proimaginer — Amazon RDS, CloudWatch로 모니터링하기](https://proimaginer.tistory.com/56)
- [AWS Docs — Enhanced Monitoring 활성화](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html)
- [AWS Docs — RDS 스토리지](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html)

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링 인덱스]]
- [[RDS-Monitoring-Logs|로그 기반 모니터링과 알람 파이프라인]]
- [[RDS-Monitoring-Tools-Pitfalls|외부 도구와 운영 함정]]
- [[RDS-Monitoring-Deep-Metrics|RDS 모니터링 심화]] — CommitLatency, History List Length, Event Subscription, 커스텀 Prometheus, Support Case
- [[Replication|Replication (Replica Lag)]]
- [[Connection-Pool|Connection Pool 사이징]]
