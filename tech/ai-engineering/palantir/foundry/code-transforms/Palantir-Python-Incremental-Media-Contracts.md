---
tags: [palantir, foundry, pyspark, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python 증분 media set의 이력 계약"]
---

# Python 증분 media set의 이력 계약

Input과 output media set을 함께 증분 처리하려면 @incremental(v2_semantics=True)를 사용한다. Dataset/virtual table과 혼합할 수 있지만 각 resource가 증분 가능성에 기여하며 dataset과 같은 deletion 규칙을 가정하지 않는다.

## 증분성을 깨는 변경

Transactional media output이 이전 build 뒤 user upload/delete로 바뀌거나 multi-output의 마지막 build가 서로 다른 transform이면 증분을 막을 수 있다. Input 전체 replace도 snapshot이 필요하다. Snapshot-input으로 지정하면 input replace가 증분성을 막지 않지만 과거 결과를 새 source로 자동 갱신한다는 뜻은 아니다.

Input path overwrite와 media-item deletion은 dataset과 달리 증분을 막지 않는다. Added만 fast-copy하는 예시는 삭제를 downstream에도 자동 반영하는 계약이 아니다. 실제 결과가 current source를 반영해야 하는지 별도로 설계한다.

## Listing과 path dedup

Read mode는 added/previous/current이며 source는 added∪previous=current를 명시한다. Snapshot 실행의 previous는 empty이고 예전 build 당시 media snapshot을 반환하지 않는다. 기본은 증분 added, 그 외 current다.

Path dedup을 하면 같은 path의 최신 item만 보인다. 모든 item history를 처리하려면 deduplicate_by_path=False를 명시한다. Previous와 added path를 비교해 overwrite를 찾으면 current read+replace output으로 전환하는 예시가 있지만 code의 join mode 인자와 실제 Spark API 호환성은 별도 검증해야 한다.

Media set은 incremental fallback branch를 지원하지 않아 새 branch의 empty output은 snapshot을 권할 수 있다. 같은 코드의 main build도 항상 snapshot이라는 뜻은 아니다. Transactionless output은 modify만 가능하며 snapshot이 필요해지면 실패한다.

## 제한과 abort

Spark의 media batch_limit은 job당 item 상한이고 path dedup 전에 적용한다. Limit100에서 같은 path가 여럿이면 보이는 item은100보다 적을 수 있다. Catch-up schedule과 결과의 stale 여부를 따로 확인한다.

개별 media output을 abort할 수 없으므로 전체 job의 ctx.abort_job을 권한다. 일부 output만 abort하는 것과 전체 job 진행을 보존하는 것은 다르다. Fast-copy, replace와 deletion/retry의 실제 runtime은 실행하지 않았다.

## 출처

- [Palantir Python Spark, incremental-media-sets](https://www.palantir.com/docs/foundry/transforms-python-spark/incremental-media-sets)

## 관련 문서

- [[Palantir-Code-Transforms]]
- [[Palantir-Pipeline-Execution-and-Replay]]
