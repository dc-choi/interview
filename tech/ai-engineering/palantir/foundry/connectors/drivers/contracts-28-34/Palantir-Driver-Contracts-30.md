---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 30: suitecrm부터 tally까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## SuiteCRM

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Schema | 필수 | suitecrmv4 |
| URL | 필수 | https://{suiteCrmHost}.com/ |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/ETK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## SurveyMonkey

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Datacenter | 필수 | US |
| AccessToken | 권장 | — |
| AuthScheme | 권장 | AccessToken |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| api.surveymonkey.net | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## SybaseIQ

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Password |
| ConnectionType | 필수 | SybaseIQ |
| Database | 필수 | — |
| Port | 필수 | 2638 |
| Server | 필수 | {serverAddress} |
| UseSSL | 필수 | TRUE |
| Password | 권장 | — |
| QueryPassthrough | 권장 | FALSE |
| SSLServerCert | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수. Server and Port connection properties; default Port=2638 |
| \<KerberosKDC>:88 | If AuthScheme=Kerberos |
| \<KerberosServiceKDC>:88 | If AuthScheme=Kerberos and Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GYM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Tableau CRM Analytics

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| UseSandbox | 필수 | FALSE |
| AuthScheme | 권장 | OAuthJWT |
| InitiateOAuth | 권장 | GETANDREFRESH |
| InstanceURL | 권장 | — |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| OAuthJWTCert | 권장 | — |
| OAuthJWTCertPassword | 권장 | — |
| OAuthJWTCertType | 권장 | PFXBLOB |
| OAuthJWTIssuer | 권장 | {OAuthConsumerKey} |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<InstanceURL> | 해당 source에서 필수. Returned by Salesforce when authenticating; can be set with InstanceURL property when InitiateOAuth=OFF |
| login.salesforce.com | If UseSandbox=FALSE and Subdomain blank |
| test.salesforce.com | If UseSandbox=TRUE |
| \<Subdomain>.cloudforce.com | Subdomain connection property is used for custom branded authentication pages |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FSK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Tally

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| URL | 필수 | https://{serverAddress}:9000 |
| Company | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property, i.e., URL=http://192.168.1.100:9000 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/HTK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, SuiteCRM](https://www.palantir.com/docs/foundry/available-connectors/suitecrm)
- [Palantir, SurveyMonkey](https://www.palantir.com/docs/foundry/available-connectors/surveymonkey)
- [Palantir, SybaseIQ](https://www.palantir.com/docs/foundry/available-connectors/sybaseiq)
- [Palantir, Tableau CRM Analytics](https://www.palantir.com/docs/foundry/available-connectors/tableau-crm-analytics)
- [Palantir, Tally](https://www.palantir.com/docs/foundry/available-connectors/tally)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
