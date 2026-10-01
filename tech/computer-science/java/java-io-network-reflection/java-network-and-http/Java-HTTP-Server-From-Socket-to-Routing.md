---
tags: [java, http, server, routing, servlet, security]
status: done
verified_at: 2026-09-30
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

## 직접 만든 parser가 부딪히는 wire-level 함정

- 줄 끝: RFC 9112 2.2는 start-line과 field line의 끝을 CRLF로 정하고, 수신자가 단독 LF를 줄 끝으로 인식해도 된다(MAY)고 허용한다. 브라우저가 `\n`만으로 동작하는 것은 수신 측 관용이지 발신 규칙이 아니다. `PrintWriter.println()`은 `System.lineSeparator()`를 써서 macOS와 Linux에서는 LF만 보내므로(JDK 21.0.3 확인) 응답에는 `\r\n`을 명시적으로 쓴다.
- 요청 없는 연결: 브라우저는 HTML의 `preconnect`처럼 요청 없이 연결만 미리 열 수 있다([[TCP-Handshake|TCP handshake]]). 이때 request line을 읽는 `readLine()`은 `null`을 반환하는데, 이는 server 오류가 아니라 요청 없음이므로 500 응답이나 error log 없이 조용히 닫는다. 연결만 붙잡는 client는 header read deadline으로 정리한다.
- prefix routing: request line에 `startsWith("GET /site1")`처럼 비교하면 `/site10`도 일치한다. 뒤에 공백을 붙이는 우회 대신 method, path, query로 parse한 뒤 path를 정확히 또는 segment 경계로 비교한다.
- body 길이: RFC 9112 6.3에 따라 request에 `Transfer-Encoding`도 `Content-Length`도 없으면 body 길이는 0이다. `Content-Length`가 있으면 그 octet 수만큼 반복해 읽고, 모자라면 오류로 처리한다.
- Reader로 body 읽기: header를 `BufferedReader`로 읽었다면 body byte 일부가 이미 reader 내부 buffer에 들어가 raw `InputStream`에서는 빠진다. reader로 이어 읽어도 문자 수와 byte 수가 다르다. JDK 21.0.3에서 UTF-8 JSON `{"name":"가나다"}`는 20 byte, 14문자라 20문자를 요청한 read가 14를 반환했고, 20문자를 채울 때까지 도는 loop는 멈춘다. form-urlencoded body는 percent-encoding 때문에 ASCII만 담겨 우연히 문자 수와 byte 수가 같을 뿐이다. 일반 parser는 header와 body를 byte 단위로 읽고 body를 다 모은 뒤 charset으로 decode한다.
- form body: `application/x-www-form-urlencoded` body를 query string과 같은 규칙으로 parse해 같은 parameter map에 넣으면 handler는 조회 방법 하나로 두 입력을 받는다. 같은 이름이 양쪽에 오면 어느 값을 쓸지 규칙을 정한다.

## URL과 form decoding을 분리한다

`URLEncoder`와 `URLDecoder`는 `application/x-www-form-urlencoded`용이며 space와 `+` 규칙을 가진다. path 전체, query 전체와 form field를 같은 함수로 한꺼번에 decode하지 않는다.

- raw target을 path와 query로 먼저 구조화한다.
- percent escape를 component 규칙과 UTF-8 contract에 따라 decode한다.
- decode 후 path traversal, duplicate parameter와 invalid escape를 검증한다.
- routing 전에 normalization을 하되 security-sensitive 원본도 audit에 보존한다.

## thread와 overload 경계

요청마다 무제한 새 thread를 만들지 않는다. bounded executor를 사용해 active task와 queue 크기를 제한하고 rejection을 protocol response 또는 connection close로 연결한다. slowloris 방어를 위해 header read deadline과 최소 처리율도 검토한다.

## handler 호출 방식의 진화와 argument binding

1. Command servlet: 기능마다 `service(request, response)` 계약을 구현한 servlet을 두고, servlet manager가 path와 servlet의 map, default servlet, not-found servlet, internal-error servlet을 보관한다. path에 맞는 servlet이 없으면 default servlet을 쓰고, 그것도 없거나 servlet이 not-found 예외를 던지면 404, 그 밖의 예외는 500 servlet이 응답한다. 요청 처리기는 request와 response 객체를 만든 뒤 실행을 위임만 하므로 server package는 바뀌지 않고, 새 기능은 servlet 구현과 등록만으로 추가된다.
2. Reflection servlet: 기능마다 class를 만들고 path를 수동 등록하는 부담을 줄이려고 비슷한 기능을 controller method로 모으고, default servlet이 요청 path와 같은 이름의 method를 찾아 `method.invoke()`한다. 하지만 `/`, `/favicon.ico`, `add-member`처럼 method 이름이 될 수 없는 path는 따로 등록해야 하고 URL과 method 이름을 다르게 둘 수 없다.
3. Annotation servlet: `@Mapping("/site1")` 같은 `RUNTIME` method annotation 값과 path를 비교해 호출한다. URL과 method 이름이 분리되지만 모든 handler가 request와 response를 둘 다 받아야 한다.
4. 동적 binding: `method.getParameterTypes()`로 인자 타입 배열을 얻어 같은 길이의 `Object[] args`를 채운다. 타입이 request면 request, response면 response를 넣고 그 밖의 타입이면 예외를 던진 뒤 `method.invoke(controller, args)`를 호출한다. handler는 필요한 인자만 선언한다.

Spring MVC의 `HandlerMethodArgumentResolver`는 이 타입 분기를 `supportsParameter`, `resolveArgument` 전략 목록으로 일반화한 형태다([[Spring-MVC-Request-Mapping-and-Binding|Spring MVC binding]]). NestJS의 `@Req()`, `@Body()`와 custom param decorator도 같은 자리를 채운다. 교육용 구현은 지원하지 않는 parameter type을 요청 처리 중에야 발견하므로, route table을 만들 때 parameter마다 binder를 결정하고 지원하지 않는 타입이면 startup에서 실패시킨다.

## route table과 startup validation

```text
path -> handler metadata -> argument binder -> invocation
```

runtime마다 모든 controller method를 선형 탐색하기보다 startup에 reflection 결과를 route table로 compile할 수 있다. 요청마다 모든 method의 annotation을 비교하면 비교 횟수가 method 수에 비례해 요청 수만큼 곱해진다. hash lookup은 평균적으로 빠르지만 O(1)을 절대 보장한다고 표현하지 않는다.

- duplicate method/path 조합은 startup 실패로 만든다.
- path variable, method, content type과 version을 route key에 포함한다.
- handler signature를 startup에 검증하고 invocation 중 reflection failure를 줄인다.
- route metadata는 immutable snapshot으로 publish한다.

중복 mapping은 모호함 이상의 문제다. `Class.getMethods()`와 `getDeclaredMethods()`가 반환하는 배열은 정렬되지 않고 특정 순서도 없다고 Javadoc이 명시한다. 선형 탐색에서 먼저 찾은 handler를 호출하는 구현은 JVM이나 build가 바뀌면 다른 handler를 부를 수 있으므로, map에 넣을 때 이미 등록된 key면 예외를 던져 application이 뜨지 않게 한다.

오류는 발견 시점이 이를수록 싸다. compile error는 실행 전에, startup error는 배포 직후 바로 드러나지만, 작동 중 오류는 특정 요청이 들어와야 드러나 원인 파악에 가장 오래 걸린다. 그래서 `@Override` 같은 compile 검사를 먼저 쓰고, 중복 mapping, 잘못된 handler signature와 설정 오류는 startup 오류로 끌어올린다([[Spring-Boot-Externalized-Configuration-and-Profiles|설정 startup validation]]).

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
- 응답 줄 끝을 CRLF로 쓰고, 요청 없이 닫힌 연결을 오류로 기록하지 않는가?
- ambiguous field와 oversize request를 connection state가 망가지기 전에 거부하는가?
- route duplicate와 invalid handler signature를 startup에 검출하는가?
- executor, queue, header/body size와 deadline이 bounded인가?
- 학습 server와 production support 범위를 명시했는가?

## 출처

- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9112, HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112)
- [Java SE 26, URL](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/URL.html)
- [Java SE 26, Class](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/Class.html)
- [Spring Framework, HandlerMethodArgumentResolver](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/method/support/HandlerMethodArgumentResolver.html)
- [WHATWG, HTML Living Standard, Link types](https://html.spec.whatwg.org/multipage/links.html#link-type-preconnect)
- 김영한 강사, [리플렉션이 필요한 이유](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244495), [HTTP 서버6 - 리플렉션 서블릿](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244501)
- 김영한 강사, [HTTP 기본](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244483), [HTTP method](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244484)
- 김영한 강사, [HTTP server 시작](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244486), [동시 요청](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244487), [기능 추가](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244488), [URL encoding](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244489), [request와 response](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244490), [Command pattern](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244491), [WAS 역사](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244492), [server 정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244493)
- 김영한 강사, [annotation servlet 시작](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244512), [동적 binding](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244513), [route lookup 최적화](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244514), [회원 service 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244515), [회원 service 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244519), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244516)

## 관련 문서

- [[HTTP|HTTP]]
- [[Spring-Request-Lifecycle|Spring MVC 요청 생명주기]]
- [[Java-Reflection|Java reflection]]
- [[Java-Annotations|Java annotation]]
