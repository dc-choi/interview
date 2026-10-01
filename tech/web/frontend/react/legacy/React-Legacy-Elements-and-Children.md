---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React legacy element와 children 조작

## Children 계약

children은 opaque React data structure다. 항상 array라고 가정하지 않고 기존 코드를 읽을 때 Children API의 순회 범위를 확인한다. component의 렌더링 결과를 조회하는 DOM introspection 도구가 아니다.

| API | 입력과 callback | 반환 |
|---|---|---|
| `Children.count(children)` | 받은 children | node 수 |
| `Children.forEach(children, fn, thisArg?)` | fn(child, index), optional callback this | undefined |
| `Children.map(children, fn, thisArg?)` | fn(child, index)가 React node/array 반환 | flat 결과 배열, input null/undefined면 그대로 |
| `Children.only(children)` | 하나의 valid React element | 그 element, 그 외에는 throw |
| `Children.toArray(children)` | children 구조 | flat array, 빈 node 제외, key 계산 |

count와 callback 순회에는 null/undefined/boolean, 문자열, 숫자, element가 각각 node로 포함된다. array 자체는 세지 않고 원소를 순회한다. React element 내부나 Fragment 내부까지 들어가지는 않는다. `<MoreRows />`가 열 행을 반환해도 API에는 **하나의 전달된 element**다.

map callback이 반환한 null/undefined는 결과에서 빠지지만 boolean은 남을 수 있다. 예를 들어 `Children.map([<i />], () => false)`는 `[false]`다. 기존 child key와 새 반환 key를 조합한다. callback에서 배열을 반환할 때 local key가 서로 고유하면 된다. only는 한 원소 배열도 throw한다. 단일 element를 강제하는 API이지 배열 길이 1을 검사하는 API가 아니다. toArray는 null/undefined/boolean을 제외하고 nesting/위치와 원래 key를 반영해 flattening 후 identity를 유지한다.

```jsx
function Reversed({ children }) {
  const nodes = Children.toArray(children);
  return nodes.reverse();
}
```

여기서는 새 배열을 바꾸지만 child element나 그 props는 바꾸지 않는다. Children.forEach는 legacy 계약을 설명하기 위한 API 목록이며, 신규 예제는 map이나 explicit data array를 우선한다.

## createElement 계약

`createElement(type, props, ...children)`는 JSX 없이 React element description을 생성한다. type은 host tag 문자열, function/class component나 Fragment 같은 special component이고 props는 object 또는 null이다. null은 빈 props와 같다. children은 React node들을 받는다.

```jsx
const heading = createElement('h2', { className: 'title' }, '안내');
const page = createElement(Page, { title: '안내' });
```

반환 element는 화면 DOM이나 component instance가 아니며 생성만으로 render되지 않는다. key는 React identity를 위한 값으로 문자열화되고 child의 일반 props로 전달하지 않는다. ref/element 내부 field는 버전 민감 구현에 의존해 직접 조작하지 않고 React에 전달한다. JSX의 `<Page />`는 component type을, 소문자 `<page />`는 tag 문자열을 사용한다.

element와 props를 생성 후 immutable로 다룬다. 개발 중 shallow freeze될 수 있으며 내부 object까지 모두 깊게 불변화하는 runtime validation은 아니다. 동적 children은 `createElement('ul', null, items.map(...))`처럼 배열 전체를 넘겨 missing key 검사를 유지한다. 고정 children만 여러 인자로 펼친다. 새 UI의 기본은 JSX지만 JSX를 사용할 수 없는 환경에서 이 계약이 유용하다.

## cloneElement 계약

`cloneElement(element, props, ...children)`는 valid React element를 바탕으로 새 element를 만든다. 원본을 바꾸지 않으며 type은 같고 props는 **얕게 병합**한다. props object 값이 기존 값보다 우선하고 null이면 기존 props를 유지한다. props.key/ref를 주면 원래 key/ref를 교체한다.

```jsx
const row = <Row title="기록" options={{ compact: true, tone: 'light' }}>내용</Row>;
const selected = cloneElement(row, { selected: true });
const replaced = cloneElement(row, { options: { tone: 'dark' } }, '다른 내용');
```

selected는 기존 children을 유지하지만 replaced는 children을 교체한다. options는 deep merge되지 않아 compact가 자동 유지되지 않는다. children 인자를 아예 생략하는 것과 null을 넘겨 비우는 것은 다르다. 동적 child 배열은 세 번째 인자로 전체를 넘겨 key 경고를 유지한다.

기존 child의 onClick/ref를 새 값으로 덮으면 원래 동작이 사라질 수 있다. cloneElement는 implicit prop injection이라 원래 JSX만 보고 실제 data 흐름을 이해하기 어렵다. Children.map과 함께 사용해도 component가 반환할 node까지 검사할 수 없다.

## isValidElement 계약

`isValidElement(value)`는 임의 값을 받아 **React element인가**만 boolean으로 반환한다. JSX와 createElement/cloneElement 결과는 true다. 문자열, 숫자, null, array, component 함수 자체, portal은 false다.

```jsx
isValidElement(<Row />); // true
isValidElement(Row); // false
isValidElement(42); // false, 하지만 렌더링 가능한 React node
isValidElement([<Row key="a" />]); // false
```

React node와 element를 구분한다. isValidElement는 렌더링 가능성, DOM 존재, component props runtime schema를 검사하지 않는다. cloneElement처럼 element만 받는 API를 호출하기 전 확인하는 제한된 경우에 사용한다.

## explicit composition으로 migration

legacy 목록은 현재 export되는 API지만 새 코드에는 개별 대안을 먼저 쓴다. Children/cloneElement로 숨겨진 협력을 만들기보다 아래 기준으로 선택한다.

| 의도 | 우선 대안 | 얻는 명시성 |
|---|---|---|
| 각 항목을 같은 wrapper로 표시 | Row/RowList component를 각각 export | 추출 component 안에서도 wrapper 유지 |
| 순서/개수/metadata를 조작 | rows/tabs object array prop | length, filter, map과 stable id를 직접 사용 |
| owner가 선택 상태를 결정, caller가 UI 선택 | render prop(item, selected) | 추가 data의 전달 위치가 보임 |
| 멀리 떨어진 child에 공통 data | context provider와 consumer | child cloning 없이 읽기 scope 정의 |
| non-visual selection 로직 공유 | custom Hook 반환으로 UI 구성 | 상태 로직과 render를 분리 |

```jsx
function RowList({ rows, renderRow }) {
  return rows.map((row, index) => (
    <Fragment key={row.id}>{renderRow(row, index)}</Fragment>
  ));
}
```

render prop은 일반 callback이며 callback 자체에 Hook을 호출하지 않는다. children prop으로 내용을 조합하는 것은 권장되는 일반 패턴이고 capital Children로 내용을 변형하는 것과 다르다.

## 이해 확인

1. children에 null, text, Fragment, MoreRows를 넘겨 count와 toArray 길이를 예측한다.
2. Children.only에 `<Row />`와 `[<Row />]`를 전달할 때 차이를 설명한다.
3. cloneElement의 shallow override로 options field와 onClick이 사라질 수 있는 경우를 찾는다.
4. 렌더링 가능한 숫자가 isValidElement에는 false인 이유를 설명한다.
5. Children.map 구현에서 MoreRows를 추출해도 행 wrapper가 유지되도록 explicit composition으로 바꾼다.

## 출처

- [React, Children](https://react.dev/reference/react/Children)
- [React, createElement](https://react.dev/reference/react/createElement)
- [React, cloneElement](https://react.dev/reference/react/cloneElement)
- [React, isValidElement](https://react.dev/reference/react/isValidElement)

## 관련 문서

- [[React-Components-and-JSX]]
- [[React-Context-Creation]]
- [[React-Rules-and-Call-Ownership]]
