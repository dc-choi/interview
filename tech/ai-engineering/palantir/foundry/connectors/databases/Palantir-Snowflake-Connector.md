---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Snowflake warehouse, 인증과 Iceberg 가상화

Snowflake account 이름의 underscore를 dash로 바꾸는 hostname 조건을 확인한다. batch sync의 warehouse 선택 가능 조건과 virtual table의 필수 warehouse를 구별한다. role/database/schema USAGE와 실제 table SELECT를 맞춘다.

## 인증과 통신

OIDC를 우선 검토한다. password, key pair, PAT와 외부 IdP client credentials는 다른 경로다. key pair는 입력 시 unencrypted private key 형식을 요구하더라도 저장 시 암호화하는 처리와 구별한다. MFA/service-user password 변화는 확인일 Palantir 문서 설명이며 실제 account의 현재 정책을 다시 확인한다.

SYSTEM$ALLOWLIST의 DEPLOYMENT/STAGE 경로를 허용한다. Azure stage는 hostname뿐 아니라 storage account resource ID와 Azure policy가 필요할 수 있다. edition별 PrivateLink 지원/설정은 Snowflake와 확인한다.

S3 stage의 custom VPCE DNS가 Foundry에서 도달하지 못하면 S3_STAGE_VPCE_DNS_NAME를 비우는 문서 안내와 gateway private 경로를 확인한다. 모든 S3 설정에 일괄 적용하는 옵션이 아니다.

## virtual과 incremental

Snowflake-managed Iceberg의 sync는 Foundry 관리 저장소로 복사하고 virtual은 외부 table을 등록하는 차이가 있다. Horizon external-volume vended credential로 직접 읽어도 metadata 작업에는 warehouse가 쓰일 수 있다. 조건이 맞지 않으면 일반 Snowflake warehouse 경로로 fallback한다.

Horizon Iceberg write는 private preview 조건을 확인한다. compute가 전혀 들지 않는다고 설명하지 않는다. source credential과 실제 backing storage egress도 맞춘다.

incremental은 append table 조건이며 view에 일반 적용하지 않는다. Change Tracking/Time Travel과 CHANGES의 action/isupdate/rowid metadata를 구별한다. 같은 source의 Python/Pipeline Builder pushdown 조건도 별도다. ARRAY/OBJECT/VARIANT는 string으로 읽는 형식 변환을 확인한다.

## 출처

- [Palantir, snowflake](https://www.palantir.com/docs/foundry/available-connectors/snowflake)

## 관련 문서

- [[Palantir-Connector-Contracts]]
