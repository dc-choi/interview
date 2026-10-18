---
tags: [palantir, foundry, api, orchestration, build]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Build와 Job을 별도로 추적한다

Build는 새로운 데이터 버전을 계산하는 실행 묶음이고 Job은 입력에서 하나 이상의 output을 계산하는 단위다. Build RID, Job RID와 output transaction을 구별한다. Schedule이 시작한 실행의 관계는 [[Palantir-Schedule-API]]에서 이어진다.

## 대상을 해석하는 세 방식

`POST /api/v2/orchestration/builds/create`는 필수 target과 optional branchName, fallbackBranches, forceBuild, retryCount, retryBackoffDuration, abortOnFailure, notificationsEnabled를 받는다. OAuth2 scope는 `api:orchestration-write`다.

| target 유형 | 포함 범위 |
|---|---|
| manual | targetRids를 직접 열거 |
| upstream | target과 모든 upstream, ignoredRids 제외 |
| connecting | inputRids 제외, targetRids 포함인 두 지점 사이, ignoredRids 제외 |

Buildable RID에는 Dataset뿐 아니라 Media Set, Restricted View도 포함된다. fallbackBranches는 target branch에 JobSpec이 없을 때 JobSpec을 찾는 브랜치들이다. 데이터가 없을 때 임의로 읽는 입력 브랜치 목록과 혼동하지 않는다.

forceBuild는 staleness를 무시할지 정한다. abortOnFailure는 어떤 Job이 최종적으로 실패하면 다른 Job들을 취소하고 Build를 종료하는 설정이다. retryCount와 backoff는 실패 Job의 재시도 정책이며 모든 실패가 retry 가능한 것은 아니다. 재시도를 모두 소진하거나 retry 불가능한 오류가 날 때 실패가 최종 확정된다.

응답 Build의 RUNNING은 계산 완료가 아니다. rid, branchName, createdTime/By, jobRids, retry/abort 설정과 status를 추적한다. scheduleRid는 Schedule이 시작했을 때만 존재하고 사용자 직접 실행이면 비어 있다. finishedTime도 실행 중에는 없다.

## 조회 제한과 페이지 처리

`GET /builds/{buildRid}`와 `POST /builds/getBatch`는 `api:orchestration-read`를 사용한다. 각 명세는 사용자당 초당 4요청과 동시 25요청 상한을 명시한다. Build batch 최대 크기는 100이며 data는 RID map이다. 이 제한을 전체 API의 일반 상한만 보고 높이지 않는다.

`GET /builds/{buildRid}/jobs`는 Job 목록을 pageToken/pageSize와 nextPageToken으로 반환한다. Build.jobRids가 있더라도 세부 상태와 output은 Job 응답을 확인한다. Build status는 RUNNING/SUCCEEDED/FAILED/CANCELED지만 Job status는 WAITING/RUNNING/SUCCEEDED/FAILED/CANCELED/DID_NOT_RUN이다. 대기나 실행하지 않은 Job을 Build의 네 가지 상태에 강제로 합치지 않는다.

## Job 시간과 output의 한계

`GET /api/v2/orchestration/jobs/{jobRid}`와 `POST /jobs/getBatch`는 Preview이므로 `preview=true`가 필요하다. read scope와 사용자당 초당 4요청/동시 25요청 제한이 있고, Job batch 최대 크기는 500이다. Build batch의 100과 다르다.

startedTime은 의존성 해결을 기다리기 시작한 시각이다. 실제 최신 attempt 실행 시작은 latestAttemptStartTime이며 Job이 시작하지 못하면 비어 있거나 오래된 값일 수 있다. startedTime부터 finishedTime까지를 곧바로 CPU 실행 시간으로 간주하지 않는다.

Job.outputs는 지원되는 Dataset와 transactional Media Set만 나열한다. 지원되지 않는 output 종류는 생략한다. 따라서 outputs 부재를 output 없음의 확정 증거로 삼지 않는다. Dataset output은 datasetRid와 optional outputTransactionRid, Media Set은 mediaSetRid와 optional transactionId를 제공한다.

## 취소 응답은 요청 접수다

`POST /builds/{buildRid}/cancel`은 아직 끝나지 않은 모든 Job에 취소를 요청한다. 비동기 endpoint라 성공 응답 뒤에도 Build status가 즉시 바뀌지 않는다. 요청 전 이미 끝났거나 취소 반영 전 완료되면 상태가 바뀌지 않을 수 있다. cancel 성공을 CANCELED의 증거로 처리하지 않고 후속 조회로 확인한다.

create/cancel permission 오류와 BuildNotFound/JobNotFound, 공통 인증/제한 오류를 구별한다. 비어 있는 endpoint별 errorResponses는 오류가 불가능하다는 의미가 아니다. 공개 명세를 확인했으며 실제 Build 실행, 재시도나 취소를 수행하지 않았다.

## 출처

- [Palantir, Create Build](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/builds/create-build)
- [Palantir, Get Build](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/builds/get-build)
- [Palantir, Get Builds Batch](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/builds/get-builds-batch)
- [Palantir, List Jobs Of Build](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/builds/list-jobs-of-build)
- [Palantir, Get Job](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/jobs/get-job)
- [Palantir, Get Jobs Batch](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/jobs/get-jobs-batch)
- [Palantir, Cancel Build](https://www.palantir.com/docs/foundry/api/orchestration-v2-resources/builds/cancel-build)

## 관련 문서

- [[Palantir-API-Client-Contract]]
- [[Palantir-Dataset-V2-API]]
- [[Palantir-Execution-Observability-API]]
