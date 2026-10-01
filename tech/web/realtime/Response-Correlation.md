---
tags: [web, realtime, correlation-id, concurrency, request-reply]
status: done
verified_at: 2026-10-01
category: "Web - 실시간"
aliases: ["Response Correlation", "응답 매칭", "요청 응답 상관키"]
---

# 채널 기반 요청과 응답 매칭

응답 매칭은 수신한 결과를 그 결과를 기다리는 요청에 연결하는 일이다. 여러 작업의 결과가 하나의 채널로 돌아오면 메시지 종류만으로 요청을 구별하기 어렵다.

상관 식별자(Correlation Identifier)는 요청의 고유 ID를 응답에 되돌려 보내 이 연결을 만든다. 요청자는 ID로 대기 중인 작업을 찾고, 응답자는 처리 결과와 같은 ID를 함께 전달한다.

## 반환값과 채널 메시지의 차이

| 형태 | 매칭 책임 |
|---|---|
| 요청별 `fetch` Promise | 해당 요청의 응답을 그 Promise로 받음 |
| 여러 작업이 공유하는 SSE 스트림 | 응답 데이터의 요청 ID와 대기 작업을 연결 |
| WebSocket 메시지 | 애플리케이션 또는 서브 프로토콜이 연결 |
| Worker, 웹뷰 브릿지의 메시지 | 브릿지 계약에서 호출과 결과의 연결을 정의 |

`Promise.all`의 성공 결과 배열은 입력 순서를 따른다. 하지만 각 Promise에 잘못 매칭한 결과를 넣었다면 그 오매칭을 고쳐주지는 않는다. 순서 보존과 요청 식별은 별도 책임이다.

WebSocket이 메시지를 전송하는 것과 서버 작업이 요청 순서대로 완료되는 것도 별개다. 응용 프로토콜이 `requestId`를 정의하거나 이미 사용하는 RPC 계층이 매칭을 제공하는지 먼저 확인한다.

## 상관키 계약

공통 메시지 봉투의 예시는 다음과 같다. 필드명은 예시이며 SSE나 WebSocket의 표준 필드가 아니다.

| 메시지 | 예시 |
|---|---|
| 요청 | `type=export, requestId=r1, input=보고서 A` |
| 진행 | `type=progress, requestId=r1, percent=50` |
| 성공 | `type=completed, requestId=r1, result=파일 A` |
| 실패 | `type=failed, requestId=r1, errorCode=EXPORT_FAILED` |

1. 요청 ID는 대기 작업끼리 충돌하지 않게 만든다. 지연과 중복 응답이 도착할 수 있는 기간에는 재사용하지 않거나 시도, 세대 식별자를 포함한다.
2. 전송 전에 ID와 대기 작업을 연결해 빠른 응답을 받을 준비를 한다.
3. 성공과 실패 모두 같은 ID로 대상 작업을 찾는다.
4. 진행 이벤트와 최종 이벤트를 구분하고, 최종 상태에서 대기 작업을 정리한다.

로그에 ID를 남기는 것만으로는 매칭이 완성되지 않는다. 수신 경로가 실제로 ID를 조회해야 한다. 관측용 Trace ID와 요청별 매칭 키를 재사용할지는 식별 범위를 비교해 결정한다. 하나의 trace에 여러 작업이 포함되면 trace만으로 개별 대기자를 구별할 수 없다.

### SSE의 `id`와 구별하기

SSE `id`는 마지막 이벤트 ID를 갱신하고 재연결 요청의 `Last-Event-ID`로 전달된다. 요청별 대기 작업을 자동으로 찾는 기능은 아니다. `id`가 없는 뒤 이벤트에도 이전 `lastEventId`가 남을 수 있다.

하나의 작업에서 진행과 완료 이벤트를 여러 번 보낸다면 요청 키는 `data` 안의 `requestId`, 재생 위치는 이벤트별 `id`처럼 분리할 수 있다. 서버의 보관, 재생과 클라이언트 중복 처리 없이는 `Last-Event-ID`만으로 유실 복구가 완성되지 않는다.

## 동시성 1이 숨기는 결함

요청 A 뒤에 B를 보내도 B가 먼저 끝날 수 있다. 도착한 결과를 대기 배열의 맨 앞에 주면 B의 결과가 A에 전달된다. 한 번에 하나만 실행하면 이 결함이 가려질 수 있다.

직렬 처리에서도 오래된 중복 이벤트가 다음 작업을 완료시킬 수 있다. 직렬화는 식별이나 중복 처리를 대신하는 보장이 아니다.

동시성 제한을 바꿀 때는 대기자 조회, 성공과 실패 경로, 중복과 지연 이벤트를 함께 확인한다. 순서 의존, 수신 측 제한 또는 자원 제약이면 직렬 처리가 타당하다. 매칭 부재로 제한했다면 그 이유와 해제 조건을 남긴다.

## 대기의 종료 계약

상관키는 결과의 주인을 찾고, 타임아웃과 취소는 응답이 없어도 대기를 끝낸다. 완료 이벤트만 기다리면 이벤트 유실 시 Promise가 끝나지 않고 직렬 큐의 뒤 작업도 멈출 수 있다.

대기 작업을 소유한 계층에서 다음 설계 조건을 확인한다.

- 성공, 실패, 타임아웃과 취소 뒤 대기 항목과 타이머를 정리한다.
- 전송 자체가 실패해도 등록한 대기 항목이 남지 않게 한다.
- 늦은 응답과 이미 처리한 최종 이벤트가 다른 작업을 완료시키지 않게 한다.
- 재연결 시 기존 작업을 복구할지, 실패로 종료할지 정한다.
- 재시도는 새 시도와 기존 작업을 구별하고, 업무 중복 실행 방지는 별도 멱등성 계약으로 다룬다.

위 조건은 애플리케이션 설계 체크포인트다. 클라이언트의 대기 취소가 서버 작업 중단을 뜻하지 않으며, 상관키가 접근 권한을 증명하지도 않는다.

## 검증 시나리오

| 조건 | 확인할 결과 |
|---|---|
| A 요청 후 B 요청, B 먼저 완료 | A와 B가 각자의 결과를 받음 |
| A 실패, B 성공 | 실패 경로도 A의 키를 사용 |
| 완료 이벤트 유실 | 정한 종료 정책으로 대기를 해제 |
| 타임아웃 뒤 늦은 완료 | 종료된 작업이나 다음 작업을 오염시키지 않음 |
| 중복 완료, 알 수 없는 키 | 재완료하거나 다른 작업에 전달하지 않음 |
| 진행 이벤트 뒤 완료 | 진행에서 대기자를 제거하지 않음 |

## 출처

- [이 응답은 누구 것인가요? — Wonkook Lee](https://blog.wonkooklee.com/docs/software-design-and-theory/whose-response-is-this/)
- [Correlation Identifier — Enterprise Integration Patterns](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CorrelationIdentifier.html)
- [WHATWG, HTML Standard: Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [ECMA International, ECMAScript: PerformPromiseAll](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromiseall)
- [RFC 6455, The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)

## 관련 문서

- [[Server-Sent-Events|SSE 이벤트와 종료 계약]]
- [[WebSocket|WebSocket과 응용 메시지 계약]]
- [[Correlation-ID|관측용 Correlation ID와 Trace ID]]
- [[Idempotency|멱등성]]
- [[Thread-vs-Event-Loop|비동기 동시성과 CPU 병렬 실행의 구분]]
- [[Code-Review-Reasoning-and-Practice|불변조건과 실패 경로를 확인하는 코드 리뷰]]
