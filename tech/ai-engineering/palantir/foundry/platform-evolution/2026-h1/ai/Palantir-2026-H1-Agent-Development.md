---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 AI FDE, Pilot와 Analyst의 실행 경계

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## 생성과 실행을 분리하는 agent 환경

- 3월 12일 AI FDE GA는 AIP 활성화가 필요했고 Ontology 편집에는 Branching을 권했다. Mode는 현재 과제의 문서/tool을 제한하고 skill은 mode를 가로지르는 세부 기능이다. context와 tool을 사용자가 추가할 수 있다.
- 3월 mode 전환, clarification, skill 관리와 Notepad 읽기/쓰기, 4월 source terminal 진단과 CBAC object/media/permission dataset picker가 추가됐다. Foundry worker의 dig/curl/netcat/openssl 결과는 해당 source egress 경로의 진단이다.
- 4월 Main quick approval 기본값은 currentBranch에서 All branches + Current project로 바뀌었다. 4월 29일 일반 Ontology tool은 기본 auto-approve, **delete tool은 기본 사용자 승인**이라고 각각 적었다. execute_action은 branch별 approval을 사용한다. 이 설정들을 하나의 승인 기본값으로 합치지 않는다.
- 4월 Evals 통합은 suite 생성/실행/결과 분석/수정/재실행을 agent 안에서 연결했다. 19개 built-in 및 Function evaluator, manual primitive/array/struct/model/object/object set test를 지원했지만 object set-backed test, multi-target suite, run dataset와 Marketplace evaluator는 미지원이었다. suite를 바꿔 통과시킬 수 있으므로 평가 목적이 유지됐는지 검토한다.
- 4월 Model Studio/pro-code 모델 생성/훈련/실험/Function 배포가 추가됐다. 5월 Time Series Catalog sync 관리는 입력 dataset이 **master**여야 하며 branched dataset은 미지원이었다.

## Pilot와 AIP Analyst

3월 9일 주 beta 예정으로 소개된 Pilot는 AIP 활성화가 필요했다. 격리 container에서 Ontology builder→Designer→App builder의 작업을 나누고 React OSDK 앱을 생성했다. seed data는 local datastore에 있어 production data와 다르며 배포는 Global Branch promotion, Developer Console, CI와 release tag를 거친다. 공지의 production-ready 표현은 생성 코드 검증을 대체하지 않는다.

Analyst의 3월 31일 description은 GA라고 적지만 장문은 **4월 13일 주 GA**를 명시한다. Ontology 검색/link/semantic search/group-by, SQL, Vega/Map, Action/Function과 수동 첨부 파일을 사용하고 중간 결과와 citation/analysis graph를 확인한다.

- Workshop Analyst widget는 tab/section 전환에도 대화를 보존하고 reset할 수 있다. message send Action은 실제 전송 이벤트에 연결된다.
- 4월 suggested prompt는 입력창을 채우며 곧바로 실행하는 기능으로 설명하지 않았다.
- 5월 input 제목/설명, object set output의 Function/import/single lookup 포함, reset key와 object-type filter, default save/load가 추가됐다.
- 6월 Function context에 특정 version을 선택할 수 있게 됐다. 대화에서 발견한 자료와 실제 실행 version을 함께 고정한다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [March 31, 2026, AIP Analyst is now generally available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#37ec7b0c-b5f0-4f26-b967-45945d0d2582)
- [March 12, 2026, AI FDE (Forward Deployed Engineer) is now generally available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#6bf323db-d81f-47bb-a180-698bac6f0626)
- [March 5, 2026, Introducing Pilot, Foundry's AI-powered tool for building React OSDK applications — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#52564889-c50b-4c97-babb-c2f17aad741c)
- [April 14, 2026, Evaluate and ship directly with AIP Evals in AI FDE — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#2d082c29-17bf-4a47-8061-ffb1d532e1e1)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
