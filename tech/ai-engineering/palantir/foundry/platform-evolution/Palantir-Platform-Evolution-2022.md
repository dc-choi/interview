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

## 분석의 값과 화면 상태

Contour의 partition/projection 표시, branch별 parameter source 선택과 path dependency 삭제 방지는 계산 입력을 명확히 한다. Downstream path가 있으면 삭제를 막고 materialized output만 있으면 업데이트 중단을 경고한다. Non-deterministic window function 경고는 UI 개선이어도 결과 재현성의 문제다. 당시 문구 NTIL은 함수 이름 오기로 보이며 현재 NTILE 문법과 대조해야 한다.

Map/heatmap/embedded row count, null coloring과 property-card link filter 수정은 같은 화면이 올바른 subset을 표시하는지 다시 확인하게 한다. Default open view, dashboard tab, text/table 편집, scroll/resize와 preview 오류 수정은 계산 권한을 바꾸는 기능으로 보지 않는다.

Quiver는 object set에서 object/series/property로 이동하고, transform table과 time series를 양방향 변환하며 event/indicator/range/linear aggregation을 확대했다. 특정 data scale/structure에서 불가능한 다음 동작을 숨기지 않고 disabled로 표시한다. Array parameter를 Functions/Actions에 전달하는 지원과 외부 앱으로 object set을 보내는 기능은 원천 객체 권한을 함께 가져가는 보장이 아니다.

## 모델링과 개발 환경

Ontology type/link role migration, type 단위 conditional-format edit 권한과 usage 관측이 도입됐다. Inline edit Action 권장 경고는 과거 hubble:editable type class를 계속 사용하는 비용을 드러낸다. CipherText rendering과 OSv1/OSv2 geopoint 표시 차이의 수정은 저장 데이터 암호화/보안 모델 변화와 구분한다.

Code Repositories는 preview input sample/filter/type 범위를 확장하고 Python 3.9 및 noarch library를 도입했다. 이 과거 도입 기록을 2026년 runtime 지원 보장으로 사용하지 않는다. Preview가 original input, 다른 dataset, repository preview 중 무엇을 쓰는지 확인한다. Foundry Rules Spark profile propagation/parameter validation 수정도 build 설정이 실제 실행에 적용됐는지 확인해야 하는 이유다.

Workshop variable transform/list/filter promotion, chart와 object-table progressive loading, Slate event dependency/ready/print와 widget selection 개선은 반응성과 조합성을 높였다. 특히 print event 성공과 인쇄용 CSS/레이아웃 완성은 별도다. Source release title의 과장이나 내부 작업명 대신 description에 명시된 범위를 근거로 사용한다.

## 출처

- [Palantir, 2022 release notes](https://www.palantir.com/docs/foundry/release-notes/2022)
- [Palantir, 2022 announcements release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2022)

## 관련 문서

- [[Palantir-Foundry]]
- [[Palantir-Pipeline-Builder]]
- [[Palantir-Slate]]
- [[Palantir-Notepad]]
- [[Palantir-Contour]]
