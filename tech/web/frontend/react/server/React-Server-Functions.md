---
tags: [web, frontend, react, server-functions]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: []
---

# Server Functions와 Action 신뢰 경계

Server Function은 client에서 호출하면 네트워크 요청을 통해 서버의 async 함수를 실행하는 참조다. RSC 지원 framework가 참조 생성, 요청과 직렬화를 연결한다. Server Component는 UI 계산, Server Function은 client에서 호출할 서버 동작을 정의한다.

## use server와 호출 계약

서버 파일의 async 함수 첫 부분에 `'use server'`를 넣으면 그 함수 참조를 client props로 전달할 수 있다. 파일 첫 부분에 넣으면 해당 모듈의 export를 서버 함수로 사용하며, client가 직접 import하려면 이 module-level 형식을 사용한다.

```js
'use server';

export async function renameNote(noteId, title) {
  const user = await requireCurrentUser();
  if (typeof noteId !== 'string' || typeof title !== 'string') {
    throw new Error('Invalid input');
  }
  const normalized = title.trim();
  if (normalized.length === 0 || normalized.length > 200) {
    return { ok: false, message: '제목 길이를 확인해 주세요.' };
  }
  const changed = await updateOwnedNote({ ownerId: user.id, noteId, title: normalized });
  if (!changed) throw new Error('Not allowed');
  return { ok: true };
}
```

`requireCurrentUser`와 `updateOwnedNote`는 앱에서 제공할 인증/데이터 접근 함수다. 후자는 소유자 조건을 포함해 갱신해야 한다. button을 숨기거나 ID를 props로 넘겼다는 이유만으로 서버 권한 검사를 생략하지 않는다.

지시문은 import나 다른 코드보다 앞에 따옴표 문자열로 둔다. 네트워크 호출이므로 async 함수여야 하며 client에서는 반환 Promise를 기다린다. 이 문자열은 Server Component 선언이나 임의 함수를 자동으로 안전하게 만드는 표시가 아니다.

Server Functions의 사용자 기능은 React 19에서 stable이지만 framework 통합용 내부 API는 minor 간 변경될 수 있다. 직접 통합하는 라이브러리는 정확한 버전을 고정하고 호환성을 검증한다.

## Server Function과 Action의 관계

Server Function이 `action` prop으로 전달되거나 Action 내부에서 호출되면 Server Action으로 쓰인 것이다. 모든 Server Function을 무조건 Server Action이라고 부르지는 않는다.

서버 변경은 form의 `action`/`formAction`에 전달하면 자동으로 Transition에서 실행된다. 다른 handler에서 호출할 때는 `startTransition`으로 감싸 pending, optimistic UI와 오류 처리를 연결한다. `await` 뒤 state 갱신을 Transition으로 표시하려면 현재 계약상 다시 `startTransition`으로 감싸야 할 수 있다.

이 기능은 서버 상태 변경을 주된 목적으로 설계됐다. 조회용 cache API로 사용하지 않는다. 구현 framework는 보통 Action을 하나씩 처리하며 반환값 cache를 제공하지 않으므로 데이터 로딩은 RSC/route loader/query 계층과 나눠 설계한다. 직렬 처리도 DB 트랜잭션이나 중복 요청 방지의 대체재는 아니다.

## FormData와 useActionState

form에 함수를 직접 넣으면 첫 인자로 FormData를 받는다. `useActionState`를 거치면 함수 인자가 **이전 state, payload(FormData)** 순서로 바뀐다.

```js
// actions.js
'use server';
export async function submitTitle(previousState, formData) {
  const user = await requireCurrentUser();
  const title = formData.get('title');
  if (typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
    return { error: '제목을 1~200자로 입력해 주세요.' };
  }
  await createNote({ ownerId: user.id, title: title.trim() });
  return { error: null };
}
```

```jsx
'use client';
import { useActionState } from 'react';
import { submitTitle } from './actions';

export default function NoteForm() {
  const [state, action, pending] = useActionState(submitTitle, { error: null }, '/notes/new');
  return <form action={action}>
    <input name="title" aria-label="제목" required maxLength={200} />
    <button disabled={pending}>저장</button>
    {state.error && <p role="alert">{state.error}</p>}
  </form>;
}
```

이 예시는 검증 실패를 반환 state로 표현한다. 예상하지 못한 오류의 처리 경계도 앱에서 정한다. action이 정상 완료되면 uncontrolled form field가 reset될 수 있으므로 실패 입력 보존 UX를 따로 확인한다. client의 `required`/`maxLength`는 서버 검증의 대체재가 아니다.

Server Function form은 JS가 아직 로드되지 않은 단계에도 제출할 수 있는 점진 향상을 지원한다. `useActionState`의 `permalink`를 쓰면 bundle 로드 전 제출 시 그 URL로 이동할 수 있다. 목적지에도 같은 action과 permalink를 가진 form이 있어야 state 연결이 가능하다. hydration 후 일반 client 상호작용에서는 permalink가 같은 방식으로 계속 redirect를 강제하지 않는다.

## 직렬화와 신뢰 경계

| 서버 함수 입력 | 지원 범위 |
|---|---|
| 원시 값 | string, number, bigint, boolean, undefined, null, 전역 등록 symbol |
| 구조와 내장 값 | 직렬화 가능한 원소의 Array/Map/Set, TypedArray/ArrayBuffer, Date, FormData, plain object |
| 특수 참조 | Server Function, Promise |
| 지원되지 않는 예 | JSX element, 일반 함수/component 함수, 임의 class instance, null prototype 객체, 비등록 symbol, DOM 이벤트 객체 |

반환값은 client 경계의 serializable props 계약을 따른다. 따라서 입력/출력에 정확히 같은 타입 집합을 가정하지 않는다. 일반 JSON 직렬화 규칙으로 React의 모든 허용 타입을 설명하지도 않는다.

서버 함수는 노출된 endpoint로 취급한다. 모든 인자는 client가 조작할 수 있으므로 타입/길이/허용값 검사, 현재 사용자 확인, 대상 자원에 대한 권한 검사를 서버에서 수행한다. 반환값도 client가 볼 수 있으므로 필요한 필드만 선택한다. Experimental taint API는 일부 실수 탐지에 도움을 줄 뿐 권한 검사와 데이터 최소화를 대체하지 않는다.

## 이해 확인

- `useActionState`를 추가한 뒤 `formData.get`이 실패한다면 함수 인자 순서에서 무엇을 확인할 것인가?
- 서버에서 만든 note ID를 hidden input에 넣었어도 다시 소유권을 검사해야 하는 이유는 무엇인가?
- Server Function 반환값을 조회 cache로 삼기 어려운 이유는 무엇인가?
- JS 로드 전 제출이 permalink 목적지에 도착했을 때 같은 form이 필요한 이유는 무엇인가?

## 출처

- [React, Server Functions](https://react.dev/reference/rsc/server-functions)
- [React, use server](https://react.dev/reference/rsc/use-server)
- [React, useActionState](https://react.dev/reference/react/useActionState)

## 관련 문서

- [[React-Server-Components]]
- [[React-State-Effects-and-Events]]
- [[React-Server-State-and-API]]
