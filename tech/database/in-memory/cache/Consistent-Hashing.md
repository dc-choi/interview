---
tags: [database, cache, distributed, consistent-hashing, sharding]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Consistent Hashing", "일관 해싱", "Hash Ring"]
---

# Consistent Hashing

분산 캐시, DB, 로드밸런서에서 **노드 추가/제거 시 재배치되는 키의 비율을 최소화**하는 해싱 기법. 단순 모듈로 해싱(`hash(key) % N`)은 N이 바뀌면 거의 모든 키가 재배치되지만, Consistent Hashing은 평균 `1/N`만 재배치된다.

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

적절한 V는 노드 수와 트래픽에 따라 다르다. 분포 불균형과 메모리, 검색 비용을 함께 확인한다.

## 링 크기, 메모리와 교체

노드 i의 point 수를 `V_i`라 하면 전체 point 수는 `M = Σ_i V_i`이며 저장 공간은 `M`에 비례한다. point를 늘리면 분포 오차는 줄지만 개선 폭은 작아지고, 유한한 해시 공간에서는 충돌 영향이 커진다. point 수는 노드 수, 가중치, 해시 폭, 메모리와 허용 오차를 함께 측정해 정한다.

### 모델, 시뮬레이션과 사례를 구분한다

- **모델**: `CV = sqrt((N - 1) / (N*k + 1))`에서 CV는 노드 담당 범위의 변동계수(표준편차/평균)다. 동일 가중치의 `N`개 노드가 각각 `k = V`개의 무작위 point를 갖는 연속 링이며 충돌이 없다고 가정한다.
- **시뮬레이션**: 가중 링은 위 식을 그대로 적용하지 않고 `V_i`, 유한한 해시 폭과 실제 가중치를 넣어 평가한다. 32비트, 2,048 노드의 한 실험에서는 노드당 10,000에서 100,000 point로 늘릴수록 충돌 영향이 커졌다.
- **프로덕션 사례**: Cloudflare는 2026년 Pingora Backend Router(PBR)에서 point를 90% 줄였고, 이전 링 제거 뒤 전 세계 메모리가 100TB 감소했다고 보고했다. 해당 워크로드의 관측이다.

### point 저장 형식

`u32` 해시와 `u16` 노드 인덱스로 충분하고 노드 수가 `2^16` 미만이면 6바이트 point를 검토한다. Rust는 정렬 때문에 필드만 줄여도 8바이트일 수 있으므로 raw byte 배열이나 명시적 레이아웃을 벤치마크한다. Cloudflare의 8바이트에서 6바이트 전환에 따른 25% 절감은 그 저장 형식의 결과다.

### 캐시 링의 점진적 교체

링 교체는 캐시 미스와 origin 트래픽을 늘릴 수 있다. 이전과 새 링을 함께 두고 요청 해시로 안정적으로 선택하면 롤백할 수 있다. 작은 데이터센터부터 확대하며 트래픽 비율과 위치를 따로 제어하고, 링 버전별 선택, 캐시와 origin 트래픽, 오류, 메모리와 시작 시간을 관측한다. 이전 링은 전면 적용 뒤 제거한다.

## 키 → 노드 조회 — 이진 탐색 O(log N×V)

링은 **정렬된 해시 배열**로 표현 (구현은 정렬 배열 + 이진 탐색).

```
sortedHashes = [h1, h2, h3, ..., hM]   (M = N × V)
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
| 특정 노드에 가상 노드가 많이 몰림 | V 증가, 또는 해시 함수 변경 (MD5, xxhash) |
| 노드 간 처리 능력 차이 | 큰 노드의 V를 늘려 가중치 부여 |

## 실제 시스템 사례

| 시스템 | 적용 |
|--------|------|
| **Memcached client (libmemcached-awesome v1.x)** | 기본은 `MEMCACHED_DISTRIBUTION_MODULA`. Consistent Hashing은 별도 설정 |
| **Dynamo (2007 논문)** | Virtual Node 기반 Consistent Hashing 링 |
| **DynamoDB (AWS 서비스)** | 파티션 키 해시로 연속 key-range 파티션을 정하고 필요할 때 분할. Consistent Hashing 아님 |
| **Cassandra** | Token Ring (Consistent Hashing 변형) |
| **Riak** | Consistent Hashing |
| **Redis Cluster** | 고정 16384 Hash Slot 사용. Consistent Hashing 아님 ([[Redis-Cluster-Sharding]]) |

### Redis Cluster vs Consistent Hashing

Redis Cluster는 Consistent Hashing 링 대신 `CRC16(key) mod 16384`로 고정 슬롯을 정하고, 각 슬롯을 특정 노드에 명시적으로 할당한다. 노드가 바뀌면 링을 다시 계산하는 것이 아니라 슬롯을 대상 노드로 이동한다.

| 측면 | Consistent Hashing | Redis Cluster Hash Slot |
|------|-------------------|------------------------|
| 슬롯 수 | 가변 (N × V) | 16384 고정 |
| 노드 추가 | 링 재계산 | 슬롯 재할당 |
| 키 라우팅 | hash → 시계방향 노드 | hash → 슬롯 → 노드 |
| 운영 단순성 | 복잡 (V 튜닝) | 단순 (고정 슬롯) |

두 방식 모두 노드 변경 시 전체 키를 다시 매핑하지 않도록 설계할 수 있지만 매핑 알고리즘은 다르다. 대규모 일반 분산 캐시는 Consistent Hashing을 쓸 수 있고, Redis Cluster는 고정 Hash Slot을 쓴다.

## Bounded-Load Consistent Hashing

표준 Consistent Hashing의 약점: **분포 균등** ≠ **부하 균등**. hot 키가 한 노드에 몰리면 그 노드만 과부하.

Bounded-Load는 노드별 **최대 부하 한도** 설정 — 한도 초과 시 다음 노드로 fallback. Google Cloud Pub/Sub과 HAProxy(`hash-balance-factor`) 등이 채택한다. Google Maglev는 룩업 테이블 기반의 별도 알고리즘이다.

## 흔한 실수

- **Virtual Node 안 두고 운영** — 분포 매우 불균형. V=100+ 권장
- **노드 ID에 포트만** — 같은 호스트의 여러 인스턴스 구분 안 됨. host+port+pid
- **링 재정렬 매 요청** — 한 번 정렬 후 캐시. 노드 변경 시만 재정렬
- **해시 함수 약함** — 분포 편향. MD5, xxhash, CityHash 등 사용
- **Hot spot 무시** — 분포가 균등해도 트래픽이 균등하다는 보장 없음. Bounded-Load 검토
- **Memcached의 다중 클라이언트가 다른 알고리즘** — 같은 키가 다른 노드로. ketama 같은 표준 합의 필수

## 면접 체크포인트

- 단순 모듈로 해싱이 노드 변경 시 폭주하는 이유 (재배치 비율)
- Hash Ring과 시계방향 매핑 원리
- Virtual Node가 분포 균등화에 기여하는 방식 (V 값과 표준편차 관계)
- 키 조회의 시간복잡도 (이진 탐색 O(log M))
- Redis Cluster의 16384 Hash Slot과 Consistent Hashing 링의 차이
- Bounded-Load — 분포 균등 ≠ 부하 균등
- Dynamo(2007 논문), Cassandra, libmemcached 설정 사례와 DynamoDB 반례

## 출처
- [TS Backend Meetup — NestJS 캐싱 전략 정리]
- [libmemcached-awesome source, default distribution](https://github.com/awesomized/libmemcached/blob/v1.x/src/libmemcached/memcached.cc)
- [DynamoDB at Amazon — USENIX ATC 2022](https://www.usenix.org/system/files/atc22-elhemali.pdf)
- [Maglev: A Fast and Reliable Software Network Load Balancer — Google](https://www.usenix.org/system/files/conference/nsdi16/nsdi16-paper-eisenbud.pdf)
- [Redis Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- [Saving another 100TB of RAM with math (and Rust) — Cloudflare](https://blog.cloudflare.com/saving-100-tb-of-ram-with-math/)
- [Cloudflare, 수학과 Rust로 RAM 100TB 추가 절감 — GeekNews](https://news.hada.io/topic?id=33915)

## 관련 문서
- [[Cache-Strategies|Cache 전략]]
- [[Multi-Level-Cache|Multi-Level Cache]]
- [[Hot-Key|Hot key 대응]]
- [[Redis-Cluster-Sharding|Redis Cluster, Hash Slot]]
- [[Distributed-Lock|분산 락]]
