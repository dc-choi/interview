---
tags: [security, auth, jwt, bearer-token]
status: done
verified_at: 2026-10-03
category: "Security - 인증"
aliases: ["JWT", "JSON Web Token", "JWT 탈취", "Bearer Token Replay"]
---

# JWT

JWT(JSON Web Token)는 당사자 사이에서 전달할 클레임 집합을 compact, URL-safe 형식으로 표현하는 토큰 규격이다. JWT 자체가 로그인 방식인 것은 아니며 access token, ID token과 다른 보안 메시지의 표현 형식으로 쓰인다.

JWT는 JWS로 서명 또는 MAC 보호하거나 JWE로 암호화할 수 있으며, 필요하면 둘을 중첩한다. 웹 인증에서 흔히 보는 `header.payload.signature` 형태는 JWS Compact Serialization이다. 이 문서에서 별도 언급이 없으면 JWS로 보호된 JWT를 뜻한다.

## 구조와 보장 범위

| 부분 | 내용 | 보안 의미 |
|---|---|---|
| Header | 토큰 유형, 서명 알고리즘 같은 메타데이터 | 검증할 알고리즘을 애플리케이션 허용 목록과 대조 |
| Payload | 사용자, 권한, issuer, audience와 만료 같은 claim | Base64URL 인코딩일 뿐 기밀성을 제공하지 않음 |
| Signature | 인코딩한 Header와 Payload에 대한 서명 또는 MAC | 비대칭 서명은 개인키 보유자의 생성과 무결성을, 대칭 MAC은 공유키 보유자 중 하나의 생성과 무결성을 확인 |

서명된 JWT는 **출처와 무결성**을 검증할 수 있지만 **기밀성**을 보장하지 않는다. 누구나 Header와 Payload를 디코딩할 수 있으므로 비밀번호, 주민등록번호와 원문 자격증명 같은 비밀을 넣지 않는다. 기밀성이 필요하면 별도 JWE 설계를 검토하더라도 전송 구간의 TLS는 유지한다.

## 검증 흐름

1. 애플리케이션이 허용한 알고리즘과 키만 사용하고 토큰의 `alg` 값을 그대로 신뢰하지 않는다. 키마다 사용할 알고리즘과 키 타입을 고정해 RSA 공개키를 HMAC secret으로 해석하는 혼동을 막는다. 이 문서의 서명 검증을 요구하는 인증 프로필에서는 `none`을 거부한다.
2. 서명 또는 MAC 검증에 실패하면 토큰 전체를 거부한다.
3. 필수 claim은 존재 여부부터 검사하고, 존재하는 `exp`, `nbf`의 초 단위 NumericDate와 시간 조건을 검증한다. API 인증용 자체 access token 프로필에서는 `exp`를 필수로 정해 누락 시 거부하고, 허용할 clock skew 범위를 제한한다.
4. 서비스 프로필이 요구한 `iss`, 현재 리소스를 가리키는 `aud`를 검증한다. `sub`를 신원 식별에 쓰는 프로필이라면 issuer와 함께 유효성을 확인한다.
5. access token과 ID token처럼 용도가 다른 JWT에는 audience, 키, 필수 claim이나 `typ`로 구별되는 검증 규칙을 두어 다른 유형의 토큰이 통과하지 못하게 한다.
6. 인증 뒤에도 scope와 role뿐 아니라 요청한 작업, 객체의 소유권과 tenant 범위를 서버에서 인가한다. `aud`가 맞아도 같은 API의 다른 고객 데이터에 접근할 권한을 뜻하지 않는다. 세부 기준은 [[Access-Control-Models]]를 따른다.

JWT가 자체 검증 가능하다는 말은 서명만 맞으면 충분하다는 뜻이 아니다. 애플리케이션이 기대하는 발급자, 대상과 용도까지 일치해야 한다.

RFC 7519 자체는 등록 claim 전체를 모든 JWT에 필수로 요구하지 않는다. 필수 claim과 누락 시 거부 규칙은 사용할 토큰 프로필에 정하고, `iat`는 발급 시각이며 `exp`를 대신하는 만료 조건이 아니다. 같은 issuer가 여러 수신자용 JWT를 발급하면 RFC 8725에 따라 `aud`를 요구하고 수신자 일치까지 확인한다. ([RFC 7519, 4.1](https://www.rfc-editor.org/rfc/rfc7519.html#section-4.1), [RFC 8725, 3.9](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.9))

## Bearer Token 탈취와 replay

Bearer token은 소유 증명을 추가로 요구하지 않고, 제시한 토큰이 유효하면 요청자를 그 토큰의 주체로 취급한다. 공격자는 JWT를 변조하거나 서명 키를 알 필요가 없다. 유효한 토큰 전체를 복사해 자신의 요청에 그대로 넣으면 서버의 정상 검증을 통과할 수 있다.

두 브라우저로 이를 재현하면 동작이 분명하다.

1. 사용자 A와 B가 각각 로그인해 access token을 받는다.
2. A의 브라우저에 B의 access token을 그대로 넣는다.
3. A가 사용자 정보 API를 호출하면 서버는 B의 유효한 claim을 보고 B로 처리한다.
4. access token은 만료까지 악용할 수 있고, refresh token까지 탈취되면 새 access token을 반복 발급할 수 있어 피해 기간이 더 길어진다.

서명은 복사된 정상 토큰도 정상이라고 판정한다. JWT의 결함이 아니라 일반 Bearer 자격증명의 보안 경계이며, 저장과 수명주기 설계가 별도로 필요한 이유다.

## 주요 유출 경로

- XSS가 JavaScript로 접근 가능한 `localStorage`와 `sessionStorage`의 토큰을 읽음
- 악성 브라우저 확장, 악성 코드나 공용 PC 사용자가 브라우저 저장소에 접근
- 로그아웃 때 영구 저장소의 토큰을 지우지 않아 다음 사용자가 재사용
- 피싱으로 얻은 자격증명으로 공격자가 별도 토큰을 발급
- 프록시, 애플리케이션과 분석 로그에 `Authorization` 헤더나 토큰 원문을 기록
- TLS가 없는 구간에서 네트워크 스니핑으로 토큰 노출

비밀번호를 바꿔도 이미 발급한 self-contained token이 자동으로 무효화되는 것은 아니다. 비밀번호 변경과 계정 위험 이벤트 때 어떤 token family 또는 session을 폐기할지 정책으로 연결해야 한다.

## 훔치기 어렵게 만들기

### 전송과 저장

- 모든 인증 요청과 API 통신에 HTTPS를 적용한다.
- 브라우저 기반 자체 서비스는 JavaScript가 읽을 수 없는 `HttpOnly`, `Secure` 쿠키를 우선 검토하고 요구에 맞는 `SameSite`를 설정한다.
- 쿠키 자동 전송을 쓰면 [[CSRF]] 방어가 필요하다. `SameSite`만으로 모든 CSRF가 사라진다고 가정하지 않는다.
- `HttpOnly`는 토큰 원문 탈취를 줄이지만 XSS가 사용자의 브라우저에서 인증된 요청을 보내는 것까지 막지는 못한다. 출력 인코딩, CSP와 입력 경계를 함께 관리한다.

### 로그와 키

- `Authorization`, 쿠키와 refresh token 원문은 로그에 남기지 않고 필요한 식별자만 마스킹한다.
- 서명 키는 코드와 저장소에서 분리하고 충분한 엔트로피, 회전과 접근 통제를 적용한다.
- 검증 라이브러리에 알고리즘 허용 목록을 명시하고 issuer, audience와 token type별 검증 규칙을 고정한다.
- 검증 키는 신뢰한 issuer에 연결한 설정이나 JWKS에서 선택한다. 토큰의 `kid`는 조회용 비신뢰 입력이므로 SQL, 파일 경로에 직접 이어 붙이지 않는다. `jku`, `x5u`의 URL도 그대로 따라가지 말고 허용한 키 제공 위치만 사용해 키 바꿔치기와 [[SSRF]]를 막는다.

## 훔쳐도 피해를 제한하기

| 통제 | 효과 | 트레이드오프 |
|---|---|---|
| 짧은 access token 수명 | replay 가능한 시간을 제한 | 갱신 요청과 재인증 UX 증가 |
| 최소 scope와 audience 제한 | 유출 토큰이 접근할 리소스와 권한을 제한 | 토큰 종류와 정책 관리 증가 |
| [[Refresh-Token-Rotation|Refresh Token Rotation]] | 이미 사용한 refresh token의 재제출을 탐지하고 family 폐기 | 탈취만으로 탐지되는 것은 아님. 서버 상태, 동시 갱신과 오탐 처리 필요 |
| `jti` denylist 또는 token version | 로그아웃과 사고 시 만료 전 토큰 거부 | 매 요청 조회 또는 캐시 일관성 비용 |
| 중요 행위 재인증 | 송금, 비밀번호 변경 같은 고위험 작업을 토큰 하나로 끝내지 않음 | 사용자 마찰 증가 |
| sender-constrained token | mTLS나 DPoP로 토큰과 클라이언트 키를 묶어 단순 replay 완화 | 클라이언트 키 관리와 인프라 복잡도 증가 |

User-Agent, IP와 기기 정보를 토큰 발급 환경과 비교하는 방법은 이상 징후 탐지에는 쓸 수 있지만 주 통제가 될 수 없다. 값이 위조될 수 있고 정상 사용자의 네트워크와 브라우저도 변하기 때문이다.

## Stateless와 제어권의 교환

| 방식 | 요청 검증 | 즉시 폐기 | 적합한 상황 |
|---|---|---|---|
| Self-contained access token | 서명과 claim만 검증 | 별도 상태 없이는 어려움 | 짧은 수명, 분산 검증과 제한된 위험 |
| JWT + refresh 상태 관리 | access는 자체 검증, refresh는 서버 조회 | refresh family 폐기 가능 | 확장성과 세션 제어를 함께 요구 |
| JWT + access denylist | 서명 검증 뒤 저장소 조회 | 가능 | 강제 로그아웃과 사고 대응이 중요 |
| 서버 세션 | 세션 저장소 조회 | 세션 삭제로 가능 | 중앙 제어와 단순한 브라우저 인증이 중요 |

JWT를 쓰면 서버 상태가 사라진다고 일반화하지 않는다. 즉시 폐기, refresh 재사용 탐지와 기기별 세션 관리가 필요할수록 상태가 다시 들어온다. 확장성과 보안 제어는 서비스의 위험 수준에 맞춰 선택한다.

refresh family 폐기는 이후 갱신을 차단하지만 이미 발급한 self-contained access token을 자동으로 무효화하지 않는다. 권한 회수와 계정 비활성화를 얼마나 빨리 반영할지 정하고, 그 요구에 맞게 짧은 만료 또는 모든 검증 경로가 확인하는 서버 상태를 연결한다. 토큰 안의 역할과 tenant 소속도 발급 시점의 정보이므로 갱신할 때 오래된 claim을 그대로 복사해 권한 회수를 되돌리지 않는다. ([RFC 7009, 3](https://www.rfc-editor.org/rfc/rfc7009.html#section-3), [OWASP, Multi Tenant Security](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html#1-tenant-identification-context-management))

OAuth public client에 refresh token을 발급했다면 RFC 9700은 sender constraint 또는 rotation으로 재사용을 탐지하도록 요구한다. refresh token을 반드시 발급하라는 뜻은 아니며, 발급 여부와 수명은 위험 평가로 정한다. ([RFC 9700, 4.14.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14.2))

## 흔한 실수

- Base64URL 인코딩을 암호화로 오해하고 민감 정보를 Payload에 넣음
- 토큰 Header가 지정한 알고리즘을 그대로 받아들이고 허용 목록을 두지 않음
- 서명만 검증하고 서비스 프로필의 `iss`, `aud`, 만료와 token type 규칙을 확인하지 않음
- access token과 refresh token을 모두 장기 보존 가능한 브라우저 저장소에 둠
- 로그아웃 UI만 구현하고 서버의 폐기 또는 refresh family 정책을 정의하지 않음
- 모든 서비스에 긴 수명과 넓은 scope의 토큰 하나를 재사용

## 면접 체크포인트

- 서명된 JWT가 보장하는 무결성, 출처와 보장하지 않는 기밀성의 차이
- 통째로 탈취한 토큰이 서명 검증을 통과하는 Bearer replay 원리
- access token과 refresh token 탈취의 피해 범위 차이
- HttpOnly 쿠키, HTTPS, 짧은 수명과 Rotation이 서로 다른 위협을 줄이는 방법
- 즉시 폐기 요구가 stateless 장점을 일부 포기하게 만드는 이유
- 알고리즘, issuer, audience와 token type을 함께 검증해야 하는 이유

## 출처

2026-10-03 부분 검증: RFC 7519의 시간 claim과 선택성, RFC 8725의 알고리즘/키, issuer/audience와 토큰 유형 검증, RFC 7009/9700의 폐기와 refresh 보호, OWASP의 객체/tenant 인가 경계를 대조했다. 기존 출처 전체와 라이브러리, 실제 앱의 구현/배포 상태를 검증한 기록은 아니다.

- [IETF, RFC 7515: JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515)
- [RFC 7519 — JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 8725 — JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 9700 — Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)
- [RFC 7009 — OAuth 2.0 Token Revocation](https://www.rfc-editor.org/rfc/rfc7009.html)
- [Authorization Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Multi Tenant Security Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
- [HTML5 Security Cheat Sheet — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [JWT를 통째로 탈취 당하면 어떻게 될까요? — 코딩하는기술사](https://www.youtube.com/watch?v=2kbBj1w-k6M)
- [JWT 토큰 하나로 로그인된다? 직접 시연해봤습니다 — 코딩하는기술사](https://www.youtube.com/watch?v=vCQvPeVAAis)
- [JWT 탈취에 대비하기 — 코딩하는기술사](https://www.youtube.com/watch?v=-qeJbdP-bmU)
- [웹보안 — 딩코딩코 (개발자 취업 필수 개념 강의)](https://fern-freeze-290.notion.site/37aade118e3680908aeee8bb5a517c7d)

## 관련 문서

- [[Session|Session]]
- [[Auth-Method-Selection|인증 방식 선택]]
- [[OAuth2|OAuth 2.0]]
- [[Refresh-Token-Rotation|Refresh Token Rotation]]
- [[XSS|XSS]]
- [[CSRF|CSRF]]
