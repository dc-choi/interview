---
tags: [performance, scalability, waiting-room, redis, polling, websocket, ticketing]
status: done
category: "성능&확장성(Performance&Scalability)"
aliases: ["Virtual Waiting Room Architecture", "가상 대기열 아키텍처", "대규모 예매 대기열"]
---

# 가상 대기열 아키텍처

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
             -> Redis atomic seat operation
             -> RDB 또는 MQ -> Worker -> RDB
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

## 2. 입장 제어

Admission Controller는 일정 주기로 대기열 앞부분을 Active Token Store로 옮긴다. 한 번에 통과시킬 수는 대기자 수가 아니라 예매 시스템의 **검증된 지속 처리량**을 기준으로 정한다.

예매 시스템이 부하 테스트에서 초당 100건을 안정적으로 처리했다면 그대로 100건을 밀어 넣기보다 장애와 지연 변동을 흡수할 여유를 두고 더 낮은 입장률부터 시작한다. DB 지연, 오류율과 활성 사용자 수를 보며 동적으로 조절할 수 있다.

대기 제거와 활성 등록 사이에 사용자가 유실되거나 중복 입장하지 않도록 Lua 스크립트나 트랜잭션으로 상태 전이를 원자화한다.

```text
WAITING -> ADMITTED -> COMPLETED
                    -> EXPIRED
```

입장 토큰에는 TTL을 둔다. 정해진 시간 안에 예매를 시작하지 않으면 만료시켜 다음 사용자가 들어갈 용량을 돌려준다. TTL 값은 UX가 아니라 좌석 선택 시간, 백엔드 용량과 이탈률을 함께 측정해 정한다.

## 3. 예매 처리

입장한 사용자만 Reservation API에 접근하게 하고, 잔여 좌석 확인과 차감을 하나의 원자 연산으로 묶는다.

```lua
local remaining = tonumber(redis.call('GET', KEYS[1]) or '0')
local requested = tonumber(ARGV[1])
if remaining < requested then
  return 0
end
redis.call('DECRBY', KEYS[1], requested)
return 1
```

Redis 성공 뒤 RDB에 바로 저장하거나 MQ에 이벤트를 발행해 Worker가 저장할 수 있다.

- 직접 저장은 단순하지만 요청 경로가 DB 지연을 그대로 받는다.
- MQ를 거치면 쓰기 burst를 완화할 수 있지만 멱등 소비, 실패 복구와 사용자에게 보여줄 중간 상태가 필요하다.
- RDB의 UNIQUE 제약과 트랜잭션은 최종 중복 방어선으로 남긴다.

결제처럼 실패 경우의 수와 외부 연동이 많은 단계는 가능한 경우 좌석 선점의 임계 경로와 분리한다. 먼저 제한된 좌석만 선점하면 이후 결제 시스템이 받아야 할 동시 요청 수도 줄어든다.

## 대기 상태 통신은 Short Polling이 기본 후보

대기 화면은 클라이언트가 짧은 HTTP 요청으로 현재 상태를 묻고 서버가 즉시 응답하는 Short Polling으로 구현할 수 있다. 요청을 이벤트가 생길 때까지 열어 두는 Long Polling과 구분한다.

```json
{
  "state": "WAITING",
  "ahead": 1200,
  "behind": 3400,
  "admissionRate": 80,
  "retryAfterMs": 5000,
  "queueToken": "rotated-opaque-token"
}
```

폴링 주기를 클라이언트에 고정하지 않고 서버가 `retryAfterMs`로 제어하면 부하에 맞춰 요청률을 조정할 수 있다.

`admissionRate`처럼 현재 입장 처리율을 선택적으로 제공하면 ETA 계산이나 운영 상태 표시에 활용할 수 있다. 이 값은 전체 시스템의 일반 TPS가 아니라 대기열에서 입장을 허용하는 내부 속도이므로 단위와 의미를 명시하고, 용량 정보 노출이나 악용 가능성을 고려해 공개 범위를 정한다.

- 순번이 멀거나 서버가 바쁘면 간격을 늘린다.
- 입장이 가까우면 간격을 줄여 UX를 개선한다.
- 같은 시각에 요청이 몰리지 않도록 jitter를 더한다.
- 토큰을 서명하고 필요하면 교체해 위조, 재사용과 대기열 우회를 줄인다.

레거시 브라우저와 교차 도메인 제약 때문에 HTTP/1.1, JSONP, 실행 가능한 JavaScript 응답을 쓰던 설계도 있다. 현대 환경에서는 JSON 응답과 명시적 CORS 정책이 더 단순하고, 서버가 보낸 코드를 실행하는 표면을 피할 수 있다.

서버 로컬 메모리에 대기 상태를 두면 Load Balancer의 Sticky Session이 필요할 수 있다. 그러나 서버 장애 시 상태가 유실되고 특정 서버로 부하가 쏠리며 장애 뒤 세션 재분배가 어려워진다. 상태를 외부 Redis나 검증 가능한 서명 토큰으로 분리하면 저장소 비용과 토큰 수명 관리가 추가되는 대신 Queue API를 무상태로 운영하고 수평 확장하기 쉬워진다.

## 상용 솔루션과 자체 구축

상용 대기열 솔루션은 브라우저 호환성, 검증된 장애 대응과 운영 기능을 빠르게 확보할 수 있지만 비용, 공급자 종속과 커스터마이징 제약이 따른다. 자체 구축은 요구에 맞춘 제어권을 얻는 대신 순서의 공정성, 토큰 보안, 장애 복구와 실제 트래픽 규모의 부하 테스트를 팀이 직접 책임져야 한다. 일정, 규제, 트래픽 위험과 조직의 운영 역량을 함께 비교해 선택한다.

## 대규모 대기열에서 Polling과 WebSocket 비교

| 축 | Short Polling | WebSocket |
|---|---|---|
| 연결 | 요청 후 즉시 종료, HTTP 연결 재사용 가능 | 사용자마다 논리적 장기 연결 유지 |
| 통신 방향 | 상태를 가끔 확인하는 단방향 요구에 적합 | 빈번한 양방향 메시지에 적합 |
| 수평 확장 | 무상태 API로 구성하기 쉬움 | 연결 소유권, fan-out과 재연결 관리 필요 |
| 장애 시 위험 | 동기화된 폴링 burst | 대규모 재연결 폭풍 |
| 주된 비용 | 요청 QPS와 HTTP 처리 | 연결 메모리, heartbeat, 세션과 게이트웨이 용량 |

대기 순번은 대부분 서버 상태를 낮은 빈도로 읽는 단방향 데이터다. 이 경우 서버가 간격을 제어하는 폴링이 단순하고 복구하기 쉽다. 반면 채팅, 게임처럼 지연이 매우 짧아야 하고 양쪽이 자주 메시지를 보내면 WebSocket이 적합하다.

폴링이 항상 더 싸다는 뜻은 아니다. 응답이 무겁거나 간격이 너무 짧으면 QPS가 폭증한다. WebSocket도 전용 게이트웨이와 재연결 제어를 갖추면 대규모로 운영할 수 있다. 선택 기준은 기술의 신구가 아니라 연결 수, 갱신 빈도, 메시지 방향과 장애 복구 모델이다.

## 운영 체크포인트

- 대기 등록률, 전체 대기자 수, 사용자별 대기 시간
- 입장률, Active Token 수, 만료율과 예매 완료율
- 폴링 QPS, 응답 크기, 서버가 지시한 재시도 간격 준수율
- Redis 지연, 메모리, hot key, failover와 대기 상태 복구 정책
- Reservation API 지연과 오류율, RDB 커넥션과 트랜잭션 처리량
- Redis 카운터와 RDB 예약 수의 정합성 대조

오픈 전에 봇으로 대기 등록, 재접속, 새로고침, 만료, 예매 충돌과 Redis 장애를 포함한 부하 테스트를 수행한다. 정상 TPS만 확인하지 말고 연결 또는 폴링 폭풍과 복구 과정도 검증한다.

## 면접 체크포인트

- API 서버를 늘리는 것만으로 RDB 병목이 해결되지 않는 이유
- 대기, 입장, 예매를 세 용량 경계로 분리하는 이유
- 순번과 취소 조회에는 Redis, 후속 비동기 처리에는 MQ가 맞는 이유
- 서버 제어형 adaptive polling이 요청 폭주를 줄이는 방식
- 대기열에서 WebSocket보다 polling이 단순한 조건과 반대 조건
- 입장 TTL, 멱등 토큰, 원자적 좌석 차감이 필요한 이유

## 출처

- [수백만 동시 접속을 처리하는 선착순 예매 시스템 아키텍처 설계 - 코딩하는기술사](https://www.youtube.com/watch?v=c-ERjEodn_o)
- [대규모 예매 시스템에서 대기열에 Kafka가 아닌 Redis를 사용하는 이유 - 코딩하는기술사](https://www.youtube.com/watch?v=IjI4DJvZcAs)
- [대규모 예매 시스템에서 대기열과 통신하는 방법, 폴링 - 코딩하는기술사](https://www.youtube.com/watch?v=tJeQoxceipY)
- [대규모 대기열에서 WebSocket이 아니라 폴링을 사용하는 이유 - 코딩하는기술사](https://www.youtube.com/watch?v=pJTvEoc3Mr4)

## 관련 문서

- [[First-Come-Coupon-Patterns|선착순 이벤트 패턴]]
- [[Realtime-Communication-Comparison|실시간 통신 기술 비교]]
- [[Capacity-Planning|캐퍼시티 플래닝]]
- [[Rate-Limiting|Rate Limit 정책]]
- [[Lock|DB Lock]]
- [[MQ-Kafka|Kafka]]
