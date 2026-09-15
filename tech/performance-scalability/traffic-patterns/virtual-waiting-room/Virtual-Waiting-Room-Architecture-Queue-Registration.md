---
tags: [performance, scalability, waiting-room, redis, ticketing]
status: done
verified_at: 2026-08-25
category: "성능&확장성(Performance&Scalability)"
aliases: ["가상 대기열 대기 등록", "Waiting Room Queue Registration", "대기열 Sorted Set 설계"]
---

# 가상 대기열 문제 정의와 대기 등록

가상 대기열은 순간적으로 몰린 요청을 모두 핵심 시스템에 전달하지 않고, 빠른 대기 저장소에서 순서를 관리하며 **백엔드가 감당할 수 있는 속도로만 입장시키는 부하 제어 계층**이다. 티켓 예매처럼 공정한 순서, 현재 순번 표시, 초과 예약 방지가 함께 필요한 워크로드에 사용한다.

## 해결해야 할 문제

- 특정 시각에 수십만 건 이상이 동시에 들어오는 burst를 흡수한다.
- 먼저 온 사용자를 먼저 처리하고 대기 순서를 조회할 수 있어야 한다.
- 예매 시스템과 RDB가 감당할 수 있는 처리량만 통과시킨다.
- 좌석 수를 넘기거나 같은 좌석을 중복 예약하지 않는다.
- 새로고침, 중복 클릭, 이탈과 재접속에도 대기 상태가 일관돼야 한다.

## 3단계 구조

```text
Client
  -> Queue API -> Redis Sorted Set
                   |
                   v
             Admission Controller -> Active Token Store
                                          |
Client -> Reservation API ----------------+
             -> RDB PENDING -> Redis atomic seat hold
             -> RDB CAS: PENDING -> HELD
                                 -> CANCELLED + Outbox
             -> RDB CAS: HELD -> CONFIRMED 또는 EXPIRED + Outbox
                                                       |
                                                       v
                                                 Worker -> Redis projection
```

핵심은 대기, 입장, 예매를 서로 다른 용량 경계로 분리하는 것이다. API 서버만 늘리고 모든 요청을 RDB로 보내면 마지막 병목인 RDB가 먼저 포화된다.

## 1. 대기 등록

로그인 전에도 대기 등록이 필요할 수 있으므로 Queue API는 추측하기 어려운 대기 토큰을 발급한다. Redis Sorted Set에는 토큰을 member로, 도착 순서를 score로 저장한다.

```text
ZADD queue:{eventId} {arrivalSequence} {queueToken}
```

벽시계 timestamp만 score로 쓰면 같은 시각에 들어온 요청의 순서를 별도로 결정해야 한다. 단조 증가 시퀀스나 동률 해소 규칙을 함께 두어 공정성 기준을 명시한다.

Sorted Set이 제공하는 핵심 연산은 다음과 같다.

- `ZRANK`: 특정 토큰의 현재 순번 조회
- `ZCARD`: 전체 대기자 수 조회
- `ZREM`: 취소하거나 만료된 사용자 제거
- `ZPOPMIN`: 앞 순서부터 일정 인원 입장

같은 토큰을 member로 쓰고 `ZADD NX`를 적용하거나 최초 score를 보존하면 별도 항목이 계속 쌓이거나 재요청 때문에 순번이 바뀌지 않아 중복 클릭을 멱등하게 처리하기 쉽다. 단, 다른 토큰을 무한 발급받는 우회는 인증 정보, 쿠키, 기기 신호와 rate limit으로 별도 제어한다.

## Redis Sorted Set과 MQ의 역할 차이

| 요구 | Redis Sorted Set | Kafka 같은 MQ 또는 로그 |
|---|---|---|
| 특정 사용자의 현재 순번 | member 기준 즉시 조회 가능 | 소비 offset은 알 수 있지만 임의 사용자의 순번 조회에는 부적합 |
| 재접속 후 상태 복원 | 같은 토큰으로 상태 조회 | 별도 상태 저장소와 인덱스 필요 |
| 중간 취소 | `ZREM`으로 직접 제거 | 취소 이벤트와 소비 단계 필터가 필요 |
| 앞에서 N명 입장 | 범위 조회 또는 pop | 소비자가 순차 처리할 수 있으나 사용자 상태 관리가 별도 필요 |
| 내구성 있는 후속 처리와 재생 | 별도 영속성 정책 필요 | 이벤트 보관, 재생, 소비자 분리에 적합 |

대기열 앞단은 순번 조회와 상태 변경이 중요하므로 Redis가 잘 맞는다. 입장 이후 저장, 알림, 로그처럼 비동기 처리량과 재생이 중요한 단계는 MQ가 잘 맞는다. 둘은 대체재가 아니라 서로 다른 역할로 함께 사용할 수 있다.

## 출처

- [수백만 동시 접속을 처리하는 선착순 예매 시스템 아키텍처 설계 — 코딩하는기술사](https://www.youtube.com/watch?v=c-ERjEodn_o)
- [대규모 예매 시스템에서 대기열에 Kafka가 아닌 Redis를 사용하는 이유 — 코딩하는기술사](https://www.youtube.com/watch?v=IjI4DJvZcAs)

## 관련 문서

- [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처 폴더 인덱스]]
- [[Virtual-Waiting-Room-Architecture-Admission-Reservation|입장 제어와 예매 처리]]
- [[Virtual-Waiting-Room-Architecture-Status-Communication-Operations|대기 상태 통신과 운영]]
- [[MQ-Kafka|Kafka]]
- [[Rate-Limiting|Rate Limit 정책]]
- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
