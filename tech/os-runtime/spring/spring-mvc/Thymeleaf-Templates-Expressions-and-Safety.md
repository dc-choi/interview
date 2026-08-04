---
tags: [spring, thymeleaf, template, spel, xss, ssr]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Thymeleaf Templates and Expressions", "Thymeleaf 템플릿 표현식과 안전성"]
---

# Thymeleaf 템플릿, 표현식과 안전성

Thymeleaf는 server model을 HTML에 반영하는 template engine이다. Natural template, expression과 fragment는 생산성을 높이지만 template은 표시 계층이고 escaping context와 실행 가능한 표현식의 신뢰 경계를 지켜야 한다.

## Natural template과 출력

`th:*` attribute는 server rendering 때 기존 HTML attribute나 element 내용을 바꾸고, browser가 파일을 직접 열면 prototype용 원래 markup을 볼 수 있다.

```html
<span th:text="${member.name}">sample name</span>
```

- `th:text`와 `[[...]]`는 HTML text context에 escape된 출력을 사용한다.
- `th:utext`와 `[(...)]`는 unescaped markup을 출력하므로 사용자/외부 입력에 쓰지 않는다. 꼭 필요하면 허용된 HTML sanitizer와 CSP를 함께 검토한다.
- Escaping은 context별이다. HTML text 안전 값이 URL, HTML attribute, CSS나 JavaScript에 그대로 안전하다는 뜻은 아니다.
- Template file이나 SpringEL expression을 사용자가 편집할 수 있게 하면 server-side code/data 접근 위험이 생긴다. Template author를 trusted code로 취급한다.

## 표준 표현식

| 문법 | 의미 |
|---|---|
| `${...}` | variable/SpringEL expression |
| `*{...}` | 선택된 `th:object` 기준 expression |
| `#{...}` | message lookup |
| `@{...}` | context-aware URL construction |
| `~{...}` | template fragment |

String, number, Boolean, null literal과 비교/조건 연산을 지원하지만 business rule을 template expression에 옮기지 않는다. `th:with`의 local variable은 표시 계산을 간결하게 하는 범위에서 사용한다.

Model에는 View가 필요한 값만 명시적으로 넣는다. Request/session/application이나 Spring Bean에 template에서 직접 깊게 접근하면 dependency, query와 권한 검사가 보이지 않게 된다. Host object/expression object의 제공 범위도 Thymeleaf/Spring integration version에 따라 달라질 수 있으므로 model boundary를 기본으로 삼는다.

## 반복, 조건과 attribute

- `th:each`는 item과 iteration status(index/count/size/first/last 등)를 제공한다.
- `th:if`, `th:unless`, `th:switch`는 element rendering을 선택한다. 권한 UI 숨김은 server authorization을 대체하지 않는다.
- `th:block`은 결과 DOM에 wrapper를 남기지 않고 여러 node를 묶는다.
- `th:classappend`처럼 기존 attribute를 유지하며 더하는 processor와 attribute를 교체하는 processor를 구분한다.
- Boolean attribute인 `checked`, `selected`, `disabled`는 문자열 `"false"` 존재 여부가 아니라 template processor의 Boolean 의미로 다룬다.

HTML comment는 client source에 남을 수 있다. Server-only 설명/임시 영역은 Thymeleaf parser comment를 사용하되 secret을 template source 자체에 넣지 않는다.

## URL과 JavaScript inline

`@{...}`는 context path, path variable과 query parameter 조립을 돕는다. URL encoding이 authorization이나 open redirect 검증을 대신하지 않는다. 외부 redirect target과 scheme/host는 allowlist한다.

`th:inline="javascript"`의 escaped inline expression은 값을 JavaScript literal로 serialize한다. 문자열을 직접 quote/escape하는 것보다 안전하지만 다음을 지킨다.

- executable JavaScript 조각을 unescaped로 삽입하지 않는다.
- Large/sensitive object를 page source에 serialize하지 않는다.
- Inline script 사용 시 CSP nonce/hash 정책과 cache 영향을 확인한다.
- DOM에 이미 있는 data를 다시 inline하지 말고 API/data attribute 등 더 단순한 경계를 검토한다.

## fragment와 layout

`th:fragment`로 재사용 영역을 정의하고 `th:insert`/`th:replace`로 포함한다. Insert는 host tag 안에 fragment를 넣고 replace는 host tag 자체를 fragment로 바꾼다.

- Header/footer 같은 반복 markup과 page shell을 중앙화한다.
- Fragment parameter로 필요한 값만 전달해 global model dependency를 줄인다.
- Dynamic fragment/template name을 untrusted input에서 만들지 않는다.
- Layout이 깊어져 실제 HTML/asset 순서를 찾기 어려워지면 component 경계를 재조정한다.

## 날짜와 locale

Thymeleaf utility/expression object와 Spring conversion을 이용해 숫자/날짜를 표시할 수 있다. `Instant`, local date-time과 user timezone을 구분하고 locale-aware display를 machine-readable value/JSON과 섞지 않는다.

## 출처

- [Thymeleaf 3.1, Using Thymeleaf](https://www.thymeleaf.org/doc/tutorials/3.1/usingthymeleaf.html), [Thymeleaf documentation](https://www.thymeleaf.org/documentation)
- 기본 기능: [프로젝트](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83252), [소개](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83253), [text/utext](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83254), [SpringEL](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83255), [기본 object](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83256), [utility/date](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83257), [URL](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83258), [literal](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83259), [연산](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83260), [attribute](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83261), [반복](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83262), [조건](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83263), [주석](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83264), [block](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83265), [JavaScript inline](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83266), [fragment](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83267), [layout 1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83268), [layout 2](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83269), [정리](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83270)

## 관련 문서

- [[Spring-MVC-Server-Rendered-CRUD|Spring MVC SSR CRUD]]
- [[Thymeleaf-Spring-Forms-and-Binding|Thymeleaf form binding]]
- [[Spring-Messages-and-Internationalization|메시지와 국제화]]
- [[XSS|XSS 방어]]
