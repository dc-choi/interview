---
tags: [database, redis, cache]
status: done
verified_at: 2026-08-25
category: "Data & Storage - Cache & KV"
aliases: ["Hot key 대응", "Hot Key"]
---

# Hot key 대응

특정 키 하나에 요청이 몰리는 키가 hot key다. Redis의 명령 처리는 주로 단일 스레드에서 직렬로 이뤄지므로 몰린 요청이 그대로 한 인스턴스의 처리 한계가 된다. Cluster에서도 한 키는 한 hash slot에 매핑되고 쓰기와 기본 읽기는 그 slot의 primary로 향한다. Replica에도 복제본은 있지만, 키를 나누지 않은 채 primary shard만 늘려서는 트래픽이 분산되지 않는다.

키 하나에 담긴 데이터가 큰 big key는 별개의 문제다. hot key는 접근 빈도, big key는 항목 크기의 문제이며, big key 기준 설정과 O(N) 명령 회피(`keys` 대신 `scan`, `hgetall` 대신 `hscan`, `del` 대신 `unlink`)는 [[Operations|운영 팁]]에서 다룬다.

## 탐지

- **redis-cli --hotkeys** — 키 공간을 SCAN으로 돌며 접근 빈도가 높은 키를 찾는다. LFU가 접근 빈도를 추적할 때만 동작하므로 `maxmemory-policy`가 `*-lfu` 계열일 때만 쓸 수 있다.
- **MONITOR 샘플링** — 서버가 처리하는 대부분의 데이터 명령을 스트리밍하므로 잠깐 붙여 키별 빈도를 집계할 수 있다. 단, MONITOR 클라이언트 하나만으로도 처리량이 절반 이하로 떨어질 수 있어 운영 장비에서는 초 단위로 짧게만 쓴다.
- **클라이언트, 프록시 측 집계** — 애플리케이션이나 프록시에서 키별 호출 수를 세면 Redis에 MONITOR 스트림 부하를 더하지 않고 상시 관측할 수 있다.
- **SLOWLOG 확인** — 실행 시간이 설정 임계값을 넘은 명령을 기록하므로 big key 때문에 느려진 명령의 단서를 준다. 일반적인 임계값에서는 빠른 O(1) hot-key 트래픽을 놓치기 쉽고, 임계값을 낮추면 기록량과 보존 한계를 함께 고려해야 한다.

## 대응

- **로컬 캐시로 흡수** — 애플리케이션 인스턴스 메모리(L1)에 짧은 TTL로 복제해 두면 Redis까지 오는 요청 자체가 줄어든다. 짧은 TTL로 불일치 윈도우를 제한한다 ([[Multi-Level-Cache|Multi-Level Cache]]).
- **키 샤딩(복제 키)** — `key:0`부터 `key:N-1`처럼 접미사를 붙여 복제하고 읽기를 분산한다. 서로 다른 primary shard나 인스턴스에 배치될 때만 처리 부하가 퍼지며, 단일 인스턴스에서는 이득이 없다. Cluster에서는 `CLUSTER KEYSLOT`과 slot map(`CLUSTER SHARDS` 또는 `CLUSTER SLOTS`)으로 실제 primary 배치를 확인한다. 분산 상한은 복제 키 수와 primary 수 중 작은 값이고, 실제 분산도는 복제 키가 배치된 서로 다른 primary 수다. 쓰기와 무효화를 모든 복제 키에 반복해야 하는 비용도 생긴다.
- **replica 읽기 분산** — 읽기 위주 hot key라면 읽기를 replica로 돌린다. 복제 지연만큼 오래된 값을 허용할 수 있어야 한다.
- **요청 병합** — 같은 키를 향한 동시 요청을 하나로 합치는 기법은 만료 순간의 폭주 대응과 겹친다 ([[Cache-Stampede|Cache stampede 방지]]).

## 관련 문서
- [[Operations|운영 팁]] — big key와 O(N) 명령 회피
- [[Cache-Stampede|Cache stampede 방지]]
- [[Multi-Level-Cache|Multi-Level Cache]]
- [[Redis-Cluster-Sharding|Redis Cluster, Sharding]]
- [[Redis-Architecture|Redis architecture]]

## 출처

- [Redis, Redis CLI](https://redis.io/docs/latest/develop/tools/cli/)
- [Redis, MONITOR](https://redis.io/docs/latest/commands/monitor/)
- [Redis, SLOWLOG](https://redis.io/docs/latest/commands/slowlog/)
- [Redis, Scale with Redis Cluster](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
- [Redis, Redis Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/)
