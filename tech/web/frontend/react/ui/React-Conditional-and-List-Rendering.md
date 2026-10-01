---
tags: [web, frontend, react, jsx, key, list]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Conditional and List Rendering", "React 조건과 목록 렌더링"]
---

# React 조건과 목록 렌더링

React는 조건과 반복을 위한 별도 template language를 요구하지 않는다. JavaScript로 data를 선택하고 JSX description을 조합한다. JSX를 어디서 생성했는지보다 이번 render에서 어떤 component가 어느 위치와 key로 등장하는지가 UI identity에 중요하다.

## 조건 분기의 범위 선택

| 표현 | 쓰기 좋은 상황 |
|---|---|
| `if`와 서로 다른 `return` | component가 표시할 화면 전체가 달라짐 |
| `return null` | component가 이번 render에 UI를 반환하지 않음 |
| `cond ? a : b` | 같은 markup 안에서 두 내용 중 하나를 고름 |
| `cond && <Badge />` | 조건이 맞을 때 내용만 추가 |
| 변수에 JSX 저장 | 조건 계산과 markup을 분리해야 읽기 쉬움 |

```jsx
function TaskRow({ task }) {
  const label = task.done ? <del>{task.title}</del> : task.title;
  return (
    <li>
      {label}
      {task.priority > 0 && <small> (우선순위 {task.priority})</small>}
    </li>
  );
}
```

두 분기에서 `<li>`를 반복하기보다 공통 구조를 유지하고 바뀌는 부분만 선택하면 class나 접근성 attribute를 두 곳에서 수정하지 않아도 된다. 복잡한 중첩 삼항 연산자는 render 앞의 조건문, 의미 있는 변수나 child component로 옮긴다.

같은 조건에 따라 여러 label이 함께 바뀌면 각 attribute마다 삼항 연산자를 복제하지 않는다. 한 조건문에서 관련 값을 모으거나, 반복되는 data라면 type별 object에서 값을 선택한다. data table은 실제 반복이 있을 때 쓰고 한 조건을 위해 범용 renderer를 만들지는 않는다.

parent의 조건부 포함과 child의 `null` 반환은 의미가 다를 수 있다. child가 `null`을 반환해도 component 자체는 tree에 남아 state를 보존할 수 있다. parent가 해당 component를 제외하면 unmount되어 그 위치의 state가 사라진다. 호출부가 표시 여부를 통제하는 편이 계약을 읽기 쉬운 상황도 있다.

### `&&`가 돌려주는 값

`&&`는 boolean만 반환하는 연산자가 아니다. 왼쪽이 truthy면 오른쪽을, falsy면 왼쪽 값을 반환한다. React는 `false`, `null`, `undefined` child를 빈자리로 취급하지만 숫자 `0`은 표시한다.

```jsx
// count가 0이면 숫자 0을 표시한다.
count && <p>새 항목이 있습니다.</p>

// 조건을 boolean으로 만든다.
count > 0 && <p>새 항목이 있습니다.</p>
```

숫자 자체가 정보이면 `0` 표시가 맞을 수 있다. 내용의 유무를 판단하려는 조건이면 비교식으로 의도를 드러낸다.

## 배열에서 표시 목록 만들기

목록의 내용은 object와 array로, 반복되는 markup은 component로 표현한다. `filter`는 표시할 항목을 선택하고 `map`은 항목별 JSX를 만든다. 검색 결과가 원본과 조건에서 계산된다면 별도 state로 복제할 필요가 없다.

```jsx
function TaskList({ tasks }) {
  const openTasks = tasks.filter(task => !task.done);
  return (
    <ul>
      {openTasks.map(task => {
        return <TaskRow key={task.id} task={task} />;
      })}
    </ul>
  );
}
```

`task => (<TaskRow />)`는 expression을 암묵적으로 반환하지만 `task => { ... }`는 block body이므로 `return`이 필요하다. 중괄호만 추가하고 return을 빼면 결과가 `undefined`인 배열이 되어 항목이 표시되지 않는다.

같은 목록을 두 구역으로 나눌 때 간단한 조건이면 `filter` 두 번으로도 충분하다. 조건 계산 비용이 실제로 크면 한 번의 반복에서 분류하는 방식을 검토한다. 반복 markup은 `ListSection` 같은 실제 공통 component로 분리할 수 있다.

## key는 sibling 사이의 identity

key는 React가 이전 항목과 새 항목을 대응시키는 식별자다. 순서가 바뀌어도 같은 항목의 state를 따라가게 하려면 항목의 위치가 아닌 data identity를 사용한다.

- database data는 stable id를 쓴다.
- local data는 항목을 **생성할 때** counter나 `crypto.randomUUID()`로 id를 만들고 data에 저장한다.
- render마다 `Math.random()`이나 새 UUID로 key를 만들면 이전 key와 연결할 수 없어 component와 DOM이 다시 만들어지고 입력값을 잃을 수 있다.
- key는 같은 parent의 sibling 사이에서 고유하면 된다. 다른 목록에서 같은 id를 사용하는 것은 가능하다.
- key는 component props에 자동 전달되지 않는다. child가 id를 사용한다면 `key={task.id}`와 `taskId={task.id}`를 따로 전달한다.
- key는 주변 array가 직접 담는 element에 둔다. `tasks.map(task => <TaskRow key={task.id} ... />)`에서 TaskRow 내부의 `<li>`에만 key를 붙이는 것으로 대체할 수 없다.

index key는 앞쪽 항목 삭제, 삽입과 정렬에서 다른 data를 같은 위치의 component로 취급할 수 있다. 고정된 시의 행처럼 순서와 항목 identity가 바뀌지 않는 제한된 경우에는 index를 사용할 수 있다. 데이터가 바뀌는 목록에서 경고를 숨기려고 index를 넣는 것은 문제를 해결하지 않는다.

### 항목 하나가 여러 DOM node를 만드는 경우

```jsx
import { Fragment } from "react";

function SectionList({ sections }) {
  return sections.map(section => (
    <Fragment key={section.id}>
      <h2>{section.title}</h2>
      <p>{section.description}</p>
    </Fragment>
  ));
}
```

짧은 `<>...</>` 표기에는 key를 전달할 수 없으므로 명시적인 Fragment를 사용한다. Fragment는 DOM wrapper를 만들지 않는다. 실제 wrapper가 layout이나 의미상 필요하면 그 element에 key를 둘 수 있다.

### 중첩 목록과 구분선

중첩 `map`은 각 array의 key를 따로 판단한다. 바깥은 recipe id, 안쪽은 ingredient id처럼 각각의 sibling 범위를 기준으로 한다. ingredient 이름을 key로 쓰려면 같은 recipe에 중복된 이름이 없다는 data 조건이 필요하다.

paragraph 사이에 구분선을 넣으면 항목 하나에서 `<hr />`와 `<p>`를 함께 생성하게 된다. key가 있는 Fragment 안에서 `i > 0 && <hr />`로 첫 번째 구분선을 제외할 수 있다. 한 array에 두 node를 직접 추가한다면 `id + '-separator'`, `id + '-text'`처럼 두 key를 구분해야 한다.

## 이해 확인

1. `count`가 0일 때 두 `&&` 예시의 결과를 예측한다. 숫자 0이 표시되는 이유를 설명한다.
2. 할 일 목록을 완료, 미완료로 나누고 같은 TaskRow를 재사용한다. `map`의 block body에서 return을 제거하면 무엇이 사라지는지 확인한다.
3. 각 행에 local input을 두고 첫 행을 삭제하거나 정렬한다. id key와 index key에서 어느 data에 입력이 남아야 하는지 비교한다.
4. 목록의 component를 추출할 때 key를 안쪽 `<li>`로 옮기면 안 되는 이유를 설명한다.
5. 중첩 목록에서 같은 ingredient 이름이 두 번 들어오는 data를 만든다. 새로운 id가 필요한 sibling 범위를 찾는다.

## 출처

- [React, Conditional Rendering](https://react.dev/learn/conditional-rendering)
- [React, Rendering Lists](https://react.dev/learn/rendering-lists)
- [React, Tutorial: Tic-Tac-Toe](https://react.dev/learn/tutorial-tic-tac-toe)
- [React, Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)

## 관련 문서

- [[React-Components-and-JSX|JSX와 props의 입력 계약]]
- [[React-Render-Purity-and-Trees|tree와 render의 순수성]]
- [[React-State-Management|state 소유와 공유]]
- [[React-Application-Design|derived state와 이력 모델]]
- [[React-Fragment-and-DOM-Groups|그룹 identity와 Fragment ref]]
- [[React-Activity|UI를 숨기며 state를 보존하는 선택]]
