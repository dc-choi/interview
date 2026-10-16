---
tags: [aws, cognito, auth, managed-login, passkey, webauthn]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["Cognito Managed Login", "Cognito Hosted UI", "Cognito 패스키", "Cognito passkey", "Cognito choice-based sign-in"]
---

# Cognito managed login과 패스키 로그인

Managed login은 Cognito user pool domain이 제공하는 로그인, 가입, MFA, 비밀번호 재설정 화면과 OAuth 2.0, OIDC 인증 서버다. 인증 화면을 직접 만들지 않고 branding editor로 브랜드에 맞추며, 패스키(WebAuthn)와 이메일, SMS OTP 같은 비밀번호 없는 로그인을 화면 구현 없이 붙일 수 있다. user pool, 앱 클라이언트와 기능 요금제는 [[Cognito|Amazon Cognito]]에서 다룬다.

2026-10-14 Amazon Cognito 개발자 가이드 대조 기준이다.

## managed login과 classic Hosted UI

- user pool domain을 만들거나 수정할 때 branding version으로 managed login과 classic Hosted UI 중 하나를 고른다. 같은 domain의 모든 app client에 적용되며, 둘을 오가면 사용자 세션이 유지되지 않아 다시 로그인해야 한다.
- Lite 요금제는 classic Hosted UI만 쓸 수 있다. branding editor와 `lang` 현지화는 Essentials 이상의 managed login에서만 되고, classic Hosted UI에서는 패스키 로그인을 쓸 수 없다.
- 콘솔에서 새로 만든 user pool은 managed login이 기본이고, managed login 이전에 만든 user pool은 classic Hosted UI로 남아 있다.
- managed login은 custom auth challenge Lambda trigger를 지원하지 않는다. 속성 변경이나 MFA 선호 설정 같은 프로필 관리 화면도 없어 앱에서 구현한다.
- 로그인에 성공하면 Cognito 세션 쿠키로 1시간 동안 같은 방법의 재로그인이 된다. 이 사이 사용자 속성이나 인증 요소를 바꿔도 쿠키 재로그인은 막히지 않는다.

## branding editor와 스타일

- 스타일은 app client마다 하나씩 붙는 시각 설정 묶음(이미지, 표시 옵션, CSS 값)이다. branding editor에서 로고, 배경 이미지, 기본 색, 폼 정렬, header와 footer, 개별 UI 구성 요소(Foundation, Components)를 코드 없이 바꾸고 미리 본다.
- 표시 모드는 light, dark, 브라우저 설정을 따르는 adaptive 중에서 고른다. adaptive에서는 light와 dark용 이미지와 색을 따로 정한다.
- 화면 문구는 바꿀 수 없고 지원 언어로 현지화만 할 수 있다.
- app client의 스타일 할당은 바꿀 수 없어 기존 스타일을 지우고 새로 만든다. 스타일 사이에 설정을 복사하는 기능도 없으므로 `DescribeManagedLoginBranding`으로 읽어 `CreateManagedLoginBranding`이나 `UpdateManagedLoginBranding`으로 적용한다. 요청 크기는 2 MB 이하이며, update는 지정한 값만 바꾸므로 나눠 보낼 수 있다.
- 콘솔에서 만든 app client에는 기본 스타일이 자동으로 붙지만 API, SDK의 `CreateUserPoolClient`로 만들면 스타일이 없다. 이 app client는 `CreateManagedLoginBranding`으로 스타일을 만들기 전까지 managed login을 쓸 수 없으므로 IaC에 스타일 생성을 함께 넣는다.

## 현지화

- 사용자에게 배포하는 로그인 URL에 `lang` query parameter를 붙인다(예: `/oauth2/authorize?lang=ko&response_type=code&...`). 기본 언어는 영어이며 한국어(`ko`), 일본어(`ja`), 스페인어(`es`) 등 12개 언어를 지원한다.
- 첫 요청 뒤 선택 언어는 `lang` 쿠키로 유지되고, 다른 `lang` 값을 받거나 쿠키가 지워질 때까지 이어진다.
- custom email, SMS sender trigger는 managed login에서 고른 언어를 받지 못하므로 `locale` 속성 등 다른 방법으로 언어를 정한다.

## 선택형 로그인과 패스키

- 패스키(`WEB_AUTHN`), 이메일 OTP(`EMAIL_OTP`), SMS OTP(`SMS_OTP`)는 선택형 인증(choice-based, `USER_AUTH` flow)에서만 쓰며 Essentials 이상이 필요하다. 비밀번호(`PASSWORD`, SRP 포함)는 모든 요금제에서 쓸 수 있다.
- 설정은 두 곳이다. user pool의 `SignInPolicy.AllowedFirstAuthFactors`에 허용할 첫 인증 수단을 넣고(`WEB_AUTHN`은 다른 수단 하나 이상과 함께), app client의 인증 흐름에 `ALLOW_USER_AUTH`를 켠다. 선택지가 보이지 않으면 이 둘과 요금제를 먼저 확인한다.
- SDK로 구현할 때 `InitiateAuth`에 `USER_AUTH`와 사용자 이름만 보내면 가능한 수단 목록(`SELECT_CHALLENGE`)이 온다. `PREFERRED_CHALLENGE`를 함께 보내면 사용자, user pool, app client가 모두 그 수단을 허용할 때 바로 그 수단으로 진행하고, 아니면 `SELECT_CHALLENGE`와 선택지 목록이 온다. custom auth는 선택형이 아니라 client-based 흐름(`CUSTOM_AUTH`)에서만 된다.

### 패스키 등록과 relying party ID

- managed login은 새로 가입한 사용자에게 패스키 등록을 권한다. 이미 가입한 사용자와 관리자가 만든 계정에는 권하지 않으므로, 이들은 비밀번호나 OTP로 먼저 로그인한 뒤 `/passkeys/add?client_id=...&redirect_uri=...` 페이지에서 등록한다. 이 페이지는 로그인한 사용자만 열 수 있다.
- SDK에서는 로그인한 사용자의 access token으로 `StartWebAuthnRegistration`을 호출해 받은 생성 옵션을 인증기에 넘기고, 인증기의 응답을 `CompleteWebAuthnRegistration`으로 보낸다. 사용자당 패스키는 20개까지다.
- relying party ID를 지정하지 않으면 managed login의 custom domain, 없으면 prefix domain이 된다. public suffix list에 없는 다른 도메인도 지정할 수 있다. 모바일 앱은 RP ID 도메인의 `.well-known` 연결 파일이 있어야 패스키가 동작한다. RP ID를 바꾸면 사용자가 다시 등록해야 하므로 공개 전에 정한다.
- ES256, RS256 알고리즘의 패스키를 받으며 attestation 강제는 지원하지 않는다. 따라서 인증기 모델을 제한하는 정책은 Cognito 설정만으로 구현할 수 없다(문서 동작에서 도출).
- user verification은 기본이 preferred라 PIN이나 생체 확인이 없는 인증기도 등록과 로그인이 된다. 확인을 강제하려면 required로 바꾼다.

### MFA와의 관계

- OTP 로그인은 필수 MFA와 함께 쓸 수 없다. MFA가 선택인 user pool에서도 MFA를 켠 사용자는 OTP를 첫 인증 수단으로 쓸 수 없다.
- user verification을 거친 패스키는 `WebAuthnConfiguration.FactorConfiguration`을 `MULTI_FACTOR_WITH_USER_VERIFICATION`으로 두면 MFA 요건을 충족한다.
- 패스키를 비밀번호 로그인의 2차 인증으로 쓸 수는 없다.

WebAuthn의 등록과 서명 검증 구조는 [[FIDO-WebAuthn|FIDO2와 WebAuthn]]을 따른다.

## 체크포인트

- user pool 요금제가 Essentials 이상이고 domain branding version이 managed login인가
- IaC로 만든 app client에 managed login 스타일을 함께 만들었는가
- `AllowedFirstAuthFactors`와 app client의 `ALLOW_USER_AUTH`를 함께 켰는가
- 기존 사용자와 관리자가 만든 계정의 패스키 등록 경로가 있는가
- relying party ID를 공개 전에 확정했는가
- 필수 MFA 정책과 OTP 로그인이 충돌하지 않는가

## 출처

- [Amazon Cognito, User pool managed login](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html)
- [Amazon Cognito, Apply branding to managed login pages](https://docs.aws.amazon.com/cognito/latest/developerguide/managed-login-branding.html)
- [Amazon Cognito, The branding editor and customizing managed login](https://docs.aws.amazon.com/cognito/latest/developerguide/managed-login-brandingeditor.html)
- [Amazon Cognito, Manage authentication methods in AWS SDKs](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flows-selection-sdk.html)
- [Amazon Cognito, Authentication flows](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html)
- [Amazon Cognito, User pool feature plans](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sign-in-feature-plans.html)
- [Amazon Cognito Managed Login — Amazon Web Services](https://www.youtube.com/watch?v=POj3duPTN68)

## 관련 문서

- [[Cognito|Amazon Cognito]] — user pool, 앱 클라이언트, 기능 요금제
- [[FIDO-WebAuthn|FIDO2와 WebAuthn]]
- [[OAuth2]]
