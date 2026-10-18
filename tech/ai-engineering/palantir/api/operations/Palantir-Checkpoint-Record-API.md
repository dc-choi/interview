---
tags: [palantir, foundry, api, checkpoints, governance]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 체크포인트 기록 API"]
---

# 민감 작업을 허용한 Checkpoint 기록 조회

Checkpoint Record는 민감한 작업이 진행될 수 있었던 결정, 당시 문맥과 사용자의 justification을 담는다. Record API는 이 기록을 조회하고 검색한다. checkpoint 정책 생성, 승인 처리나 새로운 민감 작업의 실행 API로 해석하지 않는다.

## 조회와 접근 권한

세 endpoint 모두 Preview이며 `preview=true`와 OAuth2 scope `api:checkpoints-read`를 요구한다. scope를 보유해도 해당 기록에 대한 실제 접근 권한이 별도로 필요하다.

| 동작 | 경로와 결과 |
|---|---|
| 단건 조회 | `GET /api/v2/checkpoints/records/{recordRid}`, Record 반환 |
| batch 조회 | `POST /api/v2/checkpoints/records/getBatch`, `{recordRid}` 배열, 최대 100개 |
| 검색 | `POST /api/v2/checkpoints/records/search`, 조건과 페이지 정보를 body에 전달 |

batch 결과의 `data`는 Record RID를 key로 하는 map이다. 존재하지 않거나 접근할 수 없는 기록은 응답에서 빠진다. 요청 수와 반환 수의 차이를 삭제 여부나 특정 실패 원인으로 단정할 수 없다. 입력 순서와 같은 길이의 배열도 아니다.

단건 조회에는 `CheckpointRecordNotFound`, `CheckpointRecordPermissionDenied`, `RecordNotFound`가 명시되어 있다. 검색에는 `SearchRecordsPermissionDenied`가 있다. endpoint별 오류 목록이 비어 있어도 공통 인증/제한 오류까지 없다는 뜻은 아니다.

## 기록은 당시 상태의 스냅샷이다

필수 필드는 `rid`, `type`, `scope`, `actingUser`, `createdAt`, `justification`이다. `scope`는 `USER_SCOPED` 또는 `RESOURCE_SCOPED`다. configuration, delegate user, project, organization, namespace, interaction RID와 Approvals task/subtask 연결은 optional이다.

`checkpointedItems`는 당시 포착한 대상들의 tagged union이다. resource, job, schedule, job specification, language model/session, group, user intake submission/input, object set, marking, Marketplace product, peering job, role, intervention, token, principal, action type을 구분한다. 대상 식별자만 모아 같은 RID 종류로 취급하면 안 된다.

resource snapshot은 RID와 resourceType, Compass path를 담고 name/project/namespace/organization markings가 추가될 수 있다. object set은 versioned RID와 objectSetVersion을 포함하거나 types proxy로 표현된다. 관련 ontology RID/version, object type RID 목록을 함께 보관할 수 있다. 현재 원본 리소스 상태로 자동 치환하면 당시 의사결정의 문맥을 잃는다.

사용자명, resource name과 Compass path는 단순 문자열이 아니라 `value`와 `redactionType`을 담는 객체일 수 있다. `USER_REDACTED`, `RESOURCE_REDACTED`와 값 부재를 보존한다. redacted 값을 빈 문자열로만 평탄화하면 비공개 처리와 실제 빈값을 구별할 수 없다.

## Justification의 유형

| 유형 | 필수 문맥과 응답 |
|---|---|
| `responseJustification` | 자유 입력 `response`, `prompt`, `title` |
| `dropdownJustification` | `prompt`, `title`, 선택 항목마다 `selectedOption`, optional `additionalResponse` |
| `reauthenticationJustification` | `reauthenticationId`, `prompt`, `title` |
| `acknowledgementJustification` | `prompt`, `title`, 체크박스 동의 문맥 |

모두 추가 description이 있을 수 있다. `justification`이 항상 자유 입력 텍스트라는 전제로 로그를 수집하지 않는다. 기록을 조회했다는 사실은 재인증을 다시 수행했거나 현재 접근을 승인했다는 뜻도 아니다.

## 검색 조건과 페이지 처리

body의 `where.filter`는 필수다. `and`, `or`, `not`으로 조건을 조합한다. `eq`는 record/config/type, acting/delegate user, organization/namespace/interaction, checkpointed item type을 조회한다. 생성 시각은 `gte` 포함 하한과 `lt` 제외 상한으로 범위를 잡을 수 있다.

justification의 response, selected option, additional response를 `textSearch`로 검색하며 matchType은 `EXACT` 또는 `CONTAINS`다. 대상 ID 검색은 `checkpointedItemId` tagged union을 쓴다. 예를 들어 group/token/role은 ID, resource/job은 RID, peering job은 ID와 relationship RID를 함께 식별한다.

`pageSize` 기본값은 100, `sortDirection` 기본값은 생성 시각 역순 `DESC`다. `ASC`도 지원한다. 후속 body의 `pageToken`에는 응답의 `nextPageToken`을 사용한다. 예제 token 내부가 JSON처럼 보여도 이를 해석하거나 직접 생성하는 계약은 아니다. 영구 checkpoint 또는 변경 중인 검색 결과의 snapshot 일관성도 이 endpoint에서 보장하지 않는다.

이 기록은 공개 명세의 계약을 대조한 것이며 실제 조직 기록, redaction과 검색 실행을 시험하지 않았다. Preview 변경과 공통 제한은 [[Palantir-API-Client-Contract]]를 함께 확인한다.

## 출처

- [Palantir, Record basics](https://www.palantir.com/docs/foundry/api/checkpoints-v2-resources/records/record-basics)
- [Palantir, Get Record](https://www.palantir.com/docs/foundry/api/checkpoints-v2-resources/records/get-record)
- [Palantir, Get Records Batch](https://www.palantir.com/docs/foundry/api/checkpoints-v2-resources/records/get-records-batch)
- [Palantir, Search Records](https://www.palantir.com/docs/foundry/api/checkpoints-v2-resources/records/search-records)

## 관련 문서

- [[Palantir-Audit-Log-API]]
- [[Palantir-Security-and-Governance]]
