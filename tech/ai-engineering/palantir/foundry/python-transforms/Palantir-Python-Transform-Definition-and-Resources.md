---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python transform 정의, 등록과 compute 경계"]
---

# Python transform 정의, 등록과 compute 경계

Transform은 input/output 선언, 함수 signature, compute logic을 묶고 Pipeline이 이를 등록한다. JobSpec은 Checks 시점에 resource 관계를 고정하므로 실행 중 새 input/output 이름을 만들어 관계를 바꿀 수 없다. 선언과 다른 runtime 입력 목록도 실패할 수 있다.

## Decorator와 실행 위치

| 경로 | 계약 |
| --- | --- |
| @transform.using / @transform.lightweight | 기본 single node, LightweightContext/Input/Output |
| @lightweight + @transform | 계속 지원하는 legacy single-node 문법 |
| @transform.spark.using | Foundry Spark, distributed DataFrame |
| @transform_df / @transform_pandas | 반환 DataFrame을 자동 write, mode 세부 제어 제한 |
| @transform.databricks/bigquery/snowflake.using | source system compute를 orchestration하는 별도 경로 |

.using은 transforms≥3.68.0/plugin≥1.978.0, Spark .using은≥3.95.0/plugin≥1.1003.0이 필요하다. 같은 이름의 API가 설치된다는 가정 대신 repository template/library version을 함께 확인한다. API reference index는 연결된 모든 class 본문을 대신하지 않는다.

Polars/pandas/DuckDB는 single-node여도 lazy/streaming으로 memory보다 큰 input을 처리할 수 있다. 원문의 pandas<1GB, Polars/DuckDB1~50GB, Spark>50GB 안내는 workload 선택 출발점이며 강제 크기 한도가 아니다. Join/aggregation과 결과 materialization에 따라 peak memory가 달라진다.

## 지원 기능을 엔진별로 확인

비교표는 LLM의 snapshot 처리를 양쪽에서, incremental LLM 처리는 single node에서 지원한다고 구분한다. Media와 external system도 지원하되 media 세부 API 제한은 별도다. Output previous schema enforcement, run-as-user/allowed duration, unmark 방식, expectations, virtual table은 같은 기능이 아니다. Source unmark는 single node 미지원이며 output sever_permissions도 지원하지 않는다고 표기한다.

single-node virtual table의 일반 Polars/pandas 직접 처리는 미지원이고 pushdown orchestration은 지원한다. Model input 지원이 Spark model-output 지원까지 뜻하지 않는다. 일반 overview보다 기능별 문서와 실제 installed API를 우선 대조한다.

## Resource와 custom image

.with_resources의 cpu_cores 기본2는 fractional도 가능하고 memory_mb/memory_gb 중 하나만 쓴다. 기본 한도8cores/64GB의 상향은 지원 요청 대상이다. GPU type과 queue는 enrollment마다 가용성이 다르다. CPU spare capacity는 항상 보장되지 않으므로 observed utilization과 requested resources를 구분한다.

Lightweight BYOC는 linux/amd64, numeric user5001과 Artifacts image/import 설정을 요구한다. 실행 image tag latest는 허용하지 않으며 Python을 image 안에 설치할 필요는 없다. Base-image Dockerfile의 latest 예시는 실행 image tag 계약과 별개다. Custom-image transform은 preview 미지원이다. 예제의 누락 import/외부 compiler exit-status 처리를 완성된 실행 코드로 보장하지 않는다.

## 등록과 staleness

Automatic discover_transforms는 module을 재귀 import하므로 top-level code도 실행한다. Generator는 함수 안에서 transform을 만들고 source=source로 closure를 고정한 뒤 반환 list를 module 변수에 둔다. Manual registration은 중복 output을 검사하지만 Code Repositories Build 버튼이 발견하지 못하면 Data Lineage/Dataset Preview에서 build할 수 있다.

setup.py는 root라는 transforms.pipelines entry point로 Pipeline을 export하고 shebang을 보존한다. Repository upgrade는 src/conda_recipe와 build.gradle을 보존하되 properties는 template 우선 merge, 다른 template 파일은 overwrite할 수 있다.

TLLV는 module-level import와 다른 module object를 patch하지 않는 조건에서 logic staleness를 추적한다. 조건에 맞지 않으면 비활성화하며 외부 config 파일은 tllvFiles/package_data도 검토한다. **Logic version 변경으로 stale가 되는 것과 incremental semantic_version으로 과거 결과를 재계산하는 것은 별개다.**

Output transaction은 job 성공 때 commit한다. Write error를 삼키거나 output을 쓰지 않으면 성공한 empty snapshot이 생길 수 있다. 예제의 잘못된 engine decorator나 미정의 변수까지 실행 보장으로 받아들이지 않는다. 실제 build는 수행하지 않았다.

## 출처

- [Palantir Python transforms, transforms-python](https://www.palantir.com/docs/foundry/transforms-python)
- [Palantir Python transforms, bring-container](https://www.palantir.com/docs/foundry/transforms-python/bring-container)
- [Palantir Python transforms, compute-engines](https://www.palantir.com/docs/foundry/transforms-python/compute-engines)
- [Palantir Python transforms, configure-resources](https://www.palantir.com/docs/foundry/transforms-python/configure-resources)
- [Palantir Python transforms, getting-started](https://www.palantir.com/docs/foundry/transforms-python/getting-started)
- [Palantir Python transforms, lightweight-api](https://www.palantir.com/docs/foundry/transforms-python/lightweight-api)
- [Palantir Python transforms, lightweight-api-evolution](https://www.palantir.com/docs/foundry/transforms-python/lightweight-api-evolution)
- [Palantir Python transforms, lightweight-overview](https://www.palantir.com/docs/foundry/transforms-python/lightweight-overview)
- [Palantir Python transforms, overview](https://www.palantir.com/docs/foundry/transforms-python/overview)
- [Palantir Python transforms, pipelines](https://www.palantir.com/docs/foundry/transforms-python/pipelines)
- [Palantir Python transforms, project-structure](https://www.palantir.com/docs/foundry/transforms-python/project-structure)
- [Palantir Python transforms, transforms](https://www.palantir.com/docs/foundry/transforms-python/transforms)
- [Palantir Python transforms, transforms-pipelines](https://www.palantir.com/docs/foundry/transforms-python/transforms-pipelines)
- [Palantir Python transforms, transforms-python-api](https://www.palantir.com/docs/foundry/transforms-python/transforms-python-api)
- [Palantir Python transforms, transforms-python-api-classes](https://www.palantir.com/docs/foundry/transforms-python/transforms-python-api-classes)

## 관련 문서

- [[Palantir-Python-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Python-Spark-Incremental-Batches]]
- [[Palantir-Python-Incremental-Media-Contracts]]
