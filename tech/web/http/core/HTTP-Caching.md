---
tags: [web, http, cache, conditional-request, etag]
status: done
verified_at: 2026-10-01
category: "Web - HTTP"
aliases: ["HTTP Caching", "HTTP 캐시", "조건부 요청"]
---

# HTTP 캐싱과 조건부 요청

HTTP Cache는 이전 응답을 저장해 이후 요청에 재사용한다. 전송량과 지연, Origin 부하를 줄이지만 잘못된 freshness, cache key와 개인정보 정책은 오래된 데이터나 사용자 간 응답 유출을 만든다.

## Cache 종류와 수명

- Private Cache: 브라우저처럼 한 사용자에 종속된다.
- Shared Cache: CDN과 Forward Proxy처럼 여러 사용자의 응답을 재사용한다.
- Fresh response: Origin 검증 없이 재사용할 수 있다.
- Stale response: 기본적으로 재검증하거나 새 응답을 받아야 한다.

```http
Cache-Control: public, max-age=60, s-maxage=300
Vary: Accept-Encoding
ETag: "order-list-v7"
```

`max-age`는 응답 생성 후 freshness lifetime을, `s-maxage`는 shared cache의 lifetime을 덮어쓴다. `Expires`는 절대 시각 기반의 오래된 대안이며 `Cache-Control`의 `max-age`나 `s-maxage`가 있으면 그 지시어가 우선한다.

`Age`는 응답이 Origin에서 생성되거나 검증된 뒤 흐른 시간에 대한 발신 캐시의 추정치(초)다. 응답은 freshness lifetime이 현재 age보다 클 때 fresh이므로, `max-age=60` 응답이 `Age: 50`으로 도착하면 fresh로 남은 시간은 약 10초다. `Age`가 있다는 것은 그 응답을 이번 요청을 위해 Origin이 만들거나 검증하지 않았다는 뜻이다.

## 저장과 재사용 지시어

| 지시어 | 의미 |
|---|---|
| `public` | 인증이 있는 경우 등에도 shared cache 저장을 명시적으로 허용할 수 있음 |
| `private` | shared cache 저장 금지, private cache는 저장 가능 |
| `no-cache` | 저장은 가능하지만 다른 요청에 쓰기 전 매번 성공적으로 재검증 |
| `no-store` | 요청과 응답을 저장하지 않고 다른 요청에 재사용하지 않음 |
| `must-revalidate` | stale이 된 뒤 Origin 검증 성공 전에는 재사용 금지, Origin에 닿지 못하면 stale 대신 오류(기본 504) |
| `no-transform` | Intermediary가 content를 변환하지 않게 함 |

`no-cache`는 저장 금지가 아니다. `no-store`도 악성 Cache, 로그와 네트워크 도청까지 막는 개인정보 보호 수단은 아니므로 HTTPS, 로그 마스킹과 데이터 최소화가 별도로 필요하다. `Pragma: no-cache`는 HTTP/1.0 요청 호환을 위한 필드이며 현대 응답의 `Cache-Control`을 대체하지 않는다.

### 재사용되면 안 되는 응답

`Cache-Control`을 생략했다고 캐시되지 않는 것은 아니다. 명시적 만료가 없어도 200, 204, 301, 404처럼 heuristically cacheable로 정의된 상태 코드의 응답은 캐시가 휴리스틱 만료 시간을 줄 수 있다. RFC 9111은 `Last-Modified`가 있으면 그 이후 경과 시간의 일부를 쓰도록 권하고 전형값으로 10%를 든다. 이 값이면 10일 전에 수정된 응답은 약 하루 동안 검증 없이 재사용될 수 있다. 실제 계산은 캐시 구현마다 다르다.

- 잔액이나 개인 정보처럼 재사용되면 안 되는 응답은 헤더를 생략하지 말고 `Cache-Control: no-store`를 명시한다. 저장 자체를 막는 가장 강한 선언이다.
- 흔히 쓰는 방어 조합은 `Cache-Control: no-cache, no-store, must-revalidate`와 `Pragma: no-cache`다. 규격을 지키는 캐시에는 `no-store`로 충분하고 나머지는 규격을 벗어난 중개자를 겨냥한 중복 방어다. `Pragma`는 응답에서의 의미가 정의된 적이 없어 레거시 HTTP/1.0 캐시를 의식한 관행일 뿐이다.
- `must-revalidate`는 연결이 끊겼거나 요청이 `max-stale`로 stale을 허용해도 검증 없는 재사용을 막는다. 클라이언트, 프록시 캐시, Origin 구조에서 프록시와 Origin 사이가 끊기면 캐시는 stale 응답 대신 오류를 만들어야 하고 기본 상태 코드는 504다. 규격상 `no-cache`만으로도 stale 응답은 금지되므로, 이 조합은 stale 제공을 허용하도록 설정됐거나 규격을 지키지 않는 캐시까지 겨냥한 방어다. 오래된 값보다 오류가 나은 금액 같은 값에 쓴다.
- 주의: `must-revalidate`는 `public`, `s-maxage`와 함께 `Authorization`이 있는 요청의 응답을 shared cache가 저장해도 된다는 신호다. 개인 응답에 `no-store`나 `private` 없이 `must-revalidate`만 붙이면 공유 저장을 허용하게 된다.

## Validator와 조건부 요청

### ETag

Origin이 선택한 Representation 버전을 opaque entity-tag로 표현한다. 바이트 단위 동일성이 필요하면 strong ETag, 의미상 동등한 Representation을 허용하면 `W/` weak ETag를 쓴다.

```http
If-None-Match: "order-list-v7"
```

### Last-Modified

서버가 알고 있는 수정 시각을 GMT 기반 HTTP-date(`Last-Modified: Wed, 30 Sep 2026 00:00:00 GMT`)로 보내고 클라이언트가 `If-Modified-Since`로 검증한다. 해상도가 1초라 1초 안의 여러 변경을 구분하지 못하고, 내용은 같은데 수정 시각만 바뀌면(재생성, 재배포) 전체를 다시 받는다. ETag는 서버가 정하는 opaque 값이라 콘텐츠 해시나 배포 버전처럼 서버가 고른 기준으로 재검증 정책을 쥐고, 클라이언트는 받은 값을 그대로 돌려보낼 뿐이다.

둘 다 있으면 `If-None-Match`가 `If-Modified-Since`보다 우선한다. 조건부 GET 또는 HEAD의 선택된 Representation이 바뀌지 않았다면 서버는 content 없는 304를 보내고 Cache는 저장된 content와 갱신된 metadata를 결합한다.

### 조건부 요청 필드

| 필드 | 비교 대상 | 주 용도 |
|---|---|---|
| `If-None-Match` | ETag | 캐시 재검증, 같으면 304 |
| `If-Modified-Since` | Last-Modified | 캐시 재검증, 바뀌지 않았으면 304 |
| `If-Match` | ETag | 상태 변경의 전제조건, 다르면 412 |
| `If-Unmodified-Since` | Last-Modified | ETag가 없을 때의 `If-Match` 대용, 이후 수정됐으면 412 |
| `If-Range` | ETag 또는 날짜 | Range 요청 재개, 다르면 412 대신 전체 표현 |

`If-Match`는 여러 사용자가 같은 리소스를 동시에 바꿀 때 lost update를 막는 데 주로 쓰인다([[Lock|낙관적 잠금과 If-Match]]). `If-Match`가 있으면 수신자는 `If-Unmodified-Since`를 무시한다.

## 캐시 가능한 Method

Method 정의가 캐시 조건을 명시해야 응답을 저장할 수 있다. RFC 9110은 GET, HEAD, POST의 캐시 의미를 정의하고 PATCH는 RFC 5789가 정의하지만, 대부분의 캐시 구현은 GET과 HEAD만 지원한다.

- POST 응답은 명시적 freshness 정보와 POST target URI와 같은 값의 `Content-Location`이 있을 때만 캐시할 수 있다. 저장된 POST 응답은 이후 GET이나 HEAD를 만족하는 데만 쓰이고 다른 POST 요청에 재사용되지 않는다. PATCH도 같은 조건이며 다른 PATCH에 재사용할 수 없다.
- 요청 본문까지 캐시 키로 삼는 모델은 POST가 아니라 안전한 본문 기반 조회를 정의한 QUERY다([[HTTP-QUERY-Method|QUERY]]).
- 브라우저, CDN과 리버스 프록시 캐시를 활용할 조회는 GET으로 설계한다. POST로 모든 요청을 보내면 이 계층을 모두 잃는다.

## Cache key와 콘텐츠 협상

기본 Cache key는 Method와 Target URI를 중심으로 한다. 응답 선택에 `Accept-Encoding`, `Accept-Language` 같은 요청 Field가 영향을 줬다면 `Vary`에 기록한다. 그렇지 않으면 gzip 응답을 지원하지 않는 클라이언트에 보내거나 다른 언어를 재사용할 수 있다.

개인화 응답은 `private` 또는 `no-store`를 검토하고 CDN key에 Cookie나 Authorization을 무작정 포함해 hit ratio와 격리 정책을 동시에 망치지 않는다. 인증 요청의 shared caching은 RFC 9111의 명시적 허용 조건을 만족할 때만 사용한다.

## 변경과 무효화

- 버전이 있는 정적 Asset: 파일명에 content hash를 넣고 긴 `max-age`, `immutable`을 사용한다.
- 변경 가능한 API: 짧은 freshness와 ETag 재검증을 조합한다.
- 민감 정보: `no-store`를 우선 검토한다.
- Cache는 non-error 응답을 받은 unsafe Method의 Target URI를 반드시 무효화한다. `Location`과 `Content-Location`의 URI는 캐시가 선택적으로 무효화할 수 있는 후보이며, Target URI와 Origin이 다르면 무효화해서는 안 된다. 이것이 도메인상 연관된 모든 URI, 애플리케이션 Cache와 CDN purge까지 대신하지는 않는다.
- 이미 긴 TTL로 배포된 응답은 새 응답 Header만으로 즉시 회수하기 어렵다. versioned URL이나 CDN purge 절차를 준비한다.

## 출처

- 김영한 강사, [HTTP 메서드 - GET, POST](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61365)
- 김영한 강사, [HTTP 메서드의 속성](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61367)
- 김영한 강사, [캐시 기본 동작](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61383)
- 김영한 강사, [검증 헤더와 조건부 요청 1](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61384)
- 김영한 강사, [검증 헤더와 조건부 요청 2](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61385)
- 김영한 강사, [캐시와 조건부 요청 헤더](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61386)
- 김영한 강사, [프록시 캐시](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61387)
- 김영한 강사, [캐시 무효화](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=62171)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9111, HTTP Caching and invalidation](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.4)
- [RFC 8246, HTTP Immutable Responses](https://www.rfc-editor.org/rfc/rfc8246.html)
- [RFC 5789, PATCH Method for HTTP](https://www.rfc-editor.org/rfc/rfc5789.html)

## 관련 문서

- [[HTTP-Header-Semantics|HTTP 헤더 의미와 콘텐츠 협상]]
- [[HTTP-Status-Code|304 Not Modified]]
- [[Cache-Invalidation|Cache Invalidation]]
- [[GraphQL-Caching|GraphQL 캐싱]]
