---
tags: [web, frontend, react, pure-function, strict-mode, render-tree]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Render Purity and Trees", "React render 순수성과 tree"]
---

# React render 순수성과 tree

render는 props, state와 context로 UI description을 계산하는 단계다. 같은 입력에서 같은 결과를 만들고 render 이전에 존재한 값을 바꾸지 않아야 다시 실행하거나 중단해도 외부에 잘못된 결과가 남지 않는다.

## render가 순수해야 하는 이유

module의 공유 변수에 현재 항목을 저장하고 다른 component가 그 변수를 읽으면, 여러 인스턴스가 서로의 data를 덮어쓴다. 실행 순서에 따라 결과가 달라지고 특정 child만 다시 렌더링했을 때 다른 항목을 표시할 수 있다. component 간 data 전달은 공유 변수 변경 대신 props나 context의 명시적인 흐름으로 표현한다.

```jsx
function Price({ unitPrice, quantity }) {
  const total = unitPrice * quantity;
  return <strong>{total}원</strong>;
}
```

위 계산은 total을 별도 state로 저장하지 않고 입력에서 도출한다. 관련 입력이 바뀌면 다음 render에서 새 값을 계산한다. 입력 object를 수정하거나 다른 component가 먼저 실행되기를 기다릴 필요가 없다.

순수성은 다음 동작을 가능하게 한다.

- server 등 다른 환경에서 같은 입력으로 UI를 계산한다.
- 입력이 그대로인 계산을 cache하거나 render를 생략할 근거를 만든다.
- 오래된 render를 중단하고 최신 입력으로 다시 계산해도 미완성 작업의 부작용이 남지 않는다.

이는 성능 최적화의 전제이며, 순수한 component를 작성했다고 자동으로 모든 render가 생략되거나 DOM 조작보다 빠르다는 보장은 아니다.

## 외부 mutation과 local mutation 구분

props로 받은 `stories.push(...)`나 `stories.sort()`는 기존 object를 바꾼다. render 때마다 가짜 항목을 추가하면 반복 실행할수록 표시 목록이 늘어난다. 고정된 추가 UI는 array를 건드리지 않고 따로 렌더링할 수 있다.

```jsx
function StoryTray({ stories }) {
  return (
    <ul>
      {stories.map(story => <li key={story.id}>{story.label}</li>)}
      <li>새 기록 만들기</li>
    </ul>
  );
}
```

반면 현재 호출에서 만든 새 배열에 `push`하는 것은 외부 입력이나 이전 render를 바꾸지 않는 local mutation이다. array method의 이름만 보고 순수성을 판단하지 않고 **변경한 대상이 언제, 어디서 만들어졌는지** 확인한다.

```js
const labels = stories.map(story => story.label);
labels.push("새 기록 만들기");
```

`slice`, `map`, `filter`는 새 배열을 만들지만 기존 object 원소까지 복사하지는 않는다. `const copy = stories.slice()` 뒤 `copy[0].label = ...`을 실행하면 공유된 기존 object가 바뀐다. 원소를 바꿀 때는 해당 object도 새로 만든다. `push`, `pop`, `sort`, `reverse`는 대상 배열 자체를 변경한다.

### idempotency와 변하는 외부 값

같은 props/state/context에도 `new Date()`와 `Math.random()`은 매 호출마다 다른 값을 만들 수 있다. 현재 시간을 입력으로 전달하거나, state initializer로 시작 snapshot을 만들고 필요한 timer를 Effect에서 연결/정리한다. initializer에서 얻은 시작값을 매 render 다시 계산하는 것과 구분한다.

화면 바깥에서 변하는 data를 render가 직접 읽어야 한다면 단순 module 변수 대신 subscription과 snapshot을 갖춘 external-store 계약을 검토한다. 순수성은 함수가 어떤 JavaScript built-in을 쓰는지보다 React가 다시 계산할 때 같은 입력을 안전하게 사용할 수 있는지의 문제다.

Hook 입력/반환과 JSX에 전달한 object의 불변성, component 호출 소유는 [[React-Rules-and-Call-Ownership]]로 연결한다.

### Strict Mode로 반복 실행 확인하기

Strict Mode는 개발 중 component render 함수를 추가로 호출해 입력 mutation 같은 순수성 위반을 드러낸다. 공유 counter를 render에서 증가시키거나 받은 array에 항목을 추가하는 코드는 두 번째 실행에서 다른 결과를 만들 수 있다.

반복 로그를 숨기는 것으로 해결하지 않는다. 같은 입력을 다시 줬을 때 이전 계산의 흔적이 남지 않는지 확인하고 외부 mutation을 제거한다. Strict Mode의 이 검사는 production 동작을 느리게 만드는 기능이 아니다.

Strict Mode의 재호출은 개발 검사이고, production에서도 React는 필요에 따라 render 계산을 다시 할 수 있다. 업무 동작이 component 함수의 실행 횟수에 의존하지 않도록 한다.

## 부작용을 놓는 위치

화면의 색상과 내용이 입력에서 도출되면 DOM을 직접 수정하지 않고 JSX의 `className`, `style`, child 값으로 반환한다. render 중 `document.getElementById(...).className = ...`을 수행할 필요가 없다.

사용자 클릭으로 저장하거나 state를 갱신하는 일은 event handler에서 수행한다. handler가 component 안에 정의되어 있어도 JSX에 전달만 했다면 render 시점에 실행되는 것은 아니다.

사용자 event가 아닌 외부 시스템과의 동기화가 필요하면 Effect를 검토한다. 파생값 계산을 Effect로 옮기는 대신 render에서 끝낼 수 있는지 먼저 본다. render 계산, 특정 event의 업무 동작과 외부 동기화를 각각 구분한다.

## render tree와 DOM tree

render tree는 **한 번의 render에서 실제로 렌더링한 component 사이의 parent, child 관계**를 나타낸다. root 가까이에는 화면 흐름을 조합하는 component가, 아래에는 child component가 없는 leaf가 놓인다. HTML tag까지 나타내는 DOM tree와는 관점이 다르다.

```jsx
function App() {
  return (
    <Panel>
      <Result />
    </Panel>
  );
}

function Panel({ children }) {
  return <section>{children}</section>;
}
```

이 구성의 component render tree는 `App → Panel → Result`다. `<section>`은 browser DOM에 존재하지만 위 component 관계도의 별도 component node로 표현하지 않는다. 같은 component가 여러 번 등장하면 각 사용 위치를 별도로 생각한다.

조건부 rendering에서 입력이 달라지면 branch도 바뀐다. `kind === 'text' ? <Text /> : <Image />`는 한 render에서 Text나 Image 중 하나가 나타난다. state가 어느 component 아래에 있고 변경이 어디로 전달되는지, 어떤 상위 render가 넓은 하위 계산으로 이어지는지를 볼 때 이 tree를 사용한다. 실제 비용은 profiler로 확인한다.

## module dependency tree

module dependency tree는 file 사이의 import 관계를 나타낸다. node는 component가 아닌 module이고, data와 helper만 담긴 file도 포함한다. 실제 의존성은 여러 file이 같은 module을 import할 수 있는 그래프로도 이해할 수 있다.

위 예시를 파일로 나누어 App이 Panel과 Result를 import하면 import 관계는 아래와 같다.

```text
App.js
├─ Panel.js
└─ Result.js
```

Result는 render tree에서 Panel의 child이지만 Panel.js가 Result.js를 import할 필요는 없다. App이 JSX를 children으로 전달하고 Panel이 그 내용을 렌더링하기 때문이다. **누가 import했는지와 누가 화면에서 렌더링하는지는 다를 수 있다.**

bundler는 module 의존성을 따라 필요한 code를 찾는다. 큰 초기 bundle의 원인을 조사할 때는 render tree보다 import 경로와 실제 build 결과를 본다. 조건부로 화면을 숨겼다는 사실만으로 그 module의 code가 초기 다운로드에서 빠진다고 판단하지 않는다.

| 확인할 문제 | 먼저 볼 관계 |
|---|---|
| 두 UI가 서로의 data를 표시 | render 입력과 공유 변수 mutation |
| 상위 state가 바뀔 때 계산 범위가 커짐 | render tree와 profiler |
| 한 화면의 초기 JavaScript가 큼 | module dependency와 bundle 결과 |
| wrapper가 특정 child 구현에 결합 | children 전달과 실제 import 관계 |

## 이해 확인

1. props array에 `push`한 구현과 추가 UI를 별도로 반환한 구현을 같은 입력으로 두 번 실행한다. 원본 길이가 그대로인 쪽을 찾는다.
2. 얕게 복사한 array의 첫 object를 수정하면 원본도 바뀌는 이유를 설명하고 변경할 object도 복사한다.
3. 시간대에 따른 class를 render 중 DOM에 쓰는 코드 대신 `time` prop에서 className을 계산한다.
4. App, Panel, Result의 render 관계와 import 관계를 각각 그린다. children으로 전달했을 때 두 관계가 달라지는 지점을 찾는다.
5. 화면의 무거운 component를 조건부로 숨긴 뒤 build 결과를 확인한다. 표시되지 않는 UI와 다운로드되지 않는 module을 구분한다.

## 출처

- [React, Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- [React, Understanding Your UI as a Tree](https://react.dev/learn/understanding-your-ui-as-a-tree)
- [React, Describing the UI](https://react.dev/learn/describing-the-ui)
- [React, Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure)

## 관련 문서

- [[React-Components-and-JSX|module 경계와 children 조합]]
- [[React-Conditional-and-List-Rendering|조건에 따라 달라지는 UI]]
- [[React-State-Effects-and-Events|event와 외부 동기화]]
- [[React-Application-Design|component tree와 state ownership]]
- [[React-Rules-and-Call-Ownership|호출 소유와 불변 입력]]
- [[React-Development-Checks|StrictMode의 Effect/ref 검사와 root 범위]]
