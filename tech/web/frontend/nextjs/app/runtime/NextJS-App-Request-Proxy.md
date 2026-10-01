---
tags: [nextjs, app-router, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Proxy의 matcher와 HTTP 전처리"]
---

# Proxy의 matcher와 HTTP 전처리

## 파일과 역할

Next16에서 middleware convention은 Proxy로 이름이 바뀌었다. root 또는 src 안에서 app/pages와 같은 수준의 proxy.ts를 사용하고 default 함수 또는 named proxy 하나를 export한다. 한 project에 하나의 진입점을 두고 내부 module로 분리할 수 있다. pageExtensions를 바꾸면 파일 suffix도 일치해야 한다.

Proxy는 요청이 route에 도달하기 전에 redirect/rewrite/request/response header를 조정하는 경계다. Node.js runtime이 기본이며 Proxy의 runtime config export는 지원하지 않고 오류가 난다. module global이 page render와 같은 process/instance에서 공유된다고 전제하지 않는다. 오래 걸리는 DB 조회와 완전한 session authorization은 실행 위치와 비용을 확인하고 실제 변경 endpoint에서도 권한을 검사한다.

## matcher와 실행 순서

matcher가 없으면 asset 요청도 대상이 된다. config.matcher는 build가 분석할 수 있는 literal이며 dynamic 변수는 무시된다. string/배열/object 형식으로 path를 지정하고 :path*, +, ? modifier, regex를 쓸 수 있다. object는 source, locale 옵션, has/missing 조건(header, cookie, query)을 지원한다.

```ts
export const config = {
  matcher: [
    { source: '/dashboard/:path*', missing: [
      { type: 'header', key: 'next-router-prefetch' },
      { type: 'header', key: 'purpose', value: 'prefetch' },
    ] },
  ],
}
```

prefetch를 제외했다고 실제 navigation의 인증을 생략하지 않는다. Server Action도 page URL의 POST로 들어오므로 matcher 범위가 Action에 미치는 영향을 확인하고 Action 자체에서 인증한다. 기존 _next/data 요청은 security 일관성을 위해 negative matcher로 제외한 경우에도 Proxy를 거칠 수 있다.

요청은 next.config headers, redirects 다음 Proxy를 거친다. 그 뒤 beforeFiles rewrites, filesystem routes/public/_next, afterFiles rewrites, dynamic routes, fallback rewrites 순으로 대상이 정해진다. rewrite 하나만 보고 실제 destination을 판정하지 않는다.

## 응답과 부가 작업

NextResponse.redirect/rewrite/next 및 Web Response를 사용할 수 있다. cookies와 headers, JSON 오류 응답도 지원한다. large request headers는 backend에431을 유발할 수 있다. CORS는 allowlist origin, methods/headers, preflight OPTIONS를 일관되게 설정한다. credentials가 필요한 응답에 wildcard origin을 무조건 붙이지 않는다.

두 번째 NextFetchEvent의 waitUntil(Promise)은 analytics 같은 부가 작업을 위해 실행 수명을 연장한다. 사용자에게 완료되어야 하는 write를 무조건 background로 숨기지는 않는다. Proxy의 fetch cache/revalidate/tags 옵션은 일반 Server Component cache 계약으로 동작하지 않는다.

## 고급 URL 옵션

skipTrailingSlashRedirect는 framework의 자동 slash 정규화를 끄고 필요한 경로별 규칙을 직접 작성하게 한다. skipProxyUrlNormalize는 원본 request URL을 보존해 직접 방문과 client navigation의 정규화 차이를 다룬다. 기존 site migration에서 필요할 수 있지만 전체 경로에 적용되는 결과를 검증한다.

RSC의 내부 header는 기본 처리에서 정리되고 rewrite에는 필요한 정보가 자동 전달된다. custom fetch로 forwarding하면 URL 정규화와 RSC header를 직접 보존할 필요가 생길 수 있다. 이 경우 관련 flag를 활성화하고 internal data request, browser navigation, prefetch 모두 확인한다. 이름이 비슷한 client URL과 내부 RSC URL을 단순 문자열로 같은 것으로 취급하지 않는다.

## 검증 도구와 실패 진단

next/experimental/testing/server의 unstable_doesProxyMatch로 config/nextConfig/url/headers/cookies에 따른 매칭을 확인한다. isRewrite, getRewrittenUrl, getRedirectUrl은 응답 destination 검증에 쓴다. 이 unit 수준 결과가 배포 host의 redirect/cache/CDN behavior를 모두 증명하지는 않는다.

예상하지 못한 asset redirect는 matcher 범위, login loop는 destination과 제외 경로, POST만 실패하면 Action matcher/auth, streaming 실패는 response Content-Type/header 덮어쓰기를 확인한다.

## matcher의 입력과 명시적 예제

`matcher: '/about'` 한 경로, `['/about/:path*','/dashboard/:path*']` 여러 경로를 지정한다. source는 `/`로 시작하고 `:path`는 한 segment, `*`는 0개 이상, `?`는 0/1개, `+`는 1개 이상이다. `/about/(.*)`는 subtree pattern 예다. subtree가 필요하면 `/about/:path*`를 명시한다. 원문의 `/about`이 `/about/team`도 매칭한다는 설명은 단순 시작문자열 비교로 확대하지 말고 설치 버전의 matcher 검증 도구로 확인한다. backward compatibility 때문에 `/public`을 `/public/index`처럼 보아 `/public/:path`가 매칭된다.

```ts
export const config = { matcher: [{
  source: '/api/:path*', locale: false,
  has: [{ type:'header', key:'Authorization', value:'Bearer Token' },
    { type:'query', key:'userId', value:'123' }],
  missing: [{ type:'cookie', key:'session', value:'active' }],
}] }
```

locale false는 locale-based routing을 matcher에서 무시한다. has/missing은 항목 존재와 optional value pattern으로 header/query/cookie 조건을 표현한다. `'/((?!api|_next/static|_next/image|.*\\.png$).*)'`는 API/static/image/png를 제외하는 예다. metadata 제외에는 favicon.ico/sitemap.xml/robots.txt도 넣는다. same source에 `next-router-prefetch`, `purpose=prefetch`의 missing 또는 has를 선택해 non-prefetch/prefetch 요청을 나누거나 x-present has와 x-missing missing을 조합할 수 있다.

## NextProxy, header와 CORS 응답

```ts
import type { NextProxy } from 'next/server'
export const proxy: NextProxy = (request, event) => {
  event.waitUntil(recordPath(request.nextUrl.pathname))
  const headers = new Headers(request.headers)
  headers.set('x-hello-from-proxy1', 'hello')
  const response = NextResponse.next({ request:{ headers } })
  response.headers.set('x-hello-from-proxy2', 'hello')
  return response
}
```

첫 인자는 NextRequest, 두 번째는 NextFetchEvent이며 쓰는 인자만 선언한다. NextProxy가 둘을 추론한다. NextRequest는 request type, NextResponse는 response를 만드는 class다. about prefix에서는 /about-2, dashboard에서는 /dashboard/user로 rewrite하는 분기 예제가 가능하다. redirect는 Web Response.redirect도 쓸 수 있고 rewrite destination page/handler가 응답을 생성하거나 Proxy가 Response/NextResponse를 직접 반환한다.

cookie 예제는 request.cookies.get('nextjs') → name/value, getAll/has/delete로 incoming cookie를 확인하고, response.cookies.set('vercel','fast') 또는 path `/` object로 outgoing Set-Cookie를 설정한다. request cookie Path 주석은 [[NextJS-App-Request-Response#cookie 예제와 현재 구현의 차이]]의 구현 차이를 따른다.

CORS는 origin allowlist를 검사하고 OPTIONS면 허용 origin 및 Allow-Methods(GET/POST/PUT/DELETE/OPTIONS), Allow-Headers(Content-Type/Authorization)를 가진 JSON 빈 body를 반환한다. simple request는 NextResponse.next에 같은 headers를 추가한다. `/api/:path*` matcher로 제한하거나 개별 Route Handler에 둔다. 인증 실패는 Response.json의 success false/message와 status401로 직접 응답할 수 있다.

## URL flag, 검증과 도입 이력

skipTrailingSlashRedirect true에서 docs/blog legacy prefix는 NextResponse.next로 두고 나머지는 끝 slash와 file-extension/.well-known 경로를 구분해 redirect한다. skipProxyUrlNormalize true이면 `/_next/data/build-id/hello.json`을 그대로 보고 기본 처리에서는 `/hello`로 정규화된다.

RSC request의 `rsc`, `next-router-state-tree`, `next-router-prefetch` internal Flight headers는 기본 request.headers에서 제거된다. rewrite가 자동 전파하지만 custom fetch는 필요한 URL shape/header를 직접 전달해야 할 수 있다. skipProxyUrlNormalize가 이 제어를 위한 선택이다.

```ts
unstable_doesProxyMatch({ config, nextConfig, url:'/test' })
const response = await proxy(new NextRequest('https://example.com/docs'))
isRewrite(response)
getRewrittenUrl(response) // redirect이면 getRedirectUrl
```

experimental testing/server 유틸은 v15.1부터 제공된다. Node/Docker 지원, static export 미지원, adapter는 platform별이다. 단순 redirect는 next.config redirects를 먼저 쓰고 Proxy는 요청 데이터나 복잡한 전처리가 필요할 때 선택한다. Express middleware와 이름이 비슷해 완전한 앱 logic을 넣는 혼동을 줄이기 위해 Proxy로 바뀌었다. rename codemod는 `npx @next/codemod@canary middleware-to-proxy .`이며 filename과 함수명을 바꾼다.

| 버전 | 이력 |
| --- | --- |
| 12.0.0 | Middleware beta |
| 12.0.9 | Edge absolute URL 강제 |
| 12.2.0 | Middleware stable |
| 13.0.0 | request/response headers 및 response 지원 |
| 13.1.0 | 고급 URL flags, 직접 응답 지원 |
| 15.2.0 / 15.5.0 | Node runtime 실험 / 안정화 |
| 16.0.0 | Middleware deprecated, Proxy rename, Node 기본 |

## 이해 확인

1. Proxy가 세션을 검사하면 Server Action은 권한 검사를 생략할 수 있는가?
2. matcher의 dynamic 변수가 무시될 때 어떤 과한 적용이 생길 수 있는가?
3. rewrite와 redirect의 browser URL 차이는?

## 출처

- [Next.js, proxy](https://nextjs.org/docs/app/getting-started/proxy)
- [Next.js, proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)

## 관련 문서

- [[NextJS-App-Request-Response]]
- [[NextJS-App-Client-Navigation]]
- [[NextJS-App-Actions]]
