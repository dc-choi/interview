---
tags: [aws, rds, monitoring, cloudwatch, logs, slow-query]
status: done
verified_at: 2026-08-26
category: "Infrastructure - AWS"
aliases: ["RDS Monitoring Logs", "RDS 모니터링 로그"]
---

# RDS 모니터링 — 로그 수집과 알람 파이프라인

## 로그 기반 모니터링

RDS는 Slow Query Log, Error Log, General Log를 CloudWatch Logs로 내보낼 수 있다.

### Slow Query Log 수집
- MySQL: `slow_query_log=1`, `long_query_time=3` 파라미터
- PostgreSQL: `log_min_duration_statement = 3000`
- 3초 이상 쿼리만 기록 → 쿼리 패턴, 증가 추이 파악

### RDS for MySQL 로그 유형

RDS for MySQL에서 모니터링할 수 있는 6가지 로그:

| 로그 | 활성화 조건 | 기본 |
|---|---|---|
| **Error Log** (`mysql-error.log`) | 기본 활성 | 매시간 로테이션, 2주 보존 |
| **Slow Query Log** | `slow_query_log=1`, `long_query_time` 설정 | `log_output=FILE` 권장 |
| **General Log** | `general_log=1` | 모든 쿼리 기록 (운영 환경에서 비활성 권장) |
| **Audit Log** | `MARIADB_AUDIT_PLUGIN` 옵션 그룹 | 보안, 감사 요건 |
| **Instance Log** | 인스턴스 운영 이벤트 기록 | 엔진과 버전에 따라 제공 |
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
- CloudWatch Logs Subscription Filter 수는 로그 그룹별 service quota이므로 대상 Region의 Service Quotas와 API를 확인한다. 복수 Slack 채널은 단일 Lambda에서 내부 분기할 수 있다
- 압축된(gzip) 로그 이벤트를 Lambda가 해제 후 파싱
- 모니터링 도구 트래픽(Datadog, PMM) 쿼리는 필터로 제외해야 노이즈 감소
- UTC → KST 변환해 가독성 확보
- `EXPLAIN` 실행 결과는 Slow Query로 오인되므로 제외

## 출처

- [jojoldu — AWS RDS PostgreSQL Slack 알람 구현](https://jojoldu.tistory.com/711)
- [AWS Docs — RDS for MySQL 데이터베이스 로그 개요](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html)
- [AWS Docs — CloudWatch Logs에 MySQL 로그 게시](https://docs.aws.amazon.com/ko_kr/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQLDB.PublishtoCloudWatchLogs.html)
- [AWS Docs — CloudWatch Logs quotas](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html)

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링 인덱스]]
- [[RDS-Monitoring-Metrics|지표와 알람 기준]]
- [[RDS-Monitoring-Tools-Pitfalls|외부 도구와 운영 함정]]
- [[Log-Pipeline|로그 파이프라인]]
