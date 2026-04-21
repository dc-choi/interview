---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Cache stampede 방지", "Cache Stampede"]
---

# Cache Stampede 방지

대규모 트래픽에서 인기 캐시 키가 만료되면, 동시에 다수의 요청이 DB로 몰리는 현상. 중복 읽기 + 중복 쓰기가 동시에 발생하여 DB 과부하를 유발한다.

## 발생 조건
- Cache-Aside(Look-Aside) 전략 사용 중
- 조회 빈도가 높은 **Hot Key**의 TTL 만료
- 만료 시점에 동시 N개 요청이 캐시 미스 → 모두 DB 조회 → 모두 캐시에 쓰기

## 해결 전략

### 1. TTL Jitter (랜덤 만료)
- 고정 TTL 대신 `TTL + random(0, jitter)` 적용
- 여러 키의 만료 시점을 분산시켜 동시 만료 방지
- 가장 간단하고 효과적인 1차 대응
- 예: 기본 TTL 300초 + jitter 0~60초 → 300~360초 사이에 분산 만료

### 2. Mutex Lock (분산 잠금)
- 캐시 미스 시 **한 요청만 DB를 조회**하고, 나머지는 대기 또는 stale 데이터 반환
- Redis `SET key lock_value NX EX 10` (NX: 키가 없을 때만 설정)로 구현
- lock 획득 실패한 요청은 짧은 sleep 후 캐시 재확인
- 단점: lock 보유 요청이 실패하면 나머지도 지연

### 3. 백그라운드 갱신 (Preemptive Refresh)
- TTL 만료 **전에** 백그라운드에서 미리 캐시를 갱신
- 실제 만료가 발생하지 않으므로 stampede 자체를 원천 차단
- 구현: TTL의 80% 시점에 갱신 트리거, 또는 별도 스케줄러로 주기적 갱신
- 적합: 조회 빈도가 매우 높고 DB 조회 비용이 큰 데이터

### 4. PER (Probabilistic Early Recomputation)
- 캐시 만료 전 일정 확률로 조기 갱신을 시도하는 알고리즘
- `current_time - (ttl_remaining * beta * log(random()))` > expiry 시 갱신
- 만료에 가까울수록 갱신 확률이 높아짐 → 자연스러운 분산 효과
- lock 없이 확률적으로 갱신하므로 구현이 단순하면서도 효과적

## 전략 비교

| 전략 | 복잡도 | 효과 | 적합한 상황 |
|------|--------|------|-------------|
| TTL Jitter | 낮음 | 중간 | 다수 키 동시 만료 방지 |
| Mutex Lock | 중간 | 높음 | 단일 Hot Key stampede 방지 |
| 백그라운드 갱신 | 중간 | 매우 높음 | 극도로 높은 조회 빈도 |
| PER | 낮음 | 높음 | lock 없이 확률적 분산 |

## 실무 조합
TTL Jitter를 기본 적용하고, 특별히 트래픽이 집중되는 Hot Key에는 Mutex Lock 또는 백그라운드 갱신을 추가하는 것이 현실적이다.

## 관련 문서
- [[Cache-Strategies|Cache 전략]]
- [[Cache-Invalidation|Cache Invalidation]]
- [[Hot-Key|Hot key 대응]]
