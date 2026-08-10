---
tags: [database, mysql, innodb, mvcc, undo, purge, aurora]
status: done
verified_at: 2026-08-10
category: "Database - RDBMS"
aliases: ["History List Length", "MySQL HLL", "MySQL Undo Purge", "RollbackSegmentHistoryListLength"]
---

# Undo Purge와 History List Length (HLL)

History List Length는 커밋됐지만 아직 purge되지 못한 undo log의 백로그 길이다. 이 숫자를 움직이는 것은 격리 수준이 아니라 read view(스냅샷)의 수명이며, 수명은 트랜잭션과 statement의 실행 시간이 정한다.

## 정의와 관찰 지점

- InnoDB는 row를 변경할 때 변경 전 버전을 undo log에 남기고, consistent read는 자신의 read view 기준으로 과거 버전을 따라가 읽는다 (MVCC).
- purge는 어떤 read view도 더 이상 필요로 하지 않는 undo를 백그라운드에서 제거한다. purge를 기다리며 history list에 남아 있는 undo log의 개수가 HLL이다.
- `SHOW ENGINE INNODB STATUS`의 `History list length`, Aurora MySQL이면 CloudWatch `RollbackSegmentHistoryListLength` 지표로 본다.

## 증가 메커니즘

HLL은 undo 생성 속도가 purge 정리 속도를 넘을 때 쌓인다. 전형적인 경로는 오래 살아 있는 read view다.

1. 오래된 read view가 하나 있으면 purge는 그 시점 이후의 undo를 제거할 수 없다.
2. 그 사이 동시 UPDATE와 DELETE가 만든 undo가 계속 누적된다.
3. read view가 닫히면 purge가 따라잡으면서 HLL이 급락한다.

주의할 성질 세 가지.

- HLL은 변경된 row 수와 비례하지 않는다. 같은 row를 여러 트랜잭션이 반복 수정하면 row는 적어도 HLL은 크게 오른다.
- history list에 남는 것은 delete-marked 레코드를 만든 UPDATE와 DELETE의 undo다. INSERT undo는 커밋 시 즉시 폐기되므로 HLL을 키우지 않는다.
- `BEGIN`만으로는 read view가 생기지 않는다. 첫 consistent read가 실행되는 순간 만들어진다. REPEATABLE READ의 `START TRANSACTION WITH CONSISTENT SNAPSHOT`은 예외로 시작 시점에 만들며, 다른 격리 수준에서는 이 절이 무시되고 경고가 발생한다.

## 격리 수준이 아니라 스냅샷 수명이 문제다

| 격리 수준 | read view 생성 | read view 수명 |
|---|---|---|
| REPEATABLE READ | 트랜잭션의 첫 consistent read | 트랜잭션 종료까지 |
| READ COMMITTED | statement마다 새로 생성 | 해당 statement 실행 동안 |

격리 수준은 read view가 트랜잭션 단위로 사느냐 statement 단위로 사느냐 하는 수명의 상한만 정할 뿐, 그 단위 하나가 실제로 얼마나 오래 걸리는지는 정하지 못한다. READ COMMITTED라도 한 statement가 15분을 돌면 read view는 15분 동안 purge를 막는다. 장기 실행되는 단일 SELECT는 autocommit 상태여도 같은 효과를 낸다. 그래서 HLL 급증의 해결책으로 격리 수준 변경부터 꺼내는 것은 대부분 과녁을 빗나간다.

## Undo 백로그의 실제 비용

HLL 자체는 장애가 아니다. CPU와 쓰기 지연이 정상인 채로 숫자만 높을 수 있다 (`innodb_max_purge_lag` 기본값 0 기준. 이 값을 설정하면 HLL이 임계를 넘을 때 DML이 의도적으로 지연된다). 그러나 백로그는 다음 비용으로 이어질 수 있다.

- secondary index의 delete-marked 레코드가 정리되지 않아 covering index로 끝날 조회가 클러스터 인덱스 추가 조회를 하게 된다.
- 과거 버전 체인을 따라가는 조회가 buffer pool과 I/O를 추가로 소비한다.
- undo tablespace와 스토리지 사용량이 커진다.
- 셧다운이 느려진다. AWS는 HLL이 높을 때 메이저 버전 업그레이드처럼 셧다운을 수반하는 작업을 HLL이 내려갈 때까지 미루라고 안내한다.
- 큰 백로그가 반복해서 해소되는 국면에서 CommitLatency가 35ms에서 441ms로 뛴 관측 사례가 있다. 같은 국면에서 purge 활동 급증이 replica lag 증가로 이어질 수 있다는 보고도 있다.

## Aurora 공유 스토리지: Reader의 조회가 Writer의 HLL로 나타난다

Community MySQL 복제에서는 replica가 자체 스토리지와 undo를 가지므로 replica의 장기 조회는 replica 쪽 문제로 끝난다. Aurora는 Writer와 Reader가 하나의 클러스터 볼륨을 공유하므로 Reader의 오래된 read view가 Writer의 purge를 직접 막고, Writer의 HLL로 나타난다. 무거운 조회를 Reader로 옮기면 된다는 통념은 Aurora에서는 절반만 맞다. 구조 배경은 [[RDS-Aurora-Architecture|Aurora 아키텍처]] 참고.

### aurora_read_replica_read_committed (ARRRC)

Aurora MySQL 문서 기준으로 Aurora Replica는 기본적으로 REPEATABLE READ로 고정되고, ARRRC를 켜지 않은 상태에서는 `SET TRANSACTION ISOLATION LEVEL`을 무시한다. Reader에서 READ COMMITTED를 쓰려면 세션에서 두 설정을 모두 적용해야 한다.

```sql
SET SESSION aurora_read_replica_read_committed = ON;
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

대가는 완화된 일관성이다. Aurora Reader의 READ COMMITTED는 ANSI 표준은 만족하지만 일반 MySQL의 READ COMMITTED보다 느슨하다.

- 하나의 statement가 실행되는 동안에도 다른 트랜잭션이 커밋한 변경이 보일 수 있다.
- row 재구성으로 같은 row를 두 번 읽거나 건너뛸 수 있어 건수가 흔들린다.
- join이 한 테이블의 새 row만 보고 다른 테이블의 대응 row를 못 볼 수 있다.

적용 기준은 데이터 계약이다. 대용량을 훑는 분석과 리포트처럼 건수 오차를 감수할 수 있는 조회에만 쓰고, 정산이나 재고처럼 정밀성과 반복 가능성이 필요한 조회에는 쓰지 않는다.

## 진단 절차

1. 평소 HLL 기준선을 알아 둔다. 기준선이 없으면 급증 판단 자체가 안 된다.
2. 장기 read view를 찾는다. `information_schema.innodb_trx`에서 시작 시각, 상태와 실행 중 쿼리를 본다 (쿼리 예시는 [[MySQL-Long-Transactions-and-Batch|장기 트랜잭션과 배치]]의 관찰 지점 참고). REPEATABLE READ는 트랜잭션 시작이 아니라 첫 consistent read부터 스냅샷을 유지하므로 시작 시각과 실제 쿼리를 함께 본다.
3. Aurora라면 Writer만 보지 말고 Reader의 장기 조회까지 함께 본다.
4. slow query log 분포와 HLL 스파이크의 시간대를 겹쳐 인과를 확인한다. 쿼리 종료 시점과 HLL 급락 시점이 일치하면 원인일 가능성이 높다.
5. 세션을 종료하기 전에 소유자, 재시도 가능성과 서비스 영향도를 확인한다.

Aurora는 보조 지표도 제공한다. `TransactionAgeMaximum`(가장 오래된 활성 트랜잭션의 나이, Aurora MySQL 3.08 이상)과 `PurgeBoundary`, `PurgeFinishedPoint`(purge 허용 지점과 완료 지점, v2 2.11 이상과 v3 3.08 이상)를 HLL과 조합하면 원인 read view를 더 빨리 좁힌다.

## 대응 우선순위

격리 수준이나 파라미터보다 조회 구조를 먼저 고친다.

1. 장기 statement를 keyset 기반 chunk로 분할해 read view 수명을 짧게 줄인다. 조회 시작 시점의 최대 PK를 고정하고 PK 범위로 나눠 읽으면 앞부분 재스캔 없이 진행된다. 실행 패턴은 [[MySQL-Long-Transactions-and-Batch|장기 트랜잭션과 배치]] 참고.
2. 스캔 범위 자체를 줄인다 (인덱스, 조건, 필요 컬럼).
3. timeout으로 폭주를 차단한다.
4. Reader의 READ COMMITTED(ARRRC)는 데이터 계약을 점검한 뒤 마지막 수단으로 쓴다.

분할의 트레이드오프는 전체 배치 시간 증가다. 각 chunk가 독립 statement가 되므로 총 소요는 늘지만, purge가 chunk 사이마다 진행할 수 있어 HLL 급증 규모가 크게 줄어든다.

### 사례

쓰기가 많은 서비스의 Writer(이미 READ COMMITTED)에서 963초짜리 단일 SELECT DISTINCT statement가 실행되는 동안 HLL이 2,054,013까지 오른 사례가 있다. 평소 기준선은 3,600에서 6,700 범위였고 문제 쿼리 시작 시점에 이미 약 15만이었다. 쿼리 종료 약 6분 뒤 알람 임계 아래로 내려왔지만 평소 범위 복귀까지는 약 24분이 걸렸다. 이후 해당 조회를 Reader로 옮기고 PK 기준 1만 건 단위 keyset chunk로 재구성해 전면 적용한 실행에서는 2,486개 사이트를 처리하는 동안 Writer HLL 최고값이 11,813에 머물렀다(대상 수와 실행 조건이 달라 사건 당시 값과의 직접 비교는 불가). 공유 스토리지라 Reader 이동만으로는 purge 부담이 분리되지 않으므로 급증을 막은 것은 chunk 분할이고, 그래서 판정 지표도 여전히 Writer HLL이었다. 배치 시간은 15분에서 45분으로 늘었지만 의도한 트레이드오프였다.

## 면접 체크포인트

- HLL의 정의와 증가 메커니즘 (오래된 read view가 purge를 막고 동시 쓰기의 undo가 쌓인다)
- 격리 수준은 read view 수명의 단위(트랜잭션이냐 statement냐)만 정하고 실제 수명은 statement와 트랜잭션 길이가 정한다는 구분
- READ COMMITTED에서도 장기 단일 statement가 purge를 막는 이유
- Aurora 공유 스토리지에서 Reader 장기 조회가 Writer HLL로 나타나는 구조
- ARRRC의 두 가지 적용 조건과 완화된 일관성의 대가, 데이터 계약 기반 판단
- HLL 급증의 근본 해결이 격리 수준 변경이 아니라 statement 분할인 이유

## 출처

- [963초짜리 쿼리 하나가 HLL 205만까지 끌어올렸습니다 — 아임웹 테크](https://tech.imweb.me/posts/aurora-hll-snapshot-lifetime/)
- [MySQL 8.4 Reference Manual, InnoDB Multi-Versioning](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)
- [MySQL 8.4 Reference Manual, Consistent Nonlocking Reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)
- [MySQL 8.4 Reference Manual, Purge Configuration](https://dev.mysql.com/doc/refman/8.4/en/innodb-purge-configuration.html)
- [Amazon Aurora User Guide, Aurora MySQL isolation levels](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.IsolationLevels.html)
- [Amazon Aurora User Guide, Amazon CloudWatch metrics for Amazon Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html)
- [Amazon Aurora User Guide, InnoDB history list length increased significantly](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/proactive-insights.history-list.html)

## 관련 문서

- [[MySQL-Long-Transactions-and-Batch|MySQL 장기 트랜잭션과 배치]] — keyset chunk 분할의 실행 규칙, innodb_trx 관찰 지점
- [[Isolation-Level|트랜잭션 격리 수준]] — read view 생성 시점의 격리 수준별 차이
- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — 공유 스토리지 구조
- [[RDS-Monitoring-Deep-Metrics|RDS/Aurora 모니터링 심화]] — HLL 알람 임계와 CommitLatency 지표 운영
- [[MySQL-Slow-Query-Diagnosis|Slow Query 진단]] — 원인 쿼리 특정
- [[MySQL-InnoDB-Tuning|InnoDB 튜닝]] — buffer pool과 I/O 맥락
- [[Transactions|트랜잭션]] — 트랜잭션과 MVCC 기본
