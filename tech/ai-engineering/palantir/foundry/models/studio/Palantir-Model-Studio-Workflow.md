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

선택한 branch의 latest configuration으로 build하며 입력이 바뀌면 같은 config라도 결과가 달라질 수 있다. configuration version은 수정마다 증가한다. run의 build, model version, Experiment와 당시 input/parameter/resource/changelog를 함께 확인한다. stale 표시가 training 실패나 모델 품질 저하의 증거는 아니다.

## 브랜치 실험과 병합 조건

2026-10-30 공식 문서 기준, Global Branching 연동은 beta이며 enrollment별로 제공 여부가 다를 수 있다. 먼저 `main`에서 초기 training run을 실행해 configuration을 저장한다. configuration이 없는 branch에서 **Start training run**을 누르면 `main`의 최신 configuration을 복사하고, 기존 output model을 재사용해 해당 branch의 model version을 만든다.

병합 전에는 `main`과의 최신화, **현재 configuration version의 최신 run이 model을 생성했는지**, proposal의 검사와 필수 승인을 각각 확인한다. 이전 version에서 성공한 run은 새 version의 조건을 충족하지 않는다.

Rebase는 개별 수정 사항을 자동으로 합치지 않는다. `main` 또는 현재 branch 중 한 configuration 전체를 고르며, 양쪽 변경이 필요하면 선택 뒤 직접 편집한다. 현재 branch를 유지해도 새 configuration version이 생기므로 그 version의 최신 run이 model을 생성해야 병합할 수 있다.

병합은 branch configuration을 `main`의 새 version으로 저장한다. `main`의 모델 학습은 proposal 병합 시 build 옵션을 사용하거나 병합 뒤 별도로 실행한다. 이 절과 앞 절의 branch별 실행 범위를 대조했으며, 기존 자원 한도와 trainer 설명의 검증일은 유지한다. 실제 branch 생성과 학습은 실행하지 않았다.

## 자원과 filtering

기본 최대8vCPU/64GB이며 증설은 지원 경로를 따른다. allocated resource는 Foundry compute-seconds로 보고된다. GPU는 project에 GPU resource queue가 배정된 조건이다.

압축 dataset의 저장 크기보다 펼친 memory가 크다. Parquet filter는 download 전 pushdown을 지원하지만 CSV 등 비Parquet는 그렇지 않아 row filter가 있어도 memory가 부족할 수 있다. CPU 증설은 trainer 내부 병렬화 조건과 함께 판단한다.

## 실행과 진단

training run은 model/Experiment를 만들고 downstream Python transform, Pipeline Builder, Function과 Marketplace에서 사용할 수 있다. schedule은 retraining을 자동화하지만 새 버전의 실제 운영 release를 자동 승인한 것은 아니다.

No models trained는 exclusion 또는 hyperparameter에서 모든 model을 없앤 경우다. source는 hyperparameter `{}`나 exclusion 축소를 해결로 제시한다. OOM은 uncompressed 크기/병렬화를 확인한다. time-series auto frequency 추론 실패는 resampling을 끄거나 주기를 명시한다.

이 문서는 공개 계약 학습이며 실제 training, GPU 사용이나 모델 정확도를 시험한 결과는 아니다.

## 출처

- [Palantir, Branching Model Studio](https://www.palantir.com/docs/foundry/model-studio/branching) — 2026-10-30 branch 초기화, version별 병합 조건, rebase와 main 학습의 구분 대조.
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
