---
tags: [palantir, foundry, pipeline-builder, data-engineering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 실행 모드와 replay"]
---

# Pipeline Builder 실행 모드와 replay

Pipeline Builder는 논리를 중간 모델로 표현하고 Spark batch, DataFusion Faster, Flink streaming과 external engine으로 실행한다. 같은 그래프나 함수 이름이 모든 engine에서 같은 지원과 state 의미를 보장하지 않는다. External pipeline은 compute와 같은 source의 virtual-table 입력/출력을 요구한다.

## Save, deploy와 build

Save는 branch의 편집 내용을 보존하고 deploy는 output의 실행 논리를 갱신하며 build는 그 논리를 실행해 데이터를 materialize한다. Output 화면에서 단순 Build를 눌러도 마지막 deploy 뒤의 편집은 실행되지 않는다. Deploy만 하고 build를 미룰 수 있지만 Ontology output이 들어간 job group은 반드시 build한다.

Schedule은 시간, data/logic update와 조합 trigger를 쓰며 단일 dataset/dependency/downstream/두 지점 사이 범위 등을 지정한다. 같은 schedule의 이전 run이 끝나기 전 새 run은 기본적으로 시작하지 않고 overlapping은 별도 설정이다. Source sync를 한 번 만든 것은 반복 ingest schedule을 만든 것과 다르다.

## Batch의 증분 조건

Snapshot은 전체 입력으로 output을 새로 만든다. Incremental은 마지막 build 이후 APPEND 또는 기존 file을 바꾸지 않는 additive UPDATE를 읽는다. Snapshot input을 incremental로 표시해도 증분 읽기가 되지 않는다. Previous output read mode는 지원하지 않고 별도 output write mode를 사용한다.

Incremental과 snapshot join은 incremental을 left, snapshot을 right에 놓는다. Snapshot right가 갱신되어도 이미 처리한 left history를 자동 replay하지 않는다. 두 incremental join도 지원하지만 그때의 증분 semantics를 확인한다. Union 입력은 모두 같은 computation mode여야 한다. Window, aggregate와 pivot은 현재 transaction에만 적용되므로 전 이력의 누적 집계로 해석하지 않는다.

## State break와 replay

Row-level 변경과 stateful aggregate/outer caching join/heartbeat/time-bounded dedup/sort 변경은 구분한다. 이미 누적한 state에 새 규칙을 섞으면 output 의미가 달라지므로 state break는 deploy 전에 해결해야 한다. Stateful transform 수정/제거, output column 제거, output 추가, job-group 이동과 upstream replay가 replay를 요구할 수 있다. Input/output 제거는 state를 버리고 acknowledge로 진행할 수 있지만 job group 내부 제거는 replay가 필요하며 후속 stateful logic의 일관성은 별도 판단한다.

Input schema는 deploy 시 pin되므로 upstream schema 변경만으로 running pipeline이 새 schema를 읽지 않는다. Output column 추가는 replay가 필요하지 않다고 설명한다. Input 추가는 새 input을 처음부터 읽고 기존 input은 bookmark부터 이어 간다.

Streaming replay는 input 시작 또는 과거 시간부터 가능하다. 시간 선택은 그 직전 첫 transaction까지 포함할 수 있어 정확한 event-time cutoff가 아니다. Batch incremental은 전체 input replay만 지원한다. 기본 Reset Outputs on replay는 새 view로 출력을 재구성하므로 downstream도 input 시작부터 replay해야 중복과 누락을 피할 수 있다고 안내한다.

Redeploy는 저장 checkpoint/bookmark에서 이어 가고 기존 stream output을 보존한다. Replay는 state와 output view를 다시 만들며 downstream replay와 며칠의 중단을 초래할 수 있다. 원문은 한편 이전 view 접근이 가능하다면서 다른 곳에서는 모든 stream history/data가 잃어진다고 표현한다. 이를 물리적 과거 데이터 삭제와 동일하다고 단정하지 않고 current view 교체와 retention을 구분한다. Reset Outputs를 끄는 selective re-ingestion은 기존 output을 보존하는 별도 옵션이다.

Require incremental execution은 증분 불가능한 job을 fail시킨다. 최소 한 incremental input/output이 필요하고 모든 incremental output에 적용한다. 다만 명시적으로 acknowledge한 state break는 snapshot 예외가 될 수 있으므로 무조건 snapshot 금지로 해석하지 않는다. Commit empty transactions는 0-row output에서도 progress를 commit해 같은 input의 반복 처리를 막는다.

## Streaming join의 시간 경계

Stream→batch lookup은 snapshot을 cluster에 내려 index하며 같은 pipeline 안에서 right batch를 먼저 transform할 수 없다. Right는 append-only여야 하고 overwrite/delete가 있으면 empty output이 생길 수 있다고 설명한다. 새로운 append view 갱신은 최대 5분마다 이루어지고 8~10GB 이상은 성능 저하와 startup 비용을 고려한다.

Stream→stream outer caching join은 양쪽 만료가 있는 key별 cache에서 최신 값만 보존하며 도착 시 상대가 없으면 null-filled 결과를 먼저 낸다. 전체 과거 event의 relational join이 아니다. Expiry와 key 분포가 state 크기를 정하며 이미 낸 unmatched 결과가 나중에 자동 철회되는지는 이 안내만으로 보장하지 않는다.

## 출처

- [Palantir Pipeline Builder, pipeline-builder](https://www.palantir.com/docs/foundry/pipeline-builder)
- [Palantir Pipeline Builder, breaking-changes](https://www.palantir.com/docs/foundry/pipeline-builder/breaking-changes)
- [Palantir Pipeline Builder, core-concepts](https://www.palantir.com/docs/foundry/pipeline-builder/core-concepts)
- [Palantir Pipeline Builder, datasets-computation-modes-for-batch](https://www.palantir.com/docs/foundry/pipeline-builder/datasets-computation-modes-for-batch)
- [Palantir Pipeline Builder, outputs-deliver-pipeline](https://www.palantir.com/docs/foundry/pipeline-builder/outputs-deliver-pipeline)
- [Palantir Pipeline Builder, overview](https://www.palantir.com/docs/foundry/pipeline-builder/overview)
- [Palantir Pipeline Builder, schedules-create-schedule](https://www.palantir.com/docs/foundry/pipeline-builder/schedules-create-schedule)
- [Palantir Pipeline Builder, schedules-overview](https://www.palantir.com/docs/foundry/pipeline-builder/schedules-overview)
- [Palantir Pipeline Builder, schedules-scheduler-aip](https://www.palantir.com/docs/foundry/pipeline-builder/schedules-scheduler-aip)
- [Palantir Pipeline Builder, transforms-streaming-joins](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-streaming-joins)

## 관련 문서

- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Pipeline-Expressions]]
