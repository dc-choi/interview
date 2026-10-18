---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Spark ML과 분산 training의 지원 경계

SparkMLAutoSerializer는 palantir_models0.1599.0부터 PipelineModel을 저장/복원한다. 현재 spark-models 참조와 notebook의 옛 SparkML 미지원 callout이 충돌하므로 notebook 전체 미지원 안내를 모든 runtime에 확대하지 않는다.

## Training과 serving

Spark 모델은 Code Repositories에서 training/batch에 사용하는 경로가 권장된다. Code Workspaces는 single node, Code Workbooks는 legacy다. Spark model은 container image build를 지원하지 않아 direct deployment/sidecar가 필요한 설계와 맞지 않을 수 있다. Modeling Objective의 experimental live 지원과 single-node framework 권장을 구별한다.

## 분산 XGBoost

현재 공식 분산 training은 PySpark XGBoost estimator를 직접 지원한다. KUBERNETES_OPEN_PORTS_ALL profile이 필수이고 GPU는 resource queue,EXECUTOR_GPU_ENABLED와 device 설정이 추가로 필요하다. Optuna는 hyperparameter optimization 도구로 안내된다. profile만으로 임의 library가 분산을 지원하는 것은 아니다.

XGBoostSerializer는 SparkXGBClassifier/Regressor를 직접 지원하지 않으므로 underlying get_booster()를 추출하는 경로를 설명한다. 다만 source adapter 예제는 constructor booster와 auto_serialize model keyword가 어긋나고 다른 예제의 import/API도 혼용되어 있다. 실제 installed serializer가 Booster를 어떻게 복원하는지 검증한 뒤 적용한다. 예제를 그대로 실행 가능한 보장으로 옮기지 않는다.

Spark sample adapter는 label과 prediction column이 혼동될 수 있어 실제 출력이 ground truth인지 예측인지 점검한다. 필요하면 adapter를 UDF에 연결하지만 multi-row history inference는 일반 DistributedInferenceWrapper의 partition 보장을 기대하지 않는다.

## 출처

- [Palantir, spark-models](https://www.palantir.com/docs/foundry/integrate-models/spark-models)
- [Palantir, spark-distributed-model-training](https://www.palantir.com/docs/foundry/integrate-models/spark-distributed-model-training)

## 관련 문서

- [[Palantir-ModelInput-Version-and-Sidecar]]
- [[Palantir-Model-Serialization]]
