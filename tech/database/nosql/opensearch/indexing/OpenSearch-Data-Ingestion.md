---
tags: [database, search, opensearch, ingestion, bulk, ndjson]
status: done
verified_at: 2026-08-08
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Data Ingestion", "OpenSearch Bulk Ingestion", "OpenSearch 데이터 수집"]
---

# OpenSearch 데이터 수집과 Bulk 색인

데이터 수집은 원본 데이터를 OpenSearch document로 변환해 index에 넣는 경로다. 한 건을 보내는 API부터 지속적인 stream pipeline까지 선택지가 다르며, 처리량뿐 아니라 변환 위치, 재처리와 실패 복구 조건으로 고른다.

## 수집 경로 선택

| 경로 | 적합한 상황 | 핵심 경계 |
|---|---|---|
| Index Document API | 실습, 관리 도구, 낮은 빈도의 단건 쓰기 | 요청마다 network와 coordinating overhead 발생 |
| Bulk API 또는 client bulk helper | Application batch, backfill, 대량 적재 | NDJSON 계약, item별 성공 판정과 재시도 필요 |
| OpenSearch ingest pipeline | 색인 직전의 가벼운 rename, convert, date, grok 처리 | OpenSearch node CPU를 검색과 공유 |
| Data Prepper와 외부 수집 도구 | 지속 stream, source 연결, buffer와 복합 변환 | 별도 component의 확장, 호환성, DLQ 운영 필요 |
| CDC 또는 outbox consumer | 운영 DB에서 검색 read model 유지 | 순서, 멱등성, 삭제와 원본 대조가 필요 |

하나만 고르는 구조는 아니다. 일반적인 지속 수집은 다음처럼 조합된다.

```text
Source
  -> collector 또는 CDC consumer
  -> buffer와 processor
  -> Bulk API
  -> 선택 ingest pipeline
  -> index와 shard
```

Data Prepper pipeline은 `source`와 하나 이상의 `sink`가 필수이고 `buffer`와 `processor`를 선택적으로 둔다. OpenSearch ingest pipeline은 cluster 안에서 document별 전처리를 실행하므로 무거운 ETL을 모두 옮기지 않는다.

## 최소 안전 계약

1. 운영 index는 dynamic mapping에 맡기지 않고 mapping과 setting을 먼저 만든다.
2. 재처리 가능한 외부 ID를 `_id`로 사용하고 create, update, delete의 멱등성을 정한다.
3. 여러 operation은 bounded batch로 묶고 동시 요청 수도 제한한다.
4. HTTP status뿐 아니라 Bulk 응답의 `errors`와 모든 `items`를 확인한다.
5. 일시 실패만 backoff와 jitter로 재시도하고 결정적 오류는 원인을 고친다.
6. 원본 replay와 reconciliation 없이 OpenSearch index를 유일한 원본으로 두지 않는다.

Operation이 수락된 뒤 translog, refresh와 segment로 이어지는 과정은 [[OpenSearch-Indexing-Internals|색인 내부]], 지연과 불일치 감지는 [[OpenSearch-Indexing-Pipeline-Reliability|파이프라인 신뢰성]]에서 다룬다.

## Bulk API 요청 계약

새 bulk 요청에는 `POST`를 사용한다. Target index는 path에 한 번 지정하거나 action metadata의 `_index`에 넣는다.

```http
POST /_bulk
POST /{index}/_bulk
```

| Action | 두 번째 줄 | 같은 `_id`가 있을 때 |
|---|---|---|
| `create` | 전체 document | `status: 409` item 실패 |
| `index` | 전체 document | 기존 document 전체 교체 |
| `update` | `doc`, script 또는 upsert body | 기존 document를 변경, 없으면 기본적으로 item 실패 |
| `delete` | 없음 | 삭제하거나 `not_found` 반환 |

Body는 한 줄의 action metadata와 선택적인 한 줄의 source를 반복하는 NDJSON이다.

```ndjson
{ "index": { "_id": "p1" } }
{ "title": "무선 키보드", "category": "peripheral", "price": 49000 }
{ "index": { "_id": "p2" } }
{ "title": "유선 마우스", "category": "peripheral", "price": 19000 }
```

- 각 JSON object는 한 줄이어야 한다.
- Source가 필요한 action은 바로 다음 줄에 source를 둔다. `delete`는 두 번째 줄이 없다.
- 파일의 마지막 action 또는 source 뒤에도 newline이 있어야 한다.
- `Content-Type`은 `application/x-ndjson`을 사용한다.
- File upload는 newline을 보존하는 `--data-binary`를 사용한다. Curl의 `-d`는 이 용도에 쓰지 않는다.
- Bulk `update` action에는 user-defined ingest pipeline이 실행되지 않으므로 pipeline이 필수인 흐름은 `index`, `create` 또는 검증한 upsert 방식으로 설계한다.

## 로컬 Bulk 실습

### 1. Mapping을 먼저 생성

Dev Tools에서 실습 index를 최초 한 번 만든다.

```http
PUT /products-bulk-lab
{
  "mappings": {
    "properties": {
      "title":    { "type": "text" },
      "category": { "type": "keyword" },
      "price":    { "type": "integer" }
    }
  }
}
```

### 2. NDJSON 파일 준비

Index가 이미 있다면 mapping을 확인하고 이 단계부터 다시 시작한다. 앞의 네 줄을 `products.ndjson`으로 저장하고 마지막 newline을 확인한다. `index`와 고정 `_id`를 사용하므로 Bulk 파일을 다시 보내도 중복 document가 늘지 않고 같은 ID의 전체 상태를 교체한다.

### 3. File upload

Security plugin을 끈 [[OpenSearch-Local-Quickstart|로컬 환경]]에서는 다음처럼 보낸다.

```bash
curl -sS \
  -H 'Content-Type: application/x-ndjson' \
  -X POST \
  'http://127.0.0.1:9200/products-bulk-lab/_bulk?refresh=wait_for' \
  --data-binary '@products.ndjson'
```

Demo security 구성은 HTTPS와 `-u admin`을 사용하고 password는 prompt에서 입력한다. `-k`로 certificate 검증을 끄는 것은 local demo에만 한정한다. `refresh=wait_for`도 실습 직후 검색 확인을 위한 선택이며 고처리량의 모든 batch에 습관적으로 붙이지 않는다.

### 4. 응답과 검색 확인

```http
GET /products-bulk-lab/_search
{
  "query": { "match_all": {} }
}
```

통과 조건은 검색 결과 수만이 아니다. Bulk 응답의 최상위 `errors`가 `false`이고 각 item의 status와 result가 의도와 맞는지 먼저 확인한다.

## 부분 성공과 재시도

Bulk action은 서로 독립적으로 처리된다. 요청 전체가 HTTP 200이어도 일부 item은 실패할 수 있다.

- 성공 item은 제외하고 실패 item만 원래 action과 source의 쌍으로 복원해 재시도한다.
- 429, 일시적인 5xx, shard unavailable, timeout과 network 오류는 제한된 backoff 대상이다.
- Mapping, parsing, validation과 authorization 오류는 같은 payload를 반복하지 않는다.
- `create`의 409와 version conflict는 단순 network 재시도와 구분해 최신 상태와 의도를 다시 판단한다.
- Timeout 뒤 응답을 못 받았더라도 일부 item은 이미 반영됐을 수 있다. 고정 `_id`와 version guard가 재시도 의미를 결정한다.
- Client bulk helper를 사용해도 batch 분할, retry 대상과 최대 시도 횟수, DLQ 동작을 확인한다.

## 대량 적재 구간의 setting 조정

- 보편적인 최적 batch 크기는 없다. Document byte 크기, mapping 비용, node CPU와 heap, network, 목표 latency로 처리량이 더 늘지 않는 지점을 찾는다.
- Batch 크기와 동시성은 별도 변수다. 둘을 함께 올리지 않고 한 번에 하나씩 측정한다.
- 대량 적재에서 매 batch `refresh=true`를 사용하지 않는다. 검색 요청이 없는 색인 전용 초기 backfill은 `refresh_interval`을 `-1`로 두었다가 완료 후 기존 값으로 되돌릴 수 있다. `null`은 default 복원이다. Refresh를 끈 동안에는 `refresh=wait_for`를 붙이지 않고 기본 `false`로 적재하며, 완료 후 interval 복원과 명시적 refresh 또는 다음 정기 refresh로 검색 가시성을 연다.
- 아직 검색 traffic이 없는 초기 적재라면 `number_of_replicas`를 0으로 낮췄다가 완료 후 원래 수로 복원할 수 있다.
- 두 setting은 검색 가시성과 장애 내성을 일시적으로 포기하므로 운영 읽기와 증분 쓰기를 받는 index에는 적용하지 않는다. 복원과 cluster health 확인까지가 절차다.
- 429는 속도를 줄이라는 신호다. Consumer pause, batch 축소, exponential backoff와 jitter를 적용하고 indexing latency와 freshness SLO를 함께 본다.
- Dataset 전체를 client memory에 모으지 않고 bounded buffer나 bulk helper로 흘려보낸다.

## Ingest pipeline과 Data Prepper

Ingest pipeline은 `set`, `rename`, `remove`, `convert`, `date`, `grok`, `dissect`, `json`, `script`, `drop` 같은 processor를 색인 전에 순서대로 실행한다.

1. 대표 document로 `_simulate?verbose=true`를 실행한다.
2. 각 processor에 식별 가능한 `tag`를 붙인다.
3. 실패를 조용히 무시하지 않고 `on_failure`에 원인과 원문 식별자를 남긴다.
4. 선택 pipeline은 요청의 `pipeline`, 기본 pipeline은 `index.default_pipeline`을 사용한다.
5. `index`, `create`와 새 document를 만드는 upsert 경로의 필수 정책은 `index.final_pipeline`을 검토한다. 기존 document를 바꾸는 Bulk `update`에는 user-defined pipeline이 실행되지 않는다.

Ingest pipeline은 OpenSearch node CPU를 사용한다. Source 연결, buffer, 여러 sink와 무거운 변환이 필요하면 별도 component인 Data Prepper 또는 검증된 외부 도구로 격리한다. Data Prepper는 `source -> buffer -> processor -> sink` pipeline을 구성하고 한 instance에서 여러 pipeline을 실행할 수 있다. 기본 `bounded_blocking` buffer는 memory 기반이므로 장애 시 내구성은 source replay, end-to-end acknowledgment와 durable buffer로 설계한다. OpenSearch sink의 `max_retries`를 명시하고 DLQ와 실패 경보를 함께 구성한다.

외부 agent나 plugin은 이름만 보고 호환된다고 가정하지 않는다. OpenSearch engine, collector와 output plugin version을 고정하고 공식 compatibility matrix를 배포 전에 확인한다.

## 통과 기준

- [ ] `create`, `index`, `update`, `delete` action의 두 번째 줄과 중복 ID 동작을 설명한다.
- [ ] NDJSON 마지막 newline, `application/x-ndjson`, `--data-binary`가 필요한 이유를 설명한다.
- [ ] HTTP 200인 Bulk 응답에서도 item 실패를 찾아 실패 item만 재시도한다.
- [ ] Direct API, ingest pipeline, Data Prepper와 CDC consumer의 역할 경계를 설명한다.

## 관련 문서

- [[OpenSearch-Basics|REST API 기초]], [[OpenSearch-JavaScript-Client|JavaScript client]]
- [[OpenSearch-Indexing-Internals|수락 이후 translog, refresh와 segment]]
- [[OpenSearch-Indexing-Pipeline-Reliability|DLQ, reconciliation과 backpressure]]
- [[OpenSearch-Index-Lifecycle|Reindex와 backfill 전환]]
- [[OpenSearch-Architecture|OpenSearch와 Data Prepper 구성]]

## 출처

- [OpenSearch Documentation, Ingest your data into OpenSearch](https://docs.opensearch.org/latest/getting-started/ingest-data/)
- [OpenSearch Documentation, Bulk API](https://docs.opensearch.org/latest/api-reference/document-apis/bulk/)
- [OpenSearch Documentation, OpenSearch Data Prepper](https://docs.opensearch.org/latest/data-prepper/)
- [OpenSearch Documentation, Data Prepper buffers](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/buffers/buffers/)
- [OpenSearch Documentation, OpenSearch sink](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/)
- [OpenSearch Documentation, Ingest pipelines](https://docs.opensearch.org/latest/ingest-pipelines/)
- [OpenSearch Documentation, OpenSearch tools](https://docs.opensearch.org/latest/tools/)
- [OpenSearch Documentation, Tuning for indexing speed](https://docs.opensearch.org/latest/tuning-your-cluster/performance/)
