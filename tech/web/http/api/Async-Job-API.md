---
tags: [web, http, api, async, long-running-operation, polling]
status: done
verified_at: 2026-11-17
category: "웹&네트워크(Web&Network)"
aliases: ["Async Job API", "Long-Running Operation API", "비동기 작업 API", "장기 실행 작업 API", "Asynchronous Request-Reply"]
---

# 비동기 작업 API (접수 후 상태 리소스로 추적)

한 요청과 응답 안에 끝나지 않는 일(영상 인코딩, 대량 내보내기, 외부 시스템 연동)을 HTTP API로 노출하는 방식이다. 서버는 일을 끝내고 응답하는 대신 작업을 접수했다는 응답을 바로 돌려주고, 클라이언트는 작업을 가리키는 리소스로 진행 상태와 결과를 확인한다.

## 요청의 의미가 바뀐다

동기 API에서 요청은 지금 이 일을 끝내 달라는 뜻이다. 비동기 작업 API에서는 작업을 만들어 달라는 뜻이고 결과는 나중에 온다. 그래서 설계 대상이 하나 늘어난다. 작업 자체가 식별자, 상태와 수명을 가진 리소스가 된다.

- 접수와 실행이 분리된다. API는 요청을 검증하고 작업을 기록한 뒤 큐에 넘기고, 별도의 워커가 실제 처리를 한다.
- 접수 성공은 처리 성공이 아니다. `202 Accepted`는 처리를 위해 받아들였지만 완료하지 않았다는 뜻이며, 실제 처리 시점에 거부될 수도 있다(RFC 9110 15.3.3).
- HTTP에는 비동기 작업의 상태 코드를 나중에 다시 보내는 수단이 없다(같은 절). 결과는 클라이언트가 다시 묻거나 서버가 다른 통로로 알려야 한다.

## HTTP 흐름

```http
POST /videos/42/encodings
Idempotency-Key: 7c1f...

HTTP/1.1 202 Accepted
Location: /jobs/b7e2f0c4
Retry-After: 5
{ "status": "pending" }

GET /jobs/b7e2f0c4
HTTP/1.1 200 OK
Cache-Control: no-store
{ "status": "running", "createdAt": "...", "lastUpdatedAt": "..." }

GET /jobs/b7e2f0c4
HTTP/1.1 303 See Other
Location: /videos/42/encodings/9
```

1. 시작 전에 검증한다. 형식이 틀린 요청은 접수하지 않고 `400`처럼 즉시 오류로 답한다.
2. `202` 응답은 현재 상태를 설명하고 상태 확인 지점을 가리킨다. RFC 9110은 표현이 status monitor를 가리키거나 포함하도록 권한다. `Location`에 상태 리소스 URL을, `Retry-After`에 다시 물을 시점을 싣는 것은 Azure 아키텍처 센터의 패턴이 정리한 용법이다. RFC 9110 10.2.3은 `Retry-After`를 후속 요청 전 대기 시간으로 정의하고 `503`과 3xx에서의 뜻을 적었으며 15.5.14는 `413`에도 쓴다. `Location`의 뜻도 `201`과 3xx에 대해 적었고, `202`에 쓴 예는 RFC 7240 4.1에 있다. `202`에서 두 헤더를 어떻게 읽을지는 표준이 정하지 않았으므로 API 문서에 적는다.
3. 상태 조회는 작업이 진행 중이어도 `200`이다. 조회 요청의 성공과 작업의 완료는 다른 사실이다([[HTTP-Status-Code|HTTP 상태 코드]]). 명시적 지시어가 없는 `200`은 캐시가 재사용할 수 있으므로 상태 응답에는 `Cache-Control: no-store`를 둔다([[HTTP-Caching|HTTP 캐싱과 조건부 요청]], 이 문서의 적용 제안).
4. 완료되면 상태 리소스가 완료를 표현하거나 결과 리소스로 리다이렉트한다. 리다이렉트에는 `303 See Other`를 쓴다. `303`은 결과가 상태 리소스와 다른 리소스이고 그 리소스를 GET으로 가져오라는 뜻이다(RFC 9110 15.4.4). `302`는 대상 리소스가 잠시 다른 URI에 있다는 뜻이라 맞지 않는다(15.4.3). 상태 조회는 GET이라 `302`여도 메서드는 그대로다. POST 응답에서 곧바로 결과로 리다이렉트하는 변형에서는 `302`가 메서드 변경을 보장하지 않아 POST가 다시 갈 수 있다.

결과 리소스 URL을 직접 폴링하게 하고 만들어질 때까지 `404`를 주는 구현도 있다. 이 방식은 잘못된 식별자의 `404`와 구분되지 않으므로 별도의 상태 리소스가 더 명확하다.

클라이언트가 비동기 처리를 받아들일 수 있다고 미리 알리는 `Prefer: respond-async`도 있다(RFC 7240). 서버는 처리 시간이 자체 기준을 넘을 때 `202`로 응답해 이 선호를 존중할 수 있다.

## 상태 리소스 설계

| 항목 | 내용 |
|---|---|
| 상태 값 | 대기, 실행 중, 성공, 실패, 취소처럼 종료 상태와 비종료 상태를 문서화한 일관된 집합으로 둔다 |
| 시각 | 접수 시각과 마지막 갱신 시각. 멈춘 작업과 진행 중인 작업을 구분하는 근거가 된다 |
| 진행률 | 서버가 추정할 수 있을 때만 선택적으로 둔다 |
| 오류 | 실패 상태일 때의 구조화된 오류. RFC 9457 형식을 쓸 수 있다 |
| 결과 | 완료 시 결과 본문(AIP-151의 `response`) 또는 결과 리소스의 위치(`303` 리다이렉트) |
| 보존 기간 | 상태와 결과는 저장 공간을 쓰므로 정리 정책을 정하고, 클라이언트에 만료 시점을 알린다. 만료 뒤 조회의 응답(`410` 또는 `404`)과 멱등 키의 보존 기간도 함께 정한다 |
| 접근 제어 | 작업을 만든 주체만 상태와 결과를 읽게 한다. 소유 조건을 조회에 넣어 남의 작업과 없는 작업을 같은 `404`로 답하고, 추측하기 어려운 식별자는 완화책으로만 쓴다([[IDOR\|IDOR]]). 결과를 저장소 URL로 넘기면 기한이 있는 서명 URL을 쓴다 |

Google의 API 지침(AIP-151)은 같은 개념을 `Operation`이라는 공통 타입으로 표준화한다. 이름, 진행 정보를 담는 메타데이터, 완료 여부(`done`)와 결과 또는 오류를 갖고, API마다 별도의 작업 인터페이스를 만들지 않게 한다. 오래 걸린다고 볼 기준은 10초, 완료된 작업의 만료는 30일을 경험칙으로 제시한다(2026-11-17 대조, 지침의 권고이며 표준 수치가 아님).

## 결과를 알리는 방법

| 방식 | 맞는 경우 | 비용 |
|---|---|---|
| 폴링 | 브라우저처럼 콜백을 받을 주소가 없거나 방화벽 때문에 서버가 먼저 연결할 수 없는 클라이언트 | 불필요한 조회와 지연. `Retry-After`와 백오프로 줄인다([[Retry-Backoff-Jitter\|재시도, 지수 백오프와 지터]]). 긴 폴링은 [[Realtime-Communication-Comparison\|실시간 통신 기술 비교]] |
| 웹훅 | 서버 간 연동이고 수신 쪽이 공개 엔드포인트를 열 수 있을 때 | 서명 검증과 중복 수신 처리([[NestJS-Webhooks-Verification-and-Inbox\|NestJS Webhook 검증과 inbox]]), 재전송([[NestJS-Webhooks-Delivery-and-Operations\|NestJS Webhook 전송 정책과 운영]]) |
| SSE나 WebSocket 푸시 | 진행 상황을 실시간으로 보여야 할 때 | 연결 유지 비용([[Server-Sent-Events\|Server-Sent Events (SSE)]], [[WebSocket\|WebSocket]]) |

웹훅과 SSE, WebSocket 푸시를 쓰더라도 상태 리소스는 남긴다. 알림은 유실될 수 있고, 수신 쪽은 조회로 결과를 대사할 수 있어야 한다(이 문서의 적용 제안).

## 실패, 중복과 취소

- **접수 응답의 유실**: 클라이언트는 응답이 사라진 것과 요청이 도착하지 않은 것을 구분할 수 없어 POST를 다시 보낸다. 멱등 키를 받아 같은 키의 재요청에는 새 작업을 큐에 넣지 않고 기존 상태 리소스를 돌려준다([[Idempotency#POST를 멱등하게 만드는 패턴|POST를 멱등하게 만드는 패턴]], [[Idempotency-Key|멱등성 키]]).
- **시작 전 실패와 실행 중 실패**: 시작을 막는 오류는 일반 오류 응답으로 즉시 돌려주고, 실행 중 실패는 상태 리소스에 오류로 남긴다. 실패한 작업을 조회했을 때의 응답은 계약으로 정한다. 조회 요청은 성공이므로 `200`에 실패 상태와 오류 본문을 싣는 방식(AIP-151)과 상태 리소스가 실패에 맞는 4xx를 돌려주는 방식(Azure 문서)이 있고, 한 API 안에서는 하나로 통일한다.
- **취소**: 상태 리소스에 `DELETE`를 열어 취소 지시를 워커에 전달하고, 처리된 뒤 상태를 취소로 바꾼다. 취소가 아직 반영되지 않은 시점의 `DELETE` 응답은 `202`다(RFC 9110 9.3.5). 부분적으로 진행된 작업을 되돌릴 수 있는지, 보상 처리가 필요한지를 정한다.
- **같은 대상의 동시 작업**: 동시에 실행할지, 큐에 쌓아 차례로 처리할지, 진행 중인 작업이 끝날 때까지 새 작업을 거부할지, 새 요청이 진행 중인 작업을 대체할지를 계약으로 정한다. 거부하거나 대체할 때는 이유를 담은 오류를 남긴다(AIP-151은 `ABORTED`).
- **기록과 큐 적재의 원자성**: 작업 행을 저장한 뒤 큐 적재가 실패하면 영원히 대기 상태인 작업이 남는다. 저장소를 큐로 쓰거나([[MySQL-Job-Queue|MySQL Job Queue]]) 아웃박스로 두 쓰기를 묶는다([[Transactional-Outbox|Transactional Outbox Pattern]], 이 문서의 적용 제안).

## 쓰지 않는 편이 나은 경우

- 대부분 짧게 끝나는 작업. 클라이언트가 폴링과 상태 해석을 구현해야 하므로 동기 응답보다 계약이 복잡해진다(이 문서의 해석, AIP-151의 10초 경험칙 참고).
- 결제 승인이나 재고 차감처럼 결과가 다음 행동을 정하는 작업. 동기적으로 확정할 경계와 비동기로 넘길 후속 작업을 나눈다([[Cache-vs-Queue#접수와 완료를 구분한다|접수와 완료를 구분한다]]).
- 결과를 실시간으로 흘려보내야 하는 응답. 스트리밍이나 SSE, WebSocket 푸시가 맞다.
- 여러 단계가 며칠에 걸쳐 이어지고 중간에 사람의 입력을 기다리는 과정. 작업 하나의 상태 조회보다 워크플로 엔진의 문제에 가깝다([[Durable-Workflow|지속 실행 워크플로]], 이 문서의 해석).

## 면접 체크포인트

- `202 Accepted`가 보장하는 것과 보장하지 않는 것
- 완료 뒤 리다이렉트에 `303`을 쓰는 이유(두 코드의 의미 차이, POST에서 바로 리다이렉트할 때의 메서드)
- 접수 응답이 유실됐을 때 작업이 두 번 만들어지지 않게 하는 방법
- 폴링, 웹훅과 SSE, WebSocket 푸시를 고르는 조건
- 남의 작업 상태와 결과를 읽지 못하게 하는 방법
- 상태 리소스와 결과를 언제까지 보존할지 정하는 기준

## 출처

- [RFC 9110, HTTP Semantics (15.3.3 202 Accepted, 15.4.3 302 Found, 15.4.4 303 See Other, 10.2.2 Location, 10.2.3 Retry-After, 9.3.5 DELETE)](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 7240, Prefer Header for HTTP (4.1 respond-async)](https://www.rfc-editor.org/rfc/rfc7240.html)
- [Azure Architecture Center, Asynchronous Request-Reply pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply) — 2026-11-17 대조. 헤더와 상태 필드, 303, 취소와 멱등 키, 실패 시 응답, 폴링이 맞는 경우와 맞지 않는 경우
- [Google AIP, AIP-151 Long-running operations](https://google.aip.dev/151) — 2026-11-17 대조. Operation 타입, 오류 구분, 병렬 작업, 만료
- [8 API Design Patterns Every Senior Developer Should Know — YouTube, Visualcoders](https://www.youtube.com/watch?v=jCs7ld1ROcw) — 2026-09-30 공개, 2026-11-17 음성 인식 전사 전체 확인. 접수 후 큐와 워커로 넘기고 상태를 조회하는 흐름의 계기. 화면 자료는 확인하지 못함. 영상의 나머지 일곱 패턴은 기존 문서에 있어 [[api|API 인덱스]]의 문제 신호 목록으로 연결

## 관련 문서

- [[REST|REST, RESTful API]] — 리소스 설계와 메서드 의미
- [[HTTP-Status-Code|HTTP 상태 코드]] — 202와 상태 조회 응답의 해석
- [[Idempotency|HTTP 멱등성]] — 재시도와 멱등 키
- [[Cache-vs-Queue|캐시와 큐]] — 접수와 완료의 구분, 큐의 처리 계약
- [[NestJS-Queues|NestJS Queues — @nestjs/bullmq]] — 워커 쪽 구현 예
- [[JobRunr-Persistent-Background-Jobs|JobRunr의 영속 백그라운드 작업]] — 워커 쪽 구현 예
- [[Load-Shedding|부하 차단]] — 오래 걸리는 작업을 큐로 넘기는 선택
- [[api|API 인덱스]]
