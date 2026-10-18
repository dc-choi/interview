---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pilot 데이터와 agent context의 경계"]
---

# Pilot 데이터와 agent context의 경계

## 화면 모드와 데이터 모드는 다르다

Pilot의 Editor/Deploy는 작업 화면이다. 별도 code branch도 production 데이터의 격리 복사본을 만들지 않는다. 실제 preview indicator가 Notional/Production/Production on branch(위젯은 Branched data) 중 무엇인지 확인해야 한다.

Notional은 container의 mock store이며 seed는 production으로 배포되지 않는다. Ontology tab의 data preview는 앱이 production을 보여도 local seed를 계속 보여 준다. Mock 동작은 실제 권한, Function 결과와 runtime 전체의 검증이 아니다.

Production/Main preview의 Action은 발행 전 Editor에서도 실제 객체를 생성/수정/삭제할 수 있다. Foundry deployment branch의 Action edit는 해당 branch에 한정되며 정의 proposal을 merge해도 시험 객체 edit가 Main으로 합쳐지지 않는다. External call/webhook/notification의 부작용은 별도 branching 규칙이 필요하다.

## Schema 편집 허용과 데이터 접근

Ontology permissions는 생성/수정할 정의를 제어하며 real record 읽기, Action 실행과 배포 권한을 주지 않는다. 기본 허용을 바꿔도 개별 entity override는 유지된다. Link는 독립 편집 허용이 아니라 연결 object type 권한을 따른다. Allow modifications는 속성/매개변수 변경으로 API 호환성을 깨뜨릴 수 있다.

기존 object/action을 쓰는 경우 picker로 정확한 entity를 첨부하고 Existing/Proposed 상태와 개별 잠금을 확인한다. 잠긴 schema 때문에 요청을 수행할 수 없으면 허용 변경/직접 수정/현재 유지의 결정이 필요하다. Frontend가 비었다는 사실은 데이터 없음, 권한 없음, 미배포 정의 중 어느 원인인지 증명하지 않는다.

## Production analysis의 승인 시점

Production preview가 real record를 보여 준다는 사실만으로 app-building agent에 레코드를 제공하는 것은 아니다. 지원 환경의 production-data viewer는 별도 context에서 read-only 분석한다.

Review production data analysis의 승인은 이미 읽고 분석한 내용을 app-building agent에게 공유하는 시점이다. 최초 production read를 승인하는 절차가 아니다. 모든 분석 텍스트를 검토/수정할 수 있으며 민감한 값이 없다고 자동 가정하지 않는다. Preview, viewer 분석과 분석 공유를 세 가지 별도 경계로 다룬다.

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
