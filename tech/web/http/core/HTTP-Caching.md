---
tags: [web, http, cache, conditional-request, etag]
status: done
verified_at: 2026-08-04
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

## 저장과 재사용 지시어

| 지시어 | 의미 |
|---|---|
| `public` | 인증이 있는 경우 등에도 shared cache 저장을 명시적으로 허용할 수 있음 |
| `private` | shared cache 저장 금지, private cache는 저장 가능 |
| `no-cache` | 저장은 가능하지만 다른 요청에 쓰기 전 매번 성공적으로 재검증 |
| `no-store` | 요청과 응답을 저장하지 않고 다른 요청에 재사용하지 않음 |
| `must-revalidate` | stale이 된 뒤 Origin 검증 성공 전에는 재사용 금지 |
| `no-transform` | Intermediary가 content를 변환하지 않게 함 |

`no-cache`는 저장 금지가 아니다. `no-store`도 악성 Cache, 로그와 네트워크 도청까지 막는 개인정보 보호 수단은 아니므로 HTTPS, 로그 마스킹과 데이터 최소화가 별도로 필요하다. `Pragma: no-cache`는 HTTP/1.0 요청 호환을 위한 필드이며 현대 응답의 `Cache-Control`을 대체하지 않는다.

## Validator와 조건부 요청

### ETag

Origin이 선택한 Representation 버전을 opaque entity-tag로 표현한다. 바이트 단위 동일성이 필요하면 strong ETag, 의미상 동등한 Representation을 허용하면 `W/` weak ETag를 쓴다.

```http
If-None-Match: "order-list-v7"
```

### Last-Modified

서버가 알고 있는 수정 시각을 보내고 클라이언트가 `If-Modified-Since`로 검증한다. 초 단위 정밀도와 시각 기반 한계가 있어 임의 버전을 표현하는 ETag보다 덜 유연하다.

둘 다 있으면 `If-None-Match`가 `If-Modified-Since`보다 우선한다. 조건부 GET 또는 HEAD의 선택된 Representation이 바뀌지 않았다면 서버는 content 없는 304를 보내고 Cache는 저장된 content와 갱신된 metadata를 결합한다.

## Cache key와 콘텐츠 협상

기본 Cache key는 Method와 Target URI를 중심으로 한다. 응답 선택에 `Accept-Encoding`, `Accept-Language` 같은 요청 Field가 영향을 줬다면 `Vary`에 기록한다. 그렇지 않으면 gzip 응답을 지원하지 않는 클라이언트에 보내거나 다른 언어를 재사용할 수 있다.

개인화 응답은 `private` 또는 `no-store`를 검토하고 CDN key에 Cookie나 Authorization을 무작정 포함해 hit ratio와 격리 정책을 동시에 망치지 않는다. 인증 요청의 shared caching은 RFC 9111의 명시적 허용 조건을 만족할 때만 사용한다.

## 변경과 무효화

- 버전이 있는 정적 Asset: 파일명에 content hash를 넣고 긴 `max-age`, `immutable`을 사용한다.
- 변경 가능한 API: 짧은 freshness와 ETag 재검증을 조합한다.
- 민감 정보: `no-store`를 우선 검토한다.
- Cache는 non-error 응답을 받은 unsafe Method의 Target URI를 무효화하고, 같은 Origin을 가리키는 `Location`과 `Content-Location`도 무효화한다. 이것이 도메인상 연관된 모든 URI, 애플리케이션 Cache와 CDN purge까지 대신하지는 않는다.
- 이미 긴 TTL로 배포된 응답은 새 응답 Header만으로 즉시 회수하기 어렵다. versioned URL이나 CDN purge 절차를 준비한다.

## 출처

- 김영한 강사, [캐시 기본 동작](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61383)
- 김영한 강사, [검증 헤더와 조건부 요청 1](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61384)
- 김영한 강사, [검증 헤더와 조건부 요청 2](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61385)
- 김영한 강사, [캐시와 조건부 요청 헤더](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61386)
- 김영한 강사, [프록시 캐시](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61387)
- 김영한 강사, [캐시 무효화](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=62171)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9111, HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [RFC 8246, HTTP Immutable Responses](https://www.rfc-editor.org/rfc/rfc8246.html)

## 관련 문서

- [[HTTP-Header-Semantics|HTTP 헤더 의미와 콘텐츠 협상]]
- [[HTTP-Status-Code|304 Not Modified]]
- [[Cache-Invalidation|Cache Invalidation]]
- [[GraphQL-Caching|GraphQL 캐싱]]
