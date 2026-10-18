---
tags: [palantir, views, deduplication, schema]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Union View와 read-time resolution"]
---

# Union View와 read-time resolution

Foundry View는 자체 data file을 보유하지 않고 backing dataset의 union을 읽는다. Dataset의 특정 transaction까지 접은 dataset view와 별도 resource 개념이다. Tabular schema가 필요하고 transform input은 될 수 있지만 output은 될 수 없다.

Backing update에 자동 build schedule이 반응하며 View build 자체는 data를 읽고 쓰지 않아 빠르게 끝난다. 생성/설정 직후 바로 읽으려면 수동 build가 필요할 수 있다. 같은 column name/type을 요구하지만 order는 달라도 되고, backing column 추가/삭제로 mismatch가 생기면 Schema evolution 설정을 검토한다.

## PK와 ordering은 읽을 결과를 정한다

선택적 PK는 하나 이상의 non-null column으로 구성한다. PK를 정한 뒤 변경하려면 새 View가 필요하다. Key별 resolution column의 가장 큰 값을 순서대로 비교해 남길 row를 정하고 마지막 row의 Boolean deletion=true면 제거한다. Delete row를 먼저 버리고 이전 row를 되살리는 동작이 아니다.

이 resolution은 모든 backing dataset에 걸쳐 적용된다. 하지만 View를 downstream incremental input으로 읽으면 읽은 transaction range 안에서만 dedup하므로 전체 current View의 PK uniqueness를 보장하는 방식으로 사용하지 않는다. Incremental backing View를 incremental input으로 쓰지 말라는 제약을 확인한다.

## 빠른 build와 공짜 query는 다르다

PK dedup은 자동 projection과 매 read의 window filtering으로 구현한다. Projection이 최신이고 backing이 APPEND/strictly additive UPDATE로 갱신되면 read 부담이 작다. Frequent SNAPSHOT 또는 projection full rebuild가 필요하면 완료 전 reader가 projection 없이 filtering하며 compute가 커질 수 있다.

단순 union 위치 재구성과 storage 절감, additive changelog resolution에 적합하지만 frequent full replace에는 materialized transform과 비용을 비교한다. View build가 거의 즉시 끝나는 것을 복잡한 read가 계산을 하지 않는다는 뜻으로 보지 않는다.

## Marking propagation 변경

지원 enrollment에서는 Remove Marking 권한으로 backing의 mandatory Marking propagation을 중단할 수 있다. Organization 제거는 지원하지 않는다. 변경은 backing update 때 반영하며 즉시 current data가 재분류된 것으로 보고하지 않는다. PK/dedup 설정이 보안상 최소화의 적합성을 자동 증명하지 않는다.

## 출처

- [Palantir, Views](https://www.palantir.com/docs/foundry/data-integration/views)

## 관련 문서

- [[Palantir-Dataset-Transactions-and-Build-Branches|Dataset view와 transaction]]
- [[Palantir-CDC-Ordering-and-Stream-Recovery|Changelog resolution]]
- [[Palantir-Pipeline-Markings-and-Declassification|Marking 제거]]
