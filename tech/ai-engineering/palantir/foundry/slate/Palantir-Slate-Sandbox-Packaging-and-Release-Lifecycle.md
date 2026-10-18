---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Slate sandbox, 패키징과 배포 수명"]
---

# Slate sandbox, 패키징과 배포 수명

## Sandbox의 입력과 실행

Code Sandbox는 격리 iframe 안에서 DOM을 만들고 state/event/action으로 Slate와 통신한다. getState는 한 번 읽기, watch는 값 변경 감시, setState는 지정 경로나 빈 경로의 전체 상태 변경이다. Custom event/action 이름은 Interactions에 등록한다. 네트워크 요청은 configured Query로 proxy해야 하며 fetch를 지원한다고 가정하지 않는다.

초기 로드는 state, CSS/HTML, library, JavaScript 순서다. Library는 순서대로 실행하며 UMD/global 노출과 CSP/CORS를 충족해야 한다. JavaScript/HTML/CSS에 직접 Handlebars를 넣지 않는 것이 권장 경계다. 일부 문장은 JavaScript 참조가 동작하지만 매번 widget을 재로드한다고 설명하므로 state 전달로 해결한다. HTML script tag는 실행 경로가 아니다.

Iframe widget의 inner 메시지(slate-iframe-action/event)와 Slate 자체 parent 메시지(slate-parent-iframe-action/event), 다른 window의 SLATE_MESSAGING_SERVICE를 구분한다. Child window ID를 지정해야 해당 종료 이벤트와 대상 메시징을 사용할 수 있다. 메시지 구조가 맞는다는 사실을 신뢰 가능한 발신자나 접근 권한의 증거로 삼지 않는다.

## CSS와 화면의 경계

App local stylesheet는 Less를 컴파일하지만 space global stylesheet는 CSS만 지원한다. Global stylesheet는 space 권한이 필요하고 여러 앱에 적용되며 private folder에는 제공되지 않는다. 로컬 미리보기와 Update로 공유 변경을 저장하는 시점을 구분한다. 동적 스타일은 정적 class를 정의하고 Additional Classes를 바꾸는 방식이다.

Tabbed container와 lazy rendering은 숨긴 widget의 렌더링을 줄여도 의존 query 실행을 자동 중단하지 않는다. 실제 page 분리와 다르다. CSS display:none은 DOM에서 보이지 않게 만드는 것이며 문서의 DOM 제거라는 표현만으로 노드 파괴를 보장하지 않는다. Flex와 퍼센트 크기 override가 충돌할 수 있다.

## 이동과 버전

JSON export는 앱 내부 logic/config만 포함하고 dataset/source/Action/global style/external library를 복제하지 않는다. 같은 permalink를 import하면 기존 앱의 새 버전이 될 수 있다. Import 시 OSDK를 다시 생성할 수 있고 Save as는 기존 bundle을 복사하며 원본의 최신 버전을 v1로 저장한다.

Marketplace는 다중 page/route와 prebuilt OSDK bundle을 패키징하지만 API 이름 대응이 필요하다. OSDK Function은 최신 버전만 지원하고 custom source/Postgres query, global stylesheet, Foundry Form/Time Series widget은 지원하지 않는다고 명시된다. 설치 parameter는 홈 페이지 local string/boolean 변수만 가능하다. CDN URL은 바뀌지 않아 대상 CSP가 필요하다.

Revert는 과거 버전을 새 최신 버전으로 저장해 선형 이력을 유지한다. Merge conflict는 widget/element 단위로 다른 사용자의 내용이 기본이므로 세부 필드의 자동 병합을 기대하지 않는다. Tag는 viewer에게 버전을 열고 태그 이름은 한 버전에만 붙일 수 있다. Delete undo는 최근 toast를 다른 삭제/편집이 대체할 수 있어 장기 복구 이력과 다르다.

Export query는 서버에서 다시 실행하며 함수 export는 결과를 서버로 보낸다. Widget PNG/PDF export는 iframe, Code Sandbox, multiselect와 이들을 포함한 container에 제한이 있다. Shareable view는 인쇄물이나 데이터 snapshot과 다른 산출물이다. 실제 앱 실행과 export 시험은 수행하지 않았다.

## 출처

- [Palantir slate, slate](https://www.palantir.com/docs/foundry/slate)
- [Palantir slate, applications-create](https://www.palantir.com/docs/foundry/slate/applications-create)
- [Palantir slate, applications-debug-problems](https://www.palantir.com/docs/foundry/slate/applications-debug-problems)
- [Palantir slate, applications-dependencies](https://www.palantir.com/docs/foundry/slate/applications-dependencies)
- [Palantir slate, applications-import-export](https://www.palantir.com/docs/foundry/slate/applications-import-export)
- [Palantir slate, applications-merging](https://www.palantir.com/docs/foundry/slate/applications-merging)
- [Palantir slate, applications-pages](https://www.palantir.com/docs/foundry/slate/applications-pages)
- [Palantir slate, applications-style-text](https://www.palantir.com/docs/foundry/slate/applications-style-text)
- [Palantir slate, applications-types](https://www.palantir.com/docs/foundry/slate/applications-types)
- [Palantir slate, applications-versioning](https://www.palantir.com/docs/foundry/slate/applications-versioning)
- [Palantir slate, applications-writeback](https://www.palantir.com/docs/foundry/slate/applications-writeback)
- [Palantir slate, best-practices-app-functionality](https://www.palantir.com/docs/foundry/slate/best-practices-app-functionality)
- [Palantir slate, best-practices-complex-layouts](https://www.palantir.com/docs/foundry/slate/best-practices-complex-layouts)
- [Palantir slate, best-practices-user-interaction](https://www.palantir.com/docs/foundry/slate/best-practices-user-interaction)
- [Palantir slate, concepts-events](https://www.palantir.com/docs/foundry/slate/concepts-events)
- [Palantir slate, concepts-events-and-actions-index](https://www.palantir.com/docs/foundry/slate/concepts-events-and-actions-index)
- [Palantir slate, concepts-foundry-functions](https://www.palantir.com/docs/foundry/slate/concepts-foundry-functions)
- [Palantir slate, concepts-functions](https://www.palantir.com/docs/foundry/slate/concepts-functions)
- [Palantir slate, concepts-handlebars](https://www.palantir.com/docs/foundry/slate/concepts-handlebars)
- [Palantir slate, concepts-object-context](https://www.palantir.com/docs/foundry/slate/concepts-object-context)
- [Palantir slate, concepts-object-sets](https://www.palantir.com/docs/foundry/slate/concepts-object-sets)
- [Palantir slate, concepts-osdk](https://www.palantir.com/docs/foundry/slate/concepts-osdk)
- [Palantir slate, concepts-queries](https://www.palantir.com/docs/foundry/slate/concepts-queries)
- [Palantir slate, concepts-styles](https://www.palantir.com/docs/foundry/slate/concepts-styles)
- [Palantir slate, concepts-variables](https://www.palantir.com/docs/foundry/slate/concepts-variables)
- [Palantir slate, faq](https://www.palantir.com/docs/foundry/slate/faq)
- [Palantir slate, logic-overview](https://www.palantir.com/docs/foundry/slate/logic-overview)
- [Palantir slate, marketplace-slate](https://www.palantir.com/docs/foundry/slate/marketplace-slate)
- [Palantir slate, navigation](https://www.palantir.com/docs/foundry/slate/navigation)
- [Palantir slate, overview](https://www.palantir.com/docs/foundry/slate/overview)
- [Palantir slate, public-applications-data-upload](https://www.palantir.com/docs/foundry/slate/public-applications-data-upload)
- [Palantir slate, read-write-overview](https://www.palantir.com/docs/foundry/slate/read-write-overview)
- [Palantir slate, references-convert-rows-columns](https://www.palantir.com/docs/foundry/slate/references-convert-rows-columns)
- [Palantir slate, references-helpers](https://www.palantir.com/docs/foundry/slate/references-helpers)
- [Palantir slate, references-indexes](https://www.palantir.com/docs/foundry/slate/references-indexes)
- [Palantir slate, references-query-perf](https://www.palantir.com/docs/foundry/slate/references-query-perf)
- [Palantir slate, references-writeback](https://www.palantir.com/docs/foundry/slate/references-writeback)
- [Palantir slate, style-overview](https://www.palantir.com/docs/foundry/slate/style-overview)
- [Palantir slate, styles-global-stylesheet](https://www.palantir.com/docs/foundry/slate/styles-global-stylesheet)
- [Palantir slate, widgets-advanced](https://www.palantir.com/docs/foundry/slate/widgets-advanced)
- [Palantir slate, widgets-chart](https://www.palantir.com/docs/foundry/slate/widgets-chart)
- [Palantir slate, widgets-container](https://www.palantir.com/docs/foundry/slate/widgets-container)
- [Palantir slate, widgets-control](https://www.palantir.com/docs/foundry/slate/widgets-control)
- [Palantir slate, widgets-platform](https://www.palantir.com/docs/foundry/slate/widgets-platform)
- [Palantir slate, widgets-text](https://www.palantir.com/docs/foundry/slate/widgets-text)
- [Palantir slate, widgets-time](https://www.palantir.com/docs/foundry/slate/widgets-time)
- [Palantir slate, widgets-visualization](https://www.palantir.com/docs/foundry/slate/widgets-visualization)

## 관련 문서

- [[Palantir-Slate]]
