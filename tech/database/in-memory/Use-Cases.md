---
tags: [database, redis, cache]
status: done
verified_at: 2026-09-30
category: "Data & Storage - Cache & KV"
aliases: ["Use Cases"]
---

# Use cases

## Redis에 맡기기 전에 던질 세 질문

강의는 명령어 암기보다 아래 세 판단을 갖추는 것을 목표로 둔다.

- 이 데이터는 사라져도 되는가: 다시 만들 수 있는 캐시인지, 재시작과 failover 뒤에도 남아야 하는 원본인지에 따라 영속성과 복제 설정이 갈린다 ([[Persistence]], [[Redis-Architecture-HA|복제와 Sentinel]])
- 이 연산에 원자성이 필요한가: 읽고 비교하고 쓰는 사이에 다른 요청이 끼면 안 되면 단일 명령, `MULTI/EXEC`, Lua 순으로 실행 경계를 고른다 ([[Redis-Atomic-Operations|Redis 원자적 연산]])
- 병목은 어디인가: 느린 명령, 명령마다 기다리는 왕복, 메인 스레드 CPU 중 무엇이 막는지 먼저 재고 pipeline이나 I/O 스레드를 고른다 ([[Operations|운영 팁]], [[Redis-Valkey-Migration#I/O 스레딩을 켤 때|I/O 스레딩을 켤 때]])

## 카운팅
```
string의 단순 증감 연산을 사용하면 됨.

bits 연산을 사용하여 데이터 공간을 절약할 수 있지만 정수로 된 데이터만 가능.

hyperloglogs를 사용하여 대량의 데이터를 카운팅 할 때 훨씬 더 적절. 고유값의 개수를 작은 오차로 추정함 (정확한 유니크 구분이 아님). 저장된 데이터가 몇백만, 몇천만 건이던 상관없이 최대 12KB임. 한번 저장한 데이터는 다시 불러올 수 없는데 데이터를 보호하기 위한 목적으로도 사용할 수 있음.
```

### 고유 개수는 정확도와 ID 형식으로 고른다

| 요구 | 자료구조 | 메모리와 한계 |
|---|---|---|
| 정확한 개수와 명단 (방문자 전원에게 포인트 지급) | Set (`SADD`, `SCARD`) | 원소 수에 비례. 방문자 100만이면 ID 100만 개를 들고, 일별, 페이지별, 이벤트별 키가 늘면 비용이 곱해진다 |
| 대략적인 개수 (대시보드 UV 추세) | HyperLogLog (`PFADD`, `PFCOUNT`, `PFMERGE`) | 키당 최대 약 12KB(dense 표현). 원소가 적으면 sparse 표현이라 훨씬 작다. 표준오차 0.81%. 명단은 버리므로 원소를 되찾을 수 없다 |
| 정수 ID의 예, 아니오 상태 (딜 알림 신청, 쿠폰 수령) | Bitmap (`SETBIT`, `GETBIT`, `BITCOUNT`) | 가장 큰 오프셋의 비트 수에 비례. ID 100만이면 약 122KiB. UUID 같은 문자열 ID면 쓸 수 없어 Set |

- HLL의 0.81%는 상한이 아니라 표준오차다. 강의 실측(1만 명)은 약 0.89%였고, Valkey 9.1.2에 서로 다른 10만 개를 넣은 측정은 99,471(0.53%)이었다. 일간 키를 `PFMERGE`하면 주간 UV가 된다.
- `PFADD` 반환값은 내부 레지스터가 바뀌었는지(1) 아닌지(0)이지 신규 원소 여부가 아니다. 위 10만 개 측정에서 약 6만 7천 번이 0을 돌려줬으므로 이 값으로 신규 방문자를 판별하지 않는다.
- Bitmap은 새 타입이 아니라 String을 비트 배열로 다루는 명령 모음이다. `SETBIT`은 이전 비트 값을 돌려주고, 크기는 신청자 수가 아니라 가장 큰 오프셋이 정한다(오프셋 3003까지 쓰면 376바이트). 오프셋은 2^32 미만(최대 512MB)이고 큰 오프셋을 처음 쓸 때 중간 메모리를 한 번에 할당하느라 서버가 잠시 멈출 수 있으므로, ID가 크거나 듬성듬성하면 기준값을 빼 오프셋을 줄인다.

## 실시간 랭킹 시스템
```
sorted set를 사용한 실시간 점수 및 랭킹 관리, 게임 점수 랭킹, 스트리밍 서비스 인기 순위
```

찜하기, 조회수 인기 순위, 기간별 랭킹 설계는 [[Redis-Sorted-Set-Ranking|Sorted Set 랭킹 설계]]에서 다룬다.

## 메시징
### list 활용
- 자체적으로 blocking 기능이 있어 적절히 사용하면 polling을 방지할 수 있음
- 키가 있을 경우에만 데이터를 추가할 수 있는 커맨드 존재
- SNS 사례: 자주 사용하는 유저에게만 타임라인 트윗을 캐싱, 비활성 유저는 동작하지 않음

### stream 활용
- append-only라서 중간에 데이터가 바뀌지 않음
- id는 시간값으로 저장되며 키-값을 매칭하여 데이터 저장
- 시간 대역대별 검색, 새로 들어오는 데이터만 리스닝 가능
- 소비자(consumer) 개념이 있어 특정 데이터를 원하는 소비자만 읽게 할 수 있음
- 간단한 메시징 브로커가 필요할 때 적합

## 실시간 채팅 및 알림
- Pub/Sub을 사용해 채팅 메시지 및 이벤트 알림 처리
- 라이브 스트리밍 채팅, 실시간 알림 서비스

## Rate Limiting
- 특정 시간 내 요청 횟수를 제한하는 기능
- 로그인 시도 제한, DDoS 방어

## 출처
- [Valkey Documentation, PFCOUNT](https://valkey.io/commands/pfcount/)
- [Valkey Documentation, PFADD](https://valkey.io/commands/pfadd/)
- [Valkey Documentation, SETBIT](https://valkey.io/commands/setbit/)
- [인프런, Hong, 최근 본 상품 데이터는 어떻게 최적화할까?? & 카운팅을 위한 자료구조](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481448)
- [인프런, Hong, Valkey는 어떤 버전의 흐름으로 발전해왔는가. Redis에서 마이그레이션 할 떄의 주의사항](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481466)

## 관련 문서
- [[Redis-Sorted-Set-Ranking|Sorted Set 랭킹 설계]]
- [[Redis-vs-Memcached|redis와 memcached의 차이점]]
- [[Redis-Data-Structures|Redis 자료구조]]
- [[Session-Store|Session store]]
- [[Distributed-Lock|Distributed lock]]
