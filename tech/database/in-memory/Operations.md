---
tags: [database, redis, cache]
status: done
verified_at: 2026-07-21
category: "Data & Storage - Cache & KV"
aliases: ["운영 팁", "Operations"]
---

# 운영 팁

## 싱글 스레드 주의사항
Redis의 명령 실행은 주로 단일 스레드에서 직렬 처리된다. 네트워크 I/O 스레드와 persistence, lazy free, active defragmentation 같은 백그라운드 작업도 있지만, 오래 걸리는 명령은 명령 처리 루프를 막아 다른 요청을 지연시킬 수 있다.

- `keys` 대신 `scan` 사용
- hash나 sorted set의 한 키가 매우 커지면 단일 명령 지연, migration과 장애 복구 비용이 커질 수 있다. 고정 100만 개 기준 대신 실제 원소 크기와 명령 latency를 측정해 big key 기준을 정한다.
- 데이터가 많은 키 조회 시 `hgetall` 대신 `hscan` 사용
- 데이터가 많은 키 삭제 시 `del` 대신 `unlink` 사용 (백그라운드 삭제)

## MAXMEMORY-POLICY
- 데이터의 유효기간이 있으면 TTL을 설정하고, 메모리 압력에서 어떤 키를 내보낼지는 eviction policy로 별도 설계한다. `allkeys-*` 정책은 TTL 없는 키도 내보낼 수 있어 모든 캐시 키에 TTL이 기술적으로 필수인 것은 아니다.
- 기본 `noeviction`은 `maxmemory`에 도달하면 새 데이터가 필요한 쓰기 명령에 오류를 반환하므로 캐시 용도에서는 의도한 정책인지 확인한다.
- `allkeys-lru`는 TTL 여부와 무관하게 모든 키 중 근사 LRU 후보를 삭제한다. TTL 있는 키만 지우려면 `volatile-*` 계열 정책을 사용한다.

## STOP-WRITES-ON-BGSAVE-ERROR

기본값 `yes`는 RDB 저장 실패를 감지하면 쓰기를 중단해, 운영자가 persistence 장애를 놓친 채 데이터 변경을 계속 받는 상황을 막는 안전장치다. 단순히 모니터링이 있다는 이유로 끄지 않는다. 캐시처럼 영속성이 불필요하거나 별도 복구, 알림 체계가 있고 가용성을 더 우선하는 워크로드에서만 데이터 내구성 트레이드오프를 검토한 뒤 변경한다.

## MaxMemory 값 설정

RDB 저장과 AOF rewrite는 `fork()` 후 Copy-on-Write 메모리를 추가로 사용할 수 있다. 그렇다고 `maxmemory`를 항상 물리 메모리의 절반으로 고정하지는 않는다. 실제 쓰기율과 fork 시 COW 피크, 복제 버퍼, 클라이언트 버퍼, allocator 단편화, OS 여유분을 함께 측정해 headroom을 정한다. `INFO memory`의 피크와 persistence 시 RSS 증가를 부하 테스트로 확인한다.

## Memory 관리

논리적으로 할당한 `used_memory`와 운영체제가 관찰하는 `used_memory_rss`를 함께 본다. 두 값의 차이와 `mem_fragmentation_ratio`, peak memory, fork COW를 같이 봐야 데이터 증가와 allocator, OS 단편화를 구분할 수 있다. 삭제가 많은 워크로드에서 RSS가 충분히 줄지 않을 수 있으며, 원인을 확인한 뒤 `activedefrag` 사용과 allocator purge, 재시작 같은 대안을 검토한다.

## 대규모 운영 전략

수백~수천 인스턴스 규모 Redis 운영에서 반복 관찰되는 패턴.

### HA 구성 선택

| 구성 | 특징 |
|---|---|
| **1 Primary + N Replica** | 읽기 분산과 복구 선택지가 늘지만 복제 비용과 운영 복잡도 증가 |
| **1 Primary + 1 Replica** | 최소한의 자동 failover 후보를 두는 구성. 장애 도메인과 복구 목표를 별도 검토 |
| **단독 Primary** | 장애 시 서비스 중단. 캐시 전용 한정 |

Primary 장애 시 자동 승격 이후 새 replica 보충과 재동기화 부하를 자동화한다. 예비 용량 방식은 RTO, 클라우드 증설 시간과 비용에 맞춰 사전 할당 또는 즉시 프로비저닝 중 선택한다.

### 클라우드 오토 힐링

- 인스턴스 점검, 이상 감지 시 **새 서버 발급 → 추가 → 기존 서버 반납** 을 자동화
- 물리 서버는 교체 리드 타임이 길어 야간 당직 부담. 클라우드는 빠른 교체로 당직 부담 급감
- 복제 지연, RDB/AOF snapshot 시간을 고려해 순차 교체

### 저사용 리소스 최적화 (Low Usage Project)

대규모 Redis 운영에서 과다 프로비저닝은 반복 점검할 비용 요인 중 하나다. 체계화된 절감 프로세스:

1. **저사용 판단 기준 수립** — 명령어 발행률, 시스템 사용량의 임계치
2. **대상 식별과 추적** — 지속 저사용인지, 특정 시즌만인지
3. **조치 선택**:
   - **스케일 인**: 클러스터 샤드 수 감소
   - **스케일 다운**: 서버 스펙 축소
   - **반납/해지**: 사용 안 하는 인스턴스
4. **HA 유지하며 작업** — 서비스 중단 없이

### 사용자 중심 대시보드

운영자가 "왜 내 인스턴스가 저사용으로 찍혔지?"를 한 번에 보도록:

- **왜 필요한가** — 저사용 판단 근거(지표)
- **무엇을 해야 하는가** — 반납/축소 요청 링크
- **어떻게 해야 하는가** — 설정 가이드, 체크리스트

효과: 운영팀이 일일이 설득하지 않아도 **사용팀이 자발적으로** 최적화 참여.

### 모니터링 지표 권장 목록

- **처리량**: `commandstats`, 초당 명령어
- **메모리**: `used_memory`, `used_memory_rss`, `mem_fragmentation_ratio`, peak memory, fork COW
- **연결**: `connected_clients`, 거부된 연결
- **복제**: `master_link_status`, `master_last_io_seconds_ago`
- **persistence**: `rdb_last_bgsave_status`, `aof_last_rewrite_status`
- **슬로우 쿼리**: `slowlog`
- **키 만료율, hit rate**

## 관련 문서
- [[Redis-Architecture|Redis architecture]]
- [[Persistence]]
- [[Capacity-Planning|캐퍼시티 플래닝]] — IOPS, UsedMemory 기반 가용량 판단과 클러스터 분리 사례

## 출처

- [Redis latency optimization](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)
- [Redis INFO command](https://redis.io/docs/latest/commands/info/)
