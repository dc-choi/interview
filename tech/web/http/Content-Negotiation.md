---
tags: [web, http, content-negotiation, cache]
status: done
verified_at: 2026-08-31
category: "Web - HTTP"
aliases: ["Content Negotiation", "콘텐츠 협상", "HTTP 콘텐츠 협상"]
---

# 콘텐츠 협상 (Content Negotiation)

콘텐츠 협상은 같은 리소스에 여러 표현이 있을 때 클라이언트 선호와 서버 능력을 비교해 하나를 고르는 절차다. `Content-Type`은 요청이나 응답 본문이 실제로 무엇인지 알리고, `Accept` 계열은 응답으로 무엇을 받을 수 있는지 제안한다.

하나의 JSON 표현만 제공하는 API라면 협상 계층을 만들 필요가 없다. 이 문서는 미디어 타입, 압축, 언어처럼 실제 변형이 둘 이상일 때 필요한 최소 선택 규칙과 캐시 계약을 다룬다.

## 협상 축

| 요청 필드 | 선택 대상 | 응답 필드 |
|---|---|---|
| `Accept` | 미디어 타입 | `Content-Type` |
| `Accept-Encoding` | gzip, br 같은 content coding | `Content-Encoding` |
| `Accept-Language` | 자연어 | `Content-Language` |

- 서버 주도 협상은 요청 필드와 서버가 가진 표현 목록을 비교한다.
- 언어는 개인정보와 사용 맥락에 민감하다. 계정 설정이나 URL처럼 사용자가 명시한 선택이 있다면 `Accept-Language`보다 우선한다.
- `User-Agent`처럼 가능한 값이 많고 캐시를 잘게 쪼개는 필드는 표현 선택 축으로 삼지 않는 편이 안전하다.

## q 값과 구체성

quality value인 `q`는 0에서 1 사이의 상대 선호도다. 생략하면 1이고 `q=0`은 수용하지 않겠다는 뜻이다.

```http
Accept: application/json, text/html;q=0.8, */*;q=0.1
Accept-Language: ko-KR, ko;q=0.9, en;q=0.5
```

선택은 다음 순서로 고정하면 재현 가능하다.

1. 문법이 유효한 항목만 파싱한다.
2. 서버가 가진 각 표현에 가장 구체적으로 일치하는 범위를 찾아 그 q 값을 적용한다.
3. `q=0`인 후보를 빼고 q 값, 구체성, 서버 우선순위 순으로 정렬한다.
4. 가장 높은 후보를 고르고 실제 응답의 `Content-Type`, `Content-Language`, `Content-Encoding`을 기록한다.

구체성은 `text/html`이 `text/*`보다, `text/*`가 `*/*`보다 높다. q 값과 구체성이 같을 때의 서버 우선순위를 정해 두지 않으면 구현이나 배포마다 응답이 달라질 수 있다.

## Vary가 캐시 계약이다

같은 URI가 요청 필드에 따라 다른 응답을 내면 공유 캐시가 그 차이를 알아야 한다.

```http
Vary: Accept-Encoding, Accept-Language
```

- 응답 선택에 실제로 사용한 요청 필드만 `Vary`에 넣는다.
- 축을 늘릴수록 캐시 key 조합이 늘고 hit ratio가 낮아진다.
- `Vary: *`는 저장된 응답을 다른 요청에 재사용할 수 없게 하므로 일반적인 협상에는 쓰지 않는다.
- `Accept-Encoding`만 협상한다면 언어와 미디어 타입까지 습관적으로 넣지 않는다.

버전 값을 `Accept`에 넣는 media type 버저닝도 같은 계약을 따른다. 버전별 표현을 내면서 `Vary: Accept`를 빠뜨리면 다른 버전의 응답이 재사용될 수 있다.

## 기본 표현과 406

수용 가능한 표현이 없을 때는 두 정책 중 하나를 계약으로 정한다.

- 안전한 기본 표현을 보낼 수 있으면 그 표현과 정확한 `Content-Type`을 반환한다.
- 대체 표현을 보내는 것이 의미를 바꾸거나 파싱 오류를 낳는다면 `406 Not Acceptable`로 거부하고 지원 형식을 오류 본문에 안내한다.

잘못된 `Content-Type`의 요청 본문을 거부하는 `415 Unsupported Media Type`과 혼동하지 않는다. 406은 응답 표현을 고르지 못한 경우이고 415는 서버가 요청 본문의 형식을 처리하지 못한 경우다.

## 운영 체크포인트

- 동일한 요청과 가용 표현 목록에서 항상 같은 표현을 고르는가.
- `q=0`, wildcard, 같은 q 값의 tie-break를 테스트했는가.
- 응답을 바꾸는 모든 요청 필드가 `Vary` 또는 CDN cache policy에 반영됐는가.
- 언어 추정 대신 사용자의 명시적 선택을 저장하고 우선할 수 있는가.
- 협상 실패율과 선택된 표현 비율을 관측해 사용하지 않는 변형을 제거할 수 있는가.

## 출처

- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9111, HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [MDN, Content negotiation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Content_negotiation)

## 관련 문서

- [[HTTP-Header-Semantics#콘텐츠 협상|HTTP 헤더 의미와 협상 필드 요약]]
- [[HTTP-Content-Type|Content-Type과 미디어 타입]]
- [[HTTP-Caching|HTTP 캐싱과 Vary]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
- [[API-Versioning|API 버저닝의 HTTP 표면]]
