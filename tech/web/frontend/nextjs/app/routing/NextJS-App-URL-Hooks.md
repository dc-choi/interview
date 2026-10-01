---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["URL Hook의 값, Suspense와 hydration"]
---

# URL Hook의 값, Suspense와 hydration

## URL 읽기 API 비교

모두 next/navigation의 Client Component hook이다. params는 path 변수, pathname은 query 없는 경로 문자열, searchParams는 읽기 전용 URLSearchParams다. page의 searchParams Promise plain object와 hook 반환 타입을 혼동하지 않는다.

| API | 인자/반환 |
| --- | --- |
| useParams<T>() | 인자 없음, dynamic key의 string/string[] 객체, 없으면 {} |
| usePathname() | 인자 없음, `/dashboard` 같은 문자열 |
| useSearchParams() | 인자 없음, ReadonlyURLSearchParams |
| useSelectedLayoutSegment(key?) | layout 한 단계 아래 active string 또는 null |
| useSelectedLayoutSegments(key?) | layout 아래 active string[] 또는 [] |

selected hooks의 key는 named parallel slot의 이름이다. 단수는 `/dashboard/analytics/monthly`에서 dashboard layout 기준 analytics만 반환한다. 복수는 아래 전체 active segment를 반환하되 route group도 포함하므로 breadcrumb에서 필요하면 `(group)`을 filter한다. catch-all은 `a/b/c`라는 한 string이며 복수에서도 `['blog','a/b/c']`이지 세 segment로 분해되지 않는다.

## query 값의 경계

`get('a')`는 첫 값, `getAll('a')`는 반복 값 배열이다. `?a=`는 빈 문자열, a가 없는 경우는 null이다. has/keys/values/entries/toString 등 읽기 메서드를 쓴다. 변경은 반환 객체를 직접 mutate하지 않고 새 URLSearchParams로 복사해 Link/router/native history에 전달한다.

```tsx
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
export function SortButton() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  return <button onClick={() => {
    const next = new URLSearchParams(search.toString())
    next.set('sort', 'asc')
    router.push(`${pathname}?${next}`)
  }}>오름차순</button>
}
```

Server Component 데이터 filter에는 page.searchParams를 사용하고 Client hook을 서버에서 호출하지 않는다. layout은 query prop을 받지 않으며 client navigation 때 재실행되지 않으므로 최신 URL UI를 child Client Component로 분리한다.

## prerender와 Cache Components

prerendered route의 useSearchParams는 가까운 Suspense까지 Client tree를 client-render하도록 만든다. boundary 위 static UI는 HTML에 유지된다. dev는 on-demand라 suspend하지 않아 누락을 숨길 수 있지만 production static build는 Suspense 누락으로 실패한다. page query Promise를 Client에 넘겨 use로 읽어도 suspend한다.

Cache Components에서 useParams/usePathname/selected segment hooks는 실제 route 값이 build 때 알려져 있으면 resolve하고, generateStaticParams가 커버하지 않는 unknown param이면 suspend한다. UI가 정적인 sidebar/tab/breadcrumb라도 아래 route의 unknown 값 때문에 영향을 받는다. 해당 hook을 읽는 작은 UI를 Suspense로 감싸고 shell을 보존한다.

```tsx
<Suspense fallback={<nav>메뉴</nav>}><ActiveNavigation /></Suspense>
```

요청 시 전체 실행이 필요하면 Server에서 connection을 먼저 await하는 선택도 있지만 shell/prefetch를 잃는 범위를 고려한다. 경계 가까이에 fallback을 두는 방식과 비교한다.

## Pages 호환과 rewrites

Pages와 공유하면 초기 router 준비 전 useParams/usePathname은 null이 될 수 있다. pages 디렉터리가 있으면 useSearchParams도 null 호환 타입이다. App-only 반환을 가정한 공통 컴포넌트는 이 경우를 다룬다.

rewrite/Proxy를 통해 prerender page를 열면 server가 생성한 path와 browser path가 달라 usePathname UI의 hydration mismatch가 발생할 수 있다. 작은 UI만 path에 의존하게 만들고 server/client 첫 render에는 안정된 fallback을 보여 준 뒤 mount Effect로 실제 pathname을 반영한다. 이 방법은 순간 fallback 표시 비용이 있다.

## 반환값 표와 navigation UI

| layout와 방문 URL | 단수 segment | 복수 segments |
| --- | --- | --- |
| root, `/` | null | [] |
| root, `/dashboard` | dashboard | ['dashboard'] |
| root, `/dashboard/settings` | dashboard | ['dashboard','settings'] |
| dashboard, `/dashboard` | null | [] |
| dashboard, `/dashboard/settings` | settings | ['settings'] |
| dashboard, `/dashboard/analytics/monthly` | analytics | ['analytics','monthly'] |
| blog, `/blog/a/b/c` catch-all | a/b/c | ['a/b/c'] |
| root, `/blog/a/b/c` catch-all | blog | ['blog','a/b/c'] |

useParams의 `/shop`은 {}, single `/shop/1`은 `{slug:'1'}`, two key `/shop/1/2`는 `{tag:'1',item:'2'}`, catch-all은 `{slug:['1','2']}`다. usePathname은 `/`와 `/blog/hello-world` 전체 path를 반환하며 `/dashboard?v=2`도 `/dashboard`다.

```tsx
'use client'
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
export function BlogNavLink({ slug, children }: {
  slug: string; children: React.ReactNode
}) {
  const segment = useSelectedLayoutSegment()
  return <Link href={`/blog/${slug}`} style={{fontWeight: slug === segment ? 'bold' : 'normal'}}>
    {children}
  </Link>
}
```

server blog layout은 featuredPosts를 조회하고 이 client link에 slug/title을 전달한다. breadcrumbs는 복수 hook 결과를 list로 그리며 불필요한 route group을 먼저 filter한다. pathname+searchParams를 dependency로 가진 Effect는 URL 변경에 반응한다.

## query 렌더링 위치와 rewrite 예제

prerendered SearchBar의 query console은 build 서버에서 실행되지 않고 Suspense fallback이 최초 HTML에 들어간다. connection 후 dynamic rendering에서는 최초 client component render가 server에서도 query를 읽고 이후 이동 때는 browser에서 읽는다. 이는 server component에서 hook을 호출해도 된다는 뜻이 아니다.

```tsx
const pathname = usePathname()
const [clientPathname, setClientPathname] = useState('')
useEffect(() => { setClientPathname(pathname) }, [pathname])
return <span>{clientPathname}</span>
```

rewrite 경로 badge를 위처럼 작은 영역으로 격리하면 source path와 browser path의 초기 차이를 피한다. mount 후 표시 전의 fallback flash가 남는다. Pages fallback/Automatic Static Optimization은 pathname null과 params 초기 null을 만들 수 있으며 app+pages가 함께 있으면 반환 타입도 조정된다. query는 get/has/getAll/keys/values/entries/forEach/toString을 읽기 전용으로 쓰고 수정은 복제해 router 또는 Link에 넘긴다.

useParams는 v13.3.0, pathname/searchParams/selectedSegment(s)는 v13.0.0에 도입됐다.

## 이해 확인

1. `?a=&a=2`의 get/getAll/has 결과는?
2. dev에서는 잘 되는데 production build에서 query UI가 실패하는 이유는?
3. selected segments를 그대로 breadcrumb로 쓰면 group/catch-all에서 어떤 문제가 생기는가?

## 출처

- [Next.js, use-params](https://nextjs.org/docs/app/api-reference/functions/use-params)
- [Next.js, use-pathname](https://nextjs.org/docs/app/api-reference/functions/use-pathname)
- [Next.js, use-search-params](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [Next.js, use-selected-layout-segment](https://nextjs.org/docs/app/api-reference/functions/use-selected-layout-segment)
- [Next.js, use-selected-layout-segments](https://nextjs.org/docs/app/api-reference/functions/use-selected-layout-segments)

## 관련 문서

- [[NextJS-App-Layouts]]
- [[NextJS-App-Dynamic-Segments]]
- [[React-Suspense-and-Lazy]]
