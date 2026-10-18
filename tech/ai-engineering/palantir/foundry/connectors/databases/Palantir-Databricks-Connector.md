---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Databricks OIDC, Unity Catalog와 외부 코드

Databricks source는 hostname과 HTTP path를 지정한다. SQL warehouse를 우선 검토하며 cluster 경로와 구별한다. CloudFetch를 켜면 object storage를 병렬로 직접 읽으므로 해당 저장소의 egress도 필요하다. agent proxy connection pool의 core/max도 별도 제약이다.

## 인증과 권한

workload OIDC federation에서는 service principal federation policy를 만들며 account federation policy와 혼동하지 않는다. source가 안내하는 issuer, source RID subject, `sub` claim과 audience를 맞춘다. signature를 임의로 고정하기보다 discovery key 사용 안내를 따른다.

Azure M2M의 Databricks service principal은 Microsoft Entra service principal과 같은 식별자가 아니다. metadata BROWSE, USE CATALOG/SCHEMA, SELECT, MODIFY, CREATE, EXTERNAL USE SCHEMA와 external location의 BROWSE/CREATE EXTERNAL TABLE/EXTERNAL USE LOCATION을 실제 read/write에 맞춰 나눈다.

`AllowSelfSignedCerts=1`은 특정 CA 추가가 아니라 인증서 chain과 hostname 검증을 모두 끈다. 사설 CA를 신뢰시키는 설정과 효과가 다르다.

## virtual 접근과 pushdown

Unity Catalog external access와 vended credential은 Delta/Iceberg client가 저장소를 직접 읽게 한다. storage 네트워크와 권한도 필요하다. view나 row filter 때문에 credential을 vend할 수 없으면 JDBC fallback이 발생할 수 있다.

managed Iceberg 또는 external access가 켜진 external Delta 출력 조건을 확인한다. managed Avro/Delta/Parquet와 external Avro/Parquet는 입력 전용이라는 차이가 있다. incremental은 external access와 Delta CDF 또는 Iceberg incremental read 조건을 따른다.

같은 source의 Python/Pipeline Builder full computation과 일반 JDBC read를 구별한다. 외부 접근이 켜졌다는 사실만으로 모든 테이블의 계산이 warehouse 없이 실행되는 것은 아니다.

## 외부 코드 token 교환

`get_session_credentials().access_token`은 Foundry OIDC identity다. Databricks REST에 그대로 bearer로 보내면 401이 날 수 있다. RFC8693 token exchange와 SDK `IdTokenSource` 경로를 사용하며 원본/교환 token의 약 한 시간 수명과 refresh를 함께 처리한다.

source configuration의 auth type은 원문에 `workflowIdentityFederation`으로 표기된다. 임의로 철자를 고쳐 대입하지 않는다. Databricks source는 `get_https_connection` 방식 대신 client 생성 전 proxy 환경변수와 CA bundle을 설정한다. SQL connector의 단일 token 예제를 긴 실행의 자동 refresh 보장으로 간주하지 않으며 WorkspaceClient의 refresh 사용과 구별한다.

## 출처

- [Palantir, databricks](https://www.palantir.com/docs/foundry/available-connectors/databricks)

## 관련 문서

- [[Palantir-Connector-Contracts]]
