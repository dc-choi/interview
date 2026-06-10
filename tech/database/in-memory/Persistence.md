---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Persistence"]
---

# Persistence

인메모리 데이터 스토어라 서버 재시작시 모든 데이터가 유실됨. 복제 기능을 사용해도 데이터 유실에 대해 안전하지 않음.

따라서 redis를 캐시 이외의 용도로 사용한다면 적절한 데이터 백업이 필요함.

## AOF (append only file)
```
데이터를 변경하는 커맨드가 들어오면 커맨드를 그대로 모두 저장함. 데이터가 커지게 됨. 따라서 주기적으로 압축해서 재 작성되는 과정을 거쳐야 함.

레디스 프로토콜 형태로 저장됨.

자동으로 생성하는 방법은 redis.conf 파일에서 auto-aof-rewrite-pertenage 옵션을 세팅한다.

수동으로 생성하는 방법은 BGREWRITEAOF 커맨드를 사용해서 CLI 창에서 수동으로 AOF 파일 저장
```

## RDB
```
스냅샷 방식을 사용하기 때문에 저장 당시의 메모리에 있는 데이터 그대로 파일로 저장함.

바이너리 파일 형태로 저장됨.

자동으로 생성하는 방법은 redis.conf 파일에서 save 옵션을 세팅한다.

수동으로 생성하는 방법은 BGSAVE 커맨드를 사용해서 CLI 창에서 수동으로 RDB 파일 저장.
```

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
```
백업은 필요하지만 어느정도 데이터 손실이 발생해도 괜찮은 경우
RDB 단독으로 사용.

장애 직전 상황까지 모든 데이터가 보장되어야 하는 경우
AOF 사용. 이때 APPENDFSYNC 옵션이 everysec인 경우 최대 1초 사이의 데이터 유실 가능성 존재

제일 강력한 내구성이 필요한 경우
둘 다 사용.
```

## 관련 문서
- [[Redis-Architecture|Redis architecture]]
- [[Operations|운영 팁]]
