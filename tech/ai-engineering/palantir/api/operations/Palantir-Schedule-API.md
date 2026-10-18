---
tags: [palantir, foundry, api, orchestration, schedule]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Schedule 설정, 버전과 Run의 결과

Schedule은 recurring Build의 설정이고 ScheduleVersion은 그 설정의 특정 버전이다. ScheduleRun은 trigger를 처리한 기록이다. Run 제출 성공, 실제 Build 생성과 Build 완료는 서로 다른 단계다.

## Scope가 향후 실행 대상을 바꾼다

`POST /api/v2/orchestration/schedules`로 생성하고 `PUT /schedules/{scheduleRid}`로 교체한다. 두 작업은 Preview(`preview=true`)와 `api:orchestration-write` scope를 요구한다. body의 action은 필수이며 displayName/description, trigger와 scopeMode는 optional이다. replace를 일부 필드만 patch하는 계약으로 가정하지 않는다.

scopeMode는 user 또는 project다. user는 연결된 사용자가 Build할 권한이 있는 resource를 발견하므로 그 사용자의 권한이 나중에 바뀌면 output 범위가 변하거나 실행이 실패할 수 있다. project는 명시한 projectRids로 Build 범위를 제한한다. 공식 명세도 이 조건에서 project scope를 검토하도록 권한다.

action의 target은 manual/upstream/connecting이며 의미는 [[Palantir-Build-Job-API]]와 같다. branchName, fallbackBranches, forceBuild, retryCount/backoff, abortOnFailure와 notificationsEnabled를 설정한다. create/replace 입력에서 optional인 설정이 응답 action에서는 필수 값으로 채워질 수 있으므로 입력/응답 schema를 구별한다.

notificationsEnabled의 알림은 마지막으로 Schedule을 편집한 사용자에게 간다. project scope에서는 알림을 보내지 않는다고 명시한다. 실행 주체, 생성자와 알림 수신자가 항상 같다고 가정하지 않는다.

## Trigger의 사건과 시간

| trigger | 조건 |
|---|---|
| time | 분/시/일/월/요일의 5필드 CRON과 java.time.ZoneId 문자열 |
| jobSucceeded | 지정 dataset/branch의 Job 성공 |
| datasetUpdated / tableUpdated | 지정 branch에 새 transaction commit |
| newLogic | dataset/branch에 새 JobSpec 게시 |
| mediaSetUpdated | transactional이면 commit, non-transactional이면 update 후 eventual event |
| scheduleSucceeded / scheduleFailed | 지정 Schedule action의 성공/실패 |
| or / and | 하나라도 event 발생 / 전부 event 발생 후 |
| manual | 수동 실행만, AND/OR 안에서는 무시됨 |

non-transactional Media Set update의 event는 즉시라는 보장이 없다. and를 단순 동시 timestamp 일치나 특정 기간 window로 확장하지 않는다. 명세가 제공하는 것은 모든 trigger의 event 이후라는 의미다.

Schedule.trigger는 요청자가 볼 권한이 없으면 비어 있을 수 있다. 필드 부재를 trigger 미설정으로 단정하지 않는다. timeZone을 명시적으로 보존하고 서버의 임의 기본 timezone으로 바꾸지 않는다.

## 조회와 설정 수명주기

`GET /schedules/{scheduleRid}`와 `POST /schedules/getBatch`는 Preview와 orchestration-read scope를 사용한다. batch 최대 1,000개이며 존재하지 않거나 접근할 수 없는 Schedule은 RID map에서 빠진다. trigger visibility와 전체 Schedule visibility의 누락을 구별한다.

`POST /schedules/{scheduleRid}/getAffectedResources`도 Preview/read scope이며 대상 datasets 목록을 반환한다. field 이름은 datasets지만 값 schema는 BuildableRid 목록이다. 현재 권한과 설정에서 계산한 영향 대상을 이후 모든 실행의 불변 목록으로 캐시하지 않는다.

응답 Schedule에는 currentVersionRid, created/updated 시간과 사용자, paused, action과 scopeMode가 있다. 특정 버전은 Preview `GET /scheduleVersions/{scheduleVersionRid}`로 읽는다. `GET /scheduleVersions/{scheduleVersionRid}/schedule`은 연결된 Schedule을 반환하므로 버전 snapshot 자체와 구별한다.

`POST /schedules/{scheduleRid}/pause`, `/unpause`와 `DELETE /schedules/{scheduleRid}`는 write scope를 요구한다. 이 endpoint들의 명세에는 Preview 요구가 붙어 있지 않다. pause가 이미 실행 중인 Build까지 취소한다는 설명도 없으므로 Build cancel과 혼용하지 않는다.

## Run이 제출되었다고 Build가 성공한 것은 아니다

`POST /schedules/{scheduleRid}/run`은 write scope로 ScheduleRun을 반환한다. `GET /schedules/{scheduleRid}/runs`는 read scope로 최근 Run을 paging하며 pageSize 기본값은 100이다. pageToken/nextPageToken으로 이어서 조회한다.

Run은 rid, scheduleRid, scheduleVersionRid, createdTime을 담는다. createdBy는 수동 호출 사용자이고 자동 trigger이면 비어 있다. result가 없으면 아직 trigger 처리를 진행 중이다.

- ignored: 모든 target이 최신이어서 Build를 실행하지 않았다.
- submitted: Build가 제출되었으며 buildRid로 실제 상태를 별도 조회한다.
- error: trigger 실행 시의 errorName과 description을 확인한다.

Run errorName은 TARGETRESOLUTIONFAILURE, CYCLICDEPENDENCY, INCOMPATIBLETARGETS, PERMISSIONDENIED, JOBSPECNOTFOUND, SCHEDULEOWNERNOTFOUND, INTERNAL을 구별한다. HTTP 성공 안의 result.error와 HTTP 자체의 permission 오류를 별도로 처리한다.

공개 명세를 대조했으며 Schedule 생성/변경, trigger 지연이나 실제 Run을 시험하지 않았다. 비동기 polling과 공통 제한은 [[Palantir-API-Client-Contract]]를 따른다.

## 출처

- [Palantir, Create Schedule](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/create-schedule)
- [Palantir, Replace Schedule](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/replace-schedule)
- [Palantir, Get Schedule](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/get-schedule)
- [Palantir, Get Schedules Batch](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/get-schedules-batch)
- [Palantir, Get Affected Resources](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/get-affected-resources-schedule)
- [Palantir, Get Schedule Version](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedule-versions/get-schedule-version)
- [Palantir, Get Schedule Of Schedule Version](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedule-versions/get-schedule-of-schedule-version)
- [Palantir, Run Schedule](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/run-schedule)
- [Palantir, List Runs Of Schedule](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/list-runs-of-schedule)
- [Palantir, Pause Schedule](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/pause-schedule)
- [Palantir, Unpause Schedule](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/unpause-schedule)
- [Palantir, Delete Schedule](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/schedules/delete-schedule)
