---
tags: [palantir, streaming, cdc, partition]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry streaming partition과 CDC"]
---

# Streaming key와 CDC current view

Partition key는 같은 key record의 순서를 유지할 처리 그룹이고 primary key는 changelog에서 최신 상태를 해석할 deduplication metadata다. Partition key를 지정한다고 중복이 없어지지 않으며 primary key를 지정한다고 저장된 changelog가 사라지지 않는다.

## Ordering은 전체 lineage의 약한 경계에 맞춰진다

입력은 Kafka partition에 기록되고 Flink는 같은 key를 같은 operator instance로 전달한다. Key가 없으면 round-robin 저장과 병렬 처리에서 순서를 보장하지 않는다. Partition 수를 하나로 설정한 것만으로 전체 Flink 처리 순서를 보장하지 않는다.

Order를 유지할 업무 그룹을 source부터 일관되게 설정한다. Kafka source이면 기존 key 의미를 이어받는다. Downstream에서 새 key를 지정해도 앞에서 이미 섞인 순서를 복구하지 못한다. Key column을 하나 더 넣으면 같은 모든 값의 조합 내부로 보장 범위가 좁아진다. Hot key와 불균등 분포는 parallelism을 늘려도 bottleneck을 남길 수 있다.

같은 pipeline 안에서는 key column을 삭제/덮어써도 re-key 전까지 기존 물리 분할의 순서가 이어질 수 있다. 그러나 output schema의 key metadata는 무효화된 column을 제거하므로 다음 pipeline까지 같은 보장이 이어진다고 가정하지 않는다.

## CDC primary key는 consumer의 읽기 계약이다

Primary key는 최신 streamed record 전체를 유지한다. 최신 row의 null도 이전 값으로 채우지 않는다. 선택적 deleted column이 true면 current view에서 제외한다. Ordering column으로 과거 event timestamp의 최대값을 자동 선택하는 모델이 아니다.

CDC를 쓰면 deduplication column과 같은 partition key를 설정해야 한다. UI는 이를 자동 추가한다. Primary key ordering column은 streaming deduplication을 바꾸지 않고 archive의 batch 소비에서만 의미가 있으므로 streaming 용도에서는 비워 두는 권고다.

Ontology hydration과 archive dataset을 읽는 Spark job은 CDC-aware current view를 읽는다. Dataset Preview/Contour에서 보이는 deduplicated 결과와 파일 download의 full changelog는 다를 수 있다. 일반 streaming transform과 replay는 full changelog를 처리한다. Current view를 확인했다는 사실만으로 replay에도 같은 row 수가 입력된다고 가정하지 않는다.

## Key metadata를 다시 확인한다

Rename은 key 이름을 갱신하지만 remove/overwrite는 해당 column을 key에서 제거한다. 전부 제거되면 key 자체가 사라진다. UDF는 key를 자동 전파하지 않으므로 의도한 `Key by`를 뒤에 적용한다. Stateful transform도 primary key를 전파하지 않는다. `Key by`는 기존 key를 덧붙이는 대신 새 정의로 대체한다.

Schema JSON의 실제 metadata 이름은 `includeInPartitioning`이며 문서의 일부 검색 안내에는 철자 오기가 있다. Primary key는 `primaryKey`의 columns/deletion resolution으로 확인하며 미설정은 null이다. Preview의 key icon만 보고 전체 lineage 보장을 판정하지 않는다.

## 출처

- [Palantir, Streaming keys](https://www.palantir.com/docs/foundry/building-pipelines/streaming-keys)

## 관련 문서

- [[Palantir-Streaming-State-and-Watermarks|Keyed state와 watermark]]
- [[Palantir-Streaming-Latency-and-Compute|Latency와 compute]]
- [[Palantir-Data-History-and-Time-Travel|이력과 current view]]
