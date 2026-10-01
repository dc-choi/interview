---
tags: [web, frontend, react, dom, form, action]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React form action과 useFormStatus"]
---

# React form action과 useFormStatus

## form의 세 제출 경계

`form`은 common prop와 HTML form 설정을 지원한다. `action`은 URL 또는 function이다. URL이면 native HTML처럼 동작하고, function이면 React가 제출을 Transition의 Action으로 실행하며 `FormData`를 argument 하나로 넘긴다. `action` function은 async일 수 있다. submit button, submit/image input의 `formAction`이 form의 action을 override한다.

| 방식 | 전달/실행 | 상태와 오류 |
|---|---|---|
| URL `action` | browser가 method/URL로 제출 | native navigation |
| `onSubmit` handler | React submit event, 필요 시 `preventDefault()` | event 안에서 직접 데이터/요청 관리 |
| function `action` | `FormData`, Transition 안에서 실행 | pending 추적, throw는 Error Boundary, action state/optimistic과 연결 |

공식 form 문서는 function `action`/`formAction`을 `method` 설정과 무관한 POST 제출로 설명한다. Server Function의 서버 제출과 일반 client 함수 실행은 구분한다. client 함수는 React가 native 제출을 가로채 호출하므로 함수 안에 요청이 없다면 HTTP 요청 자체가 없을 수 있다. 아래 `useFormStatus().method`가 항상 post라는 뜻도 아니다.

`onSubmit`으로 기본 전송을 막는 방식과 달리 function action에는 `preventDefault()`가 필요 없다. action이 성공하면 form의 uncontrolled field가 reset된다. controlled state를 자동으로 초기화한다는 뜻은 아니다.

```jsx
const Search = () => {
  const search = async formData => {
    const query = formData.get('query');
    await saveQuery(query);
  };
  return <form action={search}>
    <label>검색어<input name="query" required /></label>
    <Submit />
  </form>;
};
```

`saveQuery`는 업무 요청을 수행하는 함수다. 성공 시 field reset이 UX에 맞는지 확인한다. throw를 사용하면 가까운 Error Boundary로 이동하므로 field별 예상 검증 실패를 전부 throw로 표현하지 않는다. 반환 상태로 오류를 표시하는 useActionState의 계약과 optimistic 기준값/실패 복원은 [[React-Action-State]]를 따른다.

## useFormStatus

`react-dom`의 Hook은 DOM 기반 web form용이다. React Native의 iOS/Android/Windows component에 같은 form 상태 계약을 적용하지 않는다. `useFormStatus()`는 argument 없이 가장 가까운 parent form의 현재 제출 상태 object를 반환한다.

| property | 의미 |
|---|---|
| `pending` | parent form이 제출을 처리하는 중인지 boolean |
| `data` | 제출 중인 FormData. 활성 제출이 없거나 parent form이 없으면 null |
| `method` | pending 제출의 form method 문자열. React 19.3에서는 form의 DOM method를 읽으며 idle은 null |
| `action` | pending 제출에서 선택한 function/URL/null. submitter override를 반영하며 action이 없거나 idle이면 null |

React 19.3.0에서 method를 생략한 client function form은 pending 중 `method: 'get'`을 보고할 수 있다. 이는 그 함수가 GET 요청을 보냈다는 증거가 아니다. 실제 네트워크 의미와 status 관측값을 나눈다. initial/완료 상태는 `{ pending: false, data: null, method: null, action: null }`이다. 공식 Hook 설명에서 생략된 idle 값과 submitter override는 해당 버전 구현 및 실행 결과로 확인했다. 또한 `onSubmit`이 `preventDefault()` 후 Transition을 예약하는 React 19.3 client 경로에서는 function action이 없어도 pending이 되고 `action`에 URL 문자열이 들어갈 수 있다. 같은 경로에서 action prop 자체가 없으면 pending 중에도 null이다. 반환값을 항상 function이라고 가정해 직접 호출하지 않는다.

```jsx
import { useFormStatus } from 'react-dom';

const Submit = () => {
  const { pending, data } = useFormStatus();
  return <>
    <button type="submit" disabled={pending}>
      {pending ? '저장 중' : '저장'}
    </button>
    {data && <p>{String(data.get('query') ?? '')} 제출 중</p>}
  </>;
};
```

Hook을 호출한 component가 반환하는 form이나 자식 form은 추적하지 않는다. 반드시 실제 `<form>` 안에서 렌더링되는 별도 child component에서 호출한다. 같은 component 안에 Hook과 form을 두고 pending이 계속 false인 경우 이 위치를 먼저 확인한다.

```jsx
// parent form이 없으므로 이 Form의 pending은 제출 상태를 보지 못한다.
const WrongForm = () => {
  const { pending } = useFormStatus();
  return <form action={save}><button disabled={pending}>저장</button></form>;
};
```

submit data를 메시지로 보여줄 때는 field type과 null을 처리한다. `data`는 화면의 최신 모든 입력값을 계속 읽는 저장소가 아니라 제출 중인 데이터다.

## 여러 제출 action

```jsx
const Editor = () => (
  <form action={publish}>
    <label>내용<textarea name="content" /></label>
    <button type="submit" name="intent" value="publish">발행</button>
    <button type="submit" formAction={saveDraft}>임시 저장</button>
  </form>
);
```

눌린 submitter의 `name`/`value`가 업무 intent를 전달하거나 해당 `formAction`이 별도의 함수를 선택한다. 같은 form의 여러 버튼이 서로 다른 검증/저장 의미를 가지면 submitter에 계약을 명시한다.

## Server Function과 progressive enhancement

Server Function을 form action에 전달하면 지원하는 framework의 server/client 경계를 통해 실행한다. Server Component가 렌더링한 form과 Server Function action은 JavaScript가 비활성화되거나 아직 로드되지 않았을 때도 native 제출로 개선하는 progressive enhancement를 지원한다. 일반 client 함수 action에 같은 보장을 적용하지 않는다.

추가 product id는 hidden field나 `action.bind(null, productId)`로 전달할 수 있다. bind를 쓰면 `(productId, formData)`가 되고, useActionState wrapper를 쓰면 이전 state argument까지 생기므로 signature를 확인한다. hidden field도 client 제공 입력이므로 서버에서 권한/값을 다시 검증한다.

Client Component의 form에서 JavaScript 로드 전 제출 결과를 표시하려면 Server Function, useActionState, 동일한 form/action과 필요 시 permalink가 연결되어야 한다. useActionState 반환은 `[state, dispatchAction, isPending]`이며 예시에서 둘만 destructuring했다고 API가 두 값인 것은 아니다. SSR HTML과 hydration 사이의 formState 전달은 [[React-DOM-Client-Roots#hydrateRoot 계약]]을 따른다.

## 이해 확인

1. form을 반환하는 component 안에서 useFormStatus를 호출하면 왜 false인가? Hook이 보는 것은 조상 form이기 때문이다.
2. function action의 status.method가 get이면 GET 요청을 보냈다는 뜻인가? 아니다. client 함수의 실제 요청과 Server Function 제출, DOM method 관측값을 구분한다.
3. 저장 성공 뒤 controlled input이 비워지지 않는 이유는? 자동 reset은 uncontrolled field 계약이다.
4. JavaScript 전 오류 표시와 단순 Error Boundary fallback은 같은가? 서버 제출 state를 form과 hydration에 연결하는 별도 조건이 필요하다.

## 출처

- [React DOM, Form Hooks](https://react.dev/reference/react-dom/hooks)
- [React DOM, useFormStatus](https://react.dev/reference/react-dom/hooks/useFormStatus)
- [React DOM, form](https://react.dev/reference/react-dom/components/form)
- [React, FormActionEventPlugin v19.3.0](https://github.com/facebook/react/blob/v19.3.0/packages/react-dom-bindings/src/events/plugins/FormActionEventPlugin.js)

## 관련 문서

- [[React-DOM-Form-Controls]]
- [[React-State-Effects-and-Events]]
- [[React-DOM-Client-Roots]]
- [[React-Action-State]]
- [[React-Server-Functions]]
