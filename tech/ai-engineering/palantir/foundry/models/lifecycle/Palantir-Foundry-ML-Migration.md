---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# foundry_ml의 종료와 palantir_models 전환

현재 migration overview는 foundry_ml과 dataset-backed model이2025-10-31부터 deprecated/unavailable이라고 명시한다. 제목에 planned-deprecation이 남아 있다고 미래 일정으로 읽지 않는다. Code Workbooks의 모델은 Jupyter Code Workspaces/Code Repositories로 재구축한다.

## 자산과 소비자

Upgrade Assistant의 두 campaign은 model replacement 지정과 소비자 transform/workbook/objective deployment 변경을 나눈다. default branch에서90일 안에 build/사용됐거나 active live objective 최신 release인 model을 in-use로 찾고 나머지는 ignored일 수 있다. replacement 지정의 Completed는 실제 모든 소비자의 inference 검증 완료를 뜻하지 않는다.

AIP suggestion은 최초 resource 조회/scroll로 등장할 때 생성/cache될 수 있어 읽기 UI도 compute를 발생시킬 수 있다. regenerate는 새 요청이다. default branch code가 없거나 submitted TypeScript Function model이면 suggestion을 못 줄 수 있다. 생성 코드는 checks/출력을 직접 검토한다.

## repository와 adapter

새 repo 또는 in-place migration을 고른다. 기존 Pipeline repo는 upgrade해야 최신 direct deployment를 지원할 수 있다. foundry_ml import 제거, repo configuration/Python3.10이상 전환 뒤 Libraries UI로 palantir_models를 추가해 backing repository도 연결한다. meta.yaml에 이름만 쓰는 것으로 대체하지 않는다.

기존 training/preprocessing 로직을 보존하고 adapter에 save/load, named typed API와 predict를 정의한다. ModelOutput.publish로 model asset을 만들고 ModelInput.transform의 named output으로 inference를 연결한다. sklearn 같은 single-node model은 lightweight로 Spark→Pandas 비용을 피하는 경로를 검토한다.

다른 repo inference는 adapter/dependency를 직접 가져오거나 sidecar로 격리한다. migration source는 non-Spark lightweight/using의 sidecar 지원을 palantir_models0.2010.0이상으로 안내한다. 역사적 Spark-only 제약과 현재 조건을 구분한다.

## 재학습 없이 옮기는 경우

FAQ는 옛 Python3.9/foundry_ml 환경에서 정확한 model stage를 serialize해 별도 dataset으로 내보내고 새 환경에서 adapter로 감싸는 방법을 설명한다. 현재 overview의 unavailable 상태와 충돌할 수 있으므로 여전히 옛 runtime을 실행할 수 있다고 가정하지 말고 지원 경로/기존 artifact 확보를 확인한다. pickle은 model별 적합성과 호환성을 확인한다.

palantir_models0.1599.0이후 SparkML을 지원하지만 live inference에 single-node framework를 우선 검토한다는 문서 권장을 제품 전체 미지원으로 바꾸지 않는다.

## metric 전환

가능하면 MetricSet을 Experiment로 옮기되 image 지원과 chart 미지원 차이를 보존한다. foundry_ml_metrics를 별도 설치하면 새 model에도 MetricSet을 쓰고 objective에서 볼 수 있으나 model page에는 안 나타날 수 있다. ModelInput.model_version_rid는0.1602.0이상 조건이며 UUID hash 부분을 전달한다.

source의 sample은 evaluation input parameter 명칭이 섞여 있으므로 그대로 복사해 실행 성공을 보장하지 않는다. model version, input/test 데이터와 metric의 연결을 실제로 확인한다.

## 출처

- [Palantir, migrate-models](https://www.palantir.com/docs/foundry/migrate-models)
- [Palantir, overview](https://www.palantir.com/docs/foundry/migrate-models/overview)
- [Palantir, how-to](https://www.palantir.com/docs/foundry/migrate-models/how-to)
- [Palantir, migration-reference-faq](https://www.palantir.com/docs/foundry/migrate-models/migration-reference-faq)

## 관련 문서

- [[Palantir-Data-and-Model-Integration]]
- [[Palantir-Model-Deployment-and-Monitoring]]
