---
tags: [nextjs, app-router, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Route Handler의 HTTP 계약"]
---

# Route Handler의 HTTP 계약

## route.ts는 HTTP endpoint다

app 안의 route.ts는 Web Request/Response API를 사용하여 GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS를 export한다. 지원하지 않는 method는405, OPTIONS를 정의하지 않으면 지원 method에 따른 Allow 응답이 자동 생성된다. 같은 URL segment에 page와 route를 동시에 둘 수 없다. route는 layout이나 client navigation에 참여하지 않는다.

```ts
import type { NextRequest } from 'next/server'
export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/posts/[id]'>,
) {
  const { id } = await context.params
  const post = await loadPost(id)
  return post ? Response.json(post) : new Response(null, { status: 404 })
}
```

Request 대신 NextRequest를 받으면 cookies와 nextUrl helper를 쓸 수 있다. 두 번째 context의 params는 Promise이며 dynamic/catch-all segment에 맞춰 unwrap한다. 전역 RouteContext type은 next dev/build/typegen 과정에서 생성된다. request 없이 GET()으로 선언해도 된다.

## cache와 prerender

GET은 기본으로 request-time 동작한다. Cache Components를 끈 기존 모델에서는 dynamic='force-static'으로 GET cache를 opt in할 수 있다. GET 아닌 method는 cache되지 않는다. Cookie/header를 읽거나 mutation을 하는 endpoint를 정적 응답으로 만들지 않는다.

Cache Components GET은 결정적인 동기 응답이면 prerender할 수 있다. async network/DB/file, request properties, cookies/headers, connection, random 등은 prerender를 중단하고 request-time으로 넘어간다. cache 가능한 async 조회는 helper 함수의 use cache로 빼고 cacheLife를 설정한다. route handler 본문 자체에 use cache를 둘 수 없다.

metadata file convention의 robots/sitemap/image handler는 별도 정적 기본 동작을 갖지만 runtime API를 쓰면 달라진다. 일반 API endpoint의 GET 기본과 같은 것으로 가정하지 않는다.

## body, webhook과 CORS

request.json(), text(), formData()로 body를 읽는다. body stream은 한 번 소비되므로 같은 request를 두 번 parse하지 않는다. JSON의 field/type/size를 검증하고 예상 validation 실패는 적절한400 응답으로 표현한다. FormData 값은 string뿐 아니라 File일 수 있으므로 String(...) 변환으로 upload를 처리하지 않는다.

webhook 서명을 raw body 기준으로 확인해야 한다면 text/arrayBuffer를 먼저 확보하여 검증한 다음 parse한다. Pages API Route의 bodyParser 설정은 Route Handler에 필요하지 않다. origin이 다른 client를 허용한다면 allowlist에 맞춘 Access-Control-Allow-Origin, method/header와 OPTIONS를 설정한다. 인증이 필요한 모든 method에서 authorization을 확인하며 CORS가 인증을 대신하지 않는다.

## streaming과 일반 응답

Response는 JSON 외에도 text/XML/HTML/ReadableStream을 반환할 수 있다. iterator를 ReadableStream으로 변환할 때 pull에서 다음 chunk를 enqueue하고 종료하면 close한다. encoding과 Content-Type을 명시하고 producer 실패/abort/cancel의 처리를 포함한다. stream이 시작된 뒤 status나 header를 마음대로 바꾸지 않는다.

```ts
export async function POST(request: Request) {
  const body = await request.json()
  const parsed = validateCreateInput(body)
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 })
  const user = await authenticate(request)
  const result = await createForUser(user, parsed.value)
  return Response.json(result, { status: 201 })
}
```

응답 cache가 사용되는 route에서는 반환 상태, 원본 변경 완료, invalidation을 함께 확인한다. endpoint에 요청했다고 화면의 Client Component state가 자동으로 반영되지는 않는다.

## request와 응답 API의 실제 조합

| Handler 경로, URL | context.params |
| --- | --- |
| dashboard/[team], /dashboard/1 | Promise<{team:'1'}> |
| shop/[tag]/[item], /shop/1/2 | Promise<{tag:'1',item:'2'}> |
| blog/[...slug], /blog/1/2 | Promise<{slug:['1','2']}> |

`RouteContext<'/users/[id]'>`를 두 번째 인자로 받고 `(await ctx.params).id` 뒤 JSON을 반환한다. cookie는 `await cookies()`의 get/set/delete 또는 request.cookies.get으로 읽고, 직접 Response를 만들면 Set-Cookie header를 설정할 수 있다. token cookie가 없을 수 있으므로 `.get('token')?.value`를 확인한다. read-only headers의 referer는 새 Response headers에서 필요한 경우만 응답에 넣는다. request headers를 복사할 때는 `new Headers(request.headers)`를 쓴다.

`request.nextUrl.searchParams.get('query')`는 `/api/search?query=hello`에서 hello를 읽는다. JSON body를 그대로 감싸 반환하는 예제와 formData name/email read는 parse 방법을 보여 주며 실제 경계에서는 validation을 추가한다. FormData를 모두 string이라고 표현한 API 본문은 File upload 경우를 누락하므로 string/File 여부를 확인한다.

```ts
export async function GET() {
  return new Response('<rss version="2.0"><channel><title>서비스</title></channel></rss>', {
    headers: { 'Content-Type': 'text/xml' },
  })
}
```

RSS는 `app/rss.xml/route.ts`로 제공한다. sitemap/robots/icons/OG는 내장 metadata handler를 먼저 쓴다. redirect는 next/navigation의 redirect로 외부 URL도 보낼 수 있다. CORS 공개 API 예제는 origin `*`, methods `GET, POST, PUT, DELETE, OPTIONS`, headers `Content-Type, Authorization`을 응답에 설정한다. credentials/인증 요구가 있으면 origin allowlist를 검토하며 여러 endpoint에 공통 적용은 Proxy/next.config headers에서 관리한다.

## ReadableStream과 캐시 예제

```ts
const encoder = new TextEncoder()
async function* chunks() {
  for (const text of ['<p>One</p>', '<p>Two</p>', '<p>Three</p>']) {
    yield encoder.encode(text)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}
export async function GET() {
  const iterator = chunks()
  return new Response(new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()
      if (done) controller.close()
      else controller.enqueue(value)
    },
  }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
```

실서비스 producer에는 error/cancel 처리도 둔다. LLM 예제의 streamText와 StreamingTextResponse는 SDK version에 종속된 표현이다. 오래된 `toAIStream()` 호출을 현재 설치 SDK의 API로 단정하지 않고 Web stream Response 계약과 사용 중 SDK reference를 확인한다.

Cache Components의 결정적 projectName JSON은 build할 수 있고 Math.random 응답과 headers userAgent read는 request로 미룬다. DB products helper는 use cache + cacheLife('hours')로 결과를 static response에 넣고 새 요청 도착 시 lifetime에 따라 갱신한다. 기존 모델의 `revalidate = 60`와 `dynamic='auto'`, `dynamicParams=true`, `fetchCache='auto'`, `runtime='nodejs'`, deprecated preferredRegion auto export는 Cache Components 조건과 구분한다.

page/route는 서로 다른 verb만 제공하더라도 같은 URL을 공유할 수 없다. root page와 api route, user page와 api route는 서로 다른 URL이어서 가능하다. Route Handler는 v13.2 도입, v15RC context.params Promise 및 GET 기본 static에서 dynamic으로 변경됐다.

## Route Handler에서 금지된 continuation 응답

NextResponse.json/redirect 같은 응답 생성은 사용할 수 있지만 NextResponse.rewrite/next는 Proxy continuation용이며 Route Handler 반환으로 지원되지 않는다. 공식 App Route module은 rewrite 응답과 next 응답을 오류로 거부한다. 내부 로직을 재사용하려면 service 함수를 호출하고 다른 upstream을 proxy하려면 fetch 결과로 Web Response를 만들어 반환한다.

## 이해 확인

1. GET과 POST를 같은 route.ts에서 제공하면 POST 결과도 cache되는가?
2. Route Handler 안에서 use cache 대신 helper를 쓰는 이유는?
3. FormData의 file, webhook의 raw body를 모두 JSON/string으로 단순화하면 어떤 문제가 생기는가?

## 출처

- [Next.js, route-handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js, route](https://nextjs.org/docs/app/api-reference/file-conventions/route)

- [App Route module 구현 — Next.js 저장소](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/route-modules/app-route/module.ts)

## 관련 문서

- [[NextJS-App-Request-Response]]
- [[NextJS-App-Revalidation]]
- [[NextJS-App-Cache-Components]]
