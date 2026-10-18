---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Object View 버전, Branch와 배포

Object View tab structure와 각 Workshop module은 별도 버전을 가진다. Automatic publish 기본값은 켜짐이며 Save and publish는 tab과 현재 module을 함께 공개한다. 끄면 Save/Publish가 분리된다. Module autosave만으로 사용자가 보는 Object View가 바뀌지는 않는다. 여러 편집자/운영 사용자가 있으면 자동 publish를 끄고 이전 version preview/republish 경로를 둔다.

Branch에는 full tabs resource와 각 managed module/panel이 따로 들어간다. Full tabs resource 제거는 관련 tab resource도 제거한다. Merge 전 publish 권한, main rebase와 legacy-field 변경 없음 검사가 필요하다. Tab structure rebase와 module content rebase는 별개다. 충돌은 main/branch 중 선택하고 자동 병합 결과도 검토한다. Legacy tab은 branch 편집을 지원하지 않는다.

## Merge 권한이 더 강한 경우

Datasource-derived model에서 main 편집은 backing source 중 하나의 Editor지만 branch merge는 모든 backing source의 Editor와 type View, Object View Admin이 필요하다. Contributor 또는 승인 reviewer가 요건을 만족한다. Ontology role/project model은 type edit 권한으로 처리하고 별도 Object View Admin은 요구하지 않는다.

Parent type의 project approval policy는 view/modules에도 적용된다. 그러나 parent resource protection의 direct-main 차단 상속은 문서상 개발 중이라 보호된 type이어도 view/module을 main에서 직접 편집할 수 있다. Approval 상속과 direct-edit 차단 완료를 혼동하지 않는다.

Marketplace는 Workshop tab만 지원하며 legacy tab은 재구축해야 한다. Product에 Ontology entity를 추가하고 포함할 tab을 선택한다. Packaging 성공을 운영 데이터 권한과 배포 검증의 완료로 간주하지 않는다.

## 출처

- [Palantir, branching-object-views](https://www.palantir.com/docs/foundry/object-views/branching-object-views)
- [Palantir, manage-versions](https://www.palantir.com/docs/foundry/object-views/manage-versions)
- [Palantir, marketplace-object-views](https://www.palantir.com/docs/foundry/object-views/marketplace-object-views)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
