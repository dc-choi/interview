---
tags: [database, redis, memory, internal]
status: index
category: "Data & Storage - Cache & KV"
aliases: ["Redis 자료구조와 메모리", "Redis Memory Internals"]
---

# Redis 자료구조와 메모리 내부

Redis가 메모리 위에서 데이터를 어떻게 표현하고 회수하는지 다루는 문서 묶음. 노출되는 자료구조 타입에서 내부 인코딩, 그리고 maxmemory 한도에서의 축출 정책까지. 클러스터와 프로토콜은 상위 폴더의 [[redis-deep-dive|Redis 심화]] 참고.

- [[Redis-Data-Structures|Redis 자료구조 (string, list, hash, set, sorted set, stream)]]
- [[Redis-Internal-Encoding|Redis 내부 인코딩 (SDS, listpack, quicklist, intset, skiplist)]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction (maxmemory-policy, 근사 LRU, LFU Morris)]]
