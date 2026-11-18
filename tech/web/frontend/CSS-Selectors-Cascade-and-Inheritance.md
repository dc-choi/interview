---
tags: [web, frontend, css, selector, cascade, specificity, inheritance, cssom]
status: done
verified_at: 2026-11-18
category: "웹&네트워크(Web&Network)"
aliases: ["CSS Basics", "CSS 기초", "CSS 선택자", "CSS Selectors", "CSS 캐스케이드", "CSS Cascade", "명시도", "Specificity", "CSS 상속", "CSS Inheritance"]
---

# CSS 기초: 적용 위치, 선택자, 캐스케이드와 상속

CSS는 HTML 요소에 표현 규칙을 붙이는 언어다. 규칙은 요소를 고르는 선택자와 `속성: 값` 선언을 담은 블록으로 이뤄진다. 한 요소에 선언이 겹칠 때 무엇이 이기는지(캐스케이드)와 아무 선언도 없을 때 값이 어디서 오는지(상속과 초기값)를 구분하면 대부분의 스타일 문제를 설명할 수 있다. 아래는 2026-11-18에 확인한 W3C CSS Cascading and Inheritance Level 5, Selectors Level 4와 CSSOM 편집자 초안 기준이다. 문서 구조는 [[HTML-Document-Structure-and-Forms|HTML 기초]]에 있다.

```css
a { color: #ff0000; text-decoration: none; }
a:hover { text-decoration: underline; }
#harvard { color: #00ff00; }
```

선언은 세미콜론으로 나눈다. `#ff0000`은 빨강, 초록, 파랑을 16진 두 자리씩 적은 색이다.

## 적용 위치

| 위치 | 예 | 성질 |
|---|---|---|
| `style` 속성 | `<p style="text-align: center">` | 그 요소에만 붙는다. 같은 중요도의 선택자 규칙보다 우선한다 |
| `<style>` 요소 | `head` 안에 규칙을 쓴다 | 그 문서 안에서만 재사용한다 |
| 외부 스타일시트 | `<link rel="stylesheet" href="home.css">` | 여러 페이지가 같은 파일을 공유하고 파일을 따로 캐시할 수 있다 |

`link`는 `a`처럼 본문에 보이는 클릭할 링크가 아니라 문서와 다른 자원의 관계를 선언하는 void 요소이고, `rel="stylesheet"`는 그중 외부 자원을 불러오는 관계다. CSP의 `style-src`에 `'unsafe-inline'`이 없으면 `<style>` 요소와 `style` 속성의 인라인 스타일이 막히고(`<style>` 블록은 nonce나 hash로 따로 허용할 수 있다), 스타일을 외부 파일로 모아 두면 이 정책을 걸기 쉽다([[Security-Headers#CSP — 심층 방어의 핵심 계층|CSP]]). 스타일시트가 첫 렌더링을 막는 조건은 [[Browser-Main-Thread#렌더링 차단과 변경 비용|렌더링 차단]]에 있다.

## 선택자

| 선택자 | 예 | 고르는 요소 |
|---|---|---|
| 타입 | `p`, `a` | 그 이름의 모든 요소 |
| 클래스 | `.centered` | `class`의 공백 구분 토큰에 그 이름이 있는 요소. `class="table table-striped"`처럼 여러 개를 붙인다 |
| ID | `#harvard` | `id`가 그 값인 요소. HTML은 `id`가 트리 안에서 유일하도록 요구한다 |
| 속성 | `input[type="email"]` | 속성과 값이 맞는 요소 |
| 의사 클래스 | `a:hover`, `input:invalid` | 상태가 맞는 요소 |
| 결합자 | `nav a`(자손), `ul > li`(자식) | 구조 관계가 맞는 요소 |

선택자에는 `.`과 `#`을 붙이지만 HTML 속성값에는 붙이지 않는다(`class="centered"`, `id="harvard"`). JavaScript의 `document.querySelector("#name")`도 같은 선택자 문법을 쓴다. `:hover`는 터치 화면에서 브라우저에 따라 맞지 않거나, 잠깐만 맞거나, 다른 곳을 누를 때까지 계속 맞을 수 있으므로 호버로만 정보를 보여 주지 않는다.

Bootstrap 같은 CSS 프레임워크는 미리 만든 클래스 묶음이다. 5.3 문서 기준 표 스타일은 `.table`을 붙여야 적용되는 옵트인이고, `.table-striped`를 더하면 `tbody` 행에 줄무늬가 생긴다. CDN에서 받는 스타일시트도 `<link>`의 `integrity`(SRI)로 내용을 고정할 수 있다([[Third-Party-Script-Compromise|서드파티 스크립트 침해]], [[Bootstrap-6-Migration|Bootstrap 6 전환]]).

## 캐스케이드: 겹치는 선언 중 하나를 고른다

같은 요소의 같은 속성에 선언이 여럿 적용되면 다음 순서로 비교해 하나를 고른다.

1. **출처와 중요도**: 브라우저 기본(user agent), 사용자, 작성자 중 어디서 왔는지와 `!important` 여부다. 일반 선언은 작성자, 사용자, 브라우저 기본 순으로 이기고 `!important` 선언은 이 순서가 뒤집힌다.
2. **문맥**: Shadow DOM처럼 캡슐화한 트리끼리의 비교다([[Web-Components|웹 컴포넌트]]).
3. **요소에 붙은 스타일**: `style` 속성의 선언은 같은 중요도의 선택자 규칙보다 우선한다.
4. **레이어**: `@layer`로 나눈 일반 선언은 나중 레이어가 이기고, 레이어에 넣지 않은 선언은 마지막 암묵 레이어로 취급된다. `!important` 선언은 반대로 앞 레이어가 이긴다.
5. **명시도**: 더 구체적인 선택자가 이긴다.
6. **등장 순서**: 위가 모두 같으면 나중 선언이 이긴다. 벤더 접두사 선언 뒤에 표준 선언을 두는 이유다([[Browser-CSS-Animation-and-Compatibility|CSS 애니메이션과 호환성]]).

명시도는 선택자의 ID 수(A), 클래스와 속성과 의사 클래스 수(B), 타입과 의사 요소 수(C)를 세어 A, B, C 순으로 비교한다. 전체 선택자 `*`는 세지 않는다. `:where()`는 0이고 `:is()`, `:not()`, `:has()`는 인자 중 가장 구체적인 선택자의 명시도를 갖는다.

| 선택자 | 명시도 (A, B, C) |
|---|---|
| `a` | (0, 0, 1) |
| `a.link` | (0, 1, 1) |
| `nav a:hover` | (0, 1, 2) |
| `#harvard` | (1, 0, 0) |

그래서 `#harvard { color: green }`은 파일에서 먼저 나와도 `a.link { color: red }`를 이긴다. 명시도 다툼을 `!important`로 끝내면 작성자 스타일에서 그 값을 다시 덮을 때도 `!important`가 필요해지므로, 재사용할 값은 클래스로 만들고 순서와 레이어로 관리한다(적용 제안).

## 상속: 정해지지 않은 값을 부모에서 받는다

캐스케이드가 값을 정하지 못한 속성은 상속 속성이면 부모의 계산값을, 아니면 그 속성의 초기값을 쓴다. 상속 여부와 초기값은 속성 정의표의 Inherited와 Initial 항목에 있고 `inherit`, `initial`, `unset`으로 동작을 명시할 수 있다.

- `body { text-align: center }`가 자식 `div`의 글까지 가운데로 모으는 것은 캐스케이드가 아니라 상속이다. `text-align`은 상속 속성이고 block container에 적용된다.
- `background-color`는 상속되지 않고 초기값이 `transparent`다. 부모 배경색이 자식 영역에도 보이는 것은 투명한 자식 배경 뒤로 부모가 비치기 때문이다.
- 아무 규칙을 쓰지 않아도 링크가 파랗고 밑줄이 있으며 `h1`이 크고 굵은 것은 브라우저 기본 스타일 때문이다. HTML 표준의 rendering 절은 `:link { color: #0000EE }`, 링크의 `text-decoration: underline`, 굵은 제목과 1수준 제목의 `font-size: 2.00em`, `body`의 8px 여백을 기대 동작으로 둔다. 작성자의 일반 선언은 이 기본 스타일을 이긴다.

## 스크립트에서 스타일 바꾸기

```js
const body = document.querySelector("body");
body.style.backgroundColor = "red";                // style 속성이 background-color: red가 된다
body.style.setProperty("background-color", "red"); // 같은 결과
getComputedStyle(body).backgroundColor;           // 스타일시트와 상속까지 반영한 값
```

- `element.style`은 그 요소의 인라인 선언, 곧 `style` 속성만 읽고 쓴다. 값을 바꾸면 CSSOM이 선언 블록을 직렬화해 `style` 속성을 갱신한다. 스타일시트에서 온 값은 `getComputedStyle()`로 읽으며, 이 함수는 속성마다 정해진 resolved value를 돌려준다.
- CSSOM은 하이픈이 든 속성 이름을 카멜 표기(`backgroundColor`, `fontSize`)로도, 원래 이름(`style["font-size"]`)으로도 노출한다. 점 표기 `style.background-color`는 JavaScript에서 뺄셈으로 해석되기 때문이다.
- 여러 선언을 스크립트에서 하나씩 바꾸기보다 `classList.toggle("dark")`처럼 클래스를 바꾸면 표현 규칙이 CSS 파일에 남는다(적용 제안). `display: none`과 `visibility: hidden`의 차이는 [[Web-Service-Structure|웹 서비스의 구조]]에 있다.

## 개발자 도구로 확인하기

Chrome DevTools Elements 패널의 Styles 탭은 선택한 요소에 적용되는 모든 규칙을 덮인 선언까지 보여 주고, Computed 탭은 실제로 적용된 값만 보여 준다. 선언의 체크를 해제하면 줄이 그어지며 비활성화되고, 값을 바꾸면 결과가 바로 보인다. 바뀌는 것은 그 탭에 불러온 사본이고 서버의 파일은 그대로다.

## 이해 확인

1. `p { color: blue }`와 `.note { color: red }`가 있을 때 `<p class="note" style="color: green">`의 글자색과 그 이유는?
2. `body { background-color: yellow }`만 있을 때 자식 `div`의 `getComputedStyle(div).backgroundColor`는 무엇이고, 화면이 노랗게 보이는 이유는?
3. `#menu a`와 `.nav .item a`의 명시도를 계산하고, 둘이 같은 요소에 다른 색을 줄 때 어느 쪽이 이기는지 말한다.

## 출처

- [W3C, CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/) — 2026-11-18 [Cascade Sorting Order](https://www.w3.org/TR/css-cascade-5/#cascade-sort), [Initial Values](https://www.w3.org/TR/css-cascade-5/#initial-values), [Inheritance](https://www.w3.org/TR/css-cascade-5/#inheriting), [Explicit Defaulting](https://www.w3.org/TR/css-cascade-5/#defaulting-keywords) 대조
- [W3C, Selectors Level 4, Calculating a selector's specificity](https://www.w3.org/TR/selectors-4/#specificity-rules)
- [W3C, CSS Text Module Level 3, text-align](https://www.w3.org/TR/css-text-3/#text-align-property), [W3C, CSS Backgrounds and Borders Module Level 3, background-color](https://www.w3.org/TR/css-backgrounds-3/#background-color)
- [CSSWG, CSSOM, camel-cased attribute](https://drafts.csswg.org/cssom/#dom-cssstyleproperties-camel_cased_attribute), [dashed attribute](https://drafts.csswg.org/cssom/#dom-cssstyleproperties-dashed_attribute), [ElementCSSInlineStyle](https://drafts.csswg.org/cssom/#the-elementcssinlinestyle-mixin), [getComputedStyle()](https://drafts.csswg.org/cssom/#dom-window-getcomputedstyle), [Resolved Values](https://drafts.csswg.org/cssom/#resolved-values)
- [WHATWG HTML Standard, Rendering](https://html.spec.whatwg.org/multipage/rendering.html), [The id attribute](https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute), [Classes](https://html.spec.whatwg.org/multipage/dom.html#classes)
- [MDN, :hover](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:hover), [MDN, CSP: style-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src), [MDN, Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity)
- [Bootstrap 5.3, Tables](https://getbootstrap.com/docs/5.3/content/tables/)
- [Chrome for Developers, CSS features reference](https://developer.chrome.com/docs/devtools/css/reference)
- [YouTube, Harvard CS50 (2026), Lecture 8: HTML, CSS, JavaScript](https://www.youtube.com/watch?v=gmuTjeQUbTM&t=67927s) — freeCodeCamp.org 채널, 2026-02-05 공개, 18:52:07부터. 이 문서를 만든 계기이며, 자식에게 값이 내려가는 동작을 캐스케이드로 설명한 부분은 위 명세의 상속으로 바로잡았다.

## 관련 문서

- [[HTML-Document-Structure-and-Forms|HTML 기초: 문서 구조, 의미 요소와 폼]]
- [[Browser-CSS-Animation-and-Compatibility|브라우저 CSS 애니메이션과 호환성]]
- [[Web-Components|웹 컴포넌트]] — Shadow DOM과 상속되는 custom property
- [[Responsive-Web-Layout|반응형 웹 레이아웃]]
- [[Browser-Main-Thread|브라우저 메인 스레드]]
- [[Design-System-Lint|디자인 시스템 lint]]
