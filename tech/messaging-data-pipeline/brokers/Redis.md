---
tags: [messaging, redis]
status: done
verified_at: 2026-09-30
category: "Messaging & Data Pipeline"
aliases: ["Redis Messaging", "Redis"]
---

# Redis Messaging

전용 브로커를 세우기 전에 Redis로 메시징을 처리하는 세 가지 방법 — List 큐, Streams, Pub/Sub. 이 문서는 브로커 선택 관점의 요약과 List 큐를 중심으로 각 방식의 전달 경계를 다룬다.

## List 기반 큐

producer가 `LPUSH`로 넣고 worker가 `BRPOP`으로 꺼내는 가장 단순한 FIFO 작업 큐다. blocking pop이라 폴링 루프 없이 새 항목을 기다릴 수 있다.

주문 API가 재고 차감처럼 응답 전에 끝나야 하는 일만 처리하고, 알림 발송, 정산 기록, 출고 준비처럼 급하지 않은 후속 작업은 큐에 적어 둔 뒤 바로 응답하면 사용자가 후속 작업 시간을 기다리지 않는다. 급한 일과 급하지 않은 일이 한 로직에 묶여 있는 것 자체가 응답 지연의 원인이다.

- **블로킹 대기** — 빈 큐를 주기적으로 묻는 폴링은 네트워크와 서버 자원을 쓰고 폴링 간격만큼 처리가 늦어진다. `BRPOP key timeout`은 서버에서 기다리다 항목이 들어오는 즉시 깨어난다. timeout은 초 단위이고 6.0부터 소수를 받으며, 0이면 무한 대기, 시간이 지나면 nil을 돌려준다
- **단일 소비** — 꺼낸 워커만 그 항목을 가진다. 알림팀과 재고팀이 같은 주문 이벤트를 각자 소비하려면 발행자가 팀별 큐를 모두 알고 각각 넣어야 해 팀이 늘 때마다 결합이 커진다. 보관과 다중 소비가 모두 필요하면 Streams의 팀별 Consumer Group으로 간다
- **유실 특성** — pop한 순간 큐에서 사라지므로 worker가 처리 중 죽으면 그 메시지는 유실된다. ack 개념이 없다.
- **보완** — `LMOVE`(blocking은 `BLMOVE`)로 pop과 동시에 processing 리스트로 원자적으로 옮기고 성공 후 지운다. 별도의 timeout 회수자가 processing 리스트를 감시해 중단된 항목을 대기 큐로 되돌려야 재처리가 완성된다.
- **조건부 push** — `RPUSHX`, `LPUSHX`는 키가 이미 있을 때만 넣는다. 응용 예시로, 캐시 리스트가 이미 있는 활성 사용자에게만 새 항목을 추가하고 캐시가 없는 사용자는 건너뛸 수 있다.

## Streams

append-only 로그다. `XADD ... *`가 시간 기반의 단조 증가 ID를 자동 생성하므로 범위 조회와 신규 메시지 대기가 모두 가능하다. Consumer Group은 ack 전 메시지를 PEL에 남기고, `XAUTOCLAIM` 같은 회수 로직과 `XACK`를 결합하면 보존된 stream entry를 at-least-once로 소비할 수 있다. 이는 종단 간 무유실 보장이 아니다. 유실을 허용할 수 없는 작업은 AOF와 복제 정책, 생산자 Outbox, 소비자 멱등성을 함께 검토한다 ([[Delivery-Semantics|전달 보장 의미론]]).

## Pub/Sub

채널로 방송하는 fire-and-forget이다. 전달 의미론이 at-most-once라 발행 시점의 활성 구독자에게만 전달되고 즉시 폐기되며, 구독자가 끊겨 있던 사이의 메시지는 영구 유실된다. 채팅, 실시간 알림, 캐시 무효화 통보처럼 놓쳐도 되는 신호에만 쓰고 작업 큐로는 쓰지 않는다.

발행자는 구독자를 몰라도 되므로 팀이 늘어도 발행 코드를 고치지 않는 장점이 있다. 대신 구독자가 없거나 워커가 재배포 중이면 메시지는 오류 없이 사라진다. `PUBLISH`는 메시지를 받은 클라이언트 수를 돌려주므로 0은 아무도 받지 못했다는 신호다. 단 cluster에서는 발행한 노드에 연결된 구독자만 세므로 이 값으로 전체 수신 여부를 판단할 수 없다(0이어도 다른 노드의 구독자는 받았을 수 있다).

정리하면 List 큐는 보관되지만 한 명만 받고, Pub/Sub은 여러 명이 받지만 보관되지 않는다. 둘 다 필요하면 Streams다.

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
- [Valkey, BRPOP](https://valkey.io/commands/brpop/)
- [Valkey, PUBLISH](https://valkey.io/commands/publish/)
- [인프런, Hong, List 자료구조를 기반으로 하는 가장 간단한 메시지 큐와 Pub/Sub을 기반으로 하는 메시지 큐의 차이](https://www.inflearn.com/courses/lecture?courseId=343676&unitId=481452)
