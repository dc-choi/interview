---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Codemod의 실제 입력과 출력 예제"]
---

# Codemod의 실제 입력과 출력 예제

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 실행 명령과16.3 변환

```bash
npx @next/codemod <transform> <path> --dry --print
npx @next/codemod upgrade minor
npx @next/codemod upgrade major
npx @next/codemod upgrade canary --yes
npx @next/codemod@canary cache-components-instant-false ./app
npx @next/codemod@canary remove-partial-prefetch ./app
```

transform/path는 이름과 대상 file/directory다. upgrade patch는 patch,minor는 stable기본 minor,major는 major,16/15.0.0 같은 exact target와 latest/canary/rc tag도 지정할 수 있다. --verbose 상세 로그, -y/--yes 또는 non-TTY는 모든 default를 수용한다. 현재보다 같거나 낮은 target은 변경 없이 종료한다. src project 대상은 ./src/app이다. 잘못된 path의 0 ok를 completion으로 읽지 않는다.

```diff
+ // TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
+ export const instant = false
  export default function Page() { return <h1>Hello</h1> }
- export const prefetch = 'partial'
```

첫 transform은 instant 없는 page/layout/default, use client 제외, 기존 instant 유지다. 둘째는 page/layout에서 partial 값만 제거하고 force-disabled는 유지한다. global cacheComponents/partialPrefetching 도입 뒤 route별 opt-out을 제거하는 단계다.

## 16.0 config와 ESLint

```diff
- export const experimental_ppr = true
- import { unstable_cacheTag as cacheTag } from 'next/cache'
+ import { cacheTag } from 'next/cache'
- export function middleware() { return NextResponse.next() }
+ export function proxy() { return NextResponse.next() }
- "lint": "next lint"
+ "lint": "eslint ."
```

명령은 `npx @next/codemod@latest remove-experimental-ppr .`, remove-unstable-prefix ., middleware-to-proxy .이며 lint만 `@canary next-lint-to-eslint-cli .`다. middleware 파일명이 proxy로 바뀌고 config rename 전체는 [[NextJS-Codemods#16.0의 기계 변경]]을 따른다. lint transform은 dependencies를 추가하고 기존 설정을 보존한다.

```js
// 생성되는 eslint.config.mjs의 legacy compatibility 형태
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })
export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'] },
]
```

위는 codemod가 보여 주는 compatibility 예다. 실제 현재 flat-config preset와 설치 eslint-config-next 지원을 확인한다. config 생성만으로 기존 custom rules가 모두 보존됐다고 단정하지 않는다.

## 15 async APIs와 수동 개입

```diff
- export const runtime = 'experimental-edge'
+ export const runtime = 'edge'
- const token = cookies().get('token')
+ const token = (cookies() as unknown as UnsafeUnwrappedCookies).get('token')
- function useToken() { return cookies().get('token') }
+ function useToken() { return use(cookies()).get('token') }
- export default function Page() { const name = cookies().get('name') }
+ export default async function Page() { const name = (await cookies()).get('name') }
- function getHeader() { return headers().get('x-foo') }
+ function getHeader() { return (headers() as unknown as UnsafeUnwrappedHeaders).get('x-foo') }
```

runtime transform은 App-specific `app-dir-runtime-config-experimental-edge .`다. async transform은 `next-async-request-api .`이며 headers/cookies/draftMode, page/layout/route/default 및 generateMetadata/generateViewport props를 처리한다. use는 react, UnsafeUnwrappedCookies/Headers는 next/headers import를 추가한15의 temporary output이다.16에서는 cast를 남기지 않고 호출 범위를 request-time async로 고친다. module top-level request API 접근은 유효한 해결이 아니다.

```tsx
export default async function Page(props: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { value } = await props.searchParams
  return <p>{Array.isArray(value) ? value.join(',') : value}</p>
}
export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  return { title: `My Page - ${(await props.params).slug}` }
}
```

이전 params/searchParams object sync access가 Promise await로 바뀐다. async로 만들 수 없는 Client Component는 React.use로 unwrap한다. unresolved @next/codemod comment/UnsafeUnwrapped cast를 검토하고 해결한다. marker가 남으면 build 오류가 생기며 검토 없이 삭제해도 올바른 전환이 아니다.

```diff
- const { geo, ip } = req
+ const geo = geolocation(req)
+ const ip = ipAddress(req)
```

next-request-geo-ip .는 @vercel/functions를 설치하고 geolocation/ipAddress import를 추가한다. host가 Vercel 정보를 공급하는 조건을 검증한다.

## 14 metadata와13.2 font

```diff
- import { ImageResponse } from 'next/server'
+ import { ImageResponse } from 'next/og'
- export const metadata = { title:'My App', themeColor:'dark', viewport:{width:1} }
+ export const metadata = { title:'My App' }
+ export const viewport = { width:1, themeColor:'dark' }
- import { Inter } from '@next/font/google'
+ import { Inter } from 'next/font/google'
```

명령은 next-og-import ., metadata-to-viewport-export ., built-in-next-font .를 @latest로 실행한다. viewport 예의 dark는 변환 입력을 보여 주는 값이며 실제 CSS color 요구에 맞는 값으로 교정한다. font transform은 @next/font package를 uninstall한다.

## 13 Image와 Link

```diff
- import Image1 from 'next/image'
- import Image2 from 'next/future/image'
+ import Image1 from 'next/legacy/image'
+ import Image2 from 'next/image'
```

next-image-to-legacy-image .는 기존10/11/12 동작 유지용이고 future는 new Image로 옮긴다. src /test.jpg 치수200×300, /test.png500×400 같은 component props는 유지하지만 new Image에는 실제 alt도 필요하다. next-image-experimental .는 legacy import 이후 실행하며 layout/objectFit/objectPosition을 style로 바꾸고 lazyBoundary/lazyRoot를 제거해 동작이 바뀔 수 있다.

```diff
- <Link href="/about"><a>About</a></Link>
+ <Link href="/about">About</Link>
- <Link href="/about"><a onClick={() => console.log('clicked')}>About</a></Link>
+ <Link href="/about" onClick={() => console.log('clicked')}>About</Link>
```

new-link .는 nested a와 anchor handler/attrs를 옮긴다. custom wrapper는 별도 확인한다.

## 11 이하의 역사적 변환

cra-to-next는 Pages Router와 config, initial client-only로 window SSR 문제를 줄이는 과거 경로다. 최신 App CRA 가이드와 같지 않다. add-missing-react-import는 React.Component를 쓰면서 import 없는 class에 `import React from 'react'`를 추가한다. name-default-component는 my-component.js의 익명 default function을 MyComponent로, arrow도 파일 기반 이름으로 바꿔9+ Fast Refresh를 돕는다.

```diff
- import { withAmp } from 'next/amp'
- function Home() { return <h1>My AMP Page</h1> }
- export default withAmp(Home)
+ export default function Home() { return <h1>My AMP Page</h1> }
+ export const config = { amp: true }
```

withamp-to-config는8의 HOC→9page config 역사이며 AMP와 이 transform은16에서 제거됐다. url-to-withrouter는 class의 this.props.url.pathname을 this.props.router.pathname으로 바꾸고 `import {withRouter} from 'next/router'` 후 default class를 withRouter로 감싼다. 자동 주입 url을 명시적인 Pages router HOC로 대체하는6의 변환이다. command cra-to-next/add-missing-react-import/name-default-component/withamp-to-config/url-to-withrouter는 원문처럼 대상 path 없이 제시되지만 실제 호출은 도구 prompt/support를 확인한다. fixtures는 transform 사례의 근거이지 현재 앱 검증 결과가 아니다.

## 출처

- [Next.js, Codemods](https://nextjs.org/docs/app/guides/upgrading/codemods)

## 관련 문서

- [[NextJS-Codemods]]
- [[NextJS-Pages-to-App-Migration]]
