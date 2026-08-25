---
tags: [spring, mvc, thymeleaf, ssr, form, message-source, i18n]
status: index
category: "OS & Runtime"
aliases: ["Spring MVC Server Rendering", "Spring MVC 서버 렌더링과 화면 문구"]
---

# Spring MVC 서버 렌더링과 화면 문구

Controller가 만든 View model을 HTML로 바꾸고 화면에 보일 문구를 결정하는 묶음이다. Thymeleaf SSR CRUD의 요청 계약과 PRG, template 표현식과 escaping 신뢰 경계, form-backing object 기반 field binding, 그리고 MessageSource와 locale로 문구를 code에서 분리하는 국제화까지를 다룬다.

- [[Spring-MVC-Server-Rendered-CRUD|Spring MVC 서버 렌더링 CRUD와 PRG]]: 요구사항에서 경계 잡기, static resource와 template, form binding, PRG의 범위, managed update와 merge, RedirectAttributes, API 분리
- [[Thymeleaf-Templates-Expressions-and-Safety|Thymeleaf 템플릿, 표현식과 안전성]]: natural template과 출력 escaping, 표준 표현식, 반복/조건/attribute, URL과 JavaScript inline, fragment와 layout, 날짜와 locale
- [[Thymeleaf-Spring-Forms-and-Binding|Thymeleaf와 Spring form binding]]: form-backing object와 th:field, checkbox가 특별한 이유, radio와 select, 공통 model data, Security integration과 허용 field 명시
- [[Spring-Messages-and-Internationalization|Spring 메시지 관리와 국제화]]: MessageSource로 문구 분리, locale 선택 전략, Thymeleaf에서 사용, number/date formatting과 번역 품질, 운영

## 함께 볼 문서

- [[Spring-MVC|Spring MVC — 웹 요청 처리 계층]]
