---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# ModelInput version pinning과 sidecar 환경 일치

ModelInput은 model path/RID와 optional model_version을 받는다. 기본은 build branch의 latest이며 pinned model_version이 branch 지정보다 우선한다. 버전을 생략하면 다음 run에서 새 weight를 읽지만 다른 repo의 adapter library version까지 자동 갱신하지는 않는다.

## 환경과 버전

sidecar를 쓰지 않으면 소비 repo Libraries에서 해당 model version의 adapter/dependency를 선택하고 checks를 통과시킨다. 이 과정은 소비 repo와 constraint를 새로 solve하므로 training 때와 다른 package version이 생길 수 있다.

use_sidecar=true는 model version에 맞는 adapter와 같은 library version을 별도 container에 로드하고 predict를 자동 route한다. 최초 도입은 palantir_models0.1673.0이며 non-Spark lightweight/transform.using에서는0.2010.0이상이다. sidecar_resources의 키는 cpus, memory_gb와 gpus다. 값을 늘리는 것은 project queue와 GPU permission 확보를 대체하지 않는다.

## Transform과 preview

ModelInput은 TransformInput을 API가 요구하는 형태로 변환하고 named output을 반환한다. output_data/df_out 같은 이름을 고정 상수로 가정하지 않는다. ModelInput preview는5GB 제한과 작은 resource profile이 있어 full build를 대신하지 못한다. CBAC에서는 model/dataset output을 미리 만들어 classification을 설정해야 한다.

scikit-learn binary example은 whole dataset fit 후 같은 dataset inference를 보여 준다. 이를 holdout 품질 평가로 해석하지 않는다. sample의 cancer0/1 설명도 실제 library의 target mapping과 대조해 class label을 확인한다. probability column은 model.classes_ 순서로 생성한다.

## 분산 inference

DistributedInferenceWrapper는 Spark DataFrame을 executor별 Pandas chunk로 보내고 Spark DataFrame을 돌려준다. API는 Pandas input/output 각1개와 추가 parameter를 받는다. num_partitions=auto는 executor 수를, max_rows_per_chunk 기본1,000,000은 overhead와 memory 교환을 뜻한다. OOM이면 partition/chunk와 model footprint를 함께 조정한다.

시계열처럼 여러 row의 history가 필요한 모델에는 wrapper를 쓰지 않는다. 기본 Spark partitioning은 같은 series의 필요한 row를 한 partition/chunk에 모은다는 보장이 없어 잘못된 예측이 나올 수 있다. 문서의 near-linear 확장 설명은 workload 실측 SLA가 아니다.

## 출처

- [Palantir, transform-model-input](https://www.palantir.com/docs/foundry/integrate-models/transform-model-input)
- [Palantir, model-asset-code-repositories](https://www.palantir.com/docs/foundry/integrate-models/model-asset-code-repositories)
- [Palantir, model-asset-code-repositories-sklearn](https://www.palantir.com/docs/foundry/integrate-models/model-asset-code-repositories-sklearn)
- [Palantir, model-asset-code-workspaces](https://www.palantir.com/docs/foundry/integrate-models/model-asset-code-workspaces)

## 관련 문서

- [[Palantir-Model-Training-Environments]]
- [[Palantir-Model-Adapter-Contracts]]
