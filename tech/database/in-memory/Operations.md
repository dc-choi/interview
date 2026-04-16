---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["운영 팁", "Operations"]
---

# 운영 팁

## 싱글 스레드 주의사항
레디스는 싱글 스레드로 동작함. 한 사용자가 오래 걸리는 커맨드를 사용하면 나머지 요청들은 대기하게 됨.

- `keys` 대신 `scan` 사용
- hash나 sorted set의 경우 키 내부에 데이터가 많아질수록 성능 저하 -> 하나의 키에 100만개 이상 저장하지 않기
- 데이터가 많은 키 조회 시 `hgetall` 대신 `hscan` 사용
- 데이터가 많은 키 삭제 시 `del` 대신 `unlink` 사용 (백그라운드 삭제)

## MAXMEMORY-POLICY
- 캐시로 사용 시 expire-time 설정 필수, 미설정 시 메모리 가득 참
- 기본값은 메모리가 가득 차면 입력을 거부하므로 장애 발생 가능
- `allkeys-lru`로 설정하면 expire-time이 없는 데이터부터 LRU로 삭제됨

## STOP-WRITES-ON-BGSAVE-ERROR
```
기본값은 yes, 이 옵션은 RDB 파일을 저장할 경우 장애가 발생하면 모든 쓰기 작업을 차단한다.

적절하게 모니터링을 하고 있다면 이 옵션은 끄는게 좋다.
```

## MaxMemory 값 설정
```
RDB 설정 & AOF rewrite시 fork()

Copy-on-Write로 인해 메모리를 두배로 사용하는 경우 발생 가능.

Persistence / 복제 사용 시 MaxMemory는 실제 메모리의 절반으로 설정.
```

## Memory 관리
```
물리적으로 사용하고 있는 메모리를 모니터링 해야 함

used_memory가 아닌 used_memory_rss값을 모니터링 해야 함.

실제 저장된 데이터는 적은데 rss값은 큰 상황이 발생할 수 있음. 이 차이가 클 때 fragmention이 크다고 말함.

주로 삭제되는 키가 많을 때 fragmention이 증가함.

fragmention이 크게 증가한 경우 activefrag라는 옵션을 키면 도움이 됨.

이 옵션은 단편화가 많이 발생한 경우 키는 것을 권장함.
```

## 대규모 운영 전략

수백~수천 인스턴스 규모 Redis 운영에서 반복 관찰되는 패턴.

### HA 구성 선택

| 구성 | 특징 |
|---|---|
| **1 Primary + N Replica** | 안정성 최상, 비용 큼 |
| **1 Primary + 1 Replica** | 비용·안정성 균형. 대규모 운영에서 가장 흔한 선택 |
| **단독 Primary** | 장애 시 서비스 중단. 캐시 전용 한정 |

Primary 장애 시 자동 승격(failover) + **고사양 예비 장비를 미리 준비** 해 임시 Replica 즉시 추가. Primary 단독 상태가 장기화되지 않게.

### 클라우드 오토 힐링

- 인스턴스 점검·이상 감지 시 **새 서버 발급 → 추가 → 기존 서버 반납** 을 자동화
- 물리 서버는 교체 리드 타임이 길어 야간 당직 부담. 클라우드는 빠른 교체로 당직 부담 급감
- 복제 지연·RDB/AOF snapshot 시간을 고려해 순차 교체

### 저사용 리소스 최적화 (Low Usage Project)

대규모 Redis 운영에서 가장 큰 낭비는 **과다 프로비저닝**. 체계화된 절감 프로세스:

1. **저사용 판단 기준 수립** — 명령어 발행률·시스템 사용량의 임계치
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
- **어떻게 해야 하는가** — 설정 가이드·체크리스트

효과: 운영팀이 일일이 설득하지 않아도 **사용팀이 자발적으로** 최적화 참여.

### 모니터링 지표 권장 목록

- **처리량**: `commandstats`, 초당 명령어
- **메모리**: `used_memory_rss`, `mem_fragmentation_ratio`
- **연결**: `connected_clients`, 거부된 연결
- **복제**: `master_link_status`, `master_last_io_seconds_ago`
- **persistence**: `rdb_last_bgsave_status`, `aof_last_rewrite_status`
- **슬로우 쿼리**: `slowlog`
- **키 만료율·hit rate**

## 관련 문서
- [[Redis-Architecture|Redis architecture]]
- [[Persistence]]
