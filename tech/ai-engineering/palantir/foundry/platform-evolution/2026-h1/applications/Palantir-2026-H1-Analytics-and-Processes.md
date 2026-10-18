---
tags: [palantir, foundry, release-history, "2026"]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 2026 상반기 분석 graph와 process metric의 해석

2026년 2~6월 공식 출시 기록을 10월 16일 스냅샷에서 대조했다. 아래 지원/제약은 발표 당시 범위이며 현재 정본, 설치 버전과 enrollment 설정을 별도로 확인한다.

## Insight와 Quiver의 분석 단위

3월 30일 주 Insight GA는 workbook의 Filter/Link/Transform 경로, 단계별 count와 on/off, aggregation/SQL와 지도 선택을 제공했다. SQL join은 Ontology link를 반드시 필요로 하지 않았고 Action writeback, published object set와 공유 권한을 구분했다.

4월 Quiver graph GA는 compact node와 bottom/split/pinned preview, color group/collapse/hide/filter와 bulk action을 도입했다. graph에 추가한 node가 canvas에 자동 배치되지 않고 canvas에서만 제거하는 것과 analysis 전체 삭제가 다르다.

- 4월 dashboard duplicate는 report/cell/section/text를 복사해도 **같은 card를 참조**한다. 5월 card bulk duplicate는 내부 연결을 새 복사본으로 remap하고 미지원 card를 확인한다.
- 6월 unused card 삭제는 canvas 미배치, canvas dependency 없음과 다른 dashboard/function/global entity 참조 없음이 모두 조건이다. 확인 후 영구 삭제한다.
- 3월 Ontology SQL card는 object set 분석, Materialization SQL은 Spark SQL dataset fallback 경로다. date/number/string/Boolean card parameter를 쓸 수 있다.
- 2월 Pivot transform, 3월 scatter regression coefficient array, 4~5월 code Function object/categorical/value/time-series card와 직접 object 선택이 추가됐다.
- 5월 Parameterize all data는 기존 eligible time series 전체, Parameterize added는 새 data에만 적용된다.
- 6월 Marketplace lint는 analysis 전체 dashboard를 검사하지만 개별 opt-out을 세션 간 유지했다. 지원 card와 Iceberg sync input도 확대됐다.
- Insight/Object Explorer keyword는 6월 AND/OR/NOT, 괄호/phrase/leading minus/wildcard와 nested condition group을 지원했다. 4월 struct filter는 field의 실제 type을 반영하도록 수정됐다.

## Time series와 process

3월 dedicated time-series workspace는 Quiver/object-set path와 다른 시작 환경이다. plot/operation/event/canvas/unit axis와 RID 저장을 제공하고 Workshop widget은 입력 series, 허용 연산, view range/save/load를 제한한다. widget에서 Quiver로 연 뒤의 변경은 **widget에 역반영하지 않는다**.

5월 Machinery mining은 action/automation, graph 전체 교체 또는 timestamp/last mining 이후 변경을 다뤘다. 6월 Deviations slider는 보이는 process object에 맞춰 **metric을 다시 계산**하지만 Graph complexity slider는 덜 흔한 node/edge를 숨기면서 **metric을 다시 계산하지 않는다**. 두 slider를 단순 시각 필터 하나로 합치면 분모를 잘못 읽게 된다.

## 출처

- [2026 release notes — Palantir](https://www.palantir.com/docs/foundry/announcements/release-notes)
- [March 3, 2026, Perform time series analysis with a dedicated workspace in Quiver — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#2598ae2d-3ffb-4c69-8878-7b6244de1031)
- [March 27, 2026, Analyze and investigate your ontology with Insight  — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#9fa2f8e1-3528-4e9f-940e-9c451421e663)
- [April 14, 2026, Quiver's redesigned graph mode is now generally available — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#8b6b13a3-dfb7-42a5-9a62-5b3e7249649b)
- [June 24, 2026, Delete unused cards in Quiver — Palantir release notes](https://www.palantir.com/docs/foundry/announcements/release-notes#d545d6c647edfef69ae04ab79ef348a8fef00d74cecbdadf25ac19d533816d65)

## 관련 문서

- [[Palantir-2026-H1-Platform-Evolution]]
