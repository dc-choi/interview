---
tags: [web, http, cookie, security, session]
status: done
verified_at: 2026-10-01
category: "Web - HTTP"
aliases: ["Cookie", "HTTP Cookie"]
---

# Cookie

Cookie는 User Agent가 Server의 `Set-Cookie`를 저장하고 적용 범위가 맞는 후속 요청에 `Cookie` Field로 돌려보내는 HTTP 상태 관리 메커니즘이다. 세션 식별, 개인화와 사용자 선택 저장에 쓸 수 있다.

```http
Set-Cookie: session_id=<opaque>; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=Lax

Cookie: session_id=<opaque>
```

HTTP의 Stateless 의미가 사라지는 것은 아니다. 각 요청은 Cookie에 담긴 식별자로 애플리케이션 상태를 복원한다. 연결이 유지돼도 Cookie 동작과 HTTP 요청 의미는 독립적이다.

## 전송 범위와 수명

| 속성 | 역할과 주의점 |
|---|---|
| `Domain` | 생략하면 host-only다. 지정하면 허용된 하위 Domain에도 전송될 수 있어 최소 범위를 쓴다. |
| `Path` | 요청 path와 match되는 범위를 좁히지만 보안 경계로 신뢰할 수 없다. |
| `Max-Age` | 현재부터의 수명을 초로 지정한다. `Expires`와 함께 있으면 우선한다. |
| `Expires` | 절대 만료 시각이다. 둘 다 없으면 User Agent가 정의한 session 동안 보관한다. |
| `Secure` | 안전한 channel, 일반적으로 HTTPS 요청에만 전송한다. |
| `HttpOnly` | `document.cookie` 같은 non-HTTP API에 노출하지 않는다. XSS 자체와 인증된 요청 실행까지 막지는 않는다. |
| `SameSite` | cross-site 요청에서 전송 범위를 `Strict`, `Lax`, `None`으로 제어해 CSRF 위험을 낮춘다. `None`은 `Secure`와 함께 쓴다. |

User Agent는 메모리, 개인정보 정책과 저장 한도에 따라 만료 전 Cookie도 제거할 수 있다. 영구 보존소로 사용하지 않는다.

## 보안 원칙

- Cookie 값은 Client가 보고 수정할 수 있다고 가정한다.
- 인증에는 사용자 ID나 권한을 그대로 신뢰하지 않고 추측하기 어려운 Session ID 또는 검증 가능한 Token을 사용한다.
- Session ID는 로그인과 권한 상승 뒤 재발급하고 Server에서 만료, 폐기할 수 있게 한다.
- 상태 변경 요청은 `SameSite`만 믿지 않고 CSRF Token과 Origin 검증 등 위협 모델에 맞는 방어를 적용한다.
- `Secure`, `HttpOnly`, 좁은 Domain/Path, 짧은 수명과 HTTPS를 함께 적용한다.
- Session Cookie와 `Authorization` 원문을 로그에 남기지 않는다.
- 이미지와 정적 Asset 요청에도 범위가 맞으면 자동 전송되므로 크기와 Domain/Path를 최소화한다.

Cookie에 표시 설정 같은 데이터를 직접 넣을 수는 있지만 무결성이 필요한 값은 Server 검증이나 서명이 필요하다. Session 방식에서는 Cookie에 opaque ID만 두고 중요한 상태를 Server 저장소에 둔다.

## Cookie와 웹 스토리지의 역할 분담

Cookie는 범위가 맞는 모든 요청에 실려 요청마다 전송 비용이 든다. 브라우저는 도메인당 Cookie 수와 Cookie당 크기(보통 4KB)도 제한한다. 그래서 Cookie에는 Server가 매 요청 알아야 하는 세션 ID나 인증 식별자처럼 최소한만 둔다.

- Server가 몰라도 되는 비민감 데이터(표시 설정, UI 상태)는 웹 스토리지를 검토한다. Server로 전송되지 않고 필요할 때 JavaScript로 읽는다. `localStorage`는 origin 단위로 브라우저를 다시 열어도 남고, `sessionStorage`는 origin과 탭 단위로 탭을 닫으면 사라진다. 사생활 보호 모드의 `localStorage`는 창을 닫으면 지워진다.
- 웹 스토리지는 같은 origin의 스크립트가 모두 읽을 수 있어 XSS에 노출된다. 토큰과 비밀값은 두지 않고 `HttpOnly`, `Secure`, `SameSite` Cookie로 보낸다([[JWT|JWT 유출 경로]], [[Auth-Method-Selection|인증 방식 선택]]).

## Cookie 삭제와 로그아웃

Cookie를 지우려면 같은 이름, Domain, Path로 `Max-Age=0`이나 지난 `Expires`를 담은 `Set-Cookie`를 다시 보낸다. User Agent는 이름, Domain, Path가 같은 Cookie를 같은 Cookie로 보고 교체하므로, 삭제 응답의 Domain이나 Path가 발급 때와 다르면 원래 Cookie가 남는다.

```http
Set-Cookie: session_id=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax
```

- 프레임워크 삭제 함수도 같은 규칙을 따른다. Express `res.clearCookie()`는 만료일이 지난 `Set-Cookie`를 보내며, 발급 때 `res.cookie()`에 준 옵션과 같아야 브라우저가 지운다. Servlet API에서는 `setMaxAge(0)`인 Cookie를 응답에 추가한다.
- Cookie 삭제는 Client에 지워 달라고 요청할 뿐이다. 이미 복사되거나 탈취된 값은 계속 쓸 수 있으므로 로그아웃의 기준은 Server 세션 무효화나 토큰 폐기다. Server 세션을 무효화하면 브라우저에 세션 ID Cookie가 남아도 대응하는 세션이 없어 인증되지 않는다([[Session|세션]]).

## 출처

- 김영한 강사, [쿠키](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61382)
- 김영한 강사, [로그인 처리하기 - 쿠키 사용](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83329)
- 김영한 강사, [로그인 처리하기 - 서블릿 HTTP 세션1](https://www.inflearn.com/courses/lecture?courseId=327260&unitId=83334)
- [RFC 6265, HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265.html)
- [IETF HTTPbis, Cookies draft](https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/)
- [MDN, Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [MDN, Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Express 5.x API, Response (res.clearCookie)](https://expressjs.com/en/5x/api/response/)

## 관련 문서

- [[Session|Stateless HTTP 위의 세션]]
- [[Auth-Method-Selection|인증 방식 선택]]
- [[CSRF|CSRF]]
- [[HTTP-Header-Semantics|HTTP 헤더 의미]]
