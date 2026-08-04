---
tags: [database, architecture, polyglot-persistence, mysql, redis, opensearch]
status: done
verified_at: 2026-08-04
category: "데이터&저장소(Data&Storage)"
aliases: ["Polyglot Persistence", "폴리글랏 퍼시스턴스"]
---

# Polyglot Persistence

Polyglot persistence는 데이터를 종류별 제품에 무조건 나누는 전략이 아니다. 한 도메인에서 서로 다른 access pattern과 보장 수준을 가진 상태를 적합한 저장소에 두되, 어떤 저장소가 정본인지와 projection을 어떻게 재구축하는지를 명시하는 전략이다.

## 저장소는 요구로 고른다

| 요구 | 기본 후보 | 놓치기 쉬운 비용 |
|---|---|---|
| 거래 원자성, FK, UNIQUE와 감사 가능한 변경 | MySQL 같은 RDB | schema migration, scale-up과 hot row 경합 |
| aggregate 단위의 가변 문서 | RDB JSON 또는 document DB | 필드별 제약, cross-document join과 transaction |
| 짧은 지연의 key lookup, counter, TTL | Redis | eviction, persistence 정책, cache invalidation |
| 전문 검색, relevance와 facet | OpenSearch | 비동기 indexing lag, 재색인과 cluster 운영 |
| 분석 scan과 column aggregate | data warehouse/lakehouse | ingestion 지연, 중복 저장과 governance |

상품 옵션이 많다는 이유만으로 document DB가 필수는 아니다. 안정적인 핵심 속성은 relational column, 드문 확장 속성은 JSON, 사용자 정의 희소 속성은 EAV 같은 선택지를 access pattern과 무결성 요구로 비교한다.

## 정본과 projection을 구분한다

```text
command -> MySQL transaction
              -> outbox 또는 commit log CDC
                     -> broker
                         -> Redis / OpenSearch / analytics projection
```

- 거래 불변식을 한 authoritative transaction 안에서 확정한다.
- Redis와 search index는 필요하면 정본에서 다시 만들 수 있는 projection으로 설계한다.
- raw CDC는 row가 바뀌었다는 사실을 제공하지만 domain intent까지 항상 표현하지 않는다. 업무 event가 필요하면 transactional outbox를 사용한다.
- Kafka나 CDC는 전달 경로다. dual write, 중복, 순서와 schema evolution을 자동으로 없애지 않는다.
- projection에는 source version, event ID와 last applied position을 남겨 중복과 오래된 update를 거부한다.

## 도메인별 경계

### 검색

RDB와 OpenSearch에 request 경로에서 동시에 쓰지 않는다. RDB commit 뒤 outbox나 CDC로 index를 갱신하고 lag를 관찰한다. 검색 결과에서 상세 화면으로 넘어갈 때 authoritative 상태를 다시 확인해야 하는 도메인도 있다.

### 장바구니와 session

Redis가 임시 projection인지 장바구니 원본인지 먼저 정한다. Redis는 persistence를 지원하지만 설정과 eviction 정책에 따라 손실 예산이 달라진다. 내구성이 필요한 cart라면 RDB 정본 또는 Redis persistence, backup과 복구 훈련을 둔다.

### 재고와 결제

재고 불변식과 금액 확정은 transactional store에서 책임지는 것이 기본이다. Redis reservation을 사용해도 만료, 중복 요청, DB 반영 실패와 reconciliation을 설계해야 한다. Redis의 빠른 원자 명령이 전체 주문 workflow의 원자성을 뜻하지 않는다.

## 도입 판단

1. 현재 저장소로 충족하지 못하는 latency, query 또는 scale 요구가 측정됐는가?
2. 새 저장소의 정본 여부와 허용 가능한 stale 범위가 명확한가?
3. 초기 snapshot, incremental update, replay와 full rebuild가 가능한가?
4. schema change를 producer와 모든 consumer에 어떻게 전파하는가?
5. 누락, 중복과 순서 역전을 검출하고 source와 대사할 수 있는가?
6. backup, 보안, 비용, on-call과 장애 모드까지 소유할 팀이 있는가?

한 제품의 한계를 피하려고 저장소를 늘리면 consistency boundary와 운영 표면도 함께 늘어난다. 측정된 이득이 그 복잡성을 상쇄할 때만 분리한다.

## 출처

- [MySQL 8.4 Reference Manual, JSON Data Type](https://dev.mysql.com/doc/refman/8.4/en/json.html)
- [Redis Documentation, Persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [Debezium Documentation, MySQL Connector](https://debezium.io/documentation/reference/stable/connectors/mysql.html)
- [인프런, Hong, Polyglot Persistence](https://www.inflearn.com/courses/lecture?courseId=338473&unitId=338565)

## 관련 문서

- [[Flexible-Attribute-Modeling|가변 속성 모델링]]
- [[Redis-Cart-Checkout-Consistency|Redis 장바구니와 주문 정합성]]
- [[OpenSearch-vs-RDB-Search|OpenSearch vs RDB 검색]]
- [[Transactional-Outbox|Transactional Outbox]]
- [[CDC-Debezium-Concept|CDC와 Debezium 개념]]
