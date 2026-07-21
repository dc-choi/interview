---
tags: [aws, elasticache, redis, memcached, cache, valkey]
status: done
category: "Infrastructure - AWS"
aliases: ["ElastiCache", "Amazon ElastiCache", "AWS Redis"]
verified_at: 2026-07-21
---

# Amazon ElastiCache

AWS 관리형 인메모리 캐시 서비스. **Redis, Valkey, Memcached** 엔진을 선택해 **<1ms 지연**으로 데이터 접근을 제공한다. DB 쿼리 결과, 세션, 리더보드, Pub/Sub, 분산락 같은 고속 접근 워크로드에 사용.

## 왜 필요한가

- **DB 부담 완화**: 복잡한 조인, 집계 결과를 캐시해 재계산 제거
- **지연 절감**: 메모리 기반 조회로 반복적인 데이터베이스 접근을 줄인다. 실제 지연과 사용자 영향은 데이터 크기, 네트워크, 명령, 워크로드에서 측정한다.
- **스파이크 흡수**: 순간 트래픽 증가 시 DB 폭주를 막는 버퍼
- **글로벌 상태 공유**: 여러 앱 서버가 세션, 락, 카운터를 공유

## 엔진 선택 — node-based Redis/Valkey vs Memcached

| 항목 | Redis / Valkey | Memcached |
|---|---|---|
| 자료구조 | String, Hash, List, Set, Sorted Set, Stream, Bitmap | String만 |
| 백업 | node-based 배포에서 RDB 기반 백업과 스냅샷 지원 | node-based Memcached는 미지원 |
| 복제, 클러스터 | 공식 지원 | 제한적 |
| Pub/Sub | 지원 | 미지원 |
| 분산락 | SETNX, Redlock | 미지원 |
| 사용 패턴 | 다양한 자료구조, 복잡한 로직 | 단순 KV 캐시, 멀티스레드 고속 |

자료구조, 복제, 장애 조치가 필요하면 **Valkey 또는 Redis OSS**를 검토한다. Memcached는 단순하고 폐기 가능한 KV 캐시에 적합하다. 단, ElastiCache Serverless for Memcached는 snapshot과 restore를 지원하므로 node-based Memcached의 백업 미지원 특성을 전체 Memcached 배포에 일반화하면 안 된다.

**Valkey**는 Redis OSS 7.2에서 갈라져 Linux Foundation이 관리하는 오픈소스 프로젝트다. Redis OSS 프로토콜과 명령 호환성이 높지만, 마이그레이션 전에는 사용하는 엔진 버전과 명령, 클라이언트 호환성을 확인한다.

## 주요 사용 사례

### 1. 쿼리 캐시 (Cache-Aside)

가장 흔한 패턴. 읽기 경로에서 캐시 miss 시 DB 조회 후 캐시 write.

```
if (value = cache.get(key)) return value
else:
  value = db.query(...)
  cache.set(key, value, ttl)
  return value
```

- 캐시 대상: **조회가 느리고, 자주 읽히고, 자주 바뀌지 않는** 데이터
- 예: 상품 상세, 사용자 프로필, 설정값

### 2. 세션 스토어

로드밸런싱된 여러 앱 서버가 세션을 공유. 단일 서버 메모리에 두면 sticky session, failover 문제.

### 3. 리더보드 — Sorted Set

`ZADD`로 점수 저장, `ZREVRANGE`로 상위 N명, `ZREVRANK`로 특정 유저 순위. 10만 명 리더보드도 밀리초 단위 조회.

```
ZADD leaderboard 381 Adam 231 Sandra 132 Robert 32 June
ZREVRANGEBYSCORE leaderboard +inf -inf
ZREVRANK leaderboard June   → 3
```

### 4. Pub/Sub 메시징

발행자가 구독자를 몰라도 채널 기반 전송. 간단한 실시간 알림, 팬아웃에 적합.

```
SUBSCRIBE news.sports.golf
PSUBSCRIBE news.sports.*        # 패턴 구독
PUBLISH news.sports.golf "메시지"
```

- **영속성 없음** — 구독자가 연결 안 돼있으면 메시지 유실
- 영속, 재전송이 필요하면 Kafka, SQS 선택

### 5. 분산락

여러 프로세스, 인스턴스가 동일 자원에 접근하는 경쟁 제어.

- `SETNX` 기반 단순 락: 락이 리더 노드 장애 시 소실될 수 있음
- **Redlock** 알고리즘: 여러 독립 Redis 노드에서 lease를 획득하는 방식. 안전성은 장애 모델, 시간 가정, lease 만료 처리에 좌우되므로 정확성이 중요한 락에는 fencing token과 저장소의 조건부 쓰기 같은 추가 보호를 검토한다.
- [[Distributed-Lock|분산락 주제 문서]]에서 패턴, 안티패턴 참고

### 6. Rate Limiting, 카운터

`INCR` 자체는 원자적이지만 새 key에 TTL을 붙이는 별도 `EXPIRE`와 합치면 중간 실패 race가 생긴다. Lua script 또는 적절한 transaction으로 증가와 최초 TTL 설정을 하나의 원자적 작업으로 묶는다.

```lua
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
```

반환값이 허용량을 넘으면 요청을 거부한다. `EXPIRE`는 key를 처음 만든 호출에만 설정해 후속 요청마다 고정 window가 연장되지 않게 한다. sliding window나 token bucket은 요구 정확도에 맞는 별도 알고리즘을 사용한다.

### 7. 추천, 호불호 집계 — Hash

HSET으로 사용자별 평가, INCR로 누적 좋아요, 싫어요.

### 8. Semantic Cache (Gen AI)

LLM 응답을 프롬프트 임베딩 기반으로 캐시하면 유사 프롬프트에 저장된 응답을 반환해 **LLM 비용과 지연을 줄일 수 있다**. ElastiCache Search의 vector search는 현재 **node-based Valkey 8.2 이상**에서 지원되며 Serverless나 Redis OSS 엔진의 일반 기능으로 보면 안 된다. Full-text와 hybrid search는 node-based Valkey 9.0 이상 범위를 확인한다.

- RAG(Retrieval-Augmented Generation)의 세션 메모리, 지식 검색에도 활용
- ElastiCache Search의 엔진, 버전, 배포 제한이 맞지 않으면 OpenSearch k-NN이나 별도 벡터 저장소를 비교

## ElastiCache 운영 기능

| 기능 | 설명 |
|---|---|
| **Multi-AZ with Auto Failover** | 프라이머리 장애 시 레플리카 자동 승격 |
| **Global Datastore** | 리전 간 복제 (Redis/Valkey 한정) |
| **Backup, Snapshot** | S3로 자동 백업, 특정 시점 복구 |
| **In-transit / At-rest Encryption** | TLS, KMS 연동 |
| **ElastiCache Serverless** | 사용량 기반 자동 스케일, 기본 가용성 99.99% |

### ElastiCache Serverless 주의점

- **스토리지와 요청량 과금** — Serverless는 저장 데이터를 GB-hour로, 요청 처리를 ElastiCache Processing Unit(ECPU)으로 측정한다. 엔진별 최소 측정 스토리지가 있으므로 유휴 비용도 0으로 단정할 수 없다
- 비용 우위는 최소 저장량, 데이터 처리량, 노드 사용률과 엔진에 따라 달라지므로 예측 부하는 Serverless와 노드 기반 구성을 계산기로 비교한다.
- 트래픽 패턴이 예측 불가, 변동 큰 워크로드에 유리

## 캐시 전략

### 쓰기 전략

- **Write-Through**: DB 쓰기 시 캐시도 동시에 갱신 — 일관성↑, 쓰기 지연↑
- **Write-Behind**: 캐시만 갱신, DB는 지연 쓰기 — 쓰기 빠름, 일관성↓, 손실 위험
- **Cache-Aside + TTL**: 읽을 때만 캐시 채움, TTL 만료로 갱신 — 가장 널리 쓰임

### 무효화

- **TTL 기반**: 짧게 두면 자주 갱신(정합성↑), 길면 부하↓
- **명시적 invalidate**: DB 쓰기와 함께 `DEL`
- **버전 키**(`user:123:v2`): 새 버전 키로 교체해 구 캐시 무시

### Stale 허용 여부

- **허용**: 리더보드(초 단위 지연 OK), 집계 통계
- **불허**: 결제, 재고, 실시간 가격

## 클러스터, 노드 구조 (시험 관점)

node-based ElastiCache는 **Node**를 서비스 단위로 사용한다. Node는 인스턴스 타입에 따른 메모리와 endpoint를 가지며 AWS가 관리형 인프라 작업을 수행한다. Serverless는 이 node 구성을 사용자에게 추상화하므로 아래 구조와 동일하게 해석하지 않는다.

**Memcached**: `Cluster ↔ Node` 2계층. 다른 AZ 분산은 되지만 **복제본, Failover 불가**, 용량 증설은 Node 추가만.

**Redis / Valkey**: `Cluster → Shard → Node` 3계층. Shard = Primary 1 + Replica N. Cluster 모드 비활성 시 **Shard 1개**(복제만), 활성 시 **다수 Shard로 키스페이스 샤딩**. 복제본 → **Failover, Multi-AZ 지원**.

### Failover, HA 핵심

| 엔진 | Failover | Multi-AZ | 백업 |
|------|----------|----------|------|
| node-based Memcached | 불가 | 노드 분산만 | 없음 |
| node-based Redis/Valkey | **자동 승격** | 지원 | RDB 기반 백업과 스냅샷, S3 저장 |
| Serverless Memcached | 서비스가 가용성과 확장을 관리 | Serverless 배포 모델 | snapshot과 restore 지원 |

복제, 자동 장애 조치, 백업이 필요하면 Valkey 또는 Redis OSS를 선택한다. 어느 엔진이든 캐시를 유일한 원본 데이터 저장소로 두는지는 복구 요구와 데이터 손실 허용 범위를 따로 검토한다.

## 비용, 사이징

- **인스턴스 타입**: 데이터 크기, eviction, CPU, 네트워크와 엔진 호환성을 측정해 선택한다. Graviton 계열의 가격 대비 성능도 워크로드에서 비교한다.
- **샤딩**: 단일 노드 메모리 한도(100GB+) 넘으면 Redis Cluster 모드로 샤딩
- **비용 지표**: 인스턴스 시간 + 데이터 전송 + 스냅샷 스토리지

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
- [AWS Docs, 일반적인 ElastiCache 사용 사례](https://docs.aws.amazon.com/ko_kr/AmazonElastiCache/latest/dg/elasticache-use-cases.html)
- [ElastiCache 배포 옵션](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.deployment.html)
- [ElastiCache 요금](https://aws.amazon.com/elasticache/pricing/)
- [ElastiCache 백업과 복원](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/backups.html)
- [ElastiCache 엔진 버전 고려사항](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/VersionManagementConsiderations.html)
- [ElastiCache 엔진 선택](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SelectEngine.html)
- [ElastiCache Search 지원 범위](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/search-features-limits.html)
- [Redis INCR rate limiter와 race condition](https://redis.io/docs/latest/commands/incr/)

## 관련 문서
- [[Cache-Strategies|캐시 전략 (Cache-Aside, Write-Through, TTL)]]
- [[Distributed-Lock|분산락 (Redlock)]]
- [[Redis-Atomic-Operations|Redis 원자 연산]]
- [[Connection-Pool|Connection Pool]]
- [[Realtime-Chat-Architecture|실시간 아키텍처 (Pub/Sub)]]
