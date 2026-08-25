---
tags: [spring, mvc, request-mapping, data-binding, validation, bean-validation, multipart]
status: index
category: "OS & Runtime"
aliases: ["Spring MVC Binding and Validation", "Spring MVC 요청 바인딩과 검증"]
---

# Spring MVC 요청 바인딩과 검증

문자열 중심의 HTTP 입력을 typed 객체로 만들고 그 값이 규칙을 지키는지 확인하는 구간이다. mapping 조건으로 handler를 고르는 단계부터 parameter/body binding, type 변환과 formatting, multipart part 바인딩, 그리고 binding 오류와 validation 오류를 나눠 사용자에게 설명하는 수동 검증과 Jakarta Validation까지 이어진다.

- [[Spring-MVC-Request-Mapping-and-Binding|Spring MVC 요청 mapping, binding과 응답 변환]]: mapping 조건 조합, header와 request 기본 정보, parameter와 body binding, HttpMessageConverter, ArgumentResolver/ReturnValueHandler와 logging
- [[Spring-MVC-Type-Conversion-and-Formatting|Spring MVC 타입 변환과 formatting]]: Converter와 ConversionService, locale-aware Formatter, annotation formatting, HttpMessageConverter와의 적용 경로 구분
- [[Spring-MVC-Manual-Validation|Spring MVC binding 오류와 수동 검증]]: binding 실패와 validation 실패의 분리, BindingResult, FieldError/ObjectError, MessageCodesResolver, Spring Validator와 API/form 차이
- [[Spring-MVC-Bean-Validation|Spring MVC와 Jakarta Validation]]: Jakarta Validation 3.1 constraint의 의미, Spring MVC 통합, field와 object rule, create/update contract별 DTO, message와 API error
- [[Spring-Multipart-JSON|Spring REST — Multipart 파일 + JSON DTO 동시 처리]]: @RequestPart 패턴과 @RequestBody 혼용 금지 원칙, 클라이언트 요청 구성, MockMvc 테스트, 크기 제한, 대용량 업로드 대안과 저장/다운로드 경계

## 함께 볼 문서

- [[Spring-MVC|Spring MVC — 웹 요청 처리 계층]]
