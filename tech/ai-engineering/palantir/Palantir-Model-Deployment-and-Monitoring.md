---
tags: [palantir, foundry, mlops, model-serving, model-monitoring]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 모델 배포와 모니터링", "Foundry Model Release and Serving"]
---

# Palantir 모델 배포와 모니터링

모델 운영은 후보 평가, release 지정, 실행 환경 갱신과 실제 추론 관찰을 잇는 과정이다. 모델을 등록했다고 운영 품질이 확보되거나, release를 바꿨다고 모든 산출물이 이미 갱신된 것은 아니다.

2026-10-16 공개 공식 문서의 해당 절을 대조했다. 실제 모델 학습, endpoint 호출과 장애 전환은 시험하지 않았다. Artifact와 adapter의 기본 계약은 [[Palantir-Data-and-Model-Integration]]에서 다룬다.

## 평가 check는 자동 강제 gate와 다르다

Modeling Objective에는 후보별로 검토자/그룹이 승인, 거절과 의견을 남길 check를 구성할 수 있다. 평가 dataset과 evaluation library가 만든 metric에 조건을 걸어 자동 check도 만들 수 있다. 그러나 2026-10-16 문서 기준 모든 check 승인이 release 생성의 필수 조건은 아니다. ([Set up checks](https://www.palantir.com/docs/foundry/manage-models/set-up-checks))

따라서 조직의 필수 기준을 check로 표현하는 것과 실제 배포를 차단하는 통제를 구분한다. Metric 누락 시 자동 check는 거절될 수 있지만, 그 상태가 release를 기술적으로 막는다고 가정하지 않는다.

## Release는 환경별 배포 대상을 바꾼다

Staging release는 운영 적용 전 downstream 활용을 시험할 모델이고, production release는 objective의 production deployment가 사용할 모델이다. 시험 후 objective owner가 staging을 production으로 지정한다. 새로운 release는 해당 환경의 이전 release를 대체하고 그 환경의 deployment들이 새 모델을 사용하도록 갱신된다. ([Release a model](https://www.palantir.com/docs/foundry/manage-models/release-model))

운영 전환에서 살필 것은 release 번호만이 아니다. 다음은 설계 점검이다.

- 새 모델의 입력/출력 이름과 타입이 기존 소비자와 호환되는가?
- Staging에서 실제 downstream 업무 결과를 확인했는가?
- Deployment의 갱신 완료와 health를 확인했는가?
- Batch output의 재계산까지 완료되었는가?

## Batch와 live는 산출물과 갱신 경로가 다르다

| 경로 | 실행과 산출물 | 추가 조건 |
|---|---|---|
| Modeling Objective batch | 입력 dataset을 모델에 적용하고 output dataset 생성 | 대응 환경 release, 입력 dataset과 build schedule |
| Modeling Objective live | API로 호출하는 지속 실행 deployment | 대응 환경 release, 실행 자원과 replica 구성 |

Objective에서 직접 구성하는 batch deployment는 단일 tabular dataset 입력 모델에 대응한다. 여러 입력이 필요한 adapter는 Python transform에서 batch inference를 구성할 수 있다. 새 release에 따른 output 갱신은 로직 변경 schedule을 만들어 연결할 수 있다. 모델 교체와 output dataset 재생성은 구분한다. ([Set up a batch deployment](https://www.palantir.com/docs/foundry/manage-models/set-up-batch))

Live deployment는 objective 없이 model page에서 직접 만드는 경로도 있다. Objective deployment의 release 관리 규칙을 direct deployment에 그대로 적용하지 않는다. Live의 status와 health가 준비 상태인지 확인하고 Query에서 실제 입력/출력을 시험한다. ([Set up and use a live deployment](https://www.palantir.com/docs/foundry/manage-models/set-up-live))

Direct model deployment의 2024년 9월 도입은 Compute Module 기반 autoscaling, 최소 0 replica와 model branch의 새 version 자동 추적을 설명했다. Objective production release를 고정하는 흐름과 다른 upgrade 경계다. 당시 on-premise, external model과 SparkML은 제외했으므로 현재 환경의 지원을 별도 확인한다. Arrow 기반 cast/type error는 API 타입 일관성을 위한 것이며 예측 정확도를 보장하지 않는다. ([September 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-09))

## Endpoint의 API 버전과 모델 계약을 함께 확인한다

Multi I/O endpoint는 `/v2`로 끝나며 여러 입력과 출력을 지원한다. JSON request/response의 구조는 배포된 모델의 API를 따른다. `POST`, JSON content type과 bearer token 인증을 사용한다. ([Live deployment API](https://www.palantir.com/docs/foundry/manage-models/live-deployment-reference))

2026-10-16 API reference는 single I/O 경로를 deprecated로 표기하고 Modeling Objective deployment에서만 지원한다고 명시한다. 기존 setup 문서의 single I/O 예시를 새 통합의 기본값으로 복사하지 않고 현재 API reference와 adapter 계약을 대조한다.

## Service health와 예측 품질을 분리한다

Live deployment의 Logs & Metrics에서는 시작, 패키지/모델 로딩과 실행 로그를 확인한다. 여러 replica의 로그는 `node_id`로 구별할 수 있다. Host metric은 host의 전체 프로세스 CPU/메모리이고, inference container metric은 모델 실행 container의 사용량이다. 2026-10-16 기준 container-based model에는 후자의 usage metric이 제공되지 않는다. ([Live deployment monitoring](https://www.palantir.com/docs/foundry/manage-models/set-up-live))

서비스가 건강하다는 표시는 예측이 업무상 맞다는 증거가 아니다. 요청 실패와 자원 압박, 데이터 분포 변화와 결과 정확도를 별도 질문으로 관찰해야 한다. 이 구분은 운영 설계 해석이다.

## Inference history는 민감한 운영 데이터다

Modeling Objective live deployment에 inference history dataset을 만들어 recording을 켜면 입력/출력, 요청 시각/식별자, 사용자, 모델과 버전, 오류 등을 남길 수 있다. 단순 서비스 로그와 달리 실제 입력과 예측을 담으므로 권한과 security marking을 함께 설계한다. ([Model inference history](https://www.palantir.com/docs/foundry/manage-models/model-inference-history))

- Dataset은 parent objective와 같은 project에 두어야 하며 기존 dataset을 지정할 수 없다.
- Recording toggle은 임시 중단/재개용이다.
- History 연결을 Remove하면 dataset은 남지만 새 기록이 중단되고 해당 dataset을 deployment에 다시 연결할 수 없다.

History는 drift 분석과 재학습의 입력이 될 수 있다. 예측값을 저장하는 것만으로 실제 정답이 생기거나 drift 검출이 자동 구성되는 것은 아니다. 업무 결과와 정답 label의 확보, 평가 주기와 대응 기준은 별도 설계가 필요하다.

Model experiment는 training attempt의 hyperparameter/metric을 API로 기록하고 비교하는 자산이다. 2025년 1월 도입은 `palantir_models` 0.1482.0 이후 binding과 Code Repositories/Code Workspaces를 설명했다. Training 실험의 지표, 공통 test set 평가와 live inference history를 같은 데이터로 취급하지 않는다. ([January 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-01))

MLflow integration은 `experiment.as_mlflow_run()` 안의 log를 해당 Foundry experiment로 routing하고 model version과 함께 publish한다. Image logging으로 validation image/ROC/confusion matrix를 남길 수 있고 parallel-coordinate chart로 parameter/metric을 비교한다. Run context 밖 기록과 model/experiment publish 여부를 확인하며 시각적 상관을 인과 효과로 단정하지 않는다. ([March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03))

## 개인 지식 시스템에 적용할 원리

Model Studio는 forecasting/classification/regression trainer, input dataset과 선택 parameter를 no-code로 구성하고 training run의 metric을 비교하는 경로다. 2025년 10월 beta와 2026년 2월 GA의 기본값과 UI가 데이터 분리, 대표 평가와 deployment health 검증을 대신하지 않는다. GA 당시 full Marketplace 지원과 time-series 직접 input은 후속 계획이었다. Training run 생성, 좋은 metric과 실제 production release를 별도로 확인한다.

다음은 현재 Vault 구현 사실이 아닌 설계 해석이다. 추출기나 검색 모델을 바꿀 때 후보 평가, 채택한 버전, 실제 색인/검색 배포와 실행 기록을 분리한다. 처리 성공, 출처 보존과 검색 품질을 같은 지표로 취급하지 않는다. 평가 결과를 기록하는 장치와 품질 미달의 운영 반영을 막는 장치가 각각 있는지 확인한다.

Builder trained-model node는 2026년 4월 Spark batch, warm pool off, tabular 단일 input/output 조건으로 도입됐다. Sidecar CPU/memory/GPU는 Spark executor profile과 별도로 설정한다. Build 시 current branch의 latest published model을 resolve하고 설정 fallback branch, 미설정이면 master를 사용했다. Preview/streaming/lightweight/time-series 확대는 당시 계획이었다. Model version pinning을 기대하는 소비자는 자동 resolve와 fallback을 명시적으로 확인한다.

Model evaluations는 Modeling Objective 없이 `ModelInput`이 불러온 단일 model version에 metric/image/plot/table을 붙인다. 2026년 7월 API는 `palantir_models` 0.2384.0 이상을 요구했다. 같은 방법론의 evaluation set에 실행마다 새 evaluation을 남기므로 방법론이 다르면 별도 set으로 나눈다. Version별 품질 비교와 training hyperparameter 기록은 다른 자산이며 당시 성능 기반 drift monitor는 후속 계획이었다.

## 출처

- [Palantir, Set up checks for all submissions](https://www.palantir.com/docs/foundry/manage-models/set-up-checks)
- [Palantir, Release a model](https://www.palantir.com/docs/foundry/manage-models/release-model)
- [Palantir, Set up a batch deployment](https://www.palantir.com/docs/foundry/manage-models/set-up-batch)
- [Palantir, Set up and use a Modeling Objective live deployment](https://www.palantir.com/docs/foundry/manage-models/set-up-live)
- [Palantir, API, Query a model or Modeling Objective live deployment](https://www.palantir.com/docs/foundry/manage-models/live-deployment-reference)
- [Palantir, Model inference history](https://www.palantir.com/docs/foundry/manage-models/model-inference-history)
- [Palantir, September 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-09)
- [Palantir, January 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-01)
- [Palantir, March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03)
- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)
- [Palantir, February 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-02)
- [Palantir, April 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-04)
- [Palantir, July 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-07)

## 관련 문서

- [[Palantir-Data-and-Model-Integration|모델 artifact와 adapter]]
- [[Palantir-Data-Pipeline-Operations|파이프라인 운영과 데이터 계약]]
- [[Palantir-Security-and-Governance|보안과 거버넌스]]
