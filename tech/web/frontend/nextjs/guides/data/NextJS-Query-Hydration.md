---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 캐시 가능한 Query hydration 상태"]
---

# Next.js 캐시 가능한 Query hydration 상태

## 데이터와 timestamp의 일치

Cache Components의 prerender 중 TanStack Query `dehydrate()`가 `Date.now()`를 읽으면 current-time 오류가 발생할 수 있다. 데이터와 함께 무효화되는 timestamp를 캐시하고 hydration 상태를 구성하면 같은 snapshot의 갱신 시점을 전달할 수 있다. 이는 TanStack Query의 설치 버전과 DehydratedState 구조에 의존하는 연동 코드이며 일반 앱에 무조건 필요한 추상화는 아니다.

아래는 tag로 변경되는 데이터에 대한 패턴이다. 태그가 무효화되면 데이터와 timestamp가 함께 전진해 다음 navigation의 HydrationBoundary가 새 값을 판단하도록 한다.

```ts
// app/lib/hydrate.ts
import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { QueryClient, defaultShouldDehydrateQuery,
  type DehydratedState, type QueryKey } from '@tanstack/react-query'
interface Entry { queryKey: QueryKey; data: unknown }
const getUpdatedAt = async (tags: string[]) => {
  'use cache'
  cacheTag(...tags)
  cacheLife('max')
  return Date.now()
}
export async function createHydrationState(
  entries: Entry[], options: { tags: string[] },
): Promise<DehydratedState> {
  const updatedAt = await getUpdatedAt(options.tags)
  const client = new QueryClient()
  for (const entry of entries) {
    client.setQueryData(entry.queryKey, entry.data, { updatedAt })
  }
  return {
    mutations: [],
    queries: client.getQueryCache().getAll()
      .filter(defaultShouldDehydrateQuery)
      .map((query) => ({
        dehydratedAt: updatedAt,
        queryHash: query.queryHash,
        queryKey: query.queryKey,
        state: query.state,
        ...(query.meta ? { meta: query.meta } : {}),
      })),
  }
}
```

표시할 data를 이미 읽은 query만 입력하며 mutation/pending 직렬화 전체를 대체하는 범용 dehydrate 함수로 사용하지 않는다. key와 hash/state/meta를 함께 보존하고 기본 dehydration 필터를 적용한다.

## 데이터 segment에서 사용

```tsx
import { HydrationBoundary } from '@tanstack/react-query'
import { createHydrationState } from '@/app/lib/hydrate'
import { getProduct } from './data'
import { productCache } from './product-cache'
import { ProductView } from './product-view'
export async function ProductData({ id }: { id: string }) {
  const product = await getProduct(id)
  const state = await createHydrationState([
    { queryKey: productCache.key(id), data: product },
  ], { tags: [productCache.tag(id)] })
  return <HydrationBoundary state={state}>
    <ProductView id={id} />
  </HydrationBoundary>
}
```

getProduct는 같은 tag를 사용하는 cached server getter다. 데이터가 필요한 segment에서 await하고 적절한 Suspense 경계를 둔다. 시간 기반 데이터라면 독립된 cacheLife 창으로 timestamp를 따로 유지하지 말고 data와 timestamp를 한 cached snapshot에서 반환한다. 데이터만 새로워지고 timestamp가 낡으면 browser query 갱신 판단이 어긋날 수 있다.

실행 가능한 통합 예제는 공식 next-spa-patterns의 react-query 예제를 참조하고, 수동 구조를 바꿀 때 TanStack Query Advanced SSR와 optimistic update 계약을 함께 확인한다.

## 출처

- [Next.js, tanstack-query](https://nextjs.org/docs/app/guides/client-side-data-fetching/tanstack-query)

## 관련 문서

- [[NextJS-Query-Patterns]]
- [[NextJS-Cache-Operations]]
