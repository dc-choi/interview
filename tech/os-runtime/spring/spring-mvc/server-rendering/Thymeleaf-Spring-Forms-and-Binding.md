---
tags: [spring, thymeleaf, form, binding, checkbox, model-attribute]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Thymeleaf Spring Forms", "Thymeleaf Spring 폼 바인딩"]
---

# Thymeleaf와 Spring form binding

Thymeleaf Spring integration은 form-backing object, `WebDataBinder`, conversion/validation과 template field를 연결한다. `th:field`가 markup 반복을 줄여도 허용 field, 검증과 authorization은 server가 명시해야 한다.

## form-backing object

```html
<form th:object="${itemForm}" method="post">
  <input type="text" th:field="*{name}">
  <input type="number" th:field="*{price}">
</form>
```

`th:object`가 선택한 model attribute를 `*{...}`가 기준으로 삼고 `th:field`가 `id`, `name`, 현재/rejected value와 conversion 정보를 반영한다.

- Create/Update form DTO를 분리해 field와 validation contract를 좁힌다.
- Domain entity를 직접 binding하지 않아 mass assignment와 persistence leakage를 줄인다.
- Binding/format 오류 뒤에는 사용자가 제출한 rejected value를 보존하고 field/global error를 함께 render한다.
- Hidden field, disabled field와 client validation을 신뢰하지 않는다. Request는 직접 조작 가능하다.

## checkbox가 특별한 이유

HTML checkbox는 선택되지 않으면 name/value 자체를 보내지 않는다. Spring/Thymeleaf integration은 field marker용 hidden input을 생성해 “화면에 field가 있었지만 선택되지 않음”을 binder가 구분하도록 돕는다.

- Marker의 구체 name과 앞/뒤 배치 설정은 framework version/configuration에 의존하므로 markup을 수작업 가정에 묶지 않는다.
- 단일 Boolean과 multi-value collection을 구분한다.
- 여러 checkbox는 같은 property name과 각 option value를 사용하고 stable ID/label 연결을 유지한다.
- 미제출, 빈 collection, 명시적 false가 domain에서 같은 의미인지 DTO mapping에서 정한다.

## radio와 select

Radio group은 보통 하나의 value를 보내고 아무것도 선택하지 않으면 parameter가 없을 수 있다. Select는 single/multiple 설정에 따라 scalar/collection contract가 달라진다.

- Enum을 option source로 쓰더라도 외부 API에 enum name을 영구 contract로 노출할지 판단한다.
- DB/config에서 읽는 option은 active 여부와 user 권한을 server에서 다시 검증한다.
- 화면 label과 제출 value를 분리하고 message source로 label을 국제화한다.
- Object option을 통째로 신뢰하지 말고 stable ID를 받아 조회/권한 검사를 수행한다.

## 공통 model data

Controller의 method-level `@ModelAttribute`로 radio/select option을 여러 handler에 제공할 수 있다. 모든 요청마다 호출될 수 있으므로 비싼 DB query나 request별 side effect를 숨기지 않는다. Application-wide 공통 데이터는 cache/lifecycle과 locale/tenant key를 명시한다.

## Security integration

Spring의 `RequestDataValueProcessor` integration은 form action/field를 처리할 때 CSRF token 같은 hidden field를 추가할 수 있다. Template 편의 기능이 Security configuration을 자동 완성하는 것은 아니다.

- 상태 변경 form은 CSRF 방어와 SameSite/Origin 정책을 갖춘다.
- `th:action`에 untrusted absolute URL을 넣지 않는다.
- Error message에 rejected secret/password를 다시 노출하지 않는다.
- 선택 UI를 숨긴 것만으로 authorization을 구현하지 않는다.

## 출처

- [Thymeleaf 3.1 + Spring tutorial](https://www.thymeleaf.org/doc/tutorials/3.1/thymeleafspring.pdf), [Spring Framework, `@ModelAttribute`](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/modelattrib-method-args.html)
- Spring form: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83272), [통합](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83273), [입력 form](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83274), [선택 요구사항](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83275), [단일 checkbox 1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83276), [단일 checkbox 2](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83277), [multi checkbox](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83278), [radio](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83279), [select](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83280), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83281)

## 관련 문서

- [[Thymeleaf-Templates-Expressions-and-Safety|Thymeleaf template]]
- [[Spring-MVC-Manual-Validation|Spring MVC 수동 검증]]
- [[Spring-MVC-Bean-Validation|Bean Validation]]
- [[CSRF|CSRF]]
