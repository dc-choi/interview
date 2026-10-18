---
tags: [palantir, incremental, transaction, compaction]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry incremental transaction과 성능"]
---

# 증분 트랜잭션과 장기 성능

Incremental 처리는 입력의 미처리 transaction만 읽고 출력을 누적하는 방식이다. UI에서 input을 Incremental로 표시하는 것만으로 실행이 보장되지는 않는다. 입력 transaction, 변환 로직과 output의 변경 의미가 모두 호환되어야 한다.

## APPEND 계약과 재계산 경로

Pipeline Builder의 해당 가이드는 APPEND 또는 기존 파일을 수정하지 않는 UPDATE 입력을 요구한다. 다음 build가 이전 output row를 수정해야 하는 로직은 단순 append 모델로 처리할 수 없다. Window/aggregation/pivot이 현재 transaction에만 적용된다는 의미도 확인한다. Output의 force-incremental 옵션은 증분이 불가능할 때 자동 전체 실행 대신 실패하게 하는 선택이다.

Source sync부터 APPEND로 가져오면 source 부하와 저장/계산을 함께 줄일 수 있다. SNAPSHOT sync 뒤에서 APPEND를 유도할 수도 있지만 end-to-end 절감과 같지는 않다. 예기치 않은 SNAPSHOT 입력, DELETE와 schema 변경을 테스트해 복구 경로를 마련한다.

로직 변경을 과거 데이터까지 적용하려면 replay를 고려한다. Builder의 Replay on deploy는 전체 입력으로 output SNAPSHOT을 만들고 이후 APPEND에서 증분을 이어간다. 과거 데이터를 다시 처리하지 않는 변경과 모든 과거 결과를 바꾸는 변경을 release에서 구분한다.

## 파일 수와 transaction 수는 별개 병목이다

작은 APPEND가 쌓이면 적은 row 수에도 파일 목록 구성, active view 해석과 metadata 요청이 느려진다. 파일 수는 읽기/쓰기와 driver memory, transaction 수는 history/stats와 pre-compute 단계에 영향을 줄 수 있다. Spark stage 이전의 정체도 확인한다. Empty transaction이 많으면 파일 수가 작아도 문제가 된다.

| 대응 | 효과 | 남는 비용과 제약 |
|---|---|---|
| 주기적 SNAPSHOT | canonical view의 파일/transaction 누적 초기화 | 전체 재계산, downstream cascade, 업데이트 정지 시간, raw sync에는 그대로 적용 불가 |
| Dataset projection | 별도 저장 표현의 compaction으로 읽기 개선 | 추가 저장, canonical은 그대로, retention과의 호환 확인 |
| Retention | 필요 없는 과거 transaction 제거 | 이력 손실과 start/end 같은 교차 transaction 의미 훼손 가능 |

Projection이 모든 최신 transaction을 포함하지 않아도 유효 projection과 canonical tail을 합쳐 같은 view를 읽는다. Projection build와 canonical build는 별도로 진행할 수 있다. Projection을 제거하면 canonical 누적 비용이 다시 드러난다. 단순히 projection 최신성만으로 데이터 누락을 판단하지 않는다.

SNAPSHOT dummy input으로 cascade를 유도하는 방식은 가능하지만 lineage를 복잡하게 한다. Schedule parameterization으로 실행 모드를 바꾸는 방법도 있으며 replace 전에 전체 데이터가 준비되는지 확인해야 한다. Retention을 허용하는 Python incremental은 `allow_retention`을 설정하지만 교차 transaction 의존성을 자동 복구하지 않는다.

## Abort는 실패가 아니라 처리 완료로 진행한다

Committed empty/no-file transaction도 update event와 후속 schedule을 유발할 수 있다. Data Connection은 파일 0개의 transaction을 abort하지만 empty file이나 custom plugin metadata 갱신은 별도 경우다.

가장 upstream transform에서 정말 처리할 데이터가 없으면 output `.abort()`로 전파를 끊을 수 있다. Abort는 failure 통계를 늘리지 않으며 성공으로 취급하고 input pointer를 전진시킨다. 따라서 non-empty input에서 precondition 실패를 표현하려고 abort하면 데이터를 버릴 수 있다. 재시도가 필요한 실패와 빈 입력의 정상 종료를 구분한다.

Changelog로 update/delete 의미를 구현하면 상태 해석까지 row가 계속 늘어난다. Snapshot 시 latest state로 collapse할지 전체 시점 재현을 보존할지 결정한다. Projection은 history 의미나 unbounded logical row growth 자체를 해결하지 않는다.

## Schema 추론도 증분 계약이다

Dataset의 Apply a schema는 일부 데이터로 정적 추론한다. 이후 파일 형식 변화가 자동 반영된다는 보장이 없다. CSV/JSON을 build마다 동적으로 추론하면 추가 비용과 batch별 type 불일치가 생길 수 있다.

안정된 schema는 명시적으로 지정한다. CSV의 inferSchema를 끄면 string으로 읽고 필요한 field만 cast한다. Jagged row, encoding, path/offset/import timestamp/row number 같은 parsing metadata의 필요를 정한다. Parquet output에 허용되지 않는 column 문자가 추론되면 `sanitize_schema_for_parquet` 같은 정규화를 적용한다. JSON newline-delimited와 한 파일의 multiline object도 구분한다.

## 출처

- [Palantir, Incremental pipelines](https://www.palantir.com/docs/foundry/building-pipelines/incremental-overview)
- [Palantir, Creating incremental syncs](https://www.palantir.com/docs/foundry/building-pipelines/create-incremental-syncs)
- [Palantir, Incremental pipeline with Pipeline Builder](https://www.palantir.com/docs/foundry/building-pipelines/create-incremental-pipeline-pb)
- [Palantir, Maintaining high performance](https://www.palantir.com/docs/foundry/building-pipelines/maintaining-incremental-performance)
- [Palantir, Infer a schema for CSV or JSON files](https://www.palantir.com/docs/foundry/building-pipelines/infer-schema)

## 관련 문서

- [[Palantir-Pipeline-Engine-and-Authoring|Engine 선택]]
- [[Palantir-Parameterized-Schedule-Outputs|Parameterized schedule]]
- [[Palantir-Table-Storage|저장소와 과거 version]]
