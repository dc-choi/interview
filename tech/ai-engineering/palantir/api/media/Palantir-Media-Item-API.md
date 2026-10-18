---
tags: [palantir, foundry, api, media, transaction]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Media Item 업로드와 조회의 식별 경계

Media Set 안의 Media Item RID, mediaItemPath와 mediaSetViewRid는 역할이 다르다. View는 독립된 item 모음이며 path는 사용자가 정한 식별자다. 같은 path로 여러 item을 쓰면 path 조회는 가장 나중에 쓴 항목을 반환한다. 특정 과거 항목을 고정하려면 path 문자열만 보관해서는 부족하다.

## 먼저 Media Set의 쓰기 정책을 확인한다

Preview `GET /api/v2/mediasets/{mediaSetRid}`는 schema 종류, defaultBranchName, transactionPolicy와 pathsRequired를 반환한다. `batchTransactions`는 branch별 transaction을 만들어야 하고 commit까지 쓰기가 보이지 않는다. `noTransactions`는 즉시 보이며 create/commit transaction 호출이 오류다.

schema 종류는 AUDIO/CAD/DICOM/DOCUMENT/IMAGERY/MODEL_3D/MULTIMODAL/SPREADSHEET/STREAMING_VIDEO/TILED_RASTER/VIDEO/EMAIL이다. 반환 schema 이름만으로 모든 변환 지원을 보장하지 않는다. branch name은 비어 있지 않고 256자 미만이며 유효한 RID 자체여서는 안 된다.

## 기존 Media Set에 쓰기

Preview `POST /api/v2/mediasets/{mediaSetRid}/items`는 파일 binary body와 `Content-Type: application/octet-stream`을 요구한다. query의 mediaItemPath는 pathsRequired일 때 필수다. path는 256자 미만이다.

branchName, branchRid, viewRid 중 최대 하나만 제공한다. 모두 생략하면 default branch이며 둘 이상이면 오류다. transactional Media Set이면 transactionId도 필수다. 응답의 mediaItemRid와 mediaSetViewRid를 보관한다.

custom mediaItemRid는 optional이며 일반적으로 서버 발급 RID를 권한다. 직접 지정하면 `ri.mio.<instance>.media-item.<UUID>` 형태이고 instance는 Media Set RID와 같아야 한다. 형식 오류는 InvalidMediaItemRid, 같은 RID가 이미 있으면 MediaItemRidAlreadyExists다. 클라이언트 발급 RID가 무조건 upsert나 idempotency key로 동작하는 것은 아니다.

## Transaction과 soft delete

| Preview 작업 | `/api/v2/mediasets/{mediaSetRid}` 아래 경로 |
|---|---|
| 생성 | `POST /transactions`, optional branchName |
| commit | `POST /transactions/{transactionId}/commit` |
| abort | `POST /transactions/{transactionId}/abort` |
| path soft delete | `DELETE /items/clearAtPath?mediaItemPath=...` |

생성 설명의 기본 브랜치는 대부분 enrollment에서 master지만 실제 defaultBranchName과 대조한다. open transaction의 업로드는 commit해야 사용 가능해지고 abort하면 그 transaction에서 업로드한 item이 삭제된다. Dataset API의 transaction 종류나 동시 open 개수 제한을 Media Set에 임의 적용하지 않는다.

clearAtPath는 해당 path의 최신 item과 더 오래된 item 모두를 조회 불가하게 한다. 단순히 최신 item만 지워 이전 항목을 다시 드러내는 작업이 아니다. branchName/branchRid/viewRid 상호 배제, 기본 branch와 transactionId의 조건은 업로드와 같다. transactional delete는 commit 이후 보인다.

transaction 응답 schema는 TransactionId 문자열이지만 예제는 `{transactionId: ...}` 객체로 제시되어 있다. 실제 SDK 타입/응답을 확인하기 전 어느 한쪽으로 고정 파싱하지 않는다.

## 읽기, Reference와 federated 등록

일반 `GET /items/{mediaItemRid}/content`는 현재 item content, `/original`은 추가 입력 형식의 자동 변환이 있었더라도 최초 업로드 원본을 반환한다. 둘 다 binary stream이며 JSON으로 강제 decode하지 않는다.

Preview `/items/getRidByPath`는 path와 branchName/branchRid/viewRid 중 하나로 조회한다. 응답 mediaItemRid는 optional이므로 빈 결과를 처리한다. `/items/{mediaItemRid}/reference`는 mimeType과 tagged reference를 제공한다. 현재 mediaSetViewItem에는 Media Set/View/Item RID와 optional token이 있다. token은 특정 item 읽기 권한을 부여하므로 일반 식별자와 분리해 보호한다.

Preview `POST /items/register`는 federated Media Set에만 해당한다. 실제 federated store 내 상대 경로 physicalItemName이 필수이고, 등록 시 schema 검증과 초기 metadata 추출을 한다. 파일 binary 업로드가 아니다. mediaItemPath, branchName/viewRid와 transactional transactionId를 지정할 수 있으며 응답은 item RID와 mediaType이다.

## 임시 업로드는 별도 API다

`PUT /api/v2/mediasets/media/upload`는 Media Set RID 없이 임시 항목을 올린다. **1시간 안에 영속화하지 않으면 삭제된다.** binary body와 octet-stream header가 필요하며 filename은 schema상 필수 query parameter다. 여러 usage attribution resource가 있다면 첫 번째에 귀속된다고 명시한다. 이 페이지는 attribution 전달 필드를 별도 열거하지 않으므로 임의 query를 만들지 않는다.

임시 upload scope는 `api:ontologies-read`와 `api:ontologies-write`다. 일반 Media Set read/write scope와 다르다. 일반 조회에는 `api:mediasets-read`, 쓰기에는 `api:mediasets-write`를 사용한다. Preview 표기가 있는 endpoint마다 preview=true를 붙인다. item content/original/info/metadata와 임시 upload에는 같은 Preview 표기가 없다.

각 endpoint의 errorResponses가 비어 있어도 공통 인증, 권한과 요청 제한 오류가 사라지는 것은 아니다. 공개 계약 확인이며 실제 업로드, transaction, token이나 보존 동작을 시험하지 않았다.

## 출처

- [Palantir, Get Media Set](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/get-media-set)
- [Palantir, Put Media Item](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/put-media-item)
- [Palantir, Create Media Transaction](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/create-media-transaction)
- [Palantir, Commit Media Transaction](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/commit-media-transaction)
- [Palantir, Abort Media Transaction](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/abort-media-transaction)
- [Palantir, Clear Media Item At Path](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/clear-media-item-at-path)
- [Palantir, Read Media Item](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/read-media-item)
- [Palantir, Read Original Media Item](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/read-original-media-item)
- [Palantir, Get Media Item RID By Path](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/get-media-item-rid-by-path)
- [Palantir, Get Media Item Reference](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/get-media-item-reference)
- [Palantir, Register Media Item](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/register-media-item)
- [Palantir, Upload Media](https://www.palantir.com/docs/foundry/api/media-sets-v2-resources/media-sets/upload-media)
