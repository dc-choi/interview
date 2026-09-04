---
tags: [database, architecture, polyglot-persistence, mysql, redis, opensearch]
status: done
verified_at: 2026-08-04
category: "데이터&저장소(Data&Storage)"
aliases: ["Polyglot Persistence", "폴리글랏 퍼시스턴스"]
---

# Polyglot Persistence

Polyglot persistence는 한 애플리케이션이나 조직에서 데이터 모델, 사용 방식, 일관성, 지연과 규모 요구에 따라 둘 이상의 저장 기술을 함께 선택하는 방식이다. 데이터를 종류별 제품에 무조건 나누거나 모든 데이터를 한 정본의 projection으로 만드는 전략은 아니다.

서로 독립적인 데이터는 각 소유 컴포넌트의 저장소가 정본일 수 있다. 같은 사실을 여러 저장소에 복제할 때는 어느 저장소가 정본인지, 어떻게 동기화하고 얼마나 오래 stale 상태를 허용할지, 어떻게 재구축할지를 명시한다.

## 저장소는 요구로 고른다

| 요구 | 기본 후보 | 놓치기 쉬운 비용 |
|---|---|---|
| 거래 원자성, FK, UNIQUE와 감사 가능한 변경 | MySQL 같은 RDB | schema migration, scale-up과 hot row 경합 |
| aggregate 단위의 가변 문서 | RDB JSON 또는 document DB | 필드별 제약, cross-document join과 transaction |
| 짧은 지연의 key lookup, counter, TTL | Redis | eviction, persistence 정책, cache invalidation |
| 전문 검색, relevance와 facet | OpenSearch | 비동기 indexing lag, 재색인과 cluster 운영 |
| 분석 scan과 column aggregate | data warehouse/lakehouse | ingestion 지연, 중복 저장과 governance |

상품 옵션이 많다는 이유만으로 document DB가 필수는 아니다. 안정적인 핵심 속성은 relational column, 드문 확장 속성은 JSON, 사용자 정의 희소 속성은 EAV 같은 선택지를 access pattern과 무결성 요구로 비교한다.

저장 기술의 데이터 모델과 조회 의미는 소유 컴포넌트 안에 캡슐화한다. 다른 컴포넌트는 저장소를 직접 읽고 쓰기보다 API나 event 계약으로 접근해야 schema와 배포 결합을 줄일 수 있다.

## 동일한 사실을 여러 저장소에 복제할 때

다음은 하나의 write model에서 용도별 읽기 projection을 만드는 대표 구조다. 각 컴포넌트가 독립적인 사실을 자기 저장소에 보관하는 경우에는 이 경로가 필수가 아니다.

```text
command -> MySQL transaction
              -> outbox 또는 commit log CDC
                     -> broker
                         -> Redis / OpenSearch / analytics projection
```

- 한 consistency boundary의 강한 불변식은 하나의 authoritative write model에서 확정한다.
- Redis와 search index를 읽기 projection으로 쓸 때는 정본에서 다시 만들 수 있게 설계한다.
- raw CDC는 row가 바뀌었다는 사실을 제공하지만 domain intent까지 항상 표현하지 않는다. 업무 event가 필요하면 transactional outbox를 사용한다.
- Kafka나 CDC는 전달 경로다. dual write, 중복, 순서와 schema evolution을 자동으로 없애지 않는다.
- projection에는 source version, event ID와 last applied position을 남겨 중복과 오래된 update를 거부한다.

## 도메인별 경계

### 검색

검색 인덱스가 RDB의 projection이라면 동기 direct dual write를 기본 경로로 두지 않는다. RDB commit 뒤 outbox나 CDC로 index를 갱신하고 lag를 관찰한다. 검색 결과에서 상세 화면으로 넘어갈 때 authoritative 상태를 다시 확인해야 하는 도메인도 있다.

### 장바구니와 session

Redis가 임시 projection인지 장바구니 원본인지 먼저 정한다. Redis는 persistence를 지원하지만 설정과 eviction 정책에 따라 손실 예산이 달라진다. 내구성이 필요한 cart라면 RDB 정본 또는 Redis persistence, backup과 복구 훈련을 둔다.

### 재고와 결제

재고 불변식과 금액 확정은 transactional store에서 책임지는 것이 기본이다. Redis reservation을 사용해도 만료, 중복 요청, DB 반영 실패와 reconciliation을 설계해야 한다. Redis의 빠른 원자 명령이 전체 주문 workflow의 원자성을 뜻하지 않는다.

## 도입 판단

1. 현재 저장소가 만드는 개발 마찰이나 충족하지 못하는 latency, query 또는 scale 요구가 측정됐는가?
2. 새 저장소의 정본 여부와 허용 가능한 stale 범위가 명확한가?
3. 초기 snapshot, incremental update, replay와 full rebuild가 가능한가?
4. schema change를 producer와 모든 consumer에 어떻게 전파하는가?
5. 누락, 중복과 순서 역전을 검출하고 source와 대사할 수 있는가?
6. backup, 보안, 비용, on-call과 장애 모드까지 소유할 팀이 있는가?

기존 시스템에도 전체 저장소 교체보다 독립된 컴포넌트나 파생 projection처럼 경계가 분명한 부분부터 도입할 수 있다. 다만 한 제품의 한계를 피하려고 저장소를 늘리면 consistency boundary와 운영 표면도 함께 늘어난다. 측정된 이득이 그 복잡성을 상쇄할 때만 분리한다.

## 출처

- [Polyglot Persistence — Martin Fowler](https://martinfowler.com/bliki/PolyglotPersistence.html)
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
- [[Microservice-Data-Ownership-and-Queries|마이크로서비스 데이터 소유권과 교차 서비스 조회]]
