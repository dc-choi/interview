---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pilot 앱과 위젯의 발행 계약"]
---

# Pilot 앱과 위젯의 발행 계약

## Standalone app

앱 배포는 default code branch에 변경을 merge한 뒤 별도 Ontology 정의 배포, Developer Console/OAuth/application restrictions/subdomain 구성, CI와 release를 진행한다. Project Editor만으로 모든 단계가 허용되는 것은 아니며 organization의 third-party app와 domain approval 권한이 별도로 필요하다.

새 Ontology 정의는 Global Branching에서 검토하고 관련 object type이 branch에 index된 뒤 Action을 시험한다. Proposal approval은 enrollment에 따라 자동 또는 수동이다. Main에 merge한 뒤 돌아오며 branch-specific Action RID를 그대로 참조하면 깨질 수 있다. SDK가 실제 배포 정의를 반영해야 한다.

Production app은 seed 대신 real Ontology를 사용한다. 최초 사용자의 OAuth consent와 앱 restriction, 대상 Action submission criteria는 별개다. Pilot 생성 Action의 기본 criteria는 creator만 허용할 수 있으므로 다른 사용자 시험 전에 의도한 접근을 설정한다.

CI 파일(.env.production, ci.yml, foundry.config.json 등) 생성/수정도 code change다. Protected branch에서는 proposal을 거친다. Tag 생성 확인만으로 release build 성공, domain 승인과 hosted app 도달 가능성을 보고하지 않는다. 의도한 commit의 CI와 release build를 확인한다.

## Workshop widget set

Widget은 app-specific subdomain/Developer Console app을 쓰지 않고 versioned set을 Widget Registry에 발행한다. 여러 widget을 한 set으로 배포할 수 있다. Host에서 typed parameter를 받고 event를 내보내며 실제 보는 사용자의 권한으로 OSDK를 사용한다. Browser capability와 external network는 sandbox 제한을 받는다.

정의 merge 이후 Generate/Update/Regenerate SDK와 설치/업그레이드 여부를 확인한다. Local preview가 되더라도 production SDK에 새 entity export가 없을 수 있다. CI 성공 뒤 tag release를 만들고 Registry publish 완료를 확인한다.

새 widget version 발행은 기존 Workshop 사용처를 자동 변경하지 않는다. Host의 version 선택과 parameter/event binding, layout을 갱신해 publish하고 Dev mode override를 꺼 실제 release를 검증한다. Synthetic seed를 widget mount 시 실제 Action으로 자동 생성하는 코드는 seed 데이터와 다르므로 분리한다.

이 문서는 발행 절차의 상태와 권한을 학습한 기록이며 실제 배포, 승인, OAuth consent와 Action 시험을 수행하지 않았다.

## 출처

- [Palantir pilot, pilot](https://www.palantir.com/docs/foundry/pilot)
- [Palantir pilot, branches-and-proposals](https://www.palantir.com/docs/foundry/pilot/branches-and-proposals)
- [Palantir pilot, build-a-widget](https://www.palantir.com/docs/foundry/pilot/build-a-widget)
- [Palantir pilot, build-an-application](https://www.palantir.com/docs/foundry/pilot/build-an-application)
- [Palantir pilot, deploy-a-widget](https://www.palantir.com/docs/foundry/pilot/deploy-a-widget)
- [Palantir pilot, deploy-an-application](https://www.palantir.com/docs/foundry/pilot/deploy-an-application)
- [Palantir pilot, getting-started](https://www.palantir.com/docs/foundry/pilot/getting-started)
- [Palantir pilot, models-and-modes](https://www.palantir.com/docs/foundry/pilot/models-and-modes)
- [Palantir pilot, ontology-tab](https://www.palantir.com/docs/foundry/pilot/ontology-tab)
- [Palantir pilot, overview](https://www.palantir.com/docs/foundry/pilot/overview)
- [Palantir pilot, provide-context](https://www.palantir.com/docs/foundry/pilot/provide-context)
- [Palantir pilot, troubleshooting](https://www.palantir.com/docs/foundry/pilot/troubleshooting)
- [Palantir pilot, tutorial-todo-application](https://www.palantir.com/docs/foundry/pilot/tutorial-todo-application)
- [Palantir pilot, work-with-data](https://www.palantir.com/docs/foundry/pilot/work-with-data)
- [Palantir pilot, workspace-overview](https://www.palantir.com/docs/foundry/pilot/workspace-overview)

## 관련 문서

- [[Palantir-Pilot]]
