---
tags: [web, network, rest, api, http]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["REST", "RESTful", "REST API"]
---

# REST · RESTful API

REST(Representational State Transfer)는 Roy Fielding의 박사 논문에서 제안된 **웹의 아키텍처 스타일**이다. HTTP를 설계한 사람이 "HTTP의 본래 의도를 살려 자원을 다루는 방식"을 6가지 제약으로 정리한 것. **RESTful**은 이 제약을 따르는 시스템·API를 지칭한다.

## 핵심 명제

- **자원(Resource) 중심** — URI가 자원을 가리키고, HTTP Method가 행위를 가리킨다
- **표현(Representation) 분리** — 실제 자원과 그 표현(JSON·XML·HTML)은 별개
- **성능이 아니라 일관성이 목적** — RESTful은 성능을 위한 게 아니라 **이해도·호환성·확장성**을 높이기 위한 컨벤션
- **HTTP 표준을 그대로 활용** — 상태 코드·캐시·인증 등 이미 있는 것을 재발명하지 않음

## 6가지 아키텍처 제약

### 1. Server-Client 구조

자원을 가진 쪽(서버)과 요청하는 쪽(클라이언트)을 분리 → 각자 독립적으로 진화. 관심사의 분리로 플랫폼 간 이식성 확보.

### 2. Stateless(무상태)

각 요청은 **이전 요청과 독립적**이며, 서버는 클라이언트 세션을 보관하지 않는다. 요청에 필요한 모든 정보를 클라이언트가 담아서 보내야 함.
- 장점: 수평 확장 용이(어느 인스턴스든 요청 처리 가능), 장애 복구 쉬움
- 비용: 요청 크기 증가(매번 인증 토큰·컨텍스트 포함)

### 3. Cacheable(캐시 가능)

응답에 캐시 가능 여부(`Cache-Control`·`ETag`·`Last-Modified`)를 명시하여 클라이언트·중간 프록시가 재활용. HTTP가 이미 제공하는 캐시 의미를 그대로 활용.

### 4. Layered System(계층화)

클라이언트는 최종 서버와 직접 통신하는지, 프록시·게이트웨이·로드밸런서를 거치는지 알 필요가 없다. 각 계층은 자기 바로 위·아래만 앎. 보안·캐싱·로드밸런싱을 독립 레이어로 끼워 넣을 수 있음.

### 5. Code-On-Demand (선택적)

서버가 실행 가능한 코드(예: JavaScript)를 클라이언트로 전송해 기능 확장. REST에서 **유일하게 선택 조건**.

### 6. Uniform Interface(인터페이스 일관성)

REST의 핵심 차별점. 네 가지 하위 제약:
- **자원 식별**(URI): 리소스는 URI로 고유 식별
- **표현을 통한 자원 조작**: 클라이언트가 받은 표현(JSON 등)과 메타데이터로 자원을 수정/삭제
- **자기 서술 메시지**: 메시지 자체에 처리 방법(미디어 타입·상태 코드 등)이 담김
- **HATEOAS**: 응답에 다음 가능한 행동의 링크를 포함. 실무에서는 엄격히 지키지 않는 경우가 많음

## HTTP Method 의미

| Method | 의미 | 멱등성 | 안전성 |
|---|---|---|---|
| GET | 조회 | ✅ | ✅ |
| POST | 생성·비멱등 작업 | ✗ | ✗ |
| PUT | 전체 교체 · 없으면 생성 | ✅ | ✗ |
| PATCH | 부분 수정 | 구현에 따라 | ✗ |
| DELETE | 삭제 | ✅ | ✗ |

- **Safe**: 서버 상태를 바꾸지 않음
- **Idempotent**: 같은 요청을 여러 번 보내도 결과가 동일(재시도 안전)

## URI 설계 규칙

- **명사 중심**, 동사 금지 — `GET /users/1` (O), `GET /getUser?id=1` (X)
- **복수형 컬렉션** — `/users` (복수), 단일 자원 접근은 `/users/{id}`
- **슬래시(/)로 계층 표현** — `/users/{id}/devices/{deviceId}`
- **경로에 최대 1개 ID만** — `/orders/{orderId}/courses/{courseId}` (X), `/orders/{orderId}/courses` 후 필터링 (O). 유연성·유지보수성 향상
- **말미 슬래시 금지** — `/users/` → `/users`로 리다이렉트하거나 거부
- **소문자 + 하이픈(-) 사용** — `user_profiles`(X), `user-profiles`(△), **camelCase URI는 피하고 kebab-case** 권장. 언더스코어는 가독성 저하
- **쿼리 파라미터는 camelCase** — `?userId=123` (O), `?user_id=123` (X). JSON 표준과 일관성
- **확장자 제외** — `/users.json`(X), `Accept: application/json`으로 대체
- **버전은 경로에 명시적** — `/v1/orders` (O), `/orders?version=1` (X). URL 전용 버전 관리가 가장 흔함
- **행위는 Method로**, 예외적 동사는 ID 뒤로 — 단순 CRUD는 Method로 충분. 그 외 복잡한 행위만 `POST /orders/{orderId}/cancel` 템플릿 허용
- **필터·정렬·페이징은 쿼리스트링** — `/users?role=admin&sort=-createdAt&page=2&size=20`
- **리소스 중심 설계** — DB 테이블 구조를 그대로 노출하지 말 것. 도메인이 제공하는 의미에 집중. 권한 구분도 URI에 섞지 말 것(`/admin/users` vs `/users` 이중화 지양 — 토큰 스코프로 해결)

## 상태 코드 컨벤션

| 대역 | 의미 | 대표 코드 |
|---|---|---|
| 2xx | 성공 | 200 OK · 201 Created · 204 No Content |
| 3xx | 리다이렉션·캐시 | 301 · 304 Not Modified |
| 4xx | 클라이언트 오류 | 400 · 401 · 403 · 404 · 409 · 422 · 429 |
| 5xx | 서버 오류 | 500 · 502 · 503 · 504 |

- 200과 201 구분, 204(본문 없음) 활용
- 401(인증 실패) vs 403(권한 부족)을 혼동하지 말 것
- 422(Unprocessable Entity)는 검증 실패, 400은 포맷 오류에 쓰는 관례

## Richardson Maturity Model (REST 성숙도)

| Level | 특징 |
|---|---|
| 0 | HTTP를 단일 엔드포인트의 터널로만 사용(SOAP 스타일) |
| 1 | URI로 자원을 분리 |
| 2 | HTTP Method와 상태 코드를 제대로 사용 |
| 3 | HATEOAS(하이퍼미디어 컨트롤) |

대부분의 "REST API"는 Level 2에 머무르며, 실무에서는 이것만으로도 충분한 경우가 많음.

## 흔한 안티패턴

- **URI에 동사 사용** — `/createUser`, `/deleteOrder/1`
- **GET으로 상태 변경** — 크롤러·캐시·프리페치로 재호출되면 의도치 않은 변경
- **커스텀 상태 코드 남발** — 200 OK + body 안에 `{"success": false}`를 쓰면 표준 처리 인프라(재시도·에러 모니터링)가 무력화
- **버전을 쿼리스트링으로 숨기기** — `/api?version=2`보다 `/v2/...` 또는 `Accept: application/vnd.api+json; version=2`
- **Stateless 위반** — 서버 세션에 사용자 컨텍스트 저장 → 수평 확장 시 스티키 세션 필요

## API 성능 개선 기법

REST API 자체가 성능 튜닝 대상은 아니지만, 설계·응답 수준에서 흔히 쓰는 기법:

- **페이지네이션** — 컬렉션 조회는 기본 페이징 필수. offset-based는 깊은 페이지에서 느려지므로 **cursor-based**(last-seen id) 권장
- **필드 선택(Sparse Fieldset)** — `?fields=id,name,email`로 필요한 필드만 응답. GraphQL 스타일 오버페칭 완화
- **응답 압축** — `Accept-Encoding: gzip, br` 활용. **chunked 전송 시 min-response-size 설정은 무효**
- **HTTP 캐싱** — `Cache-Control`, `ETag`, `If-None-Match`로 304 응답. CDN·Reverse Proxy 캐시 레이어 활용
- **N+1 회피** — Repository 계층에서 연관 엔티티 한 번에 로딩(fetch join·DataLoader 패턴)
- **비동기 처리** — 무거운 작업은 202 Accepted + 폴링/웹훅으로 분리
- **HTTP/2·HTTP/3** — multiplexing으로 커넥션 수 절감. 정적 리소스 많은 API에 특히 유효
- **Partial Response** — 대용량 파일은 `Range` 헤더로 부분 요청 허용

## 면접 체크포인트

- REST 6가지 제약 중 필수 5가지 + 선택 1가지
- Stateless가 수평 확장과 어떤 관계인가
- URI 설계의 핵심 규칙 5가지 이상
- PUT과 PATCH, POST와 PUT의 차이(멱등성)
- HATEOAS가 실무에서 덜 쓰이는 이유(Level 3)
- RESTful API의 목적이 **성능이 아니라 일관성**이라는 포인트
- REST vs GraphQL vs gRPC 선택 기준 ([[API-Comparison|비교 문서]] 참고)

## 출처
- [gmlwjd9405 — REST와 RESTful API](https://gmlwjd9405.github.io/2018/09/21/rest-and-restful.html)
- [jojoldu — HTTP API 디자인: URI 편](https://jojoldu.tistory.com/783)
- [lob-dev — RESTful 설계 원칙에 대한 못다 한 이야기](https://lob-dev.tistory.com/90)

## 관련 문서
- [[HTTP-Content-Type|HTTP Content-Type · MIME Type]]
- [[HTTP-Status-Code|HTTP Status Code · Header]]
- [[HTTP-Seminar|HTTP 버전별 진화와 핵심 요소]]
- [[HTTPS-TLS|HTTPS · TLS Handshake]]
