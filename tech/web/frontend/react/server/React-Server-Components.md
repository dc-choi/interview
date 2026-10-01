---
tags: [web, frontend, react, server-components]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: []
---

# Server Components와 client 경계

Server Component는 브라우저 앱이나 SSR 서버와 분리된 환경에서 먼저 실행되어 UI를 구성한다. 그 환경은 빌드 시점의 CI일 수도, 요청을 받는 서버일 수도 있다. 항상 운영 웹 서버가 필요하거나 요청마다 실행된다는 뜻은 아니다.

React 19의 사용자 대상 Server Component 기능과 이를 지원하는 bundler/framework의 내부 API는 안정성 계약이 다르다. 전자는 stable이지만 구현용 API는 19.x minor 사이에서도 바뀔 수 있다. 통합을 직접 만들면 정확한 React 버전을 고정하거나 해당 Canary 계약을 따라야 한다.

## Server Components와 SSR의 차이

| 구분 | 하는 일 |
|---|---|
| Server Components | 서버 환경에서 데이터와 component를 평가하고, 결과와 client 경계를 전달한다. 서버 component 구현과 그 전용 의존성은 client JS에 포함되지 않는다 |
| SSR | React tree의 초기 HTML을 만든다. Client Component도 첫 HTML 생성을 위해 서버에서 render될 수 있다 |
| Hydration | 기존 서버 HTML에 client React의 상호작용을 연결한다 |
| Static 생성 | 빌드 시 HTML/결과를 준비하는 배포 선택이다. RSC 사용 여부와 일대일 대응하지 않는다 |

`'use client'`는 browser에서만 실행되고 서버에서는 절대 render되지 않는다는 뜻이 아니다. 파일 경계와 초기 HTML 렌더링 단계를 구분한다. RSC 결과를 SSR로 HTML화할 수 있고, 정적 콘텐츠라면 빌드 때 준비해 CDN에 배포할 수도 있다.

서버에서 markdown 처리나 DB 조회를 마치면 그 처리 라이브러리와 접근 코드를 브라우저에 보낼 필요가 줄어든다. 다만 큰 결과 HTML/직렬화 payload가 작은 component 코드보다 비쌀 수도 있어 bundle 크기만으로 전송 비용을 판단하지 않는다.

## Directives와 use client

`'use client'`는 **module dependency tree**에 경계를 만든다. 해당 모듈과 그 모듈이 가져오는 의존 코드가 client 대상이 된다. 지시문은 파일 첫 부분, import보다 앞에 일반 따옴표 문자열로 두며 앞선 주석은 허용한다.

```jsx
'use client';
import { useState } from 'react';

export default function Expandable({ children }) {
  const [open, setOpen] = useState(false);
  return <section>
    <button onClick={() => setOpen(value => !value)}>내용 보기</button>
    {open && children}
  </section>;
}
```

```jsx
// Server Component: Expandable에 서버에서 만든 JSX를 전달한다.
import Expandable from './Expandable';

export default async function Note({ id }) {
  const note = await readAuthorizedNote(id);
  return <Expandable><p>{note.text}</p></Expandable>;
}
```

위 예시에서 `Expandable`은 client 경계지만 children을 만든 `Note`의 코드까지 client bundle에 들어가지는 않는다. client component가 서버 구현을 직접 import한 것이 아니라, 서버가 만든 JSX를 props로 전달했기 때문이다. JSX 부모/자식 관계만 보고 실행 환경을 판단하지 않는다.

같은 순수 component 정의도 server 모듈에서 쓰이는 경우와 client 의존 트리에 들어간 경우 각각 다른 환경에서 평가될 수 있다. `'use client'`가 없는 파일이 무조건 server 전용인 것은 아니다. 서버 비밀값이나 파일 시스템 접근 모듈을 client 의존 경계에 넣지 않는다.

**Server Component를 표시하는 `'use server'` 지시문은 없다.** `'use server'`는 [[React-Server-Functions|서버 함수]]를 client에서 호출할 수 있게 하는 별도 계약이다. 두 지시문은 RSC를 지원하는 bundler/framework에서 해석되며 일반 Vite 앱에 문자열만 넣어 RPC를 만들 수는 없다.

## 상태, context와 브라우저 API

Server Component는 render 사이의 대화형 local state나 `onClick` handler를 갖지 않는다. state, Effect, DOM API가 필요한 부분은 client 경계로 옮긴다. 호환되지 않은 외부 UI 라이브러리는 작은 `'use client'` wrapper로 감쌀 수 있다.

서버에서 context를 생성하지 않지만 client 모듈에서 export한 context provider를 Server Component가 배치할 수 있다. 그 provider 안의 Client Component가 `useContext` 또는 `use`로 값을 읽는다. Server Component가 client context를 읽는 구조로 확대하지 않는다.

```jsx
// user-context.js
'use client';
import { createContext } from 'react';
export const UserContext = createContext(null);
```

```jsx
// Server Component, React 19 provider 문법
import { UserContext } from './user-context';
export default async function Layout({ children }) {
  const user = await readPublicUserProfile();
  return <UserContext value={user}>{children}</UserContext>;
}
```

client로 보내는 profile에는 필요한 공개 필드만 선택한다. 서버에서 조회했다는 사실만으로 전달된 props가 비밀로 유지되지는 않는다.

## Async render와 Promise 전달

Server Component는 `async`로 선언하고 render 중 `await`할 수 있다. Client Component를 async 함수로 만들지는 않는다. 우선순위가 낮은 데이터는 서버에서 Promise를 시작하고 client에서 `use`로 읽도록 전달해 Suspense 경계 뒤로 미룰 수 있다.

```jsx
// Server Component, Comments는 client component
const Page = async ({ id }) => {
  const note = await readAuthorizedNote(id);
  const commentsPromise = readComments(note.id);
  return <>
    <h1>{note.title}</h1>
    <Suspense fallback={<p>댓글 불러오는 중</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  </>;
};
```

client의 `Comments`는 `use(commentsPromise)`로 값을 읽는다. 대기는 Suspense, 실패는 Error Boundary 또는 Promise의 복구 경로에서 처리한다. render마다 새 Promise를 만드는 client fetch와 구분한다. 서버 실행으로 client waterfall은 줄일 수 있지만, 실제 데이터 의존성으로 생긴 서버 waterfall까지 자동으로 사라지는 것은 아니다.

## 직렬화 가능한 props

경계를 통과하는 값은 JSON보다 넓은 React의 직렬화 계약을 따른다. 아래 값도 내부 원소와 필드가 허용되는 값이어야 한다.

| 허용 범주 | 예시 |
|---|---|
| 원시 값 | string, number, bigint, boolean, undefined, null, `Symbol.for`로 등록한 symbol |
| 컨테이너와 내장 타입 | Array, Map, Set, TypedArray, ArrayBuffer, Date, 직렬화 가능한 속성의 plain object |
| React 경계 값 | Server Function 참조, JSX element, Promise |

일반 callback closure, 임의의 class instance, class 자체, null prototype 객체와 비등록 `Symbol()`은 일반 데이터처럼 전달할 수 없다. client 모듈에서 export한 component 참조 등 framework가 처리하는 경계 값과 임의 함수를 혼동하지 않는다.

Server Function의 **입력 인자** 계약은 이 props 목록과 완전히 같지 않다. JSX와 이벤트 객체는 서버 함수 인자로 지원되지 않으며, FormData는 지원된다. 자세한 비교는 [[React-Server-Functions#직렬화와 신뢰 경계]]를 따른다.

## 이해 확인

- client wrapper 안에 server에서 만든 children을 넣어도 server 구현이 client bundle에 들어가지 않는 이유는 무엇인가?
- `'use client'` 파일에 `window`를 render 중 바로 사용하면 SSR에서 어떤 문제가 생길 수 있는가?
- RSC로 바꾸면 서버 안의 연속 DB 조회도 자동으로 병렬화되는가?
- server에서 조회한 사용자 객체를 통째로 props에 넣었을 때 어떤 데이터가 browser로 나가는가?

## 출처

- [React, Server Components](https://react.dev/reference/rsc/server-components)
- [React, Directives](https://react.dev/reference/rsc/directives)
- [React, use client](https://react.dev/reference/rsc/use-client)

## 관련 문서

- [[React-Server-Functions]]
- [[React-Server-State-and-API]]
- [[React-Render-Purity-and-Trees]]
- [[Fullstack-BaaS-Boundaries|풀스택 프레임워크와 데이터 접근 경계]]
