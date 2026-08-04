---
tags: [web, http, uri, url, urn]
status: done
verified_at: 2026-08-04
category: "Web - HTTP"
aliases: ["URI URL URN", "URI/URL/URN 차이"]
---

# URI, URL, URN

URI는 Resource를 식별하는 문자열의 일반 문법이다. URL은 위치와 접근 방법의 관점, URN은 `urn` scheme을 사용하는 지속적 이름의 관점에서 쓰이는 용어다.

## 단순 포함 트리의 한계

모든 URL과 URN을 서로 배타적인 두 하위 집합으로 그리는 설명은 입문용 근사다. RFC 3986은 URI를 Locator, Name 또는 둘 다로 분류할 수 있다고 설명하고 이후 표준 문서에는 URL/URN보다 일반 용어 URI를 사용하도록 권한다. 따라서 하나의 URI가 위치와 이름의 성격을 함께 가질 수 있다.

브라우저 구현의 parsing, serialization과 origin 계산은 living standard인 WHATWG URL Standard를 따른다. RFC 3986의 일반 URI 문법과 WHATWG의 실제 Web URL 처리 모델을 목적에 맞게 구분한다.

## URI 구성 요소

```text
https://user@example.com:8443/orders/42?expand=items#payment
\___/   \___________________/\________/ \__________/ \_____/
scheme          authority        path       query     fragment
```

일반 문법은 다음과 같다.

```text
URI = scheme ":" [ "//" authority ] path [ "?" query ] [ "#" fragment ]
```

- Scheme: 식별 체계와 처리 규칙을 선택한다. `https`, `mailto`, `urn` 등이 있다.
- Authority: 선택적인 userinfo, host와 port를 담는다. HTTP(S) URI의 userinfo는 deprecated이므로 자격증명을 넣지 않는다.
- Path: 계층적 경로다. 비어 있을 수도 있다.
- Query: Resource 식별에 쓰이는 비계층 데이터다. 자체 key-value 문법은 URI 표준이 강제하지 않는다.
- Fragment: Representation 내부의 2차 Resource를 식별한다. HTTP 요청 Target에는 포함되지 않고 User Agent가 처리한다.

## HTTP(S) URL 예시

```text
https://api.example.com:443/orders/42?expand=items
```

- `https`의 기본 port는 443이므로 명시하지 않아도 같은 기본 authority로 정규화할 수 있다.
- DNS host 이름은 대소문자를 구분하지 않지만 path와 query의 대소문자 의미는 Server 계약에 달려 있다.
- percent-encoding은 octet을 URI 문자로 표현하는 방식이다. 같은 데이터를 무조건 decode하고 다시 encode하면 의미가 바뀔 수 있다.
- `user:password@host` 형태는 phishing과 자격증명 노출 위험 때문에 HTTP(S) URI에서 사용하지 않는다.

## URN

URN은 `urn:<namespace-id>:<namespace-specific-string>` 형태의 URI다.

```text
urn:isbn:9780134685991
urn:ietf:rfc:3986
```

위치를 직접 제공하지 않으므로 Resource를 가져오려면 Namespace별 해석 절차나 Resolver가 필요할 수 있다. 위치가 변해도 유지할 이름이라는 목표가 있지만 영속성은 발급 주체의 운영 정책까지 필요하다.

## API 설계에서의 사용

API에서 Resource URI라고 할 때는 보통 HTTP(S) URL을 뜻한다. Path에 Resource를, Method에 요청 의미를 배치하는 방식은 유용한 관례지만 URI 문법 자체가 Path를 명사로 쓰거나 복수형을 쓰라고 강제하지는 않는다.

## 출처

- 김영한 강사, [URI](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61357)
- [RFC 3986, Uniform Resource Identifier Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986.html)
- [RFC 8141, Uniform Resource Names](https://www.rfc-editor.org/rfc/rfc8141.html)
- [WHATWG URL Standard](https://url.spec.whatwg.org/)
- [RFC 9110, HTTP Semantics, HTTP-related URI Schemes](https://www.rfc-editor.org/rfc/rfc9110.html#name-http-related-uri-schemes)

## 관련 문서

- [[REST|REST와 Resource URI]]
- [[Browser-URL-Flow|브라우저 URL 요청 흐름]]
- [[HTTP-Semantics-and-Messages|HTTP 의미와 메시지]]
