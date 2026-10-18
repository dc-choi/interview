---
tags: [palantir, foundry, api, model, versioning]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Model 컨테이너와 불변 Model Version

Model은 버전을 보관하는 resource이고 Model Version은 직렬화한 데이터와 실행 코드를 포함한 불변 snapshot이다. Model 생성, 버전 선택, 배포 준비와 inference 성공을 각각 추적한다.

아래 endpoint는 모두 Preview이며 `preview=true`가 필요하다. 조회는 `api:models-read`, 생성/promote/function 변경은 `api:models-write` scope다. 실제 resource 권한은 scope와 별도로 확인한다.

## 생성과 조회, Branch

`POST /api/v2/models`는 name과 parentFolderRid를 받아 **버전이 없는** Model을 만든다. `GET /models/{modelRid}`의 Model 응답은 RID다. 이 응답만으로 모델 입출력이나 실행 가능성을 알 수 없다.

`GET /models/{modelRid}/versions/{modelVersionRid}`로 Model Version을 읽고 `GET /models/{modelRid}/versions`로 branch별 버전을 pageToken/pageSize와 nextPageToken으로 조회한다. branch 기본값은 대부분 enrollment에서 master다. 최신순 정렬이 이 list 설명에 명시되지 않았으므로 첫 결과를 최신으로 확정하지 않는다.

버전에는 modelApi, createdTime, optional condaRequirements/backingRepositories/source/linkedExperiment가 있다. source는 imported container, external, Code Workspace+branch, Model Studio, Code Repository+branch, SDK 또는 promoted다. promoted에는 이전 Model/Version RID가 있다. legacy/internal source는 UnsupportedModelSource가 날 수 있어 존재하는 모든 버전을 public API로 표현할 수 있다고 단정하지 않는다.

## Model API의 입출력 Schema

modelApi는 이름 있는 inputs/outputs 목록이다. 유형은 parameter, tabular 또는 unsupported를 구분한다. parameter는 이름, required와 dataType을 갖는다. tabular는 columns와 PANDAS/SPARK format이며 기본 PANDAS다. input/output required와 column required는 기본 true이고 false면 null 또는 omission을 허용한다.

dataType은 date/boolean/string/array/double/integer/float/any/map/long/timestamp와 unsupported를 포함한다. array itemType과 map keyType/valueType은 재귀다. unsupported 표현을 수신했다고 실행 지원으로 바꾸지 않는다. dataframe format과 실제 HTTP inference JSON 직렬화는 다른 경계다.

## Promote는 새 RID를 만든다

`POST /models/{modelRid}/promoteVersion`은 sourceModelVersionRid를 target Model의 optional branch로 복사한다. 해당 branch의 최신 버전이 되지만 **새 Model Version RID**를 받는다. 원본 RID를 그대로 target에 붙였다고 기록하면 lineage를 잃는다. branch 기본은 대부분 master다.

promote 후 source.promoted의 previousModelRid/previousModelVersionRid와 새 rid를 구분한다. 결과가 불변이어도 branch를 따라가는 [[Palantir-Live-Deployment-API]]의 실제 serving version은 이후 바뀔 수 있다.

## Ontology Function으로 노출

`POST /models/{modelRid}/function`은 Model Function을 만든다. 이미 있으면 기존 function을 갱신한다고 명시되어 있다. apiName, isRowWise와 displayName은 필수다. ontologyBinding은 schema optional이지만 오류 계약은 create/replace 모두 필수라고 명시하므로 제공해야 한다.

`PUT /models/{modelRid}/function`은 apiName/isRowWise/ontologyBinding으로 교체하고 GET은 현재 function을 읽는다. create와 replace 입력 필드가 같지 않다. 응답은 functionRid/version, displayName, apiName, row-wise 여부와 Ontology binding을 포함한다.

Model API type이 function용으로 지원되지 않으면 ModelApiTypeUnsupportedForFunction(fieldName/unsupportedType), 이름이 잘못되면 InvalidFunctionApiName, binding이 없으면 OntologyBindingRequired다. OntologyNotFound/ModelFunctionNotFound/ModelNotFound 및 작업 권한 오류도 구별한다. model version의 모든 type을 자동으로 Ontology function으로 바꿀 수 있는 것은 아니다.

공개 계약을 검토했으며 Model 생성, promote, function 등록이나 실행을 시험하지 않았다.

## 출처

- [Palantir, Model basics](https://www.palantir.com/docs/foundry/api/models-v2-resources/models/model-basics)
- [Palantir, Create Model](https://www.palantir.com/docs/foundry/api/models-v2-resources/models/create-model)
- [Palantir, Get Model](https://www.palantir.com/docs/foundry/api/models-v2-resources/models/get-model)
- [Palantir, Get Model Version](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-versions/get-model-version)
- [Palantir, List Model Versions](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-versions/list-model-versions)
- [Palantir, Promote Version Model](https://www.palantir.com/docs/foundry/api/models-v2-resources/models/promote-version-model)
- [Palantir, Create Model Function](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-functions/create-model-function)
- [Palantir, Get Model Function](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-functions/get-model-function)
- [Palantir, Replace Model Function](https://www.palantir.com/docs/foundry/api/models-v2-resources/model-functions/replace-model-function)
