---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 모델 실험, serialization과 실행 환경의 변화

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## 실험을 model version과 연결하기

- 1월 28일 model experiments GA는 hyperparameter/metric logging과 비교 UI를 도입했다. `palantir_models` 0.1482.0 이후 API의 Code Repositories/Jupyter binding을 설명했다.
- 3월 27일 MLflow integration은 `experiment.as_mlflow_run()` 안의 로그를 실험에 연결하고 학습 종료 시 model version과 함께 publish할 수 있게 했다. 로그 연결만으로 모델 게시까지 완료되지는 않는다. image logging은 고정 validation image와 사용자 차트에, parallel coordinate는 parameter와 aggregate metric 관계 확인에 쓴다.
- 7월 live experiment 관찰, 단일값 bar 표시, 6월 interactive chart 등이 순차 확대됐다. 실시간 학습 상태와 publish된 실험은 별도 수명주기다.
- 10월 Model Studio 베타는 forecasting/regression/classification, experiment와 lineage를 묶었다. 기본 선택과 가이드는 모델 적합성 보장이 아니다.
- 11월 rolling-origin forecasting은 여러 validation/step/refit 구성을 도입했다. 별도 test dataset을 요구하지 않는 흐름으로 바뀌어 예전 test 영역이 사라졌고, SHAP와 이미지 실험도 추가됐다.

## Adapter와 SDK 버전을 맞추기

- 2월 20일 object/object set model input GA는 생성 OSDK 패키지의 `pm.Object`/`pm.ObjectSet`을 adapter `api()`에서 선언하고 predict/transform에서 Ontology를 사용하게 했다. direct deployment query와 Function publishing으로 테스트한다.
- 2월 24일 `palantir_models >= 0.1536.0`은 `@auto_serialize`를 사용하는 init 인자의 기본 dill serialization과 `palantir_models.serializers` 통합을 소개했다. 기존 custom serializer가 불필요해지는 경우와 외부 객체의 실제 직렬화 적합성은 다르다.
- 4월 Spark ML AutoSerializer는 `>=0.1599` 기준이며 batch inference 권장이 붙었다.
- 4월 lightweight model publish/inference는 ModelInput/Output `>=0.1640`의 non-Spark 모델 경로였다. Spark DataFrame/MLlib를 동일하게 지원한다는 뜻이 아니다.
- 6월 12일 `ModelInput(use_sidecar=True)`는 `>=0.1673`에서 별도 Spark container의 dependencies/CPU/memory/GPU를 사용했다. 당시 lightweight와 preview는 미지원이었다. 현재 별도 모델 문서의 non-Spark sidecar `>=0.2010`과 시점을 구분한다.
- 7월 NDArray IO, notebook에서 registered model을 ModelInput으로 download/init하는 기능이 추가됐다. 이 경로의 `interactive.deploy` 미지원은 별도 조건이다.
- 10월 `>=0.1956`에서 ModelInput의 RID 외 인자를 keyword로 넘기도록 바뀌었다.

## 운영 전환의 확인점

기존 실험의 metric 의미와 새 validation 구성을 대조하고, serialization 라이브러리, model adapter IO, build engine와 배포 resource 구성을 함께 고정한다. 경량 실행 지원, Spark sidecar와 GPU deployment를 하나의 호환 기능으로 합치지 않는다.

### 실험 로그와 직렬화의 적용 조건

2026-11-03 부분 검증: 이 절은 현재 공식 Model experiments와 Model serialization 문서로 대조한 적용 조건이다. 위의 2025년 출시 기록 전체를 재검증한 날짜는 아니다.

- **실험과 모델의 연결**: 공식 MLflow 예제는 로그를 기록한 뒤 `model_output.publish(model_adapter, experiment=experiment)`로 실험을 모델 버전에 연결한다. `as_mlflow_run()` 블록 종료를 게시 완료로 해석하지 않는다.
- **MLflow 연동의 보존 범위**: 학습과 모델 게시 시점의 로깅을 지원한다. PNG가 아닌 asset과 tag는 조용히 버려지며 nested run은 지원하지 않는다. 기존 MLflow 작업을 옮길 때 필요한 산출물이 남는지 확인한다.
- **자동 직렬화의 설정**: `__init__`에 인자 없는 `@auto_serialize`를 붙이면 입력을 기본 Dill로 저장하고 복원한다. serializer를 인자별로 지정할 때는 모든 생성자 인자에 대응하는 설정이 필요하다.
- **의존성의 경계**: `palantir_models.serializers`로 import 경로가 통합돼도 Dill 이외의 직렬화 프레임워크 의존성은 별도로 추가해야 한다. 직렬화 설정은 [[Palantir-Model-Serialization]], 실험 게시와 실패 처리는 [[Palantir-Model-Experiments-API]]에서 이어 본다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [June 12, 2025, Introducing `use_sidecar`: Run models in dedicated containers within Python transforms — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#5381ef45-de62-43e2-8fd5-05633d867b55)
- [March 27, 2025, Enhancements to model experiments — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#67ab328e-8be9-40c7-8e0b-6af88e0a500f)
- [February 20, 2025, Ontology object and object set inputs are now supported in model adapters [GA] — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#518580f7-d5bf-4f7c-9ad9-4e56714b2eff)
- [October 14, 2025, No-code model training and deployment with Model Studio — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#41398cc1-1122-4711-abd2-c2d39fd2de3d)
- [Palantir, Model experiments](https://www.palantir.com/docs/foundry/integrate-models/experiments-overview)
- [Palantir, Model serialization](https://www.palantir.com/docs/foundry/integrate-models/serialization)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-Model-Engineering]]
