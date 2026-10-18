---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 모델 자산에서 평가, release와 inference까지

모델은 ML weight뿐 아니라 simulation, optimization, business rule의 inference logic도 담을 수 있다. model asset은 adapter, artifact와 실행 환경을 묶고, Modeling Objective는 문제의 API와 평가/운영 기준을 정의한다. objective submission은 특정 model version의 immutable copy이며 release는 환경 tag에 제출 버전을 연결한다.

## 도구 선택

Studio는 no-code training, Code Workspaces는 interactive notebook, Code Repositories는 재현 가능한 CI/build training에 적합하다. Experiments는 training parameter/metric, Evaluations는 post-training metric을 기록한다. AI FDE의 machine learning mode는 작업을 돕는 agent이며 결과 정확도나 운영 승인을 대신하지 않는다.

Python transform의 ModelInput은 version pinning과 sidecar를 제공한다. objective batch deployment는 external/multi-output model, sidecar와 Marketplace deployment를 지원하지 않는다. notebook inference transform은 같은 notebook이 만든 model만 소비하므로 다른 model은 Python transform으로 조합한다.

Pipeline Builder batch는 build마다 최신 model version을 쓰지만 streaming은 이미 로드한 version을 계속 사용한다. 최신 version을 적용하려면 pipeline을 restart/redeploy한다. 모델 버전 생성과 이미 실행 중인 소비자의 갱신은 별개다.

## 학습부터 운영까지

공식 housing tutorial은 labeled/unlabeled dataset, code, models와 objective를 나누고 feature/data/code/environment lineage를 추적한다. CBAC 환경에서 output 자동 생성이 막히면 dataset과 model을 먼저 만들고 classification을 설정한다.

예제80/20 random split과 seed는 재현을 위한 설정이다. 시간 순서, 동일 대상 중복이나 preprocessing leakage를 막는 독립 평가 설계를 자동 제공하지 않는다. median imputation과 scaling도 training에서 fit한 pipeline을 adapter predict에서 재사용한다.

objective 평가에는 실제 target과 prediction이 서로 다른 이름/type으로 보존되어야 한다. tutorial의 overall/age별 subset은 평가 예제이며 RMSE는 평균 절대오차가 아니라 제곱오차 평균의 제곱근이다. source의 average error라는 설명을 MAE 정의로 받아들이지 않는다.

staging/production release는 해당 deployment의 model을 바꾸며 batch output은 별도 build/schedule/Run now가 필요하다. live creation에는 별도 permission과 runtime 준비가 필요하다. tutorial 완료나 녹색 build가 실제 생산 준비 검증을 의미하지 않는다.

## 평가 기록의 원자성

`@pm.transforms.evaluation("set")`는 ModelInput과 evaluation output을 연결한다. build 성공 시 commit하고 실패 시 abort한다. ExperimentModelOutput으로 parameter와 step별 metric을 기록하고 adapter를 함께 publish한다. abstract ModelAdapter를 그대로 instantiate하지 않는다.

## 출처

- [Palantir, model-integration](https://www.palantir.com/docs/foundry/model-integration)
- [Palantir, overview](https://www.palantir.com/docs/foundry/model-integration/overview)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/model-integration/getting-started)
- [Palantir, models](https://www.palantir.com/docs/foundry/model-integration/models)
- [Palantir, objectives](https://www.palantir.com/docs/foundry/model-integration/objectives)
- [Palantir, evaluations](https://www.palantir.com/docs/foundry/model-integration/evaluations)
- [Palantir, experiments](https://www.palantir.com/docs/foundry/model-integration/experiments)
- [Palantir, tutorial-intro](https://www.palantir.com/docs/foundry/model-integration/tutorial-intro)
- [Palantir, tutorial-set-up-project](https://www.palantir.com/docs/foundry/model-integration/tutorial-set-up-project)
- [Palantir, tutorial-evaluate-manage-models](https://www.palantir.com/docs/foundry/model-integration/tutorial-evaluate-manage-models)
- [Palantir, tutorial-productionize](https://www.palantir.com/docs/foundry/model-integration/tutorial-productionize)
- [Palantir, tutorial-conclusion](https://www.palantir.com/docs/foundry/model-integration/tutorial-conclusion)
- [Palantir, what-to-use](https://www.palantir.com/docs/foundry/model-integration/what-to-use)

## 관련 문서

- [[Palantir-Model-Studio-Workflow]]
- [[Palantir-Model-Deployment-and-Monitoring]]
