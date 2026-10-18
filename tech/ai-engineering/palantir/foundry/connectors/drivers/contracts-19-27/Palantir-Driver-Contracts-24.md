---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 24: sage-200부터 salesforce-marketing-cloud까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Sage 200

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| SubscriptionKey | 필수 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Schema | 권장 | StandardUK |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.columbus.sage.com | 해당 source에서 필수 |
| id.sage.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GGK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Sage 300

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| URL | 필수 | https://{host-application-path}/v{version}/{tenant}/ |
| User | 필수 | — |
| Company | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property, in format  {protocol}://{host-application-path}/v{version}/{tenant}/ (i.e., http://localhost/Sage300WebApi/v1.0/-/) |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GTK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Sage 50 UK

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| Password | 필수 | — |
| URL | 필수 | https://MySite:5493/sdata/accounts50/GCRM/MyDatasetId/ |
| User | 필수 | — |
| SSLServerCert | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property, example: http://MySite:5493/sdata/accounts50/GCRM/MyDatasetId/ |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/CSK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Sage Business Cloud Accounting

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.accounting.sage.com | 해당 source에서 필수 |
| sageone.com | 해당 source에서 필수 |
| oauth.accounting.sage.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GAK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Salesforce Marketing Cloud

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; OAuth 2.0 authentication: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Schema | 필수 | SOAP |
| Subdomain | 필수 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| UseLegacyAuthentication | 권장 | TRUE |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Subdomain>.soap.marketingcloudapis.com | If Schema=SOAP (default) |
| \<Subdomain>.rest.marketingcloudapis.com | If Schema=REST |
| \<Subdomain>.auth.marketingcloudapis.com | If UseLegacyAuthentication=FALSE (default) AND AuthScheme=OAuth, OAuthClient |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FEK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Sage 200](https://www.palantir.com/docs/foundry/available-connectors/sage-200)
- [Palantir, Sage 300](https://www.palantir.com/docs/foundry/available-connectors/sage-300)
- [Palantir, Sage 50 UK](https://www.palantir.com/docs/foundry/available-connectors/sage-50-uk)
- [Palantir, Sage Business Cloud Accounting](https://www.palantir.com/docs/foundry/available-connectors/sage-business-cloud-accounting)
- [Palantir, Salesforce Marketing Cloud](https://www.palantir.com/docs/foundry/available-connectors/salesforce-marketing-cloud)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
