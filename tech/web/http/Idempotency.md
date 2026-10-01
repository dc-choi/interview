---
tags: [web, http, idempotency, api]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Idempotency", "멱등성", "Idempotent Methods"]
---

# HTTP 멱등성 (Idempotency)

같은 메서드로 동일한 요청을 여러 번 보냈을 때 서버에 의도한 효과가 한 번 보낸 것과 같은 성질이다. 통신 장애로 응답을 받지 못했을 때 요청을 반복할 수 있는지를 판단하는 핵심 기준이다.

## 정의

연산 `f`가 멱등하다는 것은 `f(f(x)) = f(x)`라는 뜻이다. HTTP에서는 클라이언트가 요청한 효과만 비교한다.

- 같은 요청을 반복해도 대상에 의도한 효과는 한 번 수행한 것과 같다.
- 응답 상태나 본문은 달라질 수 있다.
- 서버는 요청마다 접근 로그나 변경 이력을 별도로 남길 수 있다.
- 같은 요청을 반복했을 때 그 요청이 만드는 효과만 본다. 두 GET 사이에 다른 클라이언트가 리소스를 바꿔 응답이 달라져도 GET의 멱등성이 깨진 것은 아니다.

응답이 같은지가 아니라 요청한 효과가 같은지가 기준이다.

## 메서드별 멱등성

| 메서드 | 멱등 | 안전 (Safe) | 비고 |
|---|---|---|---|
| GET | ✅ | ✅ | 대상 상태 변경을 요청하지 않는 표현 조회 |
| HEAD | ✅ | ✅ | 헤더만 조회 |
| OPTIONS | ✅ | ✅ | 지원 메서드 조회 |
| TRACE | ✅ | ✅ | 요청 메시지 진단 루프백 |
| QUERY | ✅ | ✅ | 요청 본문을 사용하는 안전한 질의, RFC 10008 |
| PUT | ✅ | ✗ | 전체 교체 — 동일 페이로드면 결과 같음 |
| DELETE | ✅ | ✗ | 첫 DELETE 성공, 이후 404여도 의도한 효과는 동일 |
| POST | ✗ | ✗ | 메서드 자체는 비멱등, 리소스 계약으로 보완 가능 |
| PATCH | ✗ | ✗ | 메서드 자체는 비멱등, 특정 패치 형식은 멱등하게 설계 가능 |

안전한 메서드는 클라이언트가 대상 리소스의 상태 변경을 요청하거나 기대하지 않는 메서드다. 로그 기록 같은 부수 효과까지 금지한다는 뜻은 아니다. 모든 안전한 메서드는 멱등이지만 그 역은 성립하지 않는다. 메서드의 또 다른 속성인 캐시 가능 여부는 [[HTTP-Caching#캐시 가능한 Method|HTTP 캐싱]]에 있다.

## 왜 중요한가

분산 환경의 전형적 시나리오:
1. 클라이언트가 요청 전송
2. 서버가 처리 완료
3. 응답 도착 전 네트워크 끊김
4. 클라이언트는 **성공했는지 모름**

멱등 요청은 응답을 읽기 전 통신 장애가 발생했을 때 같은 요청을 반복해도 의도한 효과가 중복되지 않는다. 비멱등 요청을 근거 없이 반복하면 다음 문제가 생길 수 있다.

- 중복 결제
- 중복 주문
- 중복 이메일 발송

멱등성은 재시도의 의미적 전제일 뿐이다. 어떤 상태 코드에서 재시도할지, 백오프와 최대 횟수, 전체 시간 제한은 별도 정책으로 정한다 ([[Retry-Backoff-Jitter|지수 백오프와 지터]]).

## POST를 멱등하게 만드는 패턴

POST와 PATCH는 메서드 자체가 멱등하지 않지만 API 계약에 멱등 키를 추가해 재시도를 식별할 수 있다. `Idempotency-Key`는 여러 API가 사용하는 관례이며, 2026-10-01 기준 IETF 작업 초안은 만료 상태이므로 공통 RFC 표준이라고 가정하면 안 된다.

### Idempotency Key 헤더
```
POST /payments
Idempotency-Key: "client-generated-unique-value"
Content-Type: application/json

{ "amount": 10000 }
```

따옴표를 포함한 예시는 만료된 IETF 초안의 Structured Field 문자열 형식이다. 실제 연동에서는 해당 API가 정의한 헤더 구문, 오류 응답과 만료 계약을 우선한다.

서버 동작:
1. 처음 본 키라면 요청 지문과 처리 상태를 원자적으로 기록한다.
2. 같은 키와 같은 요청이 다시 오면 진행 상태나 저장한 결과를 반환하고 작업을 중복 실행하지 않는다.
3. 같은 키에 다른 요청 본문이 오면 계약 위반으로 거부한다.
4. 키의 유효 기간과 재사용 규칙은 API 계약에 명시한다.

### 구현 포인트
- 키는 클라이언트가 충돌 가능성이 충분히 낮은 값으로 생성한다.
- 키와 요청 본문의 지문을 함께 저장해 같은 키에 다른 본문이 오는 경우를 감지한다.
- 동시 요청은 고유 제약이나 원자적 등록으로 한 요청만 처리하게 한다.
- 진행 중, 성공, 실패 상태와 각 상태에서 돌려줄 응답을 정한다.
- 만료 시간은 처리 시간과 클라이언트의 최대 재시도 기간을 고려해 계약으로 공개한다.

### 서버가 먼저 발급한 ID로 실행 요청 식별

클라이언트 키 대신 서버가 먼저 만든 리소스의 ID로 비싼 실행 요청을 식별할 수도 있다. 장바구니와 결제 페이지를 나누는 커머스 흐름이 예다.

1. 생성: 주문하기에서 서버가 주문과 주문 항목을 `CREATED` 초안으로 저장하고 주문 ID를 돌려준다.
2. 실행: 결제 API는 항목이 아니라 주문 ID만 받는다. 이미 완료된 주문이면 저장된 결과를 돌려주고, 아니면 재고와 포인트를 차감한 뒤 완료로 전이한다.

- 상태 확인만으로는 순차 재시도만 막는다. 같은 ID의 두 요청이 동시에 들어오면 둘 다 `CREATED`를 읽고 부수효과를 두 번 실행한다. 확인과 전이를 원자적으로 묶는다. `UPDATE orders SET status = 'PROCESSING' WHERE id = ? AND status = 'CREATED'`의 영향 행 수로 한 요청만 진행시키거나 `SELECT ... FOR UPDATE`, 주문 ID 키의 락을 쓴다([[Race-Condition-Patterns-Toolbox|동시성 도구 선택]], [[Payment-System-Principles|결제 상태 머신]]).
- Redis 락은 TTL과 소유자 토큰이 있는 `SET key token NX PX`로 잡고 토큰을 확인해 푼다. TTL 없는 `SETNX`는 보유자가 죽으면 락이 풀리지 않고, 소유자를 확인하지 않는 `DEL`은 만료 뒤 다른 요청이 잡은 락을 지울 수 있다. 락 키에는 용도별 prefix를 붙이고, 트랜잭션 밖에서 잡아 커밋 뒤에 풀어야 커밋 전 상태를 읽는 요청이 생기지 않는다([[Distributed-Lock|분산 락]], [[Distributed-Lock-Waiting|락 해제 순서]]). 락은 1차 필터이고 최종 방어는 DB의 조건부 전이와 제약이다.
- 생성 단계의 중복 클릭은 초안 여러 개로 끝난다. 부수효과는 없지만 초안의 만료와 정리 정책이 필요하다.
- 동시 중복은 최종 행 값만 보고 검증하지 않는다. 두 요청이 같은 재고와 잔액을 읽고 같은 값으로 덮어쓰면(lost update) 데이터는 한 번 처리된 것처럼 보여도 부수효과는 두 번 실행됐다. 실행 횟수, 이력 행과 외부 호출 로그로 확인한다.

## PUT vs POST의 멱등성 차이

```
PUT /users/123    { "name": "dc" }    // 멱등: 123번 사용자를 이 값으로 설정
POST /users       { "name": "dc" }    // 비멱등: 매번 새 사용자 생성
```

클라이언트가 알고 있는 대상 URI의 상태를 전체 교체할 때는 PUT이 자연스럽다. 컬렉션이나 처리 리소스에 내용을 제출하고 서버가 처리 결과를 정하게 할 때는 POST가 자연스럽다. 식별자를 누가 만드는지만으로 메서드를 결정하지는 않는다.

## DELETE의 미묘함

첫 DELETE: `200 OK` (삭제 성공)
재DELETE: `404 Not Found` (이미 없음)

응답은 다르지만 대상에 의도한 효과는 리소스가 없는 상태로 같다. 따라서 DELETE는 멱등이다.

## 네트워크 재시도 정책과 결합

- 멱등 메서드는 응답을 읽기 전 통신 장애가 발생한 경우 자동 반복할 수 있다.
- 멱등 메서드의 재시도는 다른 주체의 중간 변경을 보호하지 않는다. 응답을 못 받아 PUT을 다시 보내는 사이 다른 클라이언트가 같은 리소스를 바꿨다면 재시도한 PUT이 그 변경을 덮어쓴다(lost update). 막아야 하면 처음 읽은 ETag를 `If-Match`에 실어 보내거나 버전 기반 낙관적 잠금을 함께 쓴다([[HTTP-Caching#조건부 요청 필드|조건부 요청]], [[Lock#Optimistic Lock (낙관적 잠금)|낙관적 잠금]]).
- 조건부 PUT을 재시도해 412를 받았다면 첫 시도가 이미 반영됐을 수 있다. RFC 9110은 같은 변경이 이미 적용된 것으로 보이면 서버가 412 대신 2xx로 응답해도 된다(MAY)고 두므로, 클라이언트는 412를 곧바로 실패로 확정하지 않고 현재 상태를 조회해 판단한다.
- 멱등이라는 이유만으로 모든 타임아웃과 5xx를 무제한 재시도하면 안 된다. 서버 과부하와 재시도 폭풍을 만들 수 있다.
- 비멱등 메서드는 요청 의미가 실제로 멱등하다는 별도 지식이 있거나 원래 요청이 적용되지 않았음을 확인할 수 있을 때만 자동 재시도를 검토한다.
- 프록시는 비멱등 요청을 자동으로 재시도하면 안 된다.
- QUERY는 표준 의미가 안전하고 멱등이므로 통신 장애 후 반복할 수 있지만 실제 클라이언트와 중간 시스템의 메서드 지원은 별도로 확인한다.

## 면접 체크포인트

- 멱등성의 정확한 정의: 응답 동일이 아니라 의도한 효과의 동일
- DELETE가 멱등인 이유 (응답은 달라도 상태는 동일)
- POST를 멱등하게 만드는 Idempotency Key 패턴과 서버가 먼저 발급한 ID로 실행 요청을 식별하는 패턴
- 상태 확인만으로 동시 중복 실행을 막지 못하는 이유와 원자적 전이
- PATCH 메서드의 비멱등성과 특정 패치 연산을 멱등하게 설계하는 조건
- 자동 재시도가 통신 장애 상황으로 제한되어야 하는 이유
- 멱등 PUT의 재시도가 다른 클라이언트의 중간 변경을 덮어쓸 수 있는 이유와 `If-Match`의 역할
- GET, QUERY, POST가 본문 기반 조회에서 갖는 의미 차이

## 관련 문서
- [[REST|REST]]
- [[HTTP-QUERY-Method|HTTP QUERY 메서드]]
- [[HTTP-Status-Code|HTTP Status Code]]
- [[Rate-Limiting|Rate Limiting]]
- [[Zero-Downtime-Deployment|무중단 배포]]
- [[Idempotency#POST를 멱등하게 만드는 패턴|Idempotency Key 패턴]]

## 출처

- 김영한 강사, [HTTP 메서드의 속성](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61367)
- 최상용 강사, [요구사항 정의](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=321521)
- 최상용 강사, [동일한 주문인지 알 수 있도록 주문로직 수정하기](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=323829)
- 최상용 강사, [Lock 을 활용하여 주문로직이 1번만 수행되도록 변경하기](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=323878)
- [RFC 9110 — HTTP Semantics — RFC Editor](https://www.rfc-editor.org/info/rfc9110/)
- [RFC 10008 — The HTTP QUERY Method — RFC Editor](https://www.rfc-editor.org/info/rfc10008/)
- [The Idempotency-Key HTTP Header Field — IETF Datatracker](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [SETNX (locking pattern 주의) — Redis Docs](https://redis.io/docs/latest/commands/setnx/)
- [매일메일 — HTTP 멱등성](https://www.maeil-mail.kr/question/90)
