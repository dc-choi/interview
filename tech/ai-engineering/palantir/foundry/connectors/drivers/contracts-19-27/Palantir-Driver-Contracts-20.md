---
tags: [palantir, foundry, connectors, jdbc, authentication]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Driver 계약 20: oracle-fusion-cloud-financials부터 oracle-service-cloud까지

이 표는 확인일 Palantir source 페이지의 속성 이름, 필요 여부, 기본값과 조건부 egress를 연결한 참조다. 필수 표기가 대안 auth mode의 모든 secret을 동시에 요구한다는 뜻은 아니다. 미기재 값과 기본값을 임의로 채우지 않는다. source 계정 권한과 scope는 별도로 설정한다.

## Oracle Fusion Cloud Financials

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| URL | 필수 | https://servername.fa.us2.oraclecloud.com |
| User | 필수 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property, i.e. URL='https://servername.fa.us2.oraclecloud.com' |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KEM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Oracle Fusion Cloud HCM

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| URL | 필수 | https://servername.fa.us2.oraclecloud.com |
| User | 필수 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KMK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Oracle Fusion Cloud SCM

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available; Table exports: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| URL | 필수 | https://servername.fa.us2.oraclecloud.com |
| User | 필수 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KSM/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## Oracle Sales

기능: Exploration: Generally available; Batch syncs: Generally available; Incremental: Generally available.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| HostURL | 필수 | https://my.host.oraclecloud.com |
| Password | 필수 | — |
| Username | 필수 | — |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<HostURL> | 해당 source에서 필수. HostURL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/EOK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

## Oracle Service Cloud

기능: Exploration: Beta; Batch syncs: Beta; Incremental: Beta; Table exports: Beta.

Beta 기능은 enrollment에서 제공되지 않거나 개발 중 바뀔 수 있다.

| 입력 속성 | 필요 조건 | 기본값 |
|---|---|---|
| Password | 필수 | — |
| URL | 필수 | https://servername.fa.us2.oraclecloud.com |
| User | 필수 | — |
| IncludeCustomFields | 권장 | TRUE |

| 직접 연결 domain | 필요한 조건 |
|---|---|
| \<URL> | 해당 source에서 필수. URL connection property |

[해당 driver 속성 매뉴얼](https://cdn.cdata.com/help/KOK/jdbc/pg_connectionj.htm)

입력의 상세 의미와 대체 auth mode는 아래 source의 해당 driver 매뉴얼에서 확인한다. agent 연결은 agent 도달성과 원본 inbound 허용을 함께 맞춘다.

Table export는 source에서 exports를 켠 뒤 target table과 실제 쓰기 권한을 구성한다. OAuth를 쓰는 경우 해당 source의 authorization/refresh 절차도 필요하다.

## 출처

- [Palantir, Oracle Fusion Cloud Financials](https://www.palantir.com/docs/foundry/available-connectors/oracle-fusion-cloud-financials)
- [Palantir, Oracle Fusion Cloud HCM](https://www.palantir.com/docs/foundry/available-connectors/oracle-fusion-cloud-hcm)
- [Palantir, Oracle Fusion Cloud SCM](https://www.palantir.com/docs/foundry/available-connectors/oracle-fusion-cloud-scm)
- [Palantir, Oracle Sales](https://www.palantir.com/docs/foundry/available-connectors/oracle-sales)
- [Palantir, Oracle Service Cloud](https://www.palantir.com/docs/foundry/available-connectors/oracle-service-cloud)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Driver-Reference]]
