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

### 4. PER, XFetch (Probabilistic Early Recomputation)
- 캐시 만료 전 일정 확률로 조기 갱신을 시도하는 알고리즘
- 핵심 공식: `now - delta * beta * ln(random()) >= expiry` 시 조기 갱신
  - `delta` — 직전 갱신에 걸린 시간 (값을 만드는 비용)
  - `beta` — 조정 파라미터 (1.0 기본, ↑ 더 일찍 갱신)
  - `ln(random())` — 0 이하 음수, 만료에 가까울수록 갱신 확률 ↑ 베타 분포
- 메타데이터로 `delta`, `expiry`를 별도 키에 저장 (`{key}:meta`) — 갱신 비용을 알아야 적절히 앞당김
- lock 없이 확률적으로 분산하므로 구현이 단순하면서도 효과적

### 5. Single-Flight (프로세스 내 중복 합치기)

같은 프로세스에서 **동일 키에 대한 동시 요청을 하나로 합쳐** 단일 DB 조회로 처리. Go의 `singleflight` 패키지가 원조. Node, NestJS에서는 `inflight: Map<string, Promise>`로 구현:

```
1. 요청 도착 → cache get → miss
2. inflight.get(key)가 있으면 그 Promise를 await (참여)
3. 없으면 새 Promise 생성, inflight에 등록, DB 조회
4. 완료 시 결과 캐시 저장 + inflight.delete(key)
```

- 분산 락보다 가벼움 — 같은 프로세스 내에선 **네트워크 0**
- 멀티 인스턴스라면 Single-Flight + 분산 락 **조합**: 프로세스 내 합치기 + 인스턴스 간 락
- finally에서 inflight.delete 누락 시 영구 stale 위험

## Lua 스크립트로 Atomic 락 해제

분산 락 해제의 함정: 락 TTL 만료 후 다른 요청이 새 락을 잡았을 때, **자기 락 토큰 검증 없이 DEL하면 남의 락을 풀어버림**. Redis EVAL로 atomic하게:

```
EVAL "if redis.call('get', KEYS[1]) == ARGV[1]
        then return redis.call('del', KEYS[1])
        else return 0 end"
     1 lock:user:1 my_token
```

`get`과 `del`이 단일 명령처럼 원자 실행. 토큰 일치할 때만 삭제.

## 전략 비교

| 전략 | 복잡도 | 효과 | 적합한 상황 |
|------|--------|------|-------------|
| TTL Jitter | 낮음 | 중간 | 다수 키 동시 만료 방지 |
| Mutex Lock | 중간 | 높음 | 단일 Hot Key stampede 방지 |
| 백그라운드 갱신 | 중간 | 매우 높음 | 극도로 높은 조회 빈도 |
| PER, XFetch | 낮음 | 높음 | lock 없이 확률적 분산 |
| Single-Flight | 낮음 | 중간 (프로세스 내) | 프로세스 내 중복 폭주 |

## 실무 조합

- **기본**: TTL Jitter + Single-Flight (프로세스 내 합치기)
- **Hot Key 1-2개**: 위 + 분산 락 (Lua 해제) 또는 백그라운드 갱신
- **Hot Key 많음**: 위 + XFetch (확률적 조기 갱신, 락 오버헤드 회피)
- **트래픽 폭증, 외부 의존성 큼**: 위 조합 + 짧은 TTL stale-while-revalidate 패턴

## 관련 문서
- [[Cache-Strategies|Cache 전략]]
- [[Cache-Invalidation|Cache Invalidation]]
- [[Hot-Key|Hot key 대응]]
- [[Distributed-Lock|분산 락 (Redlock, Lua)]]
- [[NestJS-Caching-Integration|NestJS Stampede 통합]]
