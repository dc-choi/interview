---
tags: [aws, rds, monitoring, cloudwatch, observability, performance-insights]
status: done
verified_at: 2026-10-09
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

세 계층을 결합해야 느려진 이유를 설명할 수 있다. CloudWatch만 보면 CPU 90% 사실만 알지 어떤 쿼리 때문인지 모름.

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

### SwapUsage가 0보다 크다는 사실만으로 메모리 부족을 판정하지 않는다

Linux 기반 RDS에서는 과거에 swap으로 옮긴 비활성 페이지가 남아 있어 여유 메모리가 회복돼도 `SwapUsage`가 0으로 돌아오지 않을 수 있다. `FreeableMemory` 하락과 `SwapUsage` 증가가 같은 시점에 나타나는지 보고, 쿼리 지연과 부하도 함께 대조한다. 남아 있는 swap을 없애는 것 자체를 성능 개선의 목표로 삼지 않는다.

RDS for Oracle은 메모리 관리 모드와 PGA, SGA 사용량을 추가로 확인한다.

- 자동 메모리 관리(AMM)는 `MEMORY_TARGET`, `MEMORY_MAX_TARGET`을 확인한다. 자동 공유 메모리 관리(ASMM)는 `SGA_TARGET`, `SGA_MAX_SIZE`와 PGA 설정을 확인한다.
- `PGA_AGGREGATE_TARGET`은 실제 PGA 사용량의 강제 상한이 아니다. 목표를 초과할 수 있으므로 `PGA_AGGREGATE_LIMIT`과 실제 사용량을 구분한다.
- `V$PGASTAT`, `V$SGASTAT`로 사용량을 보고, `V$PGA_TARGET_ADVICE`, `V$SGA_TARGET_ADVICE`와 프로세스 및 세션별 PGA 사용량으로 원인을 좁힌다. CDB에서는 조회한 컨테이너 범위도 확인한다.
- PGA 한도를 낮추면 메모리 고갈 위험을 줄일 수 있지만 추가 메모리가 필요한 작업이 실패할 수 있다. 파라미터 변경은 시험 환경에서 검증하고, 엔진 및 HugePages 설정에 따른 재시작 필요 여부를 확인한 뒤 적용한다. 메모리를 많이 쓰는 쿼리의 튜닝과 인스턴스 확장도 비교한다.

이 절은 2026-10-09 AWS Knowledge Center의 swap 해석과 Oracle 메모리 진단 절차를 대조했다. 예제의 메모리 비율을 모든 인스턴스에 적용하는 처방으로 사용하지 않는다.

### ReplicaLag가 0이어도 따라왔다고 단정하지 않는다

RDS for MySQL과 MariaDB의 `ReplicaLag`는 replica가 보고하는 지연 초 값이다. AWS 문서는 `Seconds_Behind_Master`로 적지만 MySQL 8.0.22 이상의 `SHOW REPLICA STATUS`에서는 이 필드 이름이 `Seconds_Behind_Source`이고, MariaDB와 8.0.22 이전 MySQL은 `Seconds_Behind_Master`를 쓴다. `-1`은 복제가 활성 상태가 아니라는 뜻이고 `NULL`과 같다. 0은 보통 replica가 따라왔다는 뜻이지만 값의 정의상 receiver 지연은 드러나지 않을 수 있다.

- 이 값은 applier가 이미 받은 relay log를 얼마나 늦게 적용하는지에 가깝다. 다른 리전 replica처럼 network가 느리면 receiver가 source보다 크게 뒤처져도 0으로 보일 수 있으므로, 의심되면 source와 replica의 binlog 좌표를 비교한다([[Replication#밀린 쪽을 binlog 좌표로 가린다|receiver와 applier 진단]]).
- 새 read replica는 source의 snapshot으로 만든다. snapshot에서 만든 인스턴스는 아직 내려받지 않은 데이터를 처음 읽을 때 S3에서 가져오는 lazy loading을 하므로, 생성 직후에는 적용과 조회가 느려 lag가 튈 수 있다. 읽기 트래픽을 보내기 전에 자주 쓰는 테이블을 `SELECT *`처럼 전체를 읽는 쿼리로 먼저 읽어 두고 lag가 안정되는지 확인한다.

이 절은 2026-10-14 RDS 사용자 가이드의 복제 모니터링, read replica 생성과 snapshot 복원 설명, MySQL 8.0과 8.4 매뉴얼의 `Seconds_Behind_Source` 정의, MariaDB 문서의 필드 이름과 대조했다. 새 replica의 초기 lag를 lazy loading과 연결한 설명은 AWS Knowledge Center 영상에 근거한다. 나머지 절의 검증일은 유지한다.

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

### AAS는 실행 횟수가 아니라 표본의 평균이다

Database Insights는 매초 활성 세션을 표본 수집하고, 관찰 구간의 활성 세션 수 합계를 표본 수로 나눠 AAS를 계산한다. 예를 들어 5개 표본이 각각 1, 0, 2, 1, 1이면 AAS는 1이다. 연결 수, 완료한 트랜잭션 수나 초당 쿼리 수를 뜻하지 않는다.

- 짧은 쿼리는 표본 사이에서 시작하고 끝날 수 있다. Top SQL에 보이지 않는다는 사실만으로 실행되지 않았다고 결론 내리지 않는다. 실행 이력 확인에는 해당 엔진의 로그와 통계를 함께 사용한다.
- 같은 총 트랜잭션 수라도 동시에 실행하는 세션 수와 각 작업의 실행 및 대기 시간이 다르면 DB Load가 달라진다. 부하 시험에서는 총 작업량과 동시성을 따로 기록한다.
- AAS가 낮거나 Max vCPU 선 아래여도 특정 작업의 대기와 자원 경합은 있을 수 있다. AAS 하나로 DB 문제를 배제하거나 인스턴스 축소를 결정하지 않고, 문제가 발생한 시간대의 대기 이벤트와 응답 지연을 함께 본다.

## Enhanced Monitoring

RDS의 기본 CloudWatch 지표는 보통 1분 단위로 게시된다. **Enhanced Monitoring**은 활성화할 때 **1, 5, 10, 15, 30, 60초 중 하나**의 수집 간격으로 OS 레벨 지표를 수집한다.

- `top` 스타일 OS 프로세스 목록. SQL 원인 분석은 Database Insights와 쿼리 로그를 함께 본다.
- Linux I/O 통계(swap, iowait, context switch)
- 기본 1분 지표에서 희석되는 짧은 피크를 더 세밀하게 관찰할 수 있다. 선택한 수집 간격보다 짧은 변화를 모두 포착한다는 보장은 아니다.

추가 비용과 수집 오버헤드를 확인하고, 짧은 OS 스파이크 분석이 필요한 핵심 DB와 튜닝 환경에서 사용한다.

### 수집 위치, 표시 주기와 보관 위치를 구분한다

- **수집 위치:** RDS의 CloudWatch CPU 지표는 하이퍼바이저에서, Enhanced Monitoring 지표는 DB 인스턴스의 에이전트에서 수집한다. 관측 위치가 달라 CPU 수치가 일치하지 않을 수 있다.
- **표시 주기:** Enhanced Monitoring을 1초 간격으로 설정해도 RDS 콘솔은 가장 빠르게 5초마다 갱신된다. 1초 단위 자료를 확인하려면 CloudWatch Logs를 조회한다.
- **보관 위치:** Enhanced Monitoring 결과는 일반 CloudWatch Metrics가 아니라 CloudWatch Logs의 `RDSOSMetrics` 로그 그룹에 저장한다. 기본 보관 기간은 30일이며 로그 그룹의 retention으로 바꾼다. 간격을 짧게 할수록 보고 빈도와 로그 비용도 늘 수 있다.

부분 검증(2026-10-13): AAS 표본 해석과 Enhanced Monitoring의 수집 위치, 표시 주기, 보관 설정을 AWS 공식 문서와 대조했다. 부하 시험과 로그 대조 절차는 지표의 정의와 표본 수집 한계를 적용한 운영 제안이다. 기존 Oracle 메모리 진단 등 나머지 절의 검증일은 유지한다.

## 출처

2026-10-09에는 swap 해석과 Oracle 메모리 진단을 보강하고, Database Insights 전환 및 Enhanced Monitoring 수집 간격을 공식 문서와 대조했다. 예시 알람의 숫자는 서비스별 검토 기준이며 AWS가 보장하는 공통 임계치가 아니다.

- [AWS re:Post — Why does my Amazon RDS DB instance use swap memory when I have sufficient memory?](https://repost.aws/knowledge-center/troubleshoot-rds-swap-memory)
- [AWS re:Post — How do I handle low free memory or high swap usage issues in my Amazon RDS for Oracle database instance?](https://repost.aws/knowledge-center/rds-oracle-low-memory-high-swap)
- [AWS RDS, Performance Insights overview and 2026 transition](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html)
- [AWS RDS, Database load](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html)
- [AWS RDS, Maximum CPU](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.MaxCPU.html)
- [AWS RDS, Monitoring OS metrics with Enhanced Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html)
- [CloudWatch Database Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Database-Insights.html)
- [proimaginer — Amazon RDS, CloudWatch로 모니터링하기](https://proimaginer.tistory.com/56)
- [AWS Docs — Enhanced Monitoring 활성화](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html)
- [AWS Docs — RDS 스토리지](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html)
- [AWS RDS, Monitoring read replication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Monitoring.html)
- [AWS RDS, Working with DB instance read replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html)
- [AWS RDS, Restoring to a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html)
- [MySQL 8.4 Reference Manual, SHOW REPLICA STATUS Statement](https://dev.mysql.com/doc/refman/8.4/en/show-replica-status.html)
- [MySQL 8.0 Reference Manual, SHOW REPLICA STATUS Statement](https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html)
- [MariaDB Documentation, SHOW REPLICA STATUS](https://mariadb.com/kb/en/show-replica-status/)
- [AWS Database Blog — Prewarm an Amazon RDS for Oracle database to reduce the impact of lazy loading](https://aws.amazon.com/blogs/database/prewarm-an-amazon-rds-for-oracle-database-to-reduce-the-impact-of-lazy-loading)
- [Amazon Web Services (YouTube) — How do I troubleshoot high replica lag with Amazon RDS for MySQL?](https://www.youtube.com/watch?v=XG4UYKS611k)

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링 인덱스]]
- [[RDS-Monitoring-Logs|로그 기반 모니터링과 알람 파이프라인]]
- [[RDS-Monitoring-Tools-Pitfalls|외부 도구와 운영 함정]]
- [[RDS-Monitoring-Deep-Metrics|RDS 모니터링 심화]] — CommitLatency, History List Length, Event Subscription, 커스텀 Prometheus, Support Case
- [[Replication|Replication (Replica Lag)]]
- [[Connection-Pool|Connection Pool 사이징]]
