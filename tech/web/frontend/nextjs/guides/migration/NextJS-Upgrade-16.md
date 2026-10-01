---
tags: [nextjs, migration, upgrade]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next16의 async, cache와 routing 변경"]
---

# Next16의 async, cache와 routing 변경

## upgrade는 package 변경 이후에도 계속된다

Next16 upgrade codemod는 Turbopack config, lint CLI, middleware→proxy, stable API prefix, experimental_ppr를 정리할 수 있다. 모든 transform을 실행하는 것은 아니므로15 compatibility의 synchronous Request API가 남아 있으면 next-async-request-api를 별도로 실행한다. version-matched docs와 AGENTS pointer는 작업 전/후 확인한다.

Node20.9+, TypeScript5.1+, Chrome/Edge/Firefox111+, Safari16.4+가 guide의 최소 조건이다.14 guide의 Node18.17을16 target에 쓰지 않는다. App Router는 React Canary를 사용하며19.2의 Activity/useEffectEvent/View Transition 계열을 포함한다. Pages의 React dependency와 실제 설치/runtime는 따로 확인한다.

## async-only Request API

16은15의 임시 동기 접근을 완전히 제거한다. cookies/headers/draftMode와 params(layout/page/route/default/icon/apple-icon/OG/Twitter), page searchParams는 await 또는 React use로 읽는다. UnsafeUnwrapped cast는 final solution이 아니다.

next typegen(15.5 도입)은 PageProps/ LayoutProps/RouteContext를 생성해 route-aware Promise typing을 돕는다. dev/build도 필요한 type 생성을 한다. generateStaticParams의 parent params와 generateImageMetadata params는 별도의 동기 계약이다.

```tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  const query = await props.searchParams
  return <h1>{slug}: {query.q}</h1>
}
```

metadata image default function의 params/id는16에서 Promise가 되었다. generateImageMetadata는 계속 동기 params를 받는다. generateSitemaps에서 반환한 id는 sitemap function에 Promise<string>로 전달되므로 await 뒤 numeric shard가 필요하면 validate하고 Number로 변환한다.

## cache API의 freshness

revalidateTag는 두 번째 profile/object를 요구하고 single argument는 deprecated/TS error다. `revalidateTag('posts', 'max')`는 stale-while-revalidate다. 사용자가 방금 저장한 결과를 바로 보려면 Server Action-only updateTag를 사용한다. Handler webhook의 blocking expire는 revalidateTag(tag,{expire:0}) 등 해당 API 계약을 따른다.

refresh는 Action에서 client router를 refresh하지만 data tag를 invalidate하지 않는다. cacheLife/cacheTag는 안정화되어 unstable_ import를 제거한다. cache API에 붙은 이름만 바꾸고 old invalidation semantics가 유지된다고 전제하지 않는다.

## PPR와 Cache Components 채택

experimental.ppr/route experimental_ppr와 experimental.dynamicIO/experimental.useCache는 제거되었다. 실제 채택 중이면 top-level cacheComponents로 migration하지만 rename-only 변경은 아니다. request data/Suspense/cache/short lifetime의 새 모델이 build 오류를 드러낼 수 있다. 단순히 사용하지 않던 flags는 제거하는 선택과 구분한다.

Cache Components를 켜면 dynamic/revalidate/fetchCache/dynamicParams segment exports가 허용되지 않는다. 기존 fetch/unstable_cache는 별도 data cache layer로 남는다. instant=false의 validation opt-out으로 cache semantics나 synchronous I/O의 경계를 해결하지 않는다.16.3 Partial Prefetching도 별도의 global/segment adoption 조건을 가진다.

16.0 guide에는15 canary PPR 사용자가 기존 canary에 머무르라는 역사적 주의가 남아 있다. 이를 현재16.3 migration 절차가 없다는 뜻으로 확대하지 않고 현재 Cache Components migration guide를 대조한다.

## navigation과 slots

16의 layout deduplication은 공유 layout을 한 번 다운로드하고 incremental prefetch는 이미 cache된 부분을 다시 통째로 받지 않게 한다. 개별 request 수가 늘어도 총 transfer가 줄 수 있으므로 request count 하나만으로 성능 악화를 판단하지 않는다.16.3 Partial Prefetching의 App Shell/per-link 비용은 별도 계약이다.

parallel slot에는 explicit default.tsx가 필요하고 없으면 build fail이다. 기존404 fallback을 유지하려면 default에서 notFound를 호출하고 의도적으로 empty slot이면 null을 반환한다. hard load와 intercepted modal soft navigation/close를 함께 확인한다.

기존 smooth scroll CSS를 navigation 중 자동으로 auto로 바꾸는 동작은16 기본에서 제거되었다. 예전 override가 필요하면 html에 data-scroll-behavior='smooth'를 설정한다. anchor/hash scroll과 page navigation/back/forward를 각각 확인한다.

## Proxy와 제거된 runtime 설정

middleware file/name은 deprecated되어 proxy로 바뀌었다. Proxy는 Node runtime이며 edge를 지원하거나 runtime export로 선택할 수 없다. guide의 middleware Edge 유지 주의는 migration 조건부 경로이며 current runtime/deprecation 문서를 대조한다. matcher/cookies/headers/auth behavior를 rename diff 외에 검증한다.

serverRuntimeConfig/publicRuntimeConfig와 next/config는 제거되었다. server-only env는 서버에서 직접 읽고 browser 공개값은 NEXT_PUBLIC_를 사용한다. browser 값은 build inlining과 runtime env를 구분한다. request-time server env를 읽을 필요면 connection 등 실행 경계를 명시하되 secret을 props/HTML로 반환하지 않는다. unstable_rootParams는 제거되어 next/root-params의 generated getter로 옮긴다.

AMP config/useAmp/page config와 devIndicators의 appIsrStatus/buildActivity/buildActivityPosition도 제거되었다. dev indicator 자체는 유지된다. deprecated feature를 비슷한 이름의 새 config로 무조건 대체하기보다 실제 필요를 다시 확인한다.

## metadata id, mutation와 slot의 구체 예제

```tsx
// app/shop/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'
export function generateImageMetadata({ params }: { params: { slug: string } }) {
  return [{ id: '1' }, { id: '2' }]
}
export default async function Image({ params, id }: {
  params: Promise<{ slug: string }>; id: Promise<string>
}) {
  const { slug } = await params
  const imageId = await id
  return new ImageResponse(<div>{slug}: {imageId}</div>)
}
```

15에서는 generator/default image 둘 다 동기 params와 default id string이었다.16 default image params/id는 Promise지만 generateImageMetadata params는 동기다. icon/apple-icon/twitter-image도 같은 변경 대상이다.

```ts
export function generateSitemaps() { return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }] }
export default async function sitemap({ id }: { id: Promise<string> }) {
  const resolved = await id
  if (!/^\d+$/.test(resolved)) throw new Error('잘못된 sitemap id')
  const start = Number(resolved) * 50000
  // start 이상 start+50000 미만 항목을 실제 DB에서 읽어 MetadataRoute.Sitemap 배열 반환
  return []
}
```

아래 cache 함수는 인증과 DB mutation 완료 뒤의 예다. 각 서비스 helper는 실제 서버 DAL에서 구현한다.

```ts
'use server'
import { revalidateTag, updateTag, refresh } from 'next/cache'
import { db } from '@/lib/db'
export async function updateArticle(id: string) {
  revalidateTag(`article-${id}`, 'max') // SWR,약간의 지연 허용
}
export async function updateUserProfile(id: string, profile: { name: string }) {
  await db.users.update(id, profile)
  updateTag(`user-${id}`) // Action-only read-your-writes
}
export async function markNotificationAsRead(id: string) {
  await db.notifications.markAsRead(id)
  refresh() // client router 갱신, tag invalidation과 별개
}
```

stable cacheLife/cacheTag import는 `import {cacheLife,cacheTag} from 'next/cache'`이며 unstable_ aliases를 없앤다. revalidateTag one-arg는 deprecated/TS error다. 블로그/상품목록/docs는 max를, 즉시 사용자 쓰기 결과는 updateTag를 선택한다.

parallel route `app/@modal/default.tsx`는 `import {notFound} from 'next/navigation'; export default function Default(){notFound()}` 또는 `export default function Default(){return null}`을 제공한다. fallback의 의도에 맞게 선택하며 없으면 build 실패다. smooth override를 원하는 root layout은 `<html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>`을 반환한다.

runtime config 제거 후 DATABASE_URL은 Server Component/service의 process.env로 읽고 DB query에만 사용한다. 공개 API_URL은 .env.local의 NEXT_PUBLIC_API_URL='/api'와 client process.env.NEXT_PUBLIC_API_URL로 옮긴다. runtime 공개 config가 필요하면 `await connection()` 후 process.env.RUNTIME_CONFIG를 읽되 secret은 HTML/props로 내보내지 않는다. taint API는 실수로 client에 넘기는 것을 막는 추가 장치이며 데이터 최소화/권한 검증을 대신하지 않는다.

## 이해 확인

1. upgrade codemod가 async Request API를 모두 고쳤다고 가정할 수 있는가?
2. experimental.useCache→cacheComponents는 이름만 바꾸는 migration인가?
3. prefetch request count 증가만으로 transfer/latency가 나빠졌다고 말할 수 있는가?

## 출처

- [Next.js, version-16](https://nextjs.org/docs/app/guides/upgrading/version-16)

## 관련 문서

- [[NextJS-Upgrade-16-Build-and-Assets]]
- [[NextJS-Codemods]]
- [[NextJS-App-Request-Response]]
- [[NextJS-App-Cache-Components]]
- [[NextJS-App-Revalidation]]
- [[NextJS-App-Prefetch-Config]]
- [[NextJS-App-Root-Params]]
