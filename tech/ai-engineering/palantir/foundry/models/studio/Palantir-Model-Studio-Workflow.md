---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Model Studio의 입력, configuration과 training run

Model Studio는 dataset, trainer와 parameter를 선택해 no-code로 모델을 학습한다. 표준 Foundry transform으로 실행해 input lineage/Marking을 output model에 전파하며 model version별 Experiment에 parameters/metrics/plots를 남긴다. UI의 production-grade라는 설명이 실제 업무 정확도를 증명하지는 않는다.

## 입력과 재현성

입력은 dataset이며 Object/MediaSet을 직접 받지 않는다. Object와 비슷한 효과가 필요하면 backing data source dataset을 검토한다. trainer의 required/optional dataset과 column mapping/type을 맞추고 ignore한 column은 training에서 제외한다.

optional test dataset을 생략하면 일반 설명은20% 분할을 안내한다. 시간/대상별 leakage나 독립 평가의 적절성을 자동 보장하지 않으므로 trainer별 split과 실무 데이터를 대조한다. preview 통계는 실제 전체 분포 평가와 다르다.

항상 latest configuration으로 build하며 입력이 바뀌면 같은 config라도 결과가 달라질 수 있다. configuration version은 수정마다 증가한다. run의 build, model version, Experiment와 당시 input/parameter/resource/changelog를 함께 확인한다. stale 표시가 training 실패나 모델 품질 저하의 증거는 아니다.

## 자원과 filtering

기본 최대8vCPU/64GB이며 증설은 지원 경로를 따른다. allocated resource는 Foundry compute-seconds로 보고된다. GPU는 project에 GPU resource queue가 배정된 조건이다.

압축 dataset의 저장 크기보다 펼친 memory가 크다. Parquet filter는 download 전 pushdown을 지원하지만 CSV 등 비Parquet는 그렇지 않아 row filter가 있어도 memory가 부족할 수 있다. CPU 증설은 trainer 내부 병렬화 조건과 함께 판단한다.

## 실행과 진단

training run은 model/Experiment를 만들고 downstream Python transform, Pipeline Builder, Function과 Marketplace에서 사용할 수 있다. schedule은 retraining을 자동화하지만 새 버전의 실제 운영 release를 자동 승인한 것은 아니다.

No models trained는 exclusion 또는 hyperparameter에서 모든 model을 없앤 경우다. source는 hyperparameter `{}`나 exclusion 축소를 해결로 제시한다. OOM은 uncompressed 크기/병렬화를 확인한다. time-series auto frequency 추론 실패는 resampling을 끄거나 주기를 명시한다.

이 문서는 공개 계약 학습이며 실제 training, GPU 사용이나 모델 정확도를 시험한 결과는 아니다.

## 출처

- [Palantir, model-studio](https://www.palantir.com/docs/foundry/model-studio)
- [Palantir, overview](https://www.palantir.com/docs/foundry/model-studio/overview)
- [Palantir, core-concepts](https://www.palantir.com/docs/foundry/model-studio/core-concepts)
- [Palantir, navigation](https://www.palantir.com/docs/foundry/model-studio/navigation)
- [Palantir, configuration-inputs](https://www.palantir.com/docs/foundry/model-studio/configuration-inputs)
- [Palantir, configuration-compute-resources](https://www.palantir.com/docs/foundry/model-studio/configuration-compute-resources)
- [Palantir, faq](https://www.palantir.com/docs/foundry/model-studio/faq)
- [Palantir, troubleshooting](https://www.palantir.com/docs/foundry/model-studio/troubleshooting)

## 관련 문서

- [[Palantir-Model-Deployment-and-Monitoring]]
- [[Palantir-Data-and-Model-Integration]]
