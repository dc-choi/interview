---
tags: [security, web-attacks, xss, owasp]
status: done
category: "Security - 웹 공격"
aliases: ["XSS", "Cross-Site Scripting", "크로스 사이트 스크립팅"]
verified_at: 2026-08-05
---

# XSS (Cross-Site Scripting)

공격자가 넣은 스크립트가 **피해자 브라우저에서 그 사이트의 출처(origin) 권한으로 실행되는** 취약점. 브라우저 입장에서는 사이트가 정상적으로 내려준 코드와 구분되지 않으므로, 쿠키 탈취뿐 아니라 화면 조작, 피해자 명의의 요청 전송까지 그 출처에서 가능한 모든 일이 가능해진다.

근본 원인은 하나다. **신뢰할 수 없는 데이터가 인터프리터(HTML 파서, JS 엔진)의 코드 자리로 흘러들어간 것**이다. 방어도 여기서 갈린다. 데이터를 데이터 자리에만 두거나, 코드로 해석될 수 없는 형태로 인코딩한다.

## 유형 — Stored, Reflected, DOM 기반

OWASP는 고전적으로 세 가지로 나눈다.

| 유형 | 페이로드 경로 | 예 |
|------|--------------|-----|
| **Stored** (Persistent, Type II) | 입력이 서버 DB, 게시판, 댓글, 방문 로그 등에 **저장**됐다가 이후 조회 시 렌더 | 댓글에 심은 스크립트가 모든 열람자에게 실행 |
| **Reflected** (Non-Persistent, Type I) | 입력이 에러 메시지, 검색 결과 등 응답에 **즉시 되돌아옴** | 조작된 링크를 클릭한 사용자에게만 실행 |
| **DOM 기반** (Type-0) | HTTP 응답 자체는 변하지 않고, **브라우저의 클라이언트 코드가 DOM 환경을 변경**하면서 실행 | `location.hash`를 `innerHTML`에 대입 |

OWASP는 여기에 더해 **Server XSS와 Client XSS**라는 축을 겹쳐 2x2로 정리한다. Server XSS는 신뢰할 수 없는 데이터가 서버가 만든 HTTP 응답에 포함된 경우, Client XSS는 그 데이터가 안전하지 않은 JS 호출로 DOM을 갱신하는 데 쓰인 경우다. DOM 기반 XSS는 데이터 출처가 DOM인 Client XSS의 부분집합으로 분류된다.

두 축은 직교한다. Stored와 Reflected는 **대개 Server XSS로 나타나지만**, 저장되거나 반사된 값을 서버가 아니라 클라이언트 JS가 DOM에 쓰는 구조라면 OWASP 분류상 Client XSS로도 성립한다. 실무적 함의는 여기서 나온다. **서버 측 출력 인코딩만으로는 DOM 기반 XSS를 막지 못하므로**, 안전한 DOM 싱크 사용이 별도 층으로 필요하다.

## 컨텍스트별 출력 인코딩

인코딩은 **출력되는 자리(컨텍스트)마다 규칙이 다르다.** 한 가지 이스케이프 함수를 전부에 돌리는 것이 가장 흔한 실패다. OWASP XSS Prevention Cheat Sheet의 규칙:

| 규칙 | 컨텍스트 | 인코딩 |
|------|---------|--------|
| #1 | HTML body (`<div>여기</div>`) | `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;`, `"`→`&quot;`, `'`→`&#x27;` |
| #2 | HTML 속성값 (`<div attr="여기">`) | 영숫자 외 전 문자를 `&#xHH;` 형식으로 |
| — | JavaScript 데이터값 (`<script>var x="여기"</script>`) | **따옴표로 감싼 데이터값 자리에만** 넣고, 영숫자 외 전 문자를 `\xHH` 또는 `\uXXXX` 형식으로 (치트시트 요약표 기준은 `\uXXXX`) |
| #4 | CSS (`<style>p{color:여기}</style>`) | **CSS 속성값 자리에만**, 그 외 CSS 컨텍스트는 안전하지 않음 |
| #5 | URL 파라미터 (`<a href="/x?p=여기">`) | 영숫자 외 전 문자를 `%HH` 형식으로 |

**인코딩으로 덮을 수 없는 자리도 있다.** `<script>` 태그 안 코드 자리, HTML 주석 안, CSS 블록 안처럼 위험한 컨텍스트는 어떤 인코딩을 적용해도 안전해지지 않는다. 이런 자리에는 사용자 데이터를 아예 넣지 않는다.

DOM 기반에서 특히 어려운 점: **DOM 엘리먼트의 `value` 속성으로 값을 다시 꺼내면 인코딩이 풀린다.** 서버에서 HTML 인코딩해 내려보낸 값도 JS가 읽는 순간 원문으로 돌아와, 새 컨텍스트에서 다시 실행 가능한 상태가 된다.

## 프레임워크의 자동 이스케이프와 그 탈출구

React, Angular 같은 모던 프레임워크는 기본 렌더 경로에서 자동 이스케이프한다. 문제는 그 보호를 우회하는 API를 쓸 때다. OWASP가 명시적으로 지목한 것들:

- React `dangerouslySetInnerHTML`을 살균 없이 사용
- React가 `javascript:`, `data:` URL은 안전하게 처리하지 못하는 점 (`<a href={userInput}>`)
- Angular `bypassSecurityTrustAs*` 계열
- Lit `unsafeHTML`, Polymer `inner-h-t-m-l`와 템플릿 인젝션

서버 사이드도 같다. 템플릿 엔진의 raw 출력 문법(Thymeleaf `th:utext`, EJS `<%- %>` 등)이 동일한 탈출구다.

## HTML을 허용해야 할 때 — 살균(sanitization)

리치 텍스트 에디터처럼 사용자 HTML을 실제로 허용해야 하면 인코딩이 아니라 **허용 목록 기반 살균**이 답이다. OWASP는 DOMPurify를 권장한다.

```js
let clean = DOMPurify.sanitize(dirty);
```

주의점 두 가지가 문서에 명시돼 있다.

- **살균한 뒤 결과물을 다시 수정하면 보안 효과가 쉽게 무효화된다.** 살균은 마지막 단계여야 한다.
- 살균 라이브러리는 **정기적으로 패치**해야 한다. 우회 기법이 계속 발견된다.

## DOM XSS 싱크

클라이언트 코드에서 사용자 데이터가 닿으면 안 되는 자리. OWASP DOM based XSS Prevention Cheat Sheet가 지목한 것들:

- HTML 렌더: `innerHTML`, `outerHTML`, `document.write()`, `document.writeln()`
- 암묵적 평가: `eval()`, `setTimeout()`, `setInterval()`, `new Function()`, 이벤트 핸들러를 다루는 `setAttribute()`
- 객체와 이동: `window[사용자데이터]`, `location` 대입

대안은 **안전한 싱크로 바꾸는 것**이다. `innerHTML` 대신 `textContent`, 속성은 `setAttribute` 대신 전용 프로퍼티, URL은 스킴 허용 목록 검사 후 대입.

## CSP와의 관계 — 방어의 순서

CSP는 XSS 대응에서 **1차 방어가 아니라 심층 방어(defense in depth)** 계층이다. OWASP는 CSP만 믿는 것을 명시적으로 경고한다. 브라우저 버전별 호환 차이가 있고, 레거시 애플리케이션이 깨지기 때문이다.

정리하면 이렇게 쌓는다.

1. 컨텍스트별 출력 인코딩 — Server XSS의 기본 방어
2. 안전한 DOM 싱크 사용 — OWASP가 Client XSS의 가장 쉽고 강력한 방어로 규정
3. HTML 허용이 필요하면 DOMPurify 살균
4. CSP로 인라인 스크립트와 외부 출처를 제한 — 앞의 층이 뚫렸을 때의 폭발 반경 축소

CSP 디렉티브, nonce와 hash, Report-Only 운영은 [[Security-Headers|Security Headers]]에 정리.

## HttpOnly 쿠키의 한계

`HttpOnly` 쿠키는 JS가 `document.cookie`로 접근할 수 없고 서버에 도달할 때만 사용된다. MDN도 세션 쿠키에는 설정하라고 권고하며(should have), 그 효과를 XSS **완화(mitigate)**라고 표현한다. 차단이 아니다.

XSS가 성공하면 스크립트는 이미 그 출처 안에서 돌고 있다. 쿠키 값을 읽지 못해도 다음이 남는다.

- **세션 라이딩** — `fetch('/api/transfer', {credentials:'include'})`처럼 요청만 보내면 브라우저가 쿠키를 알아서 붙인다. 값을 읽을 필요가 없다.
- **DOM에 있는 것은 전부 읽힌다** — 화면의 개인정보, 폼에 렌더된 CSRF 토큰, `localStorage`에 둔 액세스 토큰.
- **UI 위조** — 가짜 로그인 폼을 심어 자격증명을 직접 받는다.

그래서 HttpOnly는 세션 쿠키 탈취라는 한 가지 경로를 줄일 뿐, XSS 자체의 대책이 될 수 없다. 토큰을 `localStorage`에서 HttpOnly 쿠키로 옮기는 것도 같은 이유로 XSS 해결이 아니라 탈취 난이도 조정이다. 쿠키 속성 전반은 [[Cookie|Cookie]] 참고.

## 면접 포인트

Q. XSS 세 유형의 차이는?
- Stored는 입력이 서버에 저장됐다가 조회 시 실행, Reflected는 응답에 즉시 반사돼 조작된 링크를 클릭한 사용자에게만 실행, DOM 기반은 HTTP 응답은 그대로인데 클라이언트 JS가 DOM을 갱신하며 실행된다. 앞의 둘은 대개 Server XSS로 나타나지만, 저장, 반사된 값을 클라이언트 JS가 DOM에 쓰면 Client XSS로도 성립한다. OWASP의 Server/Client 축은 Stored/Reflected 구분과 직교하고, 그래서 서버 측 인코딩만으로 DOM 기반은 막히지 않는다.

Q. 이스케이프 함수 하나로 전부 처리하면 안 되는 이유는?
- 출력 컨텍스트마다 인터프리터가 다르다. HTML body는 엔티티, 속성은 `&#xHH;`, JS 데이터값은 `\xHH` 또는 `\uXXXX`(치트시트 요약표 기준은 `\uXXXX`), URL은 `%HH`로 규칙이 다르고, `<script>` 코드 자리나 HTML 주석 안은 어떤 인코딩으로도 안전해지지 않아 데이터를 아예 두지 않아야 한다.

Q. CSP를 켜면 XSS는 해결되나?
- 아니다. OWASP는 CSP를 심층 방어로 규정하고 primary defense로 삼지 말라고 못박는다. 브라우저 호환 차이가 있고 구현 실수도 잦아, Server XSS는 컨텍스트별 출력 인코딩, Client XSS는 안전한 DOM API 사용이 기본 방어다. HTML을 허용해야 하면 살균을 얹고, CSP는 그 위에서 폭발 반경을 줄이는 층이다.

Q. HttpOnly 쿠키를 쓰면 XSS로부터 안전한가?
- 쿠키 값 탈취만 막힌다. 스크립트가 그 출처에서 실행 중이므로 `credentials: 'include'`로 요청만 보내면 쿠키는 브라우저가 붙여준다. DOM의 개인정보와 CSRF 토큰도 읽힌다. MDN도 완화라고 쓴다.

## 출처

- [OWASP Cheat Sheet Series — Cross Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Cheat Sheet Series — DOM based XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP — Types of Cross-Site Scripting](https://owasp.org/www-community/Types_of_Cross-Site_Scripting)
- [MDN — Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)

## 관련 문서

- [[Security-Headers|Security Headers (CSP, nonce, Report-Only)]]
- [[CSRF|CSRF]]
- [[CORS|CORS]]
- [[Cookie|Cookie]]
- [[Application-Security|애플리케이션 보안]]
