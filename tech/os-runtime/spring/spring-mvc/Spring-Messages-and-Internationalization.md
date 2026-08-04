---
tags: [spring, message-source, i18n, locale, thymeleaf]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Spring Messages and i18n", "Spring 메시지와 국제화"]
---

# Spring 메시지 관리와 국제화

Message source는 화면 문구와 validation message를 code에서 분리하고 locale별 bundle을 선택한다. 국제화는 번역 파일만의 문제가 아니라 locale 선택, number/date/timezone, plural, layout과 fallback을 포함한 contract다.

## MessageSource

Spring의 `MessageSource`는 code, argument, default message와 `Locale`을 받아 message를 resolve한다.

```java
messageSource.getMessage("item.price", new Object[]{price}, locale);
```

- `messages.properties`, `messages_ko.properties`, `messages_en.properties`처럼 basename과 locale suffix를 구성할 수 있다.
- Spring Boot는 조건에 맞는 resource bundle을 발견하면 message source를 auto-configure하고 basename/encoding/cache 등을 property로 조정할 수 있다.
- Default message를 줄지, missing key를 배포 오류로 볼지 환경별 정책을 정한다.
- Message argument에는 사용자 입력 raw HTML을 섞지 않고 최종 output context에서 escape한다.

Message key는 화면 위치보다 의미 중심으로 정하되 모든 문구를 하나의 거대한 flat namespace에 넣지 않는다. Domain error code와 사용자용 번역 message key는 lifecycle이 다를 수 있다.

## Locale 선택

Spring MVC의 `LocaleResolver`/`LocaleContextResolver`가 request의 locale을 정하고 View/formatter가 사용한다. 기본 전략은 환경에 따라 request의 `Accept-Language`를 볼 수 있으며 cookie/session/fixed 전략 등으로 바꿀 수 있다.

- `Accept-Language`는 client 선호 힌트이지 국적, 권한이나 규제 지역의 신뢰 근거가 아니다.
- 사용자가 명시적으로 고른 locale을 account/session/cookie 중 어디에 보관할지 정하고 Cookie 범위/보안을 검토한다.
- 지원하지 않는 locale은 allowlist와 명시적 fallback으로 처리한다.
- Locale과 timezone/currency는 서로 다른 설정이다.

## Thymeleaf에서 사용

`#{key}`로 message를 출력하고 argument를 전달할 수 있다. Label, button, error와 page title을 bundle로 옮기되 accessibility용 text와 metadata도 누락하지 않는다.

```html
<label th:text="#{item.name}">Item name</label>
```

HTML을 message bundle에 넣고 `th:utext`로 출력하면 번역 과정이 XSS 경계가 된다. Plain text message와 escaped output을 기본으로 한다.

## Formatting과 번역 품질

- Date/time은 user timezone과 calendar 의미를 함께 정한다.
- Number/currency 표시는 `Locale`과 명시적 currency에 맞춘다. 표시 문자열을 다시 계산 입력으로 사용하지 않는다.
- Java `MessageFormat`의 quoting/plural 한계를 확인하고 복잡한 언어 규칙은 ICU 같은 목적별 도구를 검토한다.
- 번역 길이에 따른 UI 확장, RTL, 복수형과 누락 key를 자동 test에 포함한다.

## 운영

- Bundle 변경의 reload/cache 정책은 classpath packaging과 production 성능을 고려한다.
- Key 삭제/변경은 template/code reference 검색과 다국어 bundle completeness check를 거친다.
- 사용자에게 보여 줄 message와 log/metric label을 분리한다. 번역된 문자열을 metric cardinality key로 쓰지 않는다.
- API는 stable error code와 structured field를 제공하고 localized message는 선택적인 presentation으로 둔다.

## 출처

- [Spring Framework, context functions and MessageSource](https://docs.spring.io/spring-framework/reference/core/beans/context-introduction.html), [Spring MVC locale](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/localeresolver.html)
- 메시지/i18n: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83283), [개요](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83284), [MessageSource 설정](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83285), [MessageSource 사용](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83286), [화면 message](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83287), [locale 적용](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83288), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83289)

## 관련 문서

- [[Thymeleaf-Templates-Expressions-and-Safety|Thymeleaf template]]
- [[Spring-MVC-Type-Conversion-and-Formatting|Conversion과 formatting]]
- [[Spring-MVC-Manual-Validation|Validation message]]
