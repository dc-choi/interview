---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Single-node 파일 I/O와 lazy 실행"]
---

# Single-node 파일 I/O와 lazy 실행

Engine 선택은 input download, query execution과 output materialization을 나누어 판단한다. Single node가 항상 전체 dataset을 RAM에 올린다는 뜻은 아니지만 collect, pandas 변환, concat 결과와 GPU collection은 memory 한계를 가진다.

## Schema 없는 file과 stream

filesystem().ls()는 schema 유무와 관계없이 path/size(bytes)/modified(epoch milliseconds)를 나열한다. .path(), .pandas(), .polars(), .arrow(), .filesystem().files()는 schema가 있는 dataset에 한정한다고 안내한다. ls의 glob/regex filtering과 structured row filtering은 다르다.

File open은 sequential stream이며 seek/tell을 보장하지 않는다. Excel/ZIP처럼 random access가 필요한 parser는 disk/BytesIO에 먼저 복사하고 flush한다. 원문 일부 single-node ZIP 예시는 stream을 바로 ZipFile에 넣어 이 제약과 어긋난다. Excel은 openpyxl 등 dependency와 dtype=str로 file간 schema 차이도 처리한다.

ThreadPoolExecutor는 single container 안의 병렬 처리다. Shared DuckDB connection을 여러 thread에서 쓰는 예제나 CSV 내용을 filename API에 넘기는 예제를 검증 없이 사용하지 않는다. Empty file list/zero rows의 concat/schema도 명시한다. Spark distributed file processing은 FileStatus DataFrame/RDD 작업으로 분산하며 toDF(schema)를 줘 empty inference 실패를 막는다. File-processing 예제의 out/my_output 변수 불일치와 placeholder는 완성 코드가 아니다.

## Polars lazy와 GPU

polars(lazy=True)는 lazy plan과 streaming을 켜고 기본 eager는 전체 input을 disk에 prefetch한다. Lazy input은 object-store proxy를 통해 projection/predicate pushdown을 시도하므로 실제로 읽는 양을 줄일 수 있다. 모든 query가 더 빨라지거나 모든 operator가 bounded memory라는 보장은 아니다. explain으로 plan을 보고 중간 collect는 materialization 비용을 감수해 디버깅한다.

Streaming dataset의 incremental window가 file0개면 lazy scan이 BinderException을 낼 수 있다. ctx.is_incremental과 filesystem listing으로 먼저 empty를 처리한다. GPU cuDF-Polars는 collect를 지원하지만 streaming sink는 미지원이고 결과가 GPU memory에 들어가야 한다. Unsupported operation은 CPU fallback할 수 있으므로 GPU 실행이 필수면 raise_on_fail=True 등 명시 실패를 검토한다. cuDF pandas import도 runtime에 두는 예시와 TLLV 조건을 함께 검토한다.

## DuckDB

ctx.duckdb().conn은 input parameter name을 unmaterialized table로 등록한다. 기본 read는 incremental added, 그 외 current이며 read_modes로 input별 지정한다. sql_from_file 경로는 호출 Python file 기준이다. Ibis/SQLFrame은 별도 third-party dependency이며 Palantir 지원 보장이 없다. SQLFrame activation 뒤 PySpark import를 수행하고 API 호환 범위를 확인한다.

memory_limit/threads를 구성할 수 있으나 query별 spill/지원 한계는 설치 version에 따른다. input_files()로 raw file path를 받아 scan option을 제어하고 COPY TO로 disk 또는 object store에 쓴다. Local path write_table은 Parquet output path 계약을 따르며 직접 업로드 후 put_metadata로 schema를 등록할 수 있다.

Incremental output filename은 transaction간 고유해야 한다. UUID filename pattern 없이 같은 file을 재사용하면 conflict/overwrite 위험이 있다. Partition write는 WRITE_PARTITION_COLUMNS=true를 권한다. DuckDB의 null partition path는 문자열 null이고 Hive의 __HIVE_DEFAULT_PARTITION__와 다르므로 downstream parsing과 null infill을 확인한다.

## Format fidelity

raw path와 Arrow/DataFusion/cuDF는 schema/format 제약까지 사용자가 책임진다. pandas가 읽는 INT64 TIMESTAMP(NANOS,false) Parquet을 Spark가 같은 방식으로 읽는다고 보장하지 않는다. Error를 삼키고 output을 쓰지 않은 성공 job은 empty snapshot을 만들 수 있다. 실제 engine/file parsing은 실행하지 않았다.

## 출처

- [Palantir Python transforms, advanced-compute](https://www.palantir.com/docs/foundry/transforms-python/advanced-compute)
- [Palantir Python transforms, duckdb](https://www.palantir.com/docs/foundry/transforms-python/duckdb)
- [Palantir Python transforms, file-processing](https://www.palantir.com/docs/foundry/transforms-python/file-processing)
- [Palantir Python transforms, lightweight-examples](https://www.palantir.com/docs/foundry/transforms-python/lightweight-examples)
- [Palantir Python transforms, polars-lazy](https://www.palantir.com/docs/foundry/transforms-python/polars-lazy)
- [Palantir Python transforms, unstructured-files](https://www.palantir.com/docs/foundry/transforms-python/unstructured-files)

## 관련 문서

- [[Palantir-Python-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Python-Spark-Incremental-Batches]]
- [[Palantir-Python-Incremental-Media-Contracts]]
