---
tags: [nestjs, authentication, mfa, oidc]
status: done
verified_at: 2026-10-01
category: "OS & Runtime - NestJS"
aliases: ["NestJS 계정 복구와 MFA"]
---

# NestJS 계정 복구와 MFA

로그인 이후 계정의 소유권을 다시 확인하는 기능은 token 검증, 현재 계정 상태와 브라우저의 로그인 의도를 함께 묶어야 한다. 이메일, 비밀번호, MFA secret이 바뀌면 이전 증명을 계속 인정할지 정한다.

## 이메일 검증과 비밀번호 재설정

EmailVerification handler는 검증 요청의 주소가 현재 계정 주소와 같은지 확인하고 조건부 update로 verified 상태를 바꾼다. 256비트 token의 해시를 저장하며 기본 수명은 24시간, 한 번만 쓴다. 이전 주소로 받은 link가 새 주소를 검증하면 안 된다. 재전송은 로그인한 자신의 계정으로 제한한다.

메일 링크는 브라우저 확인 화면으로 보내고 그 화면에서 POST로 소비한다. GET에서 완료하면 보안 스캐너/미리보기의 자동 방문이 token을 먼저 쓸 수 있다. 해당 handler와 기능 옵션은 함께 등록해야 하며 불완전한 설정은 시작 오류다.

password reset handler의 `findUser()`는 사용자가 입력한 문자열 대신 **DB에 저장된 주소와 password hash fingerprint**를 반환한다. 대소문자/발음기호를 무시하는 DB collation에서 비슷한 주소로 타인의 계정을 찾는 경우를 막아야 한다.

재설정 token은 현재 주소와 hash가 그대로일 때만 유효하고 기본 1시간, 단일 사용이다. 사용자 조회와 메일 발송은 비동기로 진행하며 요청은 그 조회가 끝나기 전에 동일한 응답으로 돌아간다. 후속 발송 실패는 기록한다. unknown 사용자와 존재하는 사용자에 다른 응답/대기 시간을 만들지 않는다.

새 비밀번호가 정책에 맞지 않으면 null 결과로 처리하고 token을 소모하지 않는다. 성공하면 다른 reset link, 서버 세션과 refresh token을 폐기하고 이메일을 검증 상태로 만든다. API key와 이미 발급한 access JWT의 폐기는 별도다. `signIn: true`도 SignInService를 통해 MFA가 필요한 사용자를 pending 상태로 보낸다.

## MFA 등록과 step-up

TOTP secret은 AES-256-GCM으로 암호화하고 사용자와 인증 데이터로 묶는다. key 배열은 새 key를 앞에 두고 이전 key도 복호화에 사용하며 필요할 때 다시 암호화한다. random 문자열 key는 32자 이상이어야 한다. encryption=false와 plaintext migration은 명시적으로 선택하는 예외다.

등록은 미확인 secret을 먼저 준비한다. 이미 확인된 secret이 있으면 기본 409로 거부한다. `replace: true`에서는 새 secret이 확인될 때까지 기존 secret을 유지한다. 해제/교체 route에는 MFA step-up을 요구해 비밀번호 하나를 빼앗긴 공격자가 2차 인증을 없애지 못하게 한다.

새 secret은 160비트이며 128비트 미만 secret은 검증하지 않는다. TOTP는 30초 step의 ±1 범위를 허용하되 같은 code/step을 다시 인정하지 않는다. 확인 성공 시 cookie 세션을 rotate해 MFA 완료 상태로 바꾼다. bearer만 사용하는 확인은 secret을 확정할 뿐 cookie 세션을 만들지 않는다.

확인된 MFA 사용자의 1차 로그인은 기본 10분 pending 세션이다. 일반 route에서는 401 `mfa_required`가 된다. 공개 완료 route의 `completeMfa()`는 pending cookie를 확인하고 새 세션 ID와 정상 TTL로 전환한다.

실패 시도는 code 검증 **전에** 기록한다. 기본 15분에 5회 실패하면 올바른 code도 잠금 시간 동안 거부한다. token 발급에 2차 code를 아직 안 보낸 상태는 실패 횟수를 올리는 시도가 아니다. recovery code는 기본 10개이며 사용자별 salt와 느린 hash로 저장하고 단일 소비한다.

JWT `amr`의 mfa/otp/hwk는 2차 인증 증명이다. 발급자가 caller claim에서 임의로 넣은 증명을 제거하고 실제 검증 후 채운다. refresh는 검증된 amr를 이어받고 API key는 2차 인증으로 인정하지 않는다.

## OIDC 계정 연결

계정 식별자는 이메일이 아니라 `(provider, sub)`다. code flow는 PKCE, state와 nonce를 사용한다. 서버 state와 10분 browser secret cookie를 연결해 callback을 시작한 브라우저에 묶는다. id token의 서명, issuer, audience, exp와 nonce를 검증하고 discovery/token/JWKS endpoint는 HTTPS를 요구한다.

기존 계정에 provider를 연결하는 흐름은 시작과 callback 모두 같은 유효한 로그인 세션을 확인한다. cross-site와 link 충돌을 거부한다. 이메일 자동 연결은 issuer가 검증한 이메일이고 **기존 로컬 계정의 이메일도 검증됐을 때만** 허용한다. 미검증 로컬 계정에 자동 연결하면 공격자의 선등록 계정을 피해자가 인수하는 pre-hijacking 문제가 생긴다. 그 경우 비밀번호 로그인 후 명시적 link/reset으로 처리한다.

Google/GitHub preset과 Microsoft tenant 설정을 구분한다. Microsoft tenant는 GUID이며 domain/common/organizations/consumers를 tenant ID처럼 넣지 않는다. callback 이후 로그인도 MFA pending 계약을 유지한다. redirect는 상대 경로로 제한한다.

| 실패 | 대표 HTTP 계약 |
|---|---|
| state/callback 위조 | 400 |
| 검증 실패, linking 세션 없음 | 401 |
| resolver/cross-site 거부 | 403 |
| 알 수 없는 provider | 404 |
| discovery/JWKS/network upstream 실패 | 502 |

upstream 장애를 잘못된 credential 401로 바꾸지 않는다.

## Magic link

기본 token은 256비트 난수, 수명 15분, 한 번 사용이며 **요청한 브라우저 secret cookie와 함께** 검증한다. 발급 route도 CSRF 검증을 통과해야 한다. 메일 link로 화면을 연 뒤 같은 site POST로 소비한다.

브라우저 cookie가 없으면 token 조회보다 먼저 401 `not_this_browser`로 거부해 token 존재 여부를 노출하지 않고 원래 브라우저의 link를 소모하지 않는다. `bind: false`는 다른 기기로 link를 옮길 수 있지만 로그인 CSRF 보호를 약화한다.

이메일을 trim/NFC/lowercase로 정규화하더라도 저장된 주소와 정확히 일치하는지 확인한다. DB collation으로 가까운 다른 주소가 일치하면 null로 거부한다. 비밀번호가 있고 로컬 이메일이 미검증인 기존 계정에는 자동 로그인시키지 않는다. unknown/expired/used는 외부에 같은 결과를 주고 원인은 내부 event로만 구분한다. redirect는 상대 경로로 제한한다.

## 실패와 수명주기 판단

메일 주소 변경, 비밀번호 변경, MFA 제거와 계정 연결은 현재 인증 강도를 확인한 뒤 수행한다. 인증 UI의 단계 완료와 서버의 증명 상태를 분리한다. 저장소의 conditional consume/claim/rotation 없이 여러 API 인스턴스에서 단일 사용을 보장할 수 없다.

## 출처

- [NestJS Documentation, Authentication](https://docs.nestjs.com/security/authentication)

## 관련 문서

- [[NestJS-Authentication]]
- [[NestJS-Authentication-Storage]]
- [[OAuth2]]
- [[FIDO-WebAuthn]]
