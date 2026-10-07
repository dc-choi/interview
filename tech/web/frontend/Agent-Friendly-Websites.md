---
tags: [web, frontend, accessibility, agent, semantic-html]
status: done
verified_at: 2026-10-07
category: "웹&네트워크(Web&Network)"
aliases: ["Agent-Friendly Websites", "에이전트 친화적 웹사이트"]
---

# 에이전트 친화적 웹사이트

에이전트가 화면을 해석하고 조작하려면 시각적 표현, HTML 구조와 접근성 정보가 같은 기능을 가리켜야 한다. 의미 있는 HTML과 안정적인 레이아웃은 사람과 에이전트 모두의 탐색을 돕는다.

## 세 가지 관찰 경로

| 경로 | 읽는 정보 | 설계 시 확인할 것 |
|---|---|---|
| 스크린샷 | 위치, 크기와 시각적 묶음 | 조작 요소가 가려지거나 움직이지 않는가 |
| DOM | 요소의 계층과 속성 | 상품과 해당 상품의 구매 버튼이 구조상 연결되는가 |
| 접근성 트리 | 역할, 이름과 상태 | 버튼의 목적과 현재 상태를 식별할 수 있는가 |

에이전트마다 사용하는 경로는 다르다. 화면에서 버튼처럼 보이는 `div`만으로 기능이 충분히 전달된다고 가정하지 않는다.

## 구현 기준

- 동작에는 `button`, 이동에는 `a`를 사용한다. 입력은 `label`의 `for`와 입력 요소의 `id`로 연결한다.
- 버튼에는 접근 가능한 이름을 둔다. 직접 만든 버튼은 `role`과 포커스 가능 여부뿐 아니라 Enter/Space 활성화와 동작 후 포커스 관리도 구현해야 한다. 대화상자를 열면 내부로 포커스를 옮기고, 현재 화면에서 적용이나 재계산만 하면 보통 버튼에 유지한다.
- 투명한 오버레이가 조작 요소를 가리지 않게 하고, 로딩 중 위치 이동을 줄인다. `cursor: pointer` 같은 시각적 단서는 요소의 역할과 일치시킨다.
- WebMCP는 명시적인 작업을 에이전트에 제공하는 제안 표준이다. 개발 중인 API이므로 지원 여부를 확인하며, 기본 HTML과 접근성을 대체하는 전제로 삼지 않는다.

## 점검 예시

상품 선택부터 장바구니 추가까지 한 경로를 정한다. 화면, DOM과 접근성 트리에서 같은 상품과 버튼을 식별하고, 키보드로 실행한 뒤 결과와 포커스를 확인한다. 이는 위 기준을 적용하는 점검 예시이며 모든 에이전트의 성공을 보장하는 시험은 아니다.

## 출처

- [Build agent-friendly websites — web.dev](https://web.dev/articles/ai-agent-site-ux)
- [W3C WAI, Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)

## 관련 문서

- [[Frontend-Rendering-Models|프런트엔드 렌더링과 상호작용 모델]]
- [[React-Ref-and-Identity-Hooks|React ref와 접근성 id 계약]]
