---
tags: [palantir, foundry, api, model-studio, training]
status: done
verified_at: 2026-10-16
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

조회는 `/configVersions/{modelStudioConfigVersionVersion}`, 최신 단건은 `/configVersions/latest`, 전체 목록은 `/configVersions`다. 이름이 latestModelStudioConfigVersions여도 응답은 단일 Config Version이다. 목록은 pageToken/pageSize와 nextPageToken으로 계속 읽는다.

## Launch는 최신 Config를 실행한다

`POST /modelStudios/{modelStudioRid}/launch`는 body 없이 **최신 Config Version**으로 새 학습 Run을 시작한다. 특정 과거 버전을 지정하는 인자를 임의로 추가하지 않는다. models-write scope를 사용하며 응답의 configVersion과 buildRid/jobRid를 추적한다. 반환 성공은 학습 완료가 아니다.

`GET /modelStudios/{modelStudioRid}/runs`는 optional configVersion으로 필터하고 paging한다. Run은 runId, build/job RID, configVersion, startedBy/time과 optional buildStatus/resolvedOutputs를 담는다. runId는 studio/config/build에서 유도한 식별자다.

resolvedOutputs는 alias별 Model RID와 생성한 Model Version RID, optional Experiment RID를 제공한다. configured output Model과 실제로 만든 버전/실험은 구별한다. buildStatus RUNNING/SUCCEEDED/FAILED/CANCELED와 없는 상태를 다루고 [[Palantir-Build-Job-API]]로 실행을 연결한다.

## 오류가 가리키는 단계

ModelStudioNotFound/ConfigVersionNotFound/TrainerNotFound는 각 선택자를 확인한다. CreateConfigValidationError의 validationFailures는 trainer schema, input/output과 compute 설정 검토에 사용한다. launch/create/get/latest의 작업 권한 오류와 공통 제한도 처리한다.

공개 명세 확인이며 실제 trainer 가용성, GPU queue, 학습 Run이나 모델 품질을 시험하지 않았다.

## 출처

- [Palantir, Get Model Studio Trainer](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-trainers/get-model-studio-trainer)
- [Palantir, List Model Studio Trainers](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-trainers/list-model-studio-trainers)
- [Palantir, Create Model Studio](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studios/create-model-studio)
- [Palantir, Get Model Studio](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studios/get-model-studio)
- [Palantir, Create Config Version](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-config-versions/create-model-studio-config-version)
- [Palantir, Get Config Version](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-config-versions/get-model-studio-config-version)
- [Palantir, Latest Config Version](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-config-versions/latest-model-studio-config-versions)
- [Palantir, List Config Versions](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-config-versions/list-model-studio-config-versions)
- [Palantir, Launch Model Studio](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studios/launch-model-studio)
- [Palantir, List Model Studio Runs](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-studio-runs/list-model-studio-runs)
