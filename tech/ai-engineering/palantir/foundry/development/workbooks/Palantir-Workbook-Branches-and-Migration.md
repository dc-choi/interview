---
tags: [palantir, workbook, branch, migration]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workbook branch와 repository 이전"]
---

# Workbook branch와 repository 이전

Workbook branch는 logic과 data 상태를 함께 분리한다. 생성 시점의 dataset 상태를 추적하고 branch에서 실행한 output을 별도 dataset branch에 쓴다. Imported dataset은 같은 이름 branch를 우선하고 없으면 Workbook branch hierarchy로 fallback한다. 명시적인 input branch 선택도 가능하다.

## Merge logic과 transaction을 나눠 선택한다

기본 최대 branch는 100개다. 기존 100개 초과분을 자동 삭제하지 않지만 새 branch는 줄이기 전까지 만들 수 없다. Parent 삭제 시 child를 다시 parent에 연결한다. Merge는 immediate parent로만 가능하다.

Preview merge는 target 최신 logic과 source를 합친 별도 상태다. 실행하면 output에 `vector-merge-...` branch를 만들어 source/target data를 격리한다. Run Affected와 row/schema diff로 검증하고 target 변경 뒤에는 Update merge한다. Exit merge는 merge 중 수정만 버리고 source 원본을 유지한다.

완료 시 copy transactions를 켜면 source 데이터를 target으로 가져오며 branch 이후 target에서 새로 만든 transaction이 target view에 더 이상 보이지 않을 수 있다. Code merge와 별개로 검토해야 한다. Source dataset branch 삭제 toggle과 Workbook source branch 삭제도 별개다. Workbook branch는 child가 남아 있지 않으면 merge 후 자동 삭제된다.

Protected branch는 직접 편집을 막고 기본적으로 interactive Run도 막아 schedule과 충돌을 줄인다. Protected merge에는 maintain(기본 Owner), policy 변경에는 manage 권한이 필요하다. 충돌 해결과 merge 권한은 다른 실패 원인이다.

## 복구 이력과 output 소유권

Hidden code repository는 read-only이며 Workbook 수정마다 branch commit을 자동 남긴다. `pipeline.py/.R/.sql`과 hidden workbook metadata를 보존하고 global code도 포함한다. 삭제 코드는 history에서 찾아 Workbook에 복원한다. 옛 FAQ의 intermediate code 복구 불가 설명보다 전용 hidden repository 기능을 먼저 확인한다. 이 backing history가 사용자 PR/CI workflow 전체를 제공하는 것은 아니다.

Python/SQL export는 Editor 권한의 destination repository에 새 branch를 만드는 한 번의 단방향 best-effort conversion이다. SQL 또는 Pandas/Spark dataframe input/output Python의 연결 graph만 지원한다. Python TransformInput/Object, R과 disconnected node는 이 경로에서 제외된다. 이후 Workbook 수정은 동기화되지 않고 같은 dataset 재export도 지원되지 않는다.

Export 후 language subproject, generated module의 pipeline import, dataset path/name과 package checks를 수정/검증한다. 기본 output은 새 dataset이다. 기존 dataset을 계속 쓰려면 기존 job spec을 제거하고 repository CI가 새 spec의 소유권을 갖게 해야 한다. 이후 원래 Workbook이 그 dataset을 다시 쓸 수 없으므로 생산 전환과 rollback을 계획한다.

## Project scope와 production 운영

새 Workbook은 Project token을 쓰고 input/template은 같은 Project 또는 reference, output은 같은 Project여야 한다. Job token의 Foundry service API 호출은 실패한다. Noncompliant input/output은 build와 job spec 갱신을 막는다.

Legacy user-token Workbook은 기존 범위로 실행할 수 있지만 scoping을 켜려면 master에서 위반을 해결해야 한다. 다른 branch도 각 위반을 해결해야 하며 UI로 다시 끌 수 없다. Scope 이행은 단순 UI flag가 아니라 token과 dependency 계약 변경이다.

Output health check, batch schedule, `/data`/`workbooks`/`templates`와 graph grouping으로 운영 경계를 명확히 한다. Output folder 변경은 기존 derived dataset까지 이동할 수 있다. Copy/paste node는 재사용 수단이며 branch merge나 external reference/permission 이전과 같지 않다. Contour board copy 지원 여부도 확인한다.

## 출처

- [Palantir, Workbook branching](https://www.palantir.com/docs/foundry/code-workbook/branching-overview)
- [Palantir, Branching tutorial](https://www.palantir.com/docs/foundry/code-workbook/branching-getting-started)
- [Palantir, Imported dataset branches](https://www.palantir.com/docs/foundry/code-workbook/branching-imported-datasets)
- [Palantir, Merging branches](https://www.palantir.com/docs/foundry/code-workbook/branching-merging)
- [Palantir, Hidden code repositories](https://www.palantir.com/docs/foundry/code-workbook/hidden-repository)
- [Palantir, Export to Code Repository](https://www.palantir.com/docs/foundry/code-workbook/code-repositories-export)
- [Palantir, Project references](https://www.palantir.com/docs/foundry/code-workbook/project-references)
- [Palantir, Moving to production](https://www.palantir.com/docs/foundry/code-workbook/workbooks-production)
- [Palantir, Duplicate nodes](https://www.palantir.com/docs/foundry/code-workbook/workbooks-duplicate-nodes)

## 관련 문서

- [[Palantir-Repository-Review-and-Scope|Production repository]]
- [[Palantir-Workbook-Execution-and-Persistence|Materialization]]
