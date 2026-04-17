---
tags: [web, http, idempotency, api]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Idempotency", "멱등성", "Idempotent Methods"]
---

# HTTP 멱등성 (Idempotency)

**같은 요청을 1번 보내든 N번 보내든 서버 상태와 결과가 동일**한 성질. 네트워크 단절·타임아웃으로 재시도가 필요한 분산 환경에서 핵심 안전장치.

## 정의

연산 f가 멱등하다는 것은 `f(f(x)) = f(x)` — 몇 번 적용하든 결과가 같음. HTTP 맥락에서는:
- 같은 요청을 반복해도 **서버 리소스 상태가 동일**
- 응답은 다를 수 있음 (예: 첫 요청 `201 Created`, 재요청 `200 OK`)

"응답이 같다"가 아니라 **"서버 상태가 같다"** 가 정의.

## 메서드별 멱등성

| 메서드 | 멱등 | 안전 (Safe) | 비고 |
|---|---|---|---|
| GET | ✅ | ✅ | 조회만, 상태 변경 없음 |
| HEAD | ✅ | ✅ | 헤더만 조회 |
| OPTIONS | ✅ | ✅ | 지원 메서드 조회 |
| PUT | ✅ | ✗ | 전체 교체 — 동일 페이로드면 결과 같음 |
| DELETE | ✅ | ✗ | 첫 DELETE 성공, 이후 404 — 하지만 상태는 "삭제됨"으로 동일 |
| POST | ✗ | ✗ | 매번 새 리소스 생성 (대표적 비멱등) |
| PATCH | ✗ (경우에 따라) | ✗ | `age += 1` 같은 상대 변경은 비멱등, `age = 30` 같은 절대 변경은 멱등 |

**Safe**: 서버 상태를 전혀 변경하지 않음. 모든 Safe는 Idempotent지만 역은 아님.

## 왜 중요한가

분산 환경의 전형적 시나리오:
1. 클라이언트가 요청 전송
2. 서버가 처리 완료
3. 응답 도착 전 네트워크 끊김
4. 클라이언트는 **성공했는지 모름**

멱등하면 그냥 **재시도하면 된다**. 비멱등이면:
- 중복 결제
- 중복 주문
- 중복 이메일 발송

→ 데이터 정합성 붕괴.

## POST를 멱등하게 만드는 패턴

POST는 본질적으로 비멱등이지만, 실무에선 **멱등 키(Idempotency Key)** 로 우회.

### Idempotency Key 헤더
```
POST /payments
Idempotency-Key: client-generated-uuid-123
Content-Type: application/json

{ "amount": 10000 }
```

서버 동작:
1. `Idempotency-Key`가 DB/캐시에 이미 있으면 → **이전 응답을 그대로 반환** (실제 처리 skip)
2. 없으면 처리 후 key + 응답을 저장
3. TTL(24시간·7일 등) 경과 후 자동 정리

Stripe·PayPal·Toss Payments 등 결제 API의 표준 패턴.

### 구현 포인트
- 키는 **클라이언트가 생성** (UUIDv4 등)
- 키 + 요청 본문을 함께 해시해서 **같은 키 + 다른 본문** 감지 (보안)
- 동시 요청 처리: DB unique index 또는 Redis SETNX로 원자성 확보
- 키 저장소 조회 비용을 고려해 적절한 TTL

## PUT vs POST의 멱등성 차이

```
PUT /users/123    { "name": "dc" }    // 멱등: 123번 사용자를 이 값으로 설정
POST /users       { "name": "dc" }    // 비멱등: 매번 새 사용자 생성
```

리소스 식별자를 클라이언트가 결정하면 PUT, 서버가 결정하면 POST — 이 규칙이 자연스럽게 멱등/비멱등을 가른다.

## DELETE의 미묘함

첫 DELETE: `200 OK` (삭제 성공)
재DELETE: `404 Not Found` (이미 없음)

응답은 다르지만 **서버 상태**(리소스 없음)는 동일 → 멱등. 이걸 헷갈려서 "DELETE는 비멱등"이라 답하는 경우가 많음.

## 네트워크 재시도 정책과 결합

- **멱등 메서드**: HTTP 클라이언트가 **자동 재시도** 안전 (타임아웃·5xx 시)
- **비멱등**: 자동 재시도 금지. 사용자에게 확인 후 수동 재시도 또는 Idempotency-Key로 안전화

Axios·OkHttp·Retrofit 같은 HTTP 클라이언트가 기본 retry 대상으로 GET·PUT·DELETE만 포함하는 이유.

## 면접 체크포인트

- 멱등성의 정확한 정의 ("응답이 같다"가 아니라 "상태가 같다")
- DELETE가 멱등인 이유 (응답은 달라도 상태는 동일)
- POST를 멱등하게 만드는 Idempotency Key 패턴
- PATCH가 멱등일 수도 비멱등일 수도 있는 조건 (절대 vs 상대 변경)
- 비멱등 요청을 자동 재시도하면 안 되는 이유

## 출처
- [매일메일 — HTTP 멱등성](https://www.maeil-mail.kr/question/90)

## 관련 문서
- [[REST|REST]]
- [[HTTP-Status-Code|HTTP Status Code]]
- [[Rate-Limiting|Rate Limiting]]
- [[Idempotency-Key|Idempotency Key 상세]]
