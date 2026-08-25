---
tags: [messaging, redis]
status: done
verified_at: 2026-08-25
category: "Messaging & Data Pipeline"
aliases: ["Redis Messaging", "Redis"]
---

# Redis Messaging

전용 브로커를 세우기 전에 Redis로 메시징을 처리하는 세 가지 방법 — List 큐, Streams, Pub/Sub. 이 문서는 브로커 선택 관점의 요약과 List 큐를 중심으로 각 방식의 전달 경계를 다룬다.

## List 기반 큐

producer가 `LPUSH`로 넣고 worker가 `BRPOP`으로 꺼내는 가장 단순한 FIFO 작업 큐다. blocking pop이라 폴링 루프 없이 새 항목을 기다릴 수 있다.

- **유실 특성** — pop한 순간 큐에서 사라지므로 worker가 처리 중 죽으면 그 메시지는 유실된다. ack 개념이 없다.
- **보완** — `LMOVE`(blocking은 `BLMOVE`)로 pop과 동시에 processing 리스트로 원자적으로 옮기고 성공 후 지운다. 별도의 timeout 회수자가 processing 리스트를 감시해 중단된 항목을 대기 큐로 되돌려야 재처리가 완성된다.
- **조건부 push** — `RPUSHX`, `LPUSHX`는 키가 이미 있을 때만 넣는다. 응용 예시로, 캐시 리스트가 이미 있는 활성 사용자에게만 새 항목을 추가하고 캐시가 없는 사용자는 건너뛸 수 있다.

## Streams

append-only 로그다. `XADD ... *`가 시간 기반의 단조 증가 ID를 자동 생성하므로 범위 조회와 신규 메시지 대기가 모두 가능하다. Consumer Group은 ack 전 메시지를 PEL에 남기고, `XAUTOCLAIM` 같은 회수 로직과 `XACK`를 결합하면 보존된 stream entry를 at-least-once로 소비할 수 있다. 이는 종단 간 무유실 보장이 아니다. 유실을 허용할 수 없는 작업은 AOF와 복제 정책, 생산자 Outbox, 소비자 멱등성을 함께 검토한다 ([[Delivery-Semantics|전달 보장 의미론]]).

## Pub/Sub

채널로 방송하는 fire-and-forget이다. 전달 의미론이 at-most-once라 발행 시점의 활성 구독자에게만 전달되고 즉시 폐기되며, 구독자가 끊겨 있던 사이의 메시지는 영구 유실된다. 채팅, 실시간 알림, 캐시 무효화 통보처럼 놓쳐도 되는 신호에만 쓰고 작업 큐로는 쓰지 않는다.

## 선택 기준

| 요구 | 도구 |
|---|---|
| 놓쳐도 되는 실시간 신호 | Pub/Sub |
| 단순 작업 큐 (약간의 유실 허용 또는 LMOVE + timeout 회수) | List |
| ack, 재처리, 소비자 그룹 | Streams |
| 대규모 처리량, 다중 팀 이벤트 백본 | Kafka 등 전용 브로커 ([[Messaging-Broker-Comparison|브로커 비교]]) |

## 관련 문서

- [[Messaging-Broker-Comparison|브로커 비교]]
- [[Delivery-Semantics|전달 보장 의미론]]

## 출처

- [Redis, Lists](https://redis.io/docs/latest/develop/data-types/lists/)
- [Redis, Streams](https://redis.io/docs/latest/develop/data-types/streams/)
- [Redis, Pub/Sub](https://redis.io/docs/latest/develop/pubsub/)
