---
tags: [web, network, rest, api, http]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["REST", "RESTful", "REST API"]
---

# REST, RESTful API

REST(Representational State Transfer)는 Roy Fielding의 박사 논문에서 Web 아키텍처를 설명하고 유도한 **분산 Hypermedia System의 아키텍처 스타일**이다. **RESTful**은 이 제약을 만족하는 System이나 API를 가리킨다.

## 핵심 명제

- **자원(Resource) 중심** — URI가 자원을 식별하고, HTTP Method가 요청 의미를 전달한다
- **표현(Representation) 분리** — 실제 자원과 그 표현(JSON, XML, HTML)은 별개
- **품질 속성의 Trade-off** — 성능, 확장성, 단순성, 수정 가능성, 가시성, 이식성과 신뢰성을 함께 고려
- **HTTP를 쓸 때 표준 의미 활용** — Method, 상태 코드, Cache와 인증 의미를 재발명하지 않음

## 표현된 상태(Representational State)란

REST의 이름이 곧 핵심이다 — 클라이언트와 서버가 주고받는 것은 **리소스 원본이 아니라 그 리소스의 표현된 상태**다. 서버가 응답으로 내려주는 JSON은 자원 자체가 아니라, DB의 한 행 같은 원본 리소스를 특정 형식으로 표현한 스냅샷이다.

- 어떤 형식으로 표현할지는 **콘텐츠 협상**으로 정해진다 — 클라이언트가 요청 헤더 `Accept`로 원하는 형식(application/json, application/xml 등)을 알리면, 서버가 지원하는 표현을 골라 응답 헤더 `Content-Type`(필요하면 `Content-Language`)으로 무엇을 어떻게 표현했는지 알린다 ([[HTTP-Content-Type|콘텐츠 협상]]).
- 그래서 같은 자원이라도 JSON으로도 XML로도 표현될 수 있다. 클라이언트가 받는 것은 늘 표현된 상태이지 원본이 아니다.

이 표현(REST)에 더해 **어떤 리소스인지는 URI가, 어떤 행위인지는 HTTP Method가** 표현한다. 이 셋이 맞물려, 설명 없이도 `GET /users/2`만으로 의도가 읽히는 API가 된다.

## 6가지 아키텍처 제약

### 1. Server-Client 구조

자원을 가진 쪽(서버)과 요청하는 쪽(클라이언트)을 분리 → 각자 독립적으로 진화. 관심사의 분리로 플랫폼 간 이식성 확보.

### 2. Stateless(무상태)

각 요청은 **이전 요청과 독립적**이며, 이해에 필요한 정보를 요청 안에서 얻을 수 있어야 한다. REST의 Session State는 Client가 보관하지만 Server는 Resource State와 인증에 필요한 계정, 권한 데이터를 저장할 수 있다.
- 장점: 요청 사이 Server Session affinity가 없어 가시성, 확장성과 장애 복구가 좋아짐
- 비용: 요청마다 자격증명과 필요한 Context를 전달하고 검증해야 함

### 3. Cacheable(캐시 가능)

응답에 캐시 가능 여부(`Cache-Control`, `ETag`, `Last-Modified`)를 명시하여 클라이언트, 중간 프록시가 재활용. HTTP가 이미 제공하는 캐시 의미를 그대로 활용.

### 4. Layered System(계층화)

클라이언트는 최종 서버와 직접 통신하는지, 프록시, 게이트웨이, 로드밸런서를 거치는지 알 필요가 없다. 각 계층은 자기 바로 위, 아래만 앎. 보안, 캐싱, 로드밸런싱을 독립 레이어로 끼워 넣을 수 있음.

### 5. Code-On-Demand (선택적)

서버가 실행 가능한 코드(예: JavaScript)를 클라이언트로 전송해 기능 확장. REST에서 **유일하게 선택 조건**.

### 6. Uniform Interface(인터페이스 일관성)

REST의 핵심 차별점. 네 가지 하위 제약:
- **자원 식별**(URI): 리소스는 URI로 고유 식별
- **표현을 통한 자원 조작**: 클라이언트가 받은 표현(JSON 등)과 메타데이터로 자원을 수정/삭제
- **자기 서술 메시지**: 메시지 자체에 처리 방법(미디어 타입, 상태 코드 등)이 담김
- **HATEOAS**: 응답에 다음 가능한 행동의 링크를 포함. 실무에서는 엄격히 지키지 않는 경우가 많음

## HTTP Method 의미

| Method | 의미 | 멱등성 | 안전성 |
|---|---|---|---|
| GET | 조회 | ✅ | ✅ |
| POST | 대상 Resource별 처리 | ✗ | ✗ |
| PUT | 전체 교체, 없으면 생성 | ✅ | ✗ |
| PATCH | 부분 수정 | 구현에 따라 | ✗ |
| DELETE | 삭제 | ✅ | ✗ |

- **Safe**: Client가 대상 Resource 상태 변경을 요청하거나 기대하지 않음. 로그 같은 부수효과까지 금지하지 않는다.
- **Idempotent**: 같은 요청을 반복했을 때 의도한 효과가 한 번과 같다. 응답이 같다는 뜻은 아니며 자동 재시도 정책은 별도다.

## Resource URI 설계

다음은 HTTP나 REST가 강제하는 문법이 아니라 팀이 일관되게 선택할 수 있는 관례다.

- Collection과 Member를 `/orders`, `/orders/{orderId}`처럼 구분한다.
- 실제 하위 Resource 관계라면 `/orders/{orderId}/items/{itemId}`처럼 ID가 여러 개여도 된다. 최대 한 개 규칙은 없다.
- 조회 조건, 정렬과 Pagination은 Query를 사용한다.
- 단순 CRUD는 Method 의미를 활용하고, 취소처럼 독립된 도메인 행동은 `POST /orders/{id}/cancellation` 같은 처리 Resource로 모델링할 수 있다.
- 복수형, kebab-case, trailing slash와 Version 위치는 표준 정답이 아니라 호환성과 운영을 고려한 API convention이다.
- DB Table을 그대로 노출하기보다 Client에게 안정적인 도메인 Resource와 관계를 제공한다.

## 상태 코드 컨벤션

| 대역 | 의미 | 대표 코드 |
|---|---|---|
| 2xx | 성공 | 200 OK, 201 Created, 204 No Content |
| 3xx | 리다이렉션, 캐시 | 301, 304 Not Modified |
| 4xx | 클라이언트 오류 | 400, 401, 403, 404, 409, 422, 429 |
| 5xx | 서버 오류 | 500, 502, 503, 504 |

- 200과 201 구분, 204(본문 없음) 활용
- 401은 유효한 인증 자격증명이 없고 `WWW-Authenticate` challenge가 필요한 경우다. 403은 요청을 이해했지만 수행을 거부한 경우이며 로그인 여부만으로 정의되지 않는다.
- 422(Unprocessable Content)는 content 형식과 구문은 이해했지만 포함된 지시를 처리할 수 없는 경우다. 검증 실패에 쓰는 것은 흔한 API 관례다.

## Richardson Maturity Model (REST 성숙도)

| Level | 특징 |
|---|---|
| 0 | HTTP를 단일 엔드포인트의 터널로만 사용(SOAP 스타일) |
| 1 | URI로 자원을 분리 |
| 2 | HTTP Method와 상태 코드를 제대로 사용 |
| 3 | HATEOAS(하이퍼미디어 컨트롤) |

대부분의 "REST API"는 Level 2에 머무르며, 실무에서는 이것만으로도 충분한 경우가 많음.

## 흔한 안티패턴

- **CRUD 의미를 URI에 중복** — `/createUser`, `/deleteOrder/1`처럼 표준 Method와 같은 의미를 다시 encode
- **GET으로 상태 변경** — 크롤러, 캐시, 프리페치로 재호출되면 의도치 않은 변경
- **커스텀 상태 코드 남발** — 200 OK + body 안에 `{"success": false}`를 쓰면 표준 처리 인프라(재시도, 에러 모니터링)가 무력화
- **일관성 없는 Versioning** — URI, Query 또는 Media Type 중 선택한 전략의 Cache key, 관측성과 폐기 정책을 계약에 명시하지 않음
- **암묵적 Server Session 의존** — 요청만으로 Context를 복원할 수 없어 Instance affinity나 공유 Session 저장소가 필요해짐

## API 성능 개선 기법

REST API 자체가 성능 튜닝 대상은 아니지만, 설계, 응답 수준에서 흔히 쓰는 기법:

- **페이지네이션** — 큰 Collection은 기본 paging을 제공한다. 임의 page 이동은 offset, 안정적인 순차 탐색과 깊은 page 성능은 cursor가 유리할 수 있어 요구에 맞게 선택한다.
- **필드 선택(Sparse Fieldset)** — `?fields=id,name,email`로 필요한 필드만 응답. GraphQL 스타일 오버페칭 완화
- **응답 압축** — `Accept-Encoding: gzip, br`를 활용한다. Streaming 응답은 압축 임계치와 Proxy buffering 동작을 측정한다.
- **HTTP 캐싱** — `Cache-Control`, `ETag`, `If-None-Match`로 304 응답. CDN, Reverse Proxy 캐시 레이어 활용
- **N+1 회피** — Repository 계층에서 연관 엔티티 한 번에 로딩(fetch join, DataLoader 패턴)
- **비동기 처리** — 무거운 작업은 202 Accepted + 폴링/웹훅으로 분리
- **HTTP/2, HTTP/3** — multiplexing으로 커넥션 수 절감. 정적 리소스 많은 API에 특히 유효
- **Partial Response** — 대용량 파일은 `Range` 헤더로 부분 요청 허용

## 면접 체크포인트

- REST 6가지 제약 중 필수 5가지 + 선택 1가지
- Stateless가 수평 확장과 어떤 관계인가
- URI 설계의 핵심 규칙 5가지 이상
- PUT과 PATCH, POST와 PUT의 차이(멱등성)
- HATEOAS가 실무에서 덜 쓰이는 이유(Level 3)
- REST 제약이 성능, 확장성, 가시성과 수정 가능성 사이에 만드는 Trade-off
- REST vs GraphQL vs gRPC 선택 기준 ([[API-Comparison|비교 문서]] 참고)

## 출처
- 김영한 강사, [HTTP API를 만들어보자](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61364)
- 김영한 강사, [HTTP API 설계 예시](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61369)
- [Roy Fielding, Architectural Styles and the Design of Network-based Software Architectures](https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [gmlwjd9405 — REST와 RESTful API](https://gmlwjd9405.github.io/2018/09/21/rest-and-restful.html)
- [jojoldu — HTTP API 디자인: URI 편](https://jojoldu.tistory.com/783)
- [lob-dev — RESTful 설계 원칙에 대한 못다 한 이야기](https://lob-dev.tistory.com/90)

## 관련 문서
- [[HTTP-Content-Type|HTTP Content-Type, MIME Type]] — 표현 형식의 콘텐츠 협상
- [[Idempotency|HTTP 멱등성]] — PUT vs PATCH, 메서드별 멱등성과 재시도
- [[HTTP-Status-Code|HTTP Status Code, Header]]
- [[HTTP-Seminar|HTTP 버전별 진화와 핵심 요소]]
- [[HTTPS-TLS|HTTPS, TLS Handshake]]
