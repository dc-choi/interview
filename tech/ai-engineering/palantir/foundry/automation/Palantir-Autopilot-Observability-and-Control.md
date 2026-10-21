---
tags: [palantir, autopilot, automate, observability, state-machine]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Autopilot의 관측 범위와 재실행"]
---

# Autopilot의 관측 범위와 재실행

Autopilot은 automation, Action/Logic/function과 사람의 Workshop 작업을 graph/Kanban으로 연결한다. Workbench의 모델, 관측 가능한 이력과 실제 execution을 나눠 확인한다. 많은 automation은 browser memory와 렌더링에 부담을 줄 수 있다.

## 발견 가능한 관계가 전체 관계와 같지는 않다

Object type/automation에서 시작해 제안된 관련 automation을 추가한다. State는 condition/effect에서 추론하거나 수동 정의하고 type/filter와 display를 나눠 구성한다. Graph의 Remove from workbench는 자원을 workflow 화면에서 빼는 동작이며 실제 automation 삭제가 아니다.

관계 추론은 historical execution에 의존한다. 한 번도 실행하지 않았거나 scheduled automation이면 dependent relation을 추론하지 못할 수 있다. 타인의 user-scoped automation도 접근 제한 때문에 누락될 수 있다. Project-scoped mode는 project 사용자에게 관계/event 가시성을 넓히므로 관측 개선과 권한 확대를 함께 검토한다.

Object edit history와 resource trace log enablement도 별개다. Edit history가 없으면 resource activity panel에 해당 type의 create/delete/modify가 나타나지 않는다. 비어 있는 화면을 미실행/무편집의 단독 증거로 쓰지 않는다.

## State, object와 execution의 단위를 맞춘다

Kanban card는 object, column은 state이며 한 객체의 current states를 볼 수 있다. State별 card property override는 workbench에 저장되고 prominent-property 기본값으로 복원할 수 있다. 해당 정보 표시와 object permission은 다르다.

State의 upstream/downstream breakdown은 최근 100 edit를 기반으로 manual/automated transition을 보여준다. 이것을 전체 역사에 대한 자동화 비율로 확대하지 않는다. Graph의 node/edge와 live dotted line/highlight는 실행 상태를 보여주고 fallback을 펼쳐 볼 수 있다.

Object timeline의 bar는 execution, diamond는 Action edit다. Total runtime은 첫 실행부터 마지막 실행까지이며 human waiting을 포함해 본다. Token/agentic coverage는 최적화 단서이지 정확도/효과성의 판정이 아니다. 각 edit의 user/resource/trace와 실제 property를 대조한다.

공식 timeline 예시는 자동 실행이 7건 중 6건(86%)이어도 전체 57분 39초의 98%가 사람의 입력 대기라고 표시한다. 실행 건수의 자동화 비율과 전체 소요 시간의 병목은 다른 지표다. 같은 화면의 실행 상세에서는 실행한 Action과, 편집된 속성별 변경 전후 값을 확인할 수 있다. 따라서 자동화 비율만 높이기보다 대기 구간과 실제 상태 변경을 함께 검토한다. 이 수치는 제품 성능 기준이 아닌 문서의 예시다. (2026-10-18 [공식 화면](https://www.palantir.com/docs/resources/foundry/autopilot/aip_autopilot_object_timeline.png), [실행 상세 화면](https://www.palantir.com/docs/resources/foundry/autopilot/autopilot_object_timeline_executions.png) 확인)

## 재시도와 fallback을 정상 성공과 구분한다

Automation events는 batch 아래 object별 trace를 연결하고 success/failure/fallback/success-with-no-edit, retry/time/automation으로 필터한다. 재시도가 많거나 성공했어도 edit가 없는 경우를 정상 경로와 따로 조사한다. Error/stack/timing과 같은 automation의 성공 사례를 비교하고 객체의 다른 automation 이력까지 따라간다.

Kanban에서 특정 object retry 또는 필터한 state의 전체 object에 automation을 실행할 수 있다. 이는 화면 refresh가 아닌 실제 effect 실행이다. 재시도 대상, 외부 효과의 중복 가능성과 Action 조건을 확인한다.

## 자연어 trace 탐색과 운영 판단을 나눈다

부분 검증(2026-10-22): Telemetry Navigation Agent의 분석 범위와 전제 조건을 공식 문서와 대조했다. 기존 기능 전체의 검증일은 유지한다.

Automation events에서 이벤트의 execution trace를 열고 Agent 패널을 선택하면 초기 요약과 추천 질문을 볼 수 있다. 에이전트는 선택한 실행의 span 관계와 service log를 조사하고, 실패나 긴 실행 구간을 찾도록 관련 span을 선택하거나 확대해 준다. 실행 순서, 경고와 오류, LLM 호출에 관해 후속 질문을 할 수 있다.

분석에는 **해당 실행의 telemetry와 사용 가능한 언어 모델**이 필요하다. Trace가 없으면 그 실행을 분석할 수 없다. 에이전트 설명만으로 운영 환경을 변경하지 않고, 지목한 span과 원래 service log를 확인한다.

운영 적용 제안: 조사 대상 실행과 시간 범위를 고정하고, 설명에 연결된 오류 및 지연 구간을 원본과 대조한다. 설명에서 제안한 원인과 로그에서 직접 확인한 사실을 구분한 뒤 재시도나 설정 변경을 판단한다. 탐색 지원 기능의 존재는 원인 확정이나 수정 성공의 증거가 아니다.

## Embed의 read-only와 서버 인가를 구분한다

Workshop iframe에는 `embedded=true`, `viewMode=Kanban|Graph|SplitView`를 사용하고 기존 query가 있으면 `&`로 추가한다. `readonly=true`는 workbench에서 automation 실행 UI를 끈다. 다른 앱/API의 실행권을 회수하는 서버 정책으로 해석하지 않는다.

Pro-code agent/OSDK/Compute Module의 recent edit도 사람의 작업과 함께 발견할 수 있다. Workshop node, Ontology Manager card/formatting/panel view의 재사용과 실제 object edit attribution을 연결한다. 앱 이름이 표시됐다고 모든 외부 시스템 변경까지 같은 timeline에 기록된다고 추정하지 않는다.

## 출처

- [Palantir, Autopilot](https://www.palantir.com/docs/foundry/autopilot/overview)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/autopilot/getting-started)
- [Palantir, Workbench](https://www.palantir.com/docs/foundry/autopilot/workbench)
- [Palantir, Dependency graph view](https://www.palantir.com/docs/foundry/autopilot/workbench-graph)
- [Palantir, Kanban board view](https://www.palantir.com/docs/foundry/autopilot/workbench-kanban)
- [Palantir, Automation events](https://www.palantir.com/docs/foundry/autopilot/automation-events)
- [Palantir, Object timeline](https://www.palantir.com/docs/foundry/autopilot/object-timeline)
- [Palantir, Integrations](https://www.palantir.com/docs/foundry/autopilot/integrations)
- [Palantir, Telemetry Navigation Agent](https://www.palantir.com/docs/foundry/autopilot/telemetry-agent)

## 관련 문서

- [[Palantir-AIP-Observability|실행 trace와 log 권한]]
- [[Palantir-Action-External-Effects|재실행의 외부 효과]]
- [[Palantir-Workshop-Applications|UI 상태와 실행 인가]]
