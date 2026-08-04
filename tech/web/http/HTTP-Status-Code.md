---
tags: [web, http, status-code, api, error-handling]
status: done
verified_at: 2026-08-04
category: "Web - HTTP"
aliases: ["HTTP 상태 코드", "HTTP Status Code", "401 vs 403", "502 vs 504"]
---

# HTTP 상태 코드

상태 코드는 서버가 요청을 해석하고 처리한 결과를 세 자리 숫자로 전달하는 HTTP 의미의 일부다. 첫 숫자로 부류를 이해하며 알 수 없는 유효 코드는 같은 부류의 x00처럼 처리한다. 예를 들어 471은 의미를 몰라도 400처럼 다룬다.

| 부류 | 의미 |
|---|---|
| 1xx | 최종 응답 전의 정보 |
| 2xx | 요청을 성공적으로 수신, 이해하고 처리 |
| 3xx | 요청 완료를 위한 추가 동작 |
| 4xx | 요청에 Client 오류가 있다고 보임 |
| 5xx | Server가 오류를 인지했거나 처리 불가 |

애플리케이션 실패를 200과 `{ "success": false }`만으로 숨기면 Cache, Proxy, 모니터링과 Client 라이브러리가 표준 의미를 활용할 수 없다. 상태 코드는 큰 부류를 나타내고 구체적인 문제는 RFC 9457 Problem Details 같은 응답 content로 보완한다.

## 2xx 성공

- `200 OK`: Method에 따른 일반 성공이다.
- `201 Created`: 하나 이상의 Resource가 생성됐다. 주 Resource의 URI를 `Location`으로 보낼 수 있다.
- `202 Accepted`: 처리를 접수했지만 아직 완료하지 않았다. 처리 상태를 조회할 Monitor URI나 결과 확인 방법을 표현에 제공한다.
- `204 No Content`: 성공했으며 응답 content가 없다. 204 응답에 content를 넣지 않는다.
- `206 Partial Content`: Range 요청의 일부 Representation을 반환한다.

## 3xx와 Redirect

| 코드 | 지속성 | 자동 Redirect의 Method |
|---|---|---|
| `301 Moved Permanently` | 영구 | 역사적 호환 때문에 POST를 GET으로 바꿀 수 있음 |
| `302 Found` | 일시 | 역사적 호환 때문에 POST를 GET으로 바꿀 수 있음 |
| `303 See Other` | 일시 | 결과를 GET 또는 HEAD로 조회하도록 유도 |
| `307 Temporary Redirect` | 일시 | Method와 content를 바꾸면 안 됨 |
| `308 Permanent Redirect` | 영구 | Method와 content를 바꾸면 안 됨 |

POST 처리 후 303으로 결과 페이지를 GET하게 하는 PRG는 새로고침에 의한 폼 재제출을 줄인다. 중복 처리 자체는 Server의 멱등성, 제약 조건과 중복 방지 토큰으로도 막아야 한다.

`304 Not Modified`는 3xx 부류지만 다른 URI로 이동시키는 Redirect가 아니다. 조건부 GET이나 HEAD의 Representation이 바뀌지 않았음을 알리고 저장된 content 재사용을 허용하며 응답 content를 포함하지 않는다.

## 4xx Client 오류

- `400 Bad Request`: 잘못된 구문, framing이나 deceptive routing 등 Client 오류로 요청을 처리하지 않는다.
- `401 Unauthorized`: 대상 Resource에 유효한 인증 자격증명이 없다. 서버는 `WWW-Authenticate` challenge를 하나 이상 보내야 한다.
- `403 Forbidden`: 요청을 이해했지만 수행을 거부한다. 인증된 사용자 권한 부족이 흔한 사례지만 정의가 그것으로 제한되지는 않는다. Resource 존재를 숨기려면 404를 사용할 수 있다.
- `404 Not Found`: 현재 Representation을 찾지 못했거나 존재 공개를 원하지 않는다. 영구 소멸을 안다면 410을 검토한다.
- `405 Method Not Allowed`: Method는 알려져 있지만 대상 Resource가 지원하지 않는다. 현재 허용 Method를 `Allow`에 넣어야 한다.
- `406 Not Acceptable`: proactive negotiation 조건을 만족하는 Representation이 없고 기본값도 보내지 않는다.
- `408 Request Timeout`: Server가 기다리던 완전한 요청을 받지 못해 연결을 닫으려 한다.
- `409 Conflict`: 현재 Resource 상태와 요청이 충돌한다.
- `415 Unsupported Media Type`: 요청 content 형식이나 coding을 지원하지 않는다.
- `422 Unprocessable Content`: 형식과 구문은 이해했지만 포함된 지시를 처리할 수 없다.
- `429 Too Many Requests`: 요청량 제한을 초과했다. 별도 RFC 6585가 정의하며 `Retry-After`를 함께 보낼 수 있다.

## 5xx Server 오류

- `500 Internal Server Error`: 예기치 않은 조건으로 요청을 처리하지 못했다.
- `501 Not Implemented`: 요청에 필요한 기능을 지원하지 않는다. 모든 Resource에서 알 수 없는 Method에 적합하다.
- `502 Bad Gateway`: Gateway나 Proxy가 Upstream에서 유효하지 않은 응답을 받았다. Upstream이 죽었다고 단정할 수 없다.
- `503 Service Unavailable`: 일시적 과부하나 점검으로 현재 처리할 수 없다. `Retry-After`로 대기 시간을 제안할 수 있다.
- `504 Gateway Timeout`: Gateway나 Proxy가 필요한 Upstream 응답을 제때 받지 못했다.

5xx라는 이유만으로 자동 재시도하지 않는다. Method의 멱등성, 전체 시간 제한, backoff, jitter와 Server가 제시한 `Retry-After`를 함께 판단한다.

## 출처

- 김영한 강사, [HTTP 상태코드 소개](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61370)
- 김영한 강사, [2xx 성공](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61371)
- 김영한 강사, [3xx 리다이렉션 1](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61372)
- 김영한 강사, [3xx 리다이렉션 2](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61780)
- 김영한 강사, [4xx 클라이언트 오류, 5xx 서버 오류](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61373)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 6585, Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585.html)
- [RFC 9457, Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)

## 관련 문서

- [[HTTP-Caching|HTTP 캐싱과 304]]
- [[Idempotency|HTTP 멱등성과 재시도]]
- [[Rate-Limiting|Rate Limiting과 429]]
- [[Auth-Method-Selection|인증 방식 선택]]
