---
tags: [database, redis]
status: index
category: "Data & Storage - Cache & KV"
aliases: ["Redis 심화", "Redis Deep Dive"]
---

# Redis 심화 (Redis Deep Dive)

Redis 제품 심화 문서 모음. 자료구조와 내부 인코딩부터 아키텍처, 메모리 정책, 클러스터까지. 캐시 일반 원리는 형제 폴더 [[cache|캐시]] 참고.

- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Internal-Encoding|Redis 내부 인코딩 (SDS, listpack, quicklist, intset, skiplist)]]
- [[Redis-Atomic-Operations|Redis 원자적 연산 (INCR, MULTI/EXEC, WATCH, Lua)]]
- [[Redis-Architecture|Redis architecture (Event Loop, RESP, Pipeline, Transaction)]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction (maxmemory-policy, 근사 LRU, LFU Morris)]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding (16384 Hash Slot, CRC16, Gossip)]]
- [[Redis-Streams-PubSub|Streams, Pub/Sub (Consumer Group, Sharded Pub/Sub, Kafka 비교)]]
- [[Redis-Search-History|Redis 최근 검색 기록 (List, Sorted Set)]]
- [[Redis-Object-Mapping-Cost|Redis 객체 매핑 추상화 비용 (Repository vs 단순 KV)]]
- [[Redis-Valkey-Migration|Redis에서 Valkey로 마이그레이션]]
- [[Redis-vs-Memcached|Redis vs Memcached]]
