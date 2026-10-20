---
tags: [palantir, analytics, migration, reuse]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 분석 재사용과 이전 계약"]
---

# 분석의 재사용과 이전 계약

분석 결과를 업무 화면에 넣을 때는 데이터와 계산, 표시와 입력 상태를 나누어 재사용한다. 아래 도입 사례와 한도는 과거 공지의 역사적 기준이다. 현재 지원 범위는 전용 문서와 함께 확인한다.

## Dashboard embed는 상태 전달 인터페이스다

2022년 Quiver dashboard는 기존 template을 개선하면서 한 analysis에 여러 dashboard, 여러 입력과 view style을 제공했다. Workshop, Object View, Notepad와 Carbon의 공통 표시 단위이며 12월에는 Workshop embed의 output variable이 추가되어 parent 앱과 선택 상태를 공유할 수 있게 됐다.

읽기 전용 dashboard도 입력과 선택에 따라 화면이 달라진다. 여러 단계의 업무와 쓰기는 Workshop으로 구성하고 Quiver에 분석을 맡길 수 있다. Dataset 중심의 Contour와 Ontology 중심의 Quiver는 입력 계약도 다르다.

2023년 Quiver Vega/Vega-Lite plot은 Transform Table을 표준 입력으로 사용한다. Object Set, pivot, bar plot과 array 등을 table로 바꾼 후 join/group/derived column을 적용한다. `$A`와 `$A.column_name` 같은 global identifier는 spec과 분석 카드의 결합점이다. Default autoscale/style injection을 끄면 사용자 spec의 표시 책임도 커진다.

Transform Table의 time-series 입출력, chart series를 row로 여는 기능과 row selector는 시계열과 tabular 분석을 연결한다. 2023년 1월 multi-time-series search의 table 1,000행 한도는 해당 시점 기능의 조건이지 모든 시계열 query의 현재 한도가 아니다.

## 재사용 논리와 임시 상태

Pipeline Builder custom function은 여러 board를 묶어 반복 논리를 한 단위로 만든다. `Apply to multiple columns`와 `Aggregate multiple columns`는 선택한 column 집합에 같은 식을 적용해 schema 변화에 대한 수동 복사를 줄인다. 함수 추출과 동적 column 선택은 다른 재사용 축이다.

2022년 Pipeline Builder autosave는 사용자/branch별 임시 상태이며 version history commit이 아니다. Refresh나 재로그인 후 복원되지만 branch에 새 version을 저장하면 지워진다. 복원된 변경을 공유된 배포 상태로 혼동하지 않는다.

Code Repositories preview의 filtered/sample input은 빠른 반복에 적합하지만 전체 production input 검증과 같지 않다. External Transform은 Python SDK, arbitrary library와 외부 API를 branch/check/release 흐름으로 가져온다. Network egress, source credential과 external side effect는 별도 계약으로 남는다.

## 보고서 이전은 작성, 읽기와 export를 나눈다

2022년 11월 Reports sunset 공지는 2023년 5월 초부터 대부분 고객의 새 report 생성을 끄고 기존 report를 read-only로 바꾸는 계획을 밝혔다. 편집하지 않을 기존 report는 전환할 필요가 없다고 명시했고 Code Workbook visualization이 필요한 고객에는 예외를 뒀다.

대체는 Contour/Quiver dashboard와 Notepad로 나뉜다. Notepad live embed는 갱신되는 문서, freeze는 특정 시점 설명에 적합하다. Template에서 PDF를 만들 때 resulting Notepad를 저장하지 않는 옵션도 있으므로 PDF 생성과 Foundry 내 문서 보존은 같은 사건이 아니다. 공지의 예상 제공일을 현재 완료 사실로 바꾸지 않는다.

## Geospatial과 shared style

Foundry Map은 Ontology 객체, raster/vector layer와 시간별 위치를 결합한다. Track, 사건과 시계열을 같은 범위로 비교해 현재 위치만으로 놓치는 상황을 분석한다. GeoJSON dataset layer와 raster tile URL은 다른 source이며 외부 tile server는 ingress/egress 구성도 확인한다. Polygon/line annotation의 면적/둘레/길이와 PNG export는 정적 출력과 live 분석의 차이를 유지한다. 새 Map 도입으로 기존 Slate/Contour/Quiver map이 자동 이전되는 것은 아니었다.

Slate global stylesheet는 여러 앱/namespace의 디자인을 공유하고 local stylesheet는 특정 앱의 빠른 실험을 격리한다. 공통 CSS 변경은 여러 앱에 영향을 준다. Dependency graph의 query/function뿐 아니라 event/action/global variable도 확인해 화면 의존성을 추적한다.

## Prototype에서 production으로 넘기는 경계

2023년 4월 Builder incremental 모드는 적용 가능한 transform을 제한하고 breaking change에 replay/수정을 요구하는 경로로 소개됐다. 단순한 toggle만으로 임의의 stateful 계산이 incremental-safe해지는 것은 아니다. Manual entry notional data는 schema/앱 prototype을 앞당기지만 실제 input 교체 뒤 품질과 분포를 검증해야 한다.

Workshop에서 Map/Vertex template을 복제한 뒤 새 RID를 Action으로 객체 property에 저장하면 업무별 결과물을 Ontology와 연결할 수 있다. Resource를 저장한 사건과 그 RID를 객체에 붙인 사건은 구분한다. Resource List의 동적 favorite/recent와 정적 RID 목록도 사용자별 탐색과 고정 업무 entrypoint의 차이다.

Code Workspaces의 JupyterLab/RStudio는 Foundry의 데이터 권한과 branch 안에서 코드를 실행하는 경로로 도입됐다. 친숙한 IDE가 된다고 local notebook과 같은 자유로운 데이터 반출을 전제하지 않는다. Model Objective는 candidate의 공통 inference/metric pipeline, 평가 subset과 정량 외 review check를 묶는다. 전체 평균 성능과 업무별 subset, 전문가 검토가 배포의 서로 다른 근거다.

2023년 6월 streaming left lookup join 변경은 첫 match 하나에서 모든 match별 row로 cardinality를 바꿨다. UI 업그레이드도 downstream row 수와 집계를 바꿀 수 있으므로 변환의 출력 의미를 확인한다. Mapbox V3 지원 유지와 V4 기반 신규 기능의 구분도 기존 호환성과 신규 기능 availability가 다른 사례다.

2023년 11월 Workshop Embedded Module은 parent/child interface variable mapping으로 큰 앱을 분리했다. 12월 Free-form Analysis는 input/output Object Set과 saved public/private path로 탐색을 앱 안에 넣었다. Notepad로 card를 복사하려면 path가 저장되어야 하는 조건도 있었다. Derived Series beta는 Quiver logic tree를 resource/codex template으로 저장해 runtime에 계산하고 당시 Ontology 연결 pipeline은 수동 관리가 필요했다. 계산식 저장을 raw series 값의 materialization으로 혼동하지 않는다.

Time-series unit override는 단위 label과 이후 conversion의 기준을 바꿀 수 있고 conversion은 값을 변환한다. Contour의 board collapse는 visualization만 숨기며 filter/transform은 유지한다. Notepad conditional section은 template input에 따른 표시이며 data permission이 아니다. Slate ES6 strict mode, async 함수와 cross-window message 지원도 기존 script의 실행 순서/변수 전제를 재검토할 변경이다.

2024년 Vega-Lite selection은 `quiverDefaultClick`/`quiverDefaultBrush` parameter로 downstream Transform Table을 만든다. Point는 field/value row, interval은 continuous bounds 또는 discrete value array다. 표시의 선택과 data filter 연결을 명시한다. Contour visualization timezone도 표시 기준이며 기존 analysis는 수동 설정, 신규 analysis는 local 기본값을 안내했다.

Notepad `Lock data` snapshot은 2024년 2월 모든 upstream resource에 marking을 요구하고 Restricted View/판별 불가 access-control resource를 제외하도록 강화됐다. Frozen output이 원본의 복잡한 권한을 그대로 재현한다고 가정하지 않는다. Batched Function section은 Object Set을 한 번 받아 객체별 결과를 내며 generator 내부의 반복 호출 비용을 줄인다.

Workshop routing은 현재 page와 external ID variable을 URL에 남기며 항상 포함/현재 visible component에서 사용될 때 포함을 고른다. URL 공유가 변수 권한이나 민감성 검토를 대신하지 않는다. Loop layout은 object마다 embedded module을 생성하고 mobile embed는 mobile module끼리의 조건을 따른다. Hidden/disabled tab은 backend 접근권이 아니다. Slate Health Check도 기본 상태에서 조건이 충족되지 않아 실행되지 않은 query까지 시험한 결과는 아니다.

2024년 module interface는 external ID variable을 parent mapping/URL 초기화의 API로 정리하고 state saving/routing을 독립적으로 켜도록 했다. Object View 신규 tab은 Workshop으로 만들되 legacy tab은 유지했다. Slate Pages는 tab container와 달리 page별 query/function/widget을 따로 로드하며 local/shared variable scope를 나눈다. Shared state로 바꾸면 페이지 분리는 유지해도 논리 결합이 남는다.

Code Workspace dataset alias는 branch pin과 같은 dataset의 다중 import로 기준 데이터를 고정할 수 있다. Model alias는 RID를 가리키는 식별자이며 notebook adapter 작성과 publish를 거친다. Notebook 모델 publish 성공은 production release와 inference 품질을 입증하지 않는다. Marketplace Quiver packaging은 validation한 published dashboard version을 대상으로 했고 time-series 지원은 초기 object card 지원 후 확대됐다.

Materialization join autocomplete는 양쪽이 직접 변환한 Object Set이고 link가 있을 때 primary/foreign key를 추론했다. 이미 materialization으로 변환한 입력은 인식하지 않는 조건이 있어 제안 부재를 관계 부재로 단정하지 않는다. Workshop virtualized Object List의 표시 성능도 전체 객체 계산과 정렬 비용을 없애는 것은 아니다.

2024년 8월 struct variable은 함수 호출을 하나로 묶지만 unsupported field는 초기화 때 생략되고 당시 nested struct/struct array도 제외됐다. Widget이 struct 전체를 받지 못하면 field를 추출해야 한다. 함수 응답 성공과 모든 field의 UI 노출을 따로 확인한다. 2024년 9월 발표 기준 module translation은 번역한 지원 string을 사용자 계정 언어로 보여 주는 방식이었고 데이터 값 전체의 자동 번역이 아니다. 2026-10-21 확인한 공식 문서는 브라우저 locale 기준으로 설명한다([[Palantir-Workshop-Design-Mobile-and-Localization|Workshop 현지화]]). Scheduling Calendar 초기 drag/drop 표시 기능과 Action/event/Scenario roadmap도 구분한다.

Derived Series 2024년 10월 GA는 beta의 수동 pipeline 연결을 automatic Ontology save로 확장했다. 계산은 여전히 요청 때 수행하는 logic이며 materialized value 저장과 다르다. R Markdown report도 최신 file 반영과 historical version link를 구분한다. 9월 말 이후 새 Code Workspace는 backing repository 중심으로 관리했지만 filesystem의 두 resource가 즉시 하나로 삭제된 것은 아니었다.

2024년 12월 iframe custom widget은 선언한 field/event ID로 Workshop variable을 읽고 쓰며 event를 실행했다. Loaded/loading/reloading/failed 상태도 전달한다. 외부 URL을 화면에 보이는 것과 양방향 앱 상태에 연결하는 것을 나누어 설계한다. PDF text/area annotation도 기존 annotation layer 표시와 Action을 통한 새 object 생성을 구분한다.

2025년 Quiver manual table은 최대 5,000행과 string/number/Boolean/time/time-series를 입력해 parameter나 작은 보조 데이터를 만들었다. 이를 대용량 ingest의 기본 경로로 확대하지 않는다. Workshop Performance Profiler는 현재 화면에 영향을 주는 widget/variable부터 계산하고 이후 상호작용에 따른 load/reload를 기록한다. 초기 profile에 없다고 미사용 변수가 아닌 이유다. Notepad의 object card/property 편집도 미리 구성한 inline Action을 거쳐 Ontology에 쓴다.

Time Series Catalog는 seriesId/time/value를 mapping한 sync, 이를 참조하는 object property와 계산 logic인 derived series를 구분해 탐색한다. 2025년 single derived series는 한 root object에 input을 제한하는 template과 달리 여러 객체를 조합하는 단일 logic이다. Catalog editor는 지원되는 operation만 노출해 임의 Quiver graph를 만들고 나중에 저장 실패하는 경로를 줄인다. Walkthrough는 tutorial/관련 resource의 Viewer를 요구하고 진행 상태/metrics를 남기지만 과정 완료는 실무 숙련의 직접 증거가 아니다.

2025년 PDF Viewer의 active page variable은 현재 페이지를 내보내거나 외부에서 이동시키는 양방향 상태다. Selection page/coordinate와 existing annotation hover object도 각각 다른 입력으로 Action/event에 전달한다. Coordinate string만 보존하고 문서/media version을 놓치면 같은 위치가 같은 근거를 뜻하지 않을 수 있다. 이는 문서 workflow의 재현성 설계 해석이다.

2025년 Map widget 개명은 새 tile 기반 widget과 Legacy를 구분했다. 새 widget은 millions-scale 객체와 complex geometry, zoom별 layer/TSP styling을 지향했고 Legacy는 mobile/non-WebGL에 남았으며 정확한 feature parity를 보장하지 않았다. 이름 변경을 자동 migration으로 보지 않는다. Module saved color는 참조하는 모든 widget/layout에 변경이 전파되며 동일 hex의 unsaved color는 별개다.

Builder chart는 transform path의 bar/histogram으로 집계를 비교하며 join/union/split 뒤에는 transform node를 더해야 했다. Proposal statistics의 null/unique/string/numeric 비교는 분포 변화의 단서이며 unit test의 기대 결과와 동일하지 않다. Media transform/output은 PDF/image 변환을 직접 graph에 넣지만 preview와 최종 media schema를 각각 확인한다.

2025년 7월 loop layout은 struct array를 지원해 객체마다 property를 따로 읽는 대신 function의 compound 결과를 표시할 수 있게 됐다. 2024년 struct array 미지원 설명은 도입 당시 제한이다. Data Freshness widget의 last updated는 object/datasource의 마지막 indexing 시각이며 event timestamp와 다르다. Markdown annotation의 표시/선택/새 Action 생성도 같은 data mutation으로 취급하지 않는다.

Quiver time-series workspace는 series의 axis/unit/root/interpolation과 event overlay를 여러 canvas에 구성하고 RID로 Workshop에 불러온다. 2026년 3월 widget는 허용 series/plot/event/save location을 좁힐 수 있었지만 Quiver로 열어 수정한 내용이 widget에 다시 반영되지 않는 조건이었다. 같은 analysis를 열었다는 이유로 양방향 동기화를 기대하지 않는다.

Quiver graph의 hide/collapse/group와 canvas 배치는 계산 삭제와 다르다. 2026년 4월 개편은 graph에서 새 node를 canvas에 자동 추가하지 않았고 canvas card 삭제 때 canvas에서만 제거하거나 분석 전체에서 삭제하는 선택을 나눴다. Display preview와 saved analysis 구조의 변경 범위를 구분한다.

Carbon의 Insight exploration과 modern object search는 2026년 9월 workspace별 독립 opt-in이었다. Insight는 기존 Object Explorer 탐색을 대체하고 search toggle은 homepage와 results를 함께 바꾼다. 기존 tab은 refresh/reopen해야 하고 신규 workspace 기본화 계획과 기존 workspace 자동 migration은 다르다.

## 출처

- [Palantir, August 2022 announcements](https://www.palantir.com/docs/foundry/announcements/2022-08)
- [Palantir, September 2022 announcements](https://www.palantir.com/docs/foundry/announcements/2022-09)
- [Palantir, November 2022 announcements](https://www.palantir.com/docs/foundry/announcements/2022-11)
- [Palantir, December 2022 announcements](https://www.palantir.com/docs/foundry/announcements/2022-12)
- [Palantir, January 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-01)
- [Palantir, February 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-02)
- [Palantir, March 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-03)
- [Palantir, April 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-04)
- [Palantir, May 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-05)
- [Palantir, June 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-06)
- [Palantir, October 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-10)
- [Palantir, November 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-11)
- [Palantir, December 2023 announcements](https://www.palantir.com/docs/foundry/announcements/2023-12)
- [Palantir, January 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-01)
- [Palantir, February 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-02)
- [Palantir, March 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-03)
- [Palantir, April 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-04)
- [Palantir, May 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-05)
- [Palantir, June 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-06)
- [Palantir, July 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-07)
- [Palantir, August 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-08)
- [Palantir, September 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-09)
- [Palantir, October 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-10)
- [Palantir, November 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-11)
- [Palantir, December 2024 announcements](https://www.palantir.com/docs/foundry/announcements/2024-12)
- [Palantir, January 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-01)
- [Palantir, February 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-02)
- [Palantir, March 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-03)
- [Palantir, April 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-04)
- [Palantir, May 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-05)
- [Palantir, July 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-07)

- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)
- [Palantir, April 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-04)
- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)
- [Palantir, Workshop Translations](https://www.palantir.com/docs/foundry/workshop/translations) — 2026-10-21 현행 표시 언어 기준만 확인

## 관련 문서

- [[Palantir-Analysis-and-Output-Semantics|분석과 output]]
- [[Palantir-Network-Egress-and-Private-Connectivity|외부 연결의 권한]]
- [[Palantir-Automation-and-Purpose-Boundaries|자동화와 목적별 접근]]
