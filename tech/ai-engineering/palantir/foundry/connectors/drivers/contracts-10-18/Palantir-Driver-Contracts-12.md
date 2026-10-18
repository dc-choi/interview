---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 12: greenplum부터 instagram까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Greenplum

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| Server | 필수 | {serverAddress} |
| User | 필수 | — |
| UseSSL | 필수 | TRUE |
| Database | 권장 | — |
| Port | 권장 | 5432 |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<Server>:\<Port> | 해당 source에서 필수 |
| \<KerberosKDC>:88 | If AuthScheme=Negotiate |
| \<KerberosServiceKDC>:88 | If AuthScheme=Negotiate and Kerberos topology uses multiple realms |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/SGK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Highrise

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| AccountId | 필수 | — |
| APIToken | 권장 | — |
| AuthScheme | 권장 | APIToken |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<AccountId>.highrisehq.com | 해당 source에서 필수 |
| launchpad.37signals.com | If AuthScheme=OAuth |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/BHK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## IBM Cloud Data Engine

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| ApiKey | 필수 | — |
| CloudObjectStorageCRN | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| SqlQueryCRN | 권장 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| iam.bluemix.net | 해당 source에서 필수 |
| api.dataengine.cloud.ibm.com | 해당 source에서 필수. New v3 endpoint, most likely required/used unless an older version of the driver |
| \<Region>.cloud-object-storage.appdomain.cloud | 해당 source에서 필수. Region connection property is mapped (may also be returned by IBM or part of CRN) |
| resource-controller.cloud.ibm.com | If CRN is not provided |
| sql-api.ng.bluemix.net | Old v2 endpoint replaced by api.dataengine.cloud.ibm.com |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/SIK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Region 별칭별 object-storage endpoint는 [[Palantir-IBM-Cloud-Region-Mapping]]을 참고한다.

## IBM Cloud Object Storage

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| ApiKey | 필수 | — |
| CloudObjectStorageCRN | 권장 | — |
| InitiateOAuth | 권장 | GETANDREFRESH |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| iam.bluemix.net | 해당 source에서 필수 |
| resource-controller.cloud.ibm.com | 해당 source에서 필수 |
| \<Region>.cloud-object-storage.appdomain.cloud | 해당 source에서 필수. Region connection property is mapped (may also be returned by IBM or part of CRN) |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/GMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Instagram

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; OAuth 2.0 authentication: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| BusinessAccountId | 권장 | — |
| InitiateOAuth | 권장 | REFRESH |
| OAuthClientId | 권장 | — |
| OAuthClientSecret | 권장 | — |
| Version | 권장 | 20.0 |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| graph.facebook.com | 해당 source에서 필수 |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/ENK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Greenplum](https://www.palantir.com/docs/foundry/available-connectors/greenplum)
- [Palantir, Highrise](https://www.palantir.com/docs/foundry/available-connectors/highrise)
- [Palantir, IBM Cloud Data Engine](https://www.palantir.com/docs/foundry/available-connectors/ibm-cloud-data-engine)
- [Palantir, IBM Cloud Object Storage](https://www.palantir.com/docs/foundry/available-connectors/ibm-cloud-object-storage)
- [Palantir, Instagram](https://www.palantir.com/docs/foundry/available-connectors/instagram)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
