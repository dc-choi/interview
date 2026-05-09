---
tags: [database, cache, distributed, consistent-hashing, sharding]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Consistent Hashing", "일관 해싱", "Hash Ring"]
---

# Consistent Hashing

분산 캐시·DB·로드밸런서에서 **노드 추가/제거 시 재배치되는 키의 비율을 최소화**하는 해싱 기법. 단순 모듈로 해싱(`hash(key) % N`)은 N이 바뀌면 거의 모든 키가 재배치되지만, Consistent Hashing은 평균 `1/N`만 재배치된다.

## 단순 모듈로 해싱의 문제

```
nodes = 4
hash(key) % 4   → 키마다 0~3번 노드에 매핑
```

노드 1개 추가 → `% 5`로 바뀌면 거의 모든 키의 매핑이 바뀜 → **캐시 미스 폭주, DB 폭격**.

| 변경 | 재배치 비율 |
|------|------------|
| 단순 모듈로 (N → N+1) | ~ (N) / (N+1) ≈ 거의 전부 |
| Consistent Hashing | 1/(N+1) — 신규 노드의 책임 슬롯만 |

## 핵심 아이디어 — Hash Ring

키와 노드를 **같은 해시 공간(예: 0 ~ 2³²-1)** 의 원형 링에 배치.

```
링 위에 노드 N1, N2, N3가 분포
키 K의 해시값을 계산 → 시계방향으로 만나는 첫 노드가 책임자
```

### 노드 추가/제거 시

- **추가**: 새 노드가 자기 위치 직전 노드의 일부 슬롯만 인계 → 그 구간 키만 재배치
- **제거**: 제거된 노드의 슬롯이 다음 노드로 흡수 → 해당 구간 키만 재배치

전체가 아니라 **링 일부 구간만 영향** — 평균 `1/N` 비율.

## Virtual Nodes — 분포 균등화

물리 노드 N개만 링에 두면 분포가 불균형. **노드당 가상 노드 V개** (예: 150)를 링에 배치하여 균등화.

| 측면 | 효과 |
|------|------|
| 분포 표준편차 | V↑ → 표준편차 ↓ (V=150이면 ±5% 수준) |
| 노드 추가/제거 시 영향 | 가상 노드들이 여러 위치에 흩어져 있어 부담 분산 |
| 노드 이질성 표현 | 큰 노드는 V를 늘려 더 많은 키 받기 가능 |

```
N1 → N1#1, N1#2, ..., N1#150 각각 다른 hash로 링에 배치
N2 → N2#1, N2#2, ..., N2#150 ...
```

V는 보통 100-200. 너무 작으면 분포 불균형, 너무 크면 메모리·검색 비용↑.

## 키 → 노드 조회 — 이진 탐색 O(log N·V)

링은 **정렬된 해시 배열**로 표현 (구현은 정렬 배열 + 이진 탐색).

```
sortedHashes = [h1, h2, h3, ..., hM]   (M = N · V)
1. hash(key) 계산
2. sortedHashes에서 해시값 이상의 첫 위치 이진 탐색
3. 끝을 넘어가면 sortedHashes[0]으로 wrap-around
4. 해당 hash → 노드 매핑 반환
```

조회 O(log M), 노드 추가/제거 O(M log M) (링 재정렬).

## Hot Spot 대응

| 패턴 | 해결 |
|------|------|
| 특정 키에 트래픽 집중 | 해당 키만 **별도 캐시 레이어** 또는 로컬 캐시 백킹 |
| 특정 노드에 가상 노드가 많이 몰림 | V 증가, 또는 해시 함수 변경 (MD5·xxhash) |
| 노드 간 처리 능력 차이 | 큰 노드의 V를 늘려 가중치 부여 |

## 실제 시스템 사례

| 시스템 | 적용 |
|--------|------|
| **Memcached client (libmemcached)** | Consistent Hashing 기본 |
| **DynamoDB** | Virtual Node 기반 파티셔닝 |
| **Cassandra** | Token Ring (Consistent Hashing 변형) |
| **Riak** | Consistent Hashing |
| **Redis Cluster** | Hash Slot 16384개로 단순화 ([[Redis-Cluster-Sharding]]) |

### Redis Cluster vs Consistent Hashing

Redis Cluster는 **고정 16384 슬롯**을 노드들이 나눠 가짐 — Consistent Hashing의 Virtual Node 개념이지만 슬롯 수가 고정.

| 측면 | Consistent Hashing | Redis Cluster Hash Slot |
|------|-------------------|------------------------|
| 슬롯 수 | 가변 (N · V) | 16384 고정 |
| 노드 추가 | 링 재계산 | 슬롯 재할당 |
| 키 라우팅 | hash → 시계방향 노드 | hash → 슬롯 → 노드 |
| 운영 단순성 | 복잡 (V 튜닝) | 단순 (고정 슬롯) |

대규모 일반 분산 캐시는 Consistent Hashing, Redis 자체는 Cluster Slot을 쓴다.

## Bounded-Load Consistent Hashing

표준 Consistent Hashing의 약점: **분포 균등** ≠ **부하 균등**. hot 키가 한 노드에 몰리면 그 노드만 과부하.

Bounded-Load는 노드별 **최대 부하 한도** 설정 — 한도 초과 시 다음 노드로 fallback. Google Maglev·HAProxy 등이 채택.

## 흔한 실수

- **Virtual Node 안 두고 운영** — 분포 매우 불균형. V=100+ 권장
- **노드 ID에 포트만** — 같은 호스트의 여러 인스턴스 구분 안 됨. host+port+pid
- **링 재정렬 매 요청** — 한 번 정렬 후 캐시. 노드 변경 시만 재정렬
- **해시 함수 약함** — 분포 편향. MD5·xxhash·CityHash 등 사용
- **Hot spot 무시** — 분포가 균등해도 트래픽이 균등하다는 보장 없음. Bounded-Load 검토
- **Memcached의 다중 클라이언트가 다른 알고리즘** — 같은 키가 다른 노드로. ketama 같은 표준 합의 필수

## 면접 체크포인트

- 단순 모듈로 해싱이 노드 변경 시 폭주하는 이유 (재배치 비율)
- Hash Ring과 시계방향 매핑 원리
- Virtual Node가 분포 균등화에 기여하는 방식 (V 값과 표준편차 관계)
- 키 조회의 시간복잡도 (이진 탐색 O(log M))
- Redis Cluster의 16384 Hash Slot이 Consistent Hashing의 단순화 변형인 이유
- Bounded-Load — 분포 균등 ≠ 부하 균등
- DynamoDB·Cassandra·Memcached client 사례

## 출처
- [TS Backend Meetup — NestJS 캐싱 전략 정리]

## 관련 문서
- [[Cache-Strategies|Cache 전략]]
- [[Multi-Level-Cache|Multi-Level Cache]]
- [[Hot-Key|Hot key 대응]]
- [[Redis-Cluster-Sharding|Redis Cluster · Hash Slot]]
- [[Distributed-Lock|분산 락]]
