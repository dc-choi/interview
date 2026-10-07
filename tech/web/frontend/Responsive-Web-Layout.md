---
tags: [web, css, responsive, accessibility, layout]
status: done
verified_at: 2026-10-07
category: "웹&네트워크(Web&Network)"
aliases: ["Responsive Web Layout", "반응형 웹 레이아웃"]
---

# 반응형 웹 레이아웃

반응형 설계는 가용 공간에 맞춰 배치를 바꾸면서 콘텐츠와 조작 경로를 유지하는 방식이다. 화면을 축소하거나 메뉴를 숨기는 것만으로 끝나지 않는다.

## 화면 폭과 콘텐츠를 함께 본다

모바일 브라우저가 기기 폭에 맞는 레이아웃 뷰포트를 쓰도록 문서에 다음을 둔다. 확대를 막는 옵션은 추가하지 않는다.

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Grid와 Flexbox로 유연한 기본 배치를 만들고, 콘텐츠가 비좁아지거나 읽기 어려워지는 지점에 미디어 쿼리를 추가한다. 768px, 1024px 같은 값은 특정 설계의 선택이며 모바일과 태블릿을 구분하는 보편 표준이 아니다.

상품 목록은 가용 폭에 따라 열 수를 줄이고, 검색 필터는 줄바꿈을 허용하며, 주문 요약과 버튼은 좁은 화면에서 세로로 배치할 수 있다. 대표 기기 크기뿐 아니라 경계값 사이의 폭과 긴 상품명으로도 확인한다.

## 긴 텍스트와 데이터 표

텍스트는 줄바꿈을 우선 검토한다. 한 줄 말줄임이 필요한 목록에서는 폭이 제한된 블록에 다음 속성을 함께 적용한다. `text-overflow` 하나만으로 넘침이 생기거나 잘리지는 않는다.

```css
.product-name {
  display: block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

말줄임을 쓰면 전체 이름을 볼 수 있는 상세 화면이나 펼치기 경로를 제공한다. 식별에 필요한 옵션명까지 숨긴 채 결제를 진행하게 만들지 않는다.

행과 열의 관계가 중요한 데이터 표는 표 바깥의 래퍼에 `overflow-x: auto`를 적용해 가로 스크롤 범위를 한정할 수 있다. 표의 의미 구조와 헤더 관계를 유지하고, 키보드로도 스크롤 영역에 접근할 수 있는지 확인한다. 필요한 경우 래퍼에 `tabindex="0"`과 의미 있는 접근성 이름을 제공한다.

WCAG 2.2의 Reflow 기준은 세로 스크롤 콘텐츠가 320 CSS px에 해당하는 폭에서 정보나 기능 손실 없이 읽히도록 요구한다. 의미나 사용에 2차원 배치가 필요한 데이터 표 등은 예외지만, 페이지 전체나 표 안의 개별 셀 내용을 모두 예외로 취급하지 않는다.

## 고정 하단 내비게이션과 안전 영역

`env(safe-area-inset-bottom, 0px)`는 브라우저가 제공하는 하단 안전 영역 값을 CSS에 넣는다. 두 번째 인자는 해당 환경 변수가 없을 때의 대체값이다. 기종별 값을 직접 추정하지 않고 실제 브라우저와 화면 방향에서 확인한다.

고정 바가 있다면 두 공간을 구분한다.

- 바 내부에는 안전 영역만큼 여백을 더해 버튼이 가려지지 않게 한다.
- 본문에는 바가 실제로 차지하는 전체 높이만큼 공간을 남겨 마지막 콘텐츠를 가리지 않게 한다.

고정된 숫자로 본문 여백을 잡으면 글자 확대나 여러 줄 라벨에서 어긋날 수 있다. 높이가 변하는 화면에서는 일반 흐름의 배치를 먼저 검토하거나 실제 바 높이와 여백을 맞춘다. safe area만 추가했다고 가상 키보드, 확대, 포커스 가림 문제가 모두 해결됐다고 판단하지 않는다.

## 접이식 메뉴의 동작 계약

작은 화면에서 상단 메뉴를 숨기면 같은 기능으로 가는 대체 경로가 있어야 한다. 옆에서 나오는 off-canvas 패널도 **배경 조작을 막는 모달인지**부터 정한다. 단순 펼침 메뉴에 모달 동작을 일괄 적용하지 않는다.

모달 패널은 다음 계약을 확인한다.

1. 열면 포커스를 패널 안으로 옮기고 접근성 이름을 제공한다.
2. Tab과 Shift+Tab 순회가 패널 밖으로 빠지지 않으며 배경은 조작할 수 없게 한다.
3. 닫기 버튼과 Escape로 닫을 수 있게 한다.
4. 닫은 뒤에는 보통 열기 버튼으로 포커스를 돌린다. 버튼이 사라졌거나 작업 흐름이 바뀌었으면 적절한 다음 위치를 정한다.

네이티브 `<dialog>`의 `showModal()`은 배경 비활성화 같은 기본 동작을 제공한다. 별도 패널을 구현한다면 같은 동작을 직접 책임져야 한다. CSS 클래스나 `aria-modal`만 붙여서는 계약이 완성되지 않는다.

화면이 넓어져 패널을 숨기는 정책이라면 열린 상태, 배경 스크롤 잠금과 포커스를 함께 정리한다. 경계값을 오갈 때 보이지 않는 패널에 포커스가 남는지 확인한다.

## 확인 순서

- 좁은 폭, 중간 폭, 넓은 폭에서 검색, 상품 선택과 주문 경로가 유지되는가?
- 긴 상품명, 빈 목록과 큰 글자에서도 필요한 정보가 보이는가?
- 가로 스크롤은 필요한 영역에 한정되고 키보드로 사용할 수 있는가?
- 고정 바가 마지막 콘텐츠, 입력창과 포커스를 가리지 않는가?
- 메뉴를 열고 화면 크기를 바꾼 뒤에도 닫기, 포커스와 배경 스크롤이 정상인가?

## 출처

- [MDN, Responsive web design](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design)
- [MDN, text-overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-overflow)
- [MDN, overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow)
- [MDN, env()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- [W3C WAI, Understanding SC 1.4.10: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [W3C WAI, Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [MDN, dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)

## 관련 문서

- [[프론트엔드(Frontend)|프론트엔드]]
- [[Foldable-Web-Layout|폴더블 웹 레이아웃]]
- [[Agent-Friendly-Websites|에이전트 친화적 웹사이트]]
