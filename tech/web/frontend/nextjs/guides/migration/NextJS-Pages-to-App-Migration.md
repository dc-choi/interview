---
tags: [nextjs, migration, upgrade]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router에서 App Router로 점진 전환"]
---

# Pages Router에서 App Router로 점진 전환

## router 전환의 단위

pages와 app은 함께 둘 수 있어 route별로 점진 전환할 수 있다. 같은 URL을 양쪽에 정의하지 않는다. package upgrade만으로 App 사용이 의무가 되지는 않는다. 공통 기능인 Image/Link/Script/font를 먼저 갱신하고 route를 옮기는 순서를 선택할 수도 있다.

공식 guide의 서두에는12→13 및 Node18.17 설명이 남아 있지만 현재16.3 target에는 Next16 요구조건을 적용한다. guide 중 fetch 기본 force-cache 문장은 현재 fetch reference와15 변경의 no-cache 기본과 충돌하는 역사적 설명이다. current cacheComponents 설정과 명시적 fetch options를 기준으로 읽는다.

## 파일과 생애의 대응

| Pages | App | 의미 변경 |
| --- | --- | --- |
| pages/index.tsx | app/page.tsx | app page는 기본 Server Component |
| pages/blog/[slug].tsx | app/blog/[slug]/page.tsx | 폴더와 special page가 URL을 정의 |
| _app + _document | root layout | html/body 직접 반환, Context는 client provider |
| Page.getLayout | nested layout | 공유 UI와 state가 route subtree에 유지 |
| _error | error.tsx/global-error | segment별 boundary, root 예외는 global |
| 404 | not-found.tsx | notFound 기반 UI, status/streaming 조건 |
| next/head | metadata/generateMetadata | server export, merge와 streaming |
| pages/api/* | route.ts | Web Request/Response, method export |

migration 중 기존 _app/_document는 남은 Pages route에 필요하다. app layout의 style/provider가 pages까지 적용되지는 않는다. 양쪽의 shared provider, global styles, scripts가 중복/누락되지 않는지 확인하고 마지막 Pages route가 없어졌을 때 obsolete 파일을 제거한다.

## 기존 component를 안전하게 감싸기

기존 page의 interactive body를 별도 use client module로 옮기고 app page는 Server Component에서 데이터를 읽어 props로 넘긴다. 이후 non-interactive 부분을 server쪽으로 옮겨 client bundle을 줄인다. 기존 useState/context/effect 코드를 directive 없이 server page로 그대로 복사하지 않는다.

```tsx
// app/page.tsx
import HomeView from './home-view'
export default async function Page() {
  const posts = await getPublicPosts()
  return <HomeView posts={posts} />
}
// home-view.tsx는 use client로 기존 상호작용을 보존한다.
```

Client Component도 initial request에서 HTML prerender에 참여한다. browser-only 코드가 있다면 실제 SSR 안전성을 확인한다. props serialization과 private data 최소화를 검사한다.

## data와 request 대응

getServerSideProps는 component/utility에서 request-time 조회로, getStaticProps는 명시적 cached 조회/prerender로 옮긴다. getStaticPaths는 generateStaticParams의 `{slug}[]` 형태로 변환한다. ISR은 route와 cache lifetime, invalidation을 별도로 대응시킨다. 옛 fallback true/false/blocking의 의미를 streaming/Suspense와 미지 params 정책으로 다시 설계한다.

legacy non-Cache-Components에서는 dynamicParams true가 목록 밖 값을 생성하고 false는404다. Cache Components에서는 dynamicParams export를 제거하고 GSP real sample/unknown paths의 shell 동작을 따른다. GSP를 선언했다면 최소한 한 실제 sample이 필요하고 ISR 중 목록 함수가 다시 실행되지는 않는다.

req.headers/cookies 대신 await headers()/cookies()를 쓴다. Node req/res mutation을 Server Component에서 하지 않는다. Route Handler/Action response 경계에서 headers/cookies를 변경한다. API route를 거쳐 자기 server data를 읽던 방식은 직접 service/DB를 호출할 수 있지만 endpoint의 외부 client가 남아 있는지 먼저 확인한다.

## router hooks와 navigation

App의 useRouter는 next/navigation이며 pathname/query/events를 갖지 않는다. path는 usePathname, query는 useSearchParams, dynamic params는 useParams로 나눈다. isReady/isFallback/asPath/locale 계열과 basePath를 그대로 destructure하지 않는다. shared component는 next/compat/router의 nullable Pages router를 사용하며 최종 App 전환 뒤 제거한다.

useSearchParams가 있는 static subtree는 Suspense를 요구할 수 있다. 옛 guide의 prerender skip 설명을 page 전체의 client-only 렌더링으로 확대하지 않는다. Pages↔App 이동은 기본으로 hard navigation이며 자동 Link prefetch도 router 경계를 넘어 동일하게 동작하지 않는다. 전환 중 state/prefetch 보존을 따로 검증한다.

## asset, Script와 style

13의 new Link는 내부 anchor를 직접 만든다. new-link codemod로 nested a를 정리한다. Image import 유지용 legacy transform과 behavior를 바꾸는 experimental transform은 위험도가 다르다. 현재 legacy Image는 deprecated다.

beforeInteractive Script는 _document에서 root layout으로 옮긴다. Script worker strategy는 App에서 지원되지 않으며 callback은 Client Component에 둔다. app에서 font CSS inline만 기대하지 말고 next/font를 사용한다.

App global CSS는 여러 위치에서 import할 수 있지만 route별 잔류/cascade를 확인한다. guide의 Tailwind content glob 추가는3 계열 setup이며 현재4 PostCSS 설치와 구분한다. nested layout 전환 뒤 full load/navigation/back/forward에서 provider state, styles, metadata, scripts와 data freshness를 검증한다.

## 이해 확인

1. app layout을 만든 즉시 _app/_document를 지우면 남은 Pages는 어떻게 되는가?
2. 이전 query를 useSearchParams로만 바꾸면 dynamic segment까지 대응되는가?
3. fetch 기본 cache에 관한13 guide 문장을16.3에서 그대로 적용할 수 있는가?

## 출처

- [Next.js, app-router-migration](https://nextjs.org/docs/app/guides/migrating/app-router-migration)

## 관련 문서

- [[NextJS-App-Layouts]]
- [[NextJS-App-Server-Client]]
- [[NextJS-App-Fetching]]
- [[NextJS-App-Static-Params]]
- [[NextJS-App-URL-Hooks]]
- [[NextJS-App-Metadata-Contract]]
- [[NextJS-App-Route-Handlers]]
