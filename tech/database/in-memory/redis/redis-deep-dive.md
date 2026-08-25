---
tags: [database, redis]
status: index
category: "Data & Storage - Cache & KV"
aliases: ["Redis 심화", "Redis Deep Dive"]
---

# Redis 심화 (Redis Deep Dive)

Redis 제품 심화 문서 모음. 자료구조와 내부 인코딩부터 아키텍처, 메모리 정책, 클러스터까지. 캐시 일반 원리는 형제 폴더 [[cache|캐시]] 참고.

- [[Redis-Memory-Internals|자료구조와 메모리 내부 (인코딩, Eviction)]]
- [[Redis-Application-Patterns|Redis 애플리케이션 패턴 (원자적 연산, 장바구니 정합성, 검색 기록, 객체 매핑 비용)]]
- [[Inverted-Index-and-TF-IDF|Set과 Sorted Set으로 구현하는 역색인과 TF-IDF]]
- [[Redis-Architecture|Redis architecture (Event Loop, RESP, Pipeline, Transaction)]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding (16384 Hash Slot, CRC16, Gossip)]]
- [[Redis-Streams-PubSub|Streams, Pub/Sub (Consumer Group, Sharded Pub/Sub, Kafka 비교)]]
- [[Redis-Valkey-Migration|Redis에서 Valkey로 마이그레이션]]
- [[Redis-vs-Memcached|Redis vs Memcached]]
