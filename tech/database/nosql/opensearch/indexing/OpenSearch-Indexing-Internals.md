---
tags: [database, search, opensearch, indexing, translog, segment]
status: done
verified_at: 2026-08-13
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Indexing Internals", "OpenSearch 색인 내부"]
---

# OpenSearch 색인 내부 동작

색인 성공, 디스크 내구성, GET 가시성, Search 가시성은 서로 다른 경계다. 이를 하나의 일관성 보장으로 묶어 이해하면 read-after-write 버그와 불필요한 강제 refresh가 생긴다.

이 문서의 기본 흐름은 기본값인 `DOCUMENT` replication과 `index.translog.durability=request`를 전제로 한다. `SEGMENT` replication이나 async durability에서는 복제 시점과 acknowledgment 특성이 달라진다.

## 한 문서의 생명주기

```text
Index request
  -> primary translog 기록
  -> Lucene in-memory buffer 반영
  -> replica에 operation 복제
  -> refresh로 searchable segment 생성
  -> flush로 Lucene durable commit
  -> background merge로 segment 통합
```

| 단계 | Search 가능 | 장애 복구 내구성 | 주된 비용 |
|---|---:|---:|---|
| Translog fsync | 아니요 | 기본 request durability에서 예 | write latency와 disk sync |
| Refresh | 예 | Lucene commit 경계는 아님 | 작은 segment, reader reopen |
| Flush | Lucene commit point를 fsync | 예 | fsync와 commit |
| Merge | 가시성 유지 | 새 segment로 재작성 | CPU, I/O, 임시 디스크 |

이 흐름은 개념적 순서다. Refresh와 flush는 문서마다 반드시 차례로 실행되는 단계가 아니라 별도 조건과 주기로 실행된다. Refresh는 search reader의 가시성을 갱신하고, flush는 아직 commit되지 않은 operation을 포함해 durable Lucene commit을 만든다.

핵심 역할은 세 문장으로 구분한다.

- Translog는 어떤 operation이 일어났는지 남기는 장애 복구용 로그다.
- Segment는 역색인, points, `doc_values`와 `_source`를 포함한 stored field를 묶은 불변 검색 자료구조다.
- Refresh는 indexing buffer의 변경으로 새 segment를 만들고 Search reader에 공개하는 가시성 경계다. Translog를 segment로 바꾸는 작업은 아니다.

## Translog

Translog는 아직 Lucene durable commit에 포함되지 않은 acknowledged operation을 crash 후 재실행하기 위한 로그다.

- Primary와 replica는 각자의 translog를 가진다.
- 기본 request durability에서는 응답 전에 translog를 fsync한다.
- Refresh 전 문서가 Search에는 안 보여도 이미 durable할 수 있다.
- `index.translog.flush_threshold_size`를 높여 더 큰 translog를 허용하면 flush 빈도를 줄일 수 있지만 장애 복구 시 replay할 데이터가 늘어난다.

## 실시간 GET과 Search가 갈리는 이유

`GET /{index}/_doc/{id}`는 기본값이 `realtime=true`다. `_id`의 hash로 대상 shard group을 바로 찾고, 엔진은 최근 operation의 ID와 version, translog 위치를 `LiveVersionMap`에서 추적한다. 아직 외부 Search reader에 보이지 않는 최신 문서는 translog에서 직접 읽거나 필요한 내부 reader를 열어 반환할 수 있다. 이미 알고 있는 ID 하나를 찾는 경로라서 Search용 refresh를 기다릴 필요가 없다.

```text
알고 있는 ID -> shard routing -> version map -> translog 또는 내부 reader -> GET
일치 문서 탐색 -> shard fan-out -> refresh된 Lucene segment -> Search
```

Search가 같은 방식으로 translog까지 함께 읽지 않는 이유는 단순히 구현이 빠졌기 때문이 아니다.

- Search는 ID를 모르므로 inverted index의 term dictionary와 postings, 숫자 범위용 point, 정렬과 집계용 doc values로 일치 문서를 찾아야 한다.
- Translog는 복구용 operation log이지 field별 검색 구조가 아니다. 검색할 때마다 refresh 전 operation을 순회하고 분석하면 비용이 미반영 write 수에 비례한다.
- Update와 delete를 기존 segment hit와 합쳐 최신 상태로 중복 제거해야 하고, 점수 계산, 정렬과 집계에도 같은 보정이 필요하다.
- 계속 변하는 translog tail을 결과에 섞으면 segment snapshot과 query cache의 안정성도 깨지고, 검색 지연이 write 양에 직접 끌려간다.

그래서 OpenSearch는 indexing buffer의 변경을 refresh 시점에 한 번 searchable segment로 만들고 reader를 다시 연다. 검색 구조 생성 비용을 여러 Search 요청이 나눠 쓰는 대신, refresh 전까지의 짧은 가시성 지연을 받아들이는 near real-time 설계다. `realtime=false`인 GET도 마지막 refresh 기준으로 읽는다.

## Refresh

Refresh는 in-memory indexing buffer를 새 Lucene segment로 만들고 새 search reader를 연다. 검색 가시성 경계이며 durability 경계가 아니다.

- 기본적인 `index.refresh_interval`은 1초다.
- 명시적 interval이 없는 shard는 일정 시간 검색 요청이 없으면 idle 상태가 되어 불필요한 refresh를 줄인다.
- `refresh=false`: 기본값, 정기 refresh를 기다린다.
- `refresh=true`: 즉시 refresh를 강제한다.
- `refresh=wait_for`: 다음 정기 refresh로 searchable해질 때까지 응답만 기다린다.

운영에서 read-after-write search가 꼭 필요하면 반복적인 `refresh=true`보다 `refresh=wait_for`를 우선 검토한다. 강제 refresh는 작은 segment를 많이 만들고 search와 merge 비용을 동시에 늘린다.

## Flush

Flush는 Lucene segment를 fsync해 durable commit을 만들고 더 이상 복구에 필요하지 않은 translog 구간을 정리할 수 있게 한다.

- OpenSearch가 translog 크기 등의 조건으로 자동 수행한다.
- 수동 Flush API는 재시작 전 특수한 운영이나 진단 외에는 드물게 사용한다.
- Refresh와 Flush를 같은 동작으로 이해하면 안 된다.

## Immutable segment와 Merge

Lucene segment는 immutable이다.

- 내용이 실제로 바뀐 문서 update는 segment 내부 수정이 아니라 새 버전 색인과 이전 버전 삭제 표시다. Update API는 `detect_noop: true`가 기본이므로 결과가 같으면 재색인을 건너뛸 수 있다.
- Delete도 즉시 파일 공간을 지우지 않고 삭제 표시를 남긴다.
- Background merge가 작은 segment를 큰 segment로 재작성하면서 삭제 공간을 회수한다.
- Merge는 검색할 segment 수를 줄이지만 CPU, disk I/O, 임시 공간을 사용한다.

Force merge는 계속 쓰는 hot index에 습관적으로 실행하지 않는다. 모든 write가 끝난 index를 read-only로 전환한 뒤 충분한 I/O와 임시 disk 공간을 확보해 제한적으로 수행하는 편이 안전하다.

## 낙관적 동시성 제어

각 operation에는 `_seq_no`와 `_primary_term`이 있다.

- `_seq_no`: shard 안의 operation 순서
- `_primary_term`: 현재 primary 세대, primary가 바뀌면 증가

```http
PUT products/_doc/42?if_seq_no=17&if_primary_term=3
{
  "name": "updated"
}
```

둘 중 하나라도 최신 값과 다르면 HTTP 409 version conflict가 발생한다. stale read 기반 update가 새 값을 덮는 lost update를 막는 핵심 수단이다.

`retry_on_conflict`는 Update API가 충돌할 때 최신 OpenSearch 문서를 다시 읽어 partial update나 script를 재실행하며 기본값은 0이다. 충돌한 시도는 commit되지 않으므로 최신 `_source`에 연산을 다시 적용해도 의도한 의미가 유지되는지 확인한다. Network timeout 뒤 client가 전체 요청을 다시 보내는 멱등성 문제와는 다르며 외부 이벤트 순서도 보장하지 않는다.

과거 이벤트가 최신 projection을 덮는 문제는 원본 system의 단조 증가 version으로 막는다. 충돌이 계속되는 hot document에서 재시도 횟수만 높이지 말고 event fan-in과 문서 경계를 재설계한다.

## 단건과 Bulk의 공통 색인 경로

단건 Index API와 Bulk API는 전송 단위가 다르다. Bulk는 여러 operation의 network와 coordinating overhead를 줄이지만 각 item은 별도로 검증되고 target primary shard에 routing된다. 수집 경로 선택, NDJSON 계약, item별 재시도, 대량 적재 setting과 ingest pipeline은 [[OpenSearch-Data-Ingestion|데이터 수집과 Bulk 색인]]이 정본이다.

Ingest pipeline을 지정한 operation은 processor 실행을 통과한 뒤 색인 경로로 들어간다. Item이 수락된 다음에는 단건과 Bulk 모두 primary의 translog, in-memory buffer, replica operation 복제와 refresh라는 같은 생명주기를 따른다. 따라서 Bulk request의 전송 성공, 각 item의 색인 성공, Search 가시성도 서로 다른 경계다.

## 운영 DB와의 동기화

OpenSearch를 검색 Read Model로 쓰면 운영 DB가 source of truth다. 이 구조는 CQRS의 query side이자 검색 요구에 맞춘 materialized view이며 Event Sourcing을 요구하지 않는다. 역정규화는 join 비용을 읽기에서 쓰기로 옮기므로 한 원본 변경이 갱신할 검색 문서 수와 projection 소유권, 전체 rebuild 비용을 설계한다.

```text
Write -> RDBMS -> CDC 또는 outbox -> OpenSearch
Read  -> OpenSearch
```

동기화 파이프라인 지연과 OpenSearch 내부의 refresh 지연은 서로 다른 경계다.

```text
DB commit -> outbox 또는 CDC -> consumer -> Index operation 적용 -> refresh -> Search 노출
           <--------- 파이프라인 지연 --------->              <- 가시성 지연 ->
```

`refresh=wait_for`는 consumer가 Index API를 호출한 뒤 다음 refresh까지만 기다린다. Outbox 대기와 consumer lag에는 영향을 주지 않으므로 비동기 파이프라인 전체의 read-after-write를 보장하지 않는다. End-to-end freshness는 원본 commit부터 Search 노출까지 별도로 측정한다.

- 외부 도메인 ID를 OpenSearch `_id`로 사용하면 재처리의 멱등성이 좋아진다.
- DB commit 뒤 event publish를 호출하는 것만으로는 dual-write gap이 남는다. Transactional outbox나 committed change log 기반 CDC로 확정된 변경을 capture한다.
- 이벤트 순서 역전은 `_seq_no`가 아니라 원본의 단조 증가 version, change sequence, LSN 등으로 방어한다. Timestamp를 사용한다면 동률과 clock skew 정책이 필요하다.
- At-least-once 전달을 가정하고 create, update, delete를 멱등 처리한다. 삭제 version 보존은 `index.gc_deletes`, 기본 60초로 제한되므로 더 늦은 event까지 막으려면 source 측 projection ledger나 soft-delete tombstone을 유지한다.
- 색인 지연, 실패 item, dead-letter 적체를 별도 지표로 둔다.
- Source와 read model의 불일치를 찾는 reconciliation job과 freshness SLO를 둔다. 지표 설계, 증상별 진단, reconciliation 3단계, DLQ 운영은 [[OpenSearch-Indexing-Pipeline-Reliability|파이프라인 신뢰성]]이 정본이다.
- 새 field 추가와 일부 지원되는 mapping parameter 변경은 기존 인덱스에 적용할 수 있다. 기존 field type과 analyzer처럼 호환되지 않는 변경은 새 인덱스, reindex, alias 전환으로 처리한다.
- OpenSearch 장애가 원본 쓰기까지 막지 않도록 동기화 경로를 비동기로 격리한다.

## Read Model 전환 원칙

호환되지 않는 mapping과 projection 변경은 새 인덱스를 만들어 전환한다. 변경 capture를 backfill보다 먼저 시작하고, consistent snapshot과 high watermark를 기준으로 적재한 뒤 source version guard가 있는 stream replay로 catch-up한다. Count, hash, 삭제 건, sample, 핵심 query, latency와 오류율을 검증하고 shadow read와 canary를 통과한 뒤 alias를 전환한다.

이전 인덱스가 같은 변경 stream을 계속 받거나 cutover 이후 변경을 원본에서 재생할 수 있을 때만 rollback한다. 둘 다 불가능하면 alias를 되돌리지 않고 forward-fix한다. 새 인덱스 생성부터 backfill, catch-up, alias 전환과 rollback까지의 전체 절차는 [[OpenSearch-Index-Lifecycle#매핑 변경과 무중단 전환|인덱스 수명주기의 무중단 전환 절차]]를 정본으로 따른다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]], [[OpenSearch-Data-Ingestion|데이터 수집과 Bulk 색인]], [[OpenSearch-Korean-Text-Analysis|첫 적용: 한국어 텍스트 분석]]
- [[OpenSearch-Architecture|분산 실행 모델]]
- [[OpenSearch-Index-Lifecycle|인덱스 수명주기]]
- [[CDC-Debezium|CDC와 Debezium]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[Event-Sourcing|Event Sourcing과 Read Model]]

## 출처

- [Index document — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/index-document/)
- [Update Document API — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/update-document/)
- [Delete Document API — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/delete-document/)
- [Get Document API — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/get-documents/)
- [Source metadata field — OpenSearch Documentation](https://docs.opensearch.org/latest/mappings/metadata-fields/source/)
- [Refresh index — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/index-apis/refresh/)
- [Flush — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/index-apis/flush/)
- [Force merge — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/index-apis/force-merge/)
- [OpenSearch concepts — OpenSearch Documentation](https://docs.opensearch.org/latest/getting-started/concepts/)
- [Index settings — OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [Update Settings API — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/index-apis/update-settings/)
- [Segment replication — OpenSearch Documentation](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/segment-replication/)
- [Put Mapping API — OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/index-apis/put-mapping/)
- [InternalEngine — OpenSearch source](https://github.com/opensearch-project/OpenSearch/blob/main/server/src/main/java/org/opensearch/index/engine/InternalEngine.java)
- [Transactional outbox pattern — AWS Prescriptive Guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
