---
tags: [palantir, security, markings, pipeline]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry pipeline Marking 제거"]
---

# Pipeline Marking 제거와 승인 경계

Marking은 모든 적용 Marking에 접근 자격이 있어야 하는 제한이고, Project Organization은 적용 조직 중 하나의 member/guest 자격을 요구하는 제한이다. Role은 수행 가능한 workflow 권한이다. 상속 제거는 Marking/Organization에 적용하며 Role을 제거하는 기능이 아니다.

## Code 변경과 권한 확장을 함께 검토한다

민감 데이터가 제거되거나 적절히 난독화된 파생물에 `stop_propagating`(Marking), `stop_requiring`(Organization)을 설정한다. Python input property, Java annotation/registration 또는 SQL hint로 지정하며 output property가 아니다. 제한을 운반하는 모든 input과 적용할 protected branch를 명시해야 한다.

Repository는 protected branch와 최소 한 명의 required approver를 요구한다. Unprotected branch를 제거 대상에 넣으면 build가 실패한다. Feature branch에서 target protected branch의 제거를 제안할 수 있지만 feature output은 기존 제한을 상속한다. PR 승인, merge와 해당 branch build를 마친 뒤 새 output에서 제한 제거를 확인한다.

Approver는 repository를 볼 기본 workflow와 그 Project/repository의 접근 요구를 충족해야 한다. 별도로 Marking의 Remove marking, Organization의 Expand access 권한이 필요하다. 이 관리 권한과 해당 Marking/Organization의 member 자격은 같은 개념이 아니다.

`stop_requiring`은 input에서 상속된 모든 Organization을 제거하지만 승인 요청은 명시한 Organization에 대해서만 요구한다. 적어도 하나의 upstream Organization을 지정해야 한다. 모두의 승인을 요구하려면 ID를 모두 명시한다. 결과는 output Project의 Organization을 따른다. 조직 ID 하나를 지정해 그 조직만 빠진다고 오해하면 승인 범위를 잘못 설계한다.

## 재승인은 repository 변경 범위에 영향을 준다

Require re-approval은 기본 mode이며 제거가 있는 branch의 이후 PR에서 repository 내 다른 파일 수정까지 해당 보안 승인을 요구한다. Don't require re-approval은 input의 최초 제거에는 승인하되 이후 로직 변화는 같은 승인으로 막지 않는다.

불필요한 review를 줄이려면 실제 민감정보 제거 로직이 있는 transform들을 별도 repository로 모아 Require re-approval을 유지할 수 있다. 민감정보 처리를 숨긴 외부 repository와 identity transform만 있는 별도 unmarking repository로 나누는 방식과 구분한다. 검토자가 제거 로직과 권한 확장을 함께 볼 수 있어야 한다.

안전한 데이터의 allowlist를 적극 선택한다. 금지 field를 drop하거나 금지 row만 제외하면 새 sensitive field/분류가 upstream에 추가될 때 유출될 수 있다. 안전 기준, 승인 담당과 허용 출력 schema를 명시한다.

## Marking 추가와 제거는 대칭이 아니다

Dataset이나 상위 folder에 Marking을 추가하면 전체 과거 transaction과 그 lineage에 즉시 전파될 수 있다. Transform의 제거는 이후 생성한 output transaction에만 적용하고 기존 output transaction의 Marking을 지우지 않는다.

제거 transform 다음의 downstream이 옛 marked transaction을 참조하면 제한이 남을 수 있다. 가이드는 dataset view 권한이 각 input의 최신 transaction을 확인하므로 incremental도 일반 rebuild로 해제될 수 있다고 설명한다. 다만 제거 경계부터 downstream까지 의존 경로의 모든 dataset을 새 unmarked transaction 뒤에 rebuild해야 한다. 과거 transaction 자체가 unmarked가 되었다는 뜻은 아니다.

대규모 기존 pipeline에 새 Marking을 넣을 때 end user가 즉시 잠길 수 있다. 새 A′ 복제와 B의 input 교체/제거 로직 동시 적용, B build 후 A′ marking, 기존 A trash라는 이행 예도 있지만 input 교체가 SNAPSHOT을 유발할 수 있다. 이 가역성/성능과 전체 dependent resource를 검토 없이 일괄 절차로 적용하지 않는다.

## View requirement와 Marking은 별도 전파다

Propagate View Requirements가 꺼져 있으면 downstream viewer가 upstream Project 권한까지 요구받지는 않지만 Marking 전파는 계속된다. 신규 Project의 기본 off를 민감정보 보호 off로 읽지 않는다.

기존 view requirement/severing을 Marking으로 이행하려면 민감 dataset과 필요한 사용자를 식별하고 먼저 Marking 자격을 부여한다. Marking 적용 후 view propagation을 해제하고 기존 severing을 unmarking으로 같은 시점에 교체한 뒤 pipeline을 build한다. 이후 불필요한 upstream Project 접근을 회수한다. Deprecated severing에 신규 설계를 의존하지 않는다.

제거는 Project 내에서 input import 가까이 또는 export 직전처럼 검토하기 쉬운 경계에 둔다. User-scoped build가 필요한 제한과 schedule의 Project scope 가능 여부도 함께 점검한다. Policy 설정과 실제 데이터 제거의 정확성은 각각 확인해야 한다.

## 출처

- [Palantir, Remove inherited Markings and Organizations](https://www.palantir.com/docs/foundry/building-pipelines/remove-inherited-markings)
- [Palantir, Guidance on removing markings](https://www.palantir.com/docs/foundry/building-pipelines/remove-markings)
- [Palantir, Pipeline security](https://www.palantir.com/docs/foundry/building-pipelines/security-overview)

## 관련 문서

- [[Palantir-Security-and-Governance|Foundry 보안과 정책]]
- [[Palantir-Pipeline-Projects-and-Releases|Project와 release]]
- [[Palantir-Pipeline-Schedule-Resolution|실행 scope]]
