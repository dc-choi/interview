---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js TanStack Query 조회와 hydration"]
---

# Next.js TanStack Query 조회와 hydration

## Provider의 수명

```tsx
// providers.tsx
'use client'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
let browserClient: QueryClient | undefined
const getClient = () => {
  if (typeof window === 'undefined') return new QueryClient()
  return browserClient ??= new QueryClient()
}
export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getClient()}>{children}</QueryClientProvider>
}
```

가장 가까운 공통 layout에서 `<Providers>{children}</Providers>`로 감싼다. 서버 렌더마다 새 QueryClient를 만들고 브라우저에서는 하나를 재사용한다. 서버 전역 singleton은 사용자 간 데이터 혼합 위험이 있다. 브라우저의 로그인 사용자 변경 시 query key 분리/reset 정책도 필요하다.

## 입력 후 조회와 Suspense

```tsx
'use client'
import { useQuery } from '@tanstack/react-query'
interface Product { id: string; name: string }
const search = async (query: string): Promise<Product[]> => {
  const res = await fetch(`/api/products?query=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('상품 조회 실패')
  return res.json()
}
export function Results({ query }: { query: string }) {
  const { data = [], error, isPending } = useQuery({
    queryKey: ['product-search', query], queryFn: () => search(query),
    enabled: query.length > 0,
  })
  if (!query) return null
  if (error) return <p>조회 실패</p>
  if (isPending) return <p>조회 중...</p>
  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
}
```

query가 hydration 후 입력되는 client-only 흐름이다. Suspense 방식은 빈 query일 때 자식을 렌더하지 않고, 유효한 query를 받는 별도 Results에서 `useSuspenseQuery({ queryKey, queryFn })`를 호출한다. 입력 shell은 boundary 밖에 둔다. 초기 실패는 Error Boundary로, 데이터가 있는 후속 refetch는 `isFetching`으로 표시한다.

한 컴포넌트의 여러 useSuspenseQuery는 waterfall을 만들 수 있다. 독립 sibling으로 나누거나 `useSuspenseQueries`를 사용한다. 초기 화면에 필요한 데이터는 서버에서 제공한다.

## query key와 옵션

```ts
// product-cache.ts
import { queryOptions } from '@tanstack/react-query'
export interface Product { id: string; name: string }
export const productCache = {
  key: (id: string) => ['product', id] as const,
  tag: (id: string) => `product:${id}`,
  options: (id: string) => queryOptions({
    queryKey: ['product', id] as const,
    queryFn: async (): Promise<Product> => {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`)
      if (!res.ok) throw new Error('상품 조회 실패')
      return res.json()
    },
    staleTime: 30_000,
  }),
}
```

key와 options의 식별자를 맞춘다. 큰 모듈은 순수 key/tag 계약을 분리하고 client-facing options에서 가져올 수 있다. 서버/클라이언트 양쪽이 쓰는 계약에는 server-only/client-only import를 넣지 않는다. staleTime 30초는 수화된 값의 즉시 browser refetch를 줄이는 예이며 서버 cacheLife와 같을 필요가 없다.

## pending query를 스트리밍

TanStack Query 5.40.0 이상은 pending query를 dehydrate할 수 있다. Cache Components의 현재 시간 제약이 적용되는 경우에는 아래 기본 패턴 대신 [[NextJS-Query-Hydration]]의 방법을 검토한다.

```tsx
// Server Component, getProduct는 직접 DAL을 호출한다.
import { QueryClient, dehydrate, defaultShouldDehydrateQuery,
  HydrationBoundary } from '@tanstack/react-query'
import { getProduct } from './data'
import { productCache } from './product-cache'
import { ProductView } from './product-view'
export function ProductData({ id }: { id: string }) {
  const client = new QueryClient()
  void client.prefetchQuery({ ...productCache.options(id),
    queryFn: () => getProduct(id) })
  return <HydrationBoundary state={dehydrate(client, {
    shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) ||
      query.state.status === 'pending',
  })}><ProductView id={id} /></HydrationBoundary>
}
```

page에서 `<Suspense fallback={...}>{params.then(({ id }) => <ProductData id={id} />)}</Suspense>`로 params와 데이터 대기를 경계 아래에 둔다. 서버 queryFn을 바꾸지 않으면 browser 상대 URL을 서버에서 호출하게 된다. Client ProductView는 `useSuspenseQuery(productCache.options(id))`의 data.name을 렌더한다. inline 상태가 필요하면 같은 options를 useQuery에 넘긴다.

## 서버 캐시와 변경

`cacheComponents: true`에서 서버 getter에 `use cache`, `cacheLife('max')`, `cacheTag(productCache.tag(id))`를 붙일 수 있다. DB에서 없으면 오류로 처리하고 공개 DTO만 반환한다. 시간 기반 갱신이 필요하면 적합한 profile을 선택한다. 클라이언트 active query도 시간 읽기가 있으므로 초기 query를 Suspense 아래에 두어 prerender 오류를 피한다.

```tsx
// useMutation/useQueryClient는 @tanstack/react-query에서 import한다.
const client = useQueryClient()
const queryKey = ['activity', 'unread'] as const
const markRead = useMutation({
  mutationFn: markActivityReadAction,
  onMutate: async () => {
    await client.cancelQueries({ queryKey })
    const previous = client.getQueryData<{ count: number }>(queryKey)
    client.setQueryData(queryKey, { count: 0 })
    return { previous }
  },
  onError: (_error, _variables, context) => {
    if (context?.previous !== undefined) client.setQueryData(queryKey, context.previous)
    else client.removeQueries({ queryKey, exact: true })
  },
})
// <button onClick={() => markRead.mutate()}>모두 읽음</button>
```

Action은 현재 세션에서 userId를 얻고 DB를 변경한 뒤 해당 서버 getter의 `activity:${userId}` tag를 updateTag한다. optimistic 변경은 현재 화면, tag 만료는 서버의 다음 읽기를 담당한다. 실패 시 이전 값이 없는 경우 `setQueryData(key, undefined)`가 데이터를 복원하는 것으로 가정하지 않고 query를 제거했다. 동시 mutation은 오래된 snapshot rollback이 최신 값을 덮지 않게 추가 조정해야 한다. 성공 값이 확정되지 않으면 실제 반환값을 반영하거나 invalidateQueries로 다시 읽는다.

## 출처

- [Next.js, tanstack-query](https://nextjs.org/docs/app/guides/client-side-data-fetching/tanstack-query)

## 관련 문서

- [[NextJS-Client-Data]]
- [[NextJS-SWR-Patterns]]
- [[NextJS-Query-Hydration]]
