---
tags: [palantir, foundry, release-history, "2025"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2025 Notepad 문서와 Slate UI 상태의 경계

2025년 공식 release note의 변경 이력을 정리한다. 2026년 현재 지원/요금/수명주기 보장이 아니며, 실제 적용 전 해당 버전의 정본 문서와 enrollment 설정을 확인한다.

## Notepad의 동적 내용과 Ontology write

- 1월 generator copy/paste는 최대 nesting을 검사하고 template→document에서 section을 flatten, generated row를 일반 row로 변환했다. 유효하지 않은 generator ID를 참조하면 slot/sort/linked set 설정을 지웠다.
- 3월 top-level section 안의 nested section/table row generator는 일반 object set 입력이나 상위 object의 1차 linked object를 사용할 수 있게 됐다.
- 2월 Ontology Action은 inline edit를 설정한 property와 object card에서 실행한다. 4월 permission/Action log/edit disabled safeguard가 확대됐다. 문서 텍스트 편집과 Ontology mutation은 별도다.
- 2월 Marketplace Function widget template은 Function도 함께 package하고 한 Function의 한 version만 포함할 수 있었다.
- 4월 short table page break 방지는 한 page보다 짧은 table에만 적용됐다. row 내부 page break 제어, horizontal rule와 anchor scroll도 확대됐다.
- Markdown 렌더링은 미지원 형식을 건너뛰며 혼합 nested list를 한 유형으로 단순화하는 조건이 있었다. HTML/Markdown 원본과 최종 문서의 의미 일치를 확인한다.
- 1월 bulk widget lock/unlock, 8월 Vertex embed, 10월 app pairing와 11월 Workflow Lineage node 지원은 문서를 operational UI와 연결했다.

## Slate가 보존하는 상태

- 2월 URL popup과 iframe reload Action이 추가됐다. 2월 onChildWindowClosed는 redirectToUrl로 연 창에 **id가 있을 때만** 실행한다.
- 3월 editor pop-out은 폐지됐고 이전 URL은 error page로 갔다. sidebar scroll/new component focus와 unsaved warning이 개선됐다.
- 3월 application/page context 전환 시 Events/Actions selection, editor panel과 Dataset Sync 상태를 reset했다. non-home page에서 app switching blank screen도 수정됐다.
- 7월 Function editor에 JSON/table/code/docs/library와 SDK dependency 자동 import/remove, generation log가 추가됐다.
- 9월 복잡한 key bracket hint, 10월 query JSON validation와 설정/interaction 분리, editor dropdown/긴 상태 scroll/self-reference delete가 개선됐다.
- 10월 table column reorder는 edit/view와 saved widget state를 함께 반영하고 preview 크기를 유지했다. 현재 UI에 보이는 순서가 영구 state와 같은지 확인한다.

## Carbon과 theme

6월 9일 Carbon/Workshop theme override에 관한 두 기록은 우선순위 방향이 상충한다. 단일 보편 방향으로 합치지 않고 기존 설정을 다시 적용해야 했다는 변경 문맥을 보존한다. IDE system theme 자동 적용과 Carbon workspace context link도 각각 다른 설정 계층이다.

## 출처

- [2025 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes/2025)
- [February 13, 2025, Synchronize object property edits with support for Ontology Actions in Notepad — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#af19e38e-574e-4633-8696-93a0359e6261)
- [October 29, 2025, App pairing support in Notepad — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#585e6cb1-bfae-4355-b5d2-37295585f8a7)
- [October 29, 2025, Column drag reordering in table widgets — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#2536c74ae7459dbb177b897ce998975bbe2031fff03b4c49b3164c0b0bf06786)
- [October 22, 2025, Notepad widget for creating documents from string variables — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2025#f3b6e969232743f20a2dbd0117def77a5942dc8315a2645f612e06202094cc36)

## 관련 문서

- [[Palantir-2025-Platform-Evolution]]
- [[Palantir-Notepad]]
