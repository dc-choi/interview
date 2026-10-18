---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Repository, notebook와 Studio training의 실행 계약

Repository tutorial은 model-training template에 palantir_models와 학습 library를 추가하고 ModelOutput.publish로 model asset을 만든다. adapter의 named input/output, preprocessing과 prediction을 함께 버전 관리한다. adapter code만 수정해도 기존 model version은 바뀌지 않으므로 rebuild/republish가 필요하다.

## Repository

sample은 df_in/df_out API와 features, prediction column을 사용한다. 다른 repo에서 소비할 때는 adapter와 dependency를 직접 설치하거나 sidecar로 환경을 격리한다. output 경로와 model alias를 자기 프로젝트 값으로 바꾸고 checks/build의 실제 성공을 확인한다.

## Notebook

managed Maestro environment에서 palantir_models0.1795.0이상 조건을 확인한다. dataset alias와 ModelOutput alias는 실제 notebook resource import와 일치해야 한다. adapter는 notebook cell 안이 아니라 별도 .py module로 두고 생성된 skeleton의 filename/class/import를 수정한다. 사용하지 않는 새 파일을 추가하는 것으로 기존 adapter가 바뀌지는 않는다.

autoreload 또는 kernel restart는 오래 로드된 API/predict code를 갱신한다. NotImplemented 오류는 실제 import된 class와 method를 확인한다. interactive publish와 notebook을 transform으로 publish해 schedule/retraining하는 절차는 다르다. preview는 전체 build 성공의 증거가 아니다.

## Studio tutorial

regression trainer에 target median_house_value를 매핑하고 optional test를 생략하면20%를 떼어낸다. tutorial은 RMSE, good_quality,300초, prediction column을 명시하고2vCPU/8GB로 실행한다. 이 값은 예제 설정이며 일반적인 자원/품질 기준이 아니다.

run 성공 후 만들어진 model version을 objective에 submit하며 submission name/owner를 기록한다. 자동 평가 옵션을 켜기 전 제출한 candidate는 Build Evaluation을 별도로 실행해야 할 수 있다.

## 출처

- [Palantir, tutorial-train-code-repositories](https://www.palantir.com/docs/foundry/model-integration/tutorial-train-code-repositories)
- [Palantir, tutorial-train-jupyter-notebook](https://www.palantir.com/docs/foundry/model-integration/tutorial-train-jupyter-notebook)
- [Palantir, tutorial-train-model-studio](https://www.palantir.com/docs/foundry/model-integration/tutorial-train-model-studio)
- [Palantir, model-studio](https://www.palantir.com/docs/foundry/model-integration/model-studio)

## 관련 문서

- [[Palantir-Model-Engineering-Workflow]]
- [[Palantir-Model-Studio-Workflow]]
- [[Palantir-Foundry-ML-Migration]]
