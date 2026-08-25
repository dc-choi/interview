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

`static` directory의 파일은 일반적으로 client가 직접 요청할 공개 resource다. secret, source map이나 내부 문서를 배치하지 않는다. “정적 파일이므로 보안상 위험”이 아니라 public surface라는 사실에 맞춰 artifact를 분류한다.

Thymeleaf는 server-side model을 HTML에 적용하면서 template 자체를 browser에서 열 수 있는 natural template 방식도 지원한다.

- `th:text` 같은 escaped output을 기본으로 하고 `th:utext` raw HTML은 신뢰/정화된 값에만 사용한다.
- `th:each`로 목록을 반복하고 link expression으로 path variable/query를 encode한다.
- Domain entity 전체 대신 화면에 필요한 View model만 전달한다.
- Template에서 database 접근이나 business decision을 수행하지 않는다.

## form binding

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

## 출처

- [Spring Framework, annotated controllers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller.html), [`@ModelAttribute`](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/modelattrib-method-args.html), [redirect attributes](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/redirecting-passing-data.html), [Thymeleaf integration](https://docs.spring.io/spring-framework/reference/web/webmvc-view/mvc-thymeleaf.html)
- [Jakarta Persistence 3.2, Merging Detached Entity State](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#merging-detached-entity-state), [Spring Data JPA 4.1, Persisting Entities](https://docs.spring.io/spring-data/jpa/reference/jpa/entity-persistence.html)
- SSR CRUD: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71229), [요구사항](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71230), [domain/repository](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71231), [static HTML](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71232), [Thymeleaf 목록](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71233), [상세](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71234), [등록 form](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71235), [ModelAttribute 등록](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71236), [수정](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71237), [PRG](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71238), [RedirectAttributes](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71239), [정리](https://www.inflearn.com/courses/lecture?courseId=326674&unitId=71240)
- 김영한 강사, 활용 1 웹 계층: [홈 화면과 레이아웃](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24303), [회원 등록](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24304), [회원 목록 조회](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24305), [상품 등록](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24306), [상품 목록](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24307), [상품 수정](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24308), [변경 감지와 병합](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24309), [상품 주문](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24310), [주문 목록 검색, 취소](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24311), [다음으로](https://www.inflearn.com/courses/lecture?courseId=324119&unitId=24344)

## 관련 문서

- [[Java-Web-JSP-and-SSR|JSP와 SSR]]
- [[Spring-MVC-Request-Mapping-and-Binding|요청 binding]]
- [[Idempotency|멱등성]]
- [[Session|Session]]
