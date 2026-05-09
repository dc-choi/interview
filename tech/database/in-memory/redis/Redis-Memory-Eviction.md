---
tags: [database, redis, memory, eviction, lru, lfu]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Redis Eviction", "maxmemory-policy", "LRU vs LFU"]
---

# Redis Memory Eviction Policy

`maxmemory` 한도에 도달하면 **새 쓰기를 어떻게 처리할지** 결정하는 정책. 캐시로 쓸 거냐·영속 저장소로 쓸 거냐에 따라 선택이 갈린다. 잘못 고르면 캐시 미스 폭증 또는 OOM crash.

## 8가지 정책

| 정책 | 동작 | 적합 |
|------|------|------|
| `noeviction` | 새 쓰기 거부 (`OOM` 응답) | 데이터 손실 절대 금지 |
| `allkeys-lru` | 모든 키에서 근사 LRU 삭제 | **일반 캐시** |
| `allkeys-lfu` | 모든 키에서 LFU(빈도) 삭제 | 인기 키가 명확한 워크로드 |
| `allkeys-random` | 모든 키에서 랜덤 삭제 | 분포가 균등할 때 |
| `volatile-lru` | TTL 있는 키에서만 LRU | TTL 키 = 캐시, TTL 없는 키 = 영속 분리 |
| `volatile-lfu` | TTL 있는 키에서만 LFU | 위 + 빈도 기반 |
| `volatile-random` | TTL 있는 키에서만 랜덤 | 단순한 분리 |
| `volatile-ttl` | TTL 짧은 순서 삭제 | 만료 임박한 데이터부터 |

기본은 `noeviction`. 캐시 용도면 **`allkeys-lru` 또는 `allkeys-lfu`**가 표준.

## allkeys vs volatile 선택

| 운영 패턴 | 권장 |
|-----------|------|
| **모든 데이터 캐시** (TTL 무관) | `allkeys-*` |
| **TTL 키 = 캐시 / TTL 없음 = 영속** 같이 운영 | `volatile-*` |
| **영속 저장소로만** (eviction 절대 금지) | `noeviction` + 메모리 모니터링 |

`volatile-*`는 TTL 없는 키가 모두 차면 **새 쓰기 거부** — 사실상 noeviction 동작. 두 용도 분리 의도 안 맞으면 미스리딩.

## 근사 LRU — 24bit Timestamp + 샘플링

Redis는 **정확한 LRU가 아니라 근사 LRU**. 메모리 비용 압축 + 충분히 정확.

| 측면 | 정확한 LRU | Redis 근사 LRU |
|------|-----------|----------------|
| 자료구조 | 이중 연결 리스트 + 해시 | 키마다 24bit 시간 필드만 |
| 메모리/키 | ~16~24바이트 추가 | 3바이트 |
| 정확도 | 완벽 | 충분히 좋음 (5~10 샘플로 95%+) |

### 동작

1. 각 키 객체에 **24bit `lru` 필드** — 마지막 접근 시간(초 단위, 약 194일 주기 wraparound).
2. eviction 필요 시 **N개 무작위 샘플** (`maxmemory-samples` 기본 5).
3. 샘플 중 가장 오래된 것 삭제.
4. 샘플 수 ↑ → 정확도 ↑ + CPU ↑. 10이면 거의 정확한 LRU.

```
maxmemory-samples 10    # 정확도 강화
```

## LFU — 8bit Morris Counter + 16bit Decay Time

LRU는 "최근 안 쓰면 삭제" — 일회성 폭증 키가 hot 키를 밀어내는 함정. **LFU는 빈도 기준** — 자주 쓰면 살아남음.

```
객체의 lru 필드 (24bit) =
  ├── counter (8bit) — Morris 확률적 카운터
  └── decay  (16bit) — 마지막 접근 시간 (분 단위)
```

### Morris Counter

8bit으로 표현하면 0~255. 그대로 카운트하면 빠르게 max 도달. Morris는 **확률적으로만 증가**:

```
P(증가) = 1 / ((counter - LFU_INIT_VAL) * lfu_log_factor + 1)
```

- counter 작을수록 자주 증가, 클수록 거의 안 증가.
- `lfu_log_factor` 기본 10 — 카운터가 ~1M 접근까지 도달 가능.
- 8bit으로 백만 단위 빈도 표현.

### Decay

오래 안 쓰면 카운터 감소 — 과거 hot이 영원히 살아남는 문제 회피.

```
lfu_decay_time 1   # 분 단위, 1분마다 counter -1
```

### LFU 사용 시점

- **인기 키가 명확하고 안정적** (서비스 핵심 페이지·트렌딩 콘텐츠).
- **일회성 트래픽 폭증**(크롤러·이상 패턴)에 hot 키가 쫓겨나면 안 됨.

## OBJECT FREQ — LFU 모드에서 빈도 확인

```
CONFIG SET maxmemory-policy allkeys-lfu
OBJECT FREQ mykey   → 0~255 사이의 Morris 카운터
```

LRU 모드에서는 `OBJECT IDLETIME`로 마지막 접근 후 경과 초.

## 메모리 모니터링

```
INFO memory
MEMORY STATS
MEMORY USAGE mykey
MEMORY DOCTOR     # 권고 자동 출력
```

핵심 지표:
- `used_memory_rss` — OS가 실제 점유한 메모리 (단편화 포함)
- `used_memory_human` — 논리적 사용량
- `mem_fragmentation_ratio` — RSS / 논리 사용량. 1.0~1.5 정상, 1.5+면 단편화 의심
- `evicted_keys` — 누적 eviction 수, 폭증하면 maxmemory 부족 신호

## maxmemory 설정 권장

```
maxmemory 8gb
maxmemory-policy allkeys-lru
maxmemory-samples 10
```

운영 메모리의 70~80%로 설정. 100% 가까이 두면 OS·복제·persistence 작업이 메모리 부족으로 실패.

## 흔한 실수

- **기본값(noeviction) 그대로 캐시 운영** → maxmemory 도달 시 쓰기 모두 실패. 도메인에 맞춰 명시 설정.
- **`volatile-*` 쓰면서 캐시 키에 TTL 안 둠** → 사실상 noeviction. 캐시 키는 반드시 EXPIRE.
- **`maxmemory-samples 5`로 두고 정확도 불만** → 10으로 올림. CPU 비용 미미.
- **LFU로 바꿨는데 효과 미미** → `lfu_log_factor`/`lfu_decay_time` 기본값이 워크로드와 안 맞을 수 있음. 빈도 분포 확인 후 튜닝.
- **단편화 1.5+ 무시** → 메모리 회수 안 됨. `MEMORY PURGE` 또는 재시작 검토. jemalloc 활성 대안.
- **`evicted_keys` 폭증하는데 캐시 미스 영향 무시** → 응답 시간·DB 부하 ↑. maxmemory 증설 또는 키 정리 정책.

## 면접 체크포인트

- 8가지 정책 분류 — allkeys vs volatile, noeviction의 의미
- 근사 LRU의 메모리 절감 (24bit) + 샘플링 (`maxmemory-samples`)
- LRU vs LFU 선택 기준 — 일회성 폭증에서 hot 키 보호
- Morris Counter — 8bit으로 백만 단위 빈도 표현하는 확률적 트릭
- LFU의 decay — 영원히 살아남는 키 방지
- `volatile-*` 정책의 함정 — TTL 없는 키 가득 차면 noeviction
- `mem_fragmentation_ratio` 1.5+의 의미와 대응
- `evicted_keys` 폭증 모니터링

## 관련 문서

- [[Redis-Internal-Encoding|Redis 내부 인코딩]]
- [[Redis-Architecture|Redis architecture]]
- [[Hot-Key|Hot key 대응]]
- [[TTL|TTL 전략]]
- [[Cache-Strategies|Cache 전략]]
