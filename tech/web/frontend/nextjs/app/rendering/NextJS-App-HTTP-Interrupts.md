---
tags: [nextjs, app-router, rendering]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["notFound, 인증 interrupt와 redirect"]
---

# notFound, 인증 interrupt와 redirect

## throw로 렌더링 흐름을 끝낸다

notFound/unauthorized/forbidden은 각각 NEXT_HTTP_ERROR_FALLBACK의 404/401/403 control exception을 던지고 현재 segment 렌더링을 종료한다. 반환 타입은 never라 return을 붙이지 않아도 타입이 narrow된다. nearest fallback UI와 noindex meta를 제공한다.

notFound는 Server Component/Server Function/Route Handler에서 쓸 수 있다. helper가 이 함수를 호출할 수 있으면 caller가 await해야 한다. fire-and-forget Promise에서 throw하면 unhandledRejection이 되어 UI fallback에 연결되지 않는다. try/catch로 삼키는 경우도 fallback이 안 나온다.

## not-found와 global-not-found

not-found.tsx는 props 없는 기본 Server Component이며 필요한 경우 async data/UI를 구성할 수 있다. root not-found는 unmatched URL도 처리한다. streamed response는 200/noindex, body가 시작되지 않은 response는 404다.

실험 global-not-found는 routing 수준에서 unmatched URL을 처리하고 layout/page 렌더링을 건너뛴다. 여러 root layout 또는 top-level dynamic root에서 일관된 404를 만들 때 유용하다. experimental.globalNotFound를 켜고 full html/body, 필요한 CSS/font/theme를 직접 넣는다. 이 Server 파일은 metadata/generateMetadata를 지원한다. 가벼운 style/font를 사용하면 404 문서 비용을 줄인다.

## 401과 403의 실험 계약

unauthorized는 비로그인, forbidden은 인증됐지만 권한 부족에 해당한다. experimental.authInterrupts가 필요하고 현재 production 권장 기능은 아니다. 각각 unauthorized.tsx/forbidden.tsx는 props 없는 UI다. Server Component/Server Function/Route Handler에서 호출하지만 root layout에서는 호출할 수 없다.

```tsx
const session = await verifySession()
if (!session) unauthorized()
if (session.role !== 'admin') forbidden()
```

권한 검증은 DAL/Action 안에 두어 직접 호출/숨긴 slot에도 적용한다. Suspense 안의 검증은 shell을 유지하지만 stream이 시작되면 401/403 status로 바꾸지 못한다. 실제 status가 필요하면 응답 전 빠른 검사 또는 Route Handler의 명시 response를 사용한다. 인증 UI를 보여 주는 것과 데이터 접근을 막는 것을 별도 검증한다.

## redirect와 permanentRedirect

next/navigation에서 호출하고 relative/absolute URL을 받는다. Client Component 렌더링에서는 가능하지만 event handler에서는 useRouter로 이동한다. 렌더링 전 static redirect는 next.config, 요청 조건은 Proxy를 사용한다.

| 상황 | redirect | permanentRedirect |
| --- | --- | --- |
| 일반 HTTP 응답 | 307 | 308 |
| Action, JS 있음 | client navigation | client navigation |
| Action form progressive enhancement | 303 후 GET | 303 후 GET |
| 이미 streaming | client redirect meta | client redirect meta |

307/308은 HTTP method를 보존한다. mutation form 후 GET을 수행하는 Action 303과 구분한다. 두 함수 모두 NEXT_REDIRECT를 throw하므로 mutation try/catch 밖에서 호출하고 invalidate가 필요하면 먼저 실행한다.

```ts
await savePost(validatedData)
updateTag('posts')
redirect('/posts')
```

history 기본은 Action에서 push, 다른 곳에서 replace다. RedirectType.push/replace로 바꿀 수 있지만 Server Component의 type 인자는 효과가 없다. 사용자 입력 외부 URL은 redirect 목적지로 바로 사용하지 않는다.

## fallback 배치와 구체적인 접근 검사

not-found는 같은 segment에서 loading Suspense와 error boundary 안, page 앞에 위치한다. 기본 UI는 prefers-color-scheme을 읽고 app의 html class/data-theme는 읽지 않는다. root layout 안의 기본 UI를 맞추려면 `html[data-theme='light'] body`와 dark selector처럼 specificity가 높은 전역 규칙을 쓰거나 custom UI를 작성한다. global-not-found는 layout을 우회하므로 자체 html에 theme를 설정한다.

`not-found.tsx`에서는 `const domain = (await headers()).get('host')`로 사이트별 데이터를 조회해 이름과 `/blog` 링크를 렌더할 수 있다. usePathname 기반 client hook UI가 필요하면 Client Component에서 데이터를 조회한다. global-not-found 예는 globals.css 및 Inter latin subset을 import하고 html.lang/className과 metadata.title/description을 직접 제공한다. Next.js는 404 status 페이지에 noindex를 자동 삽입한다.

스트리밍 예는 async `getPost(slug)`에서 404만 notFound(), 다른 실패는 status를 포함한 Error를 throw하고, Article을 `<Suspense fallback={<p>Loading...</p>}>` 아래 둔다. nearest not-found가 Article을 대체하면서 Blog 링크와 shell은 유지된다. 해당 파일이 없으면 parent boundary, 최종 기본404 UI로 간다. GET Route Handler에서 await params로 slug를 읽고 notFound()하면 caller에게404를 보낼 수 있다.

인증 예도 동일하게 `getAccount()`가 await verifySession 후 unauthorized(), admin 전용 `getProjects()`가 session?.role 검증 후 forbidden()하고 DB를 읽는다. Suspense 내부로 분리한 AccountDetails/Projects는 shell을 유지한다. unauthorized 파일의 Login 컴포넌트 또는 `/login` 링크, forbidden 파일의 설명과 `/` 돌아가기 링크는 별도 UI다. Server Action updateProfile/updateRole에서도 **매 호출마다** 같은 session/role을 확인하고 승인된 mutation만 진행한다. Cache Components의 dynamic route는 static shell을 먼저 보내므로 실제401/403/404가 필요하면 streaming 전 Proxy 검사나 명시적인 endpoint 응답 조건을 설계한다.

원문 unauthorized Route Handler 예제의 주석은401과 unauthorized.tsx 렌더를 함께 주장한다. HTTP endpoint의 status 반환과 page boundary 렌더를 동일하게 가정하면 안 된다. Handler에서는 명시적인 `Response(...,{status:401})` 또는 프레임워크 interrupt의 status 응답을 사용하고, 로그인 UI는 page 경계에서 구성한다.

## redirect 예제와 버전

`redirect(path: string, type?: 'push' | 'replace')`와 permanentRedirect는 값을 반환하지 않는 never API다. `[id]` 페이지는 params를 await하고 team 조회가 없을 때 `/login`으로 이동한다. Client render 예는 pathname이 `/admin`으로 시작하면서 `/login`이 아닌 경우 `/admin/login`으로 이동하며, 첫 SSR 렌더라면 서버 redirect가 된다. client form의 action이 server `navigate(FormData)`를 호출하고 id로 `/posts/{id}`를 구성하는 예도 가능하다. 버튼 이벤트 이동은 router를 사용한다.

`/users`의 POST를 `/people`로 옮길 때302는 브라우저가 GET으로 바꿀 수 있지만307/308은POST를 유지한다. Action의303은 mutation 후 조회로 전환하기 위한 예외다.

| 버전 | 도입 또는 변경 |
| --- | --- |
| 13.0 | notFound, not-found, redirect |
| 13.3 | root not-found가 전체 unmatched URL 처리 |
| 15.1 | experimental forbidden/unauthorized 함수와 파일 |
| 15.4 | experimental global-not-found |

## 이해 확인

1. notFound를 호출하는 helper를 await하지 않았을 때 UI가 안 바뀌는 이유는?
2. global-error와 global-not-found의 Metadata API 허용 차이는?
3. POST Action 후 redirect가 일반 redirect와 다른 status를 쓰는 이유는?

## 출처

- [Next.js, forbidden](https://nextjs.org/docs/app/api-reference/file-conventions/forbidden)
- [Next.js, not-found](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
- [Next.js, unauthorized](https://nextjs.org/docs/app/api-reference/file-conventions/unauthorized)
- [Next.js, forbidden](https://nextjs.org/docs/app/api-reference/functions/forbidden)
- [Next.js, not-found](https://nextjs.org/docs/app/api-reference/functions/not-found)
- [Next.js, permanentRedirect](https://nextjs.org/docs/app/api-reference/functions/permanentRedirect)
- [Next.js, redirect](https://nextjs.org/docs/app/api-reference/functions/redirect)
- [Next.js, unauthorized](https://nextjs.org/docs/app/api-reference/functions/unauthorized)

## 관련 문서

- [[NextJS-App-Errors]]
- [[NextJS-App-Streaming]]
- [[NextJS-App-Actions]]
