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

## 유지보수와 실행 계획을 함께 본다

`pg_stat_user_tables`의 `n_dead_tup`, `last_autovacuum`, `last_autoanalyze`를 함께 확인한다. `n_dead_tup`은 추정치이며 정확한 bloat 크기나 수동 정리의 충분한 근거가 아니다. 장기 트랜잭션이 회수를 막는지, autovacuum이 처리량을 따라가는지도 조사한다.

`EXPLAIN ANALYZE`는 쿼리를 실제로 실행한다. 운영에서 무조건 재현하지 말고 실행 가능한 환경과 비용을 확인한다. `VACUUM`, `ANALYZE`, 스키마 변경과 잠금 진단의 세부 절차는 [[PostgreSQL-Production-Operations|PostgreSQL 운영]]과 [[Execution-Plan-PostgreSQL|PostgreSQL 실행 계획]]을 따른다.

변경 뒤에는 같은 부하 조건에서 지연, 오류, CPU와 대기 이벤트를 다시 비교한다. 부하가 줄어든 시간대의 개선을 튜닝 효과로 단정하지 않는다.

## 출처

- [AWS RDS User Guide, Initial troubleshooting for common PostgreSQL performance issues](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.InitialTroubleshooting.html)
- [AWS Aurora User Guide, Initial troubleshooting for common PostgreSQL performance issues](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/PostgreSQL.InitialTroubleshooting.html)
- [AWS RDS User Guide, Database load](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html)
- [PostgreSQL 18 Documentation, The Cumulative Statistics System](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [How do I troubleshoot high CPU utilization for Amazon RDS for PostgreSQL or Amazon Aurora PostgreSQL-Compatible instances? — AWS re:Post](https://repost.aws/knowledge-center/rds-aurora-postgresql-high-cpu)

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링]]
- [[RDS-Monitoring-Metrics|RDS 지표와 알람]]
- [[PostgreSQL-Production-Operations|PostgreSQL 운영]]
- [[Execution-Plan-PostgreSQL|PostgreSQL 실행 계획]]
- [[Connection-Pool|연결 풀 사이징]]
