---
tags: [web, frontend, react, component, jsx, props]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Components and JSX", "React component와 JSX"]
---

# React component와 JSX

component는 markup과 그 모습을 결정하는 로직을 함께 묶는 UI 단위다. 반복되는 버튼뿐 아니라 한 번만 등장하는 화면이나 sidebar도 책임을 분리하기 위해 component로 만들 수 있다. React가 함수의 결과를 사용하고, web renderer가 HTML element로 화면을 구성한다.

## 선언, 사용과 파일 경계

```jsx
export function Notice({ title }) {
  return <h2>{title}</h2>;
}

export default function Dashboard() {
  return (
    <section>
      <Notice title="오늘의 안내" />
      <Notice title="이번 주 안내" />
    </section>
  );
}
```

`<section>`은 host element이고 `<Notice />`는 component다. 함수와 JSX tag 이름은 대문자로 시작한다. 소문자 `<notice />`는 같은 이름의 component 함수를 호출하는 표기가 아니다.

component 함수는 module의 최상위에 선언한다. `Dashboard` 안에서 `Notice` 함수를 매번 정의하면 render마다 새로운 component type이 만들어져 state가 reset되는 등 문제가 생길 수 있다. parent의 값이 필요하면 함수 중첩 대신 props로 전달한다. 같은 파일에 두 함수를 선언하는 것과 component 함수 안에 다른 component를 선언하는 것은 다르다.

반환할 JSX가 여러 줄이면 `return (`처럼 같은 줄에서 괄호를 연다. `return` 다음 줄에서 JSX를 시작하면 JavaScript의 자동 세미콜론 삽입으로 원하는 반환값이 사라진다.

### module export와 import 맞추기

component를 다른 파일에서 재사용하거나 파일이 읽기 어려워졌을 때 분리한다. 작은 관련 component를 같은 파일에 유지해도 된다. 새 파일로 옮긴 뒤 export하고 사용하는 **모든** module에서 import를 맞춘다.

| export 종류 | 선언 | 사용하는 module |
|---|---|---|
| default | `export default function Dashboard() {}` | `import Dashboard from './Dashboard.js';` |
| named | `export function Notice() {}` | `import { Notice } from './Dashboard.js';` |

module 하나에는 default export를 최대 하나 둘 수 있고 named export는 여러 개 둘 수 있다. default import의 지역 이름은 바꿀 수 있다. named import는 export 이름을 맞추거나 `import { Notice as Alert }`처럼 명시적으로 별칭을 준다. 디버깅할 때 component를 식별할 수 있도록 함수와 파일에 의미 있는 이름을 붙인다.

root component의 파일명과 위치는 실행 환경이 정한다. `App.js`라는 이름이나 앱 전체의 root가 하나라는 가정을 코드 구조의 필수 규칙으로 삼지 않는다. 기존 HTML 일부에 React를 붙이면 여러 root를 둘 수 있다.

## JSX는 markup을 계산하는 JavaScript syntax

JSX는 React 자체나 HTML 문자열이 아니다. JavaScript syntax extension이며 UI description으로 변환된다. markup과 그 markup을 결정하는 조건을 가까이 두고, 관련 없는 UI의 로직은 component 사이에서 분리한다.

인접한 tag를 한 표현식으로 반환할 때는 parent나 Fragment로 묶는다. Fragment `<>...</>`는 DOM에 wrapper를 추가하지 않아 불필요한 `<div>` 없이 그룹화할 수 있다. component는 배열을 반환할 수도 있으므로 DOM wrapper를 반드시 하나 만들어야 한다는 뜻은 아니다.

| HTML을 JSX로 옮길 때 | JSX 표기 |
|---|---|
| 닫지 않은 void tag | `<img />`, `<br />` |
| 생략된 닫는 tag | `<li>내용</li>` |
| CSS class | `className="notice"` |
| label의 연결 대상 | `htmlFor="query"` |
| SVG property | `strokeWidth={2}` |
| 접근성, 사용자 data attribute | `aria-label="검색"`, `data-kind="notice"` |

대부분의 attribute는 camelCase지만 `aria-*`와 `data-*`는 HTML처럼 하이픈을 유지한다. tag 중첩 순서도 지킨다. HTML/SVG 변환 도구는 반복 작업을 줄일 수 있지만 의미 있는 DOM 구조와 접근성은 결과에서 확인한다.

## 문자열, expression과 object

따옴표 attribute는 문자열을, 중괄호는 JavaScript expression의 계산 결과를 전달한다.

```jsx
function Thumbnail({ item, size = 80 }) {
  const src = `/images/${item.imageId}.jpg`;
  return (
    <img className="thumbnail" src={src} alt={item.label}
      style={{ width: size, height: size, borderRadius: "50%" }} />
  );
}
```

- `src={src}`는 변수의 값이고 `src="{src}"`는 중괄호까지 포함한 문자열이다.
- 중괄호는 tag의 child 위치와 attribute의 `=` 바로 뒤에서 expression을 받는다. `<{tag}>`로 tag 이름을 보간하지 않는다.
- 함수 호출, property 접근, 문자열 결합을 expression으로 쓸 수 있다. 길어지면 변수를 만들거나 helper로 분리한다.
- `style={{ ... }}`에서 바깥 중괄호는 expression 경계이고 안쪽은 JavaScript object literal이다. 별도의 이중 중괄호 문법이 아니다.
- inline style의 key도 `backgroundColor`처럼 camelCase다. style 사용을 React가 강제하지 않으며 고정된 style은 CSS class로 표현할 수 있다.
- object를 props나 style로 전달하는 것과 object 자체를 text child로 렌더링하는 것은 다르다. `<h2>{item}</h2>` 대신 필요한 `item.label` 같은 값을 선택한다.

## props는 읽기 전용 입력 snapshot

parent는 문자열, 숫자, object, array, 함수와 JSX를 props로 전달한다. component는 하나의 props object를 받고 `{ item, size }`처럼 구조 분해해서 읽을 수 있다. parent가 다음 render에서 다른 props를 주므로 props가 읽기 전용이라는 말은 값이 시간에 따라 바뀌지 않는다는 뜻이 아니다.

child는 받은 object나 array를 변경하지 않는다. 변경이 필요하면 callback으로 parent에 요청하고 owner가 다음 값을 만든다. props와 state 모두 이전 render의 값을 유지해야 독립적인 UI 계산이 가능하다.

default parameter는 prop이 없거나 `undefined`일 때만 적용한다. `size={null}`과 `size={0}`에는 `size = 80`이 적용되지 않는다. `awards` array를 받으면 개수는 `awards.length`로 계산하고 같은 의미의 `awardCount`를 따로 받지 않아도 된다.

숫자 size prop을 이미지 출력 크기로 쓰더라도 원본 이미지의 해상도까지 바뀌지는 않는다. 썸네일 API가 있다면 요청할 해상도를 size에서 계산해 component 안에 감출 수 있다. 화면 크기와 내려받는 이미지 크기를 구분해 작은 화면에 큰 파일을 보내거나 확대 시 흐려지는 일을 점검한다.

### children으로 내용 조합하기

```jsx
function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Summary() {
  return <Panel title="진행 현황"><p>완료한 항목이 없습니다.</p></Panel>;
}
```

tag 사이의 내용은 `children` prop으로 전달된다. wrapper는 내부 내용을 알 필요 없이 배치와 테두리 같은 역할을 담당하고, 호출부는 서로 다른 내용을 조합한다. 고정된 제목 규칙은 명시적인 `title`로 받고 바뀌는 내용은 children으로 받는 식으로 계약을 나눌 수 있다.

`<Avatar {...props} />`는 props를 한꺼번에 전달한다. 순수 forwarding wrapper에는 유용하지만 모든 component가 받은 값을 그대로 넘기기 시작하면 계약과 data 흐름이 잘 보이지 않는다. 필요한 입력을 명시하거나 children으로 조합할 수 있는지 먼저 확인한다.

## 이해 확인

1. 같은 component를 두 번 렌더링하고 title과 size를 각각 다르게 전달한다. data 차이와 markup의 공통 책임을 설명한다.
2. named export를 별도 파일로 옮기고 두 사용처의 import를 고친다. default export로 바꿨을 때 필요한 문법 변경도 확인한다.
3. `size`를 생략하거나 `undefined`, `null`, `0`으로 전달한다. default parameter가 적용되는 두 경우를 예측한다.
4. `<h2>{item}</h2>`, `src="{src}"`, `return` 뒤 줄바꿈의 오류를 구분한다. 각각 property 선택, expression 전달, 반환문 위치를 고친다.
5. Panel에 text, 이미지, 다른 component를 넣어 본다. wrapper 변경을 위해 각 내용 component까지 수정할 필요가 없는 이유를 설명한다.

## 출처

- [React, Describing the UI](https://react.dev/learn/describing-the-ui)
- [React, Your First Component](https://react.dev/learn/your-first-component)
- [React, Importing and Exporting Components](https://react.dev/learn/importing-and-exporting-components)
- [React, Writing Markup with JSX](https://react.dev/learn/writing-markup-with-jsx)
- [React, JavaScript in JSX with Curly Braces](https://react.dev/learn/javascript-in-jsx-with-curly-braces)
- [React, Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component)

## 관련 문서

- [[React-Core-Mental-Model|UI 갱신의 기본 흐름]]
- [[React-Conditional-and-List-Rendering|조건과 목록 구성]]
- [[React-Render-Purity-and-Trees|render 순수성과 tree]]
- [[React-Application-Design|component 경계와 state ownership]]
- [[React-Fragment-and-DOM-Groups|Fragment의 key, ref와 DOM 그룹 계약]]
- [[React-Legacy-Elements-and-Children|element 생성과 children 조작의 한계]]
- [[React-Rules-and-Call-Ownership|component를 JSX로 호출하는 이유]]
