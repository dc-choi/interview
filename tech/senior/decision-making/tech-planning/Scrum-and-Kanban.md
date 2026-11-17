---
tags: [senior, decision-making, planning, agile, scrum, kanban]
status: done
verified_at: 2026-11-18
category: "Senior - 의사결정"
aliases: ["Scrum and Kanban", "스크럼과 칸반", "Scrum", "스크럼", "Kanban", "칸반", "Scrum Guide", "Kanban Guide"]
---

# 스크럼과 칸반

스크럼(Scrum)은 고정 길이 Sprint 안에서 목표를 정하고 검사와 적응을 반복하는 경량 프레임워크다. 칸반(Kanban)은 진행 중 작업(WIP)을 통제하며 작업 흐름을 시각화하고 개선하는 전략이다. 스크럼 가이드는 경험주의를 명시하고 시간 상자(timebox)로 검사와 적응의 주기를 만든다. 칸반 가이드는 경험주의라는 말을 쓰지 않고 흐름 지표로 워크플로를 개선한다. 둘을 관측에 기반한 개선 방법으로 묶어 보는 것은 이 문서의 정리다.

## 스크럼의 기반: 경험주의와 가치

스크럼은 투명성(transparency), 검사(inspection), 적응(adaptation)의 세 기둥으로 동작한다. 모든 이벤트는 이 세 가지를 구현하는 장치다. 팀이 공유하는 다섯 가치는 Commitment, Focus, Openness, Respect, Courage다.

## 팀과 책임(accountability)

스크럼 팀은 Scrum Master 한 명, Product Owner 한 명과 Developers로 구성되며 팀 안에 하위 팀이나 위계를 두지 않는다. 규모는 보통 10명 이하다.

| 책임 | 무엇에 책임지는가 |
|---|---|
| Product Owner | 팀 작업에서 나오는 제품 가치의 극대화, Product Backlog의 효과적 관리 |
| Scrum Master | 스크럼 팀의 효과성. 장애물 제거를 돕고 스크럼 이해를 촉진 |
| Developers | Sprint 계획(Sprint Backlog) 수립, Definition of Done 준수로 품질 확보, 매일 계획 조정 |

2020 가이드는 역할(role) 대신 세 가지 책임(accountability)이라는 표현을 쓴다. 이를 조직 내 직위와 별개로 맡는 책임으로 읽고 Scrum Master를 일정 관리자로 줄이지 않는 것은 해석이다. 조직 리더십 관점의 해석은 [[Leadership-Inversion|리더십의 역전]]을 참고한다.

## 산출물과 약속

각 산출물에는 진척을 측정할 기준이 되는 약속(commitment)이 붙는다.

| 산출물 | 약속 | 의미 |
|---|---|---|
| Product Backlog | Product Goal | 제품이 향하는 장기 목표 |
| Sprint Backlog | Sprint Goal | 이번 Sprint의 단일 목표. 범위는 학습에 따라 재협상 가능 |
| Increment | Definition of Done | 완료로 인정하는 품질 기준. 기준에 못 미친 항목은 릴리스하거나 Sprint Review에 보이지 않고 Product Backlog로 돌아간다 |

## 이벤트와 시간 상자

Sprint는 한 달 이하의 고정 길이 이벤트이며 다른 모든 이벤트를 담는다. 아래 상한은 한 달짜리 Sprint 기준이며 Sprint가 짧으면 보통 더 짧아진다(Daily Scrum은 Sprint 길이와 관계없이 15분).

| 이벤트 | 상한 | 목적 |
|---|---|---|
| Sprint Planning | 8시간 | 왜(Sprint Goal), 무엇을, 어떻게 할지 정한다 |
| Daily Scrum | 15분 | Developers가 Sprint Goal 대비 진척을 검사하고 계획을 조정한다 |
| Sprint Review | 4시간 | 이해관계자와 결과를 검사하고 다음 적응을 정한다 |
| Sprint Retrospective | 3시간 | 품질과 효과성을 높일 방법을 찾는다 |

Sprint Goal이 쓸모없어지면 Sprint를 취소할 수 있으며 그 권한은 Product Owner에게만 있다. 번다운, 번업, 누적 흐름도 같은 진척 예측 기법은 유용하지만 경험주의를 대신하지 않는다. 2020 가이드는 이런 차트를 필수 산출물로 두지 않는다. 번다운 차트를 스크럼의 정식 산출물로 설명하는 자료는 이 점에서 가이드와 다르다.

## 칸반: 흐름과 WIP 통제

2025년 5월 판 Kanban Guide 기준이다. 칸반은 세 가지 실천으로 정의된다.

1. 워크플로를 정의하고 시각화한다.
2. 워크플로 안의 항목을 능동적으로 관리한다.
3. 워크플로를 개선한다.

워크플로 정의(Definition of Workflow)에는 시작부터 완료까지 WIP를 어떻게 통제할지가 들어가야 한다. 2025 판 변경 기록은 WIP 통제 방식을 이전보다 덜 구체적으로, 즉 더 유연하게 적었다고 밝힌다. 본문도 WIP 한도(limit)라는 용어 대신 WIP 통제라는 표현을 쓴다. 집중 관점의 WIP 통제는 [[Radical-Focus|래디컬 포커스]]에서 다룬다.

필수 흐름 지표(2025 판의 Flow Metrics)는 네 가지다.

| 지표 | 정의 |
|---|---|
| WIP | 시작했지만 끝나지 않은 항목 수 |
| Throughput | 단위 시간당 완료 항목 수 |
| Work Item Age | 항목 시작부터 현재까지 경과 시간 |
| Cycle Time | 항목 시작부터 완료까지 경과 시간 |

칸반 가이드는 Sprint 같은 시간 상자나 별도 역할을 정의하지 않는다. 워크플로 개선은 정기 회의를 기다리지 않아도 되며, 진행 항목 검토는 상시, 정기 또는 둘을 섞어 할 수 있다. 다른 방법론과 함께 써서 보강하라고 명시하므로 스크럼 팀이 칸반을 더해 쓸 수도 있다.

## 비교와 선택 기준

아래 표는 두 가이드를 이 문서가 나란히 정리한 것이다.

| 기준 | 스크럼 | 칸반 |
|---|---|---|
| 반복 단위 | 고정 길이 Sprint | 정해진 반복 없음. 흐름 지표로 개선 |
| 목표 고정 | Sprint Goal로 한 Sprint의 초점을 고정 | 항목 단위로 당겨 처리 |
| 역할 | Product Owner, Scrum Master, Developers | 가이드가 정의하지 않음 |
| 계획 변경 | Sprint Goal을 해치지 않는 범위에서 재협상 | WIP 통제 안에서 수시 조정 |
| 진척 판단 기준 | 가이드가 정한 지표는 없음. 약속(Sprint Goal, Definition of Done) 대비 검사 | 가이드의 필수 흐름 지표 WIP, Throughput, Work Item Age, Cycle Time |

선택은 일의 도착 패턴과 목표의 성격으로 판단한다(적용 제안). 묶음으로 만들고 이해관계자 검토를 주기적으로 받아야 하는 신규 개발에는 Sprint의 리듬이 맞고, 장애 대응과 운영 요청처럼 예측할 수 없이 들어오는 일이 많으면 고정 Sprint보다 칸반의 흐름 관리가 맞는 경우가 많다. 이 구분은 공식 가이드가 규정한 규칙이 아니며, 두 방식을 섞는 팀도 있다. 방법론 자체가 목표가 되는 실패는 [[Death-Of-Agile|애자일의 죽음]]을 참고한다.

## 면접과 운영 체크포인트

- 스크럼의 세 기둥과 각 이벤트가 어떤 검사와 적응을 담당하는지 설명할 수 있는가
- 산출물과 약속(Product Goal, Sprint Goal, Definition of Done)을 짝지어 말할 수 있는가
- Sprint 취소 권한이 누구에게 있고 언제 쓰는가(Product Owner, Sprint Goal이 쓸모없어졌을 때)
- 번다운 차트가 2020 가이드의 필수 요소가 아니라는 점
- 칸반의 네 흐름 지표와 Work Item Age가 Cycle Time과 다른 점(Age는 아직 끝나지 않은 항목의 경과 시간이라 완료 전에도 지연을 볼 수 있다는 해석)
- 팀 상황에 따라 스크럼, 칸반이나 혼합을 고른 근거를 말할 수 있는가

## 출처

- [Scrum Guides, The 2020 Scrum Guide](https://scrumguides.org/scrum-guide.html)
- [The Kanban Guide, May 2025](https://kanbanguides.org/english/)
- [YouTube, 길리랩, 정보관리기술사 필기 토픽 스크럼(SCRUM) 1교시 답안](https://www.youtube.com/watch?v=h1qZ2HyROCA) — 주제 선정의 계기. 전사문에 발화가 없어 내용은 두 가이드로만 작성

## 관련 문서

- [[Project-Management|프로젝트 관리]]
- [[Radical-Focus|래디컬 포커스]]
- [[Execution-Mindset|실행 마인드셋]]
- [[Leadership-Inversion|리더십의 역전]]
- [[Death-Of-Agile|애자일의 죽음]]
- [[Product-Owner-Role|프로덕트 오너의 역할]]
