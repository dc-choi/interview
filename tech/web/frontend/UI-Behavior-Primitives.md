---
tags: [web, frontend, accessibility, aria, headless-ui, components, agent]
status: done
verified_at: 2026-11-25
category: "웹&네트워크(Web&Network)"
aliases: ["UI Behavior Primitives", "UI 동작 프리미티브", "헤드리스 UI", "Headless UI", "UI SDK", "동작 조합 컴포넌트"]
---

# UI 동작 프리미티브: 동작을 조합해 접근 가능한 컴포넌트를 만든다

Select, 콤보박스, 메뉴 같은 위젯은 겉모양보다 동작이 어렵다. 팝업 열고 닫기, 방향키로 항목 이동, 선택 상태, 입력한 글자로 항목 찾기, 닫은 뒤 포커스 복귀와 보조 기술에 알릴 역할과 상태가 모두 맞아야 한다. 동작 프리미티브 방식은 이런 동작을 스타일 없는 재사용 단위로 떼어 두고 컴포넌트를 그 조합으로 만든다. 마크업과 스타일은 쓰는 쪽이 정한다.

## 역할을 붙여도 동작은 생기지 않는다

WAI-ARIA Authoring Practices Guide(APG)는 HTML 입력 요소와 달리 ARIA 역할은 브라우저가 키보드 동작이나 스타일을 제공하게 만들지 않는다고 설명한다. `div`에 역할을 붙이는 것은 그 역할에 맞는 키보드 상호작용을 JavaScript로 구현했다는 약속이다. 그래서 같은 위젯을 여러 번 만들면 이 약속을 매번 다시 지켜야 하고, 동작을 한곳에 모으는 프리미티브가 의미를 가진다. 네이티브 요소로 요구를 채울 수 있으면 그쪽이 먼저다([[Agent-Friendly-Websites|에이전트 친화적 웹사이트]]의 button과 a 사용 기준).

APG가 정한 동작 계약의 예는 다음과 같다(2026-11-25 확인).

- **콤보박스:** 연결된 팝업을 가진 입력 위젯이다. 팝업은 listbox, grid, tree나 dialog일 수 있다. 값을 표시하는 입력 요소가 `role="combobox"`를 갖고 `aria-controls`로 팝업을 가리키며, 팝업이 보이지 않을 때 `aria-expanded="false"`다. listbox, grid, tree 팝업 안의 항목이 포커스를 받는 동안에도 DOM 포커스는 콤보박스에 남고 `aria-activedescendant`가 시각적으로 포커스된 항목을 가리킨다.
- **자동완성 형태:** 콤보박스의 자동완성은 없음, 목록과 수동 선택, 목록과 자동 선택, 목록과 인라인 완성의 네 가지로 나뉜다. 같은 콤보박스라도 어느 형태인지에 따라 입력할 때 선택과 표시가 달라진다.
- **복합 위젯의 포커스:** 탭 순서에는 복합 위젯마다 포커스 가능한 요소 하나만 둔다. 방향키 이동은 탭 순서에 들어갈 요소만 `tabindex="0"`, 나머지는 `tabindex="-1"`로 두고 옮기는 roving tabindex나, 컨테이너가 DOM 포커스를 유지하고 `aria-activedescendant`로 현재 항목을 가리키는 방식으로 구현한다.

## 동작을 조합해 컴포넌트를 만든다: UI SDK 사례

Vercel의 UI SDK(베타, Apache-2.0)는 이 방식을 라이브러리로 만든 사례다. 아래는 2026-11-25 저장소 README와 문서 기준이다.

- 키보드 탐색, 포커스, 선택, 닫기(dismissal), 팝업, drag and drop과 이들에 필요한 ARIA를 `@ui-sdk/core`에 두고 React, Vue, Svelte, Solid, Web Components 어댑터를 둔다. `definePrimitive`로 상태, API와 부품(slot)을 정의한 primitive를 `createParts`로 각 프레임워크에 렌더링하며 부품 이름은 다섯 곳에서 같다.
- 홈페이지는 50개 이상의 동작을 내세운다. 참조 문서는 동작 helper를 Focus and Keys, Selection, Drag and Drop, Dragging and Resizing, Lists, Trees, Transitions and Gestures, Popups and Layers, Preferences, Canvas 범주로 나눈다. 예를 들어 `createRovingFocus`는 방향키로 목록을 오가며 탭 정지는 하나로 두고, `createTypeahead`는 글자 몇 개로 항목에 건너뛰며, `createPopup`은 열고 닫기, 위치와 포커스를 관리한다. `createReorder`(포인터나 키보드로 목록 순서 변경), `createResize`(손잡이로 크기 조절), `createViewport`(캔버스 이동과 확대, 축소)도 있다.
- 홈페이지가 든 조합은 아래와 같다. 에이전트가 같은 조각으로 자동완성이나 콤보박스, 아직 없는 새 컴포넌트도 만들 수 있다고 설명한다.

| 컴포넌트 | 조합한 동작 |
|---|---|
| Select | `createPopup`, `createSelection`, `createTypeahead` |
| 팀원 선택기 | `createPopup`, `createListbox`, `createSelection`, `createChange` |

- 저장소는 사람이 아니라 에이전트가 동작 조합을 작성하는 사용법을 전제로 에이전트용 skill을 함께 배포하고(`npx skills@latest add vercel-labs/ui --skill ui-sdk`), 문서는 에이전트가 컴포넌트를 읽고 action을 호출하게 연결하는 방법과 WebMCP 연동을 따로 안내한다.
- 베타이므로 프레임워크, API, 문서와 동작이 정식 출시 전에 바뀔 수 있다고 명시한다. React 어댑터는 React 19 이상을 요구한다.

## 접근성 검사의 층

UI SDK의 `@ui-sdk/core/testing`은 검사가 어디까지 대신하는지 경계를 함께 적는다.

| 검사 | 확인하는 것 | 남는 확인 |
|---|---|---|
| `checkPattern` | 지원하는 위젯 패턴의 역할, 이름, 상태, 부품 사이 참조와 키보드 상호작용. APG가 선택 사항으로 둔 일부 동작보다 일부러 엄격하다 | 메뉴 검사는 항목을 실제로 실행하므로 안전한 action으로 시험한다 |
| `announced` | primitive가 스크린 리더 알림 요소로 보낸 문자열 | 실제 스크린 리더의 낭독은 확인하지 않는다 |
| `checkServer` | DOM 없이 부품을 렌더링해 브라우저 의존 코드를 찾는다 | |
| `checkDirection` | 왼쪽에서 오른쪽과 오른쪽에서 왼쪽 쓰기에서 방향키 동작 비교 | |

상호작용 검사는 jsdom이나 브라우저 같은 DOM이 필요하고, 프레임워크 stub은 네이티브 팝업이나 애니메이션 동작을 실행하지 않는다. 문서는 완성한 컴포넌트를 브라우저에서 키보드와 스크린 리더로 확인하라고 안내한다. 정리하면 패턴 단위 자동 검사, 실제 브라우저의 포커스와 레이어 확인, 키보드와 스크린 리더를 쓰는 사람의 확인을 차례로 둔다(이 문서의 정리). 페이지 단위의 정적 접근성 검사는 [[Storybook|Storybook의 axe-core 연동]]이 맡는 영역과 겹치지 않게 나눈다.

## 선택 기준

다음은 위 내용에서 도출한 이 문서의 판단이다.

- 네이티브 요소(`select`, `dialog`, `details`)가 요구를 채우면 먼저 쓴다. 검색, 다중 선택, 사용자 아바타처럼 네이티브 요소로 안 되는 요구가 생길 때 프리미티브를 검토한다.
- 직접 구현, 동작 프리미티브, 스타일까지 포함한 완성 컴포넌트 라이브러리 중 무엇을 고를지는 디자인 시스템을 누가 소유하는지와 프레임워크가 몇 개인지로 정한다. 여러 프레임워크에서 같은 부품 이름과 동작을 유지해야 하면 프리미티브의 이점이 커진다.
- 에이전트가 조합한 컴포넌트도 패턴 검사를 통과했다는 사실만으로 사용성이 확인된 것은 아니다. 사람이 키보드와 스크린 리더로 확인하는 단계를 남긴다([[Design-System-Lint|디자인 시스템 lint]]의 진단과 화면 검증 분리와 같은 원칙).
- 베타 라이브러리는 버전을 고정하고 API 변경을 추적한다.

## 점검 질문

- 콤보박스에서 DOM 포커스와 시각적 포커스가 어디에 있는지, `aria-activedescendant`와 roving tabindex의 차이를 설명할 수 있는가
- ARIA 역할을 붙인 사용자 정의 위젯에서 개발자가 직접 구현해야 하는 동작을 말할 수 있는가
- 패턴 검사, 브라우저 검사와 스크린 리더 확인이 각각 무엇을 잡는지 구분할 수 있는가

## 출처

- [UI SDK — GitHub, vercel-labs/ui](https://github.com/vercel-labs/ui) — 2026-11-25 README의 구성, 프레임워크 어댑터, 에이전트 skill과 베타 조건
- [UI SDK — Vercel](https://ui-sdk.dev/) — 50개 이상의 동작 표기와 Select, 팀원 선택기 조합 예
- [UI SDK, Behaviors](https://ui-sdk.dev/docs/core/behaviors) — 동작 범주와 helper 목록
- [UI SDK, Testing](https://ui-sdk.dev/docs/core/testing) — 검사 helper와 검사 범위의 한계
- [W3C WAI, ARIA Authoring Practices Guide: Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [W3C WAI, ARIA Authoring Practices Guide: Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [W3C WAI, ARIA Authoring Practices Guide: Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)
- 사용자 제공 GeekNews 알림(2026-11-22): UI SDK - AI 에이전트가 UI의 기본 동작을 조합해 컴포넌트를 만드는 라이브러리. 학습 계기이며 게시물 번호는 확인하지 못했다

## 관련 문서

- [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]]
- [[Storybook|Storybook]] — play 함수와 axe-core 접근성 검사
- [[Design-System-Lint|디자인 시스템 lint]]
- [[Atomic-Design|Atomic Design과 컴포넌트 계층 규칙]]
- [[Cross-Platform-Keyboard|플랫폼별 키보드 입력]]
- [[HTML-Document-Structure-and-Forms|HTML 기초: 문서 구조, 의미 요소와 폼]]
