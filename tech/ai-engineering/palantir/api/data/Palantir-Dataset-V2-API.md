---
tags: [palantir, foundry, api, dataset, transaction]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Dataset v2 API"]
---

# Dataset v2의 파일, transaction과 운영 연결

Dataset v2는 dataset/branch/file/transaction을 구분하며 별도로 schema와 View 관리 기능을 제공한다. v1과 비슷한 개념이라도 field 이름, 경로와 필수 인자가 달라 호출을 major version별로 대조해야 한다. 이 문서의 공통 prefix는 `/api/v2/datasets`다.

## v1에서 옮길 때 대조할 차이

| 항목 | v2 계약 |
|---|---|
| branch 선택 | 여러 endpoint에서 v1 branchId 대신 branchName |
| Create Branch body | branch 이름은 `name`, 선택적 transactionRid |
| Branch 응답 | `name`과 선택적 transactionRid |
| Upload File | POST `/{datasetRid}/files/{filePath}/upload`, filePath가 path parameter |
| Create Transaction body | transactionType이 필수 |
| File metadata endpoint | Get File, content 다운로드와 별도 |

Branch 응답의 transactionRid는 가장 최근 **OPEN 또는 COMMITTED** transaction이며 ABORTED는 아니다. 이 참조를 committed 데이터의 최신 위치로 단정하지 않는다. 반면 새 branch의 초기 참조로 지정하는 transaction은 committed여야 한다.

branch 이름은 빈 값이나 RID/UUID 형태를 쓸 수 없다. 생성 dataset은 name/parentFolderRid를 받고 default branch를 만들며 많은 enrollment에서 master를 쓴다. 실제 default를 모든 환경의 고정값으로 처리하지 않는다.

## 명시적 transaction과 자동 파일 변경

transaction은 branch당 open 하나만 허용한다. APPEND/UPDATE/SNAPSHOT/DELETE 유형과 OPEN/COMMITTED/ABORTED 상태를 갖는다. commit은 파일 변경을 보존하고 branch 참조를 갱신하며 abort는 변경을 보존하지 않고 branch도 갱신하지 않는다.

upload/delete의 기본 경로는 새 transaction을 만들고 commit한다. 여러 파일을 한 transaction으로 묶으려면 Create Transaction 뒤 transactionRid를 각 요청에 전달하고 별도 commit/abort를 수행한다. 수동 delete는 DELETE transaction을 요구한다. upload 자동 transaction의 기본 type은 UPDATE다.

upload는 binary body와 `application/octet-stream`을 사용한다. 상대 filePath는 앞 `/`로 시작하면 안 된다. 같은 transaction의 기존 경로 충돌과 다른 transaction의 새 파일 버전이 최신 view를 대체하는 효과를 구분한다. delete 이후에도 historical view에서 파일이 보일 수 있어 보안 purge로 취급하지 않는다.

읽기/쓰기 scope는 각각 `api:datasets-read`, `api:datasets-write`다. 이미 닫힌 transaction에 재요청이 성공할 것으로 가정하지 않으며 결과가 불명확하면 Get Transaction으로 실제 상태를 확인한다. 권한 거부와 상태 오류는 별도로 처리한다.

## 파일 읽기의 범위와 제한

Get File, Get File Content와 List Files는 branch의 최신 view, endTransactionRid 시점의 view, start/end transaction 범위와 단일 transaction 변경을 구분한다. snapshot이 없으면 가장 이른 ancestor부터 해석하고 중간 snapshot은 이전 파일을 view에서 제거할 수 있다. 같은 root-to-leaf 경로가 아닌 start/end 조합은 undefined다.

List Files의 pathPrefix는 파일 경로의 시작 문자열로 필터링하며 파일 전체 경로와 정확히 같으면 그 파일만 반환한다. pageSize/pageToken과 nextPageToken으로 순회한다. Get File의 metadata와 Get File Content의 binary 본문을 혼동하지 않는다.

Get File Content에는 enrollment의 최대 다운로드 크기가 적용될 수 있으며 초과하면 FileSizeLimitExceeded가 fileSizeBytes/maxFileSizeBytes 문맥을 제공한다. 이 제한을 attachment 상한이나 readTable row 상한과 같은 값으로 취급하지 않는다.

## Transaction history의 두 범위

Dataset 전체 transaction 목록은 GET `/{datasetRid}/transactions`, branch history는 GET `/{datasetRid}/branches/{branchName}/transactions`다. Preview opt-in을 요구하고 최근순 결과와 page token을 제공한다. branch history의 pageSize는 기본 20, 최대 50이다. 이 수치를 dataset 전체 목록의 별도 설명이 없는 최대값으로 확장하지 않는다.

## 데이터 상태와 처리 자원을 연결한다

### Data Health는 정의 목록과 최신 Report를 나눈다

Get Dataset Health Checks는 설정된 check RID 목록, Get Dataset Health Check Reports는 check별 최신 report map을 반환한다. check가 아직 report를 만들지 않았다면 map 값이 없을 수 있다. 응답 부재를 통과로 해석하지 않는다.

두 endpoint는 `api:data-health-read`와 `api:datasets-read`를 함께 요구하고 Preview다. Report에는 실행 당시 config snapshot과 6종 status가 들어간다. 상세 해석은 [[Palantir-Data-Health-API]]를 따른다. dataset별 최신 map과 특정 check의 제한된 최근 이력 목록을 전체 report history와 혼동하지 않는다.

### Job과 Schedule은 조회 신선도가 다르다

Get Dataset Jobs는 POST지만 job RID 목록 조회다. `api:datasets-read`와 Preview를 요구한다. 기본은 시작 시각 내림차순이며 orderBy는 시작/종료 시각과 오름/내림을 선택한다. where는 제출/완료 시각의 GTE/LT 경계를 and/or로 결합한다. 페이지 인자는 별도 query다.

Get Dataset Schedules는 dataset을 대상으로 하는 schedule RID를 반환한다. `api:orchestration-read`와 `api:datasets-read`가 함께 필요하다. 최근 변경, 특히 Marketplace 관리 schedule 변경은 응답 반영까지 최대 1시간 걸릴 수 있다고 명시된다. 삭제/추가 직후의 응답을 현재 scheduling 설정의 즉시 증거로 삼지 않는다.

## 별도 자원으로 다룰 계약

- [[Palantir-Dataset-Schema-API|Schema 읽기/쓰기, batch와 테이블 export]]
- [[Palantir-Dataset-View-API|View의 backing dataset, primary key와 marking]]
- [[Palantir-Dataset-V1-API|이전 v1 경로의 상세 계약]]

Dataset endpoints의 restricted/unmaterialized view 제약과 개별 endpoint의 View 지원 조건을 확인한다. View 관리 API가 존재한다는 이유로 일반 파일/테이블 IO의 지원 범위를 확대하지 않는다.

공식 v2 전체 schema와 호출 설명을 대조했으며 실제 파일 변경, transaction history와 Health/Job/Schedule 조회는 시험하지 않았다.

## 출처

- [Palantir, datasets-v2-resources](https://www.palantir.com/docs/foundry/api/datasets-v2-resources)
- [Palantir, branches](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/branches)
- [Palantir, branch-basics](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/branches/branch-basics)
- [Palantir, create-branch](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/branches/create-branch)
- [Palantir, delete-branch](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/branches/delete-branch)
- [Palantir, get-branch](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/branches/get-branch)
- [Palantir, get-branch-transaction-history](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/branches/get-branch-transaction-history)
- [Palantir, list-branches](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/branches/list-branches)
- [Palantir, datasets](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets)
- [Palantir, create-dataset](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/create-dataset)
- [Palantir, dataset-basics](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/dataset-basics)
- [Palantir, get-dataset](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/get-dataset)
- [Palantir, get-dataset-health-check-reports](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/get-dataset-health-check-reports)
- [Palantir, get-dataset-health-checks](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/get-dataset-health-checks)
- [Palantir, get-dataset-jobs](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/get-dataset-jobs)
- [Palantir, get-dataset-schedules](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/get-dataset-schedules)
- [Palantir, list-transactions-of-dataset](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/datasets/list-transactions-of-dataset)
- [Palantir, files](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/files)
- [Palantir, delete-file](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/files/delete-file)
- [Palantir, file-basics](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/files/file-basics)
- [Palantir, get-file](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/files/get-file)
- [Palantir, get-file-content](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/files/get-file-content)
- [Palantir, list-files](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/files/list-files)
- [Palantir, upload-file](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/files/upload-file)
- [Palantir, transactions](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/transactions)
- [Palantir, abort-transaction](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/transactions/abort-transaction)
- [Palantir, commit-transaction](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/transactions/commit-transaction)
- [Palantir, create-transaction](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/transactions/create-transaction)
- [Palantir, get-transaction](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/transactions/get-transaction)
- [Palantir, transaction-basics](https://www.palantir.com/docs/foundry/api/datasets-v2-resources/transactions/transaction-basics)

## 관련 문서

- [[Palantir-Data-APIs]]
- [[Palantir-Dataset-Schema-API]]
- [[Palantir-Dataset-View-API]]
- [[Palantir-Data-Health-API]]
