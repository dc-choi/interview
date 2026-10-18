---
tags: [palantir, foundry, workshop]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workshop legacy scenario의 저장과 적용"]
---

# Workshop legacy scenario의 저장과 적용

Workshop Scenarios는 legacy로 신규 개발은 없고 full support는 남아 있으며 새 workflow는 Ontology scenarios를 권한다. Temporary scenario와 object-backed saved scenario를 구분한다. Scenario는 base Ontology 전체 복사가 아니라 Action edits/model estimates의 immutable fork이고 수정은 새 scenario를 만든다.

## Model과 제약

Model은 function-backed action으로 감싸고 Domain은 평가 대상 object set을 정한다. Domain subset에 대해 계산해도 전체에서 해당 object를 계산한 것과 같아야 한다는 independence 요구가 있다. 상호 영향을 주는 모델을 이 계약 없이 subset으로 평가하면 의미가 달라질 수 있다.

Source 한도는 scenario≤30,000edits,≤50Actions,scenario context에서≤10,000objects load이며 Action/Function 자체 limit도 함께 적용된다. Attachment는 referencing object에 file registration이 안 되어 미지원이다. 이는 현재 모든 Ontology scenario 제품의 공통 한도라는 뜻이 아니다.

## Save/load/apply 분리

Temporary는 session 종료 시 사라진다. Save는 ID/name typeclass가 있는 object와 create/update Action으로 scenario metadata를 저장한다. Versioned-scenario-rid, scenario-name, scenario-object-locator는 역할이 다르다. Saved object가 있어도 module 진입 때 자동 load되지 않아 object set→scenario array mapping을 따로 구성한다.

Manager는 static/dynamic scenario와 active scenario를 구분하며 양쪽 중복은 dynamic에서 제거한다. Selector는 create 권한 없이 선택만 제공할 수 있고 Summary의 Action remove/undo는 scenario edit다. Scenario-aware widget과 scenario-backed variable을 구분해 base data와 비교한다.

Apply는 scenario의 Actions를 transactionally 적용하며 하나라도 validation 실패하면 모두 적용하지 않는다고 설명한다. Model expected result는 실제 modifiable edit가 아니어서 apply하지 않는다. Optional apply Action의 validation은 apply permission을 추가로 제어할 수 있다. Saved scenario에 unsaved change가 있으면 apply button이 disabled다.

Save와 apply는 다른 권한/행위다. Viewer에게 editor 전체 권한을 주는 대신 별도 scenario-create role 구성이 필요할 수 있다. 실제 scenario/Action은 실행하지 않았다.

## 출처

- [Palantir Workshop, scenarios-apply](https://www.palantir.com/docs/foundry/workshop/scenarios-apply)
- [Palantir Workshop, scenarios-concepts](https://www.palantir.com/docs/foundry/workshop/scenarios-concepts)
- [Palantir Workshop, scenarios-configure-domain](https://www.palantir.com/docs/foundry/workshop/scenarios-configure-domain)
- [Palantir Workshop, scenarios-getting-started](https://www.palantir.com/docs/foundry/workshop/scenarios-getting-started)
- [Palantir Workshop, scenarios-load](https://www.palantir.com/docs/foundry/workshop/scenarios-load)
- [Palantir Workshop, scenarios-overview](https://www.palantir.com/docs/foundry/workshop/scenarios-overview)
- [Palantir Workshop, scenarios-save](https://www.palantir.com/docs/foundry/workshop/scenarios-save)
- [Palantir Workshop, widgets-scenario-manager](https://www.palantir.com/docs/foundry/workshop/widgets-scenario-manager)
- [Palantir Workshop, widgets-scenario-selector](https://www.palantir.com/docs/foundry/workshop/widgets-scenario-selector)
- [Palantir Workshop, widgets-scenario-summary](https://www.palantir.com/docs/foundry/workshop/widgets-scenario-summary)

## 관련 문서

- [[Palantir-Workshop]]
