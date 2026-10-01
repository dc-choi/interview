---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Proxy의 matcher, CORS와 URL 제어 예제"]
---

# Pages Proxy의 matcher, CORS와 URL 제어 예제

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## matcher와 실행 순서의 공통 계약

Proxy 위치/single export/NextRequest와 NextFetchEvent/NextProxy 타입, source modifier/static literal, execution order, Node runtime, 배포와 버전 이력은 [[NextJS-App-Request-Proxy#파일과 역할]], [[NextJS-App-Request-Proxy#matcher의 입력과 명시적 예제]], [[NextJS-App-Request-Proxy#matcher와 실행 순서]], [[NextJS-App-Request-Proxy#URL flag, 검증과 도입 이력]]과 동일하다. 그 절을 실제 읽어 대조했다. Pages 고유 req/res API와 locale field는 [[NextJS-Pages-Proxy-HTTP]]를 따른다.

matcher가 없으면 public/_next/static/_next/image도 실행된다. pageExtensions가 .page.ts이면 proxy.page.ts로 맞춘다. build 분석에서 dynamic 변수를 무시하므로 config는 literal을 쓴다.

```ts
import { NextRequest, NextResponse } from 'next/server'
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}
export const config = { matcher: '/about/:path*' }
```

default export도 가능하지만 같은 파일에 여러 Proxy entry는 지원하지 않는다. about subtree와 dashboard subtree를 모두 적용하려면 `matcher: ['/about/:path*', '/dashboard/:path*']`로 둔다. module global을 route render와 공유하는 상태로 기대하지 말고 정보는 headers/cookies/rewrite/redirect/URL로 전달한다. Proxy runtime export는 오류다.

## CORS preflight와 실제 요청

```ts
// proxy.ts
import { NextRequest, NextResponse } from 'next/server'
const origins = new Set(['https://acme.com', 'https://my-app.org'])
const cors = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? ''
  const allowed = origins.has(origin)
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, { headers: {
      ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}),
      ...cors, Vary: 'Origin',
    } })
  }
  const response = NextResponse.next()
  if (allowed) response.headers.set('Access-Control-Allow-Origin', origin)
  for (const [key, value] of Object.entries(cors)) response.headers.set(key, value)
  response.headers.append('Vary', 'Origin')
  return response
}
export const config = { matcher: '/api/:path*' }
```

CORS가 인증/권한을 대신하지 않는다. credentials 요청은 허용 origin과 credentials policy를 함께 맞춘다. 원문은 origin별 응답인데 Vary가 없어 공유 cache가 섞일 수 있어 추가했다. 실제 backend에 맞는 method/header만 허용한다.

## background 작업과 직접 응답

```ts
import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server'
export function proxy(request: NextRequest, event: NextFetchEvent) {
  event.waitUntil(fetch('https://analytics.example.com/log', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pathname: request.nextUrl.pathname }),
  }).catch(error => console.error('부가 로그 실패', error)))
  return NextResponse.next()
}
```

waitUntil은 promise가 settle할 때까지 Proxy invocation 수명을 늘린다. 필수 업무 write 완료를 숨기는 용도로 쓰지 않는다. NextProxy shorthand는 request/event를 자동 타입 추론하며 `Response.json({ pathname:request.nextUrl.pathname })` 직접 응답도 가능하다. 인증되지 않은 요청은 `Response.json({success:false,message:'authentication failed'},{status:401})`를 반환하고 허용 요청은 계속한다. 인증 함수는 library/프로젝트에서 구현한다.

## slash와 original URL 제어

```js
// next.config.js
module.exports = { skipTrailingSlashRedirect: true, skipProxyUrlNormalize: true }
```

```ts
import { NextRequest, NextResponse } from 'next/server'
const legacy = ['/docs', '/blog']
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (legacy.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)))
    return NextResponse.next()
  const fileLike = /((?!\.well-known(?:\/.*)?)(?:[^/]+\/)*[^/]+\.\w+)/.test(pathname)
  if (!pathname.endsWith('/') && !fileLike) {
    const url = request.nextUrl.clone()
    url.pathname = `${pathname}/`
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}
```

slash 옵션은 자동 추가/제거 redirect를 끄고 선택 경로만 자체 정책을 적용한다. 원문 문자열 startsWith('/docs')는 /docs-other까지 포함하므로 segment 경계로 고쳤고 URL clone으로 query를 보존했다. skipProxyUrlNormalize true는 `/_next/data/build-id/hello.json` 원형을, 기본은 /hello를 보게 한다. 직접 방문/client 이동/내부 data URL을 함께 확인한다.

## negative matcher와 Pages data route

```ts
export const config = { matcher: [{
  source: '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  missing: [
    { type: 'header', key: 'next-router-prefetch' },
    { type: 'header', key: 'purpose', value: 'prefetch' },
  ],
}] }
```

missing 대신 has를 쓰면 prefetch 조건을 선택하고 has x-present와 missing x-missing 조합도 가능하다. negative matcher에서 _next/data를 제외해도 Pages `_next/data/*`에는 Proxy를 호출한다. 보호 page와 data endpoint의 coverage 불일치를 막는 보안 의도다. matcher만 믿지 말고 SSR/API에서 실제 권한을 검증한다.

RSC 요청의 rsc/next-router-state-tree/next-router-prefetch internal Flight header는 기본 Proxy request.headers에서 제거되며 NextResponse.rewrite가 필요한 rewrite header를 전파한다. App/Pages 혼용이나 custom fetch forwarding은 skipProxyUrlNormalize와 필요한 URL/header를 검토한다. Pages API req/res 자체가 Flight 요청인 것은 아니다.

## 실험적 matcher와 response 검증

```ts
import { NextRequest } from 'next/server'
import { unstable_doesProxyMatch, isRewrite, getRewrittenUrl } from 'next/experimental/testing/server'
expect(unstable_doesProxyMatch({ config, nextConfig: {}, url: '/test' })).toEqual(false)
const response = await proxy(new NextRequest('https://example.com/docs'))
expect(isRewrite(response)).toEqual(true)
expect(getRewrittenUrl(response)).toEqual('https://other-domain.com/docs')
```

이는 /docs를 other-domain으로 rewrite하는 별도 test fixture Proxy를 import한 예다. 위 slash Proxy를 그대로 import하면 기대값과 맞지 않는다. redirect라면 getRedirectUrl을 사용한다. config/url뿐 아니라 headers/cookies도 조건을 검증한다. utils는 v15.1부터 실험적이며 runtime host/CDN 동작은 실제 환경에서 별도 확인한다. middleware-to-proxy codemod는 파일과 함수명을 바꾸며 `npx @next/codemod@canary middleware-to-proxy .`로 실행한다.

## 출처

- [Next.js, Proxy](https://nextjs.org/docs/pages/api-reference/file-conventions/proxy)

## 관련 문서

- [[NextJS-Pages-Proxy-HTTP]]
- [[NextJS-App-Request-Proxy]]
