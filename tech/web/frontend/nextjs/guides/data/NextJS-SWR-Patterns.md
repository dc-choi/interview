---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js SWR 초기 데이터와 변경"]
---

# Next.js SWR 초기 데이터와 변경

## 브라우저 조회와 Suspense

공유 browser cache, focus/reconnect 재조회, polling이나 여러 소비자의 요청 중복 제거가 필요하면 SWR을 쓴다. 한 번 받는 서버 데이터에는 Promise와 React use만으로 충분할 수 있다.

```tsx
'use client'
import useSWR from 'swr'
interface Product { id: string; name: string }
const fetcher = async (url: string): Promise<Product[]> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('상품 조회 실패')
  return response.json()
}
export function SearchResults({ query }: { query: string }) {
  const { data = [], error, isLoading } = useSWR(
    query ? `/api/products?query=${encodeURIComponent(query)}` : null, fetcher)
  if (!query) return null
  if (error) return <p>조회하지 못했습니다.</p>
  if (isLoading) return <p>조회 중...</p>
  return <ul>{data.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
}
```

이 패턴은 query가 빈 값으로 시작해 hydration 이후 사용자 입력으로 바뀌는 상황이다. `null` key는 요청을 막는다. 초기 화면부터 필요한 데이터라면 서버에서 제공한다.

Suspense를 쓰려면 query가 있을 때만 별도 Results를 렌더하고, 그 안에서 항상 유효한 key와 `{ suspense: true }`로 useSWR을 호출한다. Results를 `<Suspense fallback={...}>`로 감싸고 입력창/상호작용 shell은 밖에 둔다. 초기 실패는 가까운 Error Boundary로 보낸다. 한 컴포넌트의 여러 Suspense 읽기는 순차 실행될 수 있으므로 독립 읽기를 sibling으로 나눈다.

`isLoading`은 요청 중이고 표시할 loaded data가 없는 상태, `isValidating`은 background 재검증을 포함한 요청 상태다. 같은 key의 후속 재검증은 기존 데이터가 있으므로 초기 fallback으로 되돌아가기보다 isValidating으로 새로고침 상태를 알린다.

## 서버 fallback과 같은 key

SWR 2.3.0과 React 19에서는 서버가 fallback Promise를 전달할 수 있다. 데이터의 segment에 provider를 두어 무관한 shared layout에 feature 데이터를 싣지 않는다.

```ts
// product-cache.ts, 서버/클라이언트 전용 import가 없는 공통 계약
export const productCache = {
  key: (id: string) => `/api/products/${encodeURIComponent(id)}`,
  tag: (id: string) => `product:${id}`,
}
```

```tsx
// app/products/[id]/page.tsx
import { Suspense } from 'react'
import { SWRConfig } from 'swr'
import { productCache } from './product-cache'
import { getProduct } from './data'
import { ProductView } from './product-view'
export default function Page({ params }: PageProps<'/products/[id]'>) {
  return <Suspense fallback={<p>조회 중...</p>}>
    {params.then(({ id }) => <SWRConfig value={{ fallback: {
      [productCache.key(id)]: getProduct(id),
    } }}><ProductView id={id} /></SWRConfig>)}
  </Suspense>
}
```

params Promise가 해소된 다음 별도의 `getProduct(id)` Promise를 await 없이 전달한다. RSC Payload에 포함된 Promise를 읽는 소비자만 suspend한다. 클라이언트 ProductView는 `useSWR(productCache.key(id), fetchProduct, { suspense: true })`의 `data.name`을 렌더한다. `fetchProduct`는 위 fetcher와 같은 `ok` 검사를 하되 단일 Product를 반환한다.

fallback/useSWR/mutate의 key는 정확히 같아야 한다. key가 다르면 초기값을 못 찾고 브라우저에서 별도 요청한다. URL에 해당하는 GET Route Handler는 같은 `getProduct`를 호출할 수 있고, 서버 초기 렌더는 HTTP를 우회해 직접 호출한다.

## 서버 캐시와 freshness

```ts
// data.ts, db와 DTO 변환은 앱에서 제공한다.
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { productCache } from './product-cache'
export async function getProduct(id: string) {
  'use cache'
  cacheLife('max')
  cacheTag(productCache.tag(id))
  const row = await db.product.findUnique({ where: { id } })
  if (!row) throw new Error('상품 없음')
  return { id: row.id, name: row.name }
}
```

`cacheComponents: true`가 전제다. 쓰기 때 tag를 무효화하는 데이터에 max를 사용한 예이며 시간 경과로 갱신해야 하면 짧은 profile을 선택한다. cacheLife의 stale은 Next client cache, revalidate/expire는 Next server cache를 제어한다. SWR의 브라우저 정책은 독립적이다.

SWR fallback은 기본적으로 stale이어서 hydration 뒤 browser revalidation을 시작한다. `revalidateIfStale: false`는 캐시가 있는 매 mount에서 재검증을 생략하는 정책이지 시간 기반 fresh window가 아니다. focus/reconnect/mutate와 `refreshInterval` polling은 따로 작동할 수 있다.

## 낙관적 변경과 서버 무효화

```tsx
// useSWRConfig를 사용하는 Client Component 내부
const { mutate } = useSWRConfig()
const markRead = () => mutate('/api/activity/unread', async () => {
  await markActivityReadAction()
  return { count: 0 }
}, {
  optimisticData: { count: 0 },
  rollbackOnError: true,
  throwOnError: false,
  revalidate: false,
})
// <button onClick={markRead}>모두 읽음</button>
```

`useSWRConfig`는 swr, Action은 앱 파일에서 import한다. fallback과 읽기 Hook도 동일한 key를 써야 한다. 예제는 성공 후 값이 0으로 확정되는 전제에서 재조회를 생략한다. 실패는 이전 값을 복원하며 throwOnError false일 때 별도 오류 피드백을 설계한다. 동시 수신으로 개수가 바뀔 수 있다면 실제 서버 결과를 쓰거나 재검증한다.

서버 Action은 현재 세션에서 userId를 얻고 DB를 변경한 뒤 `updateTag('activity:' + userId)`를 호출한다. 서버 cached getter도 같은 tag로 등록해야 한다. 브라우저 optimistic 값은 현재 화면을 바꾸고 updateTag는 다음 서버 읽기를 새 값으로 맞춘다. uncached 읽기는 서버 tag가 필요 없다. 사용자 전환 때 동일 browser key가 다른 계정 데이터를 유지하지 않도록 cache reset 또는 사용자별 key를 적용한다.

## 출처

- [Next.js, swr](https://nextjs.org/docs/app/guides/client-side-data-fetching/swr)

## 관련 문서

- [[NextJS-Client-Data]]
- [[NextJS-Query-Patterns]]
