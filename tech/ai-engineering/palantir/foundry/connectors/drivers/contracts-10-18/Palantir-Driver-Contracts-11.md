---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 11: google-directory부터 graphql까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Google Directory

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | OAuthJWT |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthJWTCert | 권장 | — |
| OAuthJWTCertType | 권장 | GOOGLEJSONBLOB |
| OAuthJWTSubject | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| accounts.google.com | 해당 source에서 필수. Required for OAuth |
| googleapis.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/EUK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Google Drive

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | OAuthJWT |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthJWTCert | 권장 | — |
| OAuthJWTCertType | 권장 | GOOGLEJSONBLOB |
| OAuthJWTSubject | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| accounts.google.com | 해당 source에서 필수. Required for OAuth |
| www.googleapis.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/RGK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Google Search

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIKey | 필수 | — |
| CustomSearchId | 필수 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| googleapis.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BLK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Google Spanner

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| DatabaseDialect | 필수 | GoogleStandardSQL |
| AuthScheme | 권장 | OAuthJWT |
| Database | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| InstanceId | 권장 | — |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthJWTCert | 권장 | — |
| OAuthJWTCertType | 권장 | GOOGLEJSONBLOB |
| OAuthJWTSubject | 권장 | — |
| ProjectId | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| accounts.google.com | 해당 source에서 필수. Required for OAuth |
| spanner.googleapis.com | 해당 source에서 필수. There is a hidden property Server that can override this with a different URL. |
| googleapis.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/OGK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## GraphQL

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| URL | 필수 | https://api.example.com/graphql |
| AuthScheme | 권장 | Basic |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수 |
| \<OAuthRequestTokenURL> | If using AuthScheme=OAuth and OAuthVersion=1.0 |
| \<OAuthAuthorizationURL> | If using AuthScheme=OAuth |
| \<OAuthAccessTokenURL> | If using AuthScheme=OAuth |
| \<OAuthRefreshTokenURL> | If using AuthScheme=OAuth and OAuthVersion=2.0 |
| cognito-idp.\<AWSCognitoRegion>.amazonaws.\<TLD> | If AuthScheme=AwsCognitoBasic,AwsCognitoSrp,  AWSRegion Mappings |
| cognito-identity.\<AWSCognitoRegion>.amazonaws.\<TLD> | If AuthScheme=AwsCognitoBasic,AwsCognitoSrp,  AWSRegion Mappings |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/LAK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Google Directory](https://www.palantir.com/docs/foundry/available-connectors/google-directory)
- [Palantir, Google Drive](https://www.palantir.com/docs/foundry/available-connectors/google-drive)
- [Palantir, Google Search](https://www.palantir.com/docs/foundry/available-connectors/google-search)
- [Palantir, Google Spanner](https://www.palantir.com/docs/foundry/available-connectors/google-spanner)
- [Palantir, GraphQL](https://www.palantir.com/docs/foundry/available-connectors/graphql)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
