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
