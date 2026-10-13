---
tags: [aws, rds, aurora, postgresql, performance, monitoring]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["RDS PostgreSQL Performance Triage", "RDS와 Aurora PostgreSQL 성능 진단"]
---

# RDS와 Aurora PostgreSQL 성능 진단

느린 요청을 조사할 때는 같은 시간 구간의 인스턴스 자원, DB 부하, 개별 세션을 연결한다. 인스턴스 크기 변경은 병목을 확인한 뒤 검토한다. 아래는 AWS 진단 문서와 PostgreSQL 18의 통계 뷰를 연결한 절차이며, 관리형 엔진 버전과 관측 권한에 따라 보이는 항목은 다를 수 있다.

## 자원 사용에서 세션으로 좁힌다

1. 문제 시간대와 정상 시간대의 요청량, 지연, 오류를 맞춘다. 배포가 없어도 데이터 증가, 분포 변화, 오래된 통계와 bloat 때문에 성능이 변할 수 있다.
2. CloudWatch에서 CPU, 메모리, 연결 수와 I/O를 함께 본다. 지표의 관찰 기준은 [[RDS-Monitoring-Metrics|RDS 지표와 알람]]을 따른다.
3. Database Insights에서 DB Load를 CPU와 대기 이벤트로 나누고 Top SQL을 확인한다. DB Load는 CPU에서 실행 중이거나 대기 중인 평균 활성 세션 수(AAS)다. 총부하가 vCPU 선보다 높다는 사실만으로 CPU 증설이 답이라고 판단하지 않는다.
4. Enhanced Monitoring의 프로세스 정보를 `pg_stat_activity.pid`와 연결해 현재 세션을 확인한다. 과거 부하를 보여 주는 그래프와 현재 세션 스냅숏의 시점 차이를 기록한다.

CPU가 주원인이면 실행 계획과 자원 요구량을, 잠금 대기가 주원인이면 막고 있는 트랜잭션을 조사한다. 모든 병목을 느린 SQL 하나나 인스턴스 부족으로 환원하지 않는다.

## 디스크 대기열과 크레딧의 계층을 나눈다

`DiskQueueDepth`는 디스크 접근을 기다리는 미완료 읽기와 쓰기 I/O 요청 수다. 증가한 시점의 `ReadLatency`, `WriteLatency`, `ReadIOPS`, `WriteIOPS`와 처리량을 함께 확인한다. 같은 관찰 구간에서 읽기와 쓰기의 IOPS를 더한 값과 처리량을 더한 값을 각각 비교하되, IOPS와 bytes/s를 서로 같은 단위로 취급하지 않는다.

- `BurstBalance`는 gp2 스토리지의 버스트 I/O 크레딧 잔량이다.
- `EBSIOBalance%`와 `EBSByteBalance%`는 지원되는 인스턴스 크기에서 각각 I/O와 처리량 크레딧을 보여 준다. DB 파일 볼륨뿐 아니라 루트 볼륨을 포함한 전체 볼륨의 사용량을 반영한다. 이 두 지표에 `Sum` 통계를 적용하지 않는다.
- 따라서 gp2의 볼륨 크레딧과 인스턴스의 EBS 크레딧을 구분하고, 실제 스토리지와 인스턴스 조건에 해당하는 지표를 고른다. 지표 하나가 없다는 이유로 크레딧이 충분하다고 해석하지 않는다.

짧은 I/O 급증이 집계 구간 안에 가려졌는지 조사하려면 Enhanced Monitoring의 수집 간격과 CloudWatch Logs의 OS 지표를 확인한다. 1초 수집을 설정해도 RDS 콘솔은 가장 빨라도 5초마다 갱신하므로 1초 단위 자료는 CloudWatch Logs에서 조회한다. 활성화에는 IAM 역할과 권한이 필요하고, 수집 간격을 줄이면 로그 수집량과 비용이 늘 수 있다. 운영 설정 변경 전에 관찰할 기간을 정한다.

2026-10-13 부분 검증: AWS의 지표 정의와 Enhanced Monitoring 설정을 대조했다. 특정 큐 길이를 모든 스토리지의 장애 임계값으로 제시하지 않으며, 위 절차만으로 실제 I/O 병목이 확인됐다고 판단하지 않는다.

## 세션의 세 가지 시간을 구분한다

| 필드 | 의미 | 오해하기 쉬운 점 |
|---|---|---|
| `query_start` | 현재 쿼리의 시작, 비활성 상태에서는 마지막 쿼리의 시작 | 모든 세션에서 현재 실행 시간을 뜻하지 않는다 |
| `xact_start` | 열린 트랜잭션의 시작, 없으면 NULL | 짧은 쿼리를 반복해도 트랜잭션은 오래 열려 있을 수 있다 |
| `state_change` | 현재 상태로 바뀐 시점 | 마지막 쿼리가 시작된 시점과 다를 수 있다 |

`state`와 `wait_event_type`, `wait_event`를 함께 읽는다. `active` 상태여도 대기 이벤트가 있으면 실행 도중 자원을 기다리는 상태일 수 있다. 일반 사용자는 다른 역할의 세션 정보를 일부 볼 수 없으므로 NULL을 활동 부재의 증거로 읽지 않는다.

## idle 연결을 일괄 종료하지 않는다

- `idle`은 클라이언트의 다음 명령을 기다리는 상태다. 정상적인 연결 풀에도 존재한다. 연결 슬롯, 메모리와 풀의 상한을 함께 확인한다.
- `idle in transaction`은 트랜잭션을 연 채 쿼리를 실행하지 않는 상태다. 오래 유지되는 잠금과 vacuum 회수 지연 가능성을 별도로 조사한다.
- 연결 생성과 종료가 잦으면 인증 비용과 연결 지연도 본다. 현재 연결 수가 많다는 관찰과 connection churn은 같은 지표가 아니다.
- 세션 종료 전에는 소유 애플리케이션, 열린 트랜잭션과 재시도 영향을 확인한다. 반복 문제는 연결 반환, 트랜잭션 경계, 풀 예산과 timeout 설정에서 해결한다.

## 관측 권한과 중단 권한은 별개다

2026-10-13 PostgreSQL 18 공식 문서로 이 절을 대조했다. `pg_read_all_stats` 권한은 다른 세션의 통계 정보를 보는 경로이며 쿼리 중단 권한과 같지 않다. 관리형 엔진에서는 실제 역할과 허용 범위를 따로 확인한다.

- `pg_cancel_backend(pid)`는 해당 세션의 현재 쿼리 취소를 요청한다.
- `pg_terminate_backend(pid)`는 세션 종료를 요청한다. 기본 `timeout = 0`에서 반환값 `true`는 신호 전송 성공이며 프로세스 종료 완료의 증거가 아니다.
- 양쪽 모두 호출 역할, 대상 역할과 `pg_signal_backend` 등의 권한 조건을 확인한다. PostgreSQL의 superuser backend에는 별도 제한이 있으므로 관측 계정에 통계가 보인다는 이유로 종료 가능하다고 가정하지 않는다.

운영 판단 제안: 조치 직전에 PID, 사용자, 쿼리와 트랜잭션을 다시 확인하고, 조치 후 세션 상태와 애플리케이션의 오류 및 재시도 결과를 확인한다. 이 절은 종료 명령을 실행한 기록이 아니다.

## 누적 SQL 통계와 문제 구간을 구분한다

`pg_stat_activity`가 현재 세션을 보여 준다면 `pg_stat_statements`는 정규화한 SQL별 누적 계획과 실행 통계를 보여 준다. PostgreSQL 18 기준으로 다음을 구분한다.

- `calls`, `total_exec_time`, `mean_exec_time`을 함께 본다. 한 번 느린 SQL과 짧지만 자주 실행되는 SQL은 개선할 지점이 다르다. 실행 경과 시간을 CPU 사용 시간으로 해석하지 않고 DB Load의 CPU와 대기 이벤트를 대조한다.
- 누적 순위가 최근 CPU 급증의 순위인 것은 아니다. 문제 구간의 시작과 끝에서 같은 `dbid`, `userid`, `queryid`, `toplevel` 조합의 차이를 비교한다. `stats_since`, 전체 초기화 시각인 `pg_stat_statements_info.stats_reset`, 항목 퇴출 횟수 `dealloc`도 확인한다. 초기화나 퇴출로 연속성이 끊긴 항목은 단순 차분으로 비교하지 않는다.
- `total_plan_time` 등 계획 통계는 `pg_stat_statements.track_planning`을 켜야 수집되며 기본값은 `off`다. 0을 계획 비용이 없다는 증거로 읽지 않는다. 활성화에는 추가 비용이 있을 수 있으므로 필요한 관찰 범위를 정한다.
- 확장 로드와 해당 DB의 뷰 설치, 조회 권한을 확인한다. 일반 PostgreSQL의 `shared_preload_libraries` 변경은 재시작이 필요하므로 장애 중 즉석 활성화를 기본 조치로 삼지 않는다. 관리형 엔진에서는 현재 파라미터와 적용 상태부터 확인한다.

## 유지보수와 실행 계획을 함께 본다

`pg_stat_user_tables`의 `n_dead_tup`, `last_autovacuum`, `last_autoanalyze`를 함께 확인한다. `n_dead_tup`은 추정치이며 정확한 bloat 크기나 수동 정리의 충분한 근거가 아니다. 장기 트랜잭션이 회수를 막는지, autovacuum이 처리량을 따라가는지도 조사한다.

`EXPLAIN ANALYZE`는 쿼리를 실제로 실행한다. 운영에서 무조건 재현하지 말고 실행 가능한 환경과 비용을 확인한다. `VACUUM`, `ANALYZE`, 스키마 변경과 잠금 진단의 세부 절차는 [[PostgreSQL-Production-Operations|PostgreSQL 운영]]과 [[Execution-Plan-PostgreSQL|PostgreSQL 실행 계획]]을 따른다.

변경 뒤에는 같은 부하 조건에서 지연, 오류, CPU와 대기 이벤트를 다시 비교한다. 부하가 줄어든 시간대의 개선을 튜닝 효과로 단정하지 않는다.

## Aurora의 실행 계획 회귀를 관리한다

통계, 바인딩 값이나 엔진 버전이 바뀐 뒤 같은 SQL이 더 느린 계획을 선택하는 현상을 실행 계획 회귀라고 한다. Aurora PostgreSQL의 Query Plan Management(QPM)는 `apg_plan_mgmt` 확장으로 계획을 수집하고 사용할 계획을 관리한다. RDS PostgreSQL 일반 기능과 구분한다.

- **수집과 적용은 별개다.** `apg_plan_mgmt.capture_plan_baselines`는 `manual` 또는 `automatic`으로 계획을 수집한다. 수집만 켰다고 계획 선택을 제한하지는 않으며, 기준 계획을 사용하려면 `apg_plan_mgmt.use_plan_baselines` 설정도 확인한다.
- **첫 승인도 검증 대상이다.** 처음 수집한 계획은 `Approved`, 이후 추가 계획은 보통 `Unapproved`로 저장된다. 첫 상태가 자동 승인이라는 사실은 실제 성능 검증을 통과했다는 뜻이 아니다. 병렬 수집에서는 처음에 여러 승인 계획이 생길 수도 있다.
- **한 계획의 영구 고정이 아니다.** 미승인 계획도 `apg_plan_mgmt.unapproved_plan_execution_threshold`보다 추정 비용이 낮으면 실행될 수 있다. 사용할 수 있는 유효한 승인 또는 우선 계획이 없으면 옵티마이저의 최소 비용 계획으로 돌아갈 수 있다. 인덱스나 파티션 삭제로 기존 계획이 무효화되는 경우도 확인한다.
- **새 계획을 비교하고 발전시킨다.** `apg_plan_mgmt.evolve_plan_baselines`는 실제 성능을 비교해 승인, 거절이나 비활성화 판단을 돕는다. 대표 바인딩 값과 부하 조건을 고르고, 성능 평가를 실행할 환경과 비용을 먼저 확인한다.

도입 전 엔진과 확장 버전, 권한, 파라미터 적용과 재시작 필요 여부를 확인한다. 시스템 테이블을 참조하는 SQL의 수집 제한과 기존 세션에 캐시된 generic plan의 영향도 있다. QPM을 켰다는 사실만으로 모든 SQL의 지연 회귀가 방지됐다고 판단하지 않는다.

확인 질문: 계획을 수집했는데도 새 계획으로 실행된다면, 수집 여부 외에 적용 설정, 계획 상태와 유효성, 미승인 실행 임계값 중 무엇을 확인해야 하는가?

## 출처

- [PostgreSQL 18 Documentation, System Administration Functions](https://www.postgresql.org/docs/18/functions-admin.html)
- [AWS RDS User Guide, Amazon CloudWatch metrics for Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html)
- [AWS RDS User Guide, Setting up and enabling Enhanced Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html)
- [AWS RDS User Guide, Monitoring OS metrics with Enhanced Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html)
- [AWS RDS User Guide, Initial troubleshooting for common PostgreSQL performance issues](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.InitialTroubleshooting.html)
- [AWS Aurora User Guide, Initial troubleshooting for common PostgreSQL performance issues](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/PostgreSQL.InitialTroubleshooting.html)
- [AWS RDS User Guide, Database load](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html)
- [PostgreSQL 18 Documentation, The Cumulative Statistics System](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 Documentation, pg_stat_statements](https://www.postgresql.org/docs/18/pgstatstatements.html)
- [How do I troubleshoot high CPU utilization for Amazon RDS for PostgreSQL or Amazon Aurora PostgreSQL-Compatible instances? — AWS re:Post](https://repost.aws/knowledge-center/rds-aurora-postgresql-high-cpu)
- [AWS Aurora User Guide, Overview of Aurora PostgreSQL query plan management](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Optimize.overview.html)
- [AWS Aurora User Guide, Capturing Aurora PostgreSQL execution plans](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Optimize.CapturePlans.html)
- [AWS Aurora User Guide, Using Aurora PostgreSQL managed plans](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Optimize.UsePlans.html)
- [AWS Aurora User Guide, Improving Aurora PostgreSQL query plans](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Optimize.Maintenance.html)

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링]]
- [[RDS-Monitoring-Metrics|RDS 지표와 알람]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[Execution-Plan-PostgreSQL|PostgreSQL 실행 계획]]
- [[Connection-Pool|연결 풀 사이징]]
