---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Iceberg transform의 runtime, API와 property 수명

transforms-tables의 TableInput/TableOutput은 dataset Input/Output과 다른resource선언이다. single-node transform.using는 IcebergInput/Output,Spark는 TableTransformInput/Output을 받는다. single-node polars는 LazyFrame,pandas는DataFrame,arrow는Table을 반환하고 write_table로 쓴다. Spark는 dataframe/write_dataframe을 쓴다.

## Native API와 초기write

Spark identifier/catalog로 SQL MERGE/UPDATE/DELETE/procedure를 호출하고 single-node table()로 PyIcebergTable을 얻는다. 최초 output.table()은None일 수 있어 write_table로 seed한다. Spark nativewriter는 incremental이면 append,첫run이면 createOrReplace를 구분한다.

Dataset↔Iceberg 혼합input/output도 가능하며 Arrowbatchreader를 DuckDB에 register할 수 있다. 전체Pandas/Arrow로모으는 memory와 실제output형태를 확인한다. key anti-join으로current/previoussnapshot을 비교하는 예제는 새key찾기이며 같은keyupdate/delete의 완전한CDC가 아니다.

## Engine 지원과 source간차이

Spark Python은 append/changelog와 CSE를,Foundrysingle-nodeAPI는 append/CSE를 지원하지만 CSEfilterpushdown은 미지원이다. nativePyIceberg는CSE/changelog미지원이다. BuilderSpark는append만,changelog는미지원이며 Faster의incremental지원표는append/changelog미지원으로 되어 있다.

다른2026-10공지는Faster incremental output을 안내하므로 input읽기와 output쓰기의 범위를 나눈다. Icebergoutput선택지는 projectstorage가 configured된pipeline에만 보인다. preview뒤deploy하고 output/schema/runtime을 확인한다.

## Properties

Foundry.branch.*,foundry.rid,foundry.table-version과 encryption/storage/path관련protectedproperty는 임의수정하지 않는다. created-at/format-version/historyexpire/previousversions같은허용키만 바꾼다. Foundrydefaults가upstreamdefault보다우선하고 나머지는Icebergdefault를 따른다.

현재기본snapshotmaxage30일,metadata delete-after-commit=false,previousversionsmax1,objectstorageenabled=true,partitionedpaths=false다. 바뀔수있는default이므로 필요한값을 허용범위내명시한다. write_dataframe의replace가설정을덮지않도록 output을먼저쓴뒤property를설정한다. source의merge-on-read/age0예제를 일반추천으로복사하지않는다.

## 출처

- [Palantir, python-transform-basics](https://www.palantir.com/docs/foundry/iceberg/python-transform-basics)
- [Palantir, code-examples](https://www.palantir.com/docs/foundry/iceberg/code-examples)
- [Palantir, advanced-apis](https://www.palantir.com/docs/foundry/iceberg/advanced-apis)
- [Palantir, data-pipelines](https://www.palantir.com/docs/foundry/iceberg/data-pipelines)
- [Palantir, properties](https://www.palantir.com/docs/foundry/iceberg/properties)

## 관련 문서

- [[Palantir-Iceberg-CDC-Semantics]]
- [[Palantir-Iceberg-Maintenance-and-History]]
