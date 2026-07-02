---
tags: [database, redis, cache]
status: index
category: "Data & Storage - Cache & KV"
aliases: ["Cache & KV Store (Redis)"]
---

# Cache & KV Store (Redis)

## Core
- [[Cache-Basics|캐시란?]]
- [[Cache-Locality|Cache Locality 원리 (Temporal, Spatial, 80/20)]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Redis-Internal-Encoding|Redis 내부 인코딩 (SDS, listpack, quicklist, intset, skiplist)]]
- [[Redis-Atomic-Operations|Redis 원자적 연산 (INCR, MULTI/EXEC, WATCH, Lua)]]
- [[TTL|TTL 전략]]
- [[Cache-Strategies|Cache 전략]]
- [[Cache-Decision|Cache 도입, 제거 의사결정 (히트율, 노출률, Legacy)]]
- [[Multi-Level-Cache|Multi-Level Cache (L1/L2/L3, Inclusion, Coherency)]]
- [[Cache-Invalidation|Cache invalidation]]
- [[Hot-Key|Hot key 대응]]
- [[Session-Store|Session store]]
- [[Distributed-Lock|Distributed lock]]
- [[Cache-Stampede|Cache stampede 방지]]
- [[Cache-Advanced-Operations|Cache 운영 패턴 — 분산 무효화, 워밍업, 태깅 (SCAN, UNLINK, pipeline)]]
- [[Redis-Search-History|Redis 최근 검색 기록 (List, Sorted Set)]]
- [[Redis-Streams-PubSub|Streams, Pub/Sub (Consumer Group, Sharded Pub/Sub, Kafka 비교)]]
- [[Redis-Object-Mapping-Cost|Redis 객체 매핑 추상화 비용 (Repository vs 단순 KV, HMSET과 인덱스 Set, MONITOR 진단)]]

## Operations
- [[Persistence]]
- [[Redis-Architecture|Redis architecture (Event Loop, RESP, Pipeline, Transaction)]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction (maxmemory-policy, 근사 LRU, LFU Morris)]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding (16384 Hash Slot, CRC16, Gossip)]]
- [[Consistent-Hashing|Consistent Hashing 일반 (Hash Ring, Virtual Nodes, DynamoDB, Cassandra)]]
- [[Operations|운영 팁]]
- [[Redis-vs-Memcached|Redis vs Memcached]]
- [[Use-Cases|Use cases]]
