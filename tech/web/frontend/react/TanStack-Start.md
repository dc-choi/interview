---
tags: [web, frontend, react, tanstack]
status: done
verified_at: 2026-10-25
category: "웹&네트워크(Web&Network)"
aliases: ["TanStack Start", "탠스택 스타트"]
---

# TanStack Start

TanStack Start는 TanStack Router 위에 SSR과 스트리밍, 타입이 붙은 서버 함수, 미들웨어와 server route를 더한 full-stack React 프레임워크다. 빌드는 Vite 또는 Rsbuild가 맡는다. 공식 블로그가 2026-10-13에 1.0을 안정 버전으로 발표했고, 아래 버전과 동작은 2026-10-25에 확인한 React용 `@tanstack/react-start`의 공식 문서와 릴리스 기준이며, Solid 지원은 다루지 않는다.

## 정의와 계층

- 라우팅은 전부 TanStack Router가 맡는다. Start는 Router의 file-based routing으로 code splitting과 타입 추론을 맞추며, `npm run dev`나 `npm run start`로 실행할 때 `routeTree.gen.ts`가 자동 생성된다.
- Router는 경로, path parameter, search parameter, loader 데이터와 route context의 타입을 추론하고, router 타입을 등록하면 `Link`와 hook이 그 타입을 쓴다. 서버 기능이 필요 없다고 확실하면 Router만 쓰는 선택지도 공식 문서가 안내한다.
- 1.0 발표는 익숙한 SPA식 애플리케이션 모델을 유지하면서 서버 렌더링, 스트리밍과 서버 함수를 더하고, 서버가 맞는 일만 서버로 옮기는 방향을 설계 의도로 설명한다. 기본 렌더링은 SSR 뒤 hydration이고 React Server Components(RSC)는 기본으로 꺼진 실험 기능이다.
- RC migration guide는 `@tanstack/react-start` 1.169를 첫 안정 릴리스로 명시한다. 따라서 1.0은 안정 단계의 이름이고 npm 버전 1.0.0을 뜻하지 않는다. 발표는 1.0을 지금까지 만든 API와 그 위에서 개발하는 사람들에 대한 공식 약속으로 설명하지만 구체적인 호환성 정책은 밝히지 않으므로, 버전을 고정하고 릴리스 노트로 변경을 확인한다.

## 동작 원리

### 실행 위치와 loader

Start의 코드는 기본적으로 isomorphic이다. 따로 제한하지 않으면 서버와 클라이언트 번들에 모두 들어간다. route `loader`도 첫 요청의 SSR에서는 서버에서, 이후 client navigation에서는 브라우저에서 실행된다. loader에서 secret이나 DB를 직접 읽으면 클라이언트로 노출될 수 있으므로 서버 전용 작업은 서버 함수로 감싸 loader에서 호출한다.

실행 위치는 API로 제한한다. `createServerFn`은 서버에서 실행되고 클라이언트 호출은 서버로 가는 네트워크 요청이 된다. `createServerOnlyFn`과 `createClientOnlyFn`은 반대 환경에서 호출하면 오류를 낸다. `createIsomorphicFn`은 환경별 구현을 두고 쓰지 않는 구현을 각 번들에서 제거하며, `<ClientOnly>`는 서버에서 fallback을 그리고 hydration 뒤에만 children을 렌더링한다. `.server.*`와 `.client.*` 파일명 접미사는 그 파일에 import protection을 자동 적용한다.

`beforeLoad`는 직렬로, `loader`는 병렬로 실행된다. loader 캐시의 키는 파싱된 pathname과 `loaderDeps` 반환값이다. 기본 `staleTime`이 0이라 재방문 때 기존 데이터를 먼저 그리고 백그라운드에서 다시 불러온다. preload 데이터는 기본 30초 동안 fresh이고, 쓰이지 않는 캐시는 기본 5분 동안 보관된다. search parameter는 loader에서 직접 읽지 말고 실제로 쓰는 값만 `loaderDeps`로 넘긴다. TanStack Query 같은 외부 캐시를 함께 쓰면 router의 `defaultPreloadStaleTime`을 0으로 두어 조회 여부를 외부 캐시가 정하게 한다.

### 렌더링 모드

| 방식 | 설정 | 동작 |
|---|---|---|
| 전체 SSR | route `ssr: true`(기본) | 첫 요청의 `beforeLoad`, `loader`와 component 렌더링을 서버에서 수행 |
| data-only | `ssr: 'data-only'` | 첫 요청의 `beforeLoad`와 `loader`는 서버, component 렌더링은 클라이언트에서 수행 |
| SSR 끄기 | `ssr: false` | 첫 요청에서도 서버에서 실행하지 않고 hydration 중 클라이언트에서 실행 |
| SPA mode | `tanstackStart({ spa: { enabled: true } })` | root route만 prerender한 shell(기본 `/_shell.html`)을 정적 배포 |
| 정적 prerender | `tanstackStart({ prerender: { enabled: true } })` | 빌드 때 정적 HTML 생성, `crawlLinks`로 링크를 따라 확장 |

- `ssr`을 함수로 두면 첫 요청 때 서버에서만 판단하고, 이 함수는 클라이언트 번들에서 빠진다. 자식 route는 부모보다 제한적인 값으로만 바꿀 수 있고, 처음 `false`나 `'data-only'`가 되는 route 자리에는 서버가 `pendingComponent`를 fallback으로 그린다. 앱 기본값은 `createStart`의 `defaultSsr`로 바꾼다.
- SPA mode에서도 서버 함수와 server route를 쓸 수 있지만 `/_serverFn/*`, `/api/*` 같은 경로는 서버로 보내야 한다. 공식 문서는 콘텐츠 표시가 늦고 SEO에 불리한 점을 단점으로 든다.
- RSC는 `rsc: { enabled: true }`로 켜며 React 19 이상, Vite 8 이상 또는 Rsbuild 2 이상이 필요하다. Vite는 `@vitejs/plugin-rsc`를 설치해 `rsc()` 플러그인을 함께 두고, Rsbuild는 별도 RSC 플러그인 없이 `@rsbuild/core`와 `@rsbuild/plugin-react`를 쓴다. API는 바뀔 수 있다고 공식 문서가 밝힌다.

### 서버 함수, 직렬화와 미들웨어

`createServerFn`은 같은 origin에서 호출하는 RPC endpoint를 만든다. 기본 메서드는 GET이고 POST를 지정하면 `FormData` 입력도 받는다. loader, component(`useServerFn`), 이벤트 핸들러와 다른 서버 함수에서 호출하며, 클라이언트 호출은 `fetch` 요청이 된다.

- 직렬화 경계: validator 입력과 handler 반환값은 직렬화 가능해야 하고, 기본 `strict` 모드에서 TypeScript가 이를 검사한다. `strict: false`는 타입 검사만 완화하고 runtime 직렬화 제약은 그대로다. `Response`는 반환할 수 있고, 오류는 클라이언트로 직렬화된다.
- 파일 규칙: `*.functions.ts`에 `createServerFn` wrapper를 두면 어디서든 정적 import할 수 있다. 빌드가 클라이언트 번들의 구현을 RPC stub으로 바꾸기 때문이다. DB 조회 같은 서버 전용 helper는 `*.server.ts`에, 타입과 스키마처럼 양쪽에서 안전한 코드는 접미사 없는 파일에 둔다. dynamic import는 번들러 문제를 일으킬 수 있어 피한다.
- 미들웨어: request middleware는 SSR, server route와 서버 함수를 포함한 서버 요청에 붙고, 서버 함수 미들웨어(`createMiddleware({ type: 'function' })`)는 `.client()`와 `.server()`로 RPC 호출 양쪽을 감싼다. 클라이언트 context는 `sendContext`로 명시해야 서버에 전달된다. 전역 미들웨어는 `src/start.ts`의 `createStart`에 등록하며, 실행은 의존성 우선으로 전역 미들웨어 다음 서버 함수 미들웨어 순이다.

```tsx
// src/utils/posts.functions.ts (서버 전용 helper findPostById는 posts.server.ts에 둔다)
import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { findPostById } from './posts.server'

export const getPost = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const post = await findPostById(data.id)
    if (!post) throw notFound()
    return post
  })

// src/routes/posts/$postId.tsx (createFileRoute는 @tanstack/react-router, getPost는 위 파일에서 import)
export const Route = createFileRoute('/posts/$postId')({
  loader: ({ params: { postId } }) => getPost({ data: { id: postId } }),
  component: PostPage, // PostPage에서 Route.useLoaderData()로 post를 읽는다
})
```

## Next.js와의 선택 기준

### 공식 문서가 밝힌 차이

아래 표는 TanStack의 Comparison 문서(2026-09-11 확인, Next.js 16.3 기준)와 Next.js 문서 기준이다. TanStack이 낸 두 비교 문서는 성능 우열을 판정하지 않으며, Start vs Next.js 문서는 시작 시간, HMR, 빌드 시간, 메모리나 runtime 크기의 우열을 가리는 벤치마크가 없다고 밝힌다.

| 항목 | TanStack Start | Next.js App Router |
|---|---|---|
| 기본 모델 | component를 서버 렌더링한 뒤 hydration | layout과 page가 기본 Server Component |
| RSC | 실험 기능, opt-in | App Router의 핵심 component 모델 |
| 렌더링 제어 | route별 전체, data-only, SSR 끄기 | Server/Client Component 경계, `'use client'`가 첫 SSR을 끄지 않음 |
| 서버 호출과 변경 | GET 또는 POST의 타입 있는 서버 함수 | Server Actions |
| 미들웨어 | request middleware와 서버 함수 미들웨어 | Proxy(v16에서 middleware에서 이름 변경) |
| 클라이언트 데이터 재사용 | Router loader 캐시와 Query 연동 | navigation 캐시와 서버 cache API |
| SPA와 정적 출력 | 전용 SPA mode와 prerender 설정 | 문서화된 SPA 패턴, 서버 기능에 제약이 있는 static export |

Start vs Next.js 문서는 타입 있는 URL 상태, route context, 명시적 loader와 호출형 서버 함수가 개발 방식에 맞을 때 Start를 선택할 만하다고 보고, 링크, 경로 파라미터, 검증한 search parameter, loader와 route context의 타입을 잇는 Start의 route 정의는 애플리케이션 상태가 URL에 있거나 여러 화면이 타입 있는 데이터 의존성을 공유할 때 유용하다고 설명한다. 앱이 App Router의 Server Component 통합에 기대거나 내장 image, font, metadata 규약을 쓰고 싶으면 Next.js를 선택할 만하다고 보고, 이미 동작하는 Next.js 앱이 있으면 그 경험과 전환 비용을 판단에 넣으라고 한다. 전환 전에는 대표 route 하나로 실제 데이터 조회, search parameter 검증, mutation, 권한 없는 접근 처리와 배포를 시험하라고 안내하고, 같은 `Cache-Control` 헤더라도 host마다 재생성, 무효화와 공유 캐시 동작이 같다고 보장되지 않는다고 밝힌다.

### 선택할 때 던질 질문

공식 문서의 결론이 아니라 웹사이트 제작이나 외주에서 프레임워크를 고를 때 확인할 일반 질문이다.

1. 페이지 유형: 검색 노출과 첫 화면 HTML이 중요한 콘텐츠 페이지와 로그인 뒤 상호작용 화면이 각각 얼마나 되는가? 페이지마다 전체 SSR, data-only, SSR 끄기, prerender 중 무엇이 맞는가? SPA mode는 플러그인에서 앱 전체에 켜는 설정이므로 앱 단위로 판단한다.
2. 운영 주체: 서버 runtime을 누가 운영하고 비용을 내는가? 정적 호스팅만 가능하면 서버 함수 없이 요구를 채울 수 있는가?
3. URL 상태: 검색, 필터, 정렬과 페이지 번호처럼 URL에 담을 상태가 많은가?
4. 내장 기능 의존: 이미지 최적화, 폰트, metadata, CMS와 인증 연동을 프레임워크에 기대는가, 따로 고르는가?
5. 인수인계와 업데이트: 납품 뒤 유지보수할 사람이 익숙한 생태계인가? 보안 공지와 버전 변경을 계약 기간 동안 누가 반영하고 재배포하는가?

## 도입 점검

- 버전: `@tanstack/react-start` 1.169 이상이 안정 릴리스다. Vite로 빌드하면 Vite 8이 필요하고 Vite 7은 지원하지 않는다. RC에서 올릴 때는 migration guide에 따라 제거된 `.inputValidator()`를 같은 validator를 받는 `.validator()`로 바꾸고, `@tanstack/nitro-v2-vite-plugin` 대신 `nitro/vite`의 `nitro()`를 쓴다. RC 시절 예제나 생성 코드에 남은 제거 API를 먼저 찾는다.
- 배포 대상: SSR, 서버 함수와 server route를 쓰면 서버 runtime이 필요하다. hosting 문서는 Cloudflare, Netlify, Railway를 공식 hosting partner로 안내하고, Cloudflare Workers와 Netlify는 각 provider의 Vite 플러그인을, Vercel과 Railway는 Nitro 배포 안내를 따른다. 이 provider별 안내는 Vite 플러그인 기준이다. Node.js에서는 빌드 도구에 맞는 방식을 쓴다. Vite 빌드는 `nitro/vite`의 `nitro()`를 플러그인에 추가하고 `vite build` 뒤 `node .output/server/index.mjs`로 실행하며, Rsbuild 빌드는 `dist/client`를 정적 자산으로 제공하고 나머지 요청을 `dist/server/index.js`의 `fetch` handler로 넘긴다(공식 예시는 srvx).
- 데이터와 캐시: loader가 양쪽에서 실행된다는 전제로 서버 전용 조회를 서버 함수로 옮기고, Router 캐시와 Query 중 어느 쪽이 신선도를 책임질지 정한다.
- 인증: 1.169에서 내장 `useSession`이 제거되어 세션 라이브러리를 직접 고르고 쿠키를 명시적으로 관리한다. 새 라이브러리는 기존 Start 세션 쿠키를 읽지 못하므로, migration guide는 새 쿠키 이름을 쓰고 사용자를 다시 로그인시키거나 기존 쿠키를 먼저 읽는 migration을 시험하라고 안내한다. route `beforeLoad` guard는 화면 흐름용이고 데이터 경계가 아니다. 비공개 데이터를 읽거나 쓰는 모든 서버 함수에 auth middleware나 handler 안 검사를 두고, 세션은 서버가 신뢰하는 출처에서 얻는다. client가 보낸 context는 형식을 검증해도 권한의 근거가 아니다. Next.js 문서도 Proxy에만 기대지 말고 각 Server Function 안에서 인증과 인가를 확인하라고 안내한다.
- 서버 함수 경계: 서버 함수는 호출하는 화면과 무관하게 접근할 수 있는 endpoint다. 입력은 Zod 같은 스키마로 runtime에 검증하며, 타입 주석만 붙인 validator는 값을 검사하지 않는다. `src/start.ts`가 없으면 서버 함수용 CSRF middleware가 자동 설치되지만, 이 파일을 직접 정의하면 CSRF middleware를 넣어야 하고 빠뜨리면 개발 중 경고가 나온다. cross-origin 호출을 받아야 하는 공개 API는 server route로 만들고, 오류가 클라이언트로 직렬화되므로 오류 메시지에 내부 정보를 담지 않는다.
- 환경 변수: 클라이언트에 노출할 값에만 빌드 도구의 공개 접두사를 쓴다(Vite는 `VITE_`, Rsbuild는 기본 `PUBLIC_`). 이 접두사가 붙은 값은 클라이언트에서 읽을 수 있으므로 secret에 쓰지 않는다. 모듈 최상위에서 `process.env`를 읽으면 값이 클라이언트 번들에 인라인될 수 있고, edge runtime에서는 서버에서도 `undefined`가 될 수 있다.
- 보안 패치 사례: 2026-09-30 공지된 CVE-2026-102989는 서버 함수 응답 처리의 critical 등급 reflected XSS였다. 공지는 lockfile에서 해석된 `@tanstack/start-server-core`가 1.169.39 이상인지 확인하고 다시 빌드해 배포하라고 안내한다. 로컬 의존성만 갱신해서는 이미 배포된 앱이 고쳐지지 않는다.

## 출처

- [TanStack Start 1.0 is Stable — TanStack Blog, Tanner Linsley](https://tanstack.com/blog/tanstack-start-1-0)
- [TanStack Start security update: CVE-2026-102989 — TanStack Blog](https://tanstack.com/blog/tanstack-start-security-update-cve-2026-102989)
- [Release @tanstack/react-start 1.169.0 — GitHub](https://github.com/TanStack/router/releases/tag/%40tanstack%2Freact-start%401.169.0)
- [TanStack Start, Overview](https://tanstack.com/start/latest/docs/framework/react/overview)
- [TanStack Start, Migrate from the Release Candidate](https://tanstack.com/start/latest/docs/framework/react/migrate-from-release-candidate)
- [TanStack Start, Routing](https://tanstack.com/start/latest/docs/framework/react/guide/routing)
- [TanStack Start, Execution Model](https://tanstack.com/start/latest/docs/framework/react/guide/execution-model)
- [TanStack Start, Environment Functions](https://tanstack.com/start/latest/docs/framework/react/guide/environment-functions)
- [TanStack Start, Environment Variables](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables)
- [TanStack Start, Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr)
- [TanStack Start, SPA Mode](https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode)
- [TanStack Start, Static Prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering)
- [TanStack Start, Server Components](https://tanstack.com/start/latest/docs/framework/react/guide/server-components)
- [TanStack Start, Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start, Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [TanStack Start, Hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Start, Comparison](https://tanstack.com/start/latest/docs/framework/react/comparison)
- [TanStack Start, TanStack Start vs Next.js](https://tanstack.com/start/latest/docs/framework/react/start-vs-nextjs)
- [TanStack Router, Data Loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
- [TanStack Router, Type Safety](https://tanstack.com/router/latest/docs/framework/react/guide/type-safety)
- [Next.js, Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js, proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)

## 관련 문서

- [[NextJS|Next.js]]
- [[Frontend-Rendering-Models|프런트엔드 렌더링과 상호작용 모델]]
- [[React-Server-Boundaries|React 서버와 client 경계]]
- [[React-Server-Functions|Server Functions와 Action 신뢰 경계]]
- [[React-Routing-and-Styling|React routing과 styling]]
- [[Single-Host-SPA-API-Deployment|단일 서버 SPA와 API 배포]]
- [[CSRF|CSRF]]
- [[Dev-Outsourcing-Engagement|개발 외주의 계약과 수주]]
