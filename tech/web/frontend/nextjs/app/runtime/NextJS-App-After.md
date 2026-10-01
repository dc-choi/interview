---
tags: [nextjs, app-router, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["응답 이후 작업과 after의 수명"]
---

# 응답 이후 작업과 after의 수명

## after의 호출 계약

after는 next/server에서 import하고 callback을 받는다. response 또는 prerender가 끝난 뒤 callback을 실행하도록 예약한다. Server Component, generateMetadata, Server Function, Route Handler와 Proxy에서 사용할 수 있다. logging/analytics처럼 응답을 막지 않아도 되는 부가 작업이 주요 예다.

```ts
import { after } from 'next/server'
export async function POST(request: Request) {
  const user = await authenticate(request)
  const result = await writeCriticalData(user, request)
  after(async () => { await logSanitizedResult(result.id) })
  return Response.json({ id: result.id })
}
```

응답 전에 완료되어야 할 핵심 write는 await한다. after는 durable job queue나 트랜잭션 commit 보장이 아니다. 작업 중 process 종료, platform timeout, network failure의 결과를 정책으로 처리한다.

## 정적 page와 오류

after 자체는 route를 dynamic으로 바꾸는 Request API가 아니다. 정적 page에서 사용하면 build 중이나 revalidation 완료 뒤 실행될 수 있다. production 요청 한 번마다 반드시 실행된다는 해석은 틀릴 수 있다. route가 error, notFound, redirect로 끝나도 after callback은 실행될 수 있으므로 성공 전용 logging이면 condition을 명시한다.

callback 안에서 또 after를 호출할 수 있다. React cache로 공유 부가 작업을 deduplicate할 수 있지만 cache scope와 인자를 확인한다. 중첩 작업을 무제한 연결하면 response가 빨라도 host 실행 시간을 늘릴 수 있다.

## request API를 읽는 위치

Route Handler/Server Action의 after callback에서는 cookies/headers 같은 request API를 읽을 수 있다. Server Component의 callback에서 request API를 새로 읽는 것은 지원되지 않는다. component render 중 필요한 값을 읽어 closure로 전달하고, Cache Components라면 해당 read의 Suspense 경계를 둔다.

```tsx
async function Page() {
  const requestHeaders = await headers()
  const agent = sanitizeAgent(requestHeaders.get('user-agent'))
  after(() => recordVisit(agent))
  return <Article />
}
```

request 전체를 closure에 담는 대신 필요한 최소 값만 전달한다. 비밀 token이나 개인 정보를 무조건 background logger로 보내지 않는다.

## host가 제공해야 할 수명

작업은 platform의 maximum duration을 따른다. self-hosted Node/Docker는 지원되지만 static export에는 요청 이후 server 작업 자체가 없다. serverless adapter는 response 뒤 Promise가 유지되도록 waitUntil 같은 수명 연장이 필요하다.

custom adapter 문서는 global Symbol.for('@next/request-context')의 get()이 waitUntil을 제공하는 계약을 설명한다. 서버에서 after를 호출했지만 callback 로그가 사라지면 API 사용뿐 아니라 adapter integration과 host 수명 지원을 확인한다. fire-and-forget Promise를 만든 것만으로 응답 뒤 실행을 보장하지 않는다.

## request read 두 위치의 대표 예제

```ts
// Route Handler/Server Function callback은 request API를 읽을 수 있다.
after(async () => {
  const userAgent = (await headers()).get('user-agent') || 'unknown'
  const session = (await cookies()).get('session-id')?.value || 'anonymous'
  await logSanitizedAction({ userAgent, session })
})
```

Server Component는 위 read를 callback 전에 실행하고 primitive 값을 closure로 넘긴다. Cache Components에서는 DynamicContent를 Suspense로 감싼 뒤 DynamicContent의 render에서 session을 읽고 after를 등록하면 heading/fallback은 static shell에 들어간다. render lifecycle 밖 callback에서 read하면 runtime 오류다.

## custom serverless adapter의 request context

```ts
import { AsyncLocalStorage } from 'node:async_hooks'
interface RequestContextValue { waitUntil?: (promise: Promise<unknown>) => void }
const storage = new AsyncLocalStorage<RequestContextValue>()
globalThis[Symbol.for('@next/request-context')] = { get: () => storage.getStore() }
const handler = (req, res) => storage.run({ waitUntil: platformWaitUntil },
  () => nextJsHandler(req, res))
```

Next.js는 symbol 객체의 `get()` 결과에서 optional waitUntil을 읽는다. host의 platformWaitUntil은 받은 Promise들이 settle할 때까지 invocation lifetime을 유지해야 한다. context는 request마다 AsyncLocalStorage.run으로 연결하고 전역 한 request값으로 공유하지 않는다. Node server/Docker는 지원, static export는 미지원, adapter는 플랫폼별 지원이다. after는 v15RC의 unstable_after로 도입됐고 v15.1.0 안정화됐다.

## 이해 확인

1. static page의 after는 언제 실행될 수 있는가?
2. Server Component after 안에서 headers를 새로 읽는 대신 무엇을 해야 하는가?
3. 결제 완료 write를 after에 맡겼을 때 응답 성공과 데이터 성공을 동일시할 수 있는가?

## 출처

- [Next.js, after](https://nextjs.org/docs/app/api-reference/functions/after)

## 관련 문서

- [[NextJS-App-Segment-Runtime]]
- [[NextJS-App-Request-Response]]
- [[NextJS-App-Route-Handlers]]
