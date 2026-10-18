---
tags: [palantir, foundry, pipeline-builder, data-engineering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder media와 공간 데이터 계약"]
---

# Pipeline Builder media와 공간 데이터 계약

Logical geospatial type은 base representation에 제약을 더한다. Geometry는 WGS84 GeoJSON string, GeoPoint는 double longitude/latitude struct, Ontology GeoPoint는 lat,lon string이다. String을 Geometry 입력으로 바로 쓰지 않고 parse 또는 logical cast의 검증 결과를 확인한다.

## 공간 조인의 전제

Distance join의 distance는 선택 CRS 단위다. EPSG:4326이면 degrees이며 항상 meters가 아니다. Intersection에는 touching도 포함되지만 contains는 boundary를 제외한다. KNN은 base geometry와 memory에 들어가는 neighbors GeoPoint를 쓰고 tie는 arbitrary, output order는 보장하지 않는다. ANN은 approximate로 exact KNN의 결과 보장이 아니다.

Geospatial guide의 규모 안내는 geometry 복잡도, output 증가와 skew를 전제한다. Intersection은 약 34-point/양쪽 100만/2배 output, 큰 geometry 1건(약 4만 point) 대 50만 row 같은 제한된 예시다. KNN의 modest k<5와 수십만 neighbors 안내는 함수 index의 3GB에 100만 point memory 예시와 다른 supported-scale 설명이므로 하나의 일반 상한으로 합치지 않는다.

Guide는 intersection anti join을 batch/streaming 지원이라 하지만 종합 function index의 해당 항목은 streaming만 표시한다. Faster tips는 geospatial 미지원이라고 넓게 말하지만 개별 함수는 Faster를 지원하기도 한다. 실제 함수 version과 engine validation을 확인하며 이 충돌을 임의로 해소하지 않는다.

결합 전 불필요한 column을 줄이고 geometry를 normalize하며 null과 non-determinism을 확인한다. Checkpoint와 더 큰 memory가 도움이 될 수 있지만 cross-product 규모의 output은 본질적 비용을 남긴다. Normalize/prepare는 Ontology indexability를 위한 별도 단계이며 valid GeoJSON만으로 index 가능하다고 보장하지 않는다.

## Media 입력과 변환

Media manipulation은 media output, extraction은 tabular output을 만든다. Media set은 media 또는 table read mode로 사용할 수 있으며 reference를 dataset으로 보내려면 table mode와 join을 쓴다. Generic dataset-of-files에서 만든 media reference는 일부 media transform에 거절된다.

Multimodal media는 Has media schema로 filter하면 type을 좁혀 PDF extraction/crop 같은 schema-specific transform을 사용할 수 있다. PDF raw text와 OCR은 다른 추출 경로다. Media guide는 transformed media의 extraction, dataset-referenced media manipulation, deleted item을 포함한 changelog media 변환과 PB incremental media를 제한한다. 다른 output 안내가 일부 incremental media input→dataset 조합을 언급하므로 mode별 지원을 별도 확인한다.

일반 GIS/형식 계약은 [[Palantir-Geospatial-Coordinates-and-Formats]], [[Palantir-Geospatial-Geometry-Operations]], [[Palantir-Geospatial-Spatial-Indexing]]에, join의 version별 동작은 [[Palantir-Pipeline-Geospatial-Join-Contracts]]에 이어진다. 군사 운용 절차를 추론하거나 실제 공간/미디어 runtime 시험은 수행하지 않았다.

## 출처

- [Palantir Pipeline Builder, transforms-geospatial](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-geospatial)
- [Palantir Pipeline Builder, transforms-transform-media](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-transform-media)

## 관련 문서

- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Pipeline-Expressions]]
