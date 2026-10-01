---
tags: [web, http, header, content-negotiation, authentication]
status: done
verified_at: 2026-10-01
category: "Web - HTTP"
aliases: ["HTTP Header Semantics", "HTTP 헤더 의미"]
---

# HTTP 헤더 의미와 콘텐츠 협상

HTTP Field는 메시지의 조건, 표현 메타데이터, 라우팅과 제어 정보를 이름과 값으로 전달한다. 과거의 General, Request, Response, Entity 분류를 현재 표준의 고정 분류처럼 외우기보다 각 필드가 어떤 메시지와 의미에 적용되는지 정의를 확인한다.

오래된 자료의 본문 용어는 다음처럼 옮겨 읽는다.

| 규격 | 본문을 이루는 것 | 본문 해석 정보 |
|---|---|---|
| RFC 2616(1999) | entity-body | entity-header |
| RFC 7230~7235(2014) | 표현 데이터를 실은 payload body | 표현 메타데이터(표현 헤더) |
| RFC 9110(2022) | content | representation metadata |

RFC 7230~7235는 entity 대신 표현(representation)으로 설명하고, 이를 대체한 RFC 9110은 payload와 payload body를 content로 바꿨다. field 이름과 맞추고 HTTP/2, HTTP/3의 frame payload와 혼동을 피하려는 것이다. REST의 R도 이 표현이다. 회원 같은 추상적인 리소스를 주고받을 때는 HTML, JSON 같은 표현으로 바꾼다. `Content-Length`처럼 표현 메타데이터이면서 HTTP/1.1 framing에도 관여하는 필드가 있어 분류는 문맥으로 읽는다([[HTTP-Content-Type|표현 메타데이터]]).

## 표현과 전송을 구분한다

| 필드 | 의미 |
|---|---|
| `Content-Type` | 표현의 미디어 타입과 처리 모델 |
| `Content-Encoding` | 원래 미디어 타입에 적용한 gzip, br 같은 content coding |
| `Content-Language` | 표현의 대상 자연어 |
| `Content-Length` | 선택된 표현 또는 메시지 content의 예상 octet 수, 문맥에 따라 다름 |
| `Transfer-Encoding` | HTTP/1.1 hop에서 적용한 전송 coding, HTTP/2와 HTTP/3에서는 사용하지 않음 |
| `Range`, `Content-Range` | 선택된 표현의 일부를 요청하거나 범위를 설명 |

압축 전송은 보통 `Accept-Encoding`으로 협상하고 응답의 `Content-Encoding`으로 알린다. `Content-Length`가 압축 응답에 있으면 전송되는 coded representation의 길이다.

## 콘텐츠 협상

클라이언트가 선호를 보내고 서버가 현재 가능한 Representation을 고르는 proactive negotiation의 주요 필드는 다음과 같다.

- `Accept`: 미디어 타입
- `Accept-Encoding`: content coding
- `Accept-Language`: 자연어
- `q=0`에서 `q=1`까지의 quality value: 상대 선호도, 생략하면 1

`Accept-Charset`은 UTF-8 보편화, 대역폭과 fingerprinting 문제로 RFC 9110에서 deprecated 됐다. 서버가 협상 결과를 캐시할 수 있게 하려면 응답에 `Vary: Accept-Encoding, Accept-Language`처럼 선택에 영향을 준 요청 필드를 적는다. `Vary`는 캐시 키를 확장하므로 실제 변형 축만 포함한다.

서버에 수용 가능한 표현이 없고 기본 표현도 보내지 않기로 했다면 406을 사용할 수 있다. 협상은 필수 기능이 아니며 하나의 JSON 표현만 제공하는 API는 단순한 고정 계약이 더 낫다.

## 라우팅과 응답 제어

- `Host`와 HTTP/2, HTTP/3의 `:authority`는 대상 URI의 host와 port를 전달해 대상 origin을 식별한다. IP 패킷에는 목적지 IP만 있으므로, 한 IP와 포트에 여러 도메인을 두는 가상 호스팅에서 서버와 리버스 프록시는 이 값으로 애플리케이션을 고른다. 그래서 HTTP/1.1 클라이언트는 모든 요청에 `Host`를 보내야 하고, 서버는 `Host`가 없거나 둘 이상이거나 값이 유효하지 않은 HTTP/1.1 요청에 400으로 응답해야 한다.
  - 프록시가 업스트림에 원래 `Host`를 넘기지 않으면 업스트림의 가상 호스트 라우팅이 깨진다([[Reverse-Proxy|리버스 프록시 흔한 실수]]).
  - HTTPS에서는 TLS 핸드셰이크의 SNI로 인증서를 고르고, 요청의 `Host`나 `:authority`로 애플리케이션을 고른다.
  - `Host`는 클라이언트가 보낸 값이라 공유 캐시 오염이나 의도하지 않은 서버로의 전달에 악용될 수 있다. 절대 URL 생성, 라우팅과 캐시 키에 쓰기 전에 허용 목록으로 검증한다.
- `Location`은 201에서 생성된 Resource, 3xx에서 이동할 URI를 가리킬 수 있다.
- `Allow`는 Resource가 현재 지원하는 Method 목록이며 405 응답에는 반드시 생성한다.
- `Retry-After`는 503의 재시도 대기나 3xx의 redirect 최소 지연을 날짜 또는 초로 제안할 수 있다.
- `Date`는 메시지 생성 시각, `Server`와 `User-Agent`는 구현 정보다. 불필요하게 상세한 제품 버전이나 fingerprinting 정보를 노출하지 않는다.
- `Referer`는 원래 URI를 포함할 수 있어 개인정보와 토큰을 URL에 두지 않고 Referrer Policy를 함께 고려한다.

## HTTP 인증 Field

```http
Authorization: Bearer <credential>
WWW-Authenticate: Bearer realm="api"
```

`Authorization`은 User Agent가 자격증명을 보내는 요청 Field다. 401을 생성하는 서버는 적용 가능한 challenge를 하나 이상 담은 `WWW-Authenticate` 응답 Field를 보내야 한다. 403은 서버가 요청을 이해했지만 수행을 거부한다는 뜻이며 로그인 여부 하나만으로 정의되지 않는다.

자격증명과 Cookie 원문을 로그에 남기지 않고 모든 구간에 HTTPS를 적용한다.

## 출처

- 김영한 강사, [HTTP 헤더 개요](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61374)
- 김영한 강사, [표현](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61375)
- 김영한 강사, [콘텐츠 협상](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61377)
- 김영한 강사, [전송 방식](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61378)
- 김영한 강사, [일반 정보](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61379)
- 김영한 강사, [특별한 정보](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61380)
- 김영한 강사, [인증](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61381)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9112, HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html)
- [RFC 9113, HTTP/2](https://httpwg.org/specs/rfc9113.html)
- [RFC 9114, HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html)
- [RFC 2616, HTTP/1.1 (Entity)](https://www.rfc-editor.org/rfc/rfc2616.html#section-7)
- [RFC 7231, HTTP/1.1 Semantics and Content (Representations)](https://www.rfc-editor.org/rfc/rfc7231.html#section-3)
- [RFC 6066, TLS Extensions (Server Name Indication)](https://www.rfc-editor.org/rfc/rfc6066.html#section-3)

## 관련 문서

- [[HTTP-Content-Type|Content-Type과 미디어 타입]]
- [[HTTP-Caching|HTTP 캐싱과 Vary]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[Auth-Method-Selection|인증 방식 선택]]
