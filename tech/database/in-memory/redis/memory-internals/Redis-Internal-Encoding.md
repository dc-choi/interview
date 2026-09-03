---
tags: [database, redis, internal, encoding, sds, skiplist, ziplist]
status: done
verified_at: 2026-08-28
category: "Data & Storage - Cache & KV"
aliases: ["Redis Internal Encoding", "SDS", "skiplist", "ziplist", "quicklist"]
---

# Redis 내부 인코딩

Redis는 같은 자료구조 타입에도 **데이터 크기, 내용에 따라 다른 내부 인코딩**을 자동 선택해 메모리, CPU를 최적화한다. 전환 방향은 자료구조마다 다르다. Hash, Set, Sorted Set의 작은 인코딩은 큰 인코딩으로 바뀐 뒤 자동 복귀하지 않지만, Redis 7.2+의 List는 충분히 작아지면 quicklist에서 listpack으로 돌아갈 수 있다. 기본 설정에서는 `OBJECT ENCODING <key>`로 확인한다. `DEBUG OBJECT`는 Redis 7.0부터 기본 차단되며 `enable-debug-command`를 `yes` 또는 `local`로 설정하고 재시작해야 쓸 수 있다.

## 타입별 인코딩 매트릭스

| 타입 | 인코딩 | 조건 |
|------|--------|------|
| string | `int` | 정수만, 64bit 표현 가능 |
| string | `embstr` | ≤44바이트 (3.0 이하: 39바이트) |
| string | `raw` | 그 외 |
| list | `listpack` | 작은 list (7.2+) |
| list | `quicklist` | `list-max-listpack-size` 초과 시 (linked list of listpacks) |
| hash | `listpack` (구 ziplist) | entries ≤ `hash-max-listpack-entries` (기본 512) + 각 필드/값 ≤ 64B |
| hash | `hashtable` | 그 외 |
| set | `intset` | 모든 원소가 정수 + ≤ `set-max-intset-entries` (512) |
| set | `listpack` (7.2+) | 문자열 원소, entries ≤ `set-max-listpack-entries` (기본 128), 원소 ≤ 64B |
| set | `hashtable` | 그 외 |
| sorted set | `listpack` | entries ≤ `zset-max-listpack-entries` (128) + value ≤ 64B |
| sorted set | `skiplist` + hashtable | 그 외 |
| stream | `stream` | 라덱스 트리 + 압축 노드 |

Redis 7.0+는 Hash와 Sorted Set의 listpack 임계값을 제공하고, 7.2+는 Set에도 listpack 임계값을 제공한다. 임계값은 고정 상수가 아니라 설정값이므로 실제 `redis.conf`와 `OBJECT ENCODING`으로 확인한다.

## SDS — Simple Dynamic String

C의 null-terminated 문자열 한계를 극복한 자체 문자열 타입.

```
struct sdshdr {
  uint32_t len;       // 사용 중 길이
  uint32_t alloc;     // 할당 크기
  unsigned char flags;
  char buf[];
};
```

핵심:
- **`strlen()` O(1)** — `len` 필드 보관 (C는 O(N) 스캔).
- **이진 안전** — 중간에 `\0` 있어도 OK.
- **버퍼 오버플로우 방지** — alloc 체크 후 자동 확장.
- **공간 사전 할당** — 자주 늘어나는 문자열의 realloc 비용 절감.

## String 인코딩 — int / embstr / raw

| 인코딩 | 메모리 | 특징 |
|--------|--------|------|
| `int` | long 1개 (8B) + 메타 | 숫자 변환 가능 시 자동 |
| `embstr` | 1번의 alloc으로 redisObject + sds 같이 | ≤44B, 읽기 전용 (수정 시 raw로 변환) |
| `raw` | redisObject + 별도 alloc sds | 그 외 |

`APPEND`, `SETRANGE` 같은 수정 명령은 embstr → raw 변환을 유도.

## List — quicklist (linked list of listpacks)

연결 리스트의 노드 각각이 **listpack(작은 압축 배열)**. 양 끝 push/pop 빠름 + 메모리 효율.

```
quicklist:  [listpack] ↔ [listpack] ↔ [listpack] ↔ ...
                ↑ 가운데 노드는 LZF로 추가 압축 가능
```

| 설정 | 의미 |
|------|------|
| `list-max-listpack-size -2` | 노드당 8KB 권장 (음수 = KB 단위 음의 부호) |
| `list-compress-depth 0` (기본) | 0은 압축 안 함. 양수 N은 양 끝 N개를 제외한 중간 노드를 LZF 압축 |

중간 노드 압축은 기본값이 아니다. 큰 list의 메모리 절감과 CPU, latency 비용을 측정한 뒤 양수 depth를 선택한다.

## Hash, Set, ZSet — listpack ↔ 큰 인코딩 변환

엔트리 수, 값 크기 임계 넘으면 큰 인코딩으로 **단방향 변환**.

| 자료구조 | 작은 인코딩 | 큰 인코딩 | 변환 임계 |
|----------|------------|-----------|----------|
| Hash | listpack | hashtable | entries 512 또는 필드/값 64B |
| Set (정수만) | intset | hashtable | entries 512 |
| Set (문자열) | listpack | hashtable | entries 128 또는 원소 64B |
| Sorted Set | listpack | skiplist + hashtable | entries 128 또는 value 64B |

작은 컬렉션은 listpack이 캐시 친화적이다. 공식 문서 기준 특수 인코딩은 일반 인코딩보다 평균 5배, 최대 10배 적은 메모리를 쓰지만 실제 절감 폭은 원소 수와 값 크기에 따라 달라지므로 `MEMORY USAGE`로 확인한다. 큰 컬렉션은 O(log N)/O(1) 보장을 위해 큰 인코딩을 쓴다.

## intset

정렬된 정수 배열. 이진 탐색으로 O(log N). 인코딩(int16/int32/int64)은 가장 큰 값 기준 자동 확장. 정수만 들어 있으면 hashtable보다 훨씬 효율.

## Skip List — Sorted Set 핵심

확률적 자료구조. 평균 O(log N) 검색, 삽입, 삭제. 균형 트리(AVL, Red-Black)와 같은 시간 복잡도지만 **구현 단순 + 캐시 지역성 좋음**.

```
구조:
- 각 노드는 여러 level의 forward 포인터
- level 결정: 동전 던지기 — 1/4 확률로 +1 level (Redis 구현)
- 최대 32 level
```

```c
typedef struct zskiplistNode {
  sds ele;
  double score;
  struct zskiplistNode *backward;
  struct zskiplistLevel {
    struct zskiplistNode *forward;
    unsigned long span;   // 건너뛰는 노드 수 (랭킹 계산용)
  } level[];
} zskiplistNode;
```

Sorted Set은 **skiplist + hashtable 동시 운용** — skiplist로 정렬된 범위 조회(`ZRANGE`/`ZRANGEBYSCORE`), hashtable로 멤버 → score 조회(`ZSCORE`) O(1).

`span` 필드가 영리한 트릭 — 각 노드가 "다음까지 몇 칸 건너뛰는지"를 알아 `ZRANK` O(log N) 가능.

## OBJECT ENCODING으로 확인

```
SET counter 12345
OBJECT ENCODING counter    → int

SET name "alice"
OBJECT ENCODING name       → embstr

HSET h f1 v1 f2 v2
OBJECT ENCODING h          → listpack

# 기본 임계 512개를 넘긴 hash 만들기
EVAL "for i=1,513 do redis.call('HSET', KEYS[1], 'f' .. i, 'v') end" 1 myhash
OBJECT ENCODING myhash   → hashtable
```

## Hash, Set, Sorted Set 단방향 변환의 함정

이 세 자료구조는 작은 → 큰 인코딩 변환은 자동이지만 **반대는 안 됨**. 한 번 hashtable로 바뀐 hash는 항목을 줄여도 listpack으로 돌아가지 않음 → 메모리 회수 안 됨. **재생성**(DEL → 재삽입) 필요. List는 예외로, Redis 7.2+에서 quicklist가 노드 하나로 줄고 크기와 원소 수가 임계값의 절반 아래가 되면 listpack으로 자동 전환한다.

운영 시 hot 키가 잠시 큰 사이즈 갔다가 줄어들면 메모리 잔존 — 주기 정리 또는 TTL.

## 흔한 실수

- **listpack 임계를 모르고 큰 hash 운용** → 메모리 폭증. 설정값과 `OBJECT ENCODING`을 함께 확인.
- **`OBJECT ENCODING` 미사용** → 인코딩 불일치를 놓치고 메모리, CPU 추정 어려움.
- **Hash, Set, Sorted Set이 임계를 넘긴 후 크기만 줄이면 회수된다고 기대함** → 작은 인코딩으로 되돌리려면 재생성 필요.
- **측정 없이 list-compress-depth를 올림** → 메모리는 줄어도 압축, 해제 CPU와 latency가 늘 수 있음.
- **embstr 문자열에 SETRANGE/APPEND** → raw로 변환 + 재할당 비용. 변경 잦은 string은 처음부터 raw 의식.

## 면접 체크포인트

- Redis가 같은 타입에도 다른 인코딩을 쓰는 이유 — 메모리, CPU 트레이드오프
- SDS의 의의 — O(1) strlen, 이진 안전, 버퍼 오버플로우 방지
- `int`/`embstr`/`raw` 차이 — 44바이트 임계
- listpack vs hashtable 변환 임계와 단방향 특성
- Sorted Set이 skiplist + hashtable 둘 다 쓰는 이유 — 범위 vs O(1) 조회
- skiplist의 확률적 레벨 결정 — 1/4 확률
- `span` 필드로 ZRANK O(log N) 구현
- Hash, Set, Sorted Set의 단방향 변환과 Redis 7.2+ List의 양방향 전환 차이

## 출처

- [Redis Docs, Memory optimization](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/)
- [Redis, redis.conf](https://github.com/redis/redis/blob/8.2/redis.conf)
- [Redis 7.2 source, t_list.c](https://github.com/redis/redis/blob/7.2/src/t_list.c)
- [Redis 8.2 source, t_list.c](https://github.com/redis/redis/blob/8.2/src/t_list.c)
- [Redis Documentation, OBJECT ENCODING](https://redis.io/docs/latest/commands/object-encoding/)
- [Redis 3.2 source, object.c](https://github.com/redis/redis/blob/3.2/src/object.c)

## 관련 문서

- [[Redis-Data-Structures|Redis 자료구조 개요]]
- [[Redis-Architecture|Redis architecture]]
- [[Redis-Memory-Eviction|메모리 정책, Eviction]]
- [[Hot-Key|Hot key 대응]]
- [[Cache-Advanced-Operations|Cache 운영 패턴]]
