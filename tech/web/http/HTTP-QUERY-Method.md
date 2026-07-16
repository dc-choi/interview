---
tags: [web, http, query-method, rfc10008, idempotency, caching]
status: done
verified_at: 2026-07-16
category: "웹&네트워크(Web&Network)"
aliases: ["HTTP QUERY Method", "RFC 10008", "HTTP QUERY 메서드"]
---

# HTTP QUERY 메서드 (RFC 10008)

HTTP `QUERY`는 요청 본문으로 질의를 전달하면서도 안전하고 멱등적인 조회 의미를 명시하는 메서드다. GET의 URI 중심 조회와 POST의 본문 중심 처리 사이를 메우며, RFC 10008에서 IETF Proposed Standard로 정의됐다.

## GET과 POST 사이의 빈틈

복잡한 검색 조건을 GET의 URI에 모두 넣으면 다음 문제가 생긴다.

- 중간 시스템마다 지원하는 URI 길이가 달라 한도를 예측하기 어렵다.
- 구조화된 질의를 URI에 인코딩하는 비용이 크다.
- URI는 요청 본문보다 로그, 북마크와 분석 도구에 남기 쉽다.
- 질의 입력 조합마다 별도 URI처럼 취급된다.

POST는 본문을 쓸 수 있지만 표준 메서드 의미만으로는 읽기 전용이며 멱등적인 작업인지 중간 시스템이 알 수 없다. QUERY는 본문을 사용한다는 점은 POST와 같고, 안전성과 멱등성을 선언한다는 점은 GET과 같다.

| 속성 | GET | QUERY | POST |
|---|---|---|---|
| 질의 입력 | 주로 URI | 요청 본문 | 요청 본문 |
| 안전 | 예 | 예 | 아니요 |
| 멱등 | 예 | 예 | 아니요 |
| 응답 캐시 | 지원 | 본문과 메타데이터를 키에 포함해 지원 | 명시적 조건에서 제한적으로 지원 |
| 질의 자체 URI | 대상 URI 자체 | `Location`으로 선택적 부여 | 메서드가 정의하지 않음 |

안전하다는 것은 클라이언트가 대상 리소스의 상태 변경을 요청하거나 기대하지 않는다는 뜻이다. 서버의 접근 로그 기록이나 질의 결과용 보조 리소스 생성까지 금지한다는 뜻은 아니다.

## 요청과 응답

```http
QUERY /feed HTTP/1.1
Host: example.org
Content-Type: application/x-www-form-urlencoded

q=foo&limit=10&sort=-published
```

요청 본문과 `Content-Type`이 함께 질의의 의미를 정의하고, 대상 URI가 질의 범위를 정한다.

- 서버는 `Content-Type`이 없거나 본문과 일치하지 않으면 요청을 실패시켜야 한다.
- 지원하지 않는 질의 미디어 타입에는 `415 Unsupported Media Type`이 적합하다.
- 문법은 맞지만 질의 내용을 처리할 수 없으면 `422 Unprocessable Content`를 사용할 수 있다.
- 클라이언트가 요구한 응답 미디어 타입을 제공할 수 없으면 `406 Not Acceptable`이 적합하다.
- 성공한 질의 결과는 일반적으로 `200 OK` 응답 본문에 담는다.

## 질의와 결과에 URI 부여하기

QUERY는 본문 기반 질의를 나중에 GET으로 다시 사용할 수 있도록 두 종류의 URI 연결을 제공한다.

| 응답 필드 | 가리키는 것 | 이후 GET의 의미 |
|---|---|---|
| `Location` | 요청 본문과 메타데이터를 반영한 동등 리소스 | 같은 질의 작업을 다시 수행 |
| `Content-Location` | 방금 생성한 질의 결과 리소스 | 해당 결과를 다시 조회 |

서버가 `303 See Other`와 `Location`을 반환하면 클라이언트는 그 URI를 GET으로 조회할 수 있다. 생성된 URI는 임시일 수 있으므로 실패 시 원래 QUERY 요청을 다시 보낼 수 있어야 한다.

## 캐시와 조건부 요청

QUERY 응답은 캐시할 수 있지만 URL만으로 캐시 키를 만들면 안 된다.

- 캐시 키는 요청 본문과 `Content-Type` 같은 관련 메타데이터를 반드시 포함한다.
- 의미가 같은 본문을 정규화해 캐시 효율을 높일 수 있지만, 서버와 다른 방식으로 정규화하면 잘못된 응답을 반환할 수 있다.
- `Location`으로 동등 리소스 URI를 받은 뒤 GET으로 전환하면 일반적인 캐시 경로를 사용하기 쉽다.
- 조건부 QUERY의 선택된 표현은 동등 리소스에 GET을 보냈을 때의 선택된 표현과 같다.

멱등성이 있으므로 응답을 읽기 전 통신 장애가 발생한 경우 동일한 QUERY를 반복할 수 있다. 다만 재시도 횟수와 백오프, 전체 시간 제한은 별도의 운영 정책이다.

## `Accept-Query`로 지원 형식 알리기

서버는 `Accept-Query` 응답 필드로 해당 리소스가 QUERY에서 처리할 수 있는 질의 미디어 타입을 알릴 수 있다.

```http
Accept-Query: "application/jsonpath", application/sql;charset="UTF-8"
```

이 필드는 Structured Fields의 List 문법을 사용한다. 일반 `Accept` 헤더와 비슷하게 보여도 같은 파서 규칙이라고 가정하면 안 된다.

## 보안과 호환성 경계

- 질의를 본문으로 옮기면 URI 로그 노출 가능성은 줄지만 비밀이 보장되지는 않는다. TLS, 본문 로깅 정책과 권한 검증은 여전히 필요하다.
- 질의나 결과에 URI를 부여할 때 원래 본문의 민감 정보를 URI에 복사하지 않는다.
- QUERY는 CORS safelisted method가 아니므로 브라우저의 교차 출처 요청에는 preflight가 필요하다.
- RFC 등록과 실제 지원은 별개다. 클라이언트, 서버 프레임워크, 프록시, 게이트웨이, WAF, CDN과 API 명세 도구가 메서드와 본문을 끝까지 보존하는지 확인한다.
- 메서드를 구현하지 않은 서버는 `501 Not Implemented`, 구현했지만 해당 리소스에서 허용하지 않으면 `405 Method Not Allowed`로 응답할 수 있다.

## 메서드 선택 기준

| 상황 | 우선 선택 |
|---|---|
| 짧고 단순하며 URI로 표현하기 좋은 조회 | GET |
| 크거나 구조화된 본문이 필요하고 전체 경로가 QUERY를 지원하는 읽기 전용 질의 | QUERY |
| 상태 변경 또는 QUERY를 지원하지 않는 환경의 본문 기반 작업 | POST |

읽기 전용 질의를 POST로 구현할 수는 있지만 일반 HTTP 구성요소는 그 작업이 안전하고 멱등적이라는 사실을 알지 못한다. POST로 대체할 때는 캐시와 자동 재시도 정책을 애플리케이션 계약으로 별도 정의한다.

## 점검 질문

- 이 작업은 대상 리소스의 상태 변경을 요청하지 않는가
- GET URI로 표현하기 어려울 만큼 질의가 크거나 구조적인가
- 캐시 키가 요청 본문과 관련 메타데이터를 포함하는가
- 모든 중간 시스템이 QUERY와 요청 본문을 보존하는가
- 브라우저 호출이라면 CORS preflight를 처리하는가
- `Location`과 `Content-Location`의 의미를 구분했는가

## 관련 문서

- [[Idempotency|HTTP 멱등성]]
- [[HTTP-Content-Type|Content-Type과 미디어 타입]]
- [[URI-URL-URN|URI, URL, URN]]
- [[REST|REST]]
- [[GraphQL-Caching|GraphQL 캐싱과 HTTP 전송]]
- [[HTTP-Status-Code|HTTP 상태 코드]]

## 출처

- [RFC 10008 — The HTTP QUERY Method — RFC Editor](https://www.rfc-editor.org/info/rfc10008/)
- [RFC 9110 — HTTP Semantics — RFC Editor](https://www.rfc-editor.org/info/rfc9110/)
