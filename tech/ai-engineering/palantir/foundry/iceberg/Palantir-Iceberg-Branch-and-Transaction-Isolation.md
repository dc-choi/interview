---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Foundry build의 branch와 multi-table transaction 격리

Foundry build는 Iceberg read/write를 job transaction으로 묶어 all-or-nothing commit,repeatable reads,read-your-writes와 input multi-table snapshot isolation을 제공한다. 실패한 중간write는 외부reader/후속job에 보이지 않는다. 이 보장은 externalclient의 개별commit이나 외부API부작용까지 확대하지 않는다.

## 동시성

같은output을 쓰는 일반job은 queue에서 순차실행한다. maintenance/compaction은 병행해 conflict가 생길 수 있고 commit실패시 build가 job을 재시도한다. 따라서 source의 correctness보장을 임의 external side effect의 exactly-once보장으로 해석하지 않는다.

## Branch별 metadata

transforms-tables0.1211.0이상에서 buildbranch의 current schema/default partition spec/default sort order와 current snapshot을 격리한다. schema history와 tableproperties는 table공유다. branch에서 최초table을 만들면 main에 resource는 존재하지만 empty schema/no data일 수 있다.

한job의 모든table은 같은branchcontext를 쓰며 입력마다 다른branch지정은 지원하지 않아 검증실패한다. branch가 쓰는 schema/spec는 main에서도 삭제하지 못하고 branch삭제뒤에 보호가 풀린다.

## 외부client의 차이

X-PLTR-Branch가 없으면 표준Iceberg동작이다. branchread는 main의 table-scoped schema,write도 main schema로 검증하고 schema변경은 main에 영향을 준다. snapshotread는 해당snapshot schema를 사용한다.

header가 있으면 branch에 read/write를 scope한다. unqualified/main참조는 headerbranch로 mapping하고 명시non-main branch는 header보다 우선한다. PyIceberg header.X-PLTR-Branch,Spark catalog header설정을 사용한다.

native cherry-pick/fast-forward는 snapshotref만 옮겨 branch schema를 main으로 가져오지 않는다. schema변경은 code를 merge하고 main에서 rebuild한다. branch에서는 drop/update namespace,drop/rename table,commitTransaction,create/drop/rename view같은 일부privilegedendpoint를 호출하지 못한다.

## 출처

- [Palantir, transactions](https://www.palantir.com/docs/foundry/iceberg/transactions)
- [Palantir, branching](https://www.palantir.com/docs/foundry/iceberg/branching)

## 관련 문서

- [[Palantir-Iceberg-Resource-Contracts]]
- [[Palantir-Iceberg-Transforms-and-Properties]]
