---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 모델 직렬화, 파일 import와 adapter 교체

auto_serialize는 기본적으로 constructor input을 Dill로 저장/복원한다. palantir_models0.1536.0미만에서는 serializer를 명시해야 한다. 일부 argument에 serializer를 지정했다면 constructor의 모든 argument에 대응하는 설정이 필요하다.

## Serializer 선택

Dill/Cloudpickle은 Python object, JSON/YAML은 dictionary, Hugging Face는 pipeline/model/tokenizer의 save_pretrained/from_pretrained, PyTorch는 torch.save/load, TensorFlow는 save/load_model 후 compile, XGBoost는 XGBModel.save_model/load_model을 사용한다. Dill 이외의 framework dependency는 직접 추가해야 한다.

JSON/YAML 설명문에는 서로의 함수 이름이 잘못 섞여 있다. 제공 구현은 JsonSerializer가 json.dump/load, YamlSerializer가 yaml.safe_dump/load이므로 구현을 우선 대조한다. TensorflowKerasSerializer는 DIR/H5/KERAS format과 custom_objects를 선택하며 잘못된 extension은 format 지정 오류로 안내한다.

custom ModelSerializer는 init/serialize/deserialize를 구현해 공유 library로 게시한다. ModelStateWriter의 open/put_file/put_directory와 ModelStateReader의 open/extract/extract_to_temp_dir로 실제 file 경로를 맞춘다. publication은 artifact zip을 저장하고 load는 inference 전에 이를 읽는다.

## 외부 weight import

unstructured dataset에 model files를 올리고 transform에서 framework로 deserialize한 후 adapter로 감싸 ModelOutput.publish한다. copy_model_to_driver는 파일을 driver로 모으므로 weight 크기와 memory를 고려한다. 공식 Iris 예제는 Python3.8/scikit-learn1.3.2, pickle KNN과 고정4feature 순서를 가정한다. target/prediction column과 constructor가 자기 API와 맞는지 확인한다. pickle 계열은 신뢰할 수 있는 artifact와 호환 환경에서만 load한다.

## 재학습 없는 adapter 갱신

Code Repositories에서 학습한 model에만 제공되는 upgrade는 weight를 유지하고 새 adapter/environment로 새 model version을 만든다. 원래와 같은 Python module/class 이름을 유지하며 새 dependency/load/API/predict가 기존 artifact와 호환되어야 한다.

Model Training은 commit, Adapter Library는 tag로 새 code를 게시한 뒤 Models app에서 Upgrade model adapter를 실행한다. 기존 objective submission은 자동 갱신되지 않아 새 version을 다시 submit해야 한다. source는 branch에서 먼저 시험하도록 권장한다. 이 문서는 실제 pickle 호환성이나 inference 결과를 시험한 기록이 아니다.

## 출처

- [Palantir, serialization](https://www.palantir.com/docs/foundry/integrate-models/serialization)
- [Palantir, auto-serialization-reference](https://www.palantir.com/docs/foundry/integrate-models/auto-serialization-reference)
- [Palantir, model-asset-files](https://www.palantir.com/docs/foundry/integrate-models/model-asset-files)
- [Palantir, model-asset-files-iris](https://www.palantir.com/docs/foundry/integrate-models/model-asset-files-iris)
- [Palantir, upgrade-model-adapter](https://www.palantir.com/docs/foundry/integrate-models/upgrade-model-adapter)

## 관련 문서

- [[Palantir-Model-Adapter-Contracts]]
- [[Palantir-Foundry-ML-Migration]]
