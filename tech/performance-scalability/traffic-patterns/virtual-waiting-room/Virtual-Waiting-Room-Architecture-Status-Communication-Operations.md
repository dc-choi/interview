---
tags: [performance, scalability, waiting-room, polling, websocket, ticketing]
status: done
verified_at: 2026-08-25
category: "성능&확장성(Performance&Scalability)"
aliases: ["가상 대기열 상태 통신", "대기열 Short Polling", "대기열 Polling과 WebSocket 비교", "가상 대기열 운영"]
---

# 가상 대기열 대기 상태 통신과 운영

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
- `PENDING`/`HELD` 체류 시간과 만료 해제 실패, Redis 카운터와 RDB 예약 수의 정합성 대조

오픈 전에 봇으로 대기 등록, 재접속, 새로고침, 만료, 예매 충돌과 Redis 장애를 포함한 부하 테스트를 수행한다. 정상 TPS만 확인하지 말고 연결 또는 폴링 폭풍과 복구 과정도 검증한다.

## 면접 체크포인트

- API 서버를 늘리는 것만으로 RDB 병목이 해결되지 않는 이유
- 대기, 입장, 예매를 세 용량 경계로 분리하는 이유
- 순번과 취소 조회에는 Redis, 후속 비동기 처리에는 MQ가 맞는 이유
- 서버 제어형 adaptive polling이 요청 폭주를 줄이는 방식
- 대기열에서 WebSocket보다 polling이 단순한 조건과 반대 조건
- 입장 TTL, 멱등 토큰, 원자적 좌석 차감이 필요한 이유

## 출처

- [대규모 예매 시스템에서 대기열과 통신하는 방법, 폴링 — 코딩하는기술사](https://www.youtube.com/watch?v=tJeQoxceipY)
- [대규모 대기열에서 WebSocket이 아니라 폴링을 사용하는 이유 — 코딩하는기술사](https://www.youtube.com/watch?v=pJTvEoc3Mr4)

## 관련 문서

- [[Virtual-Waiting-Room-Architecture|가상 대기열 아키텍처 폴더 인덱스]]
- [[Virtual-Waiting-Room-Architecture-Queue-Registration|문제 정의와 대기 등록]]
- [[Virtual-Waiting-Room-Architecture-Admission-Reservation|입장 제어와 예매 처리]]
- [[Realtime-Communication-Comparison|실시간 통신 기술 비교]]
- [[Capacity-Planning|캐퍼시티 플래닝]]
