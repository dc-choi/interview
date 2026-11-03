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
| 임베딩 거리 기반 유사도 검색 | 기존 PostgreSQL의 pgvector 또는 별도 벡터 저장소 | exact 대비 ANN recall, 필터 후 결과 수, 색인 갱신과 재임베딩 |
| 시간별 요청 수, 오류와 지연 관측 | Prometheus 같은 모니터링 시스템 | 수집 누락, 보존 범위, 업무 원장과 다른 정확성 기준 |

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

### 저장소마다 정확성의 기준을 정한다

부분 검증(2026-11-04): pgvector 공식 README와 Prometheus Overview를 대조했다. pgvector는 기본적으로 exact nearest-neighbor search를 제공하고, 근사 인덱스는 일부 recall을 속도와 교환한다. 근사 인덱스 경로에서 필터를 적용하면 요청한 수보다 적은 결과가 나올 수 있다. 따라서 별도 벡터 저장소를 도입하기 전에 기존 PostgreSQL에서 같은 질의의 exact 결과와 ANN 결과, 필터 후 결과 수와 지연을 비교한다(설계 제안). 세부 조정은 [[pgvector-Query-Optimization|pgvector 쿼리 최적화]]에서 다룬다.

이 비교의 recall은 같은 벡터 공간에서 가까운 이웃을 얼마나 찾았는지다. 사용자가 원하는 상품을 찾았는지는 별도의 평가 문제이므로, 저장소 교체로 의미 적합성까지 해결됐다고 판단하지 않는다(설계 해석). 거래용 DB와 검색을 함께 쓸 때는 검색 지연뿐 아니라 색인 갱신이 거래 쓰기에 주는 영향도 측정한다.

Prometheus는 수치 시계열의 모니터링에 적합하지만, 수집 데이터가 충분히 상세하고 완전하지 않을 수 있어 요청별 청구처럼 100% 정확성이 필요한 용도에는 적합하지 않다. 설계 예로 요청 수 그래프는 장애 탐지에 쓰고, 고객 청구 금액은 별도의 업무 기록으로 계산한다. 이는 모든 시계열 저장소의 한계가 아니라 Prometheus의 용도 경계다. 실제 부하 시험과 청구 대사는 수행하지 않았으며 기존 문서 전체의 검증일은 유지한다.

### 예제: 전체 순위와 조건별 순위

부분 검증(2026-10-14): Redis `ZRANGE`와 AWS 캐시 유효성 문서를 대조했다. `ZRANGE`는 sorted set의 순위, 점수 또는 사전식 범위로 멤버를 조회하며 `REV`로 역순 조회할 수 있다. 이 명령 자체가 회원의 지역, 등급 같은 임의 속성을 SQL 조건처럼 평가하는 것은 아니다.

설계 예시: 단일 점수의 전체 순위는 sorted set을 후보로 둔다. 지역과 등급 조합별 순위가 필요하면 조건별 sorted set을 유지하는 방식과 RDB에서 조건을 적용해 계산한 결과를 Redis에 캐시하는 방식을 비교한다. 전자는 조건 조합의 수와 갱신 비용, 후자는 쿼리 비용과 캐시된 순위의 지연을 확인한다. 복합 조건이 있다는 이유만으로 Redis 전체에서 구현이 불가능하다고 단정하지 않는다.

캐시 방식에서는 조건 조합을 키에 구분하고 허용 가능한 오래된 순위의 범위를 먼저 정한다. TTL은 원본 변경 속도와 오래된 결과가 미치는 영향에 맞춘다. 만료 후에는 원본 조회가 필요하며, 여러 키가 동시에 만료되면 DB 부하가 몰릴 수 있어 TTL에 작은 무작위 차이를 두는 방식을 검토한다. 이는 설계 예시이며 부하 시험 결과는 아니다. 기존 문서 전체의 검증일은 유지한다.

### 도입 전 질문

1. 현재 저장소가 만드는 개발 마찰이나 충족하지 못하는 latency, query 또는 scale 요구가 측정됐는가?
2. 새 저장소의 정본 여부와 허용 가능한 stale 범위가 명확한가?
3. 초기 snapshot, incremental update, replay와 full rebuild가 가능한가?
4. schema change를 producer와 모든 consumer에 어떻게 전파하는가?
5. 누락, 중복과 순서 역전을 검출하고 source와 대사할 수 있는가?
6. backup, 보안, 비용, on-call과 장애 모드까지 소유할 팀이 있는가?

기존 시스템에도 전체 저장소 교체보다 독립된 컴포넌트나 파생 projection처럼 경계가 분명한 부분부터 도입할 수 있다. 다만 한 제품의 한계를 피하려고 저장소를 늘리면 consistency boundary와 운영 표면도 함께 늘어난다. 측정된 이득이 그 복잡성을 상쇄할 때만 분리한다.

## 출처

- [pgvector — GitHub, pgvector](https://github.com/pgvector/pgvector) — 2026-11-04 exact와 ANN, Filtering과 Monitoring 부분 대조
- [Prometheus, Overview](https://prometheus.io/docs/introduction/overview/) — 2026-11-04 모니터링과 요청별 청구의 용도 경계 대조
- [Redis Documentation, ZRANGE](https://redis.io/docs/latest/commands/zrange/)
- [AWS, Database Caching Strategies Using Redis — Cache Validity](https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/cache-validity.html)
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
- [[NoSQL-Overview|NoSQL 개요 (저장소 선택 절차, 메인과 특수 목적, 보조 저장소 역할 구분)]]
