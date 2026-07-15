---
tags: [database, cache]
status: index
category: "Data & Storage - Cache & KV"
aliases: ["Cache", "캐시"]
---

# 캐시 (Cache)

캐시 원리와 전략, 운영 패턴 문서 모음. Redis 제품 심화는 형제 폴더 [[redis-deep-dive|Redis 심화]] 참고.

- [[Cache-Basics|캐시란?]]
- [[Cache-Locality|Cache Locality 원리 (Temporal, Spatial, 80/20)]]
- [[Cache-Strategies|Cache 전략 (Cache-Aside, Write-Through, Write-Behind)]]
- [[Cache-Invalidation|Cache invalidation]]
- [[Cache-Stampede|Cache stampede 방지]]
- [[Cache-Decision|Cache 도입, 제거 의사결정 (히트율, 노출률, Legacy)]]
- [[Cache-Advanced-Operations|Cache 운영 패턴 — 분산 무효화, 워밍업, 태깅 (SCAN, UNLINK, pipeline)]]
- [[Multi-Level-Cache|Multi-Level Cache (L1/L2/L3, Inclusion, Coherency)]]
- [[Consistent-Hashing|Consistent Hashing 일반 (Hash Ring, Virtual Nodes, DynamoDB, Cassandra)]]

## 다른 계층과의 연결

- [[Content-Availability-System-Design|콘텐츠 가용성 조회에서 Redis stale fallback과 Outbox projection을 결합하는 방법]]
