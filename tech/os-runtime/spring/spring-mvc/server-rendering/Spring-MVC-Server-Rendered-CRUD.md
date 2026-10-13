---
tags: [spring, mvc, thymeleaf, ssr, crud, prg, redirect]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Server Rendered CRUD", "Spring MVC SSR CRUD"]
---

# Spring MVC 서버 렌더링 CRUD와 PRG

서버 렌더링 CRUD는 Controller가 form 입력을 use case에 전달하고 View model을 template에 넘겨 HTML을 만드는 흐름이다. 간단한 상품 예제도 HTTP method, binding, 동시성, escaping과 redirect 계약을 분리해야 production 설계로 확장할 수 있다.

## 요구사항에서 경계를 잡는다

```text
GET  /items          목록
GET  /items/{id}     상세
GET  /items/add      등록 form
POST /items/add      등록 command
GET  /items/{id}/edit 수정 form
POST /items/{id}/edit 수정 command
```

Form을 보여 주는 GET과 상태를 바꾸는 POST를 같은 path의 method로 나눌 수 있다. REST API와 동일한 URI 모양을 강제하기보다 browser form이 지원하는 method, validation 오류 시 UX와 redirect 흐름을 함께 설계한다.

학습용 `HashMap` repository와 static sequence는 multi-thread/multi-instance에서 안전한 persistence가 아니다. Domain test에는 도움이 되지만 운영에서는 database constraint, transaction, concurrent update와 ID 생성 전략이 필요하다. Lombok `@Data`도 entity의 모든 setter/equality/toString을 한꺼번에 생성하므로 필요한 contract만 명시한다.

## static resource와 template

`static` directory의 파일은 일반적으로 client가 직접 요청할 공개 resource다. secret, source map이나 내부 문서를 배치하지 않는다. 공개 resource라는 사실에 맞춰 artifact를 분류한다.

Thymeleaf는 server-side model을 HTML에 적용하면서 template 자체를 browser에서 열 수 있는 natural template 방식도 지원한다.

- `th:text` 같은 escaped output을 기본으로 하고 `th:utext` raw HTML은 신뢰/정화된 값에만 사용한다.
- `th:each`로 목록을 반복하고 link expression으로 path variable/query를 encode한다.
- Domain entity 전체 대신 화면에 필요한 View model만 전달한다.
- Template에서 database 접근이나 business decision을 수행하지 않는다.

## 홈 화면의 상품 목록도 조회 계약을 정한다

홈 화면에 최신 상품 일부를 보여줄 때는 `GET /` Controller가 service에서 제한된 목록을 받아 model에 넣고 `index` view를 반환하도록 구성할 수 있다. Spring Boot의 welcome page 자동 선택은 명시한 홈 route가 없을 때의 fallback이다. 정적 위치의 `index.html`을 먼저 찾고, 없으면 `index` template을 찾으므로 파일 배치와 실제 처리 handler를 함께 확인한다.

다음은 최신 상품 8개 화면을 위한 설계 예시다. 8개가 보편적인 권장 수량이라는 뜻은 아니다.

1. 최신의 기준을 등록일, 공개일 중 하나로 정하고 공개 가능한 상품만 조회한다.
2. `PageRequest.of(0, 8, sort)`처럼 첫 페이지와 크기를 지정한다. page 번호는 0부터이고 크기는 양수여야 한다. 정렬 없는 `PageRequest.of(0, 8)`만으로 최신순이 되지는 않는다.
3. 같은 시각의 상품도 순서를 정할 수 있도록 고유 식별자를 보조 정렬 기준으로 둔다. 전체 건수가 필요 없는 화면이면 `Page`의 count 조회가 필요한지 검토한다. 반환형 선택과 정렬의 상세는 [[Spring-Data-JPA-Paging-and-Web|페이징과 웹 경계]]를 따른다.
4. 화면에는 필요한 상품 정보만 전달하고, 빈 목록과 이미지 누락 때의 표시를 정한다. template에서 전체 목록을 잘라 보이게 하는 것과 조회 단계에서 반환량을 제한하는 것을 구분한다.

2026-10-14 Spring Boot의 welcome page 규칙과 Spring Data의 `PageRequest`, 반환형별 count 조회를 대조했다. 위 상품 노출 기준과 빈 화면 처리는 그 규칙을 적용한 설계 제안이다.

## form binding

### 여러 화면에 공통 조회값 전달하기

장바구니 배지처럼 여러 HTML 화면에서 쓰는 값은 `@ControllerAdvice`의 `@ModelAttribute("cartCount")` 메서드로 model에 넣을 수 있다. 이 메서드는 대상 Controller의 `@RequestMapping` 메서드보다 먼저 실행되고, Advice의 공통 model 초기화는 Controller 내부의 model 초기화보다 앞선다. Advice 자체가 모든 HTTP 요청을 받는 Controller라는 뜻은 아니다.

다음은 장바구니 화면에 적용할 설계 기준이다.

- 사용자 식별자는 요청의 임의 회원 번호가 아니라 인증된 사용자 정보에서 얻는다. 비로그인 상태의 표시값은 0 등으로 명시한다.
- 배지의 개수가 상품 종류 수인지 수량 합계인지 정하고, 그 계약에 맞는 조회만 수행한다.
- Advice는 기본적으로 REST Controller에도 적용되므로, 화면용 패키지나 `assignableTypes`로 범위를 좁혀 불필요한 조회를 피한다.
- model 초기화는 handler보다 앞서므로, 같은 POST에서 장바구니를 바꿔도 미리 구한 값이 자동 재계산되지는 않는다. 성공 후 GET으로 redirect하거나 변경 결과로 model을 갱신한다.
- 이미 브라우저에 그린 배지는 서버 model만으로 즉시 바뀌지 않는다. 비동기 추가 요청을 쓰면 응답값이나 후속 조회로 화면도 갱신한다. 세션 저장 역시 변경 시 갱신하거나 무효화하는 계약을 두면 사용할 수 있다.

2026-10-14 Spring Framework의 Controller Advice와 Model 문서로 적용 범위와 실행 순서를 대조했다. 장바구니 집계와 화면 갱신 방식은 이를 적용한 설계 예시다.

### 입력 객체 바인딩

`@ModelAttribute`는 form parameter를 input object에 bind하고 model attribute로도 사용할 수 있다. 편리함이 validation/authorization을 대신하지 않는다.

```java
@PostMapping("/items/add")
String add(@Valid @ModelAttribute("item") CreateItemForm form,
           BindingResult bindingResult,
           RedirectAttributes redirectAttributes) {
    if (bindingResult.hasErrors()) return "items/addForm";
    ItemView saved = service.create(form.toCommand());
    redirectAttributes.addAttribute("itemId", saved.id());
    return "redirect:/items/{itemId}";
}
```

- `BindingResult`는 대상 바로 뒤에 두고 오류가 있으면 입력값/메시지를 보존해 같은 form을 render한다.
- Create/Update DTO를 나눠 허용 field와 required rule을 명확히 한다.
- URL path의 ID와 body/form ID가 충돌하지 않게 server가 authoritative identifier를 정한다.
- 수정은 lost update를 막을 version/conditional update 정책을 검토한다.

## PRG의 범위

POST 성공 뒤 redirect하고 마지막 browser history를 GET으로 만드는 Post/Redirect/Get은 새로고침에 의한 단순 재제출을 줄인다. 하지만 network retry, double click, 여러 tab과 concurrent request의 중복 command를 보장해서 막지는 않는다.

결제/주문처럼 중복 비용이 큰 command는 idempotency key, unique constraint와 transaction 상태 기계를 별도로 둔다. Validation 실패 때는 redirect하지 않고 200/4xx로 form을 다시 render하는 방식과 flash attribute 방식을 UX/보안 요구에 맞춰 선택한다.

## Managed update와 merge

수정 form을 JPA entity로 직접 bind해 `merge`에 넘기지 않는다. Jakarta Persistence의 `merge`는 전달받은 detached instance를 다시 관리하는 것이 아니라 그 state를 managed instance에 복사하고 managed copy를 반환한다. Form에 빠진 field까지 덮어쓸 수 있어 partial update와 mass assignment에 특히 위험하다.

Controller는 path ID와 허용된 update DTO만 service에 전달한다. Service가 transaction 안에서 entity를 조회하고 authorization과 version을 확인한 뒤 의미 있는 domain method로 허용 field만 바꾸면 dirty checking이 반영한다. Spring Data JPA의 `save`가 기존 entity에 `merge`를 호출할 수 있다는 사실도 이 command boundary를 대신하지 않는다.

## RedirectAttributes

- `addAttribute`는 URI template 확장이나 query parameter로 노출될 수 있다. identifier와 공개 filter에 사용한다.
- `addFlashAttribute`는 다음 request까지 임시 server-side 저장소를 통해 전달하며 session/redirect manager 구현과 multi-instance 구성을 확인한다.
- 사용자 입력을 임의 redirect target에 사용하면 open redirect가 생길 수 있어 allowlist/path validation이 필요하다.
- 성공 메시지는 query parameter 존재만으로 실제 command 성공을 증명하지 않는다.

## 협업과 API 분리

작은 SSR 화면에서는 backend가 template까지 담당할 수 있고 SPA/mobile client가 있으면 JSON API와 frontend가 분리될 수 있다. 어느 방식이든 화면 요구사항, API/DTO, error와 cache contract의 단일 출처를 정한다. Mock HTML은 production authorization/data rule의 대체물이 아니다.

## HTML form과 redirect 응답 계약

HTML form의 일반 method는 GET/POST다. PUT/PATCH/DELETE를 흉내 내려면 `_method`와 활성화된 method-override filter 같은 별도 계약이 필요하다. `th:action`을 현재 path로 정한 form도 렌더링 결과와 실제 POST handler를 확인하고 정적 HTML 파일에 POST하지 않는다.

redirect 경로는 문자열 합치기보다 `RedirectAttributes.addAttribute`와 URI placeholder로 만든다. placeholder에 쓰이지 않은 공개 attribute는 query로 갈 수 있고 flash 값은 별도다.

Spring `RedirectView`는 기본 HTTP 1.0 호환 모드에서 302를 사용한다. POST 뒤 GET을 명확히 하려면 `setStatusCode(HttpStatus.SEE_OTHER)` 등으로 303을 지정한다. 307/308은 method/body를 유지하므로 PRG 목적에 사용하지 않는다.

## 출처

- [Spring Framework, Controller Advice](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html)
- [Spring Framework, Model](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-modelattrib-methods.html)
- [Spring Boot, Welcome Page](https://docs.spring.io/spring-boot/reference/web/servlet.html#web.servlet.spring-mvc.welcome-page)
- [Spring Data Commons, PageRequest](https://docs.spring.io/spring-data/commons/docs/current/api/org/springframework/data/domain/PageRequest.html)
- [Spring Data Commons, Defining Query Methods](https://docs.spring.io/spring-data/commons/reference/repositories/query-methods-details.html)
- [Spring, RedirectView](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/view/RedirectView.html)

- [Spring Framework, annotated controllers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html), [`@ModelAttribute`](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/modelattrib-method-args.html), [redirect attributes](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/redirecting-passing-data.html), [Thymeleaf integration](https://docs.spring.io/spring-framework/reference/web/webmvc-view/mvc-thymeleaf.html)
- [Jakarta Persistence 3.2, Merging Detached Entity State](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a1983), [Spring Data JPA 4.1, Persisting Entities](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html)
- SSR CRUD: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71229), [요구사항](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71230), [domain/repository](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71231), [static HTML](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71232), [Thymeleaf 목록](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71233), [상세](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71234), [등록 form](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71235), [ModelAttribute 등록](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71236), [수정](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71237), [PRG](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71238), [RedirectAttributes](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71239), [정리](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71240)
- 김영한 강사, 활용 1 웹 계층: [홈 화면과 레이아웃](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24303), [회원 등록](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24304), [회원 목록 조회](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24305), [상품 등록](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24306), [상품 목록](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24307), [상품 수정](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24308), [변경 감지와 병합](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24309), [상품 주문](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24310), [주문 목록 검색, 취소](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24311), [다음으로](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24344)

## 관련 문서

- [[Java-Web-JSP-and-SSR|JSP와 SSR]]
- [[Spring-MVC-Request-Mapping-and-Binding|요청 binding]]
- [[Idempotency|멱등성]]
- [[Session|Session]]
