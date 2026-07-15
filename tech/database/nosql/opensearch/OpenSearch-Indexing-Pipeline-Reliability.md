---
tags: [database, search, opensearch, cdc, reconciliation, dlq]
status: done
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Indexing Pipeline Reliability", "색인 파이프라인 신뢰성", "검색 정합성 검증"]
---

# OpenSearch 색인 파이프라인 신뢰성

동기화 아키텍처(outbox와 CDC, 멱등, 순서 방어)는 [[OpenSearch-Indexing-Internals#운영 DB와의 동기화|운영 DB와의 동기화]], 무중단 rebuild 절차는 [[OpenSearch-Index-Lifecycle#매핑 변경과 무중단 전환|무중단 전환]]이 정본이다. 이 문서는 그 파이프라인이 어긋났을 때를 다룬다. 감지 지표, 증상별 진단, 정합성 검증, 복구 우선순위다.

핵심 전제: read model의 어긋남은 5xx를 내지 않는다. 검색은 계속 정상 응답하므로 사용자 신고나 매출 하락으로 뒤늦게 발견된다. 감지를 설계하지 않은 파이프라인 장애는 존재하지 않는 것이 아니라 보이지 않는 것이다.

## 파이프라인 지표

| 지표 | 재는 법 | 알람 기준 잡기 |
|---|---|---|
| End-to-end 색인 지연 | 원본 commit 시각을 문서에 실어 색인 완료 시각과의 차를 계산 | freshness SLO 초과 (예: p99가 n초) |
| Consumer lag | Broker나 stream의 소비 offset 지연 | 평소 대비 배수와 증가 추세 |
| Bulk 실패율과 429율 | Bulk 응답의 `items[].error`를 status별 집계 | 0이 아닌 상태의 지속 |
| DLQ 깊이 | Dead-letter 건수 | 증가 추세와 체류 시간 |
| 문서 수 드리프트 | 조건별 원본 count 대비 색인 count | 지연 창을 감안한 허용 오차 초과 |

색인 지연은 평균이 아니라 꼬리로 본다. 대부분 문서가 1초 안에 붙는데 특정 파티션만 1시간 밀리는 장애가 평균에는 묻힌다.

## 증상별 진단

첫 갈림길은 `GET {index}/_doc/{id}`다. 신고된 문서를 `_id`로 직접 조회한다.

- 문서가 있고 내용도 맞다면 파이프라인이 아니라 query, analyzer, 권한 filter 문제다. `_explain`과 [[OpenSearch-Query-Relevance|query 진단]]으로 넘어간다.
- 문서가 없거나 옛 값이면 파이프라인 문제다. 아래 표로 간다.

| 증상 | 원인 후보 | 확인 | 대응 |
|---|---|---|---|
| 새 문서가 검색에 없다 | Dual-write gap, 이벤트 유실, DLQ 대기, 색인 지연 | DLQ와 lag, outbox 발행 기록, 원본 timestamp | 유실 구간 replay, gap이면 outbox나 CDC로 구조 수정 |
| 삭제된 문서가 나온다 (유령) | Delete 이벤트 유실, 삭제 뒤 늦게 도착한 update의 재생성 | 원본에 없는데 색인에 있는 id 목록, 이벤트 순서 | 해당 문서 삭제 후 tombstone과 version guard 도입 |
| 옛 값이 보인다 (stale) | 순서 역전, version guard 부재, hot 문서의 충돌 drop | 문서의 version field와 원본 비교, 409 로그 | 재색인으로 응급 조치, guard 없으면 구조 수정 |
| 같은 문서가 중복된다 | `_id`를 외부 ID로 쓰지 않고 auto-id + at-least-once 재처리 | `_id` 형식 확인 | `_id` 규약 수정 후 rebuild |

표의 구조 수정은 전부 동기화 정본의 원칙(외부 ID를 `_id`로, 단조 증가 version, 멱등 처리)으로 되돌아간다. 응급 재색인은 증상을 지우지만 원인은 남긴다. 둘을 구분해 기록해야 같은 장애가 반복될 때 구조 문제로 승격할 수 있다.

## Reconciliation 설계

원본과 색인의 불일치를 정기적으로 찾는 작업이다. 세 단계로 비용을 조절한다.

1. Count 비교: 상태나 파티션 같은 조건별 문서 수. 가장 싸고 방향만 알려준다.
2. 구간 checksum: `updated_at` 버킷별로 id와 version의 hash를 비교해 불일치 구간을 좁힌다.
3. 샘플 diff: 불일치 구간 또는 무작위 표본 n건을 field 수준으로 비교한다.

- 파이프라인 지연만큼 최근 구간은 원래 어긋나 있다. 검사 창에서 최근 몇 분을 제외해 거짓 알람을 없앤다.
- 원본 조회와 색인 조회의 시점 차이도 오차를 만든다. 허용 오차를 두고 반복해서 남는 불일치만 대응한다.
- 발견 시 대응은 범위로 판단한다. 몇 건이면 개별 재색인, 특정 시간대나 파티션이면 구간 replay, 구조적 원인이면 전체 rebuild다. Rebuild 절차는 lifecycle 정본을 따른다.

## DLQ 운영

- 들어가야 하는 것은 원인을 고치기 전엔 재시도가 무의미한 결정적 실패다. 파싱 불가, mapping 충돌, validation 오류가 여기 속한다. 429와 timeout 같은 일시 오류는 backoff 재시도로 소화하고 DLQ에 넣지 않는다. 분류 기준은 [[OpenSearch-Indexing-Internals#Bulk API|Bulk 재시도 원칙]]과 같다.
- Replay에는 함정이 있다. DLQ에 있던 이벤트보다 나중 이벤트가 이미 색인됐을 수 있으므로, version guard 없이 replay하면 stale이 최신을 덮는다. Replay 경로에도 정상 경로와 같은 guard를 태운다.
- DLQ가 비어 있는 것과 DLQ를 아무도 안 보는 것은 다르다. 적체 알람과 정기 검토 주기를 함께 둔다. 원인 유형별 집계가 남으면 백로그가 된다.

## Backpressure와 429

- 엔진이 밀리면(bulk 429, thread pool queue 포화) 소비자가 속도를 줄인다. Consumer pause, batch 크기 축소, backoff가 수단이다. 이 시간은 곧 색인 지연으로 전가되므로 지연 알람과 함께 해석한다.
- OpenSearch의 shard indexing backpressure는 노드가 넘어지기 전에 요청을 거부하는 장치이지만 기본값이 꺼져 있다. `shard_indexing_pressure.enabled`가 false이고, 켜도 `enforced`가 false인 동안은 지표만 쌓고 거부하지 않는다. 켜져 있다고 가정하고 소비자를 설계하면 오지 않는 신호를 기다리게 된다.
- 그렇다고 429가 안 오는 것은 아니다. 기본 cluster에서 살아 있는 출처가 셋이다. Write thread pool queue 거부, node 수준 indexing pressure(`indexing_pressure.memory.limit`, 기본 heap의 10퍼센트, 끄는 flag가 없어 항상 동작), circuit breaker다. 429는 장애가 아니라 속도를 줄이라는 신호이되, `_nodes/stats`의 `thread_pool.write.rejected`, `indexing_pressure.memory.total.*_rejections`, `breakers.*.tripped`로 어느 쪽인지 가른 뒤 대응한다. 분류 순서는 [[OpenSearch-Performance-Troubleshooting#Thread pool과 429|429 대응 순서]], 기본값 구분은 [[OpenSearch-Performance-Troubleshooting#Backpressure|backpressure]]가 정본이다.
- Backfill과 서비스 증분 색인이 같은 cluster 자원을 두고 경쟁한다. 시간대 분리나 backfill 속도 상한을 두고, 적재 구간의 setting 조정은 [[OpenSearch-Indexing-Internals#대량 적재 구간의 setting 조정|정본]]을 따른다.

## 복구 우선순위

Read model이라는 사실이 복구 전략의 근거다.

1. 원본과 이벤트 보존이 1순위다. 색인은 최악의 경우에도 rebuild로 되살릴 수 있지만, 이벤트 스트림의 보존 기간이 장애 감지와 복구에 걸리는 시간보다 짧으면 replay할 구간 자체가 사라진다. Retention을 처리량이 아니라 감지 시간 기준으로 정한다.
2. 파이프라인이 죽어도 검색은 계속 뜬다. Stale 데이터임을 사용자에게 알릴지는 기술이 아니라 제품 결정이므로 미리 합의해 둔다.
3. 복구는 좁은 범위부터 넓힌다. 문서 재색인, 구간 replay, 전체 rebuild 순서다. 전체 rebuild를 첫 수로 두면 복구 시간이 데이터 크기에 비례해 버린다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Indexing-Internals|색인 내부와 동기화 아키텍처]]
- [[OpenSearch-Index-Lifecycle|무중단 전환과 rebuild]]
- [[OpenSearch-Cluster-Reliability|Cluster 수준 복구]]
- [[OpenSearch-Performance-Troubleshooting|엔진 성능 진단]]
- [[CDC-Debezium|CDC와 Debezium]]
- [[Transactional-Outbox|Transactional Outbox]]

## 출처

- [Bulk API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/bulk/)
- [Shard indexing backpressure - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/shard-indexing-backpressure/)
- [Shard indexing backpressure settings - OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/shard-indexing-settings/)
- [Debezium FAQ (delivery semantics) - Debezium](https://debezium.io/documentation/faq/)
- [Transactional outbox pattern - AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
