---
tags: [palantir, ontology]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Ontology Manager의 저장, 복원과 정리

Ontology Manager는 schema, datasource 연결, Action과 index 상태를 관리한다. Apps, Data Lineage의 Configure object type, `/workspace/ontology`로 접근한다. Cmd/Ctrl+K 검색과 resource별 filter로 정의를 찾고 객체의 dependents/data/usage를 함께 확인한다. Function은 여기서 버전과 사용 앱을 확인하지만 수정은 Functions Code Repository에서 한다.

## Working state와 저장

편집은 local work-in-progress에 머물다가 Review edits와 Save를 거쳐 반영된다. Error는 저장을 막고 warning은 영향을 확인하도록 안내한다. 다른 사용자가 먼저 저장하면 Update로 최신 내용을 가져오고 충돌을 해결한다. Resource별 discard와 전체 discard를 구분한다.

Object/property 변경은 downstream 앱을 깨거나 writeback 이력을 없앨 수 있다. 경고에 표시된 영향과 대상 이름을 확인해야 한다. Backend 오류는 `OntologyMetadata:`/`Phonograph2:` 식별자로 조사한다.

History는 저장 단위의 변경과 작성자/시점을 보여준다. 접근할 수 없는 type의 변경은 발생 사실만 보이고 세부 내용은 보이지 않을 수 있다. 과거 object type 버전의 restore는 이후 변경을 working state에서 되돌리는 작업이다. 다시 저장해야 적용되며 모든 data의 시점 복원을 뜻하지 않는다.

## JSON 내보내기와 가져오기

Export는 미저장 변경을 포함한 working state를 JSON으로 내보낸다. JSON schema는 변경될 수 있으므로 안정된 외부 API 계약으로 의존하지 않는다. Import는 working state 전체를 다시 만들고 별도 Save가 필요하다.

Conditional formatting rule을 가진 state는 다른 Ontology로 그대로 import할 수 없다. `OntologyMetadata:UnreferencedRuleSets`가 나면 대상에 없는 rule set을 확인하고 필요한 formatting을 제거/재구성한다. Import를 단순 추가 merge로 가정하지 않는다.

## Cleanup은 후보 판단을 돕는다

Snooze는 개인 queue에서 잠시 숨긴다. Deprecate는 모든 사용 맥락에 종료 예정 상태와 날짜를 알린다. Delete는 type뿐 아니라 object storage의 연결 data도 제거한다. Deprecate/delete는 staged change이므로 검토와 저장이 필요하다.

후보 flag에는 deprecation 기한 경과, trashed datasource, datasource 미갱신, 설명 없음, 이름 regex와 OSv1 deindexed가 있다. Flag는 삭제 안전성의 증명이 아니다. User edits와 실제 소비자를 확인한다. 이름 matching은 ECMA JavaScript regex이며 Ontology 검색 regex와 다르다.

Flag와 priority 설정은 개인별이다. Custom flag를 쓰면 향후 default에 추가되는 flag가 자동 활성화되지 않으므로 설정 유지 책임이 남는다.

## Usage가 없다는 표시의 한계

Read는 객체 건수가 아닌 load request, bulk write도 여러 객체를 편집하는 하나의 request로 센다. Interactions와 active users는 최근 30일 기준이고 Ontology Manager 자체의 type/link 사용은 제외한다. Write 설명에는 OSv1 endpoint가 남아 있으므로 모든 최신 backend의 계측 세부 계약으로 확대하지 않는다.

No usage는 실제 사용이 없거나 internal table이 구성되지 않은 경우일 수 있다. Ontology metrics 설정은 관리자만 바꾸고 반영에 최대 60분이 걸린다. Shared Ontology는 metrics가 활성화된 조직과 type 접근자의 범위만 반영한다. 삭제 판단에 빈 usage graph 하나만 사용하면 안 된다.

## 출처

- [Palantir, ontology-manager](https://www.palantir.com/docs/foundry/ontology-manager)
- [Palantir, cleanup](https://www.palantir.com/docs/foundry/ontology-manager/cleanup)
- [Palantir, export-import](https://www.palantir.com/docs/foundry/ontology-manager/export-import)
- [Palantir, navigation](https://www.palantir.com/docs/foundry/ontology-manager/navigation)
- [Palantir, overview](https://www.palantir.com/docs/foundry/ontology-manager/overview)
- [Palantir, restore-changes](https://www.palantir.com/docs/foundry/ontology-manager/restore-changes)
- [Palantir, save-changes](https://www.palantir.com/docs/foundry/ontology-manager/save-changes)
- [Palantir, view-usage](https://www.palantir.com/docs/foundry/ontology-manager/view-usage)

## 관련 문서

- [[Palantir-Ontology-Guides|Ontology 설계와 개발]]

공식 본문을 대조한 지식이며 실제 Foundry 환경에서 실행 검증하지 않았다.
