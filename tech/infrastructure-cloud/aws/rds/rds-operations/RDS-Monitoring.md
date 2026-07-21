---
tags: [aws, rds, monitoring, cloudwatch, observability, performance-insights]
status: done
verified_at: 2026-07-21
category: "Infrastructure - AWS"
aliases: ["RDS Monitoring", "RDS 모니터링"]
---

# RDS 모니터링

RDS는 관리형이지만 **운영 책임은 여전히 우리에게 있다.** 느린 쿼리, 커넥션 고갈, 스토리지 포화, Replica Lag은 AWS가 자동으로 막아주지 않으므로 지표, 로그, 알람을 직접 설계해야 한다.

## 모니터링 3계층

| 계층 | 도구 | 관찰 대상 |
|---|---|---|
| **인프라 지표** | CloudWatch Metrics | CPU, 메모리, 디스크, 네트워크, 커넥션 수 |
| **DB 내부 지표** | CloudWatch Database Insights와 Performance Insights 데이터 | 쿼리 대기 이벤트, Top SQL, 세션 활동 |
| **쿼리 로그** | RDS Log + CloudWatch Logs | Slow Query, DDL, Error |

세 계층을 결합해야 "왜 느려졌는가"에 답할 수 있다. CloudWatch만 보면 CPU 90% 사실만 알지 어떤 쿼리 때문인지 모름.

## CloudWatch 핵심 지표

| 지표 | 임계 예시 | 의미 |
|---|---|---|
| `CPUUtilization` | > 80% | CPU 포화 — 쿼리, 인덱스 재검토 |
| `DatabaseConnections` | > max_connections × 0.8 | 커넥션 고갈 위험 — 풀 사이즈, 애플리케이션 누수 확인 |
| `FreeableMemory` | < 여유 10% | OOM, swap 위험 — 인스턴스 업그레이드 고려 |
| `FreeStorageSpace` | < 20% | 자동 확장 미설정 시 장애 위험 |
| `ReadIOPS` / `WriteIOPS` | gp3의 baseline 또는 provisioned IOPS, throughput 대비 | gp3 설정 한도 포화 가능성 — IOPS, throughput, 큐와 지연을 함께 확인 |
| `ReplicaLag` | > 5s | Read-After-Write 실패 위험 |
| `DiskQueueDepth` | > 10 | I/O 병목 — 쿼리, 스토리지 재검토 |
| `BurstBalance` | < 20% | gp2 버스트 크레딧 소진 임박 |

### 알람 임계치 설계 원칙

- **P99, 정적값보다 변화량** — "평소 30% → 80% 증가"가 "80% 상태"보다 유의미
- **복합 조건** — "CPU > 80% **AND** Connection > 150" 식으로 오탐 감소
- **서비스 중요도별 차등** — 결제 DB는 P95 5ms, 분석 DB는 P95 500ms 등

## Database Insights와 Performance Insights 전환

AWS는 Performance Insights 독립 콘솔 경험을 **2026-07-31** 종료하고 CloudWatch Database Insights로 전환한다. Performance Insights API와 파라미터는 계속 유지되지만 청구는 Database Insights 항목으로 표시된다. 아무 조치가 없으면 Performance Insights를 사용하던 인스턴스는 기존 retention을 유지한 Database Insights Standard mode로 전환된다.

- **Standard**: DB Load의 주요 contributor와 기본 분석, 유연한 retention을 제공한다.
- **Advanced**: fleet view, 일부 엔진의 lock과 execution plan 진단, on-demand analysis 같은 확장 기능을 제공한다. 기능과 Region 지원 여부를 확인한다.
- RDS 콘솔 생성 wizard는 현재 모든 RDS 엔진에서 Performance Insights를 기본 선택하지만, 기존 인스턴스와 API, IaC 생성 경로까지 항상 활성이라고 가정하지 말고 실제 설정을 확인한다.

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

## 로그 기반 모니터링

RDS는 Slow Query Log, Error Log, General Log를 CloudWatch Logs로 내보낼 수 있다.

### Slow Query Log 수집
- MySQL: `slow_query_log=1`, `long_query_time=3` 파라미터
- PostgreSQL: `log_min_duration_statement = 3000`
- 3초 이상 쿼리만 기록 → 쿼리 패턴, 증가 추이 파악

### RDS for MySQL 로그 유형

RDS MySQL이 지원하는 5가지 로그:

| 로그 | 활성화 조건 | 기본 |
|---|---|---|
| **Error Log** (`mysql-error.log`) | 기본 활성 | 매시간 로테이션, 2주 보존 |
| **Slow Query Log** | `slow_query_log=1`, `long_query_time` 설정 | `log_output=FILE` 권장 |
| **General Log** | `general_log=1` | 모든 쿼리 기록 (운영 환경에서 비활성 권장) |
| **Audit Log** | `MARIADB_AUDIT_PLUGIN` 옵션 그룹 | 보안, 감사 요건 |
| **IAM DB Auth Error Log** | DB 인스턴스 생성/수정 시 활성화 | IAM 인증 실패 추적 |

#### 로그 출력 방식

- `log_output=FILE`: 파일로 저장. 매시간 로테이션, 2주 보존, DB 할당 스토리지의 2% 이하
- `log_output=TABLE`: `mysql.general_log`, `mysql.slow_log` 테이블에 저장. 테이블이 계속 커질 수 있으며 저장 공간 임계값을 넘는 일부 상황이나 엔진 업그레이드 때 AWS가 순환한다. 일정한 24시간 주기를 보장하지 않으므로 필요하면 `mysql.rds_rotate_*_log` 프로시저로 수동 순환
- `log_output=NONE`: 로그 비활성
- **CloudWatch Logs 연동에는 `log_output=FILE` 필수**

#### 수동 로그 순환
```sql
CALL mysql.rds_rotate_general_log;
CALL mysql.rds_rotate_slow_log;
```

### CloudWatch Logs 게시 설정

로그 데이터를 CloudWatch Logs로 보내 실시간 분석, 알람, 장기 보관.

**콘솔**: RDS → DB 인스턴스 수정 → "로그 내보내기" 섹션에서 게시할 로그 유형 체크

**CLI**:
```
aws rds modify-db-instance \
  --db-instance-identifier mydbinstance \
  --cloudwatch-logs-export-configuration \
    '{"EnableLogTypes":["audit","error","general","slowquery"]}'
```

**로그 그룹 이름 규칙**: `/aws/rds/instance/{instance-name}/{log-type}`
- 예: `/aws/rds/instance/prod-db/slowquery`

**주의사항**:
- `CloudwatchLogsExportConfiguration` 변경은 **즉시 적용**(apply-immediately 옵션 불필요)
- CloudWatch Logs 저장 비용, 수집 요금 별도 과금 → General Log는 필요 시에만
- 일반 쿼리 로그는 양이 매우 크므로 단기간 진단용으로만 활성화

### Redo Log 크기 (MySQL 8)

- 8.0.32 이하: `innodb_log_file_size` 기본 256MB (128MB × 2)
- 8.0.33+: `innodb_redo_log_capacity` 기본 2GB
- 8.4+: `innodb_dedicated_server` 활성 시 자동 산정
- 쓰기 부하가 높으면 Redo Log 크기를 늘려 체크포인트 빈도를 낮춤

### CloudWatch Logs → Lambda → Slack 알람

실시간 알림 패턴이 일반적. 구조:

```
RDS 로그
  ↓ (subscription filter)
CloudWatch Logs
  ↓ (gzip 압축, 이벤트 전송)
Lambda
  ↓ (분류, 포맷팅)
Slack Webhook (채널별 분기)
```

분류 기준 예:
- **DDL**(CREATE/DROP/ALTER TABLE): audit 또는 general log 등 실제 DDL을 기록하도록 구성한 소스에서 운영 DB 스키마 변경 감지 (초록)
- **Slow Query**(임계 초과): 성능 이슈 탐지 (노랑)
- **Engine Error**: MySQL error log에 실제 기록되는 시작, 종료, 크래시, 플러그인과 엔진 오류를 분류 (빨강). 제약조건 위반과 SQL 문법 오류 같은 애플리케이션 쿼리 오류는 앱 로그, APM, audit/general log 등 별도 소스가 필요하다. 모든 InnoDB deadlock을 error log에 남기려면 `innodb_print_all_deadlocks=ON`이 필요하며 기본값은 OFF다

구현 포인트:
- CloudWatch Logs Subscription Filter는 로그 그룹당 **최대 2개** — 복수 Slack 채널로 분기하려면 단일 Lambda에서 내부 분기
- 압축된(gzip) 로그 이벤트를 Lambda가 해제 후 파싱
- 모니터링 도구 트래픽(Datadog, PMM) 쿼리는 필터로 제외해야 노이즈 감소
- UTC → KST 변환해 가독성 확보
- `EXPLAIN` 실행 결과는 Slow Query로 오인되므로 제외

## 외부 도구 연계

| 도구 | 특징 |
|---|---|
| **Datadog DBM** | APM과 쿼리, 호스트 지표 통합, Explain Plan 자동 캡처 |
| **Percona PMM** | 오픈소스, MySQL/PostgreSQL 세션, 쿼리, OS까지 통합 |
| **pganalyze** | PostgreSQL 특화, Query Performance 추천 |
| **NewRelic** | APM + DB 지표 결합 |

AWS 기본 도구만으로 부족하거나 멀티클라우드, 온프렘 환경과 통합이 필요할 때 선택.

## 흔한 함정

- **Max Connection 도달까지 알람 없음** — 80%에서 알람 걸어야 처리 여유 확보
- **Slow Query Log 미수집** — 성능 저하 원인 분석 불가. 임계치는 3초 → 1초로 점진 강화
- **Replica Lag 미모니터링** — 비동기 복제의 근본적 특성 무시 → read-after-write 버그
- **Storage Auto Scaling만 믿음** — 최대 storage threshold, 증가 조건과 cooldown이 있고 증설이 즉시 완료되지 않는다. gp3의 provisioned IOPS/throughput은 storage 증가만으로 자동 조정되지 않으며 gp2 등은 용량과 baseline 성능 관계가 다르므로 유형별 지표와 성능 설정을 별도로 관리
- **DB 내부 부하 데이터 미수집** — 장애 전에 Database Insights mode, retention, 접근 권한을 정하고 DB Load와 Top SQL을 수집
- **알람 피로** — 오탐 많으면 무시됨 → 복합 조건, 지속 시간, 임계 재설계

## 면접 체크포인트

- RDS 모니터링 3계층(CloudWatch 인프라 지표, Database Insights DB 부하, 로그) 설명
- **Replica Lag**을 어떻게 측정하고 임계치를 어떻게 설정하는가
- **DB Load(AAS)** 개념과 vCPU 기준선, Performance Insights에서 Database Insights로의 전환
- Slow Query Log를 **실시간 알람**으로 연결하는 아키텍처
- CloudWatch **Enhanced Monitoring과 기본 모니터링의 차이** (기본 지표 1분 vs Enhanced Monitoring의 지정된 1, 5, 10, 15, 30, 60초 간격, OS 레벨)
- 알람 오탐을 줄이는 **복합 조건, 지속시간** 설계

## 출처
- [AWS RDS, Performance Insights overview and 2026 transition](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html)
- [CloudWatch Database Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Database-Insights.html)
- [jojoldu — AWS RDS PostgreSQL Slack 알람 구현](https://jojoldu.tistory.com/711)
- [proimaginer — Amazon RDS, CloudWatch로 모니터링하기](https://proimaginer.tistory.com/56)
- [AWS Docs — RDS for MySQL 데이터베이스 로그 개요](https://docs.aws.amazon.com/ko_kr/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html)
- [AWS Docs — Enhanced Monitoring 활성화](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html)
- [AWS Docs — RDS 스토리지](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html)
- [AWS Docs — CloudWatch Logs에 MySQL 로그 게시](https://docs.aws.amazon.com/ko_kr/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQLDB.PublishtoCloudWatchLogs.html)

## 관련 문서
- [[RDS-Monitoring-Deep-Metrics|RDS 모니터링 심화]] — CommitLatency, History List Length, Event Subscription, 커스텀 Prometheus, Support Case
- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정 (지표 오독, 장애 패턴)]]
- [[Replication|Replication (Replica Lag)]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[관측가능성(Observability)|관측가능성 전반]]
- [[Log-Pipeline|로그 파이프라인]]
