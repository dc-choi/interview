---
tags: [palantir, workbook, persistence, spark]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Code Workbook 실행과 persistence"]
---

# Workbook 실행과 persistence

Code Workbook은 Python/R/Spark SQL 분석을 graph와 선형 Paths로 표현하는 legacy 도구다. 추가 개발은 기대하지 않지만 지원은 유지된다. 새 운영 pipeline은 Builder/Repositories, 탐색은 Workspaces 등의 현재 가용 경로와 비교한다. 과거 comparison의 Workbook 권고를 신규 개발의 무조건 우선순위로 읽지 않는다.

## Node의 논리와 dataset materialization

Transform은 code/template/manual entry로 여러 input과 하나의 output을 갖는다. Workbook alias와 Foundry resource 이름은 다르다. Alias 변경은 다른 소비자의 dataset 이름을 자동 변경하지 않는다. Graph/Paths는 같은 논리 node의 다른 편집 화면이다.

새 node는 기본 unpersisted다. Persist를 켜면 이전 saved dataset에 다시 연결하거나 새 resource를 만든다. Saved node는 외부 소비, schedule와 Data Lineage의 resource가 된다. Unsaved node는 logical block이며 downstream saved dataset의 code에 합쳐진다.

Downstream 실행은 persisted 경계까지의 최신 unsaved logic을 다시 수행한다. 위 node를 별도로 preview하지 않아도 된다. 반대로 persisted parent는 저장한 data를 읽으므로 code 변경만으로 새 결과가 되지 않는다. 큰 join을 여러 downstream이 공유하거나 nondeterministic 계산의 동일 결과를 재사용하려면 적절한 materialization 경계를 둔다.

Optional persistence 전용 가이드는 unsaved는 preview, saved는 write를 실행한다고 설명한다. General transform의 오래된 두 job(50-row preview와 전체 write) 설명과 구분한다. Nondeterministic current time/비결정적 row order를 preview와 실제 output이 같다는 전제로 사용하지 않는다. 50-row preview가 먼저 보인 사실은 전체 write 완료가 아니다.

Batch build는 unsaved logic도 downstream dataset에 포함하지만 unsaved node의 UI preview/visualization을 갱신하지 않는다. 화면이 옛 결과여도 saved output은 새로 build되었을 수 있다. Input Update table preview 역시 upstream dataset build나 모든 transform 재실행이 아니다.

## 타입 변환은 memory와 의미를 바꾼다

Python은 Spark/Pandas/TransformInput/Object, R은 SparkR/R data.frame/TransformInput/Object를 받는다. SQL은 Spark dataframe만 받는다. 여기의 Object는 model/custom file format이며 Ontology object가 아니다. Cross-language conversion은 Spark를 중간으로 쓸 수 있다.

Pandas/R data.frame은 driver로 collect하므로 먼저 Spark에서 filter/select/aggregate한다. R Arrow 경로의 Long/Array/Map/Struct/Datetime 제약을 확인하고 cast/drop의 의미 손실을 검토한다. SQL code에 alias를 쓰는 것만으로 dependency가 추가되지 않으며 UI input 연결도 필요하다.

Python output은 Spark/Pandas/FoundryObject/None, R은 data.frame/FoundryObject/NULL, SQL은 Spark dataframe이다. None/NULL은 실행 가능하지만 downstream input으로 쓸 수 없다. 옛 FAQ의 모든 node dataframe 필수 설명보다 이 세부 output 계약을 따른다. Manual entry는 Double/Integer/Boolean/String과 500행 제한이다.

Dataset read/write는 row order를 기본 보존하지 않는다. 결정적 정렬에는 tie-break key도 필요하다. Single partition 저장 예시를 모든 downstream read의 순서 보장으로 확대하지 않는다. Dataset description 변경은 branch 전체에 영향을 준다.

## Console과 global code

언어별 REPL에서 dataframe 결과를 Add to graph로 승격할 수 있다. Console 실행과 graph transform 실행은 다르다. macOS Cmd+Shift+Enter/Windows Ctrl+Shift+Enter는 선택 code를 console로 보내고 Cmd/Ctrl+Enter는 선택 dataset을 실행한다. Shortcut help에서 platform별 실제 동작을 확인한다.

Global code는 해당 언어 transform 전에 실행되는 helper/constant다. 한 transform의 list/function mutation은 다른 transform에 전파되지 않는다. 공유 mutable runtime state로 업무 순서를 구현하지 않는다. Native Spark expression을 우선하고 UDF가 필요한 경우 실행 비용을 측정한다.

## 출처

- [Palantir, Code Workbook](https://www.palantir.com/docs/foundry/code-workbook)
- [Palantir, Code product comparison](https://www.palantir.com/docs/foundry/code-workbook/code-products-comparison)
- [Palantir, Core concepts](https://www.palantir.com/docs/foundry/code-workbook/core-concepts)
- [Palantir, Workbooks](https://www.palantir.com/docs/foundry/code-workbook/workbooks-overview)
- [Palantir, Transforms](https://www.palantir.com/docs/foundry/code-workbook/transforms-overview)
- [Palantir, Optional persistence](https://www.palantir.com/docs/foundry/code-workbook/optional-data-persistence)
- [Palantir, Input and output types](https://www.palantir.com/docs/foundry/code-workbook/workbooks-input-output-types)
- [Palantir, Languages](https://www.palantir.com/docs/foundry/code-workbook/workbooks-languages)
- [Palantir, Console](https://www.palantir.com/docs/foundry/code-workbook/workbooks-console)
- [Palantir, Global code](https://www.palantir.com/docs/foundry/code-workbook/workbooks-global-code)
- [Palantir, Keyboard shortcuts](https://www.palantir.com/docs/foundry/code-workbook/keyboard-shortcuts)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/code-workbook/getting-started)
- [Palantir, Workbook FAQ](https://www.palantir.com/docs/foundry/code-workbook/faq)
- [Palantir, PySpark reference](https://www.palantir.com/docs/foundry/code-workbook/pyspark-reference)
- [Palantir, SparkR reference](https://www.palantir.com/docs/foundry/code-workbook/sparkr-reference)
- [Palantir, Spark](https://www.palantir.com/docs/foundry/code-workbook/transforms-spark)

## 관련 문서

- [[Palantir-Workbook-Environments-and-Sessions|Environment와 session]]
- [[Palantir-Workbook-Branches-and-Migration|Branch와 migration]]
