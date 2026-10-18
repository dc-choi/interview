---
tags: [palantir, foundry, iceberg]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Iceberg의 table-wide marking과 maintenance 권한

table:read/table:write는 managed/virtual table의 읽기와 쓰기를 제어한다. 문서의 Viewer/Editor/Owner는 default role이므로 custom role set의 실제 operation을 확인한다.

## Marking의 넓은 영향

metadata file은 모든 branch/tag의 retained snapshot을 포함한다. 따라서 한 snapshot의 marking이 main을 포함한 table 전체의 읽기를 막을 수 있다. 깨끗한 새 snapshot을 작성하거나 branch를 삭제하는 것만으로 예전 marking이 사라지지 않는다.

marking 자체를 의도적으로 제거하려면 승인된 stop_propagating workflow를 쓴다. obsolete history 정리는 snapshot이 branch/tag에 참조되지 않도록 만든 뒤 expire하고, Snapshots 탭에서 없어졌는지 확인한다. branch를 지우거나 parent 의존이 없는 table full replace가 필요할 수 있다. cleanup에는 marked table 접근권과 maintenance operation도 필요하다.

## Main resource 보호

Beta main branch protection은 backing code의 branch protection과 다르다. owning job spec 밖의 external client/maintenance 수정에는 iceberg:bypass-branch-protection(default Owner)이 추가로 필요하다.

## Maintenance operation

| 행위 | 필요한 operation |
|---|---|
| 조회 | iceberg:read-maintenance-tasks(default Viewer) |
| form procedure 작성 | iceberg:write-maintenance-tasks(default Editor) |
| Custom SQL 작성 | 위 write + iceberg:write-sql-maintenance-tasks |
| 논리 data 변경 SQL | 위 2개 + iceberg:write-data-altering-maintenance-tasks |
| schedule 생성 | iceberg:schedule-maintenance-tasks |

write 권한은 누적 검사한다. general write-maintenance가 없으면 specific 권한만으로 task를 작성하지 못한다. underlying table read/write와 protected table bypass도 독립적으로 검사한다. task configuration 권한과 table data 권한을 같은 것으로 취급하지 않는다.

## 출처

- [Palantir, permissions](https://www.palantir.com/docs/foundry/iceberg/permissions)
- [Palantir, markings](https://www.palantir.com/docs/foundry/iceberg/markings)

## 관련 문서

- [[Palantir-Iceberg-Client-Authentication]]
- [[Palantir-Iceberg-Maintenance-and-History]]
