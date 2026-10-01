---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js adapter route matching 계약", "NextJS-Adapter-Routing"]
---

# Next.js adapter route matching 계약

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## routing 정보

build의 routing은 preprocessed patterns와 route phases를 포함한다. beforeMiddleware는 generated headers/redirects, middlewareMatchers는 invocation 여부, beforeFiles/afterFiles는 filesystem 전후 rewrite, dynamicRoutes는 route templates, onMatch는 immutable headers 등 matched route 처리, fallback은 final rewrite다. shouldNormalizeNextData는 Pages /_next/data normalization, rsc는 App Server Component routing metadata다.

route entries는 optional source, compiled sourceRegex, destination, headers, has/missing, redirect status와 internal priority를 가진다. source 문자열만으로 매칭을 재작성하면 escaping/locale/query와 priority의 동작을 잃을 수 있다.

## @next/routing

resolveRoutes에 URL, buildId, basePath, i18n, Headers, requestBody(ReadableStream), output pathnames, routing과 invokeMiddleware callback을 넘긴다. 이 package가 Next routing behavior를 재현하므로 platform-specific regex router를 새로 만드는 부담을 줄인다.

```ts
import { resolveRoutes } from '@next/routing'

const result = await resolveRoutes({
  url: new URL(requestUrl),
  buildId,
  basePath: config.basePath || '',
  i18n: config.i18n,
  headers: new Headers(requestHeaders),
  requestBody,
  pathnames,
  routes: routing,
  invokeMiddleware,
})
```

pathnames는 pages/pagesApi/appPages/appRoutes/staticFiles의 pathname을 모은다. middleware는 callback에서 platform runtime으로 호출하고 필요한 response semantics를 반환한다. 위 식별자는 platform context에서 제공되는 값이며 독립 앱 코드가 아니다.

## resolveRoutes 결과

| field | adapter 처리 |
| --- | --- |
| middlewareResponded | true이면 entrypoint를 또 실행하지 않음 |
| externalRewrite | 외부 URL을 proxy |
| redirect | url/status로 redirect response |
| resolvedPathname | 선택한 route template |
| resolvedQuery | rewrite/Proxy 적용 후 query |
| invocationTarget | handler에 invoke할 concrete pathname/query |
| resolvedHeaders | route가 추가/변경한 Headers |
| status | routing이 지정한 HTTP status |
| routeMatches | dynamic segment의 named matches |

`/blog/post-1?draft=1`이 `/blog/[slug]`에 match하면 resolvedPathname은 template, invocationTarget.pathname은 concrete /blog/post-1다. template을 사용자 request pathname 대신 handler에 무조건 넘기지 않는다.

## 흐름과 보안

middleware response, external rewrite, redirect를 먼저 처리하고 resolved target을 entrypoint와 연결한다. final headers/status를 response에 보존하고 bypass/cache input/route ownership을 함께 유지한다. 외부 rewrite target은 application config에 의해 제한하며 runtime 사용자 입력을 arbitrary upstream으로 실행하지 않는다.

## 확인

headers/redirect/Proxy/beforeFiles/static/afterFiles/dynamic/fallback 순서, basePath, locale, RSC/data URLs, has/missing, unknown paths와 middleware short circuit을 compatibility suite에서 확인한다. Pages 문서의 simplified phase list를 완전 router implementation으로 대신하지 않는다.

## 출처

- [Next.js, app/api-reference/adapters/routing-information](https://nextjs.org/docs/app/api-reference/adapters/routing-information)
- [Next.js, pages/api-reference/adapters/routing-information](https://nextjs.org/docs/pages/api-reference/adapters/routing-information)
- [Next.js, app/api-reference/adapters/routing-with-next-routing](https://nextjs.org/docs/app/api-reference/adapters/routing-with-next-routing)
- [Next.js, pages/api-reference/adapters/routing-with-next-routing](https://nextjs.org/docs/pages/api-reference/adapters/routing-with-next-routing)

## 관련 문서

- [[NextJS-Config-Rewrites]]
- [[NextJS-Adapter-Outputs]]
- [[NextJS-Adapter-Validation]]
