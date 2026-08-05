---
tags: [database, redis, cache]
status: done
verified_at: 2026-08-05
category: "Data & Storage - Cache & KV"
aliases: ["Persistence"]
---

# Persistence

인메모리 데이터 스토어라 서버 재시작시 모든 데이터가 유실됨. 복제 기능을 사용해도 데이터 유실에 대해 안전하지 않음.

따라서 redis를 캐시 이외의 용도로 사용한다면 적절한 데이터 백업이 필요함.

## AOF (append only file)

서버가 받은 쓰기 커맨드를 순서대로 파일에 덧붙이고, 재시작 시 이를 재생해 원래 데이터셋을 복원한다. 커맨드는 레디스 프로토콜과 같은 형식으로 기록된다. 로그가 계속 커지므로 주기적으로 현재 상태 기준의 최소 명령 집합으로 재작성(rewrite)해야 한다.

`redis.conf`에서 `appendonly yes`로 활성화한다. 자동 재작성 기준은 `auto-aof-rewrite-percentage` 옵션으로 설정하고, 수동 재작성은 `BGREWRITEAOF` 커맨드로 실행한다.

## RDB

지정한 시점의 데이터셋을 스냅샷으로 남긴다. 저장 당시 메모리에 있던 데이터가 그대로 바이너리 파일(기본 `dump.rdb`)로 기록된다.

자동 저장은 `redis.conf`의 `save` 옵션으로 N초 동안 M개 이상 변경이 있을 때 스냅샷을 만들도록 지정한다(예: `save 60 1000`). 수동 저장은 `BGSAVE` 또는 `SAVE` 커맨드로 실행한다.

### RDB 내부 동작

| 메커니즘 | 의미 |
|----------|------|
| **fork() + Copy-on-Write** | 자식 프로세스가 부모 메모리 페이지 공유 → 부모 쓰기 시점에만 페이지 복사 |
| **LZF 압축** | 문자열 값이 일정 크기 넘으면 LZF 압축 |
| **CRC64 체크섬** | 파일 끝에 64bit CRC, 무결성 검증 |
| BGSAVE | 자식이 디스크 쓰기, 부모는 계속 서비스 |

**Copy-on-Write의 함정**: 부모가 RDB 진행 중 대량 쓰기 → 페이지 복사로 메모리 사용량 일시 2배까지. `vm.overcommit_memory = 1` (Linux) 설정 권장.

```bash
redis-check-rdb dump.rdb     # 파일 무결성 검증
```

## fsync 정책 — AOF 핵심

`appendfsync` 설정으로 OS 디스크 쓰기 주기 결정. **성능과 내구성의 직접적 트레이드오프**.

| 정책 | 동작 | 손실 가능 |
|------|------|----------|
| `always` | 매 명령마다 fsync | ~0 (가장 안전, 가장 느림) |
| `everysec` (기본) | 1초마다 fsync | 최대 1초 |
| `no` | OS에 맡김 | OS, 디스크 정책에 따름 |

`everysec`이 운영 표준. 결제 등 손실 절대 금지면 `always`지만 처리량 크게 떨어짐.

## AOF Rewrite

AOF는 **명령 로그**라 시간이 지날수록 비대 — `LPUSH 100번` 같은 누적이 그대로 쌓임. Rewrite는 **현재 메모리 상태 기준으로 최소 명령 집합 재작성**.

```
auto-aof-rewrite-percentage 100   # 직전 rewrite 대비 100% 증가하면
auto-aof-rewrite-min-size 64mb    # 최소 64MB 이상일 때 자동 rewrite
```

수동: `BGREWRITEAOF`. RDB와 같은 fork + COW 모델.

## Multi-Part AOF (7.0+)

```
appendonlydir/
├── appendonly.aof.1.base.rdb     # 베이스 스냅샷 (RDB 형태)
├── appendonly.aof.1.incr.aof     # 베이스 이후 증분
└── appendonly.aof.manifest       # 매니페스트
```

7.0 이전엔 단일 AOF 파일 — rewrite 중 디스크 2배 필요. Multi-Part는 base + incr 분리로 **rewrite 비용, 디스크 사용량 ↓**.

## 복제와 Persistence

레플리카는 **자체 Persistence와 무관하게 마스터에서 데이터 받음**:
- Full sync: 마스터가 RDB 만들어 전송
- Partial sync: PSYNC + replication offset
- 마스터, 레플리카 둘 다 Persistence 끄면 재시작 시 빈 DB로 시작 — **데이터 영구 유실**

레플리카만 Persistence 켜는 것도 옵션 (마스터 부하 절감).

## 선택 기준

백업은 필요하지만 재해 상황에서 몇 분 정도의 데이터 손실을 감수할 수 있으면 RDB 단독으로 충분하다.

PostgreSQL에 준하는 수준의 데이터 안전성이 필요하면 두 방식을 함께 쓴다. 공식 문서는 AOF 단독 사용은 권장하지 않는데, 백업과 빠른 재시작, AOF 엔진 자체의 버그 대비를 위해 주기적인 RDB 스냅샷이 여전히 유용하기 때문이다.

AOF를 켜도 손실이 0이 되지는 않는다. `appendfsync everysec`이면 재해 시 최대 1초 분량의 쓰기가 유실될 수 있고, 이를 더 줄이려면 `always`를 써야 하지만 처리량 손해가 크다.

## 출처
- [Redis Docs, Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)

## 관련 문서
- [[Redis-Architecture|Redis architecture]]
- [[Operations|운영 팁]]
