---
tags: [nextjs, app-router, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Cache Components, static shell과 요청 데이터"]
---

# Cache Components, static shell과 요청 데이터

## Cache Components 렌더링 모델

next.config의 cacheComponents:true를 켜면 static, cached, request-time UI를 한 route에 결합한다. 기존 route 전체 static/dynamic 판정 설명과 구분한다. cookies를 읽는 subtree가 있어도 나머지 static/cached UI는 shell에 남을 수 있다.

```tsx
import { Suspense } from 'react'
export default function Page() {
  return <><h1>상점</h1><CachedCatalog />
    <Suspense fallback={<p>추천 준비 중</p>}><UserRecommendations /></Suspense>
  </>
}
```

build는 predictable work와 충분히 긴 cached output을 HTML/RSC shell로 만든다. uncached async read와 runtime API는 Suspense의 fallback을 shell에 남기고 request에서 채운다. 이것이 Cache Components의 기본 Partial Prerendering(PPR)이다. Suspense 자체가 sync component를 dynamic으로 바꾸지는 않는다.

## 세 종류의 결과와 저장 위치

| 종류 | 기준 | 전달/저장 |
| --- | --- | --- |
| predictable | import, pure sync 계산, sync fs/query | build shell |
| cached | async use cache, 유효 cacheLife | shell 또는 runtime store/browser |
| uncached/runtime | network/DB, cookies/headers/query/unknown params | Suspense 뒤 request stream |

prerender HTML은 self-host disk 또는 플랫폼 durable storage/CDN, default shared cache는 instance memory, remote는 별도 shared handler, browser는 navigation/prefetch RSC memory다. private output은 cross-request server store에 저장되지 않는다. cacheLife는 각 복사본의 lifetime을 조정한다.

## runtime read를 깊게 배치한다

layout의 params Promise를 가장 위에서 await하면 unknown param 때문에 전체 layout을 기다린다. Promise를 실제 title/data child로 넘겨 그 부분만 Suspense 안에서 await한다. cookies/headers/searchParams에도 같은 원리가 적용된다.

shared use cache 안에서는 request API를 직접 읽지 않는다. 바깥에서 cookie의 의미 있는 값을 추출해 cache argument로 넘기면 그 값별 cache entry가 만들어진다. 세션 id를 전달한 cached subtree는 build shell에 포함되지 않지만 runtime/per-link prefetch에 포함될 수 있다.

## random, time과 synchronous IO

Math.random/Date.now/crypto.randomUUID는 한 번 공유할 값인지 요청마다 fresh한 값인지 명시한다. use cache에 넣으면 한 값을 lifetime 동안 공유하고, io 또는 실제 사용자 request가 필요한 connection 뒤에서 읽으면 request-time이다. Cache Components의 validation은 blocking-prerender-random/current-time/crypto insight를 안내한다. performance.now는 telemetry용으로 guard하지 않지만 값을 화면 데이터로 오용하지 않는다.

sync fs 또는 embedded DB는 prerender에서 끝나므로 매 요청 읽을 의도라면 IO 표시가 필요하다. 요청과 무관하고 고정된 async file/font/config read는 module scope에서 한 번 읽는다. render 중 read가 맞으면 use cache 또는 Suspense로 처리한다.

## App Shell, prefetch와 ISR

Next.js 16.3에서 아래의 미등록 URL full-route upgrade 흐름은 `cacheComponents: true`와 `partialPrefetching: true`를 함께 켠 조건이다. Cache Components가 shell을 만들고 Partial Prefetching이 알려진 params로 구체 route를 완성한다. 이는 shell을 먼저 보내며 background upgrade하는 흐름의 조건이다. 다른 구성에서 요청 후 route 결과를 캐시하는 ISR 자체가 불가능하다는 뜻은 아니다.

known params의 shell은 구체적인 content를 포함한다. unknown params의 URL-independent version은 App Shell이며 fallback을 즉시 제공한다. generateStaticParams가 선언한 URL은 build에 생성하고 다른 URL은 App Shell을 제공한 뒤 구체 버전으로 background upgrade되어 다음 방문에 재사용된다.

Partial Prefetching의 기본은 App Shell이고 Link true는 URL을 resolve해 cacheable content까지 per-link로 준비한다. cookies/header를 읽는 App Shell은 session-specific browser cache이며 shared server cache로 취급하지 않는다.

cache key의 buildId 또는 deploymentId 때문에 새 deploy에서는 use cache/remote entry가 논리적으로 새 scope가 된다. serverless memory가 요청 사이 살아남는다고 가정하지 않는다. cache directive는 hit를 보장하는 것 외에도 shell/prefetch/lifetime 정보를 제공한다.

## 실패 진단과 bots

uncached/runtime read가 경계 밖이면 dev overlay/build의 blocking-route insight가 나타난다. 읽기를 cache하거나 Suspense 안으로 옮기거나 opt-out 범위를 명시한다. metadata/viewport의 runtime read도 같은 구조 검토가 필요하다.

crawler는 완성 문서를 request time에 새로 렌더링하는 path가 있으므로 build-only 자원을 shell에서 읽는 페이지는 browser 정상/crawler 실패가 가능하다. request environment에서도 필요한 원본을 읽을 수 있게 한다.

## static shell을 크게 만드는 실제 구성

cacheComponents:true는 GET Handler에도 page와 같은 prerender 모델을 적용한다. getUsers의 `db.query('SELECT * FROM users')`는 use cache/cacheLife('hours') data helper로 독립 캐시하거나 같은 query와 id/name 목록 UI를 async Page 안에서 함께 cache한다. 매요청fresh가 필요하면 LatestPosts async fetch를 use cache 없이 Suspense 아래 두고 Blog title과 Loading posts fallback을 shell로 만든다. uncached/runtime 읽기 밖에서는 dev overlay의 blocking-route fix card가 캐시/경계/optout 대안과 walkthrough를 제공한다.

runtime API에는 cookies, headers, searchParams 및 build에서 미등록된 params가 포함된다. UserGreeting의 cookies.theme 기본값light는 request-time이다. ProfileContent가 cookies.session을 먼저 await하고 CachedContent(sessionId)에 문자열을 전달하면 sessionId별entry를 만든다. 이branch는 build shell에는 없지만 per-linkprefetch에서 준비되고 stalewindow만큼browser가 재사용한다. 기본memory가serverless에서유지되지않아도lifetime은prefetch에의미있다. durable공유가필요하면remote를검토한다.

BlogPage 예는 static header의 Home/About Link, hours/posts태그 BlogPosts의 title/author/date 목록, Suspense 아래 cookies.theme/category UserPreferences를 결합한다. cookie읽기가route전체를dynamic으로바꾸지않는다. 실패subtree는 catchError또는error파일에둔다. metadata/viewport의uncached읽기도같은validation을받는다.

layout이 unknown slug를 맨앞에서 await하면 Sidebar도 막힌다. layout을 sync로 유지하고 `<Suspense fallback={<h1>Loading...</h1>}>{params.then(({slug}) => <SlugHeading slug={slug}/>)}</Suspense>`로 내리면 Sidebar/children/fallback은 shell에 남고 heading만 stream한다. child에 Promise 전체를 전달해 await하는 방법도 동등하다. 16.0의 직접 방문 shell 검증에 이어 client navigation도 별도 validation을 받으므로 이동 시에도 경계가 남는지 확인한다.

random UUID는 connection() await와 Suspense 뒤에서 매 요청마다 생성하거나 use cache 안에서 같은 값을 공유한다. sync fs.readFileSync와 dynamic import/순수 계산은 자동으로 shell에 들어간다. better-sqlite3/node:sqlite 같은 sync DB도 같으므로 요청마다 fresh query하려면 connection을 먼저 호출한다. 고정 config의 async readFile은 module top-level에서 한 번 await하고 items를 렌더한다. component 내부의 async file read는 uncached로 처리되므로 cache/Suspense가 필요하다.

Partial Prefetching의 기본 App Shell은 session data를 포함한다. Link true는 destination searchParams/params를 resolve해 q:string|string[]|undefined를 use cache search(query)에 전달한 결과까지 클릭 전에 받는다. 직접 방문은 Results fallback 뒤 stream하고 client는 query 변경 또는 stale 만료까지 재사용한다. prefetch 가능한 link마다 서버 호출 비용이 든다. static shell은 CDN에서 upstream 없이 제공할 수 있으며 HTML 첫 방문과 RSC 이동 두 형태를 생성한다. bot은 UA로 판별하여 shell을 건너뛰고 request가 완성된 문서를 받는다.

## 이해 확인

1. cookies를 읽어도 page header를 static HTML로 유지할 수 있는 구조를 그린다.
2. sync SQLite query가 매 요청 실행된다고 기대하면 왜 틀릴 수 있는가?
3. serverless cache miss가 잦아도 use cache가 prefetch UX에 도움 되는 이유는?

## 출처

- [Next.js, caching](https://nextjs.org/docs/app/getting-started/caching)

- [Next.js, ISR with Cache Components](https://nextjs.org/docs/app/guides/incremental-static-regeneration-cache-components)

## 관련 문서

- [[NextJS-App-Cache-Functions]]
- [[NextJS-App-Cache-Life]]
- [[NextJS-App-IO]]
- [[NextJS-Cache-Operations]]
