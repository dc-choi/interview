---
tags: [aws, elasticache, redis, memcached, cache, valkey]
status: index
category: "Infrastructure - AWS"
aliases: ["ElastiCache", "Amazon ElastiCache", "AWS Redis"]
---

# Amazon ElastiCache

AWS 관리형 인메모리 캐시 서비스. **Redis, Valkey, Memcached** 엔진을 선택해 **<1ms 지연**으로 데이터 접근을 제공한다. DB 쿼리 결과, 세션, 리더보드, Pub/Sub, 분산락 같은 고속 접근 워크로드에 사용.

- [[ElastiCache-Engine-Deployment|엔진 선택, 운영 기능과 클러스터 구조]] — 왜 필요한가, Redis/Valkey vs Memcached, Serverless 과금, Cluster/Shard/Node, Failover와 HA, 비용 사이징
- [[ElastiCache-Use-Cases|주요 사용 사례]] — Cache-Aside, 세션 스토어, 리더보드, Pub/Sub, 분산락, Rate Limiting, Hash 집계, Semantic Cache
- [[ElastiCache-Caching-Strategy|캐시 전략과 체크포인트]] — 쓰기 전략, 무효화, Stale 허용, 흔한 실수, 면접과 시험 체크포인트

## 관련 문서

- [[data|AWS 데이터베이스, 분석 서비스 폴더 인덱스]]
- [[Cache-Strategies|캐시 전략 (Cache-Aside, Write-Through, TTL)]]
