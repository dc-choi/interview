---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 10: github부터 google-data-catalog까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## GitHub

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| github.com | 해당 source에서 필수 |
| api.github.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FGK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Gmail

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Schema | 필수 | REST |
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

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/DLM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Google Campaign Manager

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| ProfileID | 필수 | — |
| AuthScheme | 권장 | OAuthJWT |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthJWTCert | 권장 | — |
| OAuthJWTCertType | 권장 | GOOGLEJSONBLOB |
| OAuthJWTSubject | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| ads.google.com | 해당 source에서 필수 |
| admanager.google.com | 해당 source에서 필수 |
| accounts.google.com | 해당 source에서 필수. Used for OAuth |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/EPK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Google Contacts

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

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
| \<URL> | The UpdateOrDeleteContactPhoto stored procedure has a URL parameter that can be used. |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/ECK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Google Data Catalog

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| OrganizationId | 필수 | — |
| ProjectId | 필수 | — |
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
| datacatalog.googleapis.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HGK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, GitHub](https://www.palantir.com/docs/foundry/available-connectors/github)
- [Palantir, Gmail](https://www.palantir.com/docs/foundry/available-connectors/gmail)
- [Palantir, Google Campaign Manager](https://www.palantir.com/docs/foundry/available-connectors/google-campaign-manager)
- [Palantir, Google Contacts](https://www.palantir.com/docs/foundry/available-connectors/google-contacts)
- [Palantir, Google Data Catalog](https://www.palantir.com/docs/foundry/available-connectors/google-data-catalog)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
