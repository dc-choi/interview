---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Cache Components 전환"]
---

# Next.js Cache Components 전환

## 적용 전제

Next.js 16에서 `cacheComponents: true`를 켜면 PPR와 컴포넌트 캐시 모델을 사용한다. Node runtime이 필요하다. 모든 경로에 캐시를 추가하는 작업이 아니라 데이터별 최신성, 공유 범위와 fallback을 다시 배치하는 작업이다.

| 이전 설정 | 전환 방향 |
|---|---|
| dynamic force-dynamic | export 제거, 요청 의존 부분은 Suspense/필요한 connection |
| dynamic force-static | export 제거, 재사용할 데이터에 use cache와 lifetime; 요청 API는 제거하거나 동적 영역으로 분리 |
| route revalidate | cache scope의 cacheLife |
| route fetchCache | 캐시할 함수/컴포넌트의 use cache |
| fetch cache/revalidate/tags | use cache, cacheLife, cacheTag로 점진 이동 |
| unstable_cache | 같은 입력의 async 함수에 use cache |
| unstable_noStore | 새 모델의 uncached 영역과 필요 시 connection |
| dynamicParams | export 제거, 없는 데이터는 notFound로 처리 |
| experimental.ppr/experimental_ppr | 제거, cacheComponents로 전환 |
| runtime edge | Cache Components와 병용 불가, Node 전환 |

기존 fetch와 unstable_cache의 저장 계층은 함께 남을 수 있다. 이를 곧바로 전부 삭제해야 한다는 뜻은 아니다. 반면 호환되지 않는 route config export는 먼저 제거해야 한다. `use cache`의 기본 메모리 캐시는 이전 durable Data Cache와 저장 수명이 다르며, remote storage도 배포 변경 시 재계산 가능성을 고려한다.

## 점진 전환

1. 현재 경로별 정적/동적 동작과 꼭 즉시 보일 UI를 기록한다.
2. flag를 켜고 호환되지 않는 route config를 변경한다.
3. 아직 구조를 바꿀 수 없는 segment는 `instant = false`로 검증 피드백을 미룰 수 있다.
4. 한 경로씩 opt-out을 제거하고 캐시할 값과 Suspense 안에서 fresh하게 읽을 값을 정한다.
5. 생산 prefetch와 직접 방문, sibling navigation을 각각 확인한다.

`instant = false`는 동적 렌더 강제가 아니라 blocking 허용이다. 동기 시간/난수 읽기의 prerender 오류까지 해제하지 않는다. 요청 시점 값은 Suspense 안에서 connection 뒤에 읽거나 적절한 client 경계로 옮긴다. Client Component도 초기 SSR을 하므로 단순 이동만으로 모든 비결정성 문제가 사라지지는 않는다.

codemod는 실제 app 또는 src/app 경로에 적용한 뒤 변경 수를 확인한다. 잘못된 경로의 0건 성공을 전환 완료로 보지 않는다.

## 동적 params와 metadata

GSP를 사용한다면 최소 하나의 실제 params 조합을 유지한다. 빈 배열은 새 모델에서 오류이며, 함수를 지우면 해당 route의 ISR을 없앨 수 있다. params Promise는 URL 의존 하위 UI의 Suspense 안에서 해석한다. pathname/params/selected segment Hook도 미지의 동적 params를 읽을 때 경계가 필요하고 useSearchParams는 요청 query를 위한 경계를 둔다.

metadata의 외부 데이터는 캐시하거나 동적 의도를 명시한다. generateMetadata 자체를 JSX Suspense로 감쌀 수는 없다. 나머지 화면이 정적이어도 요청별 metadata가 필요하면 별도 동적 marker와 streaming 조건을 검토한다. html의 lang/dir/theme를 요청 값에 묶는 설계는 전체 shell에 영향을 준다.

## Route Handler와 React cache

GET handler의 force-static을 제거하고 내부 조회를 별도 use cache helper로 옮긴다. use cache를 GET export 자체에 붙이지 않는다. runtime 접근의 prerender 중단 예외를 일반 catch가 삼키는지 점검한다.

React cache는 계속 요청 내 중복 제거에 쓸 수 있지만 Cache Function별로 격리된 scope가 있다. 서로 다른 Cache Function의 preload/consume가 같은 메모 결과를 공유한다고 가정하지 않는다. 요청 API를 포함한 helper는 private cache의 lifetime과 격리를 별도로 검토한다.

## 상태 보존도 전환 범위다

Cache Components는 Activity로 route UI를 보존한다. 돌아왔을 때 초안과 성공 메시지가 남을 수 있으므로 transient 메뉴, 완료 폼, 사용자 변경의 reset 정책을 정한다. 캐시 성능만 확인하고 UI 수명 변경을 놓치지 않는다.

## 설정과 데이터 함수 전환 예제

Next.js 15 이하면 먼저 16 업그레이드를 수행한다. `experimental.dynamicIO`/`experimental.useCache`를 사용했다면 cacheComponents가 대체한다. flag를 켠 뒤 dynamic/revalidate/fetchCache 등 비호환 export를 남기면 오류가 난다. force-dynamic/noStore 제거 후에도 정적 HTML을 추출할 수 있으므로 모든 출력이 매 요청 전체 렌더된다는 뜻으로 해석하지 않는다.

```ts
import { cacheLife, cacheTag } from 'next/cache'
async function getData() {
  'use cache'
  cacheLife('hours')
  cacheTag('data')
  const res = await fetch('https://api.example.com/data')
  if (!res.ok) throw new Error('조회 실패')
  return res.json()
}
```

기존 force-cache와 next.revalidate 3600/next.tags data를 함수의 use cache/cacheLife/cacheTag로 이동한 예다. DB 함수의 unstable_cache wrapper도 같은 방식으로 바꾸며 key-parts 대신 함수 인자 등 자동 cache identity를 사용한다. cache할 범위를 데이터 접근 가까이에 두고 필요할 때 page/layout 전체에 적용한다. 완전히 요청 독립인 출력이 목표라면 runtime 읽기를 제거해야 하며 Suspense로 숨기는 것만으로 그 요구를 충족하지 않는다.

hours가 기존 숫자 정책과 정확히 같다고 가정하지 않는다. seconds/minutes/hours/days/weeks/max preset을 비교하고 custom profile이나 default 포함 preset 재정의로 stale/revalidate/expire를 맞춘다. 이전 Data Cache/unstable_cache의 persistence도 호스트의 저장소에 의존한다. 기본 use cache는 instance 메모리와 배포 범위이고 remote/custom durable storage를 써도 새 deployment에서는 재계산을 예상한다.

React cache의 request 중복 제거가 Cache Function 경계별로 분리되면 preload와 consume가 서로 다른 결과를 가질 수 있다. 요청 데이터를 읽는 helper를 여러 cache scope에서 공유해야 하면 private cache를 검토한다. 요청 내 dedup만 필요해 route stale을 낮추고 싶지 않을 때 `cacheLife({ stale: Infinity })`를 쓰는 패턴이 있지만 production 요청 사이의 서버 공유 저장을 뜻하지 않는다.

on-demand tag는 cached 함수 안의 cacheTag로 옮긴다. 즉시 자신의 쓰기를 읽어야 하는 Action은 updateTag, SWR은 `revalidateTag(tag, 'max')`, 경로별 무효화는 revalidatePath다. updateTag는 이전 캐시 모델에서도 가능하지만 Server Action 밖에서는 오류다. webhook/Route Handler는 profile을 지정한 revalidateTag를 쓰며 기존 단일 인자 호출을 그대로 남기지 않는다.

## 점진 도입 명령과 관찰

```sh
npx @next/codemod@canary cache-components-instant-false ./app
```

이미 instant가 있는 파일은 유지하고 없는 page/layout/default에 false를 추가하는 codemod다. src 구조는 ./src/app이며 수정 건수를 확인한다. 한 route씩 false를 지우고 insight를 해결한다. `Date.now()`, new Date(), Math.random(), crypto.randomUUID()의 동기 IO 오류는 opt-out해도 남는다. 필요한 값을 cache하거나 Suspense 안에서 `await connection()` 후 읽고, 브라우저 값이면 적절한 effect/Client 경계에서 초기화한다.

HTTP 200과 HTML 응답에는 개발 insight가 드러나지 않을 수 있다. dev overlay, server log 또는 MCP get_errors에서 component와 fix card를 확인한다. 도입 skill의 설치 명령은 `npx skills add vercel/next.js --skill next-cache-components-adoption`이다. 공식 skill은 전체를 기계적으로 opt-out한 뒤 feature별 도입하는 incremental 모드와 한 번에 도입하는 direct 모드를 제공한다. 여기서는 절차만 기록하며 branch/PR 생성은 실제 작업의 사용자 지시에 따른다.

## params와 요청 API의 구체적 이행

generateStaticParams는 최소 하나의 실제 값을 반환해야 한다. 기존 `return []`는 empty-generate-static-params 오류가 되며 `posts.slice(0, 1).map(post => ({ slug: post.slug }))`처럼 실재 값을 제공한다. 단, 실제 데이터가 하나도 없을 때의 build 정책은 따로 정한다. export를 지우면 해당 dynamic route의 ISR을 포기하는 것이고 use cache 데이터 저장과 route ISR은 구별한다.

dynamicParams export는 제거한다. false로 미등록 값을 막던 앱은 서버의 허용 목록/실제 데이터 조회 뒤 notFound를 호출한다. params/searchParams Promise는 자식 Suspense로 전달해 안에서 await하거나 경계 안의 `.then()`으로 해석한다. pathname이 미지의 dynamic params에 의존하면 usePathname/useParams/useSelectedLayoutSegment(s)도 suspend할 수 있어 breadcrumb/nav의 최소 leaf에 경계를 둔다. searchParams는 요청 query라 별도 경계를 둔다.

cookies/headers를 parent에서 읽어 theme을 내려주던 구조는 읽기 자체를 Suspense 안의 Dashboard로 이동한다. root html의 lang/dir/data-theme에는 이 하위 분리가 불가능하므로 [[NextJS-State-and-Hydration]]의 paint 전 속성 설정 패턴을 검토한다.

## GET, metadata와 제거된 옵션

```ts
// app/api/products/route.ts
import { cacheLife } from 'next/cache'
import { db } from '@/lib/db'
export async function GET() { return Response.json(await getProducts()) }
async function getProducts() {
  'use cache'
  cacheLife('hours')
  return db.product.findMany({ select: { id: true, name: true } })
}
```

GET 자체에 use cache를 붙이지 않고 별도 helper를 사용한다. prerender 중 runtime/uncached 접근의 bail-out은 throw라 기존 catch의 로그에 잡힐 수 있다. `experimental.hideLogsAfterAbort: true`는 abort 뒤 로그 노출을 줄이는 설정이며 오류를 고치는 옵션은 아니다.

metadata/viewport의 외부 데이터는 cached helper 또는 가능한 해당 generator의 use cache로 처리한다. 정말 요청별 metadata가 필요하면 페이지에 다음 marker를 두는 방식이 있다.

```tsx
import { Suspense } from 'react'
import { connection } from 'next/server'
async function DynamicMarker() { await connection(); return null }
// 정적 article 옆에 <Suspense fallback={null}><DynamicMarker /></Suspense>
```

generator를 Suspense로 직접 감싸는 방식은 아니다. 나머지 정적 화면과 동적 metadata streaming의 관계, viewport/API별 제한과 bot 처리는 해당 API에서 확인한다. Cache Components는 Node runtime이므로 edge export를 제거한다. Proxy가 요청 전 redirect/rewrite를 맡을 수는 있지만 임의 Edge runtime 서버 컴포넌트를 대신 실행한다는 뜻은 아니다. experimental.ppr와 segment experimental_ppr는 제거하며 해당 codemod를 사용할 수 있다.

Activity 보존으로 state/input/scroll이 남고 effect는 cleanup/re-run된다. dropdown/popover는 layout-effect cleanup, URL 기반 dialog, 제출 뒤 form/action-state reset처럼 의도적인 수명 관리가 필요하다.

## 출처

- [Next.js, migrating-to-cache-components](https://nextjs.org/docs/app/guides/migrating-to-cache-components)

## 관련 문서

- [[NextJS-Cache-Operations]]
- [[NextJS-Prefetching]]
- [[NextJS-State-and-Hydration]]
