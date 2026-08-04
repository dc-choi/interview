---
tags: [web, http, header, content-negotiation, authentication]
status: done
verified_at: 2026-08-04
category: "Web - HTTP"
aliases: ["HTTP Header Semantics", "HTTP 헤더 의미"]
---

# HTTP 헤더 의미와 콘텐츠 협상

HTTP Field는 메시지의 조건, 표현 메타데이터, 라우팅과 제어 정보를 이름과 값으로 전달한다. 과거의 General, Request, Response, Entity 분류를 현재 표준의 고정 분류처럼 외우기보다 각 필드가 어떤 메시지와 의미에 적용되는지 정의를 확인한다.

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

- `Host`와 HTTP/2, HTTP/3의 `:authority`는 대상 origin을 식별한다.
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
- 김영한 강사, [콘텐츠 협상](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61377)
- 김영한 강사, [전송 방식](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61378)
- 김영한 강사, [일반 정보](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61379)
- 김영한 강사, [특별한 정보](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61380)
- 김영한 강사, [인증](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61381)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9112, HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html)
- [RFC 9113, HTTP/2](https://httpwg.org/specs/rfc9113.html)
- [RFC 9114, HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html)

## 관련 문서

- [[HTTP-Content-Type|Content-Type과 미디어 타입]]
- [[HTTP-Caching|HTTP 캐싱과 Vary]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[Auth-Method-Selection|인증 방식 선택]]
