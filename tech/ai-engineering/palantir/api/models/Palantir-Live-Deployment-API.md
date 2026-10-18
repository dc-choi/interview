---
tags: [palantir, foundry, api, model, inference, deployment]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Live Deployment의 상태와 Inference 준비

Live Deployment는 모델 버전을 실시간 inference로 제공할 compute를 관리한다. create 응답은 provision 시작이며 serving 준비 완료의 증거가 아니다. 아래 endpoint는 모두 Preview(preview=true)다.

## Branch를 추적하는 직접 배포

`POST /api/v2/models/liveDeployments`는 deploymentType과 runtimeConfiguration을 받는다. 현재 create의 direct 유형은 modelRid와 branch가 필수이고 그 branch의 최신 버전을 추적한다. description의 특정 version 배포 표현만 보고 modelVersionRid를 create body에 임의 추가하지 않는다.

GET `/liveDeployments/{liveDeploymentRid}`는 실제 modelVersion과 runtime/status를 반환한다. GET `/liveDeployments?modelRid=...`는 optional branch로 필터링하며 **direct 배포만** 나열한다. 다른 deployment type까지 모두 보이는 목록이 아니고 pagination token도 이 응답에는 없다.

create/replace/start/disable은 `api:models-write`, get/list는 `api:models-read`, transformJson은 `api:models-execute`다. 배포 권한과 모델/연결 자원의 실제 접근 조건도 함께 확인한다.

## Replica, Thread와 Autoscaling

runtimeConfiguration의 minReplicas/maxReplicas는 필수다. optional CPU와 memory는 request와 limit에 같은 값으로 설정한다. memory는 256MiB/1GiB 같은 문자열이다. GPU는 count가 필수이고 type 생략 시 허용된 아무 type을 쓸 수 있다. enum에 있어도 실제 queue에 없으면 GpuTypeNotAvailable이다.

threadCount 기본은 32이며 replica 하나에 보내는 동시 요청 수도 바꾼다. capacity는 실행 replica 수 × threadCount다. scalingConfiguration의 scaleUpLoadThreshold(0~1), scaleUpDelay와 scaleDownDelay가 필수다. load가 threshold를 지정 시간 넘으면 scale up한다. 설명은 scale-down threshold를 언급하지만 별도 scaleDownLoadThreshold 입력 필드는 없으므로 임의로 보내지 않는다.

sources는 연결 RID 목록, environmentVariables는 문자열 map이다. reserved 변수명, 과도한 thread 수, GPU count/type 오류를 구분한다. sources는 같은 Project에 있거나 reference로 import되어야 하며 effective Marking 전부의 export와 Compute Modules 사용이 허용되어야 한다. [[Palantir-Connection-API]]의 export 설정과 연결된다.

## ACTIVE와 Ready는 다른 상태다

status.state는 ACTIVE/STARTING/DEGRADED/DISABLED/FAILED, isReady는 실제 inference 요청 준비 여부다. autoscale to zero이면 ACTIVE인데 isReady=false일 수 있다. state 하나만 보고 요청을 보내거나 실패를 확정하지 않는다.

`PUT /liveDeployments/{liveDeploymentRid}`는 runtimeConfiguration을 갱신해 replica에 적용한다. sources 변경은 실행 중 불가하고 disable 상태여야 한다. UnsupportedLiveDeployment 오류는 API가 다루지 못하는 배포 유형을 의미한다.

`POST /liveDeployments/{liveDeploymentRid}/disable`은 실행 replica를 제거하지만 모델/runtime 설정을 유지한다. `/start`는 시작 중/실행 중이면 효과가 없다. disable을 리소스 영구 삭제나 구성 초기화로 취급하지 않는다.

## JSON Inference의 Timeout과 결과

`POST /liveDeployments/{liveDeploymentRid}/transformJson`의 input은 Model API input name별 데이터다. 응답 output도 output name별 값이다. schema에서 input/output이 any map의 optional field이지만 실제 모델 인터페이스에 맞아야 한다. 일반 chat completion payload를 보내는 endpoint가 아니다.

InferenceTimeout은 5분 안에 응답하지 못한 경우다. 높은 부하나 모델 실행 지연을 살핀다. InferenceInvalidInput은 errorType으로 검증 원인을, InferenceFailure는 errorMessage로 모델 실행 오류/내부 문제를 확인한다. 후자가 INVALID_ARGUMENT code라고 해서 전부 client 입력 오류라고 결론 내리지 않는다.

공개 명세를 검토했으며 실제 provision, autoscaling, source 연결이나 inference를 수행하지 않았다. 재시도 중복 방지와 준비 시간은 별도 명세 보장이 없으므로 [[Palantir-API-Client-Contract]]와 실제 상태로 판단한다.

## 출처

- [Palantir, Create Live Deployment](https://www.palantir.com/docs/foundry/api/models-v2-resources/live-deployments/create-live-deployment)
- [Palantir, Get Live Deployment](https://www.palantir.com/docs/foundry/api/models-v2-resources/live-deployments/get-live-deployment)
- [Palantir, List Live Deployments](https://www.palantir.com/docs/foundry/api/models-v2-resources/live-deployments/list-live-deployments)
- [Palantir, Replace Live Deployment](https://www.palantir.com/docs/foundry/api/models-v2-resources/live-deployments/replace-live-deployment)
- [Palantir, Start Live Deployment](https://www.palantir.com/docs/foundry/api/models-v2-resources/live-deployments/start-live-deployment)
- [Palantir, Disable Live Deployment](https://www.palantir.com/docs/foundry/api/models-v2-resources/live-deployments/disable-live-deployment)
- [Palantir, Transform JSON Live Deployment](https://www.palantir.com/docs/foundry/api/models-v2-resources/live-deployments/transform-json-live-deployment)
