---
tags: [palantir, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 애플리케이션 상태와 분석 의미

아래는 2026년 하반기 릴리스 당시 변경을 합성한 기록이다. 실제 enrollment 적용과 현재 지원 범위는 해당 기능 문서로 확인한다.

## Interface 기반 분석

10월 Workshop interface 지원은 GA/default enabled로 발표됐다. Interface object set/공유 property/link를 사용하면 구현 type이 추가돼도 같은 workflow에 포함할 수 있다. 다만 모든 widget이 지원하는 것은 아니며 미지원 widget은 구현 object type 기준 property 선택으로 처리한다. Map/Pivot/Gantt 확장은 당시 예정으로 안내됐다.

Insight도 interface filter/link/cast/aggregation/table/chart를 지원하고 Workshop interface property suggestion과 잘못된 stale-link warning이 개선됐다. Interface 지원 여부와 실제 데이터 접근 정책을 별도로 확인한다.

## 유지되는 상태와 버려지는 변경

AIP Analyst의 collapsed Never unmount section은 제안 prompt를 숨기고 keyboard 접근을 막으면서 chat state를 보존하도록 수정됐다. Saved analysis drag/drop은 기존 import/중복 방지 로직을 재사용한다.

Slate는 다른 component/folder 선택 시 unsaved edit를 경고한다. Cancel은 현재 선택/편집을 유지하고 확인은 버린다. Search state의 유지/초기화 조건도 구분됐다. Sidebar의 natural numeric sort는 _1/_2/_10 순서이며 widget list 정렬까지 바꾸지는 않는다.

Vertex style은 즉시 적용하고 undo/redo를 제공한다. 닫을 때 미완성 값은 버리고 마지막 valid style을 유지한다. Self-link는 loop로 표시하고 같은 node의 두 port도 연결할 수 있다. URL control은 유효 HTTP/HTTPS 새 탭을 지원하며 Edit mode에서는 Ctrl/Cmd-click을 사용한다.

## 표시와 성능을 구분한다

Quiver time-series drag/pan/Shift, Y lock과 scroll zoom은 analysis 저장값/parameter/personal default로 설정하며 기존 저장 없는 analysis는 이전 동작을 유지한다. Notepad alias 표시, Workshop layout search/파생 변수 생성, Compass New menu의 app-name 우선 검색은 데이터 의미 변경과 구분한다.

Workflow Lineage는 최대20 선택 node를 새 탭으로 열 수 있다. Dedicated web worker는 custom widget의 main-thread blocking을 줄이는 도구이지 동시 실행의 데이터 race나 권한 검사를 해결하지 않는다.

## 9월 상태 보존과 시각화

Vulcan은 9월7일 주 beta에서 28일 주 GA로 이동했다. GLB/GLTF/STL/OBJ/PLY/3MF mesh,DXF 도면,LAS/LAZ point cloud를 Ontology와 연결하며 저장한 annotation/measurement/section plane도 object가 된다. Workshop widget의 camera/선택/측정 양방향 variable 연결을 검토한다. 화면상의 임시 주석과 저장된 업무 데이터는 구분한다.

Carbon의 Insight exploration과 modern search는 독립적인 workspace opt-in이다. 새 search bar와 result page는 함께 켜지지만 Insight 선택과 묶이지 않는다. 기존 탭은 refresh가 필요하며 신규 workspace default 전환 계획을 기존 workspace 자동 변경으로 읽지 않는다.

Workshop stale Action default 경고는 무효 mapping만 지우고 valid 설정을 유지한다. Prefilled parameter current-value preview는 environment/widget override에는 적용하지 않는다. Vertex subgraph는 unrelated edit/reload 때 보존하지만 graph를 명시적으로 바꾸면 reset한다. Interface default-filter property 설정과 action hover의 Ontology 이름/RID는 타입과 대상 식별을 돕는다.

Variable output type 변경은 현재 정의와 호환되는 타입만 허용하고 참조 중이면 차단한다. Static 값은 reset하고 function 선택은 지우며 object-set 변수는 변경 대상이 아니다. Vega struct 입력, sidebar resize,Quiver title 폭/dataset 명칭과 직접 dataset 분석,Slate dependency table의 label 기반 검색/empty sort 개선은 각각 표시와 상태 계약으로 구분한다.

전문 certification은 9월 Foundation/Associate/Specialist 구조로 바뀌고 Specialist는 실제 환경 live exam, Associate는 timed 객관식과2년 유효로 안내됐다. 자격증이나 자료 보유는 실제 production 숙련의 증거와 구분한다.

## 8월 SQL과 표시된 범위

Workshop SQL query variable은 module의 object/interface set과 parameter를 @alias로 연결하고 입력 변경 때 재계산한다. 단일 값은1행1열,array는1열과 array cell flatten,struct는 반환 열로 field를 도출한다. 같은 로직을 여러 앱에 쓰려면 SQL function,SQL SELECT 밖의 기능은 function-backed variable을 고려한다. 당시 many-to-many join table은 예정이었다.

Keyword filter의 Regex default는 모든 관련 object type의 property index가 있어야 한다. 일부 index만 있으면 비활성화하고 저장 후 index가 빠져도 경고한다. Pill timestamp filter는 범위의 시작/끝마다 timezone을 달리 정할 수 있으며 date/non-pill layout은 영향이 없다.

Comments의 Users tagged in comment는 mention한 user ID만 중복 없이 반환하고 Users to notify는 전체 subscriber를 포함한다. Tagged-only notification은 새 값 mapping과 default notification 해제를 함께 구성한다. Mention이 없으면 빈 목록이다.

AIP Analyst의 media read card는 요청 범위 대신 실제 반환된 page를 표시하고 truncation 경고 뒤 남은 page를 다시 읽게 한다. 겉으로 성공한 tool 응답도 전체 자료 읽기 증거는 아니다. Auto-approval checkbox도 저장된 선호와 실제 표시를 동기화하도록 수정됐다.

Workshop discard confirmation,event alias 검색,iframe object-set 전달 속도와 Slate iframe reload 후 function 진행을 개선했다. Quiver의 Dataset 명칭 변경은 Ontology materialization 개념까지 개명한 것이 아니다. Envelope-secured Notepad image는 CBAC stack 경계로 안내됐다.

## 7월 session, lifecycle과 UI 계약

Insight는 branch data/Action을 쓰는 session을 지원하지만 workbook 자체는 branchable resource가 아니다. Branch에서는 workbook/layout 저장,object-set publish/list,Excel export와 nonbranch app 열기가 제한된다. Autosave가 진행 상태를 보존하는 것과 publish/save 가능성을 구분한다.

Workshop mount/unmount는 독립 설정이다. Eager mount/Never unmount는 비싼 초기화와 iframe local state를 보존하지만 초기 load/browser memory를 늘린다. Off-screen unmount는 메모리를 돌려받는 대신 state reset을 고려한다. Performance Profiler로 측정하고 필요한 widget에 적용한다.

Widget event는 설정 순서로 실행하므로 drag reorder는 외관 변경만이 아니다. Audio segment event는 dialog 없이 즉시 실행하고 mutable output은 내용/시작끝 ms/speaker를 전달한다. Relative time picker는 최초 load 때 absolute로 해석하며 URL-bound 값이 우선한다.

Multi-select Deselect all은 현재 filter에 보이는 항목만 지우고 숨은 선택은 유지한다. Custom Excel column header는 opt-in이며 기본 API name과 구분한다. Repeated URL token은 모든 occurrence를 치환하도록 수정됐다.

Slate partial rename은 Handlebars 참조를 함께 바꾸며 Contour numeric bulk format,Quiver dark panel,Notepad image shortcut,Object View toggle,Dynamic Scheduling unscheduled-puck view는 표시/탐색 방식이다. Proximity text search는 word-gap과 순서/부정을 별도로 정한다. SQL sidebar/branch autocomplete는 query/branch 검토의 보조다.

Workshop autosave failure indicator가 보여 주는 실패와 임시 UI state를 구분한다. Success notification 하나만으로 저장/배포 완료를 단정하지 않는다.

## 출처

- [Palantir Foundry, Release notes 2026](https://www.palantir.com/docs/foundry/announcements/release-notes/2026/)

## 관련 문서

- [[Palantir-2026-H2-Platform-Evolution]]
