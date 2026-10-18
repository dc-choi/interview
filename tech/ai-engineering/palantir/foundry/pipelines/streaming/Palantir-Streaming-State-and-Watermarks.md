---
tags: [palantir, streaming, flink, watermark]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry streaming state와 watermark"]
---

# Streaming state와 watermark

Stateful transform은 이전 row에서 저장한 정보를 다음 row의 처리에 쓴다. Aggregate, join cache, sort와 source offset 복구가 예다. Pipeline Builder stateful transform은 partition key별로 독립 상태를 관리하며 key를 요구한다.

## Exactly-once와 replay의 경계를 구분한다

기본 exactly-once 모드는 row에 따른 상태 변경을 key 순서에 맞춰 한 번 적용하도록 한다. 실패/restart 후 aggregation과 중간 sort 복구를 가능하게 하지만 모든 외부 side effect의 전역 exactly-once까지 뜻하지 않는다.

Time-based transform은 upstream의 Assign Timestamps And Watermarks를 요구한다. Row의 event time과 operator가 판단하는 현재 event-time 경계인 watermark를 구분한다. Processing-time 기반 동작은 재현성이 크게 달라질 수 있어 해당 경로에서 미지원/비권장이다.

단일 input operator의 watermark는 parallel instance별 최대 event time 중 최소를 따른다. 여러 input operator는 input watermark의 최소를 따른다. Replay에서 key의 병렬 배치와 input 상대 속도가 달라지면 output이 유사하되 미세하게 다를 수 있다. Exactly-once를 replay 결과의 byte 단위 동일성으로 확대하지 않는다.

## Idle partition은 상태 만료까지 멈출 수 있다

Record가 오지 않는 instance가 watermark를 내지 않으면 전체 watermark가 정체된다. Cache expiry가 진행하지 않고 window가 닫히지 않아 output이 안 나오거나 state가 커질 수 있다.

Stream idleness timeout을 설정하면 일정 processing time 동안 record가 없는 instance를 watermark 계산에서 제외한다. 너무 짧으면 느린 정상 instance까지 idle로 보고 앞선 partition이 watermark를 올려 late record를 더 버릴 수 있다. Lag, key 분포, 지연 도착과 상태 크기를 함께 측정해 설정한다.

## Window의 종료와 output trigger는 다르다

| Window | 같은 key에서의 범위 |
|---|---|
| Tumbling event time | 고정 길이의 겹치지 않는 시간 구간 |
| Count | 최근 n개 row |
| Session | Event time의 공백이 session gap을 넘지 않는 row 집합 |

시간 window는 watermark가 end를 지나면 닫힌다. Allowed lateness가 있으면 end+lateness까지 상태를 보존하며, 그 이후 row는 닫힌 window에 추가되지 않고 버려진다. Lateness 허용은 무제한 역보정이 아니다.

After watermark trigger는 end 전후 별도 trigger를 조합할 수 있다. Count trigger는 key별 n의 배수에서 output하고, Window close trigger는 상태 삭제와 함께 window당 한 번만 output한다. 중간 output과 최종 결과를 downstream이 구별해야 한다.

Cache expiry는 일반적으로 key의 마지막 event time+expiry와 watermark를 비교한다. 최대 state를 제한할 수 있도록 필요한 만큼만 cache/count를 잡는다. Parallelism을 늘리면 처리와 checkpoint read/write capacity를 높일 수 있지만 unbounded key space나 stalled watermark의 설계 오류를 해결하지 않는다. Stateful logic 변경은 기존 상태 type/의미와의 호환성을 검토한 뒤 배포한다.

## 출처

- [Palantir, Streaming stateful transformations](https://www.palantir.com/docs/foundry/building-pipelines/streaming-stateful-transforms)
- [Palantir, Streaming pipelines](https://www.palantir.com/docs/foundry/building-pipelines/streaming-overview)

## 관련 문서

- [[Palantir-Streaming-Keys-and-CDC|Key와 current view]]
- [[Palantir-Streaming-Latency-and-Compute|Streaming 운영 비용]]
