---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 1: act!-crm부터 adobe-analytics까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Act! CRM

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| ActDatabase | 필수 | — |
| ActEdition | 필수 | Act CRM |
| Password | 필수 | — |
| User | 필수 | — |
| IncludeCustomFields | 권장 | TRUE |
| URL | 권장 | https://apius.act.com |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | When ActEdition='Act CRM' (default) - URL connection property |
| apius.act.com | When ActEdition='Act Premium Cloud' and ActCloudRegion='US' |
| apiuk.act.com | When ActEdition='Act Premium Cloud' and ActCloudRegion='UK' |
| apiau.act.com | When ActEdition='Act Premium Cloud' and ActCloudRegion='AUS' or 'NZ' |
| apieu.act.com | When ActEdition='Act Premium Cloud' and ActCloudRegion='EU' or 'InternationalEnglish' |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FTK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Act-On

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 권장 | OAuth |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| TypeDetectionScheme | 권장 | RowScan |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| restapi.actonsoftware.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/OVK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## ActiveCampaign

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| APIKey | 필수 | — |
| URL | 필수 | https://<yourAccountName>.api-us1.com |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JUK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Acumatica

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| Schema | 필수 | REST |
| URL | 필수 | https://domain.acumatica.com/entity/ |
| Company | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property (note may include more than just base domain) |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/OIK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Adobe Analytics

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | OAuth |
| GlobalCompanyId | 필수 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthJWTCert | 권장 | — |
| OAuthJWTCertPassword | 권장 | — |
| OAuthJWTCertType | 권장 | PUBLIC_KEY_BLOB |
| OAuthJWTIssuer | 권장 | — |
| RSID | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| analytics.adobe.io | 해당 source에서 필수 |
| ims-na1.adobelogin.com | 해당 source에서 필수. OAuth |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/SCK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, Act! CRM](https://www.palantir.com/docs/foundry/available-connectors/act!-crm)
- [Palantir, Act-On](https://www.palantir.com/docs/foundry/available-connectors/act-on)
- [Palantir, ActiveCampaign](https://www.palantir.com/docs/foundry/available-connectors/activecampaign)
- [Palantir, Acumatica](https://www.palantir.com/docs/foundry/available-connectors/acumatica)
- [Palantir, Adobe Analytics](https://www.palantir.com/docs/foundry/available-connectors/adobe-analytics)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
