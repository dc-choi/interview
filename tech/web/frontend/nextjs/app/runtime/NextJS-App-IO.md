---
tags: [nextjs, app-router, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["io와 connection의 실행 경계"]
---

# io와 connection의 실행 경계

## io는 대기 지점을 명시한다

`next/cache`의 io는 인자 없이 Promise<void>를 반환한다. Cache Components prerender 중 uncached I/O가 시작될 지점을 알려 해당 subtree를 suspend하게 한다. request-time render, cache scope, browser, generateStaticParams, Cache Components를 끈 환경과 Pages Router에서는 즉시 resolve한다. 명시적인 await 지점 없이 동기 작업을 시작해야 할 때 특히 의미가 있다.

```tsx
import { io } from 'next/cache'
async function RequestOnlyNumber() {
  await io()
  const value = Math.random()
  return <p>{value}</p>
}
// 호출하는 쪽의 Suspense가 prerender fallback을 제공한다.
```

async fetch, await하는 database 호출, cookies/headers 같은 request API에 이미 suspend 가능한 경계가 있으면 io를 추가할 필요가 없을 수 있다. synchronous I/O나 random을 경계보다 먼저 실행하면 나중에 io를 부르는 것으로 앞선 실행을 되돌릴 수 없다. 파일 동기 read, 일부 동기 library, request별 random은 io 뒤에 둔다.

Client Component에서 React `use(io())`로 경계를 표시하고 그 뒤 동기 source를 읽는 패턴도 가능하다. Client Component는 browser에서만 실행되는 것이 아니라 서버 prerender에도 참여할 수 있다. browser globals를 다룰 때는 이 차이를 함께 고려한다. 단순히 use client를 붙이는 것으로 서버의 동기 prerender 문제가 해결되지 않는다.

## connection은 실제 요청을 기다린다

`next/server`의 connection도 인자 없이 Promise<void>를 반환한다. 실제 incoming request까지 기다리고 그 아래 부분을 prerender에서 제외한다. prefetch 단계까지 제외하는 request-only 의도에 사용한다. dynamic API를 읽지는 않지만 random 또는 third-party library 때문에 반드시 요청 이후 실행해야 하는 경우에 쓸 수 있다.

```tsx
import { connection } from 'next/server'
export default async function Page() {
  await connection()
  return <p>{Math.random()}</p>
}
```

Cache Components에서는 io가 cache와 prefetch에서도 사용할 수 있는 일반적인 I/O 경계이며 connection보다 먼저 검토한다. connection은 regular/private cache scope 안에서 쓸 수 없다. 실제 request만 기다리려는 요구가 없는 조회를 connection으로 모두 감싸면 prefetch의 이점을 잃는다.

## instant와 혼동하지 않는다

instant=false는 즉시 navigation 검증 기대를 끄는 설정이다. synchronous uncached I/O의 올바른 경계를 만드는 API가 아니다. async 요청 작업이 어느 Suspense까지 도달하는지, cache 가능한지, prefetched shell에 포함해야 하는지를 먼저 정한다.

## 동기 database와 client clock 예제

```ts
// Cache Components에서 synchronous database를 요청 구간으로 분리한다.
async function getVisitorCount() {
  await io()
  return db.prepare('SELECT value FROM counters WHERE name = ?').get('visitors')
}
```

better-sqlite3처럼 동기 driver는 read 전에 suspension point가 없으면 build 중 실행된다. Cache Components를 끈 기존 request-only 의도는 먼저 connection을 await하고 같은 query를 한다. query helper를 호출한 component의 나머지 출력도 해당 경계 아래가 된다.

```tsx
'use client'
import { use } from 'react'
import { io } from 'next/cache'
export function Clock() {
  use(io())
  return <div>{Date.now()}</div>
}
```

server current time은 `await io(); return <p>{new Date().toISOString()}</p>`로 Suspense 아래에 둔다. random/crypto.randomUUID도 같은 동기 source다. use cache scope에서는 io가 no-op이므로 그 값을 잡아 static shell에 재사용하며 boundary가 불필요할 수 있다. io는 v16.3.0, connection은 v15RC 도입 후 v15.0.0 안정화됐다. connection은 unstable_noStore를 대체하며 반환 Promise<void>의 값을 소비하지 않는다.

## 이해 확인

1. Math.random 뒤의 await io가 해당 random을 prerender에서 제외할 수 있는가?
2. io와 connection 중 prefetch에서도 실행 가능한 경계는 무엇인가?
3. Client Component가 서버에서도 렌더링된다는 사실은 동기 browser API에 어떤 영향을 주는가?

## 출처

- [Next.js, connection](https://nextjs.org/docs/app/api-reference/functions/connection)
- [Next.js, io](https://nextjs.org/docs/app/api-reference/functions/io)

## 관련 문서

- [[NextJS-App-Cache-Components]]
- [[NextJS-App-Instant-Validation]]
- [[React-Resources-and-Use]]
