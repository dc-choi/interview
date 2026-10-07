---
tags: [data-pipeline, streaming, batch, flink, spark, mysql]
status: done
verified_at: 2026-09-30
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Stream and Batch Processing", "스트림과 배치 처리", "Spark JDBC 병렬 추출"]
---

# 스트림과 배치 처리

Batch와 stream의 핵심 차이는 데이터가 정형인지, 양이 큰지가 아니라 입력의 경계와 결과를 확정하는 시간이다. Batch는 유한한 입력을 처리하고, stream은 계속 도착하는 입력을 증분 처리한다. 실무 pipeline은 둘을 함께 사용한다.

## 처리 모델 비교

| 축 | Batch | Stream |
|---|---|---|
| 입력 | 시작과 끝이 있는 snapshot 또는 구간 | 끝이 정해지지 않은 event 흐름 |
| 결과 시점 | 작업 완료 뒤 확정 | event 도착과 watermark에 따라 갱신 |
| 상태 | 작업 범위 안의 shuffle과 aggregate | 장기 state, checkpoint와 replay |
| 대표 용도 | backfill, 일 마감, 대량 export | 이상 탐지, 실시간 projection, 저지연 집계 |

Stream도 schema를 가질 수 있고 batch도 매우 작을 수 있다. latency, completeness, 재처리 비용과 원천 부하로 모델을 고른다.

## Event time과 window

- event time은 사건이 원천에서 발생한 시각이고 processing time은 처리기가 관측한 시각이다.
- out-of-order event가 존재하므로 watermark로 event time 진행 정도를 추정한다.
- tumbling window는 겹치지 않는 고정 구간, hopping/sliding window는 겹치는 구간, session window는 활동 간격으로 경계를 만든다.
- allowed lateness를 늘리면 늦은 event를 더 반영하지만 결과 확정과 state 정리가 늦어진다.
- window SQL은 Flink, ksqlDB 같은 처리 엔진의 문법일 수 있다. MySQL SQL로 오해하지 않는다.

정확한 결과가 필요한 pipeline은 늦게 도착한 event를 무시하는 것으로 끝내지 않는다. 수정 event, 재집계 batch 또는 source와의 reconciliation 경로를 둔다.

## 실시간 표시와 확정 결과를 분리한다

순위표처럼 한 항목의 값이 다른 항목의 순위에도 영향을 주는 화면은 개별 이벤트의 빠른 전달만으로 완성되지 않는다. 실시간 집계는 현재까지의 잠정값을 제공하고, 종료 시점에는 확정 입력을 반영하는 경로가 필요하다. 확정 처리가 반드시 배치인 것은 아니다. 종료를 나타내는 이벤트를 별도 소비해 최종 결과를 저장할 수도 있다.

다음은 실시간 순위와 종료 결과를 분리하는 구조에 적용할 설계 기준이다.

- 원본과 파생 통계를 구분한다. 나중에 정정이 들어올 수 있다면 정정 대상과 변경 이력을 식별하고 영향받는 기간과 순위를 재계산할 수 있게 한다.
- 현재값을 조회하는 경로와 변경을 알리는 경로를 구분한다. 알림 수신을 결과 확정의 증거로 삼지 않고, 화면에서 기준 시각과 잠정 또는 확정 상태를 구분한다.
- 집계와 전송 주기를 함께 정한다. 여러 이벤트를 묶어 저장과 알림 횟수를 줄이면 화면 지연이 늘 수 있으므로 허용 지연과 쓰기 부하를 같이 측정한다.

2026-10-07 AWS AppSync GraphQL 공식 문서 확인 기준, 일반적인 schema subscription은 연결된 mutation이 실행될 때 발생한다. Query나 DynamoDB 직접 쓰기를 subscription 발행과 동일하게 취급하지 않는다. 구독자가 요구한 필드가 mutation의 selection set에 없으면 `null`이나 non-null 제약 오류가 생길 수 있으므로 저장 성공과 알림 payload의 완전성을 따로 확인한다. 이는 AppSync GraphQL subscription의 조건이며 모든 이벤트 전송 서비스의 공통 동작은 아니다.

## MySQL의 역할

MySQL은 transactional source of record와 조회 serving에 적합하지만 unbounded stream processor는 아니다. log 기반 CDC가 commit된 row change를 꺼내 broker와 Flink, Kafka Streams 같은 처리기로 전달할 수 있다. CDC transport가 domain event 의미, 중복 제거와 최종 정합성을 자동으로 해결하지는 않는다.

반대로 일 마감과 backfill은 source snapshot, cutoff와 재시작 가능한 checkpoint를 먼저 정의한다. 운영 primary를 무제한 full scan하지 않고 read replica, export snapshot 또는 별도 analytics store를 검토한다.

## 계산을 분산 처리기에 넘기는 시점

스케줄러와 SQL로 MySQL 안에서 돌리던 일 마감 집계는 데이터가 수백만, 수천만 건으로 늘면 세 가지 한계에 부딪힌다.

- 처리 시간이 허용된 실행 시간대(예: 새벽)를 넘는다. batch는 언제 시작해 언제까지 끝나야 하는지가 먼저 정해지는 작업이다.
- 무거운 집계 query가 운영 DB의 부하가 되어 서비스 지연으로 번진다.
- 중간에 실패하면 어디부터 다시 돌릴지 정하기 어렵다.

Spark 같은 분산 처리기에 계산을 넘기면 DB는 행을 나눠 읽어 주기만 하고 집계는 cluster가 병렬로 한다. 큰 작업을 쪼개 여러 machine에서 처리하고 합치는 MapReduce식 분할 정복에, 중간 결과를 메모리에 두고 재사용하는 방식을 더한 엔진이다. 운영과 학습 비용이 크므로 index, 요약 table, 증분 집계로 DB 안에서 해결되지 않을 때 도입한다 ([[Aggregate-Summary-Table-Patterns|집계 테이블과 재계산 가능한 통계]]).

## Spark JDBC 병렬 추출

```text
partitionColumn = id
lowerBound      = observed minimum
upperBound      = observed maximum
numPartitions   = database capacity 안의 병렬도
```

- `partitionColumn`은 numeric, date 또는 timestamp column이어야 한다.
- `lowerBound`와 `upperBound`는 partition stride를 정할 뿐 row filter가 아니다. 전체 table을 반환할 수 있다.
- `numPartitions`는 최대 parallel JDBC connection 수도 제한한다. executor 수만 보고 정하면 source DB를 고갈시킬 수 있다.
- predicate, aggregate, limit pushdown은 connector와 query 형태에 따라 달라진다. 실제 실행 계획과 source metrics를 확인한다.
- 병렬 query가 서로 다른 시점의 row를 읽을 수 있으므로 snapshot consistency, cutoff와 변경 중인 row 처리 규칙을 둔다.
- partition key 분포가 치우치면 같은 폭의 range가 같은 작업량을 뜻하지 않는다. key histogram과 task skew를 본다.

### 생성되는 분할 query와 source 부하

Spark 4.2 `JDBCRelation` 기준으로 Spark는 partition마다 `partitionColumn` 범위 조건을 붙인 SELECT를 따로 보낸다. 간격은 대략 `(upperBound - lowerBound) / numPartitions`이고, 첫 partition은 `col < 첫 경계 or col is null`, 중간은 `col >= a AND col < b`, 마지막은 `col >= 마지막 경계`다. 차이 `upperBound - lowerBound`가 `numPartitions`보다 작으면 partition 수가 그 차이로 줄어든다.

- 첫 partition과 마지막 partition은 열린 구간이라 bounds 밖의 값과 NULL이 모두 그 둘로 간다. bounds를 실제 분포보다 좁게 잡으면 양 끝 task에 행이 몰린다.
- `partitionColumn`에는 index가 있어야 한다. index가 없으면 range 조건마다 full table scan이 되어 `numPartitions`개의 full scan이 source에 동시에 걸린다. InnoDB는 midpoint insertion으로 scan 페이지가 buffer pool의 hot page를 밀어내는 것을 줄이지만, 동시 scan의 I/O와 CPU 경합은 막지 못해 같은 인스턴스의 OLTP 지연으로 번질 수 있다. 추출은 replica나 snapshot에서 한다.
- `pushDownPredicate`(기본 true)는 가능한 filter를 source로 보내 Spark로 오는 행을 줄인다. 밀어 넣은 조건은 partition range 조건과 AND로 붙으므로 둘을 함께 받치는 index인지 실행 계획으로 확인한다.
- `pushDownAggregate`, `pushDownLimit`(Spark 4.2 문서 기본 true)은 문서상 V2 JDBC data source 옵션이다. 적용되면 집계가 다시 source에서 실행될 수 있어 계산 위임이 목적이면 읽기 경로별로 실제 전송 SQL을 확인한다. Spark는 partition WHERE 절과 생성 query를 INFO 로그로 남긴다.
- `fetchsize` 기본값 0은 driver 기본 동작을 따른다는 뜻이다. MySQL Connector/J는 기본으로 result set 전체를 메모리에 읽으므로 partition 하나가 크면 executor 메모리 부담이 된다. Connector/J 문서의 row 단위 streaming(`Integer.MIN_VALUE` fetch size)이나 `useCursorFetch=true`와 양수 fetch size 조합을 검토한다.

### Shuffle 비용

shuffle은 같은 key의 데이터를 partition 사이로 다시 모으는 과정이다. `GROUP BY`나 join처럼 key별로 모아야 하는 연산에서 executor와 machine 사이 복사가 일어나 disk I/O, 직렬화와 network I/O가 드는 비싼 연산이다. 그룹핑 전에 WHERE 조건과 필요한 column만 남겨 입력을 줄이는 것이 shuffle 양을 줄이는 첫 수단이다.

## 운영 체크리스트

1. freshness와 completeness SLO를 분리한다.
2. source offset, batch watermark와 schema version을 기록한다.
3. replay와 backfill traffic을 live traffic에서 격리한다.
4. lag, watermark delay, late event, checkpoint 크기와 source DB 부하를 관찰한다.
5. sink는 중복과 순서 역전을 견디도록 idempotent upsert 또는 version 조건을 사용한다.
6. 정기적으로 source와 sink를 대사하고 차이를 복구하는 절차를 실행한다.

## 출처

- [Building leaderboard functionality with serverless data analytics — AWS Compute Blog](https://aws.amazon.com/blogs/compute/building-serverless-applications-with-streaming-data-part-4/)
- [AWS AppSync GraphQL, Using subscriptions for real-time data applications](https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html)
- [Inside the Ropes: PGA TOUR X AWS: Powering TOURCAST — Amazon Web Services](https://www.youtube.com/watch?v=4doZZtycrqg)
- [Apache Flink Documentation, Windows](https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/)
- [Apache Spark Documentation, JDBC Data Source](https://spark.apache.org/docs/latest/sql-data-sources-jdbc.html)
- [Apache Spark Documentation, RDD Programming Guide (Shuffle operations)](https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations)
- [JDBCRelation.scala v4.2.0 — Apache Spark GitHub](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/datasources/jdbc/JDBCRelation.scala)
- [JDBCRDD.scala v4.2.0 — Apache Spark GitHub](https://github.com/apache/spark/blob/v4.2.0/sql/core/src/main/scala/org/apache/spark/sql/execution/datasources/jdbc/JDBCRDD.scala)
- [MySQL 8.4 Reference Manual, Range Optimization](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)
- [MySQL 8.4 Reference Manual, Making the Buffer Pool Scan Resistant](https://dev.mysql.com/doc/refman/8.4/en/innodb-performance-midpoint_insertion.html)
- [MySQL Connector/J Developer Guide, JDBC API Implementation Notes](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-implementation-notes.html)
- [Debezium Documentation, MySQL Connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [인프런, Hong, Streaming](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338561)
- [인프런, Hong, 대용량 Batch와 Spark](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338562)

## 관련 문서

- [[ELT-Platform|ELT 플랫폼]]
- [[CDC-Debezium-Concept|CDC와 Debezium 개념]]
- [[MQ-Kafka-Streams|Kafka Streams]]
- [[Backfill-Resource-Isolation|데이터 백필과 자원 격리]]
- [[Aggregate-Summary-Table-Patterns|집계 테이블과 재계산 가능한 통계]]
