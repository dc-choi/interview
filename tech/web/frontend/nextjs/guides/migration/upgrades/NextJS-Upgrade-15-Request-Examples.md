---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next15의 async request와 cache 전환 예제"]
---

# Next15의 async request와 cache 전환 예제

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 설치와 React 버전 경계

13→14의 원문 npm 설치는 `npm i next@next-14 react@18 react-dom@18`, `npm i -D eslint-config-next@next-14`다. yarn/pnpm/bun 변형은 같은 dependency/tag다. TypeScript는 React type package도 설치 React major와 맞춘다. Node18.17, next export 제거, next/og 및 built-in next/font, SWC WASM target 제거는 [[NextJS-Upgrade-14-and-15#13에서14]]를 따른다.

14→15 원문은 `npx @next/codemod@canary upgrade latest` 또는 `npm install next@latest react@latest react-dom@latest eslint-config-next@latest`를 안내한다. 이는 실행 시점 latest라15에 pin하는 명령이 아니다. 정확한15 target이면 해당 지원 버전을 지정한다. 과거 React19 prerelease peer warning의 --force/--legacy-peer-deps 우회 안내는 현재 지원 확인을 대신하지 않는다.

15 guide 최소 React/ReactDOM19에서 useFormState는 useActionState로 대체하며 기존 hook은 deprecated다. useActionState는 pending도 반환한다. useFormStatus는 React19에서 data/method/action을 추가하고 이전 버전은 pending만 제공한다. React type package를 함께 맞춘다.

## cookies, headers와 draftMode

```tsx
import { cookies, headers, draftMode } from 'next/headers'
export default async function Page() {
  const token = (await cookies()).get('token')
  const userAgent = (await headers()).get('user-agent')
  const { isEnabled } = await draftMode()
  // token은 서버에서 사용하고 browser에 노출하지 않는다.
  return <p>{userAgent}: {isEnabled ? '미리보기' : '공개'}</p>
}
```

이전에는 cookies().get/headers().get/draftMode().isEnabled로 동기 접근했다.15의 temporary synchronous access는 `cookies() as unknown as UnsafeUnwrappedCookies`, headers에는 UnsafeUnwrappedHeaders, draftMode에는 UnsafeUnwrappedDraftMode를 next/headers에서 import해 사용하고 dev warning을 냈다.16에서 유지할 코드가 아니며 module scope 요청 접근도 해결하지 못한다.

async 대상은 cookies/headers/draftMode, layout/page/route/default/opengraph-image/twitter-image/icon/apple-icon의 params, page searchParams다. metadata/generateViewport 사용부도 해당 Promise 입력을 맞춘다.

## server layout/page와 metadata

```tsx
import type { ReactNode } from 'react'
type Params = Promise<{ slug: string }>
export async function generateMetadata({ params }: { params: Params }) {
  return { title: `My Page - ${(await params).slug}` }
}
export default async function Layout({ children, params }: { children: ReactNode; params: Params }) {
  const { slug } = await params
  return <section data-slug={slug}>{children}</section>
}
```

Pages 함수처럼 plain object params를 바로 destructure하던 부분을 Promise 타입과 await로 바꾼다. root layout에 둘 경우 html/body도 반환한다. page는 searchParams도 Promise다.

```tsx
type Params = Promise<{ slug: string }>
type Query = Promise<Record<string, string | string[] | undefined>>
export async function generateMetadata(props: { params: Params; searchParams: Query }) {
  const [params, search] = await Promise.all([props.params, props.searchParams])
  return { title: `${params.slug} - ${String(search.query ?? '')}` }
}
export default async function Page(props: { params: Params; searchParams: Query }) {
  const [params, search] = await Promise.all([props.params, props.searchParams])
  return <p>{params.slug}: {String(search.query ?? '')}</p>
}
```

## synchronous component와 Route Handler

```tsx
'use client'
import { use } from 'react'
export default function Page(props: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = use(props.params)
  const { query } = use(props.searchParams)
  return <p>{slug}: {String(query ?? '')}</p>
}
```

synchronous Layout도 `use(props.params)` 후 children을 렌더한다. client로 전환할 필요가 없는 Server Component를 단지 async 변경을 피하려고 client로 옮기지 않는다. JS 변형은 같은 use/await 실행 흐름에서 타입만 제거한다.

```ts
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  return Response.json({ slug })
}
```

원문의 body만 있고 return 없는 Handler 예는 응답을 반환하도록 완성했다. codemod가 unresolved marker/cast를 남기면 직접 호출 범위와 async boundary를 고친다.

## 15의 fetch/GET/client cache 설정

```tsx
// legacy segment option, Cache Components에서는 지원하지 않는 export
export const fetchCache = 'default-cache'
export default async function Page() {
  const a = await fetch('https://api.example.com/a')
  const b = await fetch('https://api.example.com/b', { cache: 'no-store' })
  return <p>{a.status}, {b.status}</p>
}
```

fetch는15부터 기본 cache되지 않는다. force-cache를 개별 지정하거나 위 default-cache를 당시 legacy layout/page에 둔다. 개별 cache 옵션이 기본값보다 우선하며 b는 no-store다. 기본 GET Handler도 cache되지 않고 legacy opt-in은 `export const dynamic='force-static'`과 응답을 반환하는 GET이다. Cache Components 모델에서 이 segment 옵션을 무조건 유지하지 않는다.

```js
// next.config.js:15 client page cache opt-in 예
module.exports = { experimental: { staleTimes: { dynamic: 30, static: 180 } } }
```

Link/useRouter 새 이동에서 page segment는 기본 재사용되지 않지만 back/forward, 공유 layout와 loading state는 재사용한다. staleTimes는 초 단위 설정이며 최신16.3 Partial Prefetching/Activity 계약과 별도다.

## config, instrumentation과 host

```diff
- experimental: { bundlePagesExternals: true }
+ bundlePagesRouterDependencies: true
- experimental: { serverComponentsExternalPackages: ['package-name'] }
+ serverExternalPackages: ['package-name']
- export const runtime = 'experimental-edge'
+ export const runtime = 'edge'
- import { Inter } from '@next/font/google'
+ import { Inter } from 'next/font/google'
```

experimental-edge는15부터 오류이며 codemod로 edge로 옮긴다. geo/ip는 NextRequest에서 제거되어 Vercel에서는 `import {geolocation,ipAddress} from '@vercel/functions'`, `geolocation(request).city`, `ipAddress(request)`로 읽는다.15 원문 middleware 명칭은16 Proxy rename 이전 역사다. 자동 Speed Insights instrumentation은15에서 제거되어 provider quickstart로 명시적으로 연결해야 한다. config/import rename과 server runtime/host behavior 검증은 다른 작업이다.

## 출처

- [Next.js, 14 upgrade](https://nextjs.org/docs/app/guides/upgrading/version-14)
- [Next.js, 15 upgrade](https://nextjs.org/docs/app/guides/upgrading/version-15)

## 관련 문서

- [[NextJS-Upgrade-14-and-15]]
- [[NextJS-Codemod-Examples]]
