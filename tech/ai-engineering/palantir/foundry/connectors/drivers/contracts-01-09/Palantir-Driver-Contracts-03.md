---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 3: amazon-marketplace부터 apache-phoenix까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Amazon Marketplace

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| IncludeReports | 권장 | FALSE |
| InitiateOAuth | 권장 | REFRESH |
| Marketplace | 권장 | United States |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Schema | 권장 | Marketplace |
| SellerId | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| sts.\<AWSRegion>.amazon.com | If Schema=SellingPartner,  AWSRegion Mappings |
| sellingpartnerapi-\<AWSRegion>.amazon.com | If Schema=SellingPartner, SellingPartner Mappings |
| sandbox.sellingpartnerapi-\<AWSRegion>.amazon.com | If Schema=SellingPartner and UseSandbox=True, SellingPartner Sandbox Mappings |
| mws.amazonservices.\<Marketplace> | If Schema=Marketplace, AWSMarketplace Mappings |
| api.amazon.com | If using OAuth |
| Seller Central URLs | If using OAuth |
| oa.cdata.com | If using the embedded CData OAuth credentials |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/ONK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Apache CouchDB

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| URL | 필수 | https://{serverAddress}:{port} |
| Password | 권장 | — |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/JCK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Apache HBase

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Server | 필수 | https://{serverAddress} |
| AuthScheme | 권장 | Basic |
| Password | 권장 | — |
| Port | 권장 | 8080 |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수 |
| \<KerberosKDC>:88 | If AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If AuthScheme=Negotiate and Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/RHK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Apache Hive

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Anonymous |
| Server | 필수 | {serverAddress} |
| UseSSL | 필수 | TRUE |
| Database | 권장 | — |
| Password | 권장 | — |
| Port | 권장 | 10000 |
| SSLServerCert | 권장 | — |
| TransportMode | 권장 | BINARY |
| User | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수 |
| \<KerberosKDC>:88 | If AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If AuthScheme=Negotiate and Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/FIM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Apache Phoenix

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AuthScheme | 필수 | Basic |
| URL | 필수 | https://{serverAddress}:{port} |
| LoadBalanceStrategy | 권장 | None |
| Password | 권장 | — |
| User | 권장 | — |
| Version | 권장 | 4.9.0 |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수 |
| \<KerberosKDC>:88 | If AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If AuthScheme=Negotiate and Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/UAK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## 출처

- [Palantir, Amazon Marketplace](https://www.palantir.com/docs/foundry/available-connectors/amazon-marketplace)
- [Palantir, Apache CouchDB](https://www.palantir.com/docs/foundry/available-connectors/apache-couchdb)
- [Palantir, Apache HBase](https://www.palantir.com/docs/foundry/available-connectors/apache-hbase)
- [Palantir, Apache Hive](https://www.palantir.com/docs/foundry/available-connectors/apache-hive)
- [Palantir, Apache Phoenix](https://www.palantir.com/docs/foundry/available-connectors/apache-phoenix)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
