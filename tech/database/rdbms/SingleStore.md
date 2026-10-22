---
tags: [database, singlestore, htap, vector-search]
status: done
verified_at: 2026-10-23
category: "Database - RDBMS"
aliases: ["SingleStoreDB", "싱글스토어"]
---

# SingleStore의 분산 SQL과 벡터 검색

SingleStore는 분산 SQL 데이터베이스다. 트랜잭션 처리, 분석과 벡터 검색을 함께 검토할 수 있지만, 기능을 한 엔진에서 제공한다는 사실만으로 워크로드 간 간섭이나 데이터 동기화 문제가 사라지지는 않는다. 아래 기능은 2026-10-23 Self-Managed 9.0 공식 문서 대조 기준이다.

## Aggregator와 leaf

클라이언트는 aggregator에 쿼리를 보낸다. Aggregator가 leaf에 필요한 조회를 보내고 결과를 모으며, leaf는 데이터를 저장하고 연산한다. Sharded table의 행은 `SHARD KEY`를 해시해 파티션에 배치한다.

따라서 연결 처리, 분산 연산과 데이터 분포를 나누어 점검한다(운영 제안). 노드 수만 늘리기 전에 특정 파티션에 부하가 몰리는지, 조인에서 데이터를 많이 옮기는지, 쓰기와 분석이 같은 자원을 경쟁하는지 확인한다.

## Columnstore도 트랜잭션을 처리한다

Rowstore는 데이터를 RAM에 두므로 대량 데이터의 메모리 비용을 함께 고려한다. Universal Storage는 columnstore를 확장해 트랜잭션 워크로드를 지원한다. 공식 문서는 columnstore의 hash index, 행 수준 잠금과 upsert 등을 설명한다.

그러므로 트랜잭션은 rowstore, 분석은 columnstore라는 일대일 대응으로 고정하지 않는다. 실제 갱신 패턴, 선택적 조회와 큰 범위 집계로 저장 형식을 비교한다. 이는 선택 기준이며 특정 저장 형식의 우위를 보장하지 않는다.

## Exact kNN과 ANN

벡터 검색은 정확한 최근접 이웃을 찾는 exact kNN과 인덱스를 이용하는 ANN을 구분한다. ANN은 속도와 정확도 사이에 절충이 있다. 대량 벡터나 높은 동시성에 유용할 수 있지만 항상 exact kNN보다 적합한 것은 아니다.

9.0 문서에서 벡터 인덱스를 사용하는 검색은 `LIMIT`을 필요로 한다. 인덱스와 쿼리의 거리 척도 및 정렬 방향도 일치해야 한다. `DOT_PRODUCT`는 높은 점수가 앞이므로 `DESC`, `EUCLIDEAN_DISTANCE`는 짧은 거리가 앞이므로 `ASC`를 쓴다. `EXPLAIN`에서 실제 인덱스 사용을 확인한다.

선택적인 필터는 ANN 후보에서 반환할 수 있는 행을 줄일 수 있다. 9.0 문서는 후보 수를 늘려 재시도하고 조건에 따라 전체 스캔으로 전환하는 동작을 설명한다. `vector_index_fallback_non_index_scan` 설정으로 폴백을 끌 수 있으므로, 필터가 강한 쿼리는 반환 개수와 지연을 함께 확인한다. 다른 버전과 관리형 서비스에 이 동작을 그대로 가정하지 않는다.

## RAG에 적용할 검증 질문

다음은 제품 기능에서 도출한 설계 점검 기준이다.

1. 원문 변경, 임베딩 생성, 적재와 검색 가능 상태까지의 지연을 각각 측정했는가?
2. 동일한 데이터와 필터에서 exact kNN을 기준으로 ANN의 recall과 지연을 비교했는가?
3. 문서 권한과 업무 필터를 유지한 상태에서도 필요한 개수의 결과를 반환하는가?
4. 분석과 쓰기를 함께 실행할 때 목표 지연과 비용을 만족하는가?

벡터 인덱스는 검색을 가속하는 수단이다. 임베딩의 적합성, 근거 문서의 최신성이나 생성 답변의 정확성을 보증하지 않는다.

## 출처

- [SingleStore 9.0, Clustering](https://docs.singlestore.com/db/v9.0/introduction/faqs/clustering/)
- [SingleStore 9.0, Universal Storage](https://docs.singlestore.com/db/v9.0/create-a-database/columnstore/universal-storage/)
- [SingleStore 9.0, Vector Indexing](https://docs.singlestore.com/db/v9.0/reference/sql-reference/vector-functions/vector-indexing/)

## 관련 문서

- [[OLTP-vs-OLAP|트랜잭션 처리와 분석 처리]]
- [[Sharding|샤딩과 데이터 분포]]
- [[RAG-Retrieval-Engineering|RAG 검색 엔지니어링]]
