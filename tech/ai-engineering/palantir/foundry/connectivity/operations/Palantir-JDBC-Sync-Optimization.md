---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# JDBC cursor와 병렬 query의 정확성

안정적으로 빠르게 작동하는 sync를 이유 없이 조정하지 않는다. 느리거나 불안정하면 먼저 incremental, 필요할 때 query parallelism을 검토한다. 성능 변경도 원본 row 누락/중복과 snapshot consistency에 영향을 준다.

## incremental state

preview가 성공한 상태에서 APPEND와 incremental column/initial value를 구성한다. 신규/복제 incremental sync의 최초 preview에는 `?` 없는 query를 먼저 실행해야 state UI가 열린다.

immutable row면 증가 ID/insert time을, mutable row면 매 갱신 증가하는 update time을 검토한다. APPEND는 이전 버전도 남기므로 최신 row만 필요하면 downstream key별 정리가 필요하다.

query에는 `?` 하나만 두고 최초 initial value, 이후 직전 sync의 column max로 치환한다. 실제 SQL은 `_data-ingestion.log`, 실제 state는 dataset History → Build → Transaction → Custom Metadata의 incrementalMetadata로 확인한다.

원문은 snapshot에서 전환할 때 initial을 기존 max보다 크게 두는 예시와 `column > ?`를 함께 안내한다. 엄격한 `>`에서 initial과 같은 새 값은 제외될 수 있으므로 그대로 복사하지 않고 기존 max, 최소 새 값과 비교 연산자의 경계를 함께 시험한다. 신규 전체 적재와 snapshot→append 전환의 시작점을 혼동하지 않는다.

## 누락, 중복과 null

cursor보다 작은 값으로 늦게 추가된 row는 일반 incremental로 다시 읽지 않는다. snapshot 또는 누락 row 대상 one-off를 검토한다. update-time이 증가하면 같은 업무 row의 새 버전이 다시 append되는 것이 정상이다.

sub-millisecond timestamp는 cursor가 millisecond로 내림 직렬화돼 micro/nanosecond row가 다시 포함될 수 있다. 문서는 LONG 또는 ISO8601 STRING cast를 제시한다. cast 후의 비교/정렬과 실제 정밀도 보존을 확인한다.

OR 조건 때문에 incremental column이 null인 row가 나오면 state max 비교에서 NullPointerException이 발생할 수 있다. 전체 조건을 괄호로 감싸고 `column IS NOT NULL`을 보장하거나 다른 column을 선택한다. incremental column 변경은 새 sync가 권장된다.

## 강제 병렬화

`FORCED_PARALLELISM_COLUMN`은 균등한 numeric column/expression을 선택한다. `FORCED_PARALLELISM_SIZE(4)`는 modulo 4개와 null query 하나를 합쳐 5개다. 이미 WHERE가 있으면 ALREADY_HAS_WHERE_CLAUSE(TRUE)로 AND를 붙이고 없으면 FALSE로 WHERE를 만든다.

OR가 있으면 `(condition1 OR condition2) AND partition-condition`이 되도록 괄호를 둔다. 그렇지 않으면 AND 우선순위 때문에 일부 query가 같은 row를 반복할 수 있다.

각 query는 별도 시점에 실행되므로 live-update table을 일관된 단일 snapshot으로 읽는 보장이 아니다. 병렬화 폭을 늘리기 전에 원본 부하와 누락/중복을 검증한다.

## fetch와 upload

fetch size는 rows/round-trip과 heap의 교환이다. 기본 시작 권장 500에서 원본 응답과 메모리를 보며 조정한다. 큰 값은 왕복을 줄이고 heap을 더 사용한다. upload 병목이면 파일 수/크기와 network를 함께 본다.

진단 문서의 max file 120MB 권장과 custom JDBC의 Parquet buffer 기본128MB/최소 두 배 조건은 설정 맥락이 다르다. 120MB를 모든 source의 maxBytesPerFile에 그대로 적용하지 않는다. 실제 source 옵션의 단위와 최소값을 확인한다.

## 출처

- [Palantir, optimize-jdbc-syncs](https://www.palantir.com/docs/foundry/data-connection/optimize-jdbc-syncs)
- [Palantir, syncs-troubleshooting](https://www.palantir.com/docs/foundry/data-connection/syncs-troubleshooting)

## 관련 문서

- [[Palantir-Connection-Operations]]
- [[Palantir-JDBC-Connector]]
- [[Palantir-Sync-Failure-Diagnosis]]
