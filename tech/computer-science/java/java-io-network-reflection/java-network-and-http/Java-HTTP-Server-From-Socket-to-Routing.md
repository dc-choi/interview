---
tags: [java, http, server, routing, servlet, security]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java HTTP Server Internals", "Java HTTP 서버 내부"]
---

# Java socket에서 HTTP routing까지

직접 HTTP/1.1 server를 만들어보면 framework가 숨긴 계층이 보인다. socket accept, request framing, parsing, routing, controller argument binding과 response serialization은 서로 다른 책임이다. 교육용 구현을 production server로 오해하지 않는 것이 가장 중요한 경계다.

## 처리 pipeline

```text
accept socket
-> enforce connection limits and timeout
-> parse request line and fields
-> determine message body framing
-> normalize routing input
-> invoke handler
-> serialize status, fields and body
-> keep alive or close
```

parse error와 business error를 같은 exception path로 보내면 malformed request가 500으로 바뀌거나 connection state가 어긋난다. protocol parser는 size limit을 적용하고 400, 411, 413, 431 같은 결과를 명시적으로 결정해야 한다.

## HTTP message framing은 줄 몇 개 읽기가 아니다

- start-line, field section과 빈 줄 다음에 선택적 body가 온다.
- `Content-Length`는 character 수가 아니라 전송되는 octet 수다.
- request body framing은 method 이름만으로 정하지 않는다.
- HTTP/1.1의 chunked transfer coding, connection close와 persistent connection을 고려한다.
- 서로 모순되는 `Transfer-Encoding`과 `Content-Length`, 중복 field 해석 차이는 request smuggling 위험이 된다.
- request line, field count/size, body size와 처리 시간을 bounded로 둔다.

학습 server가 이 모든 기능을 구현하지 않는다면 지원 범위를 명시하고 나머지는 거부해야 한다.

## URL과 form decoding을 분리한다

`URLEncoder`와 `URLDecoder`는 `application/x-www-form-urlencoded`용이며 space와 `+` 규칙을 가진다. path 전체, query 전체와 form field를 같은 함수로 한꺼번에 decode하지 않는다.

- raw target을 path와 query로 먼저 구조화한다.
- percent escape를 component 규칙과 UTF-8 contract에 따라 decode한다.
- decode 후 path traversal, duplicate parameter와 invalid escape를 검증한다.
- routing 전에 normalization을 하되 security-sensitive 원본도 audit에 보존한다.

## thread와 overload 경계

요청마다 무제한 새 thread를 만들지 않는다. bounded executor를 사용해 active task와 queue 크기를 제한하고 rejection을 protocol response 또는 connection close로 연결한다. slowloris 방어를 위해 header read deadline과 최소 처리율도 검토한다.

## route table과 startup validation

```text
path -> handler metadata -> argument binder -> invocation
```

runtime마다 모든 controller method를 선형 탐색하기보다 startup에 reflection 결과를 route table로 compile할 수 있다. hash lookup은 평균적으로 빠르지만 O(1)을 절대 보장한다고 표현하지 않는다.

- duplicate method/path 조합은 startup 실패로 만든다.
- path variable, method, content type과 version을 route key에 포함한다.
- handler signature를 startup에 검증하고 invocation 중 reflection failure를 줄인다.
- route metadata는 immutable snapshot으로 publish한다.

## 직접 만든 server의 production 격차

| 학습 구현 | production에 추가되는 책임 |
|---|---|
| line parser | RFC 준수, limit, ambiguous framing 방어 |
| thread pool | overload control, cancellation, observability |
| string HTML | template escaping, CSP, content type |
| route map | method/media negotiation, filters, auth, error mapping |
| plain socket | TLS, proxy protocol, keep-alive와 graceful drain |

Servlet container와 Spring MVC를 쓰는 이유는 이 책임을 없애기 위해서가 아니라 검증된 구현과 extension point에 위임하기 위해서다.

## NestJS로 옮길 때

NestJS의 decorator route도 adapter와 router가 startup metadata를 읽어 handler pipeline을 만든다. 하지만 Express/Fastify adapter의 parser limit, proxy trust, timeout과 raw body 설정은 별도다. controller parameter decorator가 business validation을 대신하지 않으며 guard, pipe, interceptor와 exception filter의 책임을 나눈다.

## 점검 질문

- body framing과 byte 단위 `Content-Length`를 올바르게 처리하는가?
- ambiguous field와 oversize request를 connection state가 망가지기 전에 거부하는가?
- route duplicate와 invalid handler signature를 startup에 검출하는가?
- executor, queue, header/body size와 deadline이 bounded인가?
- 학습 server와 production support 범위를 명시했는가?

## 출처

- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9112, HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112)
- [Java SE 26, URL](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/URL.html)
- 김영한 강사, [HTTP 기본](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244483), [HTTP method](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244484)
- 김영한 강사, [HTTP server 시작](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244486), [동시 요청](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244487), [기능 추가](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244488), [URL encoding](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244489), [request와 response](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244490), [Command pattern](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244491), [WAS 역사](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244492), [server 정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244493)
- 김영한 강사, [annotation servlet 시작](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244512), [동적 binding](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244513), [route lookup 최적화](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244514), [회원 service 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244515), [회원 service 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244519), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244516)

## 관련 문서

- [[HTTP|HTTP]]
- [[Spring-Request-Lifecycle|Spring MVC 요청 생명주기]]
- [[Java-Reflection|Java reflection]]
- [[Java-Annotations|Java annotation]]
