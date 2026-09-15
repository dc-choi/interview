---
tags: [aws, elasticache, cache, cache-strategy]
status: done
category: "Infrastructure - AWS"
aliases: ["ElastiCache 캐시 전략", "ElastiCache 흔한 실수", "ElastiCache 체크포인트"]
verified_at: 2026-07-21
---

# Amazon ElastiCache — 캐시 전략과 체크포인트

## 캐시 전략

### 쓰기 전략

- **Write-Through**: DB 쓰기 경로에서 캐시도 갱신해 stale 가능성을 낮춘다. 별도 DB와 캐시 사이의 원자성을 자동 보장하지 않으므로 부분 실패를 위한 재시도, 무효화와 재조정 절차가 필요하다
- **Write-Behind**: 캐시만 갱신, DB는 지연 쓰기 — 쓰기 빠름, 일관성↓, 손실 위험
- **Cache-Aside + TTL**: 읽을 때만 캐시 채움, TTL 만료로 갱신 — 가장 널리 쓰임

### 무효화

- **TTL 기반**: 짧게 두면 자주 갱신(정합성↑), 길면 부하↓
- **명시적 invalidate**: DB 쓰기와 함께 `DEL`
- **버전 키**(`user:123:v2`): 새 버전 키로 교체해 구 캐시 무시

### Stale 허용 여부

- **허용**: 리더보드(초 단위 지연 OK), 집계 통계 / **불허**: 결제, 재고, 실시간 가격

## 흔한 실수

- **세션을 DB에 저장하며 동시에 ElastiCache도 도입** — 혼선. 세션은 한 곳으로 일원화
- **TTL 없이 캐시** — 메모리 누적, 오래된 데이터 잔존
- **큰 값을 캐시** — 수 MB 문서를 통째로 저장해 네트워크, 메모리 압박. 필요한 필드만
- **캐시 스탬피드**(Thundering Herd) — TTL 만료 순간 수천 요청이 동시에 DB로. 락, 지수 백오프, Probabilistic Early Recomputation으로 방어
- **Memcached 선택 후 자료구조 필요해짐** — 설계 시점에 Redis/Valkey가 더 범용적임을 기억

## 면접, 시험 체크포인트

- **Redis/Valkey vs Memcached** — 자료구조, Pub/Sub, node-based 복제와 failover 차이. Serverless Memcached의 snapshot 예외 구분
- **Cache-Aside / Write-Through / Write-Behind** 선택 기준
- **캐시 스탬피드** 방어 (락, 지수 백오프, Probabilistic Early Recomputation)
- **분산락** Redlock, 락 TTL 주의점
- **ElastiCache Serverless** vs Provisioned 적합 시나리오
- Sorted Set 리더보드의 O(log N) 원리
- **node-based Memcached는 Failover, 복제 불가**, **Redis/Valkey Cluster 모드 = 다수 Shard** (비활성 = Shard 1개)
- In-Memory DB의 **휘발성** — ElastiCache 백업은 RDB 기반 스냅샷이므로 복구 시점과 보존 정책을 별도로 설계

## 출처

- [ElastiCache 엔진 선택](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SelectEngine.html)
- [ElastiCache 백업과 복원](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups.html)

## 관련 문서

- [[ElastiCache|Amazon ElastiCache]]
- [[ElastiCache-Engine-Deployment|ElastiCache 엔진 선택, 운영 기능과 클러스터 구조]]
- [[ElastiCache-Use-Cases|ElastiCache 주요 사용 사례]]
- [[Cache-Strategies|캐시 전략 (Cache-Aside, Write-Through, TTL)]]
