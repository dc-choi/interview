---
tags: [data-pipeline, streaming, batch, flink, spark, mysql]
status: done
verified_at: 2026-08-04
category: "메시징&파이프라인(Messaging&Pipeline)"
aliases: ["Stream and Batch Processing", "스트림과 배치 처리"]
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

## MySQL의 역할

MySQL은 transactional source of record와 조회 serving에 적합하지만 unbounded stream processor는 아니다. log 기반 CDC가 commit된 row change를 꺼내 broker와 Flink, Kafka Streams 같은 처리기로 전달할 수 있다. CDC transport가 domain event 의미, 중복 제거와 최종 정합성을 자동으로 해결하지는 않는다.

반대로 일 마감과 backfill은 source snapshot, cutoff와 재시작 가능한 checkpoint를 먼저 정의한다. 운영 primary를 무제한 full scan하지 않고 read replica, export snapshot 또는 별도 analytics store를 검토한다.

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

## 운영 체크리스트

1. freshness와 completeness SLO를 분리한다.
2. source offset, batch watermark와 schema version을 기록한다.
3. replay와 backfill traffic을 live traffic에서 격리한다.
4. lag, watermark delay, late event, checkpoint 크기와 source DB 부하를 관찰한다.
5. sink는 중복과 순서 역전을 견디도록 idempotent upsert 또는 version 조건을 사용한다.
6. 정기적으로 source와 sink를 대사하고 차이를 복구하는 절차를 실행한다.

## 출처

- [Apache Flink Documentation, Windows](https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/datastream/operators/windows/)
- [Apache Spark Documentation, JDBC Data Source](https://spark.apache.org/docs/latest/sql-data-sources-jdbc.html)
- [Debezium Documentation, MySQL Connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [인프런, Hong, Streaming](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338561)
- [인프런, Hong, 대용량 Batch와 Spark](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338562)

## 관련 문서

- [[ELT-Platform|ELT 플랫폼]]
- [[CDC-Debezium-Concept|CDC와 Debezium 개념]]
- [[MQ-Kafka-Streams|Kafka Streams]]
- [[Backfill-Resource-Isolation|데이터 백필과 자원 격리]]
- [[Aggregate-Summary-Table-Patterns|집계 테이블과 재계산 가능한 통계]]
