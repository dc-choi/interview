---
tags: [database, redis, cache]
status: index
category: "Data & Storage - Cache & KV"
aliases: ["Cache & KV Store (Redis)"]
---

# Cache & KV Store (Redis)

## Core
- [[Cache-Basics|캐시란?]]
- [[Cache-Locality|Cache Locality 원리 (Temporal, Spatial, 80/20, 암달의 법칙)]]
- [[Redis-Data-Structures|Redis 자료구조 (코어 타입과 JSON, Geo, 확률형, Time series, Vector set)]]
- [[Inverted-Index-and-TF-IDF|Redis Set과 Sorted Set으로 구현하는 역색인과 TF-IDF]]
- [[Redis-Internal-Encoding|Redis 내부 인코딩 (SDS, listpack, quicklist, intset, skiplist)]]
- [[Redis-Atomic-Operations|Redis 원자적 연산 (INCR, MULTI/EXEC, WATCH, Lua)]]
- [[Redis-Atomic-Operations-Lua|Redis Lua 스크립트와 Functions (KEYS와 ARGV 계약, BUSY, EVALSHA 캐시)]]
- [[Redis-Cart-Checkout-Consistency|Redis 장바구니와 주문 정합성 (Hash, TTL, cart version, Outbox cleanup)]]
- [[Redis-Sorted-Set-Ranking|Sorted Set 랭킹 설계 (찜하기, 실시간 인기 순위, 기간별 랭킹, 동점)]]
- [[TTL|TTL 전략]]
- [[Cache-Strategies|Cache 전략]]
- [[Cache-Decision|Cache 도입, 제거 의사결정 (히트율, 노출률, Legacy)]]
- [[Multi-Level-Cache|Multi-Level Cache (L1/L2/L3, Inclusion, Coherency)]]
- [[Cache-Invalidation|Cache invalidation]]
- [[Hot-Key|Hot key 대응]]
- [[Session-Store|Session store]]
- [[Distributed-Lock|Distributed lock]]
- [[Distributed-Lock-Waiting|분산 락 획득 대기 (폴링과 해제 알림, 대기 시간과 점유 시간, Lettuce와 Redisson)]]
- [[Cache-Stampede|Cache stampede 방지]]
- [[Cache-Advanced-Operations|Cache 운영 패턴 — 분산 무효화, 워밍업, 태깅 (SCAN, UNLINK, pipeline)]]
- [[Cache-Invalidation-and-Refresh|캐시 무효화와 갱신 폴더 인덱스 (무효화 전략, stampede 방지, 분산 무효화와 워밍업)]]
- [[Redis-Search-History|Redis 최근 검색 기록 (List, Sorted Set)]]
- [[Redis-Streams-PubSub|Streams, Pub/Sub (Consumer Group, Sharded Pub/Sub, Kafka 비교)]]
- [[Redis-Object-Mapping-Cost|Redis 객체 매핑 추상화 비용 (Repository vs 단순 KV, HMSET과 인덱스 Set, MONITOR 진단)]]

## Operations
- [[Persistence]]
- [[Redis-Architecture|Redis architecture (Event Loop, RESP, Pipeline, Transaction)]]
- [[Redis-Architecture-HA|복제와 Sentinel 고가용성 (비동기 복제, quorum과 과반 승인, failover 유실)]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction (maxmemory-policy, 근사 LRU, LFU Morris)]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding (16384 Hash Slot, CRC16, Gossip)]]
- [[Consistent-Hashing|Consistent Hashing 일반 (Hash Ring, Virtual Nodes, 메모리와 분산 오차, 점진적 링 교체)]]
- [[Operations|운영 팁]]
- [[Redis-vs-Memcached|Redis vs Memcached]]
- [[Redis-Valkey-Migration|Redis에서 Valkey로 (라이선스 포크, 버전별 변화, I/O 스레딩 조건, 달라진 운영 상식, ElastiCache 가격, 인플레이스 업그레이드 체크리스트)]]
- [[Use-Cases|Use cases (Redis에 맡기기 전 세 질문, 고유 개수 자료구조 선택)]]
