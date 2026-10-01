---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js SPA와 Promise Context"]
---

# Next.js SPA와 Promise Context

## SPA의 범위와 점진 도입

엄격한 SPA는 하나의 HTML 진입점에서 browser JavaScript가 렌더, 경로 전환과 조회를 처리하고 전체 문서를 다시 로드하지 않는 구조다. 초기 JavaScript 양과 client request waterfall이 커질 수 있다. Next.js는 경로별 code splitting과 HTML 진입점, Link prefetch 및 URL 기반 공유/뒤로가기를 제공하면서 client navigation을 유지한다.

정적 또는 client 중심 앱으로 시작해 Server Component/Action을 route별로 도입할 수 있다. CRA/Vite와 기존 Pages Router에서의 이행은 [[NextJS-SPA-to-App-Migration]], [[NextJS-Pages-to-App-Migration]]으로 연결한다. 공식 next-spa-patterns demo는 아래 Context/browser-only/shallow-routing/mutation 흐름을 각각 보여준다.

## Promise를 Context로 전달

```tsx
// user-provider.tsx
'use client'
import { createContext, useContext, type ReactNode } from 'react'
interface User { id: string; name: string }
const UserContext = createContext<Promise<User> | null>(null)
export function UserProvider({ children, userPromise }: {
  children: ReactNode; userPromise: Promise<User>
}) {
  return <UserContext.Provider value={userPromise}>{children}</UserContext.Provider>
}
export function useUser() {
  const promise = useContext(UserContext)
  if (!promise) throw new Error('UserProvider가 필요합니다.')
  return promise
}
```

```tsx
// profile.tsx
'use client'
import { use } from 'react'
import { useUser } from './user-provider'
export function Profile() {
  const user = use(useUser())
  return <p>{user.name}</p>
}
```

서버 parent/layout에서 `const userPromise = getUser()`를 await 없이 만들고 `<UserProvider userPromise={userPromise}>`에 넘긴다. 소비자인 `<Profile />`을 Suspense로 감싸면 Promise가 해결될 때까지 fallback을 표시한다. Client Component 렌더를 async 함수로 만드는 대신 React use가 해석한다. RSC에서 시작한 읽기는 client waterfall을 줄이고 HTML stream은 클라이언트 JavaScript 로딩과 독립적으로 진행될 수 있다.

같은 요청 안의 여러 서버 소비자가 같은 사용자 정보를 읽으면 `React.cache(getUser)`를 공유해 중복 호출을 줄인다. 일부 subtree만 필요하면 provider를 root보다 가까이 둔다. 상위 Promise를 다시 읽으려면 그 Promise를 만든 서버 컴포넌트도 다시 실행해야 한다. Cache Components에서는 요청 데이터 Promise를 적합한 Suspense/요청 경계 안에서 시작한다. 사용자 ID/name처럼 필요한 DTO만 전달한다.

## browser-only와 URL 상태

```tsx
'use client'
import dynamic from 'next/dynamic'
const BrowserWidget = dynamic(() => import('./widget'), { ssr: false })
```

Client Component도 최초 서버 렌더/prerender 대상이므로 window/document 전용 라이브러리는 위처럼 Client 경계에서 ssr false를 적용한다. 또는 useEffect에서 브라우저 초기화를 하고 첫 렌더에는 동일한 null/loading UI를 제공한다. 렌더 때 window를 직접 읽는 것을 useEffect 사용으로 착각하지 않는다.

```tsx
'use client'
import { useSearchParams } from 'next/navigation'
export function SortButtons() {
  const current = useSearchParams()
  const sort = (order: 'asc' | 'desc') => {
    const next = new URLSearchParams(current.toString())
    next.set('sort', order)
    window.history.pushState(null, '', `?${next}`)
  }
  return <><button onClick={() => sort('asc')}>오름차순</button>
    <button onClick={() => sort('desc')}>내림차순</button></>
}
```

pushState는 history 항목을 추가하고 replaceState는 현재 항목을 바꾼다. 전체 페이지를 reload하지 않고 usePathname/useSearchParams와 연동한다. 수동 view 전환/URL 상태에 유용하지만 서버 데이터를 다시 읽는 router navigation과 동일한 효과를 가정하지 않는다.

## 변경과 transition

Client event에서 `useTransition`의 startTransition으로 Server Action을 호출하고 pending 동안 버튼을 disable하거나 삭제 중 표시를 한다. 함수가 반환한 Promise를 transition에 연결해야 대기를 추적한다.

```tsx
const [pending, startTransition] = useTransition()
// deletePost는 권한/소유권을 검증하는 서버 Action이다.
<button disabled={pending} onClick={() => startTransition(() => deletePost(id))}>
  {pending ? '삭제 중...' : '삭제'}
</button>
```

복잡한 목록은 순수 reducer를 공유하면 optimistic 계산과 서버 계산을 일치시킬 수 있다. 다음은 add/toggle/edit/delete의 상태 변환을 나타낸다.

```ts
interface Todo { id: string; text: string; done: boolean }
type Change = { type: 'add'; id: string; text: string }
  | { type: 'toggle'; id: string } | { type: 'edit'; id: string; text: string }
  | { type: 'delete'; id: string }
export const reduceTodos = (todos: Todo[], change: Change): Todo[] => {
  switch (change.type) {
    case 'add': return [...todos, { id: change.id, text: change.text, done: false }]
    case 'toggle': return todos.map((x) => x.id === change.id ? { ...x, done: !x.done } : x)
    case 'edit': return todos.map((x) => x.id === change.id ? { ...x, text: change.text } : x)
    case 'delete': return todos.filter((x) => x.id !== change.id)
  }
}
```

`useActionState(saveTodos, initialTodos)`의 확정 목록을 `useOptimistic(todos, reduceTodos)`의 base로 삼는다. 같은 transition에서 `addOptimistic(change)`와 `dispatch(change)`를 호출하면 UI는 즉시 바뀌고 pending은 서버 동기화 상태를 표시한다. add 폼은 string 확인 후 UUID와 text를 보내고 checkbox는 toggle, 편집은 edit, 삭제 버튼은 delete를 보낸다. 목록은 todo.id를 key로 쓰고 done이면 취소선 등으로 표시한다.

서버 saveTodos는 `(previousState, change)`를 받더라도 previousState 전체를 신뢰해 저장하면 안 된다. 현재 세션으로 사용자 범위를 정하고 검증된 change를 신뢰할 서버 목록에 적용하며 트랜잭션/충돌 처리를 거쳐 다음 DTO 목록을 반환한다. 순수 reducer 공유는 권한/동시성 검증의 대체가 아니다. 오류 처리와 transition 전파는 [[NextJS-Actions-and-Forms]], 폼 상태 예제는 [[NextJS-Form-Patterns]]를 따른다.

## 정적 export

`next.config.ts`에 `output: 'export'`를 지정한 뒤 next build를 실행하면 out에 HTML/CSS/JS가 생성된다. 경로별 HTML과 code splitting 덕분에 모든 경로가 빈 index.html 하나에 의존할 필요가 없다. client navigation은 유지할 수 있지만 runtime Next 서버가 필요한 기능은 지원하지 않는다. client API가 외부 backend를 사용하는지와 static export 제한을 먼저 확인한다.

## 출처

- [Next.js, single-page-applications](https://nextjs.org/docs/app/guides/single-page-applications)

## 관련 문서

- [[NextJS-Client-Data]]
- [[NextJS-Actions-and-Forms]]
- [[NextJS-Auth-Cache-Patterns]]
