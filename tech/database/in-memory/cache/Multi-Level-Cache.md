---
tags: [database, cache, multi-level, l1, l2]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Multi-Level Cache", "멀티레벨 캐시", "L1+L2 캐시"]
---

# Multi-Level Cache (L1/L2/L3)

서로 다른 **응답 시간, 용량, 공유 범위**를 가진 캐시를 계층으로 쌓아 hit rate와 응답 시간을 동시에 최적화하는 패턴. CPU의 L1/L2/L3 캐시 구조를 애플리케이션 레벨에서 모방.

## 계층별 특성

| 계층 | 위치 | 응답시간 | 용량 | 공유 범위 |
|------|------|---------|------|----------|
| **L1 (인메모리)** | 프로세스 내부 (Map, LRU) | ~ns | ~MB-수백MB | 프로세스 내부만 |
| **L2 (Redis 등)** | 별도 서버, 네트워크 hop | ~ms | ~GB-수십GB | 클러스터 전체 |
| **L3 (DB)** | 디스크/네트워크 | ~10ms+ | ~TB | 영속 저장 |

L1은 GC 부담, OOM 위험, 인스턴스 간 비공유, L2는 네트워크 hop, 직렬화 비용, 운영 인프라. 둘의 약점을 서로 보완.

## 조회 흐름 (Read-Through)

```
1. L1 확인 → Hit면 반환 (ns)
2. Miss → L2 확인 → Hit면 L1 승격 후 반환 (ms)
3. Miss → DB 로드 → L1, L2 양쪽 적재 후 반환 (10ms+)
```

승격(promotion) 정책에 따라 L1 hit rate가 결정 — 모든 L2 hit를 L1로 올리면 capacity churn, 빈도 기반 선택적 승격이면 안정적.

## Inclusion vs Exclusion Policy

| 정책 | 의미 | 적합 |
|------|------|------|
| **Inclusion** | L2는 L1 데이터를 항상 포함 (L1 ⊂ L2) | 단순. 일반 웹 서비스 표준 |
| **Exclusion** | L1과 L2가 서로 다른 데이터 (L1 ∩ L2 = ∅) | 총 캐시 용량 극대화 |
| **Non-inclusive (NINE)** | 강제 관계 없음 — 결과적 포함 | 융통성, 약간의 추가 미스 가능 |

대부분 Inclusion 사용 — L1 evict 시 L2가 백업, L2 evict 시 L1엔 영향 없음.

## 무효화 — 계층별 일관성

쓰기 시 두 계층 모두 무효화하지 않으면 stale 발생:

```
1. DB 쓰기
2. L2 (Redis) 삭제 또는 갱신
3. L1 (프로세스 내) 삭제 또는 갱신
4. 멀티 인스턴스면 다른 인스턴스의 L1도 무효화 (Pub/Sub)
```

L1은 **프로세스마다 독립**이라 멀티 인스턴스 환경에서 가장 까다로움 — 자세한 건 [[Cache-Invalidation|Cache Invalidation]]의 Pub/Sub 패턴.

## hit rate 분리 측정 — 운영 인사이트

```
{
  l1HitRate: "70%",  // 인메모리에서 처리
  l2HitRate: "25%",  // Redis까지 다녀온 비율
  dbHitRate: "5%"    // DB까지 도달한 비율
}
```

각 계층 hit rate를 따로 봐야 의미 있는 튜닝 가능:

| 신호 | 해석 | 대응 |
|------|------|------|
| L1 hit rate < 30% | L1 capacity 부족 또는 working set 큼 | L1 크기 증대 또는 LFU 전환 |
| L1 + L2 < 80% | 캐싱 가치 자체 부족 | 도입 재검토 ([[Cache-Decision]]) |
| L2 hit rate가 거의 0 | L1만으로 충분 — L2 의미 없음 | L2 제거 검토 |
| DB 도달 비율 ↑ | 새 키 폭발적 증가 또는 working set 변화 | TTL, 정책 재검토 |

## 비용 분석 — L1만 vs L1+L2

| 워크로드 | L1만 | L1+L2 |
|---------|------|-------|
| 단일 인스턴스 + 작은 working set | ✅ 충분 | 오버킬 |
| 멀티 인스턴스 + 일관성 중요 | ❌ 인스턴스 간 stale | ✅ L2가 공유 진실 |
| 데이터 크기 > 인스턴스 메모리 | ❌ OOM | ✅ L2가 주 저장 |
| Cold start 후 빠른 워밍 필요 | ❌ 매 인스턴스 빈 캐시 | ✅ L2가 워밍된 상태 유지 |

MSA, k8s 환경에서 인스턴스가 자주 재기동되면 L2의 공유 캐시 가치가 크게 올라간다.

## L1 구현 — 인메모리 LRU/LFU

L1은 **JS Map + 이중 연결 리스트**로 LRU O(1) 보장 가능. capacity 1만~10만 정도가 일반적 — 그 이상은 GC 부담.

| 자료구조 | get/set | eviction | 메모리 오버헤드 |
|---------|---------|----------|----------------|
| `Map` + 삽입순서 활용 | O(1) | 부정확 | 낮음 |
| `Map` + 이중 연결 리스트 | O(1) | 정확 LRU | 노드 객체 추가 |
| Frequency buckets | O(1) | 정확 LFU | 빈도별 Set 추가 |

LRU는 단순하고 일반 워크로드에 충분. LFU는 cache pollution 방지가 중요한 hot key 도메인 ([[Redis-Memory-Eviction|Redis도 동일 트레이드오프]]).

## 흔한 실수

- **L1 capacity 무한** — GC pause, OOM 유발. 반드시 capacity와 LRU/LFU eviction
- **L1 무효화 누락** — L2만 비우고 L1은 stale 유지 → 인스턴스마다 다른 데이터
- **멀티 인스턴스에서 Pub/Sub 없는 L1** — 노드별 stale 윈도우 발생
- **L2 직렬화 비용 무시** — JSON.stringify가 hot path면 성능 저하 → 메시지팩, avro 검토
- **L1, L2 동일 TTL** — L1을 더 짧게 두면 L2의 비교적 신선한 값으로 빠르게 fallback
- **hit rate 통합만 측정** — 계층별 분리 측정 안 하면 어디 튜닝할지 모름
- **L2 단일 노드 의존** — Redis 장애 시 전체 시스템 정지. Sentinel, Cluster ([[Redis-Architecture|Redis 아키텍처]])

## 면접 체크포인트

- L1/L2/L3의 응답시간, 용량, 공유 범위 차이 (ns vs ms vs 10ms+)
- L1 단점 (GC, 인스턴스 비공유) vs L2 단점 (네트워크, 직렬화)
- Inclusion vs Exclusion policy 차이
- 멀티 인스턴스 환경에서 L1 일관성 문제와 Pub/Sub 해법
- 계층별 hit rate를 분리 측정해야 하는 이유
- L1만으로 충분한 경우 vs L2 필수인 경우 (MSA, 일관성)
- L1, L2 TTL을 다르게 두는 이유
- working set 크기에 따른 L1 capacity 결정

## 출처
- [TS Backend Meetup — NestJS 캐싱 전략 정리]

## 관련 문서
- [[Cache-Locality|Cache Locality 원리]]
- [[Cache-Strategies|Cache 전략]]
- [[Cache-Invalidation|Cache Invalidation (Pub/Sub 무효화)]]
- [[Cache-Decision|Cache 도입, 제거 의사결정]]
- [[Redis-Memory-Eviction|Redis Eviction (LRU/LFU)]]
- [[NestJS-Caching-Integration|NestJS 캐시 통합 패턴]]
