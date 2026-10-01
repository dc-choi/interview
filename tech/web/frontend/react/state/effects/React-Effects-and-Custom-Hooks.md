---
tags: [web, frontend, react, effect, synchronization, custom-hook]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Effects and Custom Hooks", "React 외부 시스템 동기화"]
---

# React Effect와 외부 시스템 동기화

## render, event와 Effect의 책임

`useEffect`는 component를 network, browser API, subscription과 React 밖 widget에 동기화한다. 화면 조건에 맞춰 외부 시스템을 시작하고, 조건이 달라지거나 화면에서 사라지면 이전 작업을 정리한다. class lifecycle method를 시간순으로 옮기기보다 독립적인 동기화 과정을 정의한다.

| 로직 | 실행의 원인 | 예시 |
|---|---|---|
| render | props/state에서 UI 계산 | 검색 결과 필터, 합계, 제출 가능 여부 |
| event handler | 특정 사용자 action | 구매 요청, 제출, 메시지 전송 |
| Effect | 현재 화면 조건과 외부 시스템 동기화 | 선택한 채팅방 연결, URL의 검색 결과 조회 |

메시지 입력이 바뀌었다는 이유로 메시지를 보내지는 않는다. 반면 선택한 방에 연결하는 작업은 직접 click, URL 진입과 뒤로 가기 중 어느 경로로 화면이 나타났는지와 관계없이 필요하다. 이 차이가 event와 Effect를 나누는 기준이다.

## 동기화와 cleanup

`useEffect(setup, dependencies?)`는 undefined를 반환하고 setup만 cleanup 함수를 반환할 수 있다. setup 자체를 async로 만들어 Promise를 반환하지 않는다. DOM/dialog/widget의 구체적인 수명과 hydration 첫 output의 계약은 [[React-Effect-Hook-Contracts#useEffect 계약|useEffect 계약]]에 있다. paint 전에 필요한 측정과 runtime style 삽입은 [[React-Layout-and-Insertion-Effects|layout/insertion Effect]]로 나눈다.

```jsx
import { useEffect } from 'react';
import { createConnection } from './chat.js';

const ChatRoom = ({ serverUrl, roomId }) => {
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [serverUrl, roomId]);
  return <h1>{roomId}</h1>;
};
```

component는 mount/update/unmount하지만 Effect는 동기화 시작/중단을 반복한다. `general`에서 `travel`로 바뀌면 새 UI를 commit한 후 이전 Effect의 cleanup으로 general 연결을 끊고 새 Effect로 travel에 연결한다. cleanup은 최신 방의 값을 추측해 정리하지 않고, 해당 실행에서 만든 connection을 닫는다. 같은 dependency면 이전 연결을 유지하고 Effect를 다시 실행하지 않는다.

### dependency 배열의 세 형태

| 형태 | 동작 | 주의 |
|---|---|---|
| 생략 | 매 commit 뒤 실행 | 입력처럼 관계없는 state 변경에도 실행될 수 있다 |
| `[]` | 해당 mount에서 시작, unmount에서 정리 | 앱 전체에서 한 번이라는 뜻이 아니다. 개발 Strict Mode는 추가 setup/cleanup을 검사한다 |
| `[a, b]` | 처음 시작하고, `Object.is`로 비교한 값이 달라지면 재동기화 | 이전 실행을 정리한 후 새 값으로 시작한다 |

Effect는 commit 뒤 실행된다. 상호작용이 원인이 아니면 보통 paint 뒤 실행되지만, 상호작용으로 시작된 Effect는 paint 전에 실행될 수 있다. `useEffect`를 화면이 그려진 후라는 절대 시점 보장으로 쓰지 않는다.

개발 Strict Mode의 `setup → cleanup → setup`에서도 최종 활성 연결이나 timer가 하나여야 한다. `didRun` ref로 두 번째 실행을 막으면 정리되지 않은 자원과 실제 재진입 문제를 가린다. Effects는 server rendering에서 실행되지 않는다.

| 외부 작업 | 정리 계약 |
|---|---|
| connection 시작 | 같은 connection 닫기 |
| listener/subscription 등록 | 같은 handler로 해제 |
| interval/timeout 예약 | 해당 id 취소 |
| dialog 열기 | 해당 dialog 닫기 |
| animation 시작 | animation 중단 또는 초기 상태 복원 |
| async 조회 | 더 이상 필요한 결과가 아니면 반영하지 않기, 가능하면 요청 취소 |
| widget 값 설정 | 같은 값을 다시 넣어도 결과가 같은 API면 cleanup이 필요하지 않을 수 있다 |

`addEventListener`와 `removeEventListener`에 별도로 만든 arrow를 넘기면 해제가 일치하지 않는다. `[value]` Effect에서 listener를 해제하지 않으면 value가 바뀔 때마다 handler가 쌓인다. cleanup이 필요한지는 외부 API의 자원과 재실행 계약에서 판단한다.

Effect가 state를 바꾸고 그 state 변경이 다시 dependency를 바꾸면 반복 실행이 생길 수 있다. 조회 입력(id, 검색어)을 dependency로 두고, 조회 결과로 만든 object/array state를 불필요하게 다시 요청의 dependency에 넣지 않는다. dependency 배열 생략과 무조건적인 setter가 결합된 경우도 확인한다.

화면이 나타나면 input을 focus하는 작업은 DOM ref를 Effect에서 읽는다. `shouldFocus`가 있다면 Hook은 최상위에서 호출하고 Effect 안에서 `if (shouldFocus)`를 검사한다. dependency는 `[shouldFocus]`다. 매 render마다 focus를 빼앗아 사용자의 다른 입력을 방해하지 않는지 확인한다.

## 조회의 race condition

검색어와 page에 맞는 결과를 유지하는 조회는 현재 화면 조건에 대한 동기화다. URL 복원이나 뒤로 가기로도 조건이 바뀌므로 typing handler에만 조회를 넣으면 모든 경로를 처리하지 못할 수 있다. 요청 순서와 응답 완료 순서는 다를 수 있다.

```jsx
useEffect(() => {
  let ignore = false;
  setError(null);
  fetchResults(query, page).then(
    result => { if (!ignore) setResults(result); },
    error => { if (!ignore) setError(error); }
  );
  return () => { ignore = true; };
}, [query, page]);
```

query A를 요청한 뒤 B를 요청하고 B가 먼저 끝나도, A 실행의 `ignore`는 cleanup에서 true가 되어 B 결과를 덮어쓰지 않는다. 각 Effect 실행마다 별도의 flag가 있다. 성공뿐 아니라 오류 반영에도 같은 유효성 조건을 적용한다. 이것은 응답 반영을 막는 예시이며 loading UI와 이전 결과를 유지할지는 별도 계약이다.

`AbortController`로 불필요한 요청을 취소할 수 있지만 응답 뒤의 비동기 변환까지 취소하는 것은 아니다. 현재 실행의 결과인지 확인하는 경계도 필요하다. 개발의 추가 요청을 ref로 숨기지 않는다. 요청 중복 제거와 cache가 필요하면 framework의 조회 기능이나 client cache를 검토한다.

직접 Effect 조회는 server HTML에 데이터가 없고, 부모 조회가 끝난 뒤 자식 조회가 시작되는 waterfall을 만들기 쉽다. 재방문 cache, preload, 오류/로딩 처리도 직접 담당한다. [[React-Server-State-and-API|server state와 API]]의 query/mutation 경계와 함께 판단한다.

## 불필요한 Effect 제거

외부 시스템이 없고 React 내부 값을 맞추는 용도라면 우선 render 계산이나 event 처리로 바꿀 수 있는지 확인한다. Effect로 파생 state를 갱신하면 이전 값으로 render/commit한 뒤 다시 render하는 중간 상태와 추가 동기화 책임이 생긴다.

### 파생 값과 비싼 계산

```jsx
const fullName = `${firstName} ${lastName}`;
const activeTodos = todos.filter(todo => !todo.completed);
const visibleTodos = showActive ? activeTodos : todos;
const remainingCount = activeTodos.length;
```

각 결과를 따로 state에 저장하지 않는다. 실제로 비싼 순수 계산이면 `useMemo(() => getVisibleTodos(todos, filter), [todos, filter])`로 cache할 수 있다. `useMemo` 계산도 render 중 실행되므로 side effect를 넣지 않는다. 처음 계산 비용을 줄이지는 않는다.

production build와 사용자에 가까운 device 또는 CPU throttling으로 비용을 측정하고 변경 뒤 다시 비교한다. development Strict Mode의 추가 render를 production 비용으로 해석하지 않는다. 새 항목의 입력 state를 작은 자식 form에 두면 입력 때 부모 목록 계산 자체가 실행되지 않을 수도 있다. React Compiler를 쓰는 프로젝트라면 자동 memoization도 고려한다.

### prop 변경에 따른 초기화와 부분 조정

| 의도 | 우선 선택 |
|---|---|
| 사용자 변경 시 그 아래 draft 전체 초기화 | `<Profile key={userId} userId={userId} />`처럼 identity를 바꾼다 |
| 선택 항목이 목록에서 사라지면 선택 없음 | selectedId만 state에 두고 `items.find(...) ?? null`을 계산한다 |
| 일부 state만 새 prop에 맞춰 조정 | 계산/key로 해결할 수 없는지 먼저 확인한다 |

부분 조정이 정말 필요하면 이전 입력과 다른지 확인한 조건 안에서 **현재 component 자신의 state만** render 중 조정할 수 있다. React는 반환한 JSX를 버리고 즉시 render를 재시도하므로 자식이 오래된 선택 값으로 commit되는 것을 피한다.

```jsx
const [prevItems, setPrevItems] = useState(items);
if (items !== prevItems) {
  setPrevItems(items);
  setSelection(null);
}
```

조건이 없으면 반복 render가 생긴다. 다른 component의 state 변경이나 DOM 조작, timeout 같은 side effect를 이 방법에 섞지 않는다. 배열 identity 변경마다 selection을 비우는 계약이 맞는지도 확인한다. selectedId 기반 계산은 목록이 갱신돼도 같은 항목의 선택을 유지한다는 점에서 결과가 다르다.

### event와 데이터 흐름으로 해결하기

| 문제 | 처리 방식과 이유 |
|---|---|
| 여러 버튼에서 장바구니 추가 알림 | 공통 함수를 각 handler에서 호출한다. 복원된 cart state로 재진입 알림을 만들지 않는다 |
| 회원 등록/메시지 전송/구매 POST | 해당 submit/click handler에서 보낸다. 감사 화면 등장이나 boolean 변화로 전송을 추론하지 않는다 |
| 카드 state에서 점수, 라운드, 종료 state로 Effect 연쇄 | 계산 가능한 종료 여부는 render에서, 다음 state는 action handler나 reducer에서 함께 계산한다 |
| 자식 state 변경을 부모에 알림 | 같은 event에서 state와 `onChange(nextValue)`를 갱신하거나 부모가 state를 소유한다 |
| 부모도 필요한 데이터를 자식 Effect가 전달 | 부모가 조회하고 아래로 전달한다. 데이터 소유 위치를 맞춘다 |
| 외부 mutable store의 snapshot 구독 | `useSyncExternalStore`와 [[React-Custom-Hooks#외부 store 구독을 전용 API로 구현하기\|목적별 Hook]]을 검토한다 |

state setter 뒤 같은 handler에서 읽는 값은 여전히 이전 snapshot이다. 다음 라운드 계산이 필요하면 `const nextRound = round + 1`로 명시한다. 연쇄 select의 network 요청은 외부 동기화이므로 React 내부 계산의 Effect 연쇄와 다르다.

### 앱 초기화와 분석 로그

앱 부팅마다 한 번 필요한 초기화는 component mount와 분리한다. browser entry point나 root module에서 실행하고, server에서도 import되는 module이면 browser API 사용 여부를 구분한다. module 최상위 작업은 해당 component를 render하지 않아도 import 시 실행되므로 임의의 component에 흩어 두지 않는다.

방문 분석은 화면/URL 등장에 따른 Effect가 될 수 있다. 개발 Strict Mode와 파일 수정으로 추가 호출될 수 있으므로 개발 로그를 운영 지표에 섞지 않는다. 실제 재방문과 remount까지 중복되지 않는다는 보장은 없으며 집계 계약을 별도로 확인한다. 실제 viewport 노출이 목적이면 Intersection Observer 같은 노출 기준을 고려한다.

## 독립적인 과정과 Hook 연결

연결과 방문 로그는 서로 독립적인 과정이다. 나중에 연결 dependency에 serverUrl이 추가됐다는 이유로 방문 로그까지 다시 보내면 안 된다. 행성 목록 조회와 선택한 행성의 장소 조회도 분리한다. 코드가 비슷하다는 이유로 Effect를 합치지 않고 [[React-Custom-Hooks|custom Hook]]으로 재사용한다.

reactive value, 객체/함수 dependency와 최신 값 읽기의 구체적인 조정은 [[React-Effect-Dependencies-and-Events|dependency와 Effect Event]]를 따른다. ref/DOM 경계는 [[React-Refs-and-DOM|ref와 DOM]]에서 다룬다.

## 이해 확인

1. Strict Mode에서 매초 counter가 2씩 증가하면 무엇을 수정하는가? interval 생성과 `clearInterval` cleanup을 짝짓는다. 추가 실행을 숨기는 ref를 넣지 않는다.
2. A 요청 뒤 B 요청을 만들고 A 응답을 늦게 완료시켜도 B 결과가 유지되는지 확인한다. 요청 실패의 오래된 오류도 같은 기준으로 무시해야 한다.
3. 감사 화면이 초기 화면일 때 메시지가 전송되면 무엇이 잘못됐는가? 전송을 화면 state에 묶었다. submit handler로 옮긴다.
4. selectedId와 선택 객체를 모두 state에 두어 Effect로 맞추는가? 식별자만 유지하고 render 중 현재 객체를 찾을 수 있는지 확인한다.
5. 방 전환, 화면 닫기/다시 열기와 관계없는 입력 변경을 반복한 뒤 활성 connection/listener 수가 의도와 같은지 확인한다.

## 출처

- [React, Escape Hatches](https://react.dev/learn/escape-hatches)
- [React, Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React, You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React, Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)
- [React, useEffect](https://react.dev/reference/react/useEffect)

## 관련 문서

- [[React-State-Effects-and-Events|state, event와 form]]
- [[React-Refs-and-DOM|ref와 DOM]]
- [[React-Effect-Dependencies-and-Events|dependency와 Effect Event]]
- [[React-Custom-Hooks|custom Hook과 구독]]
- [[React-Server-State-and-API|server state와 API]]
