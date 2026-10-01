---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js HTTP 처리와 콘텐츠 협상"]
---

# Next.js HTTP 처리와 콘텐츠 협상

## endpoint 생성과 입력 처리

`npx create-next-app@latest --api`는 `app/`에 Route Handler 예제를 만든다. `app/api/route.ts`에서 `export function GET(request: Request)`를 정의하면 `/api` GET 요청을 처리한다. endpoint는 공개되어 있으므로 인증과 리소스 인가가 필요하다. Route Handler는 프런트엔드 API 계층이며 지속 작업, 큐와 별도 backend 전체를 대체하지 않는다.

```ts
// app/api/echo/route.ts
export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() }
  catch { return Response.json({ error: '잘못된 JSON' }, { status: 400 }) }
  return Response.json({ received: body })
}
```

이는 JSON 파싱을 설명하는 echo 예제다. 업무 endpoint는 파싱 다음 schema와 권한을 검증해야 한다. 메일 발송이라면 `request.formData()`에서 email/contents를 추출하고 문자열/길이/수신 대상 검증 후 `sendMail`을 호출하며 반환값은 `messageId` 정도로 제한한다. 오류를 처리할 때 내부 Error.message를 그대로 응답에 넣지 않는다. 성공한 무본문 변경에는 `new Response(null, { status: 204 })`를 쓸 수 있다.

Web Request의 GET/HEAD에는 body를 실어 읽지 않는다. 본문을 여러 소비자에게 넘기려면 읽기 전에 `const copy = request.clone()`하고 각각 한 번씩 읽는다. 원본을 두 번 `.text()`하는 코드는 실패한다. clone은 큰 본문에서 버퍼링 비용이 발생하므로 파싱 결과 재사용이 더 적절할 수도 있다.

## 비 HTML 응답과 데이터 변환

Route Handler는 JSON/XML/이미지/파일/텍스트를 반환한다. sitemap, Open Graph/Twitter 이미지, favicon/app/apple icon, manifest, robots는 전용 파일 규약을 사용한다. `app/rss.xml/route.ts`, `app/llms.txt/route.ts`, `.well-known` 경로는 사용자 endpoint로 구성할 수 있다.

```ts
// app/rss.xml/route.ts, 실제 데이터 로딩은 별도 함수로 제공한다.
import { getFeed } from '@/lib/feed'
const entities: Record<string, string> = {
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
}
const xml = (value: string) => value.replace(/[<>&"']/g, char => entities[char]!)
export async function GET() {
  const feed = await getFeed()
  const items = feed.items.map((item) => `<item>
    <title>${xml(item.title)}</title><description>${xml(item.description)}</description>
    <link>${xml(item.link)}</link><pubDate>${xml(item.publishDate)}</pubDate>
    <guid isPermaLink="false">${xml(item.guid)}</guid></item>`).join('')
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
    <title>${xml(feed.title)}</title><description>${xml(feed.description)}</description>
    <link>${xml(feed.link)}</link><copyright>${xml(feed.copyright)}</copyright>
    ${items}</channel></rss>`
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } })
}
```

데이터 로더의 반환 문자열을 XML 문맥에 맞춰 escape하고 items를 빈 문자열로 join해 배열의 쉼표가 섞이지 않게 한다. URL 값의 허용 scheme과 신뢰할 데이터 원천은 별도로 검증한다.

BFF에서 여러 원천을 집계/필터/변환하면 내부 시스템 노출과 클라이언트 연산/전송량을 줄인다. 날씨 API라면 POST JSON의 lat/lng를 검증하고 `URLSearchParams`로 고정 upstream의 query를 만든 뒤 응답의 `ok`를 검사하고 텍스트를 필요한 JSON으로 변환한다. 위치를 클라이언트 요청 URL에 넣지 않으려 POST를 쓰더라도 upstream URL과 서버 로그에 위치가 남을 수 있다.

## Accept 기반 콘텐츠 협상

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [{
      source: '/docs/:slug*', destination: '/docs/md/:slug*',
      has: [{ type: 'header', key: 'accept', value: '(.*)text/markdown(.*)' }],
    }]
  },
}
```

```ts
// app/docs/md/[...slug]/route.ts
import { getDocsMd, generateDocsStaticParams } from '@/lib/docs'
export const generateStaticParams = generateDocsStaticParams
export async function GET(_: Request, ctx: RouteContext<'/docs/md/[...slug]'>) {
  const { slug } = await ctx.params
  const body = await getDocsMd({ slug })
  if (body == null) return new Response(null, { status: 404 })
  return new Response(body, { headers: {
    'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept',
  } })
}
```

두 helper는 앱의 문서 데이터와 `{ slug: string[] }[]` 목록을 제공한다고 가정한다. 빌드 시점 경로 생성과 정적 처리 조건이 충족되면 Markdown 변형을 prerender할 수 있다. `curl -H 'Accept: text/markdown' https://example.com/docs/start`와 기본 curl 요청의 본문, Content-Type, 캐시 키를 비교한다. `Vary: Accept`는 캐시에 의존성을 알리지만 CDN의 실제 설정까지 강제하지 않으므로 HTML/Markdown 혼합 캐시 여부를 확인한다.

`/docs/md/...`는 직접 접근할 수 있다. 제한하려면 Proxy에서 예상 Accept를 확인하는 정책을 별도로 둔다. 복잡한 협상은 Proxy로 옮길 수 있다. 이 예시의 단순 Accept 부분 문자열 매칭은 품질 계수까지 처리하는 일반 협상 알고리즘이 아니다.

## 프록시, redirect와 Next 확장 API

Route Handler의 중계는 catch-all params를 await해 경로를 만들고 검증된 고정 origin으로 fetch한다. 본문 검증에는 읽기 전 clone을 쓰거나 파싱 결과로 새 요청을 만든다. 사용자 path가 절대 URL/상위 경로로 해석되지 않도록 정규화하고 origin과 허용 경로를 확인한다. 필요한 method/body/헤더만 전달하고 fetch를 `await`해야 같은 try/catch에서 rejection을 처리할 수 있다. 임의 inbound cookie와 Authorization을 외부로 복사하지 않는다.

Proxy 파일은 프로젝트당 하나다. `matcher: '/api/:path*'`로 범위를 정해 인증 실패에 JSON 401을 반환하거나 `NextResponse.rewrite(new URL('/target', request.url))`로 내부 처리를 바꿀 수 있다. `/v1/docs`를 `/v2/docs`로 보내려면 nextUrl을 clone하고 pathname을 바꾼 뒤 redirect한다. next.config의 rewrites는 선언적 중계 대안이다.

`NextRequest`는 Request를 확장하고 `nextUrl.pathname/searchParams`와 request cookies를 제공한다. `NextResponse`는 Response를 확장해 json/redirect와 response cookies를 제공한다. 기본 Web API 타입을 받는 코드에 확장 인스턴스를 넘길 수 있다. `nextUrl`을 읽는 TypeScript 인자는 `NextRequest`로 선언한다.

**지원 위치 주의:** `NextResponse.next()`와 `NextResponse.rewrite()`는 Proxy용이다. BFF 가이드의 Route Handler rewrite 예제와 달리, 확인한 App Route 구현은 `x-middleware-rewrite`/`x-middleware-next` 응답을 거부한다. Route Handler에서는 실제 Response를 반환하거나 `redirect()`/`NextResponse.redirect()`를 사용하고 rewrite는 Proxy/설정으로 옮긴다.

## webhook, callback과 제한

CMS webhook은 인증 실패 401, 누락/잘못된 tag 400을 구분하고 권한 검증 후 `revalidateTag(tag, 'max')`를 호출한다. 필요한 import는 `next/cache`다. 예제의 GET query token은 개념 설명일 뿐, 실제 서비스에서는 발신자의 서명/POST 계약, 로그 노출과 중복 이벤트 처리를 맞춘다.

인증 callback은 제공자 응답과 state를 검증한 후 세션을 만든다. `new URL(redirectUrl ?? '/', request.url)`의 origin을 현재 origin과 비교하고 파싱 실패도 처리한다. 검증된 token만 `response.cookies.set({ name, value, path: '/', secure: true, httpOnly: true })`로 설정한다. expires를 생략하면 session cookie이며 URL token 자체의 신뢰성을 보장하지 않는다.

rate limit이 걸리면 JSON 오류와 429를 반환하고, 앱 단위 검사와 호스트의 제한을 함께 고려한다. body 크기/Content-Type/timeout, 로그와 응답의 비밀 제거, 자격 증명 회전, 데이터 가까이에서의 인가가 필요하다. 큰 파일은 전용 저장소로 직접 업로드하고 URI를 저장할 수 있다.

## 라이브러리와 배포 경계

라이브러리 factory가 만든 handler는 `export const GET = handler; export { handler as POST }`로 공유할 수 있다. 라이브러리가 request method/pathname에 따라 분기한다. Proxy factory는 default export로 연결할 수 있고 외부 라이브러리가 여전히 middleware라는 명칭을 쓸 수 있다.

OPTIONS가 없으면 구현 method에 따라 Allow가 생성된다. preflight의 origin/method/header 허용을 위한 CORS 설정은 별도다. 쿠키/헤더/stream/negative matcher 예제는 Route Handler와 Proxy API 문서로 연결한다.

Server Component는 DB/DAL/원천을 직접 읽는다. 자기 Route Handler를 absolute URL fetch하면 HTTP 왕복이 늘고 빌드 중 내부 서버 부재로 실패할 수 있다. Geolocation/Storage/Audio/File API와 polling처럼 브라우저 의존 데이터는 SWR/TanStack Query가 대안이다. Action은 변경을 위한 client queue에 들어가므로 병렬 조회 도구로 쓰지 않는다.

정적 export의 단순 GET 파일 생성은 `export const dynamic = 'force-static'`과 요청에 의존하지 않는 Response로 구성한다. 서버가 없어 동적 backend를 제공할 수 없다. lambda 배포는 요청 간 메모리 공유, 쓰기 가능한 파일 시스템, 긴 실행과 WebSocket 연결 유지에 의존하지 않으며 호스트 지원을 따로 확인한다.

## 출처

- [Next.js, backend-for-frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)

- [Next.js App Route 응답 검증 — GitHub](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/route-modules/app-route/module.ts)

## 관련 문서

- [[NextJS-Backend-for-Frontend]]
- [[NextJS-Actions-and-Forms]]
