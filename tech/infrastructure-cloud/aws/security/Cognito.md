---
tags: [infrastructure, aws, cognito, auth, identity, oauth2, oidc, saa-c03]
status: done
verified_at: 2026-08-04
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
- **MFA**: SMS, TOTP 기반 다단계 인증.
- **Managed login**: AWS가 제공하는 로그인, 로그아웃, 비밀번호 관리 페이지. classic Hosted UI는 1세대 옵션이며 feature plan에 따라 managed login 사용 가능 범위가 달라진다.
- **Lambda Trigger**: 가입 전/후, 인증 전/후, 토큰 생성 시 등 라이프사이클 훅에서 Lambda 실행 (커스텀 검증, 사용자 마이그레이션, 환영 메일 등).
- **사용자 인증 후 JWT(JSON Web Token) 발행** → API Gateway/ALB 인증, 또는 Identity Pool과 교환해 AWS 자격 증명 획득.

### JWT 3종

- **ID Token**: 사용자 프로필 클레임(이메일, 이름 등) 포함. 클라이언트 식별용 (OIDC 표준).
- **Access Token**: 보호된 리소스(API)에 접근할 때 사용. 스코프, 그룹 클레임 포함 (OAuth 2.0).
- **Refresh Token**: 만료된 Access/ID 토큰 재발급용.

### JWT 검증

JWT payload를 decode하는 것만으로 신뢰하면 안 된다. user pool의 JWKS에서 `kid`에 맞는 공개 키를 찾아 서명을 검증하고 `iss`, `exp`, `token_use`, ID token의 `aud` 또는 access token의 `client_id`를 확인한다. API에서는 필요한 OAuth scope도 검사한다. signing key 회전에 대비해 JWK를 `kid` 기준으로 cache하고 모르는 `kid`가 오면 JWKS를 갱신한다.

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

- REST/HTTP API에 **Cognito User Pool Authorizer** 설정 → 클라이언트가 보낸 **JWT를 자동 검증**.
- 별도 Lambda 코드 없이 인증된 요청만 백엔드로 전달.
- HTTP API는 추가로 **JWT Authorizer** (외부 OIDC 토큰도 검증)도 지원.

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
- **API Gateway에 사용자 인증 붙이기** → **Cognito User Pool Authorizer** (JWT 검증 자동화).
- **모바일 앱에서 S3에 직접 업로드** → 클라이언트가 **Identity Pool**로 임시 자격 증명 받고 S3 호출.
- **익명/게스트 사용자에게도 제한된 AWS 접근 부여** → **Identity Pool의 Unauthenticated Role**.
- **Google/Facebook/SAML 로그인** → **Federated Identity** (User Pool 또는 Identity Pool에 외부 IdP 등록).
- **회원 가입, 로그인 UI를 직접 만들고 싶지 않다** → **Managed login**. Lite plan이나 기존 구성은 classic Hosted UI일 수 있음.
- **회원 가입, 인증 흐름에 커스텀 로직 삽입** → **Lambda Trigger** (Pre Sign-up, Post Confirmation, Pre Token Generation 등).
- **IAM User**는 AWS 콘솔, CLI 사용자(직원)용이고, **Cognito는 앱 사용자(End User)용** — 둘은 다른 영역.

## 출처

- AWS SAA C03 학습 자료 (로컬)
- [Amazon Cognito — User pool managed login](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-managed-login.html)
- [Amazon Cognito — Identity pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html)
- [Amazon Cognito — Integrating user pools and identity pools](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-integrating-user-pools-with-identity-pools.html)
- [Amazon Cognito — Verifying JWTs](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
- [Amazon Cognito — Cognito Sync availability](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-sync.html)
- [Sungmin Kim 강사 — Web Identity Federation](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69307)
- [Sungmin Kim 강사 — Cognito](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=70076)
- [Sungmin Kim 강사 — Cognito User Pools](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69308)
- [Sungmin Kim 강사 — Cognito 실습 1부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=69309)
- [Sungmin Kim 강사 — Cognito 실습 2부](https://www.inflearn.com/courses/lecture?courseId=326598&unitId=200130)

## 관련 문서

- [[IAM]]
- [[AWS-Lambda]]
- [[API-Gateway]]
- [[OAuth2]]
- [[ELB|ALB]]
