---
tags: [palantir, automate, branching, scenario, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Automate branch와 scenario 격리"]
---

# Automate branch와 scenario 격리

Global branch는 logic/resource 변경을, Ontology scenario는 대안 객체 상태를 다룬다. Automation이 사용하는 context와 Main에 함께 영향을 주는 설정, 외부 효과를 각각 확인한다.

## Branch에 저장해야 실행을 분리한다

Add to branch 후 수정/save해야 branch resource가 된다. Condition과 effect는 branch의 object/action/function과 branched prerelease를 사용한다. Remove from branch는 변경을 버리고 해당 branch effects를 멈춘다. **Name/description의 branch 수정은 Main도 바꾼다.**

Time, added/removed/modified와 Run on all은 지원하지만 threshold/dependency/time-series/dataset/raw stream/metric-changed는 branch에서 미지원이다. 모든 effect type 지원이 외부 endpoint의 안전한 복제를 뜻하지는 않아 Action branch side-effect 설정을 따로 확인한다.

Merge에는 필요한 approval, Main rebase와 유효 configuration이 필요하다. Dependency 삭제로 저장 후에도 invalid가 될 수 있다. Main을 project policy로 보호하고 rebase는 Main 또는 current branch **전체 version**을 선택한다. Field별 섬세한 conflict resolution은 아직 없으며 rebase가 review보다 먼저다.

## Scenario enablement는 Main 실행도 유지한다

Scenario metadata object type을 등록하면 automation은 Main과 발견한 각 scenario를 독립 평가한다. Scenario 삭제/TTL 종료 뒤 해당 감시를 멈춘다. Owner가 scenario와 metadata type 모두에 접근해야 한다.

Scenario는 time/added/removed/modified/Run on all을 지원하고 threshold/dependency/time-series/raw stream/metric-changed는 미지원이다. Temporary scenario는 지원하지 않으며 최대 100개다. Save 후 target이 100개를 넘으면 scheduled evaluation이 condition/effect 전 단계에서 실패한다.

Action/Logic/Function은 scenario context에서 실행하고 notification의 dynamic recipient/content도 scenario property를 따른다. Main을 중단하지 않으므로 시험용 enablement가 Main 자동화를 대체한다고 오해하지 않는다. 일반 effect의 원천 접근/외부 쓰기는 여전히 별도 계약이다.

## Product packaging의 지원 범위를 확인한다

Marketplace는 saved ObjectSet condition 또는 group이 아닌 recipient가 있는 automation을 지원하지 않는다. Action/Logic effect는 자동 upgrade되지 않아 해당 automation을 Production mode로 설치할 수 없다고 전용 문서에 명시돼 있다. 일반 bulk function upgrade 기능과 product auto-upgrade를 같은 기능으로 보지 않는다.

Notepad/Explorer/Manager에서 automation을 만드는 integration은 attachment/condition/Action을 미리 채우는 workflow다. Wizard 진입이나 resource reference 추가가 publish/권한/실행 완료인 것은 아니다.

## 출처

- [Palantir, Branching automations](https://www.palantir.com/docs/foundry/automate/branching-automations)
- [Palantir, Automations on Ontology scenarios](https://www.palantir.com/docs/foundry/automate/automations-on-ontology-scenarios)
- [Palantir, Add automations to a Marketplace product](https://www.palantir.com/docs/foundry/automate/marketplace-automate)
- [Palantir, Integrations](https://www.palantir.com/docs/foundry/automate/integrations)
- [Palantir, Getting started with Automate](https://www.palantir.com/docs/foundry/automate/getting-started)

## 관련 문서

- [[Palantir-Branching-and-Packaging-Boundaries|플랫폼 branch와 배포 경계]]
- [[Palantir-Ontology-Scenarios|Scenario 편집과 반영]]
- [[Palantir-Action-External-Effects|외부 효과와 branch]]
