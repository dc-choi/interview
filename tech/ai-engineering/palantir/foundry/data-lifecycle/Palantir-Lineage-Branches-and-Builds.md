---
tags: [palantir, data-lineage, branching, builds]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Lineage branch와 build 범위"]
---

# Lineage branch와 build 범위

Data Lineage는 branch-aware지만 graph 자체가 global branch에서 수정/merge되는 resource는 아니다. Graph configuration을 바꾼 뒤 Main으로 merge하는 의미로 취급하지 않는다. Saved graph는 선택 global branch context를 함께 보존한다.

## Dataset branch와 global branch의 차이

Dataset Branches 모드는 없는 branch에 configured fallback을 순서대로 사용할 수 있다. Global branch는 대응 dataset branch만 표시하며 dataset fallback을 비활성화한다. 모든 global branch는 dataset branch를 갖지만 모든 dataset branch가 global branch에 속하지는 않는다.

Global branch는 Ontology 하나에 연결된다. 여러 Ontology resource가 있는 graph에서는 해당 Ontology만 branch-specific metadata를 보여주고 다른 Ontology는 Main을 보여준다. 한 화면의 모든 entity가 동일 branch snapshot이라는 전제를 두지 않는다.

Branch-aware search는 branch에만 만든 entity도 찾고 modified entities를 graph에 한 번에 추가할 수 있다. Dataset preview/build status/staleness, Ontology name/property와 resource link도 branch에 맞춰 표시한다. Dataset-to-Ontology link는 Main과 2026년 5월 이후 생성한 branch에서 자동 index하지만 더 오래된 branch는 backfill되지 않았다. 오래된 branch의 연결이 안 보이면 부재로 확정하지 않고 object/link type의 branch provenance reindex 조건을 확인한다.

## Graph에서 시작하는 build도 선택 scope를 따른다

All ancestors는 선택 dataset과 필요한 stale ancestor, Between selected는 선택한 구간, Selected only는 선택 dataset의 계산을 요청한다. Fresh output을 다시 계산하려면 force 옵션을 명시하고 비용을 확인한다. Build preview의 Next는 실행이 아니며 selection을 바꾸려면 cancel 후 node selection을 수정하고 다시 preview한다.

실제 Run은 graph의 branch/fallback configuration을 따른다. 선택되지 않은 원본 input을 임의로 최신화한다고 가정하지 않는다. Selected output 사이 dependency가 있으면 순서에 맞춰 실행하지만 graph 화면 전체가 하나의 atomic transaction이 되는 것은 아니다.

## Timeline, schedule과 staleness 조사

Build timeline은 1시간~10일 범위의 Gantt chart로 job의 status/start/end/duration과 build/schedule로 연결한다. 보이는 timeline 범위를 전체 운영 이력으로 취급하지 않는다. Running status는 open transaction의 단서이지만 외부 API로 열린 모든 transaction을 전수 증명하는 방법은 아니다.

Manage schedules는 선택 resource에 관련된 target/trigger/latest run/last update/build scope를 보여준다. Schedule success와 그 build success를 구분하고 Project/user permission scope를 확인한다. Stale dataset은 target build 실패, upstream 미build와 source의 새 data 부재를 각각 조사한다. 색을 새로 바꾸거나 graph를 저장하는 작업은 stale data를 갱신하지 않는다.

## 출처

- [Palantir, Branching data lineage](https://www.palantir.com/docs/foundry/data-lineage/branching-data-lineage)
- [Palantir, Build datasets](https://www.palantir.com/docs/foundry/data-lineage/build-datasets)
- [Palantir, Build timeline](https://www.palantir.com/docs/foundry/data-lineage/build-timeline)
- [Palantir, Manage schedules](https://www.palantir.com/docs/foundry/data-lineage/manage-schedules)
- [Palantir, Understand out-of-date datasets](https://www.palantir.com/docs/foundry/data-lineage/stale-datasets)
- [Palantir, Navigation](https://www.palantir.com/docs/foundry/data-lineage/navigation)
- [Palantir, Data Lineage questions](https://www.palantir.com/docs/foundry/data-lineage/faq)

## 관련 문서

- [[Palantir-Dataset-Transactions-and-Build-Branches|Build fallback 계약]]
- [[Palantir-Lineage-Exploration-and-Access|Graph 탐색의 범위]]
- [[Palantir-Dataset-and-Pipeline-Rollback|Branch rollback]]
