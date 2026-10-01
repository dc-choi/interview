---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Partial Prefetching 도입"]
---

# Next.js Partial Prefetching 도입

## 전제와 변경되는 Link 동작

Cache Components에서 `partialPrefetching: true`를 켜면 route별 App Shell을 재사용한다. shell은 URL과 무관한 정적/캐시 내용, 조건에 맞는 session 내용을 포함한다. 링크마다 다른 params/searchParams는 기본 공유 shell에서 제외된다.

```ts
// next.config.ts
import type { NextConfig } from 'next'
export default {
  cacheComponents: true,
  partialPrefetching: true,
} satisfies NextConfig
```

| Link | 기존 Cache Components | Partial Prefetching |
| --- | --- | --- |
| 기본/auto | cached page render | route 패턴별 공유 App Shell |
| true 또는 bare prefetch | uncached dynamic까지 full prefetch | shell과 캐시 가능한 URL별 내용 |
| false | prefetch 비활성 | 동일하게 비활성 |

동일 목적지 패턴의 여러 링크는 shell을 공유한다. true를 반환하는 wrapper/조건부 prop도 기존 full prefetch 조사에 포함한다. 기본/auto/false는 이 legacy full prefetch 범위가 아니다. 새 앱은 보존할 legacy 동작이 없어 바로 flag를 켤 수 있다.

## 기존 화면에서 보존할 내용

| 목적지의 데이터 | 조치 |
| --- | --- |
| 이미 정적/캐시 | 불필요한 true를 제거 |
| 미리 보여야 하는 uncached 내용 | 적절한 use cache를 붙인 후 true 제거 |
| cookies/headers에 의존하는 조회 | 검증한 session 값 뒤의 조회를 캐시하고 true 제거 |
| URL에 의존하는 캐시 내용 | true를 유지해 per-link로 준비 |
| 클릭 때 최신이어야 하는 실시간 내용 | true를 제거하고 Suspense 뒤에서 stream |

전환 전 production build에서 true 링크가 미리 주던 UI를 확인한다. 자동 prefetch는 next dev에서 실행되지 않으므로 기준 capture와 instant() 회귀 검사는 production test rig로 수행한다. 전환 후 같은 assertion이 실패하면 shell에서 빠진 내용을 파악해 캐시/경계를 조정한다. 의도하지 않은 전체 내용을 무조건 캐시하는 것으로 복구하지 않는다.

```tsx
// URL에 의존하지 않는 공개 목록
async function getProducts() {
  'use cache'
  const res = await fetch('https://api.example.com/products')
  if (!res.ok) throw new Error('상품 조회 실패')
  return res.json()
}
// Page에서는 await getProducts()로 목록을 렌더한다.
```

일반 shell에 포함할 cached 내용은 stale이 최소 5분이어야 한다. default 프로필과 seconds를 제외한 모든 preset은 이 기준을 충족하며 짧은 내용은 navigation 후 stream한다. 특정 private/per-link 정책의 하한과 혼동하지 않는다.

cookies/headers 값은 세션별이며 URL별이 아니다. 일반 cached 함수 밖에서 cookie를 읽고 **인가한** teamId를 인자로 전달한다. 같은 teamId는 캐시를 공유하므로 cookie의 임의 team 값을 권한 증거로 쓰면 안 된다. private cache와 비교는 [[NextJS-Per-Link-Prefetch]]에서 다룬다.

## URL 읽기와 Suspense

```tsx
// app/search/page.tsx
import { Suspense } from 'react'
import { db } from '@/lib/db'
async function search(query: string) {
  'use cache'
  return db.search(query)
}
async function Results({ searchParams }: Pick<PageProps<'/search'>, 'searchParams'>) {
  const { q } = await searchParams
  const query = typeof q === 'string' ? q : ''
  return <ResultList items={await search(query)} />
}
export default function Page({ searchParams }: PageProps<'/search'>) {
  return <><h1>검색</h1><Suspense fallback={<ResultsSkeleton />}>
    <Results searchParams={searchParams} />
  </Suspense></>
}
```

ResultList/ResultsSkeleton과 db는 앱이 제공한다고 가정한다. Promise는 parent에서 await하지 않고 경계 안으로 전달한다. params도 같은 방식이다. generateStaticParams에 값이 있어도 URL별 데이터라는 성질은 같아 공유 App Shell과 구분한다. 외부 URL로 query를 보내면 encodeURIComponent/URLSearchParams로 인코딩한다.

기본 Link는 검색 제목과 fallback을 준비한다. `prefetch={true}`인 `/search?q=react` 링크는 캐시 가능한 결과까지 클릭 전에 준비할 수 있다. uncached 조회는 경계에서 멈춘다. 차가운 캐시나 느린 네트워크에서 클릭 전에 완료되지 않으면 fallback이 남는다.

## 단계별 전환과 개발 insight

1. 기존 full prefetch 기대 UI를 기록하고 유지할 부분을 정한다.
2. 전역 flag 또는 목적지 page/layout의 `export const prefetch = 'partial'`을 적용한다.
3. URL 읽기를 Suspense 안으로 옮기고 필요할 때만 per-link true를 유지한다.
4. next dev에서 대상 경로를 직접 열고 링크로 이동해 overlay와 fix card를 확인한다.
5. 모든 목적지가 준비되면 전역 flag를 켜고 중복 partial export를 제거한다.

전환 전 true 링크의 dynamic data during prefetching과 전환 후 URL data outside of Suspense insight는 개발 전용이며 build를 막지 않는다. generateMetadata의 URL 읽기는 별도의 metadata runtime insight로 나타난다. `instant = false`는 해당 검증을 미루는 선택이며 full-prefetch 동작을 보존하는 스위치가 아니다.

```sh
npx @next/codemod@canary remove-partial-prefetch ./app
```

src 프로젝트는 `./src/app`을 전달한다. 잘못된 경로가 실패 대신 `0 ok`로 끝날 수 있어 실제 수정 파일 수를 확인한다. codemod는 partial 값만 제거하고 force-disabled 등 다른 값은 유지한다.

에이전트용 공식 도입 skill은 `npx skills add vercel/next.js --skill next-partial-prefetching-adoption`으로 설치하는 절차를 제공한다. 기존 true 조사, 가능하면 production instant 기준 테스트, flag 전환과 insight 해결을 수행한다. 여기서는 설치 명령을 문서화했으며 이 vault에 skill을 설치하거나 앱 설정을 변경한 것은 아니다.

## 출처

- [Next.js, adopting-partial-prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching)

## 관련 문서

- [[NextJS-Prefetching]]
- [[NextJS-Per-Link-Prefetch]]
- [[NextJS-Instant-Validation]]
