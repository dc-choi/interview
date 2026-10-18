---
tags: [palantir, s3, datasets, transactions]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry dataset S3 호환 API"]
---

# Foundry dataset S3 호환 API

S3-compatible API는 dataset을 bucket, logical file path를 object key로 노출하는 S3 subset이다. Compass Project/folder는 bucket이 아니다. Bucket/dataset 생성/삭제와 explicit transaction/branch management는 별도 Foundry API를 사용한다. 옛 DataProxy interface는 Foundry API로 대체되었다.

## Namespace와 client 설정

Endpoint는 `https://<host>/io/s3`, path-style만 지원한다. Region은 signature용 foundry, 표준 AWS region만 받는 client는 us-east-1을 사용한다. Virtual-hosted bucket style은 지원하지 않는다.

Bucket `<dataset-rid>.<branch>`로 기존 branch를 지정할 수 있다. Branch 이름은 alphanumeric/-/_를 쓰고 다른 문자는 Base64 뒤 padding =를 제거하는 경로를 제공한다. Branch를 자동 생성하지 않는다. Committed transaction RID를 suffix로 붙이면 해당 historical version은 read-only다.

Hadoop S3A가 RID의 dot을 hostname으로 처리해 bucket null 오류를 내면 dot을 hyphen으로 바꾸는 문서의 workaround를 검토한다. DuckDB ENDPOINT는 scheme을 빼고 USE_SSL로 HTTPS를 정한다. Boto3/CLI/Polars/NiFi/Airbyte/Storage Transfer 등마다 endpoint/path-style/session-token 설정이 실제 적용되는지 확인한다.

## 자동 transaction은 일반 S3와 다르다

Write는 UPDATE, delete는 DELETE transaction을 지연 생성한다. 같은 종류의 여러 file operation은 하나의 open transaction으로 처리할 수 있지만 write와 delete를 동시에 섞을 수 없다. 먼저 도착한 종류가 branch lock을 가지며 다른 종류는 commit을 기다린다.

Idle 이후 auto-commit하고 장시간 연속 작업에도 active upload가 없으면 commit한다. Parallel upload가 계속되면 open 상태가 길어질 수 있다. Write가 남아 있을 때 read는 latest committed view를 읽어 방금 쓴 file을 못 볼 수 있다. 모든 write/delete가 끝난 뒤 새 mutation 전에 read를 보내 commit을 유도할 수 있지만 일반 read-after-write 보장으로 확대하지 않는다.

Multipart upload/copy/get/head/list/put/delete subset을 지원하고 presigned URL은 putObject에 지원한다. 모든 S3 operation/presigned GET/versioning/Lifecycle와 동일하지 않다. 정확한 commit 경계가 중요한 작업은 Foundry REST/SDK transaction API와 비교한다.

## Credential 생성 주체와 사용 주체

Static S3 credential은 third-party app service user에 연결되고 하나 이상의 Project restriction을 지정한다. Service user의 resource/Marking role도 필요하다. Project RID와 folder RID는 같은 compass folder 형태일 수 있으므로 top-level Project인지 확인한다. Restriction은 접근 dataset 범위이며 dataset 안 file 저장 prefix는 object key로 정한다.

발급 API를 호출하는 사용자에는 User experience administrator 역할이 필요하고 다른 organization의 app이면 organizationRid를 지정한다. Client에 넣는 값은 발급된 S3 access key/secret이며 OAuth client ID/secret 자체가 아니다. Active credential listing/revoke와 회전 절차를 관리한다. 현대 app 관리는 Developer Console을 우선하고 미활성 환경의 Control Panel 예제와 구분한다.

Temporary credential은 Foundry user/OAuth token을 STS AssumeRoleWithWebIdentity로 교환한다. Scope는 원 token과 같고 유효기간은 최대 1시간 또는 원 token 만료 중 더 짧은 쪽이다. Access key/secret뿐 아니라 session token도 client에 설정한다. Client validation 때문에 unused RoleArn/RoleSessionName이 필요할 수 있으며 이를 실제 AWS role assumption 정책으로 해석하지 않는다.

Read/write에는 s3-proxy:datasets-read/write operation이 필요하며 기본 Viewer/Editor에 연결된다. Static은 service user, temporary는 해당 user 권한을 확인한다. 공개 URL/query string에 token을 담는 예제를 사용한다면 로그/명령 이력 노출을 별도로 방지하고 token을 문서에 저장하지 않는다.

## 출처

- [Palantir, S3-compatible API for Foundry datasets](https://www.palantir.com/docs/foundry/data-integration/foundry-s3-api)
- [Palantir, DataProxy](https://www.palantir.com/docs/foundry/data-integration/dataproxy)

## 관련 문서

- [[Palantir-Dataset-Transactions-and-Build-Branches|Branch lock과 file transaction]]
- [[Palantir-Consumer-Identity-and-Application-Models|서비스 계정과 사용자 권한]]
