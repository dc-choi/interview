---
tags: [palantir, foundry, pyspark, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python Spark 증분 범위와 batch 제한"]
---

# Python Spark 증분 범위와 batch 제한

증분성은 이전 input/output provenance와 새 transaction을 연결하는 계약이다. 새 input row만 읽는 것, output을 append하는 것과 모든 input을 따라잡은 것은 서로 다르다.

## Read와 write의 조합

Input added는 증분이면 새 range, snapshot 실행이면 전체 input이다. Previous는 처리한 history, current는 이번 처리 범위까지의 view다. Append-only filter는 added→default modify를 쓰고 새 view에서는 full→replace로 전환한다.

Distinct는 새 delta 내부 dedup 뒤 previous output과 비교해야 한다. 이전 output이 없을 수 있어 previous read에 schema를 제공한다. 누적 count는 delta aggregate와 previous aggregate를 합쳐 다시 group하고 output replace를 명시한다. Snapshot output도 input을 증분으로 읽어 계산 비용을 줄일 수 있다.

Schema-less CSV의 dynamic schema 예시는 모든 값을 String으로 읽고 lowercase/sanitize한 뒤 기존 output column을 null로 보완한다. 같은 이름은 같은 type이어야 하고 이전 column을 빠뜨리거나 case만 다른 새 column을 만들면 안 된다. 한 file 안의 case collision까지 이 예제가 해결하지는 않는다.

## Logic 변경과 복구

Output column 추가는 증분 flag를 자동 무효화하지 않아 과거 row에는 null로 남는다. 과거에도 새 규칙을 적용하려면 semantic version을 올려 snapshot을 유도한다. Snapshot 입력을 historical하게 쌓아 둔 pipeline은 current view만 재계산하면 과거 snapshot을 재현하지 못할 수 있다.

새 dataset branch는 보통 원 branch의 마지막 output을 previous로 이어 증분 실행할 수 있다. 이는 media set의 incremental fallback 미지원과 다르다. Branch HEAD가 이전 처리 transaction을 포함하지 않거나 그보다 앞서면 TransactionsNotInView/InconsistentBranchesOrder가 생긴다. Semantic-version snapshot은 새 일관된 view를 만드는 복구 경로이며 수동 Catalog HEAD 조작은 일반 설정과 구분한다.

Orders/Deliveries 예시는 strictly increasing ID와 max processed ID를 사용하지만 left-join으로 아직 미도착한 delivery도 output에 넣는다. 이후 낮은 ID delivery가 도착하면 max filter에서 빠질 수 있으므로 이 코드를 일반 late-data join의 완전한 해법으로 보장하지 않는다. 이는 예제 코드에서 도출한 조건부 결함이며 runtime 재현은 수행하지 않았다.

## Transaction limit

Input별 transaction_limit은 job당 읽는 transaction 수를 제한하며 row/byte 한도가 아니다. 예를 들어 previous A~C 뒤 D~J가 있고 limit3이면 added D~F/current A~F, 다음 added G~I/current A~I, 마지막 J/current A~J로 진행한다. Previous/current가 source 최신 HEAD 전체를 뜻하지 않을 수 있다.

같은 예제라도 semantic-version 변경 등으로 output을 snapshot 처리하면 previous가 빈 상태에서 A~C부터 다시 읽는다. Limit3으로 A~J를 따라잡는 순서는 A~C, D~F, G~I, J의 네 job이다. 기존 A~C 처리를 이어가는 세 job과 구분한다. (2026-10-18 [공식 snapshot 범위 GIF](https://www.palantir.com/docs/resources/foundry/transforms-python-spark/batching-snapshot.gif)의 표본 프레임과 본문 대조)

조건은 incremental v2_semantics=True, Python transforms≥3.25.0, Spark(non-lightweight), transactional input, current view의 시작 SNAPSHOT을 제외하고 APPEND만 있는 input이다. DELETE/UPDATE가 하나라도 있으면 InvalidTransactionTypeForBatchInputResolution으로 fail한다. Snapshot input에는 limit을 쓰지 않는다. V2 semantics를 켜면 다음 한 번 snapshot이 생긴다.

성공 build도 아직 stale할 수 있으므로 successful build 후 re-trigger를 켜 catch-up한다. Force build와 동시 설정하면 stale 여부와 무관한 반복이 생겨 허용하지 않는다. 신규 transaction이 계속 오면 반복 build도 계속될 수 있다. Spark report의 current-view range/processed-batch/previous-end/last-read를 구분해 지연과 진행을 확인한다.

## 출처

- [Palantir Python Spark, incremental-examples](https://www.palantir.com/docs/foundry/transforms-python-spark/incremental-examples)
- [Palantir Python Spark, incremental-transaction-limits](https://www.palantir.com/docs/foundry/transforms-python-spark/incremental-transaction-limits)

## 관련 문서

- [[Palantir-Code-Transforms]]
- [[Palantir-Pipeline-Execution-and-Replay]]
