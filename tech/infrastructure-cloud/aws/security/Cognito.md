---
tags: [infrastructure, aws, cognito, auth, identity, oauth2, oidc, saa-c03]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["Cognito", "Amazon Cognito", "AWS Cognito", "User Pool", "Identity Pool"]
---

# Amazon Cognito — 웹, 모바일 앱 사용자 인증, 인가

웹/모바일 앱의 **사용자 인증(Authentication)**, **사용자 관리**, **AWS 임시 자격 증명 교환**을 제공하는 완전 관리형 서비스. 직접 인증 서버를 구축하지 않고도 회원 가입, 로그인, 소셜 로그인과 자격 증명 발급 흐름을 처리할 수 있다.

## 두 가지 핵심 컴포넌트

Cognito는 **User Pool(인증)** 과 **Identity Pool(자격 증명 브로커)** 두 개의 독립 컴포넌트로 구성된다. 함께 쓰기도 하고 따로 쓰기도 한다.

| 항목 | User Pool | Identity Pool |
|---|---|---|
| 목적 | **인증** (자격 증명 확인, 사용자 디렉터리) | 외부 토큰을 **AWS 임시 자격 증명**으로 교환 |
| 결과물 | **JWT 토큰** (ID/Access/Refresh) | **AWS 임시 자격 증명** (STS, AccessKey/SecretKey/SessionToken) |
| 사용 시점 | 회원가입, 로그인, MFA, 앱 사용자 디렉터리 | S3, DynamoDB 등 AWS 리소스를 클라이언트에서 직접 호출 |

## User Pool (사용자 풀)

Cognito가 관리하는 **앱 사용자 디렉터리**. 회원 정보 저장 + 인증 처리.

### 기능

- **회원 가입 / 로그인**: 이메일, 휴대폰, 사용자명 + 비밀번호. 비밀번호 정책, 검증 규칙 설정 가능.
- **소셜 로그인**: Google, Facebook, Amazon, Apple 연동 (Federated Identity).
- **기업 SSO**: SAML 2.0, OpenID Connect (OIDC) 자격 증명 공급자(IdP) 연동.
- **MFA**: SMS, TOTP 기반 다단계 인증. 이메일 OTP MFA는 Essentials 이상에서 쓸 수 있다.
- **Managed login**: AWS가 제공하는 로그인, 로그아웃, 비밀번호 관리 페이지. classic Hosted UI는 1세대 옵션이며 Lite 요금제에서는 classic Hosted UI만 쓸 수 있다. 브랜딩, 현지화와 패스키 로그인은 [[Cognito-Managed-Login|Cognito managed login과 패스키]]에서 다룬다.
- **Lambda Trigger**: 가입 전/후, 인증 전/후, 토큰 생성 시 등 라이프사이클 훅에서 Lambda 실행 (커스텀 검증, 사용자 마이그레이션, 환영 메일 등).
- **사용자 인증 후 JWT(JSON Web Token) 발행** → API Gateway/ALB 인증, 또는 Identity Pool과 교환해 AWS 자격 증명 획득.

### JWT 3종

- **ID Token**: 사용자 프로필 클레임(이메일, 이름 등) 포함. 클라이언트 식별용 (OIDC 표준).
- **Access Token**: 보호된 리소스(API)에 접근할 때 사용. 스코프, 그룹 클레임 포함 (OAuth 2.0).
- **Refresh Token**: 만료된 Access/ID 토큰 재발급용.

### JWT 검증

JWT payload를 decode하는 것만으로 신뢰하면 안 된다. user pool의 JWKS에서 `kid`에 맞는 공개 키를 찾아 서명을 검증하고 `iss`, `exp`, `token_use`, ID token의 `aud` 또는 access token의 `client_id`를 확인한다. API에서는 필요한 OAuth scope도 검사한다. signing key 회전에 대비해 JWK를 `kid` 기준으로 cache하고 모르는 `kid`가 오면 JWKS를 갱신한다.

### 운영 설정 — 가입 공개, 메일 발송, 앱 클라이언트

- **셀프 가입**: 켜면 로그인 화면에 가입 링크가 생긴다. `SignUp`은 IAM 정책을 평가하지 않고 app client ID(secret이 있으면 `SECRET_HASH`)만으로 호출하는 API라 화면에서 링크를 숨겨도 막히지 않는다. 공개 전에는 셀프 가입을 꺼 두고 관리자만 사용자를 만들며, 연 뒤에는 Pre Sign-up 트리거, 연락처 확인과 WAF로 남용을 줄인다.
- **속성 확인**: 이메일이나 전화 확인을 켜면 가입 때 24시간 유효한 코드를 보내고 확인 전에는 로그인할 수 없다. 비밀번호 찾기는 확인된 연락처가 있어야 동작한다. 로그인에 쓰는 이메일을 바꿀 때는 `AttributesRequireVerificationBeforeUpdate`(콘솔의 Keep original attribute value active when an update is pending)로 새 값을 확인하기 전까지 원래 값을 유지한다.
- **메일 발송 경로**: 기본 구성(`COGNITO_DEFAULT`)은 user pool당 하루 발송 수가 제한되고 AWS는 이 한도가 일반 프로덕션 발송량보다 낮다고 명시한다. 운영에서는 SES 구성으로 바꾼다. SES 구성은 검증된 이메일이나 도메인이 필요하고, 계정이 그 리전의 SES sandbox에 있으면 사용자에게 메일을 보내지 못하므로 production access를 먼저 받는다.
- **앱 클라이언트 유형**: public client는 브라우저나 모바일에서 실행되어 신뢰할 서버 측 자원이 없으므로 client secret을 두지 않는다. confidential client는 secret을 안전하게 둘 수 있는 서버 측 앱이다. secret 유무는 생성 뒤 바꿀 수 없어 새 앱 클라이언트를 만들어야 한다. 앱 코드에 넣은 secret은 추출될 수 있어 보호가 되지 않으므로 public client는 secret 없이 authorization code와 PKCE를 쓰고, secret이 꼭 필요하면 서버나 프록시가 `SECRET_HASH`를 붙이게 한다.
- **인증 흐름**: 직접 만든 로그인에서 사용자 이름과 비밀번호 인증은 SRP 흐름(`ALLOW_USER_SRP_AUTH`)을 쓰라고 AWS가 권고한다. custom auth는 Define auth challenge, Create auth challenge, Verify auth challenge response 세 Lambda 트리거로 challenge를 구성한다. 쓰지 않는 흐름은 켜지 않는다.
- **도메인과 callback**: Cognito prefix 도메인에는 `aws`, `amazon`, `cognito`를 넣을 수 없다. callback URL은 앱 클라이언트에 미리 등록한 절대 URI와 일치해야 하고 테스트용 `http://localhost` 외에는 HTTPS가 필요하다. `response_type=token`으로 URL에 토큰을 받는 흐름은 implicit grant라 refresh token이 없고 PKCE와 호환되지 않으므로 신규 구성은 `code`와 PKCE를 쓴다.

### 기능 요금제(feature plan)

2026-10-14 Cognito 개발자 가이드와 요금 페이지 대조 기준이다. 요금은 us-east-1 예시이며 리전과 시점에 따라 다르다.

| 요금제 | 주요 기능 | 직접, 소셜 로그인 MAU 요금 |
|---|---|---|
| Lite | 가입과 로그인, 소셜, SAML, OIDC 연동, M2M, Lambda trigger, SMS와 TOTP MFA, classic Hosted UI | 무료 10,000 MAU 뒤 구간별 단가 |
| Essentials | Lite 전부, managed login과 branding editor, 패스키와 이메일, SMS OTP 로그인, 이메일 MFA, access token 사용자 정의 | 무료 10,000 MAU 뒤 MAU당 $0.015 |
| Plus | Essentials 전부, threat protection(유출 비밀번호 탐지, 적응형 인증, 사용자 활동 로그와 내보내기) | 무료 구간 없이 MAU당 $0.02 |

- 요금제는 user pool 단위로 고르며 app client별로 다르게 줄 수 없다. 새 user pool의 기본값은 Essentials이고 API에서 `UserPoolTier`를 생략해도 같다. 단 `UserPoolAddOns.AdvancedSecurityMode`를 `AUDIT`나 `ENFORCED`로 주면 tier는 `PLUS`여야 하며 생략하면 `PLUS`가 된다. 요금제는 언제든 바꿀 수 있지만, 일부 전환은 사용 중인 기능을 먼저 꺼야 한다.
- SAML이나 OIDC로 연합 로그인한 MAU는 따로 세어 무료 50 MAU 뒤 MAU당 $0.015다. 무료 10,000 MAU는 Lite와 Essentials에만 있고 12개월 AWS 무료 기간이 끝나도 자동으로 사라지지 않는다. 무료 MAU는 user pool이 아니라 계정 또는 AWS Organization 단위로 세며 GovCloud(US) 리전에는 무료 구간이 없다. 2024-11-22 10:00(태평양 시간) 이전에 만든 user pool은 무료 50,000 MAU를 유지하고, 그런 기존 계정에서 새로 만든 Lite user pool의 MAU도 이 무료 구간에 포함할 수 있다.
- 예: 직접 로그인 950,000 MAU면 Essentials는 (950,000 - 10,000) × $0.015 = $14,100, Plus는 950,000 × $0.02 = $19,000이다.
- 이전 advanced security features(ASF) 요금 구조의 기능은 Essentials나 Plus로 옮겨졌다. AWS 요금 페이지는 ASF를 쓰는 user pool이 Plus로 바꾸면 월 비용을 최대 60% 줄일 수 있다고 제시한다. 같은 페이지의 예시처럼 Lite와 ASF 단가를 더해 us-east-1 기준으로 계산하면 절감률은 약 10만 MAU에서 58%, 95만 MAU에서 26%로 줄고, 약 493만 MAU부터는 Plus가 더 비싸다(2026-09-25 게시 Price List로 계산). 전환 전에 실제 MAU로 계산한다.
- Plus의 threat protection은 audit-only로 시작해 위험 평가와 로그만 남기고, full-function에서 위험 수준별로 로그인 허용, MFA 요구, 로그인 차단, 사용자 알림을 자동 적용한다. full-function 전환 전 2주 이상 audit 운영이 권장되며, 적응형 인증의 MFA 대응을 쓰려면 user pool MFA를 Optional로 둔다.
- 유출 비밀번호 탐지는 Cognito가 평문 비밀번호를 받는 작업에서만 동작한다. 로그인은 `USER_PASSWORD_AUTH`, `ADMIN_USER_PASSWORD_AUTH`, `USER_AUTH`의 `PASSWORD` 선택지와 managed login 로그인을 검사하고, `SignUp`과 managed login 가입, `ConfirmForgotPassword`, `NEW_PASSWORD_REQUIRED` 응답의 비밀번호도 검사한다. SRP 로그인과 custom auth는 검사하지 않고, 관리자가 `AdminSetUserPassword`로 정한 비밀번호도 검사하지 않는다. 적응형 인증은 SRP와 custom auth에도 적용된다. 연합 로그인과 client credentials(M2M) 요청에는 threat protection이 적용되지 않는다.
- AWS WAF web ACL 연결은 모든 요금제에서 가능하며 WAF 요금이 따로 든다. threat protection은 요청별 위험만 평가하고 요청량은 보지 않으므로 대량 요청과 DDoS 방어는 WAF가 맡는다([[WAF-Anti-DDoS|WAF Anti-DDoS 관리형 규칙]]). ATP rule group을 쓰는 web ACL은 user pool에 연결할 수 없다.

## Identity Pool (자격 증명 풀, Federated Identities)

**인증된(또는 게스트) 사용자에게 AWS 리소스 접근용 임시 자격 증명**을 발급. 클라이언트(브라우저, 모바일 앱)에서 S3, DynamoDB를 직접 호출할 때 사용.

### 동작

1. 클라이언트가 IdP(Cognito User Pool, Google, Facebook, SAML 등)에서 인증 → ID 토큰 획득.
2. ID 토큰을 Identity Pool에 제출 → Cognito가 STS(AWS Security Token Service)에서 **임시 AWS 자격 증명** 발급.
3. 클라이언트는 그 자격 증명으로 S3, DynamoDB 등을 호출하며 실제 허용 범위는 매핑된 IAM role과 policy가 결정.

### 특징

- **인증/비인증 IAM Role 분리**: Identity Pool마다 두 가지 IAM Role을 매핑.
  - **Authenticated Role**: 로그인한 사용자가 사용.
  - **Unauthenticated (Guest) Role**: 익명 사용자도 제한된 권한으로 접근 허용 (예: 공개 콘텐츠 읽기).
- **Role 기반 세분화**: 사용자 그룹, 속성에 따라 다른 IAM Role을 동적으로 매핑 가능.
- **임시 자격 증명**: STS로 발급되므로 만료 시간이 짧고, 클라이언트에 장기 키를 노출하지 않음.

## Federated Identity (외부 IdP 연동)

- **소셜**: Google, Facebook, Apple, Amazon → 사용자 입장에서 가입 절차 간소화.
- **기업 IdP (SAML 2.0)**: Okta, Active Directory Federation Services(ADFS), Azure AD 등.
- **OIDC IdP**: Auth0, 자체 OIDC 서버.
- User Pool에 **외부 IdP를 등록**하거나 Identity Pool에 **직접 등록**하는 두 패턴 모두 가능.

## OAuth 2.0 / OIDC 지원

- Cognito User Pool은 **OIDC Provider 역할**을 하며 표준 OAuth 2.0 Grant 지원:
  - **Authorization Code Grant**. browser와 mobile public client는 PKCE를 함께 사용.
  - **Implicit Grant**는 token이 browser redirect에 직접 노출되므로 신규 구성에서는 지양.
  - **Client Credentials** (서버 간 머신 인증).
- **OIDC Discovery 엔드포인트** 제공 → 외부 클라이언트가 표준 방식으로 통합 가능.
- callback URI와 OAuth flow, scope는 app client에 미리 등록하고 실제 애플리케이션 주소와 일치시킨다.

## AWS 서비스 통합 패턴

### API Gateway Authorizer

- **REST API**는 `COGNITO_USER_POOLS` 타입의 **Cognito User Pool Authorizer**로 클라이언트 JWT를 검증한다.
- **HTTP API**에는 Cognito User Pool Authorizer 타입이 없다. User Pool을 issuer로 지정한 **JWT Authorizer**로 Cognito 토큰을 검증하며 외부 OIDC 토큰도 같은 방식으로 처리한다. HTTP API의 인가 수단은 JWT Authorizer, Lambda Authorizer, IAM이다.
- 두 방식 모두 별도 Lambda 검증 코드 없이 인증된 요청만 백엔드로 전달할 수 있다.

### ALB 인증

- Application Load Balancer 리스너 규칙에서 **Cognito User Pool 또는 OIDC IdP로 인증**.
- 인증 안 된 요청은 로그인 페이지로 리다이렉트할 수 있다. 인증 진입점은 ALB로 옮길 수 있지만 백엔드의 업무 인가, 세션 정책과 보안 검증 책임은 남는다.

### Lambda Trigger 사용 예

- **Pre Sign-up**: 가입 도메인 화이트리스트 검증.
- **Post Confirmation**: 가입 완료 시 DB에 사용자 레코드 생성.
- **Pre Token Generation**: JWT에 커스텀 클레임(권한, 테넌트 ID) 주입.
- **User Migration**: 기존 시스템 사용자를 첫 로그인 시점에 자동 마이그레이션.

## 사용자 데이터 동기화

- Cognito Sync는 앱 설정이나 게임 상태 같은 사용자 데이터를 기기 간 동기화하는 기존 기능이다.
- 2026-07-30부터 신규 고객에게 제공되지 않으며 기존 고객만 계속 사용할 수 있다. 신규 설계는 AWS AppSync와 DynamoDB를 검토한다.

## 시험 체크포인트

- **앱 사용자 인증, 디렉터리** = **User Pool** (인증, JWT 발행).
- **AWS 리소스 임시 자격 증명** = **Identity Pool** (STS 발급). 실제 인가는 IAM role과 policy가 결정.
- **API Gateway에 사용자 인증 붙이기** → REST API는 **Cognito User Pool Authorizer**, HTTP API는 Cognito User Pool을 issuer로 둔 **JWT Authorizer**로 JWT 검증 자동화.
- **모바일 앱에서 S3에 직접 업로드** → 클라이언트가 **Identity Pool**로 임시 자격 증명 받고 S3 호출.
- **익명/게스트 사용자에게도 제한된 AWS 접근 부여** → **Identity Pool의 Unauthenticated Role**.
- **Google/Facebook/SAML 로그인** → **Federated Identity** (User Pool 또는 Identity Pool에 외부 IdP 등록).
- **회원 가입, 로그인 UI를 직접 만들고 싶지 않다** → **Managed login**. Lite plan이나 기존 구성은 classic Hosted UI일 수 있음.
- **회원 가입, 인증 흐름에 커스텀 로직 삽입** → **Lambda Trigger** (Pre Sign-up, Post Confirmation, Pre Token Generation 등).
- **유출 비밀번호 차단, 위험 기반 추가 인증** → **Plus 요금제의 threat protection**. 요청량 기반 공격은 **WAF**로 막는다.
- **운영 환경의 가입, 인증 메일 발송량** → 기본 이메일 구성의 일일 한도 대신 **SES 구성**(sandbox 해제 필요).
- **브라우저, 모바일 앱의 앱 클라이언트** → client secret 없는 public client + authorization code와 PKCE.
- **IAM User**는 AWS 콘솔, CLI 사용자(직원)용이고, **Cognito는 앱 사용자(End User)용** — 둘은 다른 영역.

## 출처

- AWS SAA C03 학습 자료 (로컬)
- [Amazon Cognito — User pool managed login](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html)
- [Amazon Cognito — Identity pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html)
- [Amazon Cognito — Integrating user pools and identity pools](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-integrating-user-pools-with-identity-pools.html)
- [Amazon Cognito — Verifying JWTs](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
- [Amazon Cognito — Cognito Sync availability](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sync.html)
- [Amazon API Gateway, HTTP API access control](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-access-control.html)
- [Amazon Cognito — Email settings for user pools](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html)
- [Amazon Cognito — Application-specific settings with app clients](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html)
- [Amazon Cognito — Signing up and confirming user accounts](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html)
- [Amazon Cognito API Reference — SignUp](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SignUp.html)
- [Amazon Cognito — Custom authentication challenge Lambda triggers](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-challenge.html)
- [Amazon Cognito — Configuring a user pool domain](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-assign-domain.html)
- [Amazon Cognito — User pool feature plans](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sign-in-feature-plans.html)
- [Amazon Cognito — Plus plan features](https://docs.aws.amazon.com/cognito/latest/developerguide/feature-plans-features-plus.html)
- [Amazon Cognito — Advanced security with threat protection](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-threat-protection.html)
- [Amazon Cognito — Working with compromised-credentials detection](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-compromised-credentials.html)
- [Amazon Cognito — Associate an AWS WAF web ACL with a user pool](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-waf.html)
- [Amazon Cognito pricing](https://aws.amazon.com/cognito/pricing/)
- [Amazon Cognito user pool feature tiers: Essentials and Plus — Amazon Web Services](https://www.youtube.com/watch?v=uwb-cJ6RUR8)
- [Sungmin Kim 강사 — Web Identity Federation](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69307)
- [Sungmin Kim 강사 — Cognito](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=70076)
- [Sungmin Kim 강사 — Cognito User Pools](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69308)
- [Sungmin Kim 강사 — Cognito 실습 1부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69309)
- [Sungmin Kim 강사 — Cognito 실습 2부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=200130)

## 관련 문서

- [[Cognito-Managed-Login|Cognito managed login과 패스키]]
- [[IAM]]
- [[AWS-Lambda]]
- [[API-Gateway]]
- [[OAuth2]]
- [[ELB|ALB]]
