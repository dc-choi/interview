---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 Proxy와 Web HTTP API 경계", "NextJS Pages Proxy HTTP"]
---

# Pages Router의 Proxy와 Web HTTP API 경계

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## Proxy와 API Routes는 다른 요청 타입이다

`proxy.ts`는 Next.js request 처리 앞에서 redirect/rewrite, request header와 cookie를 조정하는 서버 단계다. `pages/api`의 Node req/res handler와 다른 역할이고 `NextRequest`/`NextResponse`는 Web API를 확장한다. 모든 업무 데이터를 Proxy에서 가져오는 layer로 쓰지 않는다.

Pages에서도 현재 proxy convention은 Node runtime이고 middleware 이름은 deprecated다. root 또는 src의 pages와 같은 기준 위치에 하나 두고 matcher로 경로를 제한한다. matcher는 정적으로 분석할 수 있는 상수여야 한다. 구체 matcher, 실행 순서와 URL normalization은 공통 Proxy reference와 함께 확인한다.

## Pages의 NextRequest URL 정보

`NextRequest`는 Web Request의 method/url/headers/body API에 cookie helper와 nextUrl을 추가한다. cookie set/get/getAll/has/delete/clear는 request의 cookie state를 다루며 browser에 Set-Cookie를 보내는 response cookie와 구분한다.

Pages nextUrl에는 basePath/buildId뿐 아니라 locale, locales, defaultLocale과 domainLocale 정보가 있다. domainLocale은 domain/defaultLocale/http를 담는다. App nextUrl에서는 Pages i18n field를 사용할 수 없다. query 처리는 URLSearchParams로 읽는다. `ip`/`geo` field는 v15에 제거됐다. 위치나 client IP가 필요하면 배포 플랫폼의 trusted header 계약을 따로 확인한다.

## NextResponse와 header 방향

NextResponse.json/redirect/rewrite/next는 response를 만들거나 다음 처리로 넘긴다. rewrite는 표시 URL을 유지하고 redirect는 browser URL을 바꾼다. response.cookies.set은 Set-Cookie를 추가한다.

```tsx
import { NextResponse } from 'next/server'

export function proxy(request) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-kind', 'pages')
  return NextResponse.next({ request: { headers: requestHeaders } })
}
```

`request: { headers }`는 downstream server 전달이다. 최상위 `{ headers }`는 client로 보낼 response header이며 모든 incoming header를 거기에 복사하면 secret 노출이나 content-type/streaming 문제를 만들 수 있다. 전달할 필드를 whitelist한다.

## redirect와 locale, user agent

정적 redirect map은 next.config redirects에서, 요청 조건은 Proxy에서, 페이지 data 결정은 getServerSideProps/getStaticProps 반환에서, UI 이동은 next/router에서 처리한다. redirects는 Proxy 이전에 실행한다. 대량 redirect는 KV map과 optional Bloom filter로 lookup을 줄일 수 있으나 filter positive는 실제 map에서 재확인하고 false positive면 정상 요청을 계속한다. lookup API의 요청과 목적지 입력을 검증한다.

`userAgent(request)`는 isBot, browser(name/version), device(type/model/vendor), engine(name/version), os(name/version), cpu(architecture)를 반환한다. UA가 없거나 파싱되지 않으면 field가 없을 수 있다. device type은 mobile/tablet/console/smarttv/wearable/embedded 등이다. redirect/rewrite variant를 만들면 cache key도 그 variant를 구분해야 한다. user agent는 spoof 가능하므로 권한 근거로 사용하지 않는다.

## Pages의 특수 예외

shallow 이동은 Proxy rewrite 목적지를 client에서 완전히 검증하지 않는다. on-demand ISR에는 Proxy가 실행되지 않는다. static export에는 Proxy가 없다. API Routes의 인증/권한을 Proxy matcher로 대체하지 않는다.

## cookie, URL과 userAgent의 전체 반환 계약

| cookie method | 반환/범위 |
| --- | --- |
| set(name,value) | request Cookie / response Set-Cookie를 갱신하고 해당 cookies 객체 반환 |
| get(name) | 첫 cookie의 name/value 정보, 없으면 undefined |
| getAll(name?) | 같은 이름 전체, 이름 없으면 모든 cookie 배열 |
| has(name) | 존재 boolean |
| request.delete(name) | 삭제 성공 boolean, 이름 배열은 boolean 배열 |
| response.delete(name/options) | epoch 만료 Set-Cookie를 설정하고 cookies 객체 반환 |
| request.clear() | 모든 request cookie 제거 후 cookies 객체 반환 |

```ts
import { NextRequest, NextResponse, userAgent } from 'next/server'
export function proxy(request: NextRequest) {
  request.cookies.set('show-banner', 'false')
  request.cookies.get('show-banner')
  request.cookies.getAll('experiments')
  request.cookies.getAll()
  request.cookies.has('experiments')
  request.cookies.delete('experiments')
  // request.cookies.clear()는 전체 request cookie 제거가 필요할 때만 호출
  const url = request.nextUrl.clone()
  const { device } = userAgent(request)
  url.searchParams.set('viewport', device.type ?? 'desktop')
  const response = NextResponse.rewrite(url)
  response.cookies.set('show-banner', 'false', { path: '/', httpOnly: true })
  response.cookies.get('show-banner')
  response.cookies.getAll('experiments')
  response.cookies.getAll()
  response.cookies.has('experiments')
  response.cookies.delete('experiments')
  return response
}
```

request cookie 조정만으로 browser cookie를 갱신하지 않는다. 원문의 request Set-Cookie/자동 /home path 설명과 response cookie 단순 object 예는 request/response cookie의 역할과 실제 option을 혼동할 수 있어 응답에는 path를 명시했다. cookie의 보안/domain/sameSite/만료는 서비스 contract에 맞춰 설정한다. 공식 구현의 response default path는 /이며 get의 속성명은 소문자 path다. cookies 내부 map은 이름별 상태이므로 Docs의 같은 이름 두 response cookie 예제를 일반적인 다중 path cookie 저장으로 오해하지 않는다.

| Pages nextUrl | 타입/설명 |
| --- | --- |
| basePath | string, 구성된 base path |
| buildId | string 또는 undefined, build ID |
| defaultLocale, locale | string 또는 undefined, 기본/현재 locale |
| locales | string[] 또는 undefined, 지원 locale |
| domainLocale | domain/defaultLocale string와 선택적 http boolean |
| url | URL 객체, 표준 pathname/searchParams도 사용 |

`/home?name=lee`는 pathname /home, searchParams.get('name') lee다. 표준 URLSearchParams 객체를 plain object로 취급하지 않는다.

| userAgent field | 세부 field와 가능한 값 |
| --- | --- |
| isBot | 알려진 bot 여부 boolean |
| browser | name/version string 또는 undefined |
| device | model/vendor string 또는 undefined, type console/mobile/tablet/smarttv/wearable/embedded 또는 undefined(desktop 포함) |
| engine | name/version string 또는 undefined |
| os | name/version string 또는 undefined |
| cpu | architecture string 또는 undefined |

engine name 후보는 Amaya/Blink/EdgeHTML/Flow/Gecko/Goanna/iCab/KHTML/Links/Lynx/NetFront/NetSurf/Presto/Tasman/Trident/w3m/WebKit이다. CPU 후보는 68k/amd64/arm/arm64/armhf/avr/ia32/ia64/irix/irix64/mips/mips64/pa-risc/ppc/sparc/sparc64다. 파싱 값으로 UI hint를 정할 수 있지만 신뢰한 신원/권한 정보로 사용하지 않는다.

## JSON, redirect와 허용 header 전달 코드

```ts
import { NextRequest, NextResponse } from 'next/server'
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/unavailable')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  if (request.nextUrl.pathname === '/old') {
    const login = new URL('/login', request.url)
    login.searchParams.set('from', request.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  if (request.nextUrl.pathname === '/about')
    return NextResponse.rewrite(new URL('/proxy', request.url))
  const safe = new Headers()
  for (const name of ['accept', 'accept-language']) {
    const value = request.headers.get(name)
    if (value) safe.set(name, value)
  }
  safe.set('x-version', '123')
  return NextResponse.next({ request: { headers: safe } })
}
```

예제 allow-list를 앱에서 필요한 요청 header로 보강한다. cookie/authorization을 제거하면 정상 인증을 잃을 수 있으므로 전달 목표에 맞춰 결정한다. 원문처럼 x-*와 authorization/cookie만 제외하는 deny-list는 그 외 민감 header를 허용하므로 안전한 header 전부를 보장하지 않는다. request.headers 전체를 clone하는 단순 x-version 예와 실제 defensive 전달 예를 구분한다. 최상위 `NextResponse.next({ headers: request.headers })`로 전달하면 client 노출과 framework content-type 충돌이 생길 수 있다.

## 학습 확인

- request header 전달과 response header 노출을 network와 server에서 각각 확인한다.
- rewrite와 redirect가 browser 주소에 미치는 차이를 설명한다.
- locale/device variant의 cache key와 실제 응답이 일치하는지 확인한다.

## 출처

- [Vercel edge-runtime, ResponseCookies 구현](https://github.com/vercel/edge-runtime/blob/main/packages/cookies/src/response-cookies.ts)
- [Vercel edge-runtime, RequestCookies 구현](https://github.com/vercel/edge-runtime/blob/main/packages/cookies/src/request-cookies.ts)

- [Next.js, Redirecting](https://nextjs.org/docs/pages/guides/redirecting)

- [Next.js, proxy](https://nextjs.org/docs/pages/api-reference/file-conventions/proxy)
- [Next.js, next-request](https://nextjs.org/docs/pages/api-reference/functions/next-request)
- [Next.js, next-response](https://nextjs.org/docs/pages/api-reference/functions/next-response)
- [Next.js, userAgent](https://nextjs.org/docs/pages/api-reference/functions/userAgent)

## 관련 문서

- [[NextJS-Pages-Internationalization]]
- [[NextJS-Pages-API-Routes]]
- [[NextJS-Pages-Navigation]]
