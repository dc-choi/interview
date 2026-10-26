---
tags: [database, mongodb, vector, vector-search, hybrid-search, embedding]
status: done
verified_at: 2026-10-26
category: "데이터&저장소(Data&Storage)"
aliases: ["MongoDB Vector Search", "Atlas Vector Search", "MongoDB 벡터 검색", "MongoDB 하이브리드 검색"]
---

# MongoDB Vector Search의 인덱스와 질의 계약

MongoDB Vector Search는 컬렉션 문서에 든 임베딩 필드를 `vectorSearch` 타입 인덱스로 색인하고 aggregation의 `$vectorSearch` 단계로 질의한다. 기본 `vector` 타입은 원본 문서와 같은 컬렉션에 벡터를 두고 같은 aggregation 문법으로 다루지만, 색인은 `mongot` 프로세스가 change stream을 따라 갱신하고 이 필드에는 애플리케이션 작업자나 트리거 함수가 만든 임베딩을 넣는다(Automated Embedding은 아래처럼 내부 데이터베이스에 저장한다). 아래 계약은 2026-10-26 MongoDB 공식 문서를 대조한 기준이며 실제 클러스터에서 측정한 결과는 아니다. ANN, HNSW와 필터 배치의 일반 원리는 [[Vector-Similarity-Search|벡터 유사도 검색]], 전문 검색과 별도 검색엔진의 비교는 [[OpenSearch-vs-RDB-Search#원본이 MongoDB라면 DB 통합 검색을 먼저 비교한다|MongoDB 통합 검색 비교]]에서 다룬다.

## 인덱스 정의

`vectorSearch` 타입 인덱스의 `fields`에 임베딩을 담은 `vector` 필드와 사전 필터에 쓸 `filter` 필드를 함께 정의한다.

```javascript
db.feedback.createSearchIndex(
  "feedback_vector",
  "vectorSearch",
  {
    fields: [
      { type: "vector", path: "embedding", numDimensions: 1024, similarity: "cosine" },
      { type: "filter", path: "tenantId" },
      { type: "filter", path: "createdAt" }
    ]
  }
);
```

| 항목 | 계약 |
|---|---|
| `numDimensions` | 필수이며 8192 이하. 색인과 질의 시점 모두 이 차원을 강제하므로 임베딩 모델의 출력 차원과 맞춘다 |
| `similarity` | `euclidean`, `cosine`, `dotProduct` 중 하나. 모델의 정규화 여부에 맞춰 고른다([[Vector-Similarity-Search#거리 계산 방식\|거리 계산 방식]]) |
| `quantization` | `none`(기본), `scalar`(1바이트 정수), `binary`(1비트, `numDimensions`가 8의 배수여야 함). 정밀도가 중요하면 `binary` 대신 `none`이나 `scalar`를 쓰라고 안내한다 |
| `indexingMethod` | `hnsw`(기본) 또는 `flat`. HNSW의 `maxEdges`는 16~64(기본 16), `numEdgeCandidates`는 100~3200(기본 100) |
| 벡터 값 | BSON double 배열 또는 BinData vector(`float32`, `int8`, `int1`) |
| `filter` 필드 값 | boolean, date, objectId, 숫자, 문자열, UUID와 그 배열 |

`flat`은 그래프를 만들지 않고 전수 탐색하며 공식 문서 기준 recall 100%를 보장한다. 그래프를 유지하지 않아 CPU와 메모리 부담이 적지만 질의 시간이 데이터 양에 비례해 늘어난다. 공식 문서는 필터를 통과하는 문서가 5% 미만인 선택적 사전 필터(예: 멀티테넌트의 `tenantId`), 사용자가 자기 데이터만 검색하는 애플리케이션, 높은 recall이 필수인 중소 규모 데이터에 `flat`을 권하며, `hnswOptions`와 함께 쓸 수 없다.

- 컬렉션을 바꾼 직후에는 최신 데이터가 질의에 보이지 않을 수 있다. `mongot`이 change stream을 따라 저장한 사본을 갱신하므로 인덱스는 최종 일관성을 가진다. 쓰기 직후 결과를 보여야 하는 화면은 원본 조회 경로로 분리한다(설계 제안).
- Atlas UI의 인덱스 상태는 구축 중 `Pending`, 완료 뒤 `Ready`로 표시된다. 코드로 만들었다면 `$listSearchIndexes` 단계나 드라이버의 `listSearchIndexes()`(mongosh는 `db.collection.getSearchIndexes()`) 결과에서 `queryable`이 true가 된 뒤 질의한다. 정의를 고친 뒤에는 이전 정의로 `queryable`이 이미 true일 수 있으므로 새 정의 적용은 `status`가 `READY`인지로 확인한다.
- 정의를 고치면 인덱스를 다시 구축하며, 그동안 이전 정의로 질의가 계속되고 구축이 끝나면 자동으로 교체된다.
- Free 클러스터는 `search`와 `vectorSearch` 타입 인덱스를 합쳐 3개, Flex 클러스터는 10개까지 만들 수 있다. 인덱스가 많으면 기본 클러스터의 부하가 커지고 M10 같은 작은 티어는 성능 저하나 메모리 부족 오류를 겪을 수 있다고 안내한다.

## 질의와 사전 필터

```javascript
db.feedback.aggregate([
  {
    $vectorSearch: {
      index: "feedback_vector",
      path: "embedding",
      queryVector: queryEmbedding, // 인덱스와 같은 모델, 같은 차원
      numCandidates: 200,
      limit: 10,
      filter: { $and: [ { tenantId: "t-1" }, { createdAt: { $gte: ISODate("2026-01-01") } } ] }
    }
  },
  { $project: { text: 1, score: { $meta: "vectorSearchScore" } } }
]);
```

- `$vectorSearch`는 파이프라인의 첫 단계여야 한다. view 정의, `$lookup` 하위 파이프라인과 `$facet` 안에서는 쓸 수 없고, 한 단계에서 벡터 필드 하나만 질의한다.
- ANN에는 `numCandidates`가 필수다. `limit` 이상 10000 이하로 주며, 공식 문서는 ENN과의 결과 차이를 줄이도록 `limit`의 20배 이상을 권한다. `exact: true`면 ENN이고 `numCandidates`를 생략한다.
- ENN은 ANN 결과의 recall을 정답 기준으로 잴 때, 1만 개 미만 문서를 후보 수 튜닝 없이 질의할 때, 조건에 맞는 데이터가 5% 미만인 선택적 사전 필터를 걸 때 권한다. 자동 양자화를 켠 인덱스에서도 ENN은 원래 정밀도의 벡터만 쓴다.
- `filter`는 사전 필터다. 인덱스에 `filter` 타입으로 넣은 필드만 쓸 수 있고 연산자는 `$eq`, `$ne`, `$gt`, `$lt`, `$gte`, `$lte`, `$in`, `$nin`, `$exists`, `$not`, `$nor`, `$and`, `$or`로 한정된다. 필터를 건 질의는 대체로 필터 없는 같은 질의보다 느리다. 퍼지, 구문, 위치 조건으로 먼저 거르려면 `$search` 안의 `vectorSearch` 연산자를 쓰라고 안내한다. 이 연산자는 `vectorSearch` 타입이 아니라 `search` 타입 인덱스로 색인한 필드에 쓰므로 인덱스가 하나 더 필요하다.
- 점수는 `{ $meta: "vectorSearchScore" }`로 읽는다. 인덱스의 `similarity`로 계산한 값을 0~1 범위로 주며 사전 필터는 점수를 바꾸지 않는다. 이 점수를 관련 확률로 읽지 않는 이유는 [[Vector-Similarity-Search#높은 점수와 관련성 판정은 구분한다|점수와 관련성 판정]]을 따른다.

## 하이브리드 결합

`$rankFusion`과 `$scoreFusion`은 같은 컬렉션에 대한 입력 파이프라인을 각각 실행한 뒤 중복 문서를 하나로 합쳐 최종 결과를 만든다. 순위 결합과 점수 결합의 일반 비교와 평가 설계는 [[OpenSearch-Hybrid-Search-RRF-Filtering|RRF와 filter 배치]], [[OpenSearch-Hybrid-Search-Evaluation-Operations|하이브리드 평가]]를 따른다.

| 단계 | 결합 방식 | 버전 |
|---|---|---|
| `$rankFusion` | 입력별 순위로 RRF를 계산한다. 문서가 나타난 입력마다 `weight / (60 + rank)`를 더하며, 60은 사용자가 바꿀 수 없는 상수다. 가중치 기본값은 1이다 | MongoDB 8.0 이상 |
| `$scoreFusion` | 입력별 점수를 `none`(정규화 없음), `sigmoid`, `minMaxScaler`로 처리하고 가중치(기본 1)를 곱한 뒤 평균(`avg`, 기본)이나 사용자 식(`expression`)으로 합친다. `expression`은 `weights`와 함께 쓸 수 없다 | MongoDB 8.3 이상 |

```javascript
db.feedback.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          vector: [
            { $vectorSearch: { index: "feedback_vector", path: "embedding",
                               queryVector: queryEmbedding, numCandidates: 400, limit: 20 } }
          ],
          lexical: [
            { $search: { index: "feedback_text", text: { query: "환불 지연", path: "text" } } },
            { $limit: 20 }
          ]
        }
      },
      combination: { weights: { vector: 1, lexical: 1 } },
      scoreDetails: true
    }
  },
  { $limit: 10 },
  { $project: { text: 1, scoreDetails: { $meta: "scoreDetails" } } }
]);
```

- 위 예시는 단일 테넌트를 가정한다. 멀티테넌트 컬렉션이면 두 분기 모두에 같은 테넌트 조건을 걸어 검색 경계에서 강제한다(설계 점검).
- 입력 파이프라인은 문서를 가공하지 않아야 한다. `$rankFusion` 레퍼런스 기준으로 입력에는 `$match`, `$search`, `$vectorSearch`, `$sample`, `$geoNear`, `$sort`, `$skip`, `$limit`만 쓸 수 있고, `$search`, `$vectorSearch`, `$geoNear`로 시작하거나 명시적 `$sort`로 순위를 가져야 한다. `$scoreFusion`의 입력 단계 조건은 이와 다르므로 그 레퍼런스로 확인한다. 필드 가공은 융합 단계 뒤에 둔다.
- `$scoreFusion`의 입력이 점수를 내지 않으면(거리만 주는 `$geoNear` 등) `$score` 단계를 더한다.
- `scoreDetails: true`면 입력별 순위, 가중치와 점수를 메타데이터로 볼 수 있지만 출력 형식은 보장하지 않는다.
- 공식 문서는 모든 질의에 같은 가중치를 두기보다 질의마다 lexical과 vector 가중치를 정하라고 권한다. 하위 파이프라인들이 비슷한 결과를 내게 하려면 파이프라인별 결과 수를 늘려 본다.
- 한국어 키워드 분기는 `$search` 인덱스의 analyzer 선택과 함께 같은 판정 세트로 평가한다(설계 점검, [[OpenSearch-vs-RDB-Search#원본이 MongoDB라면 DB 통합 검색을 먼저 비교한다|MongoDB Search의 한국어 analyzer]]).

## 임베딩을 만드는 위치

기본 `vector` 필드에는 임베딩을 직접 넣어야 하므로 생성 경로를 따로 정한다.

| 방식 | 동작 | 확인할 점 |
|---|---|---|
| 애플리케이션 작업자 | 쓰기 이벤트를 큐로 넘기고 작업자가 임베딩 API를 호출해 문서에 벡터를 기록한다 | 재전달과 멱등 처리, 검색 가능 시점 기록([[RAG-Retrieval-Engineering#비동기 수집의 접수와 검색 준비를 나눈다\|비동기 수집]]) |
| Atlas Database Trigger | 컬렉션의 insert, update, replace, delete 변경 이벤트로 Atlas Function을 실행하거나 AWS EventBridge로 이벤트를 넘긴다 | 아래 트리거 계약 |
| Automated Embedding(`autoEmbed` 타입 필드) | 색인 시점에는 지정한 텍스트 필드를, 질의 시점에는 `$vectorSearch`의 `query.text`를 Voyage AI 모델로 임베딩한다 | 2026-10-26 기준 Preview이며 공식 문서가 운영 환경에 쓰지 말라고 명시한다 |

트리거 계약은 다음과 같다(2026-10-26 문서 기준).

- 각 이벤트를 최소 한 번 처리하며, 일부 장애 뒤에는 같은 이벤트가 다시 올 수 있다. 임베딩 쓰기는 원문 hash와 모델 version을 비교하는 멱등 처리로 만든다(설계 제안, [[Vector-Similarity-Search#임베딩 공간은 versioned contract다|임베딩 공간 계약]]).
- 순서 보장을 켜면 이벤트를 하나씩 차례로 처리하고, 끄면 기본 최대 10,000개까지 병렬로 처리하되 실행 순서를 보장하지 않는다.
- Database Trigger 문서 기준으로 Flex 클러스터에는 Database Trigger를 정의할 수 없다. resume token이 oplog에서 사라져 트리거가 중단되면 token 없이 재시작하거나 Auto-Resume으로 재개하므로 중단된 동안의 이벤트는 처리되지 않는다. token이 남아 있으면 그 token으로 재시작한다. match expression의 `$match`가 resume token을 담은 oplog 항목을 걸러 내도 트리거가 재개하지 못할 수 있으므로, 어느 경우든 임베딩 누락을 찾는 대사 작업을 둔다(설계 제안).
- 함수가 같은 컬렉션에 임베딩을 다시 쓰면 그 쓰기도 대체로 update 이벤트가 된다. 공식 문서는 트리거 이벤트량이 측정된 성능 문제가 되기 전까지 모든 이벤트를 받아 함수 안에서 처리하라고 권하므로, 기본은 함수 안에서 원문 hash와 모델 version을 비교해 자기 쓰기를 건너뛴다. 나중에 match expression을 더하면 insert와 replace 이벤트에는 `updateDescription`이 없으므로 `operationType` 조건과 함께 쓴다(설계 점검).
- App Services의 Data API, HTTPS Endpoints, Device Sync, GraphQL, Static Hosting과 SDK는 2025-09-30까지 지원이 끝났고, Database Trigger와 트리거에서 쓰는 Function은 계속 제공된다. Data API나 HTTPS Endpoints에 기댄 이전 자료의 구성은 현재 선택지로 옮기지 않는다.

Automated Embedding은 인덱스를 만들 때 색인할 텍스트 필드가 있는 기존 문서를 모두 임베딩하고, 이후 change stream으로 삽입, 색인 필드 수정과 삭제를 반영한다. 생성한 임베딩은 같은 클러스터의 내부 데이터베이스 `__mdb_internal_search`에 저장되며 이 네임스페이스는 직접 수정하지 않는다. MongoDB가 호스팅하는 추론은 Google Cloud 미국 리전에서 실행되고, 다중 테넌트 rate limit을 넘으면 문서 임베딩은 대기열에서 늦게 처리되며 질의는 한도 초과 오류를 받는다. 데이터 위치 요건이 있으면 이 경로부터 확인한다(설계 점검).

## 운영 DB 안의 벡터 검색을 고를 때

다음은 위 계약을 도입 판단에 적용한 설계 제안이다.

- 원본이 이미 MongoDB면 별도 벡터 저장소로 보내는 동기화 파이프라인을 직접 만들지 않고, 메타데이터 사전 필터, 벡터 검색과 키워드 결합을 한 aggregation에서 처리할 수 있다. 이 문서처럼 `$search`로 키워드 분기를 두면 MongoDB 8.0 이상(`$scoreFusion`은 8.3 이상)과 `$search` 인덱스가 필요하다.
- 그래도 색인의 최종 일관성, 임베딩 생성과 재생성 경로, 티어별 인덱스 수 제한과 `mongot`의 자원 사용은 남는다. 검색 자원을 DB 노드와 공유할지 전용 Search Node로 나눌지는 [[OpenSearch-vs-RDB-Search#원본이 MongoDB라면 DB 통합 검색을 먼저 비교한다|MongoDB 통합 검색 비교]]를 따른다.
- 원본이 RDB면 같은 판단을 [[pgvector|pgvector]]와 견주고, 여러 저장소의 데이터를 함께 검색해야 하면 정본과 동기화 계약을 [[Polyglot-Persistence|Polyglot Persistence]]에서 다시 따진다.

## 적용 전 확인

- [ ] 문서와 질의가 같은 임베딩 모델, 차원과 `similarity`를 쓰고 모델 version을 문서에 함께 기록했는가
- [ ] 필터 선택도별 대표 질의로 `hnsw`와 `flat`(또는 `exact: true`)의 recall과 지연을 비교했는가
- [ ] 쓰기 뒤 검색에 보이기까지의 지연을 측정하고 쓰기 직후 화면을 원본 조회로 분리했는가
- [ ] `$rankFusion`, `$scoreFusion`과 가중치를 같은 판정 세트로 비교했는가
- [ ] 클러스터 티어의 인덱스 수 제한과 Database Trigger 사용 가능 여부(Flex 불가)를 확인했는가

## 출처

- [MongoDB Docs, Run Vector Search ANN and ENN Queries](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage/)
- [MongoDB Docs, How to Index Fields for Vector Search](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type/)
- [MongoDB Docs, How to Perform Hybrid Search](https://www.mongodb.com/docs/vector-search/hybrid-search/hybrid-search-overview/)
- [MongoDB Docs, $rankFusion (aggregation)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion/)
- [MongoDB Docs, $scoreFusion (aggregation)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/scorefusion/)
- [MongoDB Docs, How Automated Embedding Works](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/overview/)
- [MongoDB Docs, Atlas Triggers](https://www.mongodb.com/docs/atlas/atlas-ui/triggers/)
- [MongoDB Docs, Database Triggers](https://www.mongodb.com/docs/atlas/atlas-ui/triggers/database-triggers/)
- [MongoDB Docs, Atlas App Services Admin API 3.0](https://www.mongodb.com/docs/api/doc/atlas-app-services-admin-api-v3/) — 상단의 App Services EOL 안내
- [MongoDB Docs, Service Deprecations](https://www.mongodb.com/docs/atlas/app-services/deprecation/) — 트리거 안에서 계속 쓸 수 있는 Function
- [MongoDB Docs, $listSearchIndexes (aggregation stage)](https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSearchIndexes/)
- [스마트한 미래, AWS와 함께하는 MongoDB Atlas 기반의 AI 애플리케이션 혁명 — Amazon Web Services Korea](https://www.youtube.com/watch?v=tW9myDmZ9pw) — 2024-09-13 공개. 임베딩 생성 경로 비교의 계기로만 썼고 본문 사실은 위 공식 문서로 대조

## 관련 문서

- [[vector|벡터 검색 폴더 인덱스]]
- [[Vector-Similarity-Search|벡터 유사도 검색]] — exact와 ANN, 필터 배치와 점수 해석
- [[OpenSearch-vs-RDB-Search|RDB vs 검색엔진 도입 판단]] — MongoDB Search와 `mongot` 동기화, 한국어 analyzer
- [[MongoDB-Schema-Design|MongoDB 스키마 설계]] — 문서 모델과 일반 인덱스
- [[pgvector|pgvector]] — PostgreSQL 안의 벡터 검색
- [[OpenSearch-Hybrid-Search|OpenSearch 하이브리드 검색]] — 점수 결합과 평가
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]] — 비동기 수집과 하이브리드 검색
- [[Bedrock-Knowledge-Base-Retrieval|Bedrock 지식 베이스 조회]] — MongoDB Atlas를 벡터 저장소로 쓸 때의 하이브리드 조건
