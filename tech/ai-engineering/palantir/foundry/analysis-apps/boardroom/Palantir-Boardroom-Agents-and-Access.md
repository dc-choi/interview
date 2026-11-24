---
tags: [palantir, foundry, boardroom]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-11-24
---

# Boardroom 에이전트 팀과 접근 권한

Boardroom은 director와 전문 에이전트가 Foundry/Gotham의 Ontology, 코드 실행과 도구를 사용해 공동 작업하는 beta 앱이다. Primary Ontology에 Mindkit product를 설치하고 AIP를 활성화해야 한다. Prompt-driven 또는 Ontology-informed로 팀을 생성한 뒤 각 역할, 모델, memory, skill, 도구와 직접 호출할 subagent를 조정한다.

Global context는 모든 agent에 전달된다. 기본 Ontology search를 끄면 global/개별 context에 추가한 객체로 탐색 범위를 제한한다. 이 설정과 실제 Ontology 권한은 별개로 검토한다. Workshop 앱과 지원되는 다른 Foundry 앱도 도구로 넣어 agent가 알맞은 workflow를 띄우게 할 수 있다. 모드별 설정은 따로 있으며, 문서의 예시는 Meetings에서 실시간 음성으로부터 사용자 정의 객체를 추출하는 action을 더하는 것이다(2026-11-24 문서 기준, 이전 판은 Panel의 회의 전사문에서 추출하는 예시였다). Meetings의 흐름은 [[Palantir-Boardroom-Modes-and-Reuse|작업 모드와 재사용 지침]]에 있다. Agent delegation description은 작업 분담, key skill은 발견을 돕는 설정이다.

## 저장과 권한

세션/생성물 metadata는 Ontology 객체, PPTX 같은 파일은 media set에 저장한다. Mindkit이 설치한 자원을 직접 수정하면 향후 upgrade를 막을 수 있다.

Restricted는 직접 role grant를 받은 사람/그룹만 접근하게 한다. Viewer도 새 chat/creation을 만들고 자신이 만든 항목을 수정/삭제할 수 있다. 다른 생성물과 설정은 읽을 수 있지만 수정할 수 없다. Editor는 boardroom 안의 항목 전체를 수정/삭제하고 Owner는 권한 관리와 boardroom 삭제도 수행한다.

생성 시 nested object는 같은 CBAC, mandatory marking과 discretionary permission을 사용한다. 생성 후 discretionary 권한은 바꿀 수 있지만 CBAC/mandatory marking은 변경할 수 없다. 생성 전에 데이터 분류를 정해야 한다. Boardroom에 접근할 수 있다는 사실을 모든 참조 Ontology/media 데이터의 권한으로 확대하지 않는다.

## 다른 앱에 임베드

Workshop module 같은 다른 Foundry 앱에 iframe widget으로 boardroom을 넣을 수 있다. 기본 임베드는 boardroom 자체 sidebar를 포함하고, 그 sidebar의 Back 버튼은 Boardroom 홈으로 돌아가 사용자를 원래 앱의 흐름 밖으로 내보낸다. Boardroom URL에 다음 parameter 중 하나를 붙여 막는다(2026-11-24 문서 기준).

- `hideSidebar=true`: Back 버튼과 모드 간 이동을 포함한 boardroom sidebar를 숨긴다. Foundry sidebar까지 숨기려면 `embedded=true`를 함께 고려한다.
- `embedded-chat-only=true`: Chat 모드에서 boardroom sidebar와 header를 없앤다.

이 parameter는 표시 요소를 숨길 뿐이고, 원문은 임베드했을 때의 권한 동작을 설명하지 않는다. 임베드해도 앞의 접근 역할과 객체 권한 검토를 그대로 적용한다.

## 출처

- [Palantir, boardroom](https://www.palantir.com/docs/foundry/boardroom)
- [Palantir, configure-a-boardroom](https://www.palantir.com/docs/foundry/boardroom/configure-a-boardroom)
- [Palantir, create-a-boardroom](https://www.palantir.com/docs/foundry/boardroom/create-a-boardroom)
- [Palantir, overview](https://www.palantir.com/docs/foundry/boardroom/overview)

## 관련 문서

- [[Palantir-Foundry]]
- [[Palantir-Boardroom-Modes-and-Reuse|작업 모드와 재사용 지침]]
