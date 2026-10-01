---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Client bundle 지연 로딩", "NextJS Lazy Loading"]
---

# Client bundle 지연 로딩

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## code splitting과 렌더 지연

lazy loading은 처음부터 필요하지 않은 Client Components/library의 JavaScript를 늦게 가져오는 방식이다. Server Component는 기본 code split되고 streaming으로 서버 결과를 나눠 보낼 수 있다. client bundle 지연과 서버 데이터 대기 UI는 서로 다른 문제다.

next/dynamic은 React.lazy/Suspense를 결합한 API이며 app/pages에서 점진적 이전이 가능하다. 별도 chunk로 나눴다고 반드시 사용자 interaction 때까지 요청을 늦추는 것은 아니다. 렌더하는 시점과 preload도 확인한다.

~~~tsx
'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
const Modal = dynamic(() => import('./modal'), {
  loading: () => <p>도구를 불러오는 중</p>,
})
const BrowserOnly = dynamic(() => import('./browser-only'), { ssr: false })
export default function Tools() {
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={() => setOpen(true)}>열기</button>
    {open && <Modal />}
    <BrowserOnly />
  </>
}
~~~

Modal은 조건부 렌더할 때 필요해진다. BrowserOnly는 client에서만 render한다. Client Component도 기본 SSR/prerender 대상이므로 use client만 붙여 window를 module evaluation에서 안전하게 쓰는 것은 아니다.

## Server/Client 경계 제약

ssr:false는 Client Component에서만 가능하며 Server Component에서 설정하면 오류다. 브라우저 의존 library를 쓰는 wrapper로 옮긴다.

Server Component가 Client Component를 dynamic import할 때 현재 automatic client code splitting은 지원되지 않는다. Server Component 자체를 dynamic import하면 그 서버 component를 브라우저로 lazy load하는 것이 아니라 자식 Client Component 지연과 CSS 같은 static asset preload를 돕는다.

named export는 import Promise에서 선택해 반환한다.

~~~tsx
const Editor = dynamic(() =>
  import('./editor').then(module => module.Editor)
)
~~~

loading option은 component chunk가 준비되는 동안 fallback을 제공한다. 오류 retry와 사용자 데이터 보존은 별도 UX로 정한다.

## library를 이벤트에서 import한다

일회성 검색/차트 library는 async event에서 import할 수 있다. e.currentTarget.value는 await 전에 읽어 보존한다. module cache는 다시 import할 때 module을 재사용하지만 검색 instance 생성 비용은 별도로 남는다.

~~~tsx
'use client'
const names = ['Alpha', 'Beta', 'Gamma']
const search = async (value: string) => {
  const Fuse = (await import('fuse.js')).default
  return new Fuse(names).search(value)
}
~~~

빠른 입력에서 늦게 완료한 이전 검색이 최신 결과를 덮어쓰지 않도록 호출 순서/취소 정책을 정한다. 자주 쓰는 library는 첫 interaction 지연과 bundle 절감의 tradeoff를 측정한다.

## bundler magic comment

dynamic import/require/require.resolve/new Worker에서 사용할 수 있고 static import statement에는 효과가 없다.

| comment | 동작 |
| --- | --- |
| webpackIgnore:true | runtime import를 그대로 두어 bundling 생략 |
| turbopackIgnore:true | Turbopack의 bundling 생략 |
| turbopackOptional:true | 없는 module의 build 오류 억제, 실행 시에는 오류 |
| webpackOptional | 지원하지 않음 |

ignore는 런타임에서 모듈을 실제로 해결할 책임을 남긴다. optional은 dependency 누락을 정상으로 바꾸지 않으므로 사용되는 경로에서는 MODULE_NOT_FOUND 처리/기능 availability가 필요하다. Next의 관리 chunk에 대한 임의 runtime path 사용을 기본 패턴으로 삼지 않는다.

## preload 추적과 동적 import 실행 예제

Next가 module id와 chunk를 연결하려면 `dynamic`은 module top-level에 선언하고 그 안의 import 경로는 literal로 쓴다. template string/variable 경로나 render 함수 안의 dynamic 선언을 preload 가능한 동일 패턴으로 보지 않는다.

```tsx
const Immediate = dynamic(() => import('./A'))
const OnDemand = dynamic(() => import('./B'), { loading: () => <p>준비 중...</p> })
const BrowserOnly = dynamic(() => import('./C'), { ssr: false })
// JSX에서 <Immediate />, {open && <OnDemand />}, <BrowserOnly />를 비교한다.
```

```js
const runtime = await import(/* webpackIgnore: true */ 'runtime-module')
const plugin = await import(/* turbopackIgnore: true */ pluginPath)
const module = require(/* webpackIgnore: true */ 'runtime-module')
const feature = await import(/* turbopackOptional: true */ './optional-feature')
```

Turbopack-only optional은 해당 module이 없을 때 실행 경로에서 여전히 실패한다. 필요 없는 plugin은 해당 분기를 실행하지 않고, 필요한 plugin은 설치 여부/error를 처리한다.

```tsx
'use client'
import { useState } from 'react'
const names = ['Alpha', 'Beta', 'Gamma']
export default function Search() {
  const [results, setResults] = useState<unknown[]>([])
  return <><input onChange={async (event) => {
    const value = event.currentTarget.value
    const Fuse = (await import('fuse.js')).default
    setResults(new Fuse(names).search(value))
  }} /><pre>{JSON.stringify(results, null, 2)}</pre></>
}
```

외부 검색 library 설치가 필요한 예제다. 빠르게 바뀌는 입력의 순서 보장은 별도이며 해당 제품의 요구에 맞춰 보완한다.

## 학습 확인

- 별도 chunk인데 즉시 렌더되는 component와 click 이후 렌더되는 component를 구분한다.
- use client와 ssr:false가 각각 바꾸는 실행 범위를 설명한다.
- optional module의 build 성공과 runtime 성공을 구분한다.

## 출처

- [Next.js, lazy-loading](https://nextjs.org/docs/app/guides/lazy-loading)

## 관련 문서

- [[NextJS-Scripts-and-Third-Party]]
- [[NextJS-Pages-Rendering]]
