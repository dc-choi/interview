---
tags: [palantir, foundry, mlops, models]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Model adapter의 초기화, 타입과 inference 계약

Model은 artifact와 adapter/environment의 조합이다. 같은 interface를 제공해도 내부 학습, 외부 weight, container와 외부 API model의 초기화와 운영 제약은 다르다. 일반 overview의 모든 model을 objective로 운영한다는 설명은 external batch 등 상세 제약과 함께 읽는다.

## Adapter를 게시하는 위치

공유/container/external adapter는 Model Adapter Library template을 쓴다. condaPackageName은 gradle.properties에서 설정하고 tag로 library version을 publish한다. 여러 adapter를 제공하려면 build.gradle module 목록에 모두 등록한다.

Model Training template은 commit에서 유래한 transforms-model-training-<repo RID> library를 만들며 임의 이름/tag를 지원하지 않는다. 일반 Python transforms repo에서 adapter를 직접 정의하는 방식은 지원하지 않아 shared library를 import하거나 template을 전환한다. adapter와 training은 별도 module로 둔다. notebook class는 별도 .py에 정의해 cws_adapter로 package한다.

## 초기화와 실행

load/save 또는 auto_serialize로 weight를 복원한다. container_context는 container명별 service URI 목록과 공유 read/write directory를, external context는 URL/평문 configuration과 decrypted credential map을 전달한다. base load는 init_container/init_external을 호출할 수 있고 override한 load는 해당 초기화를 직접 책임진다.

단일 tabular/parameter output은 predict의 argument 이름이 API input과 일치해야 한다. 순서는 달라도 된다. multi-output과 FileSystem output은 run_inference(inputs,outputs)의 named output.write로 쓴다. FileSystem output은 transform_write 경로로만 쓸 수 있다.

## 타입과 검증 차이

Pandas/Spark, Parameter, FileSystem, MediaReference와 Ontology Object/ObjectSet 입력을 구분한다. MediaReference/Object/ObjectSet은 API output으로 지원하지 않는다. Parameter는 항상 type을 검사하지만 batch tabular schema는 엄격하지 않아 missing column이 앞에서 차단되지 않을 수 있다. live는 선언한 column을 cast하고 missing/cast 실패를 오류로 처리한다. extra column은 자동 삭제하지 않는다.

REST JSON은 column 순서를 보장하지 않으므로 실제 feature column만 training 순서로 다시 정렬한다. label은 objective 평가용으로 predict 결과에 보존하되 live 요청에 필수로 요구하지 않도록 required API column에 넣지 않는다. 예제의 undefined columns와 prediction 이름 혼용은 실행 전에 고친다.

Parameter의 NDArray는 shape와 dtype을 명시하며 -1 dimension은 shape check를 생략한다. str/bool/int8/16/32/64와 float16/32/64를 지원한다. transform은 ndarray 또는 nested list를, Function은 JSON nested list를 받는다.

## 소비 방식별 추가 조건

objective batch는 single tabular input, objective evaluation은 single tabular input/output을 요구한다. 일반 ModelInput evaluation과 동일 제한으로 확대하지 않는다. Function은 Any 없이 required column과 list/dict element type까지 선언해야 한다.

OSDK Object는 instance/primary key, ObjectSet은 instance/RID로 전달한다. model-asset-osdk 예제의 ObjectSet 생성자와 일반 API 예제의 object type 표기가 다르므로 설치한 library signature를 확인한다. FoundryClient로 object/query/LLM을 호출할 때도 접근 권한과 외부 호출 효과는 별도다.

## 출처

- [Palantir, integrate-models](https://www.palantir.com/docs/foundry/integrate-models)
- [Palantir, integrate-overview](https://www.palantir.com/docs/foundry/integrate-models/integrate-overview)
- [Palantir, model-adapter-overview](https://www.palantir.com/docs/foundry/integrate-models/model-adapter-overview)
- [Palantir, model-adapter-creation](https://www.palantir.com/docs/foundry/integrate-models/model-adapter-creation)
- [Palantir, model-adapter-api](https://www.palantir.com/docs/foundry/integrate-models/model-adapter-api)
- [Palantir, model-adapter-reference](https://www.palantir.com/docs/foundry/integrate-models/model-adapter-reference)
- [Palantir, model-asset-osdk](https://www.palantir.com/docs/foundry/integrate-models/model-asset-osdk)

## 관련 문서

- [[Palantir-OSDK]]
- [[Palantir-Model-Functions-Versioning]]
