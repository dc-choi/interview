---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages에서 App으로 UI, layout과 hooks를 옮기는 예제"]
---

# Pages에서 App으로 UI, layout과 hooks를 옮기는 예제

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 버전 upgrade와 Router adoption

원문은 12→13 upgrade 배경과 Node18.17을 포함한다. 현재 Next16에는 Node20.9 등 현재 요구조건을 쓰며 과거 guide의 `npm install next@latest react@latest react-dom@latest`가 13을 pin하지 않는다는 점을 확인한다. eslint-config-next@latest는 설치한 Next와 맞추고 VS Code 변경이 반영되지 않으면 Command Palette에서 ESLint: Restart ESLint Server를 실행한다.

13 App Router는 Pages와 공존하며 package upgrade 뒤 기존 Pages를 계속 써도 된다. new Image/Link/Script/font는 양쪽에서 사용 가능하다. root/src에 app을 만드는 원문의 단계는 13.4 이상을 요구한 adoption 단계다. 현재 target 요구는 현재 설치 문서에 맞춘다.

| Pages 파일 | App 파일 | URL |
| --- | --- | --- |
| pages/index.tsx | app/page.tsx | / |
| pages/about.tsx | app/about/page.tsx | /about |
| pages/blog/[slug].tsx | app/blog/[slug]/page.tsx | /blog/post-1 |

page만 route를 공개하고 layout은 공유 UI다. App에는 component/style/test를 colocate할 수 있다. Pages test는 route로 인식되지 않게 별도 디렉터리에 둔다. .js/.jsx/.tsx special file을 지원한다.

## root layout과 metadata

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import '../styles/globals.css'
export const metadata: Metadata = { title: 'Home', description: 'Welcome to Next.js' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
```

App root layout은 필수이며 html/body를 직접 정의한다. 기존 _app/_document의 styles/문서 설정을 옮겨도 App style은 Pages에 적용되지 않으므로 남은 Pages에는 기존 파일을 유지한다. Context provider는 별도 Client Component로 옮긴다. next/head의 `<Head><title>My page title</title></Head>`는 App에서 `export const metadata = { title:'My Page Title' }` 또는 generateMetadata로 바꾼다.

## getLayout에서 nested layout으로

```tsx
// Pages 이전 형태
import DashboardLayout from '@/components/dashboard-layout'
export default function Page() { return <p>My Page</p> }
Page.getLayout = function getLayout(page: React.ReactNode) {
  return <DashboardLayout>{page}</DashboardLayout>
}
```

```tsx
// app/dashboard/dashboard-layout.tsx
'use client'
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div><h2>My Dashboard</h2>{children}</div>
}
```

```tsx
// app/dashboard/layout.tsx
import DashboardLayout from './dashboard-layout'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
```

app/dashboard/page.tsx는 getLayout 없이 `<p>My Page</p>`를 반환한다. 처음에는 client wrapper로 기존 동작을 유지하고 비대화형 h2/div를 server layout으로 옮겨 client JS를 줄일 수 있다. 원문의 Pages relative DashboardLayout import는 directory 수준과 맞지 않아 alias를 사용했다.

## 기존 interactive page와 server 조회 분리

```tsx
// app/home-page.tsx
'use client'
export default function HomePage({ recentPosts }: {
  recentPosts: { id: string; title: string }[]
}) {
  return <div>{recentPosts.map(post => <div key={post.id}>{post.title}</div>)}</div>
}
```

```tsx
// app/page.tsx
import HomePage from './home-page'
export default async function Page() {
  const res = await fetch('https://cms.example.com/posts')
  if (!res.ok) throw new Error('게시물 조회 실패')
  const recentPosts = await res.json()
  return <HomePage recentPosts={recentPosts} />
}
```

기존 default page body를 client module로 옮기고 server page가 import하여 데이터를 props로 넘긴다. useState/effect/state 접근을 유지하면서 초기 server HTML prerender에도 참여한다. browser-only 접근은 render 중 실행하지 않도록 검사한다. 개발 서버에서 / 경로를 확인하고 같은 URL의 Pages file과 충돌을 제거한다.

## routing hook 대응과 삭제된 속성

```tsx
'use client'
import { useRouter, usePathname, useSearchParams, useParams } from 'next/navigation'
export default function Example() {
  const router = useRouter()
  const pathname = usePathname()
  const query = useSearchParams()
  const params = useParams()
  return <button onClick={() => router.push('/dashboard')}>
    {pathname}: {query.get('query')}, {String(params.id ?? '')}
  </button>
}
```

App은 next/router가 아니라 next/navigation을 사용한다. pathname은 usePathname, search query는 useSearchParams, dynamic params는 useParams다. router.events는 pathname/searchParams를 조합해 관측한다. hooks는 Client Component에 둔다. shared component는 next/compat/router의 nullable Pages router를 사용하고 App 전용이 된 뒤 제거한다.

| 제거된 Pages router field | 대응/주의 |
| --- | --- |
| isFallback | streaming/unknown parameter 정책으로 다시 설계 |
| locale/locales/defaultLocale/domainLocales | App locale routing 별도 설계 |
| basePath | App useRouter 반환에 없음, router property로 대체하지 않음 |
| asPath | 새 router 반환에 없음 |
| isReady | static useSearchParams subtree/Suspense 경계를 확인 |
| route | usePathname/useSelectedLayoutSegments |

원문의 useSearchParams prerender skip 문장은 전체 page가 항상 client-only라는 의미로 확대하지 않는다. 현재 Suspense/Cache Components 조건은 최신 hook reference를 따른다. Pages↔App은 기본 hard navigation이고 자동 Link prefetch는 router를 넘지 않는다.

## 공통 asset과 style의 migration

new-link는 nested a를 제거하고 underlying anchor props를 Link에 준다. image-to-legacy는 동작 유지 import rename이고 experimental image는 inline style/prop 제거로 동작이 바뀐다. beforeInteractive Script는 _document에서 root layout으로, callbacks는 Client Component로 옮긴다. worker는 App 미지원이다. Pages font CSS inlining과 달리 App은 next/font를 사용한다.

App global CSS import는 page/layout/component에 가능하고 Pages는 _app 제한이다. Tailwind3 content에 `'./app/**/*.{js,ts,jsx,tsx,mdx}'`를 추가하고 root layout에 globals.css를 import한다. 기존 pages/components glob도 전환 중 유지한다. Tailwind4 구성과 혼합하지 않는다. _error→segment error,404→not-found, API Routes→route.ts는 각각의 오류/요청 타입 계약을 다시 확인한다.

## 출처

- [Next.js, App migration](https://nextjs.org/docs/app/guides/migrating/app-router-migration)

## 관련 문서

- [[NextJS-Pages-to-App-Migration]]
- [[NextJS-Pages-to-App-Data-Examples]]
