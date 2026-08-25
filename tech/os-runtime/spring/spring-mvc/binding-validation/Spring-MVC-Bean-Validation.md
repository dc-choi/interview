---
tags: [spring, mvc, jakarta-validation, bean-validation, dto]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Bean Validation", "Spring MVC Jakarta Validation"]
---

# Spring MVC와 Jakarta Validation

Jakarta Validation은 JavaBean, method parameter/return value와 container element에 constraint metadata를 선언하고 provider가 검사하는 표준이다. 현재 stable 기준은 Jakarta Validation 3.1의 `jakarta.validation.*` namespace이며 과거 `javax.validation.*` 예제와 구분한다.

## Constraint의 의미

```java
public record CreateItemRequest(
    @NotBlank String name,
    @NotNull @PositiveOrZero BigDecimal price,
    @Valid List<OptionRequest> options
) {}
```

- `@NotNull`, `@NotBlank`, `@Size`, `@Min`/`@Max`, `@Positive` 등은 표준 constraint다.
- Provider-specific annotation인 Hibernate Validator `@Range` 등을 쓰면 portability와 dependency를 명시한다.
- 많은 constraint는 null을 유효로 보고 type-specific rule만 검사한다. 필수 여부는 `@NotNull` 등과 조합한다.
- Nested object/collection의 constraint는 `@Valid`로 cascade하고 container element constraint도 사용할 수 있다.
- Message, payload와 group은 constraint metadata이며 domain error response 전체를 자동 설계하지 않는다.

`ConstraintValidator` 구현은 호출 간 mutable state에 의존하지 않고 thread-safe 사용을 고려한다. Network/DB uniqueness query를 annotation validator에 숨기면 race를 막지 못하고 latency/transaction이 불투명해진다. DB unique constraint와 use-case 검증을 함께 설계한다.

## Spring MVC 통합

`@Valid` 또는 Spring `@Validated`가 붙은 model/body argument는 configured Jakarta Validator를 통해 검사할 수 있다.

- `@ModelAttribute`는 binding 오류와 constraint violation을 `BindingResult`에 함께 담아 form을 다시 render할 수 있다.
- `@RequestBody`는 먼저 message converter가 JSON을 Java object로 만들어야 한다. Malformed JSON/type mismatch는 validation 이전의 읽기 오류다.
- JSON object 생성 뒤 constraint가 실패하면 일반적으로 MVC validation 예외/BindingResult 경로로 간다.
- Method parameter/return constraint는 method validation 설정과 exception type을 별도로 확인한다.
- Validation을 통과해도 authentication, authorization와 business invariant는 별도다.

## Field와 object rule

단일 field 규칙은 field constraint로 표현하기 쉽다. Start/end 순서, 두 가격의 관계 같은 object rule은 class-level custom constraint 또는 명시적 Validator/domain method로 표현한다.

Script expression 기반 constraint는 문자열 속 expression, refactoring 취약성, 도구/보안 문제 때문에 일반 기본값으로 두지 않는다. Typed Java validator로 rule과 field path를 명시한다.

## Create/Update contract

같은 entity에 create/update constraint를 모두 붙이면 ID 필수 여부, 변경 가능한 field와 validation group이 복잡해진다.

| 접근 | 적합한 경우 | 비용 |
|---|---|---|
| Validation groups | 같은 shape에서 constraint subset만 달라짐 | group 조합/순서 추적 필요 |
| Create/Update DTO 분리 | 입력 shape와 권한이 실제로 다름 | mapping code 필요 |
| Domain command/value object | invariant가 web 외에서도 동일 | 설계/변환 경계 필요 |

실무에서는 외부 input DTO를 use case별로 분리하고 domain mapping에서 invariant를 다시 확인하는 방식이 대체로 명확하다. Group은 공통 contract가 실제로 큰 경우에 제한해 쓴다.

## Message와 API error

Constraint의 default message는 사용자/API contract로 그대로 노출하지 않는다.

- Message key와 interpolation argument를 message source로 관리한다.
- API에는 stable error code, JSON field path, rejected value 노출 정책을 둔다.
- Secret field의 rejected value를 response/log에 포함하지 않는다.
- Locale-aware message는 선택적 presentation이고 machine client는 code를 사용한다.

## Test

- Validator unit test로 boundary/null/cascade/group을 확인한다.
- MockMvc test로 malformed JSON, type mismatch, binding failure와 validation failure를 구분한다.
- Service/integration test로 authorization, unique constraint와 concurrent state를 검증한다.
- DTO 변경 시 OpenAPI/schema와 runtime constraint가 어긋나지 않는지 확인한다.

## 출처

- [Jakarta Validation 3.1](https://jakarta.ee/specifications/bean-validation/3.1/), [Jakarta Validation 3.1 API](https://jakarta.ee/specifications/bean-validation/3.1/apidocs/), [Spring validation](https://docs.spring.io/spring-framework/reference/core/validation.html)
- Bean Validation: [소개](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83309), [시작](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83310), [프로젝트 v3](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83311), [Spring 적용](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83312), [error code](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83313), [object error](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83314), [update 적용](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83315), [한계](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83316), [groups](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83317), [form DTO 준비](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83318), [form DTO 분리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83319), [form DTO 구현](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83320), [RequestBody 검증](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83321), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83322)

## 관련 문서

- [[Spring-MVC-Manual-Validation|BindingResult와 수동 검증]]
- [[Spring-MVC-Request-Mapping-and-Binding|요청 binding]]
- [[API-Conventions-Response|API error response]]
