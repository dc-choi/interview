---
tags: [palantir, foundry, pipeline-builder, streaming, watermark, cdc]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 스트리밍 시간과 상태 계약"]
---

# Pipeline Builder 스트리밍 시간과 상태 계약

스트리밍 상태는 key, event time과 watermark에 따라 유지되거나 만료된다. 설정한 초 단위를 wall clock상의 정확한 처리 시각으로 해석하면 늦은 데이터, heartbeat와 중복 제거의 결과를 잘못 이해하게 된다. 아래는 2026-10-16 공식 transform 계약이며 replay나 상태 복구를 실행하지 않았다.

## Timestamp와 watermark

Assign timestamps and watermarks는 expression의 Timestamp를 event time으로 지정하며 null timestamp 행은 제거한다. 원본에 timestamp 열이 있다는 것과 연산자가 event time을 부여받았다는 것은 다르다.

매 레코드 watermark emission은 replay의 결정적 동작을 제공하는 대신 비효율과 overhead가 있어 대부분 false를 권장한다. 이 설명을 전체 pipeline의 모든 비결정성이 사라진다는 보장으로 확대하지 않는다.

Idleness timeout 뒤 입력이 없는 subtask를 idle로 간주하면 global watermark가 진행할 수 있다. 상태 증가와 닫히지 않는 window를 줄일 수 있지만 느린 subtask가 나중에 보내는 데이터가 downstream에서 late로 제거될 수 있다.

## Key by와 CDC의 이력 의미

Key by는 같은 key로 묶은 뒤부터 per-key 수신 순서를 유지하며 기존 데이터를 다시 정렬하지 않는다. 다른 key로 바꾸면 이전 keying이 보존하지 않았던 순서를 새롭게 보장할 수 없다.

CDC mode를 켜면 partition key뿐 아니라 current view의 primary key도 설정한다. 같은 key는 update 후보, deleted Boolean이 true이고 key가 같으면 delete 후보가 된다. Archive/batch 순서에는 ordering columns를 쓸 수 있고, streaming에서 비워 두면 가장 최근 수신 행이 이긴다고 설명한다.

이것은 가장 큰 업무 timestamp가 자동으로 이긴다는 규칙이 아니다. Event time, 수신 순서와 ordering column의 의미를 구분해 현재 상태와 이력 해석을 정한다.

## 중복 제거의 만료는 근사 경계다

Time bounded drop duplicates는 선택한 column subset으로 중복을 판단하고, 생략하면 stream의 key subset을 쓴다. Key별 상태는 event time으로 만료되며 지나치게 늦은 행은 처음 보는 key라도 제거될 수 있다.

Eviction window slide는 stale state를 실제로 제거하는 cadence다. 예시의 기본 slide는 1분이며 timeout이 10초여도 9초, 18초와 28초 행이 모두 중복으로 제거된다. 설정 timeout만 지나면 바로 같은 key가 재허용된다고 가정하지 않는다.

문서는 마지막 중복 뒤 key expiry부터 expiry+slide 구간까지 중복 제거가 이어질 수 있다고 설명한다. Slide 변경은 state break여서 replay가 필요하다. 단순 성능 튜닝으로만 취급하지 않는다.

## 순서 위반 제거와 지연 정렬

Time bounded drop out of order는 key별 기존 최대 우선순위보다 앞서는 행을 제거한다. 비교는 첫 정렬 열부터 시작하고 동점일 때만 다음 열로 넘어간다. 모든 열이 같으면 동등한 행이며 dedup 기능과 같지 않다.

새 행은 최대 우선순위를 갱신하는지와 관계없이 key의 expiry를 연장한다. 상태가 만료된 뒤 도착한 행은 과거 최대값보다 작아도 새 기준이 될 수 있다. 무기한 단조 증가 검증으로 쓰지 않는다.

Time bounded event time sort는 key별 event time 오름차순으로 내보내며 allowed lateness 이상을 기다린다. Allowed lateness와 작은 buffer interval 뒤의 행은 제거한다. 지연 허용값을 무손실 수집 보장이나 정확한 출력 지연 상한으로 취급하지 않는다.

## Heartbeat와 window 출력

Heartbeat는 key별로 독립 상태와 timer를 유지하지만 global watermark를 공유한다. 첫 관측에 alive를 내보내고 후속 관측은 timeout을 연장할 수 있다. 다른 key의 나중 event가 watermark를 진행시켜 앞선 key의 missed timer를 실행하는 예시가 있다.

입력이 멈춘 동안 wall clock만으로 정해진 시각에 missed가 발생한다고 보장하지 않는다. Timestamp 부여와 watermark 진행 조건까지 함께 봐야 한다.

Aggregate over window는 trigger가 언제 결과를 낼지 결정하고 accumulating/discarding이 pane 유지 여부를 정한다. Apply over window는 window로 모은 행 묶음을 Lambda에 전달한다. Project over window는 새 행마다 한 행을 emission한다고 설명한다. 같은 Window 입력이라도 출력 cadence와 행 수가 같지 않다.

## Build 간 계산 cache

Compute if expression absent는 key별 결과를 store에 남겨 build를 넘어 재사용한다. Store ID를 바꾸면 전체 결과를 무효화하고 같은 pipeline에서 ID를 중복 사용할 수 없다. Key에 포함하지 않은 입력이 바뀌어도 결과가 갱신된다는 보장은 없다.

기본적으로 null은 저장하지 않으며 `Do not store results when`으로 저장하지 않을 결과를 정한다. Always recompute null results는 일반 값과 `ok/error` 구조체에 모두 적용되고 옵션 변경 시 store reset이 필요하다. Disable store를 켜면 일반 apply expression처럼 동작한다.

따라서 key마다 한 번이라는 설명은 저장 제외, null 정책, 무효화와 store disable 조건 안에서 읽는다. 이 기능을 외부 부수 효과의 exactly-once 실행 보장으로 해석하지 않는다.

New operator chain과 slot sharing group은 Flink 실행 배치 설정이다. 업무 key나 데이터 품질 규칙을 바꾸는 기능은 아니며 인과관계나 처리 순서를 자동 복원한다고 추정하지 않는다.

시간/key/window 연산과 operator chain은 공개 표에서 Streaming 전용이다. Compute if expression absent는 Batch/Faster, Project over window는 Batch/Faster/Streaming이다. 실제 환경의 상태 호환성과 replay는 별도로 검증해야 한다.

## 이전 V2 dedup 계약

영어 V2 경로 대신 확보한 공식 중국어 AIP 미검증 번역은 Streaming 전용이며 column subset, key-by와 event-time expiry를 설명한다. 10초 예시에서 0초는 출력, 9초/18초는 제거되지만 상태의 기준을 갱신하고, 28초는 출력한다. 늦게 도착한 더 이른 timestamp는 제거되며 기준을 전진시키지 않는 예시다.

V2 parameter 목록에는 V3의 eviction window slide가 없다. 이 예시를 V3의 기본 1분 slide 동작과 합쳐 설명하지 않는다. 정확히 10초 경계의 예시가 포함되지만 모든 clock/watermark 구현의 일반 경계 규칙으로 확대하지 않는다.

## 출처

- [Palantir, Assign timestamps and watermarks](https://www.palantir.com/docs/foundry/pb-functions-transform/assignTimestampsAndWatermarksV1)
- [Palantir, Key by](https://www.palantir.com/docs/foundry/pb-functions-transform/keyByV3)
- [Palantir, Time bounded drop duplicates](https://www.palantir.com/docs/foundry/pb-functions-transform/timeBoundedDropDuplicatesV3)
- [Palantir, Time bounded drop out of order](https://www.palantir.com/docs/foundry/pb-functions-transform/timeBoundedDropOutOfOrderTransformV1)
- [Palantir, Time bounded event time sort](https://www.palantir.com/docs/foundry/pb-functions-transform/timeBoundedEventTimeSortV1)
- [Palantir, Heartbeat detection](https://www.palantir.com/docs/foundry/pb-functions-transform/heartbeatDetectionV2)
- [Palantir, Aggregate over window](https://www.palantir.com/docs/foundry/pb-functions-transform/aggregateOverWindowV2)
- [Palantir, Apply over window](https://www.palantir.com/docs/foundry/pb-functions-transform/applyOverWindowV1)
- [Palantir, Project over window](https://www.palantir.com/docs/foundry/pb-functions-transform/windowedProjectV1)
- [Palantir, Compute if expression absent](https://www.palantir.com/docs/foundry/pb-functions-transform/computeExpressionIfAbsentV1)
- [Palantir, New operator chain](https://www.palantir.com/docs/foundry/pb-functions-transform/newOperatorChainV1)

- [Palantir, timeBoundedDropDuplicatesV2 (중국어 AIP 미검증 번역)](https://palantir.com/docs/zh/foundry/pb-functions-transform/timeBoundedDropDuplicatesV2/)

## 관련 문서

- [[Palantir-Pipeline-Join-Contracts|Cache join과 lookup]]
- [[Palantir-Pipeline-Aggregation-and-Pattern-Transforms|집계의 출력 단위]]
- [[Palantir-Pipeline-Row-and-Schema-Transforms|정렬과 일반 중복 제거]]
- [[Palantir-Pipeline-Transforms|변환 지도]]
