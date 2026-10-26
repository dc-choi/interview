---
tags: [palantir, foundry, releases]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Foundry 2022 변경에서 읽는 운영 경계

이 문서는 2022년 공식 release 기록의 변경 의미를 정리한다. 과거 도입/수정 시점이며 현재 기능의 전체 지원표가 아니다. Release 날짜, 서비스 version, 배포 enrollment와 최신 제품 설명을 함께 확인해야 한다.

## 저장, 게시와 권한을 분리하기

Pipeline Builder autosave는 사용자와 branch에 종속된 작업 복구이며 version history commit이 아니다. 명시적 save 뒤 개인 autosave를 비운다. Slate는 editor가 과거 모든 version을 열 수 있지만 viewer는 published/tagged version만 접근하는 계약을 설명한다. 미게시 banner와 published 이동 링크는 어느 버전을 보고 있는지 드러낸다.

프로젝트 pipeline이 개인 Your files dataset에 의존하는 것을 막는 변경은 계정 비활성화로 운영 pipeline이 끊기는 문제를 줄인다. Namespace default role은 새 project의 시작값이고 project owner가 override할 수 있다. Code Workbook output folder 이동에서는 role mapping을 확인한다. Third-party app 관리, organization 생성과 Maintenance Operator의 Technical Compliance Officer 전환은 별도 관리 권한 변화다.

Notepad PDF 생성과 document 저장은 다른 동작이다. Template PDF를 만들면서 Compass document를 남기지 않는 옵션이 추가됐다. Media import checkpoint는 내용 반출/반입 확인 경로이며 PDF가 생성됐다는 사실로 승인이나 저장 완료를 추정하지 않는다. Full-text search도 View 권한이 있는 문서에 한정한다.

부분 검증(2026-10-21): 2022 announcements release notes의 2026-10-17 스냅샷에서 이 단락의 항목과 분석의 값과 화면 상태 절의 Workshop 정렬 항목을 대조했다. 문서의 나머지 서술은 다시 대조하지 않았으므로 기존 `verified_at`은 유지한다. Action submission criteria의 조건에 Organizations나 사용자 email 같은 추가 Multipass 속성을, 해당 속성이 있을 때 쓸 수 있게 됐다(2022-10-31). Object type 권한 요약이 사용자에게 자신의 object 권한 정보를 보여 주게 됐다(2022-10-13). 새 Login checkpoint를 만들 때 사용자가 같은 checkpoint를 마지막으로 본 뒤 지정한 시간이 지나야 다시 표시하도록 빈도를 정할 수 있게 됐다(2022-11-14). 빈도를 정하면 지정한 시간이 지나기 전의 로그인에는 checkpoint가 다시 표시되지 않는다. 현행 문서는 사용자가 checkpoint를 제출할 때 record가 만들어진다고 설명하므로, 접속마다 checkpoint record가 필요한 통제인지 먼저 확인한다(적용 제안). 현행 빈도와 record 동작은 [[Palantir-Checkpoint-Scope-and-Evidence]]에서 다룬다. Slate의 code sandbox widget은 특권 권한 없이 모든 사용자가 쓸 수 있게 됐다(2022-11-21). Code Workbook에서 template, visualization과 dataset을 내보내는 절차는 Foundry 표준 절차를 따르도록 수정됐는데(2022-07-11, 제목은 Fix Unsafe Downloads in Code Workbooks), description은 무엇이 unsafe였는지와 표준 절차의 내용을 밝히지 않으므로 특정 반출 통제나 checkpoint가 적용됐다고 추정하지 않는다.

## 분석의 값과 화면 상태

Contour의 partition/projection 표시, branch별 parameter source 선택과 path dependency 삭제 방지는 계산 입력을 명확히 한다. Downstream path가 있으면 삭제를 막고 materialized output만 있으면 업데이트 중단을 경고한다. Non-deterministic window function 경고는 UI 개선이어도 결과 재현성의 문제다. 당시 문구 NTIL은 함수 이름 오기로 보이며 현재 NTILE 문법과 대조해야 한다.

Map/heatmap/embedded row count, null coloring과 property-card link filter 수정은 같은 화면이 올바른 subset을 표시하는지 다시 확인하게 한다. Default open view, dashboard tab, text/table 편집, scroll/resize와 preview 오류 수정은 계산 권한을 바꾸는 기능으로 보지 않는다.

Workshop object table에서 searchable render hint가 꺼진 numeric property는 정렬할 수 없게 고쳐졌다(2022-10-10, 제목은 Sorting requires the field to be indexed for search). 현행 render hint 문서는 render hint가 property 사용 정보를 Object Storage v1(Phonograph)과 플랫폼의 사용자 애플리케이션에 전달한다고 설명하고 Object Storage v2는 따로 다루지 않으며, numeric과 date property는 항상 정렬된다(always sortable)고 적으면서 Sortable은 Searchable과 함께 선택해야 하고, 재색인 성능을 높이려면 앱에서 검색이나 정렬에 쓰지 않을 property의 Searchable을 끄라고 안내한다. Object Storage v1 object type의 같은 화면에서 numeric property를 정렬할 수 없으면 데이터보다 Searchable 설정을 먼저 확인하고, string property를 정렬할 수 없으면 Searchable과 Sortable을 함께 확인한다(적용 제안). Object Storage v2에서 같은 의존이 있는지는 확인하지 못했다. 현행 render hint의 의미는 [[Palantir-Object-Display-and-Index-Hints]]에서 확인한다.

Quiver는 object set에서 object/series/property로 이동하고, transform table과 time series를 양방향 변환하며 event/indicator/range/linear aggregation을 확대했다. 특정 data scale/structure에서 불가능한 다음 동작을 숨기지 않고 disabled로 표시한다. Array parameter를 Functions/Actions에 전달하는 지원도 추가됐다. 2022-10-31의 앱 간 object set 열기는 외부 서비스로 반출하는 기능이 아니라, Carbon에 게시된 Foundry maps, Workshop, Vertex와 Quiver dashboard 같은 Foundry 애플리케이션으로 여는 기능이다. Object set을 먼저 export하거나 영속화하지 않아도 된다. 이 범위는 2026-10-26 확인한 현행 Quiver 문서와도 일치한다. 호출 대상과 객체 접근 권한은 별도 확인 항목으로 둔다(운영 제안).

### 로딩 표시와 데이터 접근 실패를 구분하기

2022년 Contour 수정 기록에는 접근이 제한된 analysis의 무한 로딩 수정(8월 15일), 시작 dataset의 조회 권한이 없을 때 path 미리보기가 로딩에 머무르던 문제 수정(9월 29일)이 있다. 10월 10일에는 transaction이 하나도 없는 dataset branch가 선택 메뉴에 나타나던 문제를 수정했다. 로딩 지속이나 메뉴 표시만으로 데이터가 존재하거나 조회 권한이 있다고 판단하지 않는다. 권한, 입력 branch의 transaction과 화면 오류를 나누어 확인한다(진단 제안).

이 절의 세 Contour 항목은 2026-10-25 수집한 공식 2022 release notes 본문을 2026-10-26 대조한 과거 수정 기록이다. 현재 배포에서 같은 증상이 재현되는지는 검사하지 않았다. 웹 조회에서는 release 목록이 로딩 상태로만 반환되어 새 목록 본문을 재확인하지 못했고, 기존 내용 전체도 재검증하지 않아 `verified_at`은 유지한다.

## 모델링과 개발 환경

Ontology type/link role migration, type 단위 conditional-format edit 권한과 usage 관측이 도입됐다. Inline edit Action 권장 경고는 과거 hubble:editable type class를 계속 사용하는 비용을 드러낸다. CipherText rendering과 OSv1/OSv2 geopoint 표시 차이의 수정은 저장 데이터 암호화/보안 모델 변화와 구분한다.

Code Repositories는 preview input sample/filter/type 범위를 확장하고 Python 3.9 및 noarch library를 도입했다. 이 과거 도입 기록을 2026년 runtime 지원 보장으로 사용하지 않는다. Preview가 original input, 다른 dataset, repository preview 중 무엇을 쓰는지 확인한다. Foundry Rules Spark profile propagation/parameter validation 수정도 build 설정이 실제 실행에 적용됐는지 확인해야 하는 이유다.

Workshop variable transform/list/filter promotion, chart와 object-table progressive loading, Slate event dependency/ready/print와 widget selection 개선은 반응성과 조합성을 높였다. 특히 print event 성공과 인쇄용 CSS/레이아웃 완성은 별도다. Source release title의 과장이나 내부 작업명 대신 description에 명시된 범위를 근거로 사용한다.

## 출처

- [Palantir, 2022 release notes](https://www.palantir.com/docs/foundry/release-notes/2022)
- [Palantir, 2022 announcements release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2022)
- [Palantir, Checkpoint core concepts](https://www.palantir.com/docs/foundry/checkpoints/core-concepts)
- [Palantir, Configure checkpoints](https://www.palantir.com/docs/foundry/checkpoints/configure-checkpoints)
- [Palantir, Render hints](https://www.palantir.com/docs/foundry/object-link-types/metadata-render-hints)
- [Palantir, Quiver: Export an object set](https://www.palantir.com/docs/foundry/quiver/objects-import-export)

## 관련 문서

- [[Palantir-Foundry]]
- [[Palantir-Pipeline-Builder]]
- [[Palantir-Slate]]
- [[Palantir-Notepad]]
- [[Palantir-Contour]]
