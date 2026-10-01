---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 이동, 복구와 URL 훅 예제"]
---

# Pages Router의 이동, 복구와 URL 훅 예제

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 로그인 이동과 사전 로딩

```tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Login() {
  const router = useRouter()
  useEffect(() => { void router.prefetch('/dashboard') }, [router])
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const response = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ /* 입력 값 */ }),
    })
    if (response.ok) await router.push('/dashboard')
  }
  return <form onSubmit={(event) => { void submit(event) }}>
    <button type="submit">로그인</button>
  </form>
}
```

`prefetch`는 production만 동작하며 auth 성공을 보장하지 않는다. 클라이언트 `useUser`로 이동하는 경우 loading이 끝나고 user가 없을 때만 `void router.push('/login')`을 실행한다. 서버/API 권한 검사는 별개다. Promise 처리는 await, 의도한 void 또는 해당 line lint 예외 중 프로젝트 정책에 맞춘 하나를 쓴다. 세 패턴을 같은 Effect에 동시에 실행하지 않는다.

## 같은 페이지 상태 reset과 URL object

```tsx
useEffect(() => { setCount(0) }, [router.query.slug])
// 또는 _app에서 전체 page remount
return <Component key={router.asPath} {...pageProps} />
```

slug만 reset하는 것과 query/hash까지 포함한 asPath key로 모든 하위 상태를 제거하는 것은 다르다. active link는 준비된 client asPath로 현재 href와 비교하고 color/class를 정한다. 자동 정적 page의 서버 렌더에서는 준비 전 asPath를 비교해 hydration 결과를 갈라놓지 않는다.

```tsx
void router.push({ pathname: '/post/[pid]', query: { pid: post.id } })
void router.push({ pathname: '/', query: { photoId: 2 } }, '/p/2', { shallow: true })
```

두 번째는 route `/`를 `/p/2`로 표시한다. query-only navigation은 asPath에 적용하므로 수동 masking에서는 pathname을 명시해 원 route를 유지한다. `router.replace('/home')`, `router.back()`, `router.reload()`는 각각 entry 교체, browser 뒤로가기, document 새로고침이다.

## popstate와 취소된 이동 구분

```tsx
useEffect(() => {
  router.beforePopState(({ as }) => {
    if (as === '/' || as === '/other') return true
    window.location.href = as
    return false
  })
  return () => router.beforePopState(() => true)
}, [router])
```

false는 Next의 popstate 처리를 막으므로 위 예제는 직접 document request를 수행한다. SSR 404를 원하면 서버 route에서도 실제 404를 반환해야 한다.

```tsx
useEffect(() => {
  const onError = (error, url) => {
    if (error.cancelled) return // 연속 click에 의한 취소
    reportNavigationError({ error, url })
  }
  router.events.on('routeChangeError', onError)
  return () => router.events.off('routeChangeError', onError)
}, [router])
```

`reportNavigationError`는 앱 보고 helper다. events는 mount/event 때 구독하고 동일 callback으로 해제한다. `_app`에 두면 page 이동에서 구독을 유지한다. hashChange는 page 자체가 바뀌지 않을 때의 hash 변경이며 routeChange와 구별한다.

## params, query와 검색값의 형태

| 파일과 URL | useParams 결과 | router.query의 추가 정보 |
| --- | --- | --- |
| `pages/shop/index.tsx`, `/shop` | `{}` | URL query만 |
| `pages/shop/[slug].tsx`, `/shop/shoes?color=red` | `{ slug: 'shoes' }` | color도 포함 |
| `pages/shop/[tag]/[item].tsx`, `/shop/1/2` | `{ tag: '1', item: '2' }` | query도 포함 |
| `pages/shop/[...slug].tsx`, `/shop/1/2` | `{ slug: ['1','2'] }` | query도 포함 |

`pages/shop/page.tsx`는 `/shop/page`다. App의 page convention을 Pages 표에 섞지 않는다. useParams의 generic은 예상 params 타입을 연결하고 런타임 입력 검증은 별도다. 동적 경로 없는 페이지는 준비 후 `{}`를 반환한다. 두 URL hook은 React hook이라 class 안에서 직접 호출할 수 없다.

```tsx
import { useParams, useSearchParams } from 'next/navigation'
import { useRouter } from 'next/router'

export default function Filter() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const search = useSearchParams()
  if (!params || !search) return <p>URL 준비 중...</p>
  const update = (sort: 'asc' | 'desc') => {
    const query = new URLSearchParams(search.toString())
    query.set('sort', sort)
    void router.push({ pathname: router.pathname, query: {
      ...router.query, ...Object.fromEntries(query),
    } })
  }
  return <nav>{params.slug}
    <button onClick={() => update('asc')}>오름차순</button>
    <button onClick={() => update('desc')}>내림차순</button>
  </nav>
}
```

반복 query key를 유지해야 하면 Object.fromEntries로 합치지 말고 getAll 또는 배열을 보존한 query 객체를 구성한다. `get('a')`는 첫 값, `has('a')`는 존재 여부다. `?a=`는 값 `''`이지만 has는 true, a가 없으면 get은 null이다. `keys`, `values`, `entries`, `toString`으로도 읽을 수 있다. 정적 prerender에서 null을 guard하고 SSR에서는 request 값이 곧바로 들어온다. breadcrumb는 같은 guard에서 `Home / ...`, 정상 때 `Home / {slug}`를 보여 줄 수 있다. App useParams는 null이 없고 App useSearchParams의 정적 렌더는 Suspense를 필요로 한다.

## compat router와 class adapter

```tsx
import { useEffect } from 'react'
import { useRouter } from 'next/compat/router'
import { useSearchParams } from 'next/navigation'

export const SharedSearch = () => {
  const router = useRouter()
  const search = useSearchParams()
  useEffect(() => {
    if ((router && !router.isReady) || !search) return
    const term = search.get('search')
    // term을 사용하는 client 작업
  }, [router, search])
  return <input defaultValue={search?.get('search') ?? ''} />
}
```

App만 사용하는 상태가 되면 compat router 의존성을 제거한다. `getServerSideProps`에서 `renderToString(<SharedComponent />)`처럼 Next context 밖에서 렌더링하는 component에도 null guard가 필요하다. class는 `withRouter(Component)`로 주입하며 props에 `router: NextRouter`를 선언하고 render에서 `this.props.router.pathname`을 읽는다.

useSearchParams는 v13.0, useParams는 v13.3부터다. Pages와 App 사이 타입/초기화 차이를 유지하며 옮긴다.

## 출처

- [Next.js, use-router](https://nextjs.org/docs/pages/api-reference/functions/use-router)
- [Next.js, use-params](https://nextjs.org/docs/pages/api-reference/functions/use-params)
- [Next.js, use-search-params](https://nextjs.org/docs/pages/api-reference/functions/use-search-params)

## 관련 문서

- [[NextJS-Pages-Router-API]]
- [[NextJS-Pages-Navigation]]
