---
tags: [spring, mvc, validation, binding-result, validator, error-code]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Manual Validation", "Spring MVC 수동 검증"]
---

# Spring MVC binding 오류와 수동 검증

Web validation은 문자열 request를 typed input으로 binding하는 오류와 값은 만들어졌지만 규칙을 위반한 validation 오류를 함께 사용자에게 설명해야 한다. Client validation은 빠른 UX이고 server validation이 authoritative boundary다. Domain invariant와 화면 편의 규칙도 같은 위치에 무조건 넣지 않는다.

## 실패 흐름

```text
request parameters
  -> data binding/type conversion
  -> structural validation
  -> authorization
  -> use-case/domain validation
  -> command 실행
```

- 숫자 field에 문자가 온 것은 binding/type mismatch다.
- 가격 범위/필수 입력은 field validation이다.
- 합계가 business limit을 넘는 것은 여러 field 또는 domain object rule일 수 있다.
- 존재하는 상품을 현재 사용자가 수정할 수 있는지는 authorization이다.
- DB uniqueness와 concurrent state는 annotation만으로 확정할 수 없고 transaction/constraint 결과를 처리해야 한다.

검증 실패 시 command를 실행하지 않고 같은 form에 입력값과 error를 다시 render한다. 성공 시 PRG를 적용할 수 있다.

## BindingResult

`BindingResult`는 대상 model attribute 바로 뒤 argument에 두어 binding/validation 결과를 받는다.

```java
String save(@ModelAttribute ItemForm form, BindingResult bindingResult) {
    if (form.price() == null || form.price() < 0) {
        bindingResult.rejectValue("price", "range", new Object[]{0, 1_000_000}, null);
    }
    if (bindingResult.hasErrors()) return "items/addForm";
    return "redirect:/items";
}
```

BindingResult가 있으면 Spring MVC가 많은 binding 오류를 여기에 기록하고 handler가 form을 다시 그릴 기회를 준다. 없으면 해당 argument resolution 오류가 예외 경로로 갈 수 있다. 모든 deserialization 실패가 Controller 호출로 이어진다는 뜻은 아니며 `@RequestBody` malformed JSON은 다른 경로다.

## FieldError와 ObjectError

- `FieldError`는 object/field, rejected value, binding failure, code/argument/default message를 표현한다.
- `ObjectError`는 특정 field 하나에 귀속되지 않는 object-wide rule을 표현한다.
- `rejectValue`/`reject`는 현재 binding 대상과 message code 규칙을 활용해 오류를 추가한다.

Rejected value는 form 복원에 유용하지만 password, token, 카드번호 같은 secret을 model/log/error에 보존하지 않는다. HTML output은 다시 escape한다.

## MessageCodesResolver

Spring의 `MessageCodesResolver`는 error code, object name, field와 field type을 조합해 구체적인 code부터 일반 code까지 후보를 만든다. 예를 들어 `typeMismatch.item.price`에서 `typeMismatch`까지 fallback할 수 있다.

- Code는 stable machine/presentation key로 두고 실제 문구는 message bundle에서 관리한다.
- Object name에 우연히 묶인 과도한 세분화와 모든 화면을 덮는 모호한 message 사이의 균형을 잡는다.
- Argument로 min/max/label을 전달해 문구에 숫자를 하드코딩하지 않는다.
- Binding code와 domain/API error code namespace를 구분한다.

Thymeleaf의 `th:errors`, `#fields`와 `th:errorclass`는 BindingResult를 읽어 field/global error를 render할 수 있다. Error summary와 field 연결에 접근성 attribute도 포함한다.

## Spring Validator

반복되는 수동 rule은 `org.springframework.validation.Validator`로 분리할 수 있다.

- `supports(Class<?>)`가 지원 type을 명확히 한다.
- `validate(target, Errors)`가 오류를 기록하며 side effect/DB mutation을 하지 않는다.
- Nested object validator는 path를 정확히 관리한다.
- Controller-local `WebDataBinder`에 등록하거나 명시적으로 호출한다.
- `@Validated`를 붙였을 때 어떤 validator/validation hint가 실행되는지 configuration을 test한다.

Validator를 service locator처럼 만들어 모든 domain query를 숨기지 않는다. Pure structural rule과 stateful business rule을 분리하면 unit test와 transaction boundary가 선명해진다.

## API와 form의 차이

HTML form은 invalid input과 message를 다시 render할 수 있다. JSON API는 stable error code, field path와 HTTP status의 structured response가 필요하다. 같은 Validator를 재사용할 수 있어도 presentation 결과는 adapter별로 변환한다.

## 출처

- [Spring Framework, validation and data binding](https://docs.spring.io/spring-framework/reference/core/validation.html), [Spring Validator](https://docs.spring.io/spring-framework/reference/core/validation/validator.html)
- 수동 검증: [요구사항](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83291), [프로젝트 v1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83292), [직접 처리 개요](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83293), [직접 처리 구현](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83294), [프로젝트 v2](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83295), [BindingResult 1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83296), [BindingResult 2](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83297), [FieldError/ObjectError](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83298), [message 1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83299), [message 2](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83300), [message 3](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83301), [MessageCodesResolver](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83302), [message hierarchy](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83303), [type mismatch message](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83304), [Validator 분리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83305), [WebDataBinder 등록](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83306), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83307)

## 관련 문서

- [[Spring-MVC-Bean-Validation|Jakarta Validation]]
- [[Thymeleaf-Spring-Forms-and-Binding|Thymeleaf form binding]]
- [[Spring-Messages-and-Internationalization|Validation message]]
- [[Spring-Exception-Handling|API 예외 처리]]
