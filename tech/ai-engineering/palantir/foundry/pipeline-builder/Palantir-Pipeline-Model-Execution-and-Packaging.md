---
tags: [palantir, foundry, pipeline-builder, data-engineering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 모델 실행과 제품 배포 계약"]
---

# Pipeline Builder 모델 실행과 제품 배포 계약

Trained-model node는 Spark batch와 Flink streaming을 지원하고 Faster는 지원하지 않는다. 모델 API는 single tabular input/output, 최소 한 required input column을 요구한다. 추가 output column은 drop하고 누락은 build error가 될 수 있다. Input expression과 output alias를 사용할 수 있다.

공식 입력/output 설정 화면은 반환 column을 모델 API에 선언한 type으로 cast한다고 설명한다. Column 이름과 개수뿐 아니라 선언 type도 downstream 계약에 포함한다. 이 화면만으로 모든 값의 변환 성공이나 실패 시 처리를 보장하지 않는다. (2026-10-18 [공식 설정 화면](https://www.palantir.com/docs/resources/foundry/pipeline-builder/configure-model-inputs-outputs.jpg) 확인, 실제 inference 미실행)

## Model sidecar와 시간

모델은 별도 sidecar에서 실행하며 기본 1 CPU/8GB/no GPU다. Batch는 model마다 driver와 각 executor에, streaming은 각 task manager에 sidecar가 생긴다. Imported-but-unused model은 sidecar 비용이 없다. Resource 설정은 model/pipeline 단위이고 같은 model의 node 전체에 적용한다.

기본 startup timeout 10분은 download/load readiness의 경계다. Per-model/pipeline seconds override가 가능하며 OOM으로 죽은 sidecar도 timeout처럼 보일 수 있다. Batch inference request 자체는 timeout 제한이 없다고 설명한다. Streaming의 긴 inference는 해당 window output을 늦추며 startup timeout은 inference latency 상한이 아니다.

Streaming은 partition key와 window를 정하고 event-time이면 timestamps/watermarks를 먼저 부여한다. Watermark/window는 정렬이 아니므로 sequence model은 model 안에서 timestamp 정렬을 해야 한다. Streaming trained-model preview는 지원하지 않으며 execution table의 일반 Preview 지원과 구분한다. Time-series model은 streaming-only라고 명시한다.

## Version과 호환성

Build branch의 latest model을 사용하고 없으면 fallback branch를 찾는다. Static version pinning은 현재 지원하지 않는다. Running stream은 이미 loaded version을 유지하고 restart/redeploy해야 새 model을 쓴다. 따라서 latest publish만으로 running inference가 즉시 바뀌지는 않는다.

Primitive/array/map/struct/mediaReference를 지원하지만 objectSet 같은 type은 validation에서 거절한다. Batch는 warm pool을 꺼야 한다. Streaming은 idle/window 대기 중에도 task manager와 sidecar 할당 비용이 지속된다.

## Marketplace

Batch trained model은 Include with content로 자동 포함되거나 product input으로 설치자가 기존 model을 고를 수 있다. Streaming trained-model pipeline과 streaming time-series target은 Marketplace 미지원이다. Struct constant, nonconstant complex expression, options/struct-locator parameter와 Python-transform parameterized schedule에도 제한이 있다.

Packaging 기본은 모든 input/column required다. Optional input은 empty, optional column은 null이 되어 downstream logic의 의미를 바꿀 수 있다. Marketplace validation은 기본 off이며 pipeline별로 저장한다. Packaging warning 없음은 다른 pipeline 오류까지 없다는 뜻이 아니다.

## Java export의 경계

Code export는 standard Spark batch만 지원하고 대상 Java transforms repository branch의 기존 file/code를 지운다고 명시한다. 생성 코드는 원래 PB로 되가져올 수 없다. UDF, LLM/model/embedding, media, geotime 등은 todo placeholder가 될 수 있고 native Spark fallback의 edge-case 동작도 원래 PB와 다를 수 있다.

Export를 실행 가능한 동등성 보증으로 취급하지 않고 Java 결과를 별도로 검증한다. Built-in PySpark export는 없다. Source가 제시하는 LLM Java→PySpark 변환 역시 수동 검증이 필요한 별도 conversion이다. 이 문서는 export, package install, model inference를 실행하지 않았다.

## 출처

- [Palantir Pipeline Builder, export-pipeline](https://www.palantir.com/docs/foundry/pipeline-builder/export-pipeline)
- [Palantir Pipeline Builder, marketplace-pipeline-builder](https://www.palantir.com/docs/foundry/pipeline-builder/marketplace-pipeline-builder)
- [Palantir Pipeline Builder, transforms-trained-model](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-trained-model)

## 관련 문서

- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Pipeline-Expressions]]
