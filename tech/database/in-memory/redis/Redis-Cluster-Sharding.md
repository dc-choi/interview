---
tags: [database, redis, cluster, sharding, hash-slot, gossip]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Redis Cluster", "Hash Slot", "Redis Consistent Hashing", "Gossip Protocol"]
verified_at: 2026-09-03
---

# Redis Cluster, Sharding

Redis Cluster는 16384개 Hash Slot로 키를 자동 분산하는 분산 모드다. 다수의 마스터와 각 장애 마스터를 대체할 레플리카가 남아 있는 조건에서는 장애 중에도 일부 가용성을 제공하지만, 큰 네트워크 분할까지 보장하는 고가용성 모델은 아니다. Sentinel(HA 중심), 자체 클라이언트 샤딩과 다른 차원의 추상화다.

## 단일 vs Sentinel vs Cluster

| 측면 | 단일 | Sentinel | Cluster |
|------|------|----------|---------|
| HA | ✗ | ✅ 자동 페일오버 | ✅ 자동 페일오버 |
| 샤딩 | ✗ | ✗ | ✅ 16384 슬롯 분산 |
| 일반 토폴로지 | 1 노드 | 마스터, 레플리카와 Sentinel quorum | 여러 마스터와 레플리카, 운영에서는 보통 3개 이상 마스터 |
| 클라이언트 | 단일 주소 | Sentinel 주소 풀 | 클러스터 인식 클라이언트 |
| 데이터 한계 | 단일 노드 메모리 | 단일 마스터 한계 | 노드 수만큼 확장 |

작은 워크로드는 단일 + Sentinel, 메모리, 트래픽이 한 노드 한계 넘으면 Cluster.

## 16384 Hash Slot

```
slot = CRC16(key) mod 16384
```

안정 상태에서 각 슬롯은 한 마스터가 담당한다. 노드 추가/삭제 시 슬롯 단위로 마이그레이션한다. **CRC16 + 16384** 조합 이유:
- 16384는 2^14 — 비트 단위 분배, gossip 메시지에 들어가기 좋은 크기.
- 노드당 슬롯 수가 충분히 미세 — 100노드도 노드당 ~163 슬롯, 균등 분산 가능.
- 65536(2^16)이면 gossip 페이로드 4배 — 운영 비용 큼.

```
CLUSTER KEYSLOT mykey       # 키의 슬롯 번호
CLUSTER NODES                # 모든 노드 + 담당 슬롯 범위
CLUSTER SHARDS               # 슬롯 범위별 shard와 노드, Redis 7.0+
```

## Hash Tag — 같은 슬롯 강제

여러 키를 같은 슬롯에 묶고 싶을 때 (트랜잭션, Lua, MULTI/EXEC가 한 슬롯 안에서만 가능). `{}` 안의 부분만 해시.

```
SET user:{1000}:profile  ...
SET user:{1000}:cart     ...
# 둘 다 CRC16("1000") mod 16384 = 같은 슬롯
```

남용하면 hot slot 발생 — 같은 사용자 데이터처럼 자연스러운 묶음에만.

## Gossip Protocol

노드 간 **클러스터 상태 정보 교환** 프로토콜. 별도 마스터, 코디네이터 없이 모든 노드가 동등.

| 측면 | Gossip |
|------|--------|
| 통신 | PING/PONG (TCP, 클러스터 버스 포트) |
| 주기 | 보통 매초 몇 개의 무작위 노드에 PING. `NODE_TIMEOUT` 절반 동안 PING/PONG이 없는 노드는 별도로 PING |
| 정보 | 노드 ID, 주소, 슬롯 할당, 플래그(MASTER/SLAVE/FAIL) |
| 장애 감지 | `cluster-node-timeout` 초과 시 PFAIL → 과반 동의 시 FAIL |

장점: 단일 장애점 없음, 부분 분할에 강함. 단점: **수렴 시간**이 있음 — 큰 클러스터에서 상태 전파에 수십 초.

### 장애 페일오버

1. 마스터 A가 응답 없음 → 다른 노드들이 PFAIL 마킹.
2. 과반수 마스터가 PFAIL 동의 → FAIL.
3. A의 레플리카 중 하나가 election 시작 (delay = data freshness 기반).
4. 과반수 마스터의 투표 받으면 마스터로 승격, 슬롯 인계.

레플리카 없는 마스터가 죽으면 그 슬롯 데이터는 **읽기, 쓰기 불가** — `cluster-require-full-coverage no`로 부분 운영 가능하지만 권장 X.

## MOVED / ASK 리다이렉션

클라이언트가 잘못된 노드에 요청하면 응답으로 올바른 노드 안내.

| 응답 | 의미 | 클라이언트 동작 |
|------|------|---------------|
| `MOVED 12345 10.0.0.2:6379` | 슬롯 12345는 영구히 다른 노드 | 슬롯 매핑 갱신, 재요청 |
| `ASK 12345 10.0.0.3:6379` | 슬롯이 마이그레이션 중 (일시) | 일회성 재요청, 매핑은 유지 |

스마트 클라이언트는 부팅 시 `CLUSTER SHARDS`로 매핑을 캐싱하고 `MOVED`를 받으면 갱신한다. `CLUSTER SHARDS`는 Redis 7.0부터 사용할 수 있고, `CLUSTER SLOTS`는 Redis 7.0부터 deprecated지만 호환을 위해 남아 있다. 키의 슬롯을 계산해 대상 노드에 직접 보내므로 정상 경로에 클러스터 메타데이터 조회를 추가하지 않는다.

## Resharding — 슬롯 마이그레이션

```bash
redis-cli --cluster reshard 10.0.0.1:6379 \
  --cluster-from <src-node-id> --cluster-to <dst-node-id> \
  --cluster-slots 1000 --cluster-yes
```

내부 동작:
1. 대상 노드에서 슬롯을 `IMPORTING <source-node-id>` 상태로 전환.
2. 소스 노드에서 같은 슬롯을 `MIGRATING <destination-node-id>` 상태로 전환.
3. `GETKEYSINSLOT`으로 키를 가져와 키 단위로 `MIGRATE`.
4. 마이그레이션 중 아직 소스에 없는 키 요청은 `ASK`로 대상에 일회성 리다이렉트.
5. 이동이 끝나면 관련 노드에서 슬롯 소유자를 대상 노드로 `SETSLOT ... NODE` 확정하고 gossip로 전파.

데이터량 클수록 시간 소요 — 트래픽 패턴 안정 시간대에 진행. 대안: `redis-cli --cluster rebalance`로 자동 균등화.

## Consistent Hashing — Cluster 비교

Redis Cluster는 **고정 16384 슬롯 모델**이며 공식 문서상 Consistent Hashing이 아니라 해시 슬롯이라는 별도 샤딩 방식이다. 일반 Consistent Hashing과 차이:

| 측면 | Consistent Hashing | Redis Cluster |
|------|---------------------|---------------|
| 키 공간 | 큰 ring (2^32 등) | 16384 슬롯 |
| 노드 위치 | 해시값 ring 위 | 슬롯 범위 명시 할당 |
| Virtual Nodes | hot spot 회피용 권장 | 슬롯 자체가 가상 단위 |
| 노드 추가 | 인접 노드 데이터 이동 | 슬롯 단위 명시 마이그레이션 |
| Rebalancing | 해시 함수 의존 | 운영자 명시 |

Redis Cluster 모델의 강점: **운영자가 슬롯 분배를 정확히 제어**. 약점: 슬롯 수가 16,384로 고정되어 키가 많은 슬롯은 이동 단위가 거칠 수 있다. 명세는 권장 최대 규모를 약 1,000 노드로 설명한다.

## Cluster의 한계

- **Multi-key 명령 한 슬롯 제한** — `MGET`, `MULTI`, Lua가 모든 키 같은 슬롯이어야 함. Hash Tag로 우회.
- **트랜잭션 단일 슬롯** — 분산 트랜잭션 없음.
- **DB select 0만** — 일반 모드의 `SELECT 1` 안 됨.
- **Pub/Sub 전 노드 브로드캐스트** — 7.0의 Sharded Pub/Sub로 일부 해소.
- **클라이언트 라이브러리 의존** — 클러스터 인식 클라이언트 필수 (ioredis Cluster, redis-py의 `RedisCluster`, Lettuce). `redis-py-cluster`는 EOL이며 저장소가 아카이브됐다.

## 흔한 실수

- **Hash Tag 남용** → hot slot 발생, 분산 효과 사라짐.
- **레플리카 없는 마스터** 운영 → 단일 노드 죽음 = 슬롯 데이터 불가.
- **`cluster-require-full-coverage no`로 운영** → 일부 슬롯이 비가용해도 나머지 슬롯 요청이 계속되므로 오류 처리와 데이터 완전성 요구를 별도로 검토.
- **MGET 무지하게 다중 슬롯에** → CROSSSLOT 에러. 클라이언트 측 분배 필요.
- **Resharding을 피크 트래픽 시간에** → 마이그레이션 부하로 응답 지연.
- **Sentinel 클라이언트로 Cluster 접근** → 동작 안 함. 클러스터 인식 클라이언트.
- **Hash Tag 패턴 일관성 없음** → 같은 사용자 데이터가 다른 슬롯에 — 트랜잭션 깨짐.

## 면접 체크포인트

- Sentinel vs Cluster 차이 — HA만 vs HA + 샤딩
- 16384 Hash Slot + CRC16 — 왜 16384인지 (gossip 비용)
- Hash Tag `{...}`로 같은 슬롯 강제하는 의의와 함정
- Gossip Protocol 동작 — PING/PONG, PFAIL → FAIL 합의
- 페일오버 흐름 — election + delay
- MOVED vs ASK 리다이렉션 차이
- Resharding 동작 (`IMPORTING`, `MIGRATING`, `MIGRATE`, `ASK`, `NODE`)
- Consistent Hashing과의 비교 — 고정 슬롯 vs ring
- Cluster 한계 — multi-key 단일 슬롯, 트랜잭션 제한, DB select 0

## 출처

- [Redis Documentation, Redis Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
- [Redis Documentation, CLUSTER SHARDS](https://redis.io/docs/latest/commands/cluster-shards/)
- [Redis Documentation, CLUSTER SLOTS](https://redis.io/docs/latest/commands/cluster-slots/)
- [Redis Documentation, CLUSTER SETSLOT live resharding](https://redis.io/docs/latest/commands/cluster-setslot/#redis-cluster-live-resharding-explained)
- [Redis Documentation, SELECT](https://redis.io/docs/latest/commands/select/)
- [Redis Documentation, Scale with Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [redis-py-cluster repository, End of Life](https://github.com/Grokzen/redis-py-cluster/blob/master/README.md)

## 관련 문서

- [[Redis-Architecture|Redis architecture]]
- [[Redis-Internal-Encoding|Redis 내부 인코딩]]
- [[Sharding|샤딩 일반론]]
- [[Hot-Key|Hot key 대응]]
- [[Distributed-Lock|분산 락 (Cluster 환경)]]
