---
tags: [palantir, foundry, data-connection, connectors]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
---

# S3 커넥터의 권한, 파일과 virtual table

S3 source는 파일 import/export, media sync, virtual table과 BYOB를 구분한다. bucket 탐색은 `ListBucket`, 읽기는 `GetObject`, export는 `PutObject`가 필요하다. BYOB는 삭제를 포함한 object 권한과 KMS 사용 시 Decrypt/Encrypt/GenerateDataKey, 문서의 federation 권한까지 별도 확인한다.

## 접속과 경로

URL은 root directory와 마지막 slash를 확인한다. S3A 경로와 region 설정을 맞추며 STS를 쓰면 region이 필요하다. region이 포함된 endpoint와 별도 region을 함께 지정해 충돌하지 않게 한다. 점이 든 bucket 이름은 path-style 설정을 검토한다.

원본 bucket policy와 Foundry egress를 함께 연다. 같은 region의 AWS endpoint 정책, 다른 region의 agent proxy 경로도 확인한다. STS assume-role에는 원본 role의 권한과 신뢰 정책이 모두 필요하다. S3 문서의 session 기본 3,600초를 Kinesis/API 설정의 900초와 혼동하지 않는다.

이 source 화면의 connect/socket timeout 기본은 각 50,000ms, max connections 50, retry 3이다. API source config의 다른 기본값을 여기에 덮어 적용하지 않는다. 하위 폴더 매칭을 끄면 prefix `bar`가 `bar_baz`도 포함할 수 있다.

## virtual table

Foundry worker에서 사용하고 agent worker는 지원하지 않는다. Avro/Delta/Iceberg/Parquet 입출력과 catalog별 지원을 확인하며 자동/bulk 등록과 compute pushdown은 지원한다고 가정하지 않는다.

Delta incremental은 CDF와 current/added view, `_change_type`, `_commit_version`, `_commit_timestamp`를 사용한다. Iceberg는 catalog가 필요하며 append 변경의 current/added view를 다룬다. 하나의 source에 등록한 Iceberg table은 같은 Iceberg catalog를 써야 한다.

기본 object storage catalog는 warehousePath를, Glue는 database.table, Unity는 catalog.schema.table 식별자를 사용한다. Polaris도 별도 catalog 옵션이다. Parquet schema 추론은 최대 100개 파일 표본이므로 표본 밖의 schema 일관성을 보장하지 않는다.

## export와 코드

legacy S3 export task의 파일당 retry 기본은 0, thread 1, multipart false다. 현행 file export와 분리한다. 파일 삭제나 overwrite가 필요한 경우 해당 권한을 최소 단위로 추가한다.

외부 코드의 session credentials는 약 한 시간 뒤 refresh가 필요하다. 임시 AWS credential은 access key/secret뿐 아니라 session token도 전달해야 한다.

2026-11-24 확인한 문서의 S3 export 예제는 `@external_systems`로 source를 받고 `@transform.using`(lightweight transform 권장 문법, transforms 3.68.0 이상)과 `LightweightInput`/`LightweightOutput`을 쓴다. `get_session_credentials().get()`의 access key, secret과 session token을 boto3 client에 넘기고, `filesystem().ls()`로 파일을 나열해 `upload_fileobj`로 올린 뒤 export log를 polars DataFrame의 `write_table`로 남긴다. Python의 `get_session_credentials()` 지원 목록에서 S3는 Cloud Identity/OIDC source다. 2026-10-20 수집본의 Spark 예제(`ctx.spark_session`, `files()`의 `foreach`와 `count`, `write_dataframe`)의 Spark 전용 요소를 lightweight 예제에 섞지 않는다. 3.68.0 미만 저장소는 legacy `@lightweight`와 `@transform` 조합을 쓸 수 있다.

예제는 credential TTL(약 1시간)을 넘길 수 있는 대량 export에 주기적 refresh나 boto3 `RefreshableCredentials` 적용을 주석으로만 권하고 구현하지 않는다. 설명은 여러 dataset RID를 다룬다고 하지만 코드는 dataset 하나만 처리한다. export가 TTL을 넘길 수 있으면 refresh를, 여러 dataset을 내보내려면 반복 구조를 따로 구현한다.

## 출처

- [Palantir, amazon-s3](https://www.palantir.com/docs/foundry/available-connectors/amazon-s3)
- [Palantir, lightweight-api-evolution](https://www.palantir.com/docs/foundry/transforms-python/lightweight-api-evolution)

## 관련 문서

- [[Palantir-Connector-Contracts]]
- [[Palantir-Python-Transform-Definition-and-Resources]]
- [[Palantir-Source-Identity-and-Code]]
