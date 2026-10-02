---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 인증 흐름과 세션 경계"]
---

# Expo 인증 흐름과 세션 경계

## 화면 보호와 서버 인증

public login/signup 화면과 authenticated home/profile 화면을 분리한다. Expo Router v5 이후 protected routes는 client navigation을 guard하며 이전 방식의 redirects도 지원된다. React Navigation은 auth state에 따라 static/dynamic screen 구성을 전환한다.

화면 guard는 API authorization을 대신하지 않는다. 시작 시 저장된 session을 복원하는 동안 loading을 처리하고, 서버 요청은 token/cookie를 검증한 뒤 사용자별 권한을 확인한다. 로그인 UI의 hardcoded boolean은 navigation prototype에만 사용한다.

## 로그인 방식

| 방식 | 장점 | 구현할 추가 흐름 |
| --- | --- | --- |
| Email/password | 익숙하고 서비스 선택 폭이 넓음 | password policy, recovery/reset, secure storage와 backend |
| Magic link | 비밀번호 기억 필요 없음 | email link가 앱/올바른 screen을 여는 deep link |
| Email/SMS OTP | link 없이 앱에서 code 입력 | 만료, 재요청, 제한, autofill과 manual 입력 |
| OAuth/OIDC | provider 계정을 통한 로그인 | provider config, redirect, code exchange와 session |
| Biometrics | 기존 session/credential의 local gate | server login과 local 확인을 구분 |
| Passkeys | passwordless public-key 인증 | 등록된 credential, server challenge와 platform 설정 |

Magic link는 앱 밖에서 이메일을 확인한 뒤 돌아오는 경로가 끊기면 session을 확인할 수 없다. Router의 자동 deep link와 별개로 앱 scheme/universal link, provider URL 설정을 확인한다. OTP는 한정된 시간 안에 입력하고 OS autofill을 편의 기능으로 제공한다.

## AuthSession과 API Routes

AuthSession은 client에서 browser/native modal을 열고 authorization response와 redirect를 처리한다. Expo Router API Routes는 실제 server runtime에서 code exchange, secret 보관, JWT 발급/검증을 담당할 수 있다. 같은 프로젝트에 코드가 있다고 server secret을 앱 bundle에 포함하면 안 된다.

일반적인 분업은 다음과 같다.

1. client가 AuthSession으로 provider authorization을 시작한다.
2. provider 로그인과 consent 이후 code/response를 지정 redirect에서 받는다.
3. server endpoint가 provider 계약과 PKCE/redirect 조건에 맞게 code를 token으로 교환한다.
4. 필요한 provider ID token을 검증하고 앱 자체 session을 발급한다.
5. native는 SecureStore에 작은 credential, web은 적절히 설정한 secure cookie를 저장한다.
6. 재시작 시 session을 복원하고 server는 요청마다 signature, expiry와 authorization을 검증한다.

access token, ID token, 앱 session JWT는 목적과 audience가 다르다. OAuth는 authorization 프로토콜이므로 provider 사용자 로그인에는 OIDC/ID 검증 또는 provider가 정한 identity 계약을 확인한다. stateless JWT를 쓴다고 logout/revocation 정책이 자동 해결되지는 않는다.

Google native sign-in과 iOS `expo-apple-authentication`은 provider native UI를 쓰는 별도 통합 경로다. custom server가 필요 없으면 지원 auth provider SDK를 사용해 복잡도를 줄일 수 있다.

## 인증 서비스 선택

Better Auth는 open-source 구성과 Expo/API Routes integration을 제공한다. Clerk는 email/password, OTP, magic links, OAuth와 passkeys/native module을 제공한다. Supabase는 backend와 auth를 함께 관리한다. Cognito는 user pool/identity와 AWS integration, Firebase Auth는 email/OAuth 등과 React Native Firebase development build 통합이 선택지다.

가이드의 free tier 표현을 용량/비용 보장으로 해석하지 않는다. 기능 지원, 계정 복구, lock-in, 운영 책임과 성장 시 비용은 현재 서비스 공식 자료에서 확인한다.

## Biometrics와 passkeys

Face ID/Touch ID prompt는 local gate이며 그 자체로 서버 session을 생성하지 않는다. provider가 device-bound key로 일회성 challenge를 서명하는 별도 flow를 제공하면 server 인증까지 이어질 수 있다. 이 credential은 app installation에 묶일 수 있으며 WebAuthn passkey와 같지 않다.

Passkey를 등록하려면 provider 정책에 맞는 신뢰된 사용자 확인/session과 추가 platform 설정이 필요하다. React Native passkey library 또는 provider integration을 선택하고 recovery, 새 기기와 계정 연결 흐름을 함께 설계한다.

## 심사와 안전성

Email/password, magic link나 OTP만으로 출발할 수 있으나 특정 로그인 방식이 스토어 승인을 보장하지 않는다. social login 추가 시 Apple의 login-service 정책과 예외를 확인한다. Expo 입문 페이지의 Google Play에 반대 방향의 동일 요구가 있다는 서술은 독립적인 정책 근거가 확인되지 않아 일반 규칙으로 사용하지 않는다.

직접 구현하는 password flow는 현재 OWASP와 provider security 권고를 대조한다. 이 문서는 Expo가 제시하는 구현 선택지와 책임 경계를 정리한 것이며 보안 감사나 스토어 정책 적합성 검증 기록이 아니다.

## 출처

- [Expo Documentation, Authentication in Expo and React Native apps](https://docs.expo.dev/develop/authentication)

## 관련 문서

- [[Expo-Home-Storage]]
- [[Expo-Home-Tools-Navigation]]
