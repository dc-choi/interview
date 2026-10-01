---
tags: [web, frontend, react, state, localstorage, persistence]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Local State", "React localStorage 영속화"]
---

# React 지역 state와 localStorage 영속화

## component의 기억으로서 state

state는 component가 render 사이에 보관하고 UI에 반영할 값이다. component 본문의 `let index = 0`은 다음 render에서 다시 초기화되고, 값을 바꿔도 React에 render를 요청하지 않는다. `useState`는 기억한 값과 변경을 요청하는 setter를 함께 제공한다.

```jsx
const [index, setIndex] = useState(0);
const [showMore, setShowMore] = useState(false);
```

첫 render에서 index는 0이고 setter로 1을 요청한 다음 render에서는 1을 받는다. 같은 `useState(0)` 줄이 다시 실행되더라도 이미 유지 중인 state를 0으로 덮어쓰지 않는다. 자세한 update 시점은 [[React-State-Updates#state는 render의 snapshot|state snapshot]]과 [[React-State-Updates#batching과 update queue|update queue]]를 따른다.

- state는 화면의 component instance별로 격리된다. `<Gallery />` 두 개는 각자 index와 showMore를 가진다. module 전역 변수로 대체하면 이 격리가 사라진다.
- parent는 child의 지역 state를 직접 읽거나 바꾸지 않는다. 동기화가 필요하면 [[React-State-Management#공통 parent로 state 올리기|공통 parent]]로 owner를 옮긴다.
- index와 상세 표시처럼 독립적인 값은 분리할 수 있다. 함께 변해야 할 값과 중복 값은 [[React-State-Structure#state 구조의 다섯 원칙|state 구조]]를 먼저 검토한다.
- 일반 `useState` Hook은 component/custom Hook 최상위에서 같은 순서로 호출한다. 조건문 안이나 조건부 early return 뒤에 두면 Hook 수가 달라질 수 있다.
- 한 handler 안에서만 필요한 prompt 결과나 계산값은 지역 변수로 충분하다. render 사이에 기억할 필요가 없는 값까지 state로 만들지 않는다.

갤러리의 다음/이전 index는 목록 끝에서 벗어나지 않게 검사하고, `hasNext`, `hasPrev`를 button의 disabled와 handler guard에 함께 쓸 수 있다. collection이 비었을 때 표시와 선택값도 따로 정한다.

### initializer의 비용과 저장할 함수

`useState(createInitialData())`는 결과를 한 번만 저장해도 JavaScript가 createInitialData를 매 render 호출한다. 순수한 비싼 계산이면 `useState(createInitialData)` 또는 `useState(() => createInitialData(input))`로 initializer를 넘긴다. 개발 Strict Mode가 initializer를 추가 호출할 수 있으므로 요청이나 전역 mutation을 넣지 않는다.

함수 자체를 기억하려면 `useState(() => handler)`와 `setHandler(() => nextHandler)`로 감싼다. 그냥 function을 넘기면 initializer/updater로 실행된다. 전체 호출과 반환 계약은 [[React-State-Hook-Contracts#useState 계약|useState]]를 따른다. 아래 localStorage 예제는 browser 저장소의 읽기/오류 경계를 다루는 별도 사례이며 모든 initializer에 외부 작업을 넣으라는 뜻이 아니다.

## 선택과 draft 분리

작은 편집 application도 item collection, 현재 선택과 draft를 분리하면 state 오류를 줄일 수 있다. 화면에서 계산 가능한 값은 중복 저장하지 않고 stable id로 관계를 표현한다.

```typescript
type Memo = { id: string; title: string; body: string; updatedAt: string };

type MemoState = {
  memos: Memo[];
  selectedId: string | null;
};
```

선택 위치를 array index로 저장하면 앞 item 삭제와 정렬 뒤 다른 item을 가리킬 수 있다. `selectedId`를 저장하고 현재 item은 render 중 `find`로 계산한다. 빈 목록에서는 `null` 상태를 명시한다.

## immutable update

React state의 object와 array는 읽기 전용 snapshot으로 다룬다.

```jsx
setMemos(current => current.map(memo =>
  memo.id === edited.id ? { ...memo, body: nextBody } : memo
));
```

원본 array나 item을 mutation한 뒤 같은 reference를 setter에 넘기면 update가 누락되거나 이전 snapshot까지 바뀔 수 있다. 추가, 수정, 삭제를 reducer action으로 모으면 선택 fallback과 같은 invariant를 한곳에서 검사할 수 있다.

Event propagation도 state 설계와 분리한다. 행 click은 선택, 내부 삭제 button은 삭제라면 button에서 propagation을 막을 수 있지만 keyboard와 accessible name도 함께 제공한다.

object의 변경 경로 copy, array 내부 object와 Immer draft의 경계는 [[React-State-Updates#object는 변경한 경로를 복사한다|immutable update]]에 있다.

## draft 보존과 초기화의 범위

같은 위치의 editor는 선택 prop만 바뀌어도 지역 draft가 남을 수 있다. 선택 대상이 달라질 때 초기화하려면 `key={selectedId}`로 subtree identity를 바꾼다. 대상별 draft를 다시 복구하려면 parent에 `draftsById`를 두고 지역 editor가 제거되어도 parent의 draft를 유지한다. key 자체는 제거된 draft를 보관하지 않는다([[React-State-Structure#tree 위치와 key로 state 수명 정하기|state 수명]]).

tree에 둔 state는 해당 owner가 제거될 때, browser 저장소의 data는 저장소 수명과 폐기 정책에 따라 사라진다. route 이동 후 복구, reload 후 복구, browser 종료 후 복구를 서로 다른 요구로 확인한다. 선택 대상별 storage key와 schema를 정하지 않으면 이전 대상의 draft를 잘못 복원할 수 있다.

## localStorage와 sessionStorage 경계

`localStorage`는 origin별 string key/value 저장소이며 browser session을 넘어 남을 수 있다. JSON 직렬화가 Date, class, `undefined`와 cyclic object를 보존하지 않는다는 점을 고려한다.

Web Storage는 cookie와 달리 요청마다 server로 전송되지 않는다([[Web-Service-Structure|cookie와 Web Storage]]). 두 저장소는 공유 범위와 수명이 다르다.

| 저장소 | 공유 범위 | 수명 | 맞는 용도 |
|---|---|---|---|
| `localStorage` | 같은 origin의 모든 tab과 window | 만료 없음. private browsing에서는 마지막 private tab을 닫을 때 삭제 | 다음 방문에도 남길 memo와 설정 |
| `sessionStorage` | origin과 tab(top-level browsing context) | reload와 복원에는 남고 tab을 닫으면 삭제 | tab별 임시 draft와 단계 진행 |

새 tab이나 window에서 page를 열면 새 session이 시작된다. opener가 있으면 처음에는 opener의 `sessionStorage` 복사본을 받지만 이후 변경은 서로 독립이다.

두 저장소 모두 key와 value를 문자열로 저장한다. object를 그대로 `setItem`하면 `"[object Object]"`만 남으므로 저장할 때 `JSON.stringify`, 읽을 때 `JSON.parse`를 쓰고 key가 없으면 `getItem`이 `null`을 반환하는 경우를 처리한다. 추가, 수정과 삭제마다 `setItem`을 반복하지 말고 직렬화, schema version과 validation을 storage module 한곳에 모은다.

```jsx
const [memos, setMemos] = useState(() => {
  try {
    const raw = localStorage.getItem("memos:v2");
    return raw === null ? [] : parseAndValidate(raw);
  } catch {
    return [];
  }
});
```

- 읽기와 쓰기는 synchronous이므로 큰 payload와 잦은 저장은 main thread를 막을 수 있다.
- quota, privacy mode, disabled storage와 잘못된 JSON 때문에 API가 실패할 수 있다.
- client JavaScript가 읽을 수 있으므로 access token과 민감 정보 저장소로 사용하지 않는다.
- schema version과 runtime validation을 두고 오래된 값의 migration 또는 폐기 정책을 정한다.
- SSR 환경에서는 `window`와 `localStorage`가 없으므로 client boundary에서 접근한다.
- Chrome DevTools의 Application > Storage > Local Storage에서 현재 origin의 값을 보고 편집, 삭제할 수 있다. 손상된 값이나 migration 상황을 재현할 때 쓴다.

저장을 debounce한다면 unmount만으로는 대기 중인 timer가 취소되지 않으므로 Effect cleanup에서 timer를 정리한다. cleanup이 timer를 취소하거나 page가 닫히면 마지막 변경이 저장되지 않을 수 있으므로, 해제 시점에 바로 저장할지 버릴지 정한다([[Browser-Main-Thread#debounce와 throttle|debounce와 throttle]]). `useCallback` 자체는 debounce가 아니다. debounce된 함수는 만들 때마다 자기 timer를 closure에 가지므로, component 본문에서 render마다 다시 만들면 호출마다 다른 timer가 생겨 호출이 묶이지 않는다. instance를 한 번만 만들어 `useRef` 등으로 유지하고 최신 값은 인자로 넘기거나, 값이 바뀔 때마다 Effect에서 `setTimeout`을 걸고 cleanup에서 지우는 방식으로 대신한다. 여러 tab 동기화가 필요하면 `storage` event를 처리하되 같은 document의 write에는 해당 event가 발생하지 않는다는 점을 고려한다.

IndexedDB, server 저장과 conflict resolution이 필요한 규모라면 localStorage를 임시 database처럼 확장하지 않는다.

## 관련 문서

- [[React-State-Effects-and-Events|State와 Effect]]
- [[React-Application-Design|React application 설계]]
- [[React-State-Updates|state snapshot과 immutable update]]
- [[React-State-Structure|state 구조와 수명]]
- [[OAuth2|Browser token 저장 경계]]

## 출처

- [React, State: A Component's Memory](https://react.dev/learn/state-a-components-memory)
- [React, useState](https://react.dev/reference/react/useState)
- [React, Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React, Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
- [React, Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- [React, Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects#putting-it-all-together)
- [WHATWG HTML, Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html)
- [MDN, Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [MDN, Window.sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
- [MDN, Storage.setItem()](https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem)
- [Chrome DevTools, View and edit local storage](https://developer.chrome.com/docs/devtools/storage/localstorage)
- IT Share, [Memo project 설계](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161787)
- IT Share, [기본 component 구현](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161788)
- IT Share, [Memo 수정과 선택](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161789)
- IT Share, [Memo 추가](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161790)
- IT Share, [Memo 삭제](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161791)
- IT Share, [localStorage 영속화](https://www.inflearn.com/courses/lecture?courseId=331070&unitId=161792)
