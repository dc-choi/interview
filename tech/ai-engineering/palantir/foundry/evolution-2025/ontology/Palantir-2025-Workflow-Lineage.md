---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Workflow Builder에서 Workflow Lineage로

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Dependency를 운영 변경에 연결하기

- 1월 Workshop Function 일괄 upgrade는 all-or-nothing과 partial을 구분했다. 둘 다 breaking change 없는 upgrade를 대상으로 하며 특정 version을 지정하지 않으면 latest를 사용했다.
- 3월 일괄 publish는 자동 latest/current published 모듈을 구분하고 미발행 최신 버전만 선택했다. Function upgrade 후 Continue to publish는 consumer 설정 수정과 실제 publish 사이 단계를 드러냈다.
- 3월 object/action bulk delete는 관련 link type 수까지 확인하는 proposal을 만들고 Ontology Manager에서 merge했다. 화면에서 node를 지우는 일과 바로 데이터 object를 삭제하는 일은 다르다.
- 3월 submission criteria 일괄 갱신은 source Action의 criteria를 선택한 Action에 복사하고 제안 변경을 검토했다. 5월 legacy Ontology role 일괄 grant는 즉시 적용되며 자동 Undo가 없었다.
- 4월 object property 사용 count/list, value-specific Action/Function 의존과 lightning toggle, property/API name 검색 등이 추가됐다. self-referential FK link 누락 counting도 수정됐다.
- 6월 recent/most-viewed 30일 landing, 7월 현재 Ontology 선택 기억과 empty graph warning, 10월 dependency/function path/upgrade error와 color multi-select가 확대됐다.

## Usage, 건강 상태와 권한의 차이

3월 model usage 시각화는 attempted/successful/rate-limited, request/token과 enrollment/graph 범위를 구분했다. Logic node는 당시 debugger 호출만 포함했다. 9월 Health tab은 checks/monitors를 모았고 10월에는 property dependency와 Function usage 추적이 개선됐다.

11월 inaccessible node 정리와 criteria 직접 변경 등 개별 동작이 바뀌었다. 예전 proposal 기반 설명을 모든 후속 버전의 submission criteria 편집에 고정하지 않는다. 권한 없는 사용자의 Request access와 실제 workflow resource 권한을 구분한다.

## 이름 변경 이후의 범위

12월 2일 Workflow Lineage GA는 Workflow Builder의 이름 변경과 함께 Function/criteria 일괄 변경, 삭제, publish, property usage, LLM usage, run와 packaging 정보를 묶었다. Notepad/Machinery node, last-modified color, input/function 탐색 등이 같은 운영 그래프에 들어왔다.

그래프의 연결은 영향 후보를 찾는 증거다. 실제 consumer 버전, published 상태, resource 권한과 실행 결과를 확인해야 변경 완료를 판단할 수 있다. color mode, count와 layout 개선은 이 검토를 돕지만 실행/배포의 transaction을 의미하지 않는다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [December 2, 2025, Use Workflow Lineage to visualize and manage workflows — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#fdc021b2-085c-4dcf-bc27-6d7e9b1e1909)
- [April 29, 2025, Try the New Marketplace products sidebar in Workflow Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#44532dfc-95b4-4c69-928b-c2f3b6e51713)
- [March 6, 2025, Review LLM usage metrics for your workflow in Workflow Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#eac9a2ea-85de-498b-92cb-cd3eb3259964)
- [January 21, 2025, Bulk upgrade function versions across Workshop applications in Workflow Builder — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#dd5b9bb1-695e-42bc-bce1-878424644975)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
