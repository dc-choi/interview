---
tags: [palantir, pipeline, datafusion, spark]
status: done
verified_at: 2026-11-24
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry pipeline engine 선택"]
---

# Pipeline engine과 작성 도구 선택

Pipeline의 실행 방식은 허용 지연, 변경량, 변환 기능, 상태 관리와 운영 비용으로 고른다. Batch는 바뀐 입력의 전체를 다시 계산하고, incremental은 아직 처리하지 않은 변경을 계산하며, streaming은 계속 실행한다. 작은 데이터에서는 batch도 충분히 빠를 수 있다.

## 먼저 지연 요구를 검증한다

Batch로 업무 의미와 품질을 검증한 뒤 전체 재계산이 비용이나 SLA를 위협하면 incremental을 검토한다. 수분 지연으로 충분하면 상시 실행하는 streaming의 상태 복구와 가용성 부담을 감수할 이유가 줄어든다. 1분 미만이라는 지침은 설계 출발점이며 보장값이 아니다.

Pipeline Builder는 협업 graph와 지원 transform을 조합하는 경로다. Code Repositories는 filesystem, 특수 API, 외부 library와 직접 구현할 로직이 필요한 경로다. 둘의 출력 dataset을 연결하고 Data Lineage에서 공통 schedule과 health check를 관리할 수 있다. 도구 하나로 전체 pipeline을 통일할 필요는 없다.

SQL은 정형 변환에 적합하고 Python/Java는 파일 접근, 다중 출력과 incremental 코드 구현을 제공한다. Python은 PySpark와 외부 library를 활용한다. Supported languages의 SQL 성능 우위 설명을 모든 query와 engine의 절대 순위로 사용하지 않는다. Pipeline types의 incremental Python/Java 설명은 코드 API 범위이며 Pipeline Builder incremental 기능까지 제외하는 뜻은 아니다.

## Faster는 engine의 의미 차이를 포함한다

Faster는 이전 lightweight 명칭을 대체한 DataFusion 기반 single-node batch/incremental engine이다. Standard는 분산 Spark engine이다. 문서는 15분 안에 끝나는 pipeline이 가장 큰 이득을 본다고 안내한다. 공식 비교표의 최적 범위는 Faster가 압축 전 1~50GB, 2억 행 이하(표기 1-200 million)이고 Standard가 50GB 초과, 2억 행 초과다. 행 수 기준은 schema에 따라 달라지는 일반 지침이며, 적합한 transform이면 Faster도 single node에서 terabyte 입력을 처리할 수 있어 크기만으로 상한을 정하지 않는다.

같은 표에서 startup overhead는 Standard가 큼, Faster가 최소이고 memory 효율은 Standard가 좋음, Faster가 매우 좋음이다. 처리 속도는 작은 데이터에서 Standard가 느림, Faster가 매우 좋음이고, 중간 데이터에서 Standard가 빠름, Faster가 매우 좋음이며, 큰 데이터에서 Standard가 매우 좋음, Faster가 가변이다. 병렬 실행은 Standard가 분산, Faster가 single-node이며 memory spilling은 둘 다 자동이다. 문서는 아래의 알려진 제한(미지원 transform/expression과 동작 차이)에 걸리지 않으면 Faster를 먼저 쓰도록 권하고, 데이터 규모가 요구하거나 미지원 transform/expression이 필요하면 Standard Spark로 바꿀 수 있다고 안내한다.

Pipeline Builder에서 새 batch pipeline을 만들면 batch compute는 Faster가 기본으로 선택된다. Dataset과 media set의 batch 튜토리얼은 이 기본값을 바꿔 Standard를 고르도록 안내한다. 기본값을 그대로 두고 만든 pipeline이 Spark 전제의 기존 pipeline과 같은 engine이라고 가정하지 말고 생성 시 고른 compute를 확인한다.

Branch나 복제본에서 변환 호환성, 실제 결과와 사용량을 비교한다. Conversion checks로 미지원 node를 찾고 전환을 확인한다. 전환은 되돌릴 수 있지만 결과를 자동으로 동등하게 만들어 주지는 않는다. 공식 문서의 알려진 제한은 다음과 같다.

- Faster는 Standard batch와 같은 transform/expression 집합을 지원하지 않는다. 대표적으로 일부 geospatial과 array expression이 미지원이며, 개별 expression의 지원 여부는 functions index에서 확인한다. Trained model node와 time-series reference 생성도 미지원이다.
- 부동소수 마지막 자리, complex type의 cast/string 표현과 날짜 format 지원이 다를 수 있다.
- Decimal overflow는 NULL 대신 오류, `pow` overflow는 infinity 대신 NULL이다. Struct는 `<`, `>`, `==` 같은 비교 연산을 쓸 수 없고 complex type의 min/max는 미지원이다.
- Empty output은 빈 파일 하나 대신 파일 0개가 된다. Build stats는 row count 외에 미지원이다.

문서는 두 engine의 차이 때문에 결과를 Preview나 build output으로 항상 확인하라고 안내한다. 값만 비교하지 말고 null/overflow, 출력 파일 수와 downstream parser의 기대도 검증한다.

## External은 같은 source의 virtual table로 닫힌다

External pipeline은 외부 warehouse에서 실행하면서 Foundry lineage, security와 scheduling을 사용한다. Pipeline Builder는 Databricks/Snowflake를 지원하며 BigQuery는 이 UI 경로에서 미지원이다. 다른 engine의 Python compute pushdown 지원과 구분한다.

모든 입출력은 설정한 동일 source의 virtual table이어야 한다. Snowflake는 같은 external volume도 요구한다. Foundry dataset은 external pipeline 내부의 input/output으로 쓸 수 없지만 schedule로 다른 Foundry-native 단계와 연결할 수 있다.

Databricks는 serverless 또는 classic cluster ID를 설정한다. Source가 SQL warehouse이면 classic용 cluster ID를 별도로 제공해야 한다. Snowflake warehouse 미설정 시 source 기본값을 쓴다. 해당 가이드는 incremental, LLM/media, union, UDF와 geospatial을 미지원으로 명시한다. Preview와 실제 output을 함께 대조한다.

## 저장, 검증과 데이터 생성은 다른 단계다

Code Repositories autosave는 commit이 아니다. Commit은 변경을 기록하고 checks를 실행하며 Build는 commit/checks와 dataset 생성을 함께 실행한다. 의미 있는 commit message를 먼저 남기고 build한다. Branch build 성공 후 merge해도 master output은 별도로 build해야 한다. Revert도 commit을 되돌리는 PR이므로 데이터의 재생성까지 확인한다.

Preview는 sample/filter/다른 dataset/앞선 preview를 입력으로 사용할 수 있다. File input은 sample 파일을 지정한다. Sample 결과는 실제 전체 build의 join, scale, schema와 동일함을 보장하지 않는다. PR의 files, impact analysis와 pipeline review를 실제 branch output과 함께 검토한다.

Pipeline Builder는 output schema와 실제 연결을 설정하고 save/deploy 후 build 또는 deployment history에서 완료를 확인한다. Personal folder에는 pipeline을 저장할 수 없다. 날짜 cast에서 `MM`과 `mm`, 정제에서 empty-to-null/공백 축약/trim, join의 방향/종류/조건/right prefix를 명시한다. UI board 적용이나 deploy 요청 성공만으로 output 생성 완료를 판정하지 않는다.

Owner의 자동 merge는 required check가 최소 하나 있고 통과한 경우에 제공된다. 실제 merge 권한과 branch policy를 확인하며 다른 사용자의 branch를 삭제하지 않는다.

## 출처

- [Palantir, Building pipelines](https://www.palantir.com/docs/foundry/building-pipelines)
- [Palantir, Types of pipelines](https://www.palantir.com/docs/foundry/building-pipelines/pipeline-types)
- [Palantir, Pipeline Builder and Code Repositories considerations](https://www.palantir.com/docs/foundry/building-pipelines/considerations-pb-cr)
- [Palantir, Supported languages](https://www.palantir.com/docs/foundry/building-pipelines/supported-languages)
- [Palantir, Faster pipelines](https://www.palantir.com/docs/foundry/building-pipelines/create-faster-pipeline-pb)
- [Palantir, External pipelines](https://www.palantir.com/docs/foundry/building-pipelines/create-external-pipeline-pb)
- [Palantir, Dataset batch pipeline with Code Repositories](https://www.palantir.com/docs/foundry/building-pipelines/create-batch-pipeline-cr)
- [Palantir, Dataset batch pipeline with Pipeline Builder](https://www.palantir.com/docs/foundry/building-pipelines/create-batch-pipeline-pb)
- [Palantir, Media set batch pipeline with Pipeline Builder](https://www.palantir.com/docs/foundry/building-pipelines/create-batch-pipeline-pb-media-set)

## 관련 문서

- [[Palantir-Incremental-Transactions-and-Compaction|증분 처리와 compaction]]
- [[Palantir-Streaming-Keys-and-CDC|Streaming key와 CDC]]
- [[Palantir-Pipeline-Execution-and-Review|Builder 실행과 검토]]
