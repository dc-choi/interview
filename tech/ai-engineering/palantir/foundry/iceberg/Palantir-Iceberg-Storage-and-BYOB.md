---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Iceberg storage와 encryption의 설정 책임

managed catalog와 managed storage,managed catalog와 BYOB,external catalog와 external storage를 구분한다. AWS/Azure/GCP standard enterprise에 기본 제공되며 다른환경은 지원범위를 확인한다. Enrollment Administrator/Information Security Officer만 Control Panel Iceberg settings를 수정한다.

## 암호화와 설정 수명

SSE는 필수이고 managed는 Palantir,BYOB는 bucket관리자가 설정한다. CSE는 table file을 쓰기 전에 추가 암호화하며 외부engine/기능 호환성을 줄일 수 있다. managed GCP storage는 CSE필수,managed AWS/Azure와 BYOB3cloud는 optional이다.

enrollment default와 project/namespace override는 새 table에만 적용한다. storage/encryption setting변경이 기존 table을 migration하지는 않는다. 일부project만 허용하려면 default writing을 끄고 명시 override를 둔다.

## BYOB source

source Owner가 S3/ADLS/GCS source를 만들고 exports를 enable하며 code-import configuration은 disabled로 둔다. base path를 생략하면 foundry-iceberg를 쓰고 backing storage설정 후 path를 바꾸면 기존table이 끊길 수 있다. credential이 고권한이므로 source의 reader/editor를 제한한다.

bucket source의 모든 egress policy가 table workflow에 제공되어 user code가 해당destination으로 나갈 수 있다. BYOB가 단순 저장 위치 선택만은 아닌 이유다. client에는 bucket credential을 직접 배포하지 않고 catalog vending을 쓴다.

|Cloud|필요 조건|
|---|---|
|S3|Get/Put/DeleteObject,ListBucket,KMS Encrypt/Decrypt/GenerateDataKey와 STS FederationToken 권한을 구성한다. source auth는 supported key/OIDC등이며 same-region은 Palantir VPC endpoint egress도 명시한다.|
|ADLS|dfs.core.windows.net endpoint만 지원하고 blob endpoint는 제외한다. container Storage Blob Data Contributor와 account-level Delegator가 필요하다.|
|GCS|bucket Storage Object Admin과 service-account 자체 Token Creator,JSON/PKCS8 auth를 쓴다. BYOB source에는 Catalog를 설정하지 않고 Lakehouse용과 별도 source로 만든다.|

가능하면 같은region으로 배치하고 Foundry와 외부client 양쪽 network path를 설정한다.

## 출처

- [Palantir, storage](https://www.palantir.com/docs/foundry/iceberg/storage)
- [Palantir, iceberg-settings](https://www.palantir.com/docs/foundry/iceberg/iceberg-settings)
- [Palantir, iceberg-byob](https://www.palantir.com/docs/foundry/iceberg/iceberg-byob)

## 관련 문서

- [[Palantir-Iceberg-Client-Authentication]]
- [[Palantir-Connectors]]
