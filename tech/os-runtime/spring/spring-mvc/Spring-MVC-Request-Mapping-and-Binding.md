---
tags: [spring, mvc, request-mapping, data-binding, message-converter, logging]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Request Mapping Binding", "Spring MVC 요청 매핑과 바인딩"]
---

# Spring MVC 요청 mapping, binding과 응답 변환

Spring MVC Controller는 request를 세 단계로 해석한다. Mapping condition으로 handler를 고르고, argument resolver/data binder/message converter로 Java 입력을 만들며, return value handler와 converter/View로 응답을 만든다. Annotation 이름만 외우면 parameter와 body, media type 실패를 구분하기 어렵다.

## 요청 mapping 조건

`@RequestMapping`과 `@GetMapping`/`@PostMapping` 등은 path 외에도 method, parameter, header, `consumes`, `produces` 조건을 조합할 수 있다.

```java
@PostMapping(
    path = "/members",
    consumes = MediaType.APPLICATION_JSON_VALUE,
    produces = MediaType.APPLICATION_JSON_VALUE)
ResponseEntity<MemberResponse> create(@Valid @RequestBody CreateMemberRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
}
```

- 같은 URI에서 HTTP method로 command/query 의미를 구분하고 safe/idempotent/cache semantics를 보존한다.
- `@PathVariable`은 resource identifier에, `@RequestParam`은 query/form parameter에 사용한다.
- `consumes`는 request `Content-Type`, `produces`는 response representation과 `Accept` negotiation에 관여한다.
- mapping을 너무 많은 header/parameter 조건으로 숨기면 API 발견성과 오류 분석이 어려워진다.

## header와 request 기본 정보

`HttpServletRequest`, `HttpMethod`, `Locale`, `@RequestHeader`, `@CookieValue` 등 다양한 resolver가 argument를 제공한다. 같은 header/key가 여러 값일 수 있으므로 `MultiValueMap` 또는 목적별 parser를 사용한다.

Proxy 뒤 client IP/scheme/host를 request 값 그대로 신뢰하지 않는다. trusted proxy가 정규화한 forwarding header 설정과 security policy를 둔다. Authorization/Cookie/PII header 전체를 debug log로 출력하지 않는다.

## request parameter binding

Query string과 `application/x-www-form-urlencoded` form body는 Servlet parameter model로 들어온다.

- `@RequestParam`은 이름, `required`, `defaultValue`와 conversion을 명시한다. default value는 부재와 빈 값을 합칠 수 있으므로 domain 의미를 확인한다.
- 같은 key가 여러 번 오는 경우 scalar 하나로 조용히 축약하지 말고 collection contract를 사용한다.
- `@ModelAttribute`는 여러 parameter를 object property에 bind하고 model에도 노출할 수 있다.
- Annotation 생략 규칙이 있어도 endpoint 입력에는 명시해 body/parameter contract를 드러낸다.

Persistence entity를 `@ModelAttribute` 대상으로 직접 노출하면 mass assignment 위험이 있다. 입력 DTO, constructor/allowed field와 validation group을 사용하고 binding 성공을 authorization 성공으로 착각하지 않는다.

## request body와 message converter

`@RequestBody`는 body 전체를 `HttpMessageConverter`로 읽는다. Parameter API로 JSON을 얻는 기능이 아니다.

- `StringHttpMessageConverter`, Jackson 기반 JSON converter 등은 Java type과 media type의 `canRead/canWrite` 조건으로 선택된다.
- `Content-Type`이 없거나 틀리면 converter가 선택되지 않아 415/읽기 오류가 날 수 있다.
- malformed JSON, type mismatch와 Bean Validation 실패는 서로 다른 오류다.
- body stream은 보통 한 번 소비된다. raw body logging/signature 검증에는 caching wrapper와 size/secret 정책이 필요하다.
- Deserialization을 domain invariant 검증으로 보지 말고 structural validation, authorization와 use-case validation을 분리한다.

Multipart에서 JSON part와 file을 함께 받을 때는 [[Spring-Multipart-JSON|`@RequestPart` 계약]]을 사용한다.

## 반환값과 response

- View name/`ModelAndView`는 template rendering 경로로 간다.
- `@ResponseBody`와 `@RestController` 반환값은 message converter가 body에 쓴다.
- `ResponseEntity`는 status/header/body를 함께 제어한다.
- `@ResponseStatus`는 고정 status에 적합하고 동적 결과에는 `ResponseEntity`나 exception mapping을 쓴다.
- String 반환은 Controller 종류와 annotation에 따라 view name 또는 text body가 될 수 있으므로 경계를 명시한다.

HTTP 응답 DTO와 View model을 entity에서 분리해 lazy loading, bidirectional recursion과 내부 field 노출을 막는다.

## ArgumentResolver와 ReturnValueHandler

`RequestMappingHandlerAdapter`는 resolver chain으로 method argument를 만들고 return value handler chain으로 결과를 처리한다. Message converter는 그 안에서 body가 필요한 resolver/handler가 호출한다.

Custom resolver는 authenticated principal, tenant, validated ID처럼 여러 endpoint가 공유하는 입력 의미에 유용하다. 숨은 DB 조회나 transaction을 resolver에 넣으면 Controller 비용이 보이지 않게 되므로 변환 책임을 좁힌다.

## logging

SLF4J facade와 선택한 backend를 사용하고 string concatenation 대신 parameterized logging을 쓴다.

```java
log.debug("member created id={} requestId={}", memberId, requestId);
```

Level은 환경별로 조절하고 password/token/body 전체를 남기지 않는다. 비싼 argument 계산은 해당 level이 활성화됐는지 확인한다. Request/response logging은 크기 제한, masking, sampling과 trace correlation을 함께 설계한다.

## 출처

- [Spring Framework, annotated controllers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html), [method arguments](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/arguments.html), [HTTP message conversion](https://docs.spring.io/spring-framework/reference/web/webmvc/message-converters.html)
- 기본 기능: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71213), [logging](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71214), [mapping 조건](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71215), [API mapping](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71216), [header/기본 정보](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71217), [query/form](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71218), [RequestParam](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71219), [ModelAttribute](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71220), [text body](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71221), [JSON body](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71222), [static/View](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71223), [API response](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71224), [message converter](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71225), [handler adapter 내부](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71226), [정리](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71227)

## 관련 문서

- [[Spring-MVC-Dispatch-Architecture|Spring MVC dispatch 구조]]
- [[Spring-MVC-Essentials|Spring MVC 핵심 annotation]]
- [[Spring-Multipart-JSON|Multipart와 JSON]]
- [[Spring-Exception-Handling|예외 응답]]
