---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 2: adobe-commerce부터 amazon-dynamodb까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Adobe Commerce

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| URL | 필수 | https://myadobecommercehost |
| AccessToken | 권장 | — |
| StoreCode | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BZK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## ADP

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| SSLClientCert | 필수 | — |
| TestConnectionEndpoint | 필수 | workers |
| UseUAT | 필수 | FALSE |
| IncludeCustomFields | 권장 | TRUE |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| SSLClientCertPassword | 권장 | — |
| SSLClientCertType | 권장 | PFXBLOB |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.adp.com | If UseUAT=FALSE |
| accounts.adp.com | If UseUAT=FALSE |
| uat-api.adp.com | If UseUAT=TRUE |
| uat-accounts.adp.com | If UseUAT=TRUE |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JDM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Airtable

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| DisplayValue | 필수 | FormattedValue |
| AuthScheme | 권장 | PersonalAccessToken |
| BaseId | 권장 | — |
| BaseName | 권장 | — |
| DisplayObjectIds | 권장 | FALSE |
| InitiateOAuth | 권장 | REFRESH |
| OAuthAccessToken | 권장 | — |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| UseSimpleNames | 권장 | FALSE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.airtable.com | 해당 source에서 필수 |
| airtable.com | If AuthScheme=OAuthPKCE |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JAK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## AlloyDB

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Password |
| Password | 필수 | — |
| Server | 필수 | {serverAddress} |
| User | 필수 | — |
| UseSSL | 필수 | TRUE |
| Database | 권장 | — |
| Port | 권장 | 5432 |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수. Server and Port connection properties |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KYK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Amazon DynamoDB

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | AwsRootKeys |
| AWSAccessKey | 권장 | — |
| AWSRegion | 권장 | NORTHERNVIRGINIA |
| AWSSecretKey | 권장 | — |
| Domain | 권장 | amazonaws.com |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| dynamodb.\<AWSRegion>.\<domain> | 해당 source에서 필수. AWSRegion Mappings |
| sts.\<Region>.amazonaws.\<TLD> | If AuthScheme=AwsIAMRoles,AwsMFA,TemporaryCredentials |
| cognito-idp.\<AWSCognitoRegion>.amazonaws.\<TLD> | If AuthScheme=AwsCognitoBasic,AwsCognitoSrp |
| cognito-identity.\<AWSCognitoRegion>.amazonaws.\<TLD> | If AuthScheme=AwsCognitoBasic,AwsCognitoSrp |
| \<SSOLoginURL> | If AuthScheme=Okta,ADFS,PingFederate, use SSOLoginURL property |
| \<Resource> | If AuthScheme=AzureAD, Resource set in SSOProperties |
| \<SSOExchangeURL> | If AuthScheme=Okta |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/DDK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Adobe Commerce](https://www.palantir.com/docs/foundry/available-connectors/adobe-commerce)
- [Palantir, ADP](https://www.palantir.com/docs/foundry/available-connectors/adp)
- [Palantir, Airtable](https://www.palantir.com/docs/foundry/available-connectors/airtable)
- [Palantir, AlloyDB](https://www.palantir.com/docs/foundry/available-connectors/alloydb)
- [Palantir, Amazon DynamoDB](https://www.palantir.com/docs/foundry/available-connectors/amazon-dynamodb)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
