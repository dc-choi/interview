---
tags: [web, network]
status: done
category: "Web & Network"
aliases: ["Cookie"]
---

# Cookie

세션관리, 개인화, 트래킹에 사용된다.

서버는 응답시 Set-Cookie 헤더를 전송할 수 있다.

브라우저는 Cookie 헤더를 통해 이전에 저장했던 쿠키들을 회신한다.

속성의 경우는 다음과 같다.
1. Domain의 경우 쿠키를 전송할 호스트 주소가 아니라면 전송하지않는다.
2. Path는 Domain의 경로에 해당하지 않는 경우 전송하지 않는다.
3. Secure는 HTTPS를 사용하는 경우에만 전송된다.
4. HttpOnly는 XSS 공격을 방지하기 위해서 사용한다. JS의 Document.cookie API에 접근할 수 없다.
5. SameSite는 CSRF 공격을 방지하기 위해서 사용한다. (https://junhyunny.github.io/information/security/spring-boot/spring-security/cross-site-reqeust-forgery/)

쿠키의 종류
1. 세션 쿠키(메모리에 저장되며 브라우저 종료시 쿠키를 삭제)
2. 퍼머넌트 쿠키(일정 기간동안 유지되는 쿠키, 브라우저가 종료되어도 유지됨)
3. 서드파티 쿠키(방문한 도메인과 다른 도메인의 쿠키, 유입경로를 추적하기 위한 쿠키)

세션 쿠키는 로그인 상태를 증명하는 열쇠다. 탈취되면 비밀번호 없이도 해당 사용자로 행동할 수 있으므로(세션 하이재킹) 비밀번호급 민감 정보로 다뤄야 하며, 위 보안 속성(HttpOnly, Secure, SameSite)과 HTTPS가 방어의 기본이다. 로그인 판단 구조는 [[Session]] 참조.

쿠키 값은 클라이언트가 자유롭게 편집할 수 있다. user_id 같은 식별자를 그대로 담고 서버가 그 값을 믿으면 누구나 값을 바꿔 다른 사용자로 위장할 수 있으므로, 인증에는 서버가 검증할 수 있는 값(추측 불가능한 세션 ID, 서명된 토큰)만 쓴다. 변조돼도 무해한 값(유입 경로 추적, 화면 설정 등)만 평문으로 담아도 된다.

## 출처
- [웹보안 — 딩코딩코 (개발자 취업 필수 개념 강의)](https://fern-freeze-290.notion.site/37aade118e3680908aeee8bb5a517c7d)

## 관련 문서
- [[Session]]
- [[CSRF]]
- [[HTTP-Status-Code|HTTP 상태 응답 코드]]
