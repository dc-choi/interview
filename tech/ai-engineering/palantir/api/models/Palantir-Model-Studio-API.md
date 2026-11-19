---
tags: [palantir, foundry, api, model-studio, training]
status: done
verified_at: 2026-11-19
category: "AI엔지니어링(AIEngineering)"
---

# Model Studio의 Trainer, 설정 버전과 학습 Run

Model Studio는 준비된 trainer를 사용해 모델을 학습하는 resource다. Trainer는 studio들이 공유하는 학습 알고리즘과 input/output/config schema, Config Version은 학습 설정, Run은 실제 실행이다. 모두 Preview이며 preview=true가 필요하다.

## Trainer Schema를 먼저 읽는다

`GET /api/v2/models/modelStudioTrainers`는 사용할 수 있는 trainer 목록을 반환한다. `GET /modelStudioTrainers/{modelStudioTrainerTrainerId}`는 optional version을 받으며 생략하면 최신 버전이다. 두 endpoint는 `api:models-read` scope를 사용한다.

Trainer는 trainerId/version/name/description, task type, experimental과 customConfigSchema/inputs/outputs를 제공한다. type은 GENERIC/TIME_SERIES/TABULAR_REGRESSION/TABULAR_CLASSIFICATION/LLM_FINETUNING/VLM_FINETUNING이다. experimental은 호환성을 깨는 변경 가능성의 신호다.

customConfigSchema와 inputs/outputs는 any JSON schema이므로 고정된 하나의 AutoGluon 설정으로 처리하지 않는다. 공식 예제의 AutoGluon trainer는 metric, presets와 refit_full을 정의하고 추가 property를 거부하며 train/test input과 target column 조건을 설명한다. 예제의 20% holdout, 특정 trainer version이나 metric을 모든 trainer 기본값으로 일반화하지 않는다.

## Studio 생성과 Config Version

`POST /api/v2/models/modelStudios`는 name과 parentFolderRid가 필수다. create 예제는 name을 생략하지만 schema를 따라야 한다. GET `/modelStudios/{modelStudioRid}`는 RID, folderRid와 createdTime을 읽는다. create는 models-write, get은 models-read다.

`POST /modelStudios/{modelStudioRid}/configVersions`는 name, resources, workerConfig와 trainerId가 필수이며 optional changelog를 받는다. resources의 memory/CPU는 문자열이고 optional GPU type은 Project resource queue에서 가용해야 한다. Live Deployment의 numeric CPU/count GPU schema와 혼용하지 않는다.

workerConfig의 customConfig는 trainer JSON schema와 맞아야 한다. inputs는 alias별 dataset RID와 optional columnMapping/ignoreColumns/selectColumns다. columnMapping은 column type spec ID에서 column name 배열로 연결한다. selectColumns가 비어 있으면 ignoreColumns에 없는 모든 column을 쓴다. 빈 배열을 column 없음으로 바꾸지 않는다.

outputs는 alias별 Model RID다. 응답 Config Version은 integer version과 실제 trainer ID/version, workerConfig/resources, 생성 시각/사용자를 포함한다. 생성 입력에는 trainerId만 있고 trainer version 선택 필드는 없으므로 조회 응답의 실제 버전을 기록한다.

2026-11-19 수집한 Create, Get과 Latest 명세의 schema에서 optional resources.gpu는 A100, A10G, A16, B200, B300, H100, H200, L4, L40S, T4, V100 중 하나인 enum이다. 공개 페이지는 이 하위 속성을 접어 두고 예제에도 memory와 CPU만 보이므로 접힌 속성까지 확인한다. 같은 이름이 enum에 있어도 해당 GPU가 Project resource queue에 있어야 쓸 수 있다. 2026-11-08 대조한 model live와 Workspace의 GPU 사용량 배율 표와 목록이 다르다. A16과 L40S는 이 enum에만, RTX PRO 6000은 배율 표에만 있다([[Palantir-Model-Live-Usage]], [[Palantir-Workspace-Sessions-and-Checkpoints]]).

조회는 `/configVersions/{modelStudioConfigVersionVersion}`, 최신 단건은 `/configVersions/latest`, 전체 목록은 `/configVersions`다. 이름이 latestModelStudioConfigVersions여도 응답은 단일 Config Version이다. 목록은 pageToken/pageSize와 nextPageToken으로 계속 읽는다.

### Branch 선택

2026-11-17 수집한 Config Version의 Create, List, Get, Latest와 Launch, List Runs 명세에는 optional `branch` query parameter가 있다. 값은 branch RID나 dataset branch identifier이며 global branch를 가리켜야 한다. `main`, `master`를 포함한 non-global branch 이름은 `FoundryBranchNotFound`로 거부된다. 생략하면 default branch에서 만들거나 읽는다.

API에 `branch=main`을 넣지 않는다. default branch는 parameter를 생략하고, 다른 branch는 global branch의 RID나 dataset branch identifier로 지정한다. UI 문서가 초기 학습 위치로 부르는 `main`이 API의 default branch에 해당한다는 것은 추론이다. `branch`를 받는 여섯 명세 모두 `FoundryBranchNotFound`가 errorResponses 목록에는 없고 parameter 설명에만 나오므로 공통 오류 처리 경로에서도 받을 수 있게 둔다.

Launch에서 `branch`를 생략하면 default branch의 최신 Config Version으로 실행한다. 다른 branch에 config를 만들었다면 Launch에도 같은 branch를 넘긴다. 지정한 branch의 최신 config로 실행된다는 것은 생략 시 설명과 UI의 branch별 학습 설명에 근거한 해석이며, config가 없는 branch를 API로 Launch할 때의 동작은 명세에 없다. List Runs도 생략하면 default branch의 run만 반환하므로 branch에서 실행한 run은 같은 `branch`로 조회한다. branch별 configuration 복사와 병합 흐름은 [[Palantir-Model-Studio-Workflow]]를 따른다.

## Launch는 최신 Config를 실행한다

`POST /modelStudios/{modelStudioRid}/launch`는 body 없이 **최신 Config Version**으로 새 학습 Run을 시작한다. query로는 optional `branch`와 `preview`만 받으며 특정 과거 버전을 지정하는 인자는 없다. models-write scope를 사용하며 응답의 configVersion과 buildRid/jobRid를 추적한다. 반환 성공은 학습 완료가 아니다.

`GET /modelStudios/{modelStudioRid}/runs`는 optional `branch`와 configVersion으로 범위를 좁히고 pageToken/pageSize로 paging한다. errorResponses에는 ModelStudioConfigVersionNotFound(studioRid, configVersion)가 있으며 발생 조건은 명세에 없다. Run은 runId, build/job RID, configVersion, startedBy/time과 optional buildStatus/resolvedOutputs를 담는다. runId는 studio/config/build에서 유도한 식별자다.

resolvedOutputs는 alias별 Model RID와 생성한 Model Version RID, optional Experiment RID를 제공한다. configured output Model과 실제로 만든 버전/실험은 구별한다. buildStatus RUNNING/SUCCEEDED/FAILED/CANCELED와 없는 상태를 다루고 [[Palantir-Build-Job-API]]로 실행을 연결한다.

## 오류가 가리키는 단계

ModelStudioNotFound/ConfigVersionNotFound/TrainerNotFound는 각 선택자를 확인한다. Config Version 단건 Get은 ModelStudioNotFound와 ModelStudioConfigVersionNotFound(둘 다 404)를, Latest는 ModelStudioNotFound와 LatestModelStudioConfigVersionsPermissionDenied(403)를 명세에 둔다. 오류 parameter 이름은 오류 이름이 아니라 endpoint마다 다르다. ModelStudioNotFound는 Config Version Get과 Latest 명세에서 studioRid를, Get Model Studio 명세에서 modelStudioRid를 쓰고, ModelStudioConfigVersionNotFound도 Get에서는 (modelStudioConfigVersionVersion, modelStudioRid), List Runs에서는 (studioRid, configVersion)이다. 같은 endpoint 안에서도 NotFound와 validation 오류는 studioRid를, Latest, Create, Launch의 작업 전용 PermissionDenied는 modelStudioRid를 쓴다. 오류 본문에서 식별자를 꺼낼 때는 모든 오류에서 두 이름을 함께 받는다. CreateConfigValidationError의 validationFailures는 trainer schema, input/output과 compute 설정 검토에 사용한다. 작업 전용 권한 오류는 launch, create와 latest 명세에 있고 Get과 List 명세에는 없으므로, 이들의 권한 실패가 어떤 오류로 오는지는 명세로 알 수 없다. 공통 권한 오류와 제한도 처리한다.

공개 명세 확인이며 실제 trainer 가용성, GPU queue, 학습 Run이나 모델 품질을 시험하지 않았다.

## 출처

- [Palantir, Get Model Studio Trainer](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-trainers/get-model-studio-trainer)
- [Palantir, List Model Studio Trainers](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-trainers/list-model-studio-trainers)
- [Palantir, Create Model Studio](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studios/create-model-studio)
- [Palantir, Get Model Studio](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studios/get-model-studio)
- [Palantir, Create Config Version](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-config-versions/create-model-studio-config-version)
- [Palantir, Get Config Version](https://www.palantir.com/docs/foundry/api/v2/models-v2-resources/model-studio-config-versions/get-model-studio-config-version)
- [Palantir, Latest Config Version](https://www.palantir.com/docs/foundry/api/v2/models-v2-resources/model-studio-config-versions/latest-model-studio-config-versions)
- [Palantir, List Config Versions](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-config-versions/list-model-studio-config-versions)
- [Palantir, Launch Model Studio](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studios/launch-model-studio)
- [Palantir, List Model Studio Runs](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-runs/list-model-studio-runs)
