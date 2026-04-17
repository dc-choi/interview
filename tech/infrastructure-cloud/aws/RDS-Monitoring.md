---
tags: [aws, rds, monitoring, cloudwatch, observability, performance-insights]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Monitoring", "RDS 모니터링"]
---

# RDS 모니터링

RDS는 관리형이지만 **운영 책임은 여전히 우리에게 있다.** 느린 쿼리·커넥션 고갈·스토리지 포화·Replica Lag은 AWS가 자동으로 막아주지 않으므로 지표·로그·알람을 직접 설계해야 한다.

## 모니터링 3계층

| 계층 | 도구 | 관찰 대상 |
|---|---|---|
| **인프라 지표** | CloudWatch Metrics | CPU·메모리·디스크·네트워크·커넥션 수 |
| **DB 내부 지표** | Performance Insights | 쿼리 대기 이벤트·Top SQL·세션 활동 |
| **쿼리 로그** | RDS Log + CloudWatch Logs | Slow Query·DDL·Error |

세 계층을 결합해야 "왜 느려졌는가"에 답할 수 있다. CloudWatch만 보면 CPU 90% 사실만 알지 어떤 쿼리 때문인지 모름.

## CloudWatch 핵심 지표

| 지표 | 임계 예시 | 의미 |
|---|---|---|
| `CPUUtilization` | > 80% | CPU 포화 — 쿼리·인덱스 재검토 |
| `DatabaseConnections` | > max_connections × 0.8 | 커넥션 고갈 위험 — 풀 사이즈·애플리케이션 누수 확인 |
| `FreeableMemory` | < 여유 10% | OOM·swap 위험 — 인스턴스 업그레이드 고려 |
| `FreeStorageSpace` | < 20% | 자동 확장 미설정 시 장애 위험 |
| `ReadIOPS` / `WriteIOPS` | gp3 설정 한도 대비 | IOPS burst 소진 — 스토리지 타입·용량 재검토 |
| `ReplicaLag` | > 5s | Read-After-Write 실패 위험 |
| `DiskQueueDepth` | > 10 | I/O 병목 — 쿼리·스토리지 재검토 |
| `BurstBalance` | < 20% | gp2 버스트 크레딧 소진 임박 |

### 알람 임계치 설계 원칙

- **P99·정적값보다 변화량** — "평소 30% → 80% 증가"가 "80% 상태"보다 유의미
- **복합 조건** — "CPU > 80% **AND** Connection > 150" 식으로 오탐 감소
- **서비스 중요도별 차등** — 결제 DB는 P95 5ms, 분석 DB는 P95 500ms 등

## Performance Insights

AWS가 제공하는 DB 내부 부하 분석 도구. **무료 기본 7일 보존**, 유료로 2년.

- **DB Load** = 시간당 활성 세션(AAS). 기준선은 `vCPU 수`
- 시간대별 Top SQL, 대기 이벤트(`io/aof_sync`·`Lock:Transaction`·`CPU`) 분포를 그래프로
- 문제 쿼리 식별 후 `EXPLAIN`·인덱스 조정으로 연결
- vCPU 수를 넘는 AAS가 지속되면 CPU 포화 → 인스턴스 업그레이드·쿼리 최적화 필요

## Enhanced Monitoring

기본 CloudWatch는 1~5분 간격. **Enhanced Monitoring**은 **1~60초** OS 레벨 지표를 수집한다.

- `top` 스타일 프로세스 목록(어떤 쿼리가 CPU 쓰는지)
- Linux I/O 통계(swap·iowait·context switch)
- 짧은 피크를 놓치지 않음 (기본 CloudWatch는 1분 평균이라 스파이크 묻힘)

유료지만 트래픽 큰 DB·튜닝 중인 환경에서는 필수.

## 로그 기반 모니터링

RDS는 Slow Query Log·Error Log·General Log를 CloudWatch Logs로 내보낼 수 있다.

### Slow Query Log 수집
- MySQL: `slow_query_log=1`·`long_query_time=3` 파라미터
- PostgreSQL: `log_min_duration_statement = 3000`
- 3초 이상 쿼리만 기록 → 쿼리 패턴·증가 추이 파악

### RDS for MySQL 로그 유형

RDS MySQL이 지원하는 5가지 로그:

| 로그 | 활성화 조건 | 기본 |
|---|---|---|
| **Error Log** (`mysql-error.log`) | 기본 활성 | 매시간 로테이션, 2주 보존 |
| **Slow Query Log** | `slow_query_log=1`·`long_query_time` 설정 | `log_output=FILE` 권장 |
| **General Log** | `general_log=1` | 모든 쿼리 기록 (운영 환경에서 비활성 권장) |
| **Audit Log** | `MARIADB_AUDIT_PLUGIN` 옵션 그룹 | 보안·감사 요건 |
| **IAM DB Auth Error Log** | DB 인스턴스 생성/수정 시 활성화 | IAM 인증 실패 추적 |

#### 로그 출력 방식

- `log_output=FILE`: 파일로 저장. 매시간 로테이션·2주 보존·DB 할당 스토리지의 2% 이하
- `log_output=TABLE`: `mysql.general_log`·`mysql.slow_log` 테이블에 저장. 24시간마다 `*_backup` 테이블로 순환
- `log_output=NONE`: 로그 비활성
- **CloudWatch Logs 연동에는 `log_output=FILE` 필수**

#### 수동 로그 순환
```sql
CALL mysql.rds_rotate_general_log;
CALL mysql.rds_rotate_slow_log;
```

### CloudWatch Logs 게시 설정

로그 데이터를 CloudWatch Logs로 보내 실시간 분석·알람·장기 보관.

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
- CloudWatch Logs 저장 비용·수집 요금 별도 과금 → General Log는 필요 시에만
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
  ↓ (gzip 압축·이벤트 전송)
Lambda
  ↓ (분류·포맷팅)
Slack Webhook (채널별 분기)
```

분류 기준 예:
- **DDL**(CREATE/DROP/ALTER TABLE): 운영 DB 스키마 변경 감지 (초록)
- **Slow Query**(임계 초과): 성능 이슈 탐지 (노랑)
- **Error**(제약 위반·문법 오류·deadlock): 즉시 대응 (빨강)

구현 포인트:
- CloudWatch Logs Subscription Filter는 로그 그룹당 **최대 2개** — 복수 Slack 채널로 분기하려면 단일 Lambda에서 내부 분기
- 압축된(gzip) 로그 이벤트를 Lambda가 해제 후 파싱
- 모니터링 도구 트래픽(Datadog·PMM) 쿼리는 필터로 제외해야 노이즈 감소
- UTC → KST 변환해 가독성 확보
- `EXPLAIN` 실행 결과는 Slow Query로 오인되므로 제외

## 외부 도구 연계

| 도구 | 특징 |
|---|---|
| **Datadog DBM** | APM과 쿼리·호스트 지표 통합, Explain Plan 자동 캡처 |
| **Percona PMM** | 오픈소스, MySQL/PostgreSQL 세션·쿼리·OS까지 통합 |
| **pganalyze** | PostgreSQL 특화, Query Performance 추천 |
| **NewRelic** | APM + DB 지표 결합 |

AWS 기본 도구만으로 부족하거나 멀티클라우드·온프렘 환경과 통합이 필요할 때 선택.

## 흔한 함정

- **Max Connection 도달까지 알람 없음** — 80%에서 알람 걸어야 처리 여유 확보
- **Slow Query Log 미수집** — 성능 저하 원인 분석 불가. 임계치는 3초 → 1초로 점진 강화
- **Replica Lag 미모니터링** — 비동기 복제의 근본적 특성 무시 → read-after-write 버그
- **Storage Auto Scaling만 믿음** — 자동 확장 한도가 있고, IOPS는 자동 확장 안 됨
- **Performance Insights 안 씀** — 무료 7일 기본 활성화만 해도 대부분 병목 추적 가능
- **알람 피로** — 오탐 많으면 무시됨 → 복합 조건·지속 시간·임계 재설계

## 면접 체크포인트

- RDS 모니터링 3계층(CloudWatch·Performance Insights·로그) 설명
- **Replica Lag**을 어떻게 측정하고 임계치를 어떻게 설정하는가
- **Performance Insights의 DB Load(AAS)** 개념과 vCPU 기준선
- Slow Query Log를 **실시간 알람**으로 연결하는 아키텍처
- CloudWatch **Enhanced Monitoring과 기본 모니터링의 차이** (1분 vs 1~60초, OS 레벨)
- 알람 오탐을 줄이는 **복합 조건·지속시간** 설계

## 출처
- [jojoldu — AWS RDS PostgreSQL Slack 알람 구현](https://jojoldu.tistory.com/711)
- [proimaginer — Amazon RDS, CloudWatch로 모니터링하기](https://proimaginer.tistory.com/56)
- [AWS Docs — RDS for MySQL 데이터베이스 로그 개요](https://docs.aws.amazon.com/ko_kr/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html)
- [AWS Docs — CloudWatch Logs에 MySQL 로그 게시](https://docs.aws.amazon.com/ko_kr/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQLDB.PublishtoCloudWatchLogs.html)

## 관련 문서
- [[RDS-Aurora|RDS / Aurora 관리형 DB]]
- [[Replication|Replication (Replica Lag)]]
- [[Connection-Pool|Connection Pool 사이징]]
- [[Observability|관측가능성 전반]]
- [[Log-Pipeline|로그 파이프라인]]
