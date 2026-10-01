---
tags: [nextjs, app-router, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["request, cookies, headers와 응답"]
---

# request, cookies, headers와 응답

## cookies와 headers는 async request API다

cookies(), headers()는 next/headers에서 import하며 await한다. Server Component에서는 들어온 request를 읽고, cookies set/delete는 Server Action 또는 Route Handler에서 응답이 streaming되기 전에 수행한다. 서버 component의 render에서 cookie mutation을 하면 안 된다. headers()가 반환하는 Web Headers는 읽기 전용이며 응답 headers 수정 API가 아니다.

| cookies method | 계약 |
| --- | --- |
| get(name) | 일치하는 cookie의 name/value 또는 undefined |
| getAll(name?) | 모두 또는 같은 이름의 cookie 배열 |
| has(name) | 존재 여부 |
| toString() | request Cookie header 문자열 |
| set(name, value, options) 또는 set(object) | 응답 Set-Cookie 설정. Action/Handler 전용 |
| delete(name) | 삭제 응답. Action/Handler 전용, domain/protocol 조건 준수 |

set 옵션에는 name, value, expires(Date), maxAge(초), domain, path(기본 /), secure, httpOnly, sameSite(boolean/lax/strict/none), priority(low/medium/high), partitioned가 있다. 도메인과 path, protocol이 browser 저장 cookie와 맞아야 변경/삭제가 적용된다. wildcard domain의 삭제도 동일한 실제 subdomain 조건을 확인한다. 빈 value는 값 비우기이며 expiry를 지정하는 삭제와 동일하게 취급하지 않는다.

```ts
'use server'
import { cookies } from 'next/headers'
export async function changeTheme(value: 'light' | 'dark') {
  const store = await cookies()
  store.set('theme', value, { httpOnly: true, sameSite: 'lax', path: '/' })
}
```

headers는 get, has, entries, keys, values, forEach 등 Web Headers read 계약을 따른다. 인증 정보를 다른 원본에 무조건 전달하지 말고 목적지와 필요한 field를 확인한다. cookies/headers를 읽으면 request-dependent rendering이 되므로 Cache Components에서는 Suspense 경계나 적절한 private cache 계약을 선택한다.

## NextRequest

NextRequest는 Web Request를 확장한다. nextUrl은 URL의 pathname/searchParams와 Next basePath/buildId 등을 제공한다. App Router에는 Pages i18n용 locale/defaultLocale/domainLocale fields가 없다. 과거 ip/geo properties는15에서 제거되었다.

NextRequest.cookies의 get/getAll/set/delete/has/clear는 들어온 request cookie를 다룬다. 여기서 값을 바꾸는 것과 browser에 Set-Cookie를 보내는 응답 mutation은 구분한다. 공식 NextRequest 페이지 일부 표현은 Set-Cookie를 언급하지만 request 수정만으로 browser 저장값이 바뀐다고 해석하지 않는다. browser 변경은 NextResponse.cookies 또는 Action/Handler cookies setter로 응답한다. 확인일의 NextRequest 구현은 RequestCookies를 만들고, RequestCookies.set은 `cookie` request header를 수정한다.

## NextResponse

NextResponse는 Web Response를 확장한다. json(body, init)은 JSON 응답, redirect(URL)는 이동 응답, rewrite(URL)는 browser URL을 유지하면서 다른 destination으로 처리하는 응답이다. next()는 Proxy에서 처리를 이어간다. cookies의 get/getAll/set/delete/has는 outgoing Set-Cookie 정보를 읽거나 수정한다.

```ts
export function proxy(request: NextRequest) {
  const upstream = new Headers(request.headers)
  upstream.set('x-trace-id', createTraceId())
  return NextResponse.next({ request: { headers: upstream } })
}
```

`next({ request: { headers } })`는 upstream request에 전달한다. `next({ headers })`는 browser에 보내는 response header다. 둘을 혼동하면 Authorization/Cookie를 노출하거나 response Content-Type을 덮어써 Server Action/streaming을 깨뜨릴 수 있다. 입력 header 전체 복사보다 필요한 header를 allowlist로 골라 전달한다.

redirect destination은 request.nextUrl을 clone하고 URL API로 pathname/searchParams를 수정하면 query 인코딩과 절대 URL 처리가 쉽다. 사용자 입력 redirect는 허용된 path/origin을 검증하여 open redirect를 피한다.

## userAgent의 파싱 결과

next/server의 userAgent(request)는 isBot, browser(name/version), device(model/type/vendor), engine, os, cpu(architecture) 같은 선택적 정보를 반환한다. desktop은 device.type이 undefined일 수 있다. 알려진 bot 패턴을 판정하는 parser이며 spoof 가능한 header를 신뢰한 인증/권한 판정에 쓰지 않는다.

mobile UI 최적화나 analytics 분류에서는 값이 없는 fallback을 두고, user-agent별 rewrite/cache key가 같은 응답을 잘못 공유하지 않는지 확인한다.

## NextRequest와 NextResponse의 세부 반환

NextRequest.cookies.get은 첫 name/value 또는 undefined, getAll(name?)은 이름 일치 배열 또는 전체, has는 boolean, delete는 삭제 여부 boolean, clear는 request cookie 전체 제거다. set은 request Cookie header를 변경하며 browser 응답은 별도다. nextUrl의 basePath는 string, buildId는 string 또는 undefined, pathname은 string이고 searchParams는 URLSearchParams다. 공식 표의 Object 표기는 plain page.searchParams와 같은 타입을 뜻하지 않는다.

NextResponse.cookies.get/getAll/has는 outgoing cookies를 조회하며 set은 name/value/options 또는 object를 받는다. **반환값 원문 충돌:** reference의 delete 예제는 boolean 주석을 쓰지만 확인한 ResponseCookies.delete 구현은 value 빈값, expires epoch로 set하고 자신의 ResponseCookies 객체를 반환한다. 삭제 성공 여부 boolean으로 쓰지 않는다. 기본 cookie path는 `/`이며 request pathname에서 자동 유도한다고 가정하지 않는다.

```ts
const login = new URL('/login', request.url)
login.searchParams.set('from', request.nextUrl.pathname)
return NextResponse.redirect(login)
// /about을 /proxy로 처리하되 browser URL은 /about 유지
return NextResponse.rewrite(new URL('/proxy', request.url))
// JSON body와 상태 지정
return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
```

upstream header는 `NextResponse.next({request:{headers}})`로 page/handler/action에 전달되고 browser에 직접 공개되지 않는다. 이후 외부 API forwarding이 있으면 그 목적지에서도 안전한지 검토한다. allowlist는 known-safe header만 새 Headers에 복사하며 authorization/cookie/custom x-*를 제외하는 defensive 예시를 사용할 수 있다.

## userAgent 결과 필드와 값 목록

browser(name/version), engine(name/version), os(name/version), device(model/type/vendor), cpu(architecture)의 개별 값은 string 또는 undefined다. isBot만 known bot 여부 boolean이다. device.type 후보는 console/mobile/tablet/smarttv/wearable/embedded이고 desktop은 undefined라 `device.type || 'desktop'` fallback을 쓴다. viewport query에 결과를 넣고 NextResponse.rewrite(request.nextUrl)로 device UI를 선택하는 예제가 가능하다.

engine.name 후보는 Amaya, Blink, EdgeHTML, Flow, Gecko, Goanna, iCab, KHTML, Links, Lynx, NetFront, NetSurf, Presto, Tasman, Trident, w3m, WebKit이다. cpu.architecture 후보는 68k, amd64, arm, arm64, armhf, avr, ia32, ia64, irix, irix64, mips, mips64, pa-risc, ppc, sparc, sparc64다. parser의 known 목록이며 식별하지 못하면 undefined를 반환한다.

## cookie 예제와 현재 구현의 차이

확인한 RequestCookies/ResponseCookies는 내부 Map을 이름으로 keying한다. 같은 이름 experiments 두 개가 getAll에 그대로 유지된다는 reference 예제는 구현과 맞지 않는다. request Cookie는 name/value를 전달하며 Path 속성이 cookie와 함께 전달되지 않는다. 응답에서 Path를 지정할 수 있지만 기본값은 `/`다. request set/response set 예제의 `/home` 주석을 기본 경로 계약으로 복제하지 않는다. RequestCookies.set/clear는 자신의 객체, delete(name)은 boolean, delete(names[])는 boolean[]을 반환한다. 설치한 Next.js에 포함된 cookie dependency가 다르면 그 버전의 구현으로 다시 확인한다.

## cookie mutation 뒤 UI와 cache

Server Action이 cookie를 set/delete하면 새 UI와 data를 한 server roundtrip에 반환할 수 있다. 기존 UI를 unmount하지 않으며 server data에 의존하는 Effect는 다시 실행한다. 별도 cached data도 갱신하려면 Action에서 revalidatePath/revalidateTag를 호출한다.

cookie 조회는 `(await cookies()).get('theme')`, 전체는 getAll().map으로 name/value 표시, 존재는 has('theme')다. set은 name/value만, 옵션 secure true, object의 name/value/httpOnly/path 형태를 지원한다. 만료 삭제는 delete(name) 또는 set(name,value,{maxAge:0})를 쓴다. 빈 value만 설정하는 원문의 삭제 예제는 저장값 비우기와 실제 만료를 구분한다. maxAge는 초 단위이고 options에서 문서화된 기본값은 path `/`다.

headers는 인자 없는 async 함수로 read-only Web Headers를 반환한다. entries/keys/values는 iterator, forEach는 key/value별 callback, get은 header value string 또는 null, has는 boolean이다. trusted upstream의 인증조회에 authorization이 있을 때만 해당 header를 전달한 fetch 뒤 user JSON/name을 읽는 예제가 가능하다. 모든 incoming header를 복사하지 않는다.

cookies/headers는 v13.0.0 도입, v15.0.0-RC async 전환과 codemod가 있다. v14 synchronous와 v15 임시호환을 현재 await/use 방식과 구분한다.

## 응답 helper의 실행 위치

NextResponse.rewrite/next 예제는 Proxy에서 사용한다. Route Handler가 그 응답을 반환하면 App Route module이 rewrite/next를 거부하므로 JSON/redirect와 같은 범위로 묶지 않는다. request.nextUrl을 읽는 handler/proxy 인자는 NextRequest로 type한다.

## 이해 확인

1. NextRequest cookie를 수정하면 browser cookie도 저장되는가?
2. request headers와 response headers 설정의 객체 구조가 왜 다른가?
3. headers()는 read-only인데 response header를 어디에서 변경하는가?

## 출처

- [Next.js, cookies](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [Next.js, headers](https://nextjs.org/docs/app/api-reference/functions/headers)
- [Next.js, next-request](https://nextjs.org/docs/app/api-reference/functions/next-request)
- [Next.js, next-response](https://nextjs.org/docs/app/api-reference/functions/next-response)
- [Next.js, userAgent](https://nextjs.org/docs/app/api-reference/functions/userAgent)

- [NextRequest 구현 — Next.js 저장소](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/web/spec-extension/request.ts)
- [RequestCookies 구현 — Edge Runtime 저장소](https://github.com/vercel/edge-runtime/blob/main/packages/cookies/src/request-cookies.ts)

- [ResponseCookies 구현 — Edge Runtime 저장소](https://github.com/vercel/edge-runtime/blob/main/packages/cookies/src/response-cookies.ts)

- [App Route module 구현 — Next.js 저장소](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/route-modules/app-route/module.ts)

## 관련 문서

- [[NextJS-App-Request-Proxy]]
- [[NextJS-App-Route-Handlers]]
- [[NextJS-App-Actions]]
