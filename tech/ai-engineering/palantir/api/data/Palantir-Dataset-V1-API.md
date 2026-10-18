---
tags: [palantir, foundry, api, dataset, transaction, versioning]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Dataset v1 API"]
---

# Dataset v1의 branch, 파일과 transaction

Dataset API v1은 dataset 자원, branch의 현재 참조와 파일 변경을 담은 transaction을 구분한다. 파일 업로드 성공, 여러 파일의 commit과 특정 시점의 resolved view는 다른 계약이다. 이 문서의 경로는 `/api/v1`이며 v2의 인자/기능과 자동으로 같다고 취급하지 않는다.

## 지원 대상과 자원 생성

Dataset endpoints는 restricted view와 unmaterialized view와 호환되지 않는다. readTable, listFiles와 getFileContent는 다른 dataset으로 구성한 virtual view도 미지원이라고 명시한다. UI에서 보이는 자원이 모든 Dataset endpoint의 대상이라고 가정하지 않는다.

`POST /api/v1/datasets`는 name과 parentFolderRid로 생성하고 default branch를 만든다. 많은 enrollment의 default 예는 master다. GET `/datasets/{datasetRid}`는 RID, name과 parentFolderRid를 포함한 metadata를 반환하며 데이터 본문을 읽는 요청이 아니다.

읽기 endpoint는 `api:datasets-read`, 생성/업로드/삭제/branch와 transaction 변경은 `api:datasets-write` operation scope를 요구한다. 작업별 실제 자원 권한도 필요하다.

## Branch의 참조와 목록

branch create는 branchId와 선택적 transactionRid를 받는다. 지정 transaction은 committed여야 한다. branch는 dataset을 분기해 별도 작업하게 하며 응답의 transactionRid는 없을 수도 있다.

create/get/list/delete 경로는 `/datasets/{datasetRid}/branches`와 `/{branchId}`다. branch 이름은 비어 있거나 RID/UUID처럼 보이는 값이면 안 된다. 기존 branch 이름 재사용은 BranchAlreadyExists conflict다.

listBranches와 listFiles는 pageSize 기본 1,000이며 pageToken/nextPageToken으로 순회한다. 페이지를 모두 받은 상태와 특정 시점의 일관된 snapshot을 같은 것으로 취급하지 않는다. 공통 pagination 계약은 [[Palantir-API-Client-Contract]]를 따른다.

## 자동 transaction과 명시적 transaction

일반 file upload/delete는 기본 branch에 새 transaction을 만들고 commit하는 편의 경로를 제공한다. branchId를 주면 해당 branch에 자동 transaction을 만든다. upload의 기본 transactionType은 UPDATE이며 다른 type을 지정할 수 있다.

여러 파일을 한 transaction으로 다룰 때는 다음 흐름을 사용한다.

1. POST `/datasets/{datasetRid}/transactions`로 대상 branch에 open transaction을 만든다.
2. file upload 또는 delete에 transactionRid를 지정한다.
3. 성공 시 `/{transactionRid}/commit`, 중단 시 `/{transactionRid}/abort`를 POST한다.
4. GET `/{transactionRid}`로 실제 status를 확인한다.

branch 하나에는 open transaction 하나만 있을 수 있다. 이미 열렸으면 OpenTransactionAlreadyExists이며 같은 branch에 여러 독립 writer가 동시에 각자 transaction을 만들 수 있다고 가정하지 않는다.

transactionType은 APPEND, UPDATE, SNAPSHOT과 DELETE다. deleteFile에서 수동 transaction을 사용할 때는 DELETE여야 한다. 전부 enum에 있다는 이유로 어떤 파일 연산과도 조합할 수 있는 것은 아니다.

## Commit과 Abort의 효과

status는 OPEN, COMMITTED와 ABORTED다. commit은 파일 변경을 보존하고 branch가 해당 transaction을 가리키게 한다. abort는 변경을 보존하지 않고 branch도 갱신하지 않는다. 두 작업 모두 open transaction 대상이다.

응답을 잃어 commit 결과가 불명확하면 Get Transaction으로 상태를 확인하는 방식을 검토한다. 이미 닫힌 transaction에 같은 명령을 다시 보내도 성공으로 처리되는 idempotency가 이 명세에 보장되지는 않는다. 여러 dataset에 걸친 transaction 원자성도 이 단일 dataset 계약에서 도출하지 않는다.

createdTime은 필수, closedTime은 선택적 ISO 8601 timestamp다. transaction RID를 알고 있다는 사실이 committed 상태를 뜻하지 않는다. TransactionNotCommitted, TransactionNotOpen과 권한 거부를 나누어 처리한다.

## File upload/delete와 역사적 view

upload는 POST `/datasets/{datasetRid}/files:upload`이며 filePath는 query parameter다. body는 binary content이고 Content-Type은 `application/octet-stream`이다. JSON/base64 wrapper로 바꾸는 요청이 아니다.

파일 경로는 dataset에 상대적이며 앞 `/`로 시작하지 않는다. 파일 이름에 내부 경로가 있으면 endpoint의 path/query encoding을 유지한다. metadata는 path, transactionRid, updatedTime과 선택적 Long sizeBytes를 담는다.

다른 transaction에 기존 경로를 다시 upload하면 갱신 view에서 최신 버전이 보인다. 같은 dataset/transaction에 이미 있는 경로 충돌은 FileAlreadyExists가 될 수 있다. 최신 view에서 덮어 보이는 효과와 한 transaction 안의 파일 중복 규칙을 구분한다.

deleteFile은 기본 또는 지정 branch의 새 DELETE transaction으로 지우거나 수동 DELETE transaction에 모은다. **현재 view에서 파일을 지워도 historical view에는 보일 수 있다.** 이를 과거 버전의 보안 삭제나 retention purge로 해석하지 않는다.

## Resolved view와 단일 transaction 읽기

getFileContent, getFileMetadata와 listFiles는 branch 또는 transaction 범위로 읽을 내용을 선택한다.

| 지정 방식 | 읽는 범위 |
|---|---|
| 기본 또는 branchId | 최신 snapshot 이후 현재 branch의 최신 파일 버전 |
| endTransactionRid만 | 해당 transaction 시점까지 해석한 view |
| startTransactionRid와 endTransactionRid | 두 transaction 사이에서 해석한 view |
| start/end에 같은 RID | 해당 transaction 자체에 포함된 파일 변경 |

snapshot이 없으면 가장 이른 ancestor transaction부터 해석한다. 범위 중간의 snapshot은 그 이전 파일을 resolved view에서 제거할 수 있다. start와 end가 같은 root-to-leaf 경로에 없으면 동작이 undefined다. 다른 branch에서 임의의 두 RID를 골라 비교하는 range API로 사용하지 않는다.

file content는 binary, file metadata/list는 JSON이다. 파일 metadata를 받았다고 실제 내용을 다운로드한 것으로 기록하지 않는다. 잘못된 branch/range 인자 조합은 InvalidParameterCombination이 될 수 있다.

## 테이블 읽기의 별도 제약

GET `/datasets/{datasetRid}/readTable`은 필수 format으로 ARROW 또는 CSV를 받고 binary content stream을 반환한다. columns를 생략하면 모든 column, rowLimit은 반환 row 수를 제한한다. row 순서는 비결정적이므로 rowLimit 결과를 정렬된 상위 N개나 재현 가능한 표본으로 취급하지 않는다.

schema 부재, 지원하지 않는 column type과 읽기 미지원 dataset은 서로 다른 오류다. binary 파일 upload만으로 이 endpoint에 필요한 schema가 자동 생성되었다고 결론내리지 않는다.

공식 v1 전체 endpoint/schema를 대조했으며 실제 branch 생성, 파일 변경, commit/abort와 역사적 view 읽기는 수행하지 않았다.

## 출처

- [Palantir, branch-basics](https://www.palantir.com/docs/foundry/api/datasets-resources/branches/branch-basics)
- [Palantir, create-branch](https://www.palantir.com/docs/foundry/api/datasets-resources/branches/create-branch)
- [Palantir, delete-branch](https://www.palantir.com/docs/foundry/api/datasets-resources/branches/delete-branch)
- [Palantir, get-branch](https://www.palantir.com/docs/foundry/api/datasets-resources/branches/get-branch)
- [Palantir, list-branches](https://www.palantir.com/docs/foundry/api/datasets-resources/branches/list-branches)
- [Palantir, create-dataset](https://www.palantir.com/docs/foundry/api/datasets-resources/datasets/create-dataset)
- [Palantir, dataset-basics](https://www.palantir.com/docs/foundry/api/datasets-resources/datasets/dataset-basics)
- [Palantir, get-dataset](https://www.palantir.com/docs/foundry/api/datasets-resources/datasets/get-dataset)
- [Palantir, read-table](https://www.palantir.com/docs/foundry/api/datasets-resources/datasets/read-table)
- [Palantir, delete-file](https://www.palantir.com/docs/foundry/api/datasets-resources/files/delete-file)
- [Palantir, file-basics](https://www.palantir.com/docs/foundry/api/datasets-resources/files/file-basics)
- [Palantir, get-file-content](https://www.palantir.com/docs/foundry/api/datasets-resources/files/get-file-content)
- [Palantir, get-file-metadata](https://www.palantir.com/docs/foundry/api/datasets-resources/files/get-file-metadata)
- [Palantir, list-files](https://www.palantir.com/docs/foundry/api/datasets-resources/files/list-files)
- [Palantir, upload-file](https://www.palantir.com/docs/foundry/api/datasets-resources/files/upload-file)
- [Palantir, abort-transaction](https://www.palantir.com/docs/foundry/api/datasets-resources/transactions/abort-transaction)
- [Palantir, commit-transaction](https://www.palantir.com/docs/foundry/api/datasets-resources/transactions/commit-transaction)
- [Palantir, create-transaction](https://www.palantir.com/docs/foundry/api/datasets-resources/transactions/create-transaction)
- [Palantir, get-transaction](https://www.palantir.com/docs/foundry/api/datasets-resources/transactions/get-transaction)
- [Palantir, transaction-basics](https://www.palantir.com/docs/foundry/api/datasets-resources/transactions/transaction-basics)

## 관련 문서

- [[Palantir-Data-APIs]]
- [[Palantir-API-Client-Contract]]
- [[Palantir-Python-Dataset-IO]]
