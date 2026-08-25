---
tags: [database, redis, cache, distributed-cache, warming]
status: index
category: "Data & Storage - Cache & KV"
aliases: ["Cache Invalidation and Refresh", "캐시 무효화와 갱신"]
---

# 캐시 무효화와 갱신

캐시에 담긴 값을 언제 버리고 어떻게 다시 채우는지 다루는 문서 묶음. 무효화 전략과 트랜잭션 경계, 만료 직후 재적재 폭주 방지, 대량 무효화와 워밍업, 태깅까지. 캐시 원리와 전략, 도입 판단은 상위 폴더의 [[cache|캐시]] 참고.

- [[Cache-Invalidation|캐시 무효화]]: 무효화 전략 (TTL, Write-Through, 이벤트, Pub/Sub 멀티 인스턴스 L1), 트랜잭션 경계와 post-commit 무효화, 후속 이벤트 순서 경합
- [[Cache-Stampede|Cache stampede 방지]]: 만료 직후 재적재 폭주 (TTL jitter, 분산 락, 백그라운드 갱신, PER/XFetch, single-flight)
- [[Cache-Advanced-Operations|Cache 운영 패턴]]: 분산 무효화, 워밍업, 태깅 (SCAN, UNLINK, pipeline)

## 함께 볼 문서

- [[cache|캐시]]
