---
tags: [palantir, cdc, streaming, flink, recovery]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["CDC ordering과 stream 복구"]
---

# CDC ordering과 stream 복구

CDC는 같은 primary key의 변경 event를 전달하는 changelog다. Primary key column, numeric ordering column과 Boolean deletion column을 정의한다. Current view는 key별 최대 ordering row를 고른 뒤 그 row의 deletion=true면 제거한다. PK 중복 event가 있다는 이유만으로 changelog 자체를 잘못된 table로 판단하지 않는다.

## Archive와 Ontology의 순서 계약을 구분한다

Stream live는 펼쳐진 event 목록, archive는 resolution strategy로 접은 latest state를 보여준다. Archive는 ordering column으로 늦게 도착한 event도 resolve하지만 2026-10-16 CDC 문서의 명시 warning은 Ontology OSv2가 arrival order를 사용하고 ordering metadata를 무시한다고 설명한다.

Ordering=2의 foo 뒤에 ordering=1의 bar가 도착하면 archive와 Ontology가 다르게 보일 수 있다. 문서에는 connector/stream ordering이 유지된다는 전제가 있지만 custom ingestion/backfill은 이를 충족하는지 확인한다. Pipeline Builder에서 재정렬한 뒤 indexing하는 경로를 검토한다. Key By metadata를 붙이는 것만으로 모든 consumer가 event-time order를 적용한다고 보장하지 않는다.

Pipeline Builder는 metadata column이 바뀌지 않으면 CDC metadata를 전파하고 변경/누락하면 Key By로 다시 구성할 수 있다. Dataset transforms의 append-only incremental과 Iceberg changelog incremental 지원도 구분한다. Source data retention window에 오래 갱신되지 않은 record는 Ontology에서 사라질 수 있다. Workshop auto-refresh는 index의 변경을 보여 주는 기능이며 ordering 오류를 교정하지 않는다.

## CDC 시작은 전체 과거 data 복원이 아니다

지원 source에서도 DB/table의 log capture와 SELECT/필요한 EXECUTE 권한을 준비한다. 현행 문서의 direct CDC source는 Db2/SQL Server/Oracle/PostgreSQL이며 다른 DB가 log를 생산할 수 있다는 사실과 connector 지원은 별도다. Kafka 등으로 받은 changelog-shaped stream에 수동 metadata를 붙이는 대안이 있다.

Default는 앞으로의 변경만 수집하며 자동 backfill하지 않는다. 먼저 CDC를 시작하고 batch snapshot을 create event로 변환해 합치는 패턴은 가능하지만 snapshot 시각, event ordering과 deletion 재구성을 맞춰야 한다. Snapshot CURRENT_TIMESTAMP를 source 변경 시각과 같은 의미로 쓰지 않는다. 불완전한 snapshot 비교로 삭제를 추론할 때 coverage도 확인한다.

같은 source의 CDC sync들은 single multi-output extract job이다. Feed 추가/제거 때 기존 stream도 잠시 중지하고 변경 후 job을 수동 재시작해야 한다. Outage 동안 log retention이 최대 outage보다 길어야 catch-up이 가능하며, source log가 purge되면 자동 복구할 수 없는 gap이 생길 수 있다.

## Debezium 설정은 source별로 검토한다

기본 tombstones.on.delete=false는 deletion column event 자체가 없다는 뜻이 아니다. Decimal은 string, include.schema.changes=false는 DDL forwarding 제외, offset flush는 기본 60초, transient error retry는 5회다. SQL Server offset flush는 별도로 1초다.

| Source | Snapshot 기본과 주요 차이 |
|---|---|
| Oracle | schema_only, logminer/online_catalog, captured table DDL만, query filter in, batch 50000/retry 10 |
| PostgreSQL | never, pgoutput |
| Db2 | no_data, isolation none |
| SQL Server | schema_only |

No-data snapshot은 table lock 부담을 줄이지만 이미 purge된 log를 복구하지 않는다. Alternative recovery는 schema history 복원이며 조건과 history 보존이 필요하다. Always는 매 restart snapshot의 lock/부하, when_needed는 offset 부재/만료 시 snapshot 가능성을 고려한다. Arbitrary Debezium override가 모든 driver/version에서 지원되는지 확인하고 설정 변경이 data 무손실을 자동 보장한다고 보고하지 않는다.

## Stream의 delivery와 state 복구

Hot buffer는 low-latency row, cold archive는 몇 분 간격으로 표준 dataset에 보존한 data다. 지원 consumer는 hybrid view를 읽는다. Stream은 본래 batch transaction boundary가 아니라 row 단위 state를 사용한다. Partitions는 throughput을 늘리며 약 5MB/s/partition은 heuristic이다. High-throughput/compression은 latency/CPU와 맞바꾸므로 lag/batch size/producer expiry를 보고 조정한다.

Flink logical graph의 operator는 physical task로 실행되고 chain될 수 있다. JobManager는 scheduling/checkpoint/recovery, TaskManager는 execution/buffering/state를 맡는다. Large state와 large record/high throughput은 다른 resource 원인이므로 parallelism과 memory profile을 구분한다.

Checkpoint는 operator state와 처리 위치를 보존한다. Pipeline exactly-once는 checkpoint 완료 후 output을 보이게 하여 latency가 늘 수 있다(문서 기본 2초). Extract/export는 at-least-once만 지원하며 source duplicate 또는 외부 side effect를 platform processing guarantee가 없애 주지 않는다. Exactly-once라는 이름으로 모든 시스템의 idempotency를 생략하지 않는다.

## Monitor와 reset의 범위

Deterministic flow에 ingest count alert를 두고 pipeline checkpoint liveness/duration/trigger failures/consecutive failures, lag/throughput/utilization을 본다. Zero incoming이어도 state checkpoint는 살아 있어야 한다. Ingest live-view 성공과 output application 반영은 별도다. Beta output monitor는 time-series와 geotemporal로 제한되며 geotemporal sent는 service 처리 완료를 보장하지 않는다.

Profile은 pipeline과 같은 Project에 reference가 필요하다. Large profile import는 Enrollment Resource Administrator가 수행하며 참조 제거는 사용하는 job을 깨뜨릴 수 있다. Monitor metrics UI는 single-target streaming/time-series scope에서 제공되는 제한을 확인한다. Email/PagerDuty는 subscription/integration 설정을 따르고 실제 incident evidence와 대조한다.

Reset은 ingest stream에만 가능하며 기존 record를 지우고 schema/throughput/config를 바꿀 수 있다. Downstream은 replay해야 하고 push POST URL의 viewRid 갱신 또는 Magritte agent rebuild가 필요하다. 기존 reference가 유지된다고 data가 보존되는 것은 아니다. Production stream reset은 손실 영향과 replay source의 가용성을 확인한 별도 작업이다.

## 출처

- [Palantir, Change data capture](https://www.palantir.com/docs/foundry/data-integration/change-data-capture)
- [Palantir, Streams](https://www.palantir.com/docs/foundry/data-integration/streams)
- [Palantir, Flink fundamentals](https://www.palantir.com/docs/foundry/data-integration/flink-streaming)
- [Palantir, Streaming resource guide](https://www.palantir.com/docs/foundry/data-integration/streaming-guide)
- [Palantir, Streaming profiles](https://www.palantir.com/docs/foundry/data-integration/streaming-profiles)
- [Palantir, Stream monitoring](https://www.palantir.com/docs/foundry/data-integration/stream-monitoring)
- [Palantir, Reset stream](https://www.palantir.com/docs/foundry/data-integration/reset-stream)

## 관련 문서

- [[Palantir-Streaming-Keys-and-CDC|Partition key와 CDC metadata]]
- [[Palantir-Streaming-State-and-Watermarks|Watermark와 state]]
- [[Palantir-Health-Check-Evaluation-and-Freshness|Health freshness]]
