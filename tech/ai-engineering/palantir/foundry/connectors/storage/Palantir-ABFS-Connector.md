---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# OneLake, ADLS Gen2와 ABFS 파일 계약

ABFS는 OneLake와 ADLS Gen2 Blob Filesystem 연결이며 ADLS Gen1 계약이 아니다. 파일 형식을 보존하고 schema는 후속 처리에서 적용한다. 문서는 파일 크기 상한을 별도로 두지 않지만 2일 넘는 cloud sync가 중단된다고 명시하므로 작업당 파일 수와 크기를 나눈다.

## 인증과 경로

직접 연결에는 client credentials를 우선 검토한다. 읽기에는 Storage Blob Data Reader 또는 파일 read와 모든 상위 경로 execute ACL이 필요하다. SAS는 고정 만료와 수동 갱신, shared key는 account 수준 권한과 수동 회전 때문에 문서가 권장하지 않는다.

SAS가 directory 범위이면 signed resource/depth와 HTTPS, root directory 범위를 맞춘다. managed identity는 적절한 Azure VM에서 실행하는 같은 tenant의 legacy agent 조건을 확인한다. OIDC는 별도 선택이다.

endpoint는 `.dfs.core.windows.net`이며 `.blob` endpoint를 그대로 대입하지 않는다. legacy export path 끝에 slash가 없으면 의도한 디렉터리 대신 내부 경로에 쓸 수 있다. 같은 region 연결에 필요한 Private Link, storage ingress와 443 egress를 함께 확인한다.

## virtual table과 export

virtual table은 Foundry worker에서 client credentials, username/password 또는 OIDC로 연결한다. 모든 파일 인증 방식이 virtual credential로 허용되는 것은 아니다. Delta CDF, Iceberg append와 Parquet schema 표본 최대 100파일 조건을 source별로 적용한다. Unity/Polaris catalog도 구별한다.

legacy export의 flag file은 하위 폴더마다가 아니라 전체 build가 끝난 뒤 기록된다. flag보다 새 파일은 아직 실행 중이거나 실패한 export일 수 있다. transaction 폴더와 완료 표식을 함께 보고 소비한다.

## 진단 범위

원문은 Soft Delete와 Hadoop ABFS 호환 오류, client secret 문자, VM managed-identity endpoint의 400과 credential 401을 구분한다. 이는 확인일 Palantir connector 문서의 진단 정보이며 Azure 전체의 현재 지원 정책을 독립적으로 검증한 결과는 아니다. Azure 기능이나 CA를 바꿀 때 해당 제품의 최신 원문을 다시 대조한다.

## 출처

- [Palantir, azure-blob-filesystem](https://www.palantir.com/docs/foundry/available-connectors/azure-blob-filesystem)
- [Palantir, onelake-and-azure-blob-filesystem](https://www.palantir.com/docs/foundry/available-connectors/onelake-and-azure-blob-filesystem)

## 관련 문서

- [[Palantir-Connector-Contracts]]
