---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["팔란티어 Python Dataset 입출력"]
---

# Dataset, 파일과 Virtual Table 입출력

같은 dataset을 다루더라도 Spark runtime, single-node runtime과 `foundry.transforms.Dataset`의 반환값과 제약은 다르다. 파일 쓰기, 테이블 schema 등록과 트랜잭션 중단을 구별해야 한다.

## 입력 객체와 반환 형식

| 표면 | 테이블 읽기 | 파일 접근 |
|---|---|---|
| `TransformInput` | `dataframe()`은 PySpark, `pandas()`는 pandas | `FileSystem` |
| `LightweightInput` | `arrow()`, `pandas()`/`dataframe()`, `polars(lazy=...)` | `FoundryDataSidecarFileSystem`, `path()`로 파일 다운로드 |
| `Dataset.get(alias)` | `read_table(format=...)` | files, upload_file, upload_directory |
| `TableTransformInput` | virtual table의 Spark DataFrame, 선택적 read options | 지원 표면은 table 종류에 따라 확인 |

입력/출력 객체에서 RID, branch, 경로와 트랜잭션 범위를 조회할 수 있다. Spark 입력은 column descriptions와 typeclasses도 노출한다. lightweight의 `dataframe()`은 pandas이므로 이름만 보고 Spark 연산을 적용하면 안 된다.

`Dataset.read_table`은 Arrow, pandas (`dataframe`은 pandas 별칭), Polars, lazy Polars와 raw path 형식을 제공한다. `columns`, `row_limit` 또는 `where` 필터를 적용할 때는 eager Arrow/pandas/Polars 형식과 `mode='current'`를 사용해야 한다. lazy Polars나 path를 이 조합에 넣지 않는다. `force_dataset_download`는 로컬 데이터가 있어도 재다운로드하게 한다.

`where`는 `Column.get(...)`로 만든 비교, null 검사, 포함과 구간 필터를 받고 `&`, `|`, `~`로 결합한다. `select`와 `limit`도 Dataset을 반환해 연결할 수 있으며 실제 읽기는 `read_table`에서 수행된다.

## 쓰기 모드는 파일 충돌의 계약이다

| 모드 | 기존 데이터와의 관계 |
|---|---|
| `replace` | 새로 쓴 내용으로 기존 dataset 대체 |
| `modify` | 추가하되 같은 파일을 덮어쓸 수 있음 |
| `append` | 추가만 하며 기존 파일 덮어쓰기 금지 |

쓰기 후에는 모드를 바꿀 수 없다. 데이터 행의 중복 제거, upsert와 업무 식별자 충돌 처리를 이 파일 모드 자체가 제공한다고 가정하지 않는다. `Dataset.abort`와 Spark Output의 `abort`는 그 출력에 대해 호출 전후의 쓰기를 무시한다. job 전체 중단은 context의 `abort_job`이다.

## 테이블 쓰기와 metadata 확정

`Dataset.write_table`과 lightweight Output의 `write_table`은 데이터 업로드, schema 추론/등록과 column description 갱신을 묶는다. pandas, Arrow, Polars, DuckDB relation이나 지정 경로를 받을 수 있으며 실제 허용 형식은 메서드별로 확인한다. lightweight Output은 LazyFrame도 받는다.

출력의 `path_for_write_table`은 로컬 파일 쓰기 경로다. `path_for_object_store_write_table`은 로컬 S3 proxy를 거치는 가상 object-store 경로이며 실제 cloud bucket 주소와 같지 않다. query engine의 비동기 최적화 IO를 위해 제공된다.

raw Parquet를 직접 올렸다면 업로드 성공 후 `put_metadata`를 호출해 schema를 추론하고 등록한다. 파일이 하나도 성공적으로 업로드되기 전에 호출하면 실패한다. 데이터 쓰기를 다시 하지 않고 metadata만 바꾸려면 이 경로를 사용한다. `write_table(None)`은 해당 출력 트랜잭션에 먼저 쓴 데이터의 schema 추론을 요청할 수 있다.

column description은 실제 column과 교집합으로 적용되며 각 설명은 최대 800자다. lightweight API의 이전 단수 `column_description`과 복수 `column_descriptions`는 호환을 위해 모두 있지만 동시에 넘길 수 없다. 신규 호출에는 복수 인자를 사용한다.

Spark `write_dataframe`의 bucket columns와 bucket count는 함께 지정한다. partition columns, bucket 내 정렬, output format과 writer options는 별도 설정이다. 기본 format은 Parquet다. typeclass 항목은 `name`, `kind` 두 key만 받으며 각각 최대 100자다. 이를 다른 metadata를 넣는 임의 dictionary로 사용하지 않는다.

`read_unstaged_dataset_as_polars_lazy`는 아직 commit하지 않은 로컬 결과에 expectation을 적용하기 위한 경로다. expectation 실패로 빌드를 중단할 수 있도록 commit 전에 수행한다. 성공적인 함수 반환과 데이터 commit의 경계를 혼동하지 않는다.

## 파일 열거와 크기 편향

Spark `FileSystem.files`는 `(path, size, modified)` DataFrame을 만든다. 분할 비용은 파일의 디스크 크기에 `spark.files.openCostInBytes`를 더한 값이며 `spark.files.maxPartitionBytes`를 기준으로 묶는다. 제한보다 큰 단일 파일은 하나의 분할에 들어갈 수 있다.

packing heuristic의 `ffd`와 `wfd` 중 후자는 분포 균등성이 떨어질 수 있지만 훨씬 빠르므로 파일 수가 매우 많을 때 권장된다. row 수만이 아니라 파일 수/크기도 성능 판단에 넣는다.

`ls`는 dataset root 아래를 재귀 탐색하며 glob, globstar와 regex를 지원한다. 기본적으로 점이나 밑줄로 시작하는 숨김 파일은 제외한다. Spark의 `FileStatus`는 path, byte size와 UTC epoch 기준 millisecond modified 값을 가진 namedtuple이며 tuple의 `count`와 `index`도 따른다. `index`는 없으면 ValueError다.

single-node의 `FoundryDataSidecarFileSystem.open`도 Python file-like 객체를 반환한다. `with`로 닫으며 특히 쓰기에서는 종료를 보장한다. `FoundryDataSidecarFile.read/write`는 `io.FileIO`와 유사하다. 파일 접근과 데이터셋 전체를 로컬로 내려받는 `path`의 비용은 구별한다.

## Virtual Table은 기반 table의 지원을 확인한다

`TableTransformInput.dataframe(options=...)`는 underlying table의 read options를 전달한다. `catalog`와 full-qualified Spark V2 `identifier`는 기반 table이 노출할 때만 제공되며 그렇지 않으면 ValueError다. 이 기능을 모든 Foundry dataset의 공통 계약으로 일반화하지 않는다. 증분 table의 changelog는 [[Palantir-Python-Incremental-Contract]]에서 별도로 다룬다.

이 문서는 API 명세 대조 결과다. 실제 파일 업로드, 대량 partition 성능과 dataset commit은 시험하지 않았다.

## 출처

- [Palantir, dataset](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-dataset)
- [Palantir, filestatus](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-filestatus)
- [Palantir, filesystem](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-filesystem)
- [Palantir, foundrydatasidecarfile](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-foundrydatasidecarfile)
- [Palantir, foundrydatasidecarfilesystem](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-foundrydatasidecarfilesystem)
- [Palantir, incrementallightweightoutput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementallightweightoutput)
- [Palantir, incrementaltabletransforminput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementaltabletransforminput)
- [Palantir, incrementaltransformoutput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-incrementaltransformoutput)
- [Palantir, lightweightinput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightinput)
- [Palantir, lightweightoutput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-lightweightoutput)
- [Palantir, tabletransforminput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-tabletransforminput)
- [Palantir, transforminput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transforminput)
- [Palantir, transformoutput](https://www.palantir.com/docs/foundry/api-reference/transforms-python-library/api-transformoutput)

## 관련 문서

- [[Palantir-Python-Transform-Definition]]
- [[Palantir-Python-Incremental-Contract]]
- [[Palantir-Data-Pipeline-Operations]]
