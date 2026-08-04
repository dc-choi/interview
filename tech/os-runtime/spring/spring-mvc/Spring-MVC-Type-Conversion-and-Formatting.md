---
tags: [spring, mvc, conversion-service, converter, formatter, data-binding]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring MVC Type Conversion Formatting", "Spring MVC 타입 변환과 포맷팅"]
---

# Spring MVC 타입 변환과 formatting

HTTP path/query/form 값은 문자열 중심이지만 Controller는 UUID, number, date와 value object를 원한다. Spring `ConversionService`는 type-to-type 변환을, `Formatter`는 locale-aware String parse/print를 제공한다. JSON body를 읽는 `HttpMessageConverter`와는 적용 경로가 다르다.

## Converter

```java
final class StringToOrderId implements Converter<String, OrderId> {
    @Override
    public OrderId convert(String source) {
        return OrderId.from(source);
    }
}
```

- `Converter<S,T>`는 source/target type이 명확한 단방향 변환이다.
- 반대 방향은 별도 Converter가 필요하다.
- Family conversion에는 `ConverterFactory`, type metadata가 필요한 고급 경우에는 `GenericConverter`가 있다.
- Conversion은 pure/deterministic하게 유지하고 DB/network lookup이나 authorization을 숨기지 않는다.
- Invalid input은 명확한 conversion failure로 처리해 BindingResult/400 경로로 연결한다.

ID value object 변환 뒤에도 해당 resource 접근 권한은 별도 검사한다. 문자열이 typed ID로 바뀌었다는 사실은 존재/authorization 검증이 아니다.

## ConversionService

`ConversionService`는 등록된 converter 중 source/target type에 맞는 것을 선택하고 `canConvert`/`convert` API를 제공한다. `FormatterRegistry`를 통해 web application의 conversion/formatter를 추가할 수 있다.

```java
@Override
public void addFormatters(FormatterRegistry registry) {
    registry.addConverter(new StringToOrderId());
}
```

Global converter는 모든 compatible binding/View rendering에 영향을 줄 수 있다. Built-in converter와 겹치는 broad String-to-type 변환을 등록하기 전에 영향 범위와 precedence를 integration test한다.

## Formatter

`Formatter<T>`는 `Printer<T>`와 `Parser<T>`를 결합해 object와 String 사이를 `Locale` 문맥으로 변환한다.

- Number/date/currency처럼 사용자 표시/입력 형식에 적합하다.
- Machine identifier나 locale-independent protocol parsing에는 Converter/factory가 더 명확할 수 있다.
- Parse가 grouping separator, whitespace와 lenient date를 얼마나 허용하는지 contract를 정한다.
- Locale은 timezone/currency와 같지 않다. 필요한 정보를 별도 전달한다.

`FormattingConversionService`는 Converter와 Formatter를 함께 관리한다. Spring MVC/Boot가 제공하는 실제 service와 기본 등록은 configuration/version에 따라 확인한다.

## Annotation formatting

`@NumberFormat`, `@DateTimeFormat`은 field/property의 web binding과 표시 format을 선언한다. API JSON format은 Jackson/ObjectMapper 설정과 `@JsonFormat` 등 별도 serialization 경로다.

- 날짜 입력은 timezone과 offset이 있는 instant인지 local calendar 값인지 먼저 모델링한다.
- 금액 parsing은 locale display를 decimal domain value로 안전하게 변환하고 rounding/currency를 검증한다.
- Annotation pattern을 여러 DTO에 복제하기보다 공통 type/formatter가 나은지 비교한다.

## Thymeleaf

`th:field`는 Spring binding/conversion service를 사용해 form value를 print/parse한다. `${{value}}` 같은 conversion expression도 활용할 수 있지만 일반 `${value}`와 차이를 의도적으로 쓴다.

View formatting이 object의 `toString()`에 우연히 의존하지 않게 한다. `toString`은 debugging/identity 표현과 사용자 locale display의 lifecycle이 다르다.

## MessageConverter와 구분

| 입력/출력 | 기본 메커니즘 |
|---|---|
| path/query/form String ↔ method/DTO field | ConversionService, DataBinder |
| View/form 표시 | Formatter/ConversionService |
| JSON/XML/text body ↔ object | HttpMessageConverter/serializer |
| Domain object ↔ persistence/API DTO | 명시적 mapper/domain factory |

Custom Converter를 등록해도 Jackson JSON field가 자동으로 같은 규칙을 쓰지 않는다. 두 경계의 contract와 test를 따로 둔다.

## 출처

- [Spring Framework, type conversion](https://docs.spring.io/spring-framework/reference/core/validation/convert.html), [Spring field formatting](https://docs.spring.io/spring-framework/reference/core/validation/format.html), [MVC type conversion](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/typeconversion.html)
- 변환/format: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83368), [개요](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83369), [Converter](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83370), [ConversionService](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83371), [MVC 등록](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83372), [View 적용](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83373), [Formatter](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83374), [FormattingConversionService](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83375), [Formatter 적용](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83376), [기본 annotation formatter](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83377), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83378)

## 관련 문서

- [[Spring-MVC-Request-Mapping-and-Binding|요청 binding]]
- [[Spring-Messages-and-Internationalization|Locale과 message]]
- [[Thymeleaf-Spring-Forms-and-Binding|Thymeleaf form]]
