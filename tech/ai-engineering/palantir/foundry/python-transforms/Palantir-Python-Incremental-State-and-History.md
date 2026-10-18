---
tags: [palantir, foundry, python, transforms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Python 증분 상태, 삭제와 역사 보존"]
---

# Python 증분 상태, 삭제와 역사 보존

@incremental은 이전 provenance와 input 변경을 검사해 실제 실행 mode를 정한다. Decorator가 있어도 매번 증분이라는 뜻은 아니며 함수는 snapshot과 incremental 양쪽에서 올바르게 동작해야 한다. Input과 output에 같은 dataset을 두면 cycle이다.

## Read/write mode

| Mode | Incremental | Snapshot 실행 |
| --- | --- | --- |
| input added(기본) | 이전 실행 뒤 새 rows/files | 전체 input |
| input previous | 이전 실행이 본 view | empty |
| input current | 이번 실행 view | 전체 input |
| output write 기본 | modify(append) | replace |

Previous output은 마지막 build까지 누적된 output이지 마지막 invocation이 쓴 delta만을 뜻하지 않는다. 그 delta가 필요하면 별도 auxiliary replace output에 저장한다. Output previous는 write mode와 무관하게 build 시작 때의 상태이며 snapshot 실행에서는 empty다. Current/added output read는 write 후 검증 등에 사용하고 이전 결과 조회는 previous로 의도를 명시한다.

새 거래만 출력하는 증분 처리도 특징 계산에 전체 거래 이력을 사용할 수 있다. 공식 Lightweight 전환 시연의 코드는 같은 input을 기본 added와 `mode="current"`로 각각 lazy read해 새 거래와 전체 이력을 함께 넘긴다. 엔진을 바꿀 때는 delta/history의 읽기 의미를 보존하고 최초 snapshot과 후속 증분 결과를 각각 비교한다. (2026-10-18 [시연 코드 12분 30초](https://www.youtube.com/watch?v=MITSJDI08R4&t=750s) 확인)

Spark previous read의 supplied schema는 없을 때 empty를 만드는 데 쓰이며 증분 때 type/nullability/order와 비교한다. 저장 column은 모두 nullable이므로 non-nullable field를 넣으면 mismatch다. Single-node의 previous schema enforcement는 comparison표에서 미지원이라고 하므로 Spark 예제를 일반화하지 않는다.

## 증분 자격과 과거 결과

Append-only는 transaction 이름보다 file 변화가 중요하다. UPDATE라도 file 추가만이면 허용될 수 있고 overwrite/전체 SNAPSHOT은 보통 snapshot을 유발한다. snapshot_inputs는 해당 input 전체를 매번 읽고 이전 row를 다시 계산하지 않는다. 참조표가 바뀌어도 과거 enrichment를 보존하는 것이 의도인지 판단해야 한다. Cipher encrypter/decrypter/hasher도 snapshot input 선언이 필요하다고 안내한다.

require_incremental=True도 첫 output build와 semantic_version 변경에는 snapshot을 허용한다. Semantic version은 달라지면 다음 실행을 snapshot으로 만들며 단순 code 변경이나 output column 추가가 과거 row를 자동 보강하지 않는다. 새 input 추가/제거 자체는 증분성을 유지할 수 있어 semantics가 바뀌면 명시적으로 version을 바꾼다. 최소 한 input이 필요하다.

Multi-output의 기존 output 마지막 transaction은 같은 transform에서 생성되어야 한다. 새 output의 미구축 history는 이 검사에서 제외한다. Dataset 새 branch는 원 branch previous를 이어갈 수 있지만 media set fallback 조건은 다르다. HEAD가 이전 처리 range를 벗어나거나 뒤로 이동하면 Catalog transaction consistency error가 생기며 새 snapshot으로 provenance를 재정렬할 수 있다.

## 삭제 허용은 삭제 전파가 아니다

allow_retention은 retention-origin removed files만 증분 검사에서 무시한다. allow_user_deletes는 그 외 user delete를 무시하고 v2_semantics=True가 필요하며 lightweight에는 미지원이다. 양쪽 삭제를 허용하려면 둘 다 켠다. 어느 옵션도 과거 output 삭제나 invalidated aggregate의 자동 복구를 보장하지 않는다.

strict_append는 실제 증분 때 APPEND transaction으로 기존 file overwrite를 fail시킨다. Parquet metadata/SUCCESS 같은 보조 file도 충돌하면 안 된다. Snapshot fallback에서는 overwrite가 가능하므로 require_incremental 예외까지 고려한다. V2는 non-Catalog resource 증분에 필요하며 이전/신규 semantics 전환의 snapshot 여부를 별도 점검한다.

## Abort와 replay

ctx.abort_job은 전체 job을 성공적으로 종료하면서 output commit을 막는다. 다음 증분 build에서 미처리 input을 다시 본다. 개별 Spark output만 abort하면 output provenance가 달라져 다음 실행이 snapshot이 되거나 require_incremental로 fail할 수 있다. V2에서 전체 job abort와 부분 output abort를 같게 취급하지 않는다.

## History를 쌓을 때

가능하면 ingest 단계의 APPEND와 ingestion date로 history를 보존한다. snapshot_inputs를 full로 읽고 append하는 pattern은 build가 관찰한 snapshot만 쌓는다. 사이에 지나간 모든 source snapshot, deletion, schema/identity 변경을 자동 복구하는 이력 저장소가 아니다. Semantic-version snapshot이 기존 history를 지울 수도 있고 작은 file 누적으로 후속 비용이 커진다.

Distinct는 delta 내부 dedup+previous 비교, 누적 aggregate는 previous+delta 재집계와 replace가 필요하다. 두 incremental input의 join은 한쪽 delta가 비어도 새 match를 놓칠 수 있다. 원문 Orders/Deliveries max-ID left-join 예시는 미도착 delivery를 먼저 output에 넣어 낮은 ID의 뒤늦은 delivery를 놓칠 조건부 결함이 있다. 전용 batch-limit과 media 계약은 연결 문서를 따른다.

Code Repositories preview는 require_incremental=True도 snapshot으로 실행한다. VS Code preview는 증분 semantics를 존중하므로 history 확인에 더 맞다. 본 문서는 원문 계약과 예제 분석이며 runtime 검증은 수행하지 않았다.

## 출처

- [Palantir Python transforms, abort-transactions](https://www.palantir.com/docs/foundry/transforms-python/abort-transactions)
- [Palantir Python transforms, create-historical-dataset](https://www.palantir.com/docs/foundry/transforms-python/create-historical-dataset)
- [Palantir Python transforms, incremental-examples](https://www.palantir.com/docs/foundry/transforms-python/incremental-examples)
- [Palantir Python transforms, incremental-overview](https://www.palantir.com/docs/foundry/transforms-python/incremental-overview)
- [Palantir Python transforms, incremental-reference](https://www.palantir.com/docs/foundry/transforms-python/incremental-reference)
- [Palantir Python transforms, incremental-usage](https://www.palantir.com/docs/foundry/transforms-python/incremental-usage)

## 관련 문서

- [[Palantir-Python-Transforms]]
- [[Palantir-Code-Transforms]]
- [[Palantir-Python-Spark-Incremental-Batches]]
- [[Palantir-Python-Incremental-Media-Contracts]]
