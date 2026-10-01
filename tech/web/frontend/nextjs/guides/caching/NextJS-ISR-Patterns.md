---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js ISR 갱신과 미등록 경로"]
---

# Next.js ISR 갱신과 미등록 경로

## Cache Components 없는 ISR

ISR은 사이트 전체 rebuild 없이 정적 내용을 갱신하고 많은 요청에 prerender 결과를 제공한다. 대규모 경로를 모두 build하지 않아도 되고 Next가 관련 Cache-Control을 설정한다. 다음은 기존 App Router 모델이다.

```tsx
// app/blog/[id]/page.tsx
import { notFound } from 'next/navigation'
export const revalidate = 60
export async function generateStaticParams() {
  const res = await fetch('https://api.vercel.app/blog')
  if (!res.ok) throw new Error('목록 조회 실패')
  const posts: { id: string | number }[] = await res.json()
  return posts.map((post) => ({ id: String(post.id) }))
}
export default async function Page({ params }: PageProps<'/blog/[id]'>) {
  const { id } = await params
  const res = await fetch(`https://api.vercel.app/blog/${encodeURIComponent(id)}`)
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error('본문 조회 실패')
  const post: { title: string; content: string } = await res.json()
  return <main><h1>{post.title}</h1><p>{post.content}</p></main>
}
```

build가 반환된 경로를 만들고 이후 요청은 cache를 사용한다. 60초가 지나도 즉시 타이머로 재생성하지 않는다. 다음 요청은 stale을 받고 background 재생성을 시작하며 성공 후부터 새 결과를 쓴다. 실패하면 마지막 성공 결과를 유지하고 후속 요청에서 재시도한다. 없는 레코드는 앱이 notFound로 처리해야 한다.

등록하지 않은 ID는 dynamicParams 정책에 따라 첫 요청에서 생성할 수 있다. `/blog` 목록이라면 `revalidate = 3600`과 fetch 결과 map으로 같은 시간 재검증 흐름을 적용한다. 가능한 긴 수명을 두고 정확한 변경 이벤트는 on-demand를 쓰며 실시간 요구는 dynamic rendering을 검토한다.

## 경로와 tag 갱신

Action에서 저장 후 `revalidatePath('/posts')`를 호출하면 경로를 무효화한다. Route Handler에서 무효화한 경로는 다음 방문에 다시 생성한다. Action은 현재 UI 갱신도 같은 응답에 포함할 수 있어 모든 호출을 단순 다음 요청 대기로 뭉뚱그리지 않는다. Pages의 `res.revalidate()` eager regeneration과는 다른 계약이다.

더 세밀한 공유 데이터는 `fetch(url, { cache: 'force-cache', next: { tags: ['posts'] } })` 또는 `unstable_cache(query, ['posts'], { tags: ['posts'], revalidate: 3600 })`로 저장하고 `revalidateTag('posts', 'max')`를 호출한다. 비-fetch getter는 `await getCachedPosts()`로 값을 얻는다. on-demand endpoint는 별도 인증과 입력 검증이 필요하다.

## Cache Components와 Partial Prefetching

아래 shell-first upgrade 설명은 Next.js 16.3 이후의 `cacheComponents: true`와 `partialPrefetching: true` 전제다. 앞 버전은 미등록 URL에 대해 완성된 서버 렌더를 기다린다. 일반 ISR 전체가 두 flag 없이는 불가능하다는 뜻은 아니다.

`app/[category]/layout.tsx`의 generateStaticParams가 tops/shorts를 반환하고 `app/[category]/[product]/page.tsx`는 받은 부모 params.category별 인기 상품 하나를 반환한다고 가정한다. parent layout은 params를 직접 await하지 않고 Suspense 안의 CategoryHeader로, page는 ProductDetails로 전달한다. loading.tsx는 segment 경계, inline Suspense는 더 세밀한 영역을 감싼다.

```ts
// category layout
export async function generateStaticParams() {
  const categories = await getTopCategories()
  return categories.map((x) => ({ category: x.slug }))
}
```

```ts
// product page: 위 layout과 다른 파일에 둔다.
export async function generateStaticParams({ params }: {
  params: { category: string }
}) {
  const products = await getPopularProducts(params.category)
  return products.map((x) => ({ product: x.slug }))
}
```

이 두 함수는 서로 다른 파일의 예시다. data 모듈 상단의 use cache로 exported async getter들을 캐시할 수 있다. getCategory/getProduct는 고정 API URL에서 조회해 non-ok를 null로 처리하고, getTopCategories는 상위 2개, getPopularProducts는 해당 category의 1개를 선택하는 식이다. category/product 문자열은 URL에 맞게 인코딩한다. null UI와 notFound 상태 코드는 별도 선택이며 `Product not found` 텍스트만으로 HTTP 404가 되지 않는다.

| build 결과 또는 첫 요청 | 먼저 제공하는 UI |
| --- | --- |
| /tops/tee, /shorts/joggers | 알려진 두 params의 prerender 결과 |
| /tops/overshirt | category header와 product fallback |
| /shoes/basketball-shoes | category/product 모두 fallback인 generic shell |

unknown params를 알게 된 첫 방문/prefetch가 background upgrade를 시작할 수 있고 완료 후 방문은 확장된 결과를 사용한다. 준비가 끝나기 전 클릭은 shell을 볼 수 있다. 모든 접근이 cache 가능하면 전체 정적 결과, runtime API/uncached 접근이 남으면 해당 fallback을 포함한 결과로 확장된다. cookies/headers 부분은 계속 요청 때 stream한다.

**확인되지 않은 경계:** 같은 가이드에는 미등록 부모/자식 URL의 upgrade 예시와, generateStaticParams가 반환하지 않은 param이 미해결로 남아 하위 upgrade를 막는다는 설명이 함께 있다. 두 설명의 구체적 적용 조건은 해당 페이지에서 일치하지 않는다. 미등록 nested params 전체가 언제나 완전히 upgrade된다고 보장하지 않으며 대상 버전에서 직접 재현해야 한다. parent부터 순서대로 params를 해결한다는 구조와 실제 지원 범위를 구분한다.

## 빌드 범위와 Pages 이전

인기/예측 가능한 경로만 사전 생성하면 build 연산/저장/배포 크기를 줄이고 드문 경로는 방문 후 생성한다. Cache Components의 generateStaticParams 자체의 최소 샘플/지원 제약은 해당 API를 따른다. 모든 동적 경로를 `[]`로 반환하는 기존 ISR 예를 새 모드에 그대로 옮기지 않는다.

Pages의 getStaticPaths는 generateStaticParams로, getStaticProps+revalidate는 use cache+cacheLife로 대응한다. fallback true의 UI는 위 flag/version 조건에서 Suspense shell로 표현하고 router.isFallback을 사용하지 않는다. 기존 ISR cacheHandler와 use cache용 cacheHandlers는 함께 필요할 수 있다.

## 운영 검증과 제약

- `logging: { fetches: { fullUrl: true } }`는 fetch 캐시 분석을 돕지만 URL 비밀 값이 로그에 남지 않게 한다.
- next build 후 next start로 production 동작을 검사하고 필요하면 `NEXT_PRIVATE_DEBUG_CACHE=1`로 ISR hit/miss와 생성 시점을 확인한다.
- x-nextjs-cache의 HIT는 캐시 응답, STALE은 오래된 응답과 background 재생성, MISS는 새 렌더, REVALIDATED는 on-demand 재생성의 단서다.
- Node server/Docker는 지원하고 static export는 지원하지 않는다. adapter는 호스트별 지원을 확인한다. Edge runtime의 ISR로 확장하지 않는다.
- 정적 route의 여러 fetch 주기 중 가장 짧은 값이 route ISR 주기를 정하되 개별 데이터 캐시 정책은 구분한다. no-store/revalidate0은 기존 모델에서 route를 동적으로 만든다.
- on-demand ISR은 Proxy rewrite를 다시 실행하는 것으로 기대하지 말고 `/post-1` alias가 아닌 `/post/1` 실제 경로를 지정한다.
- 다중 인스턴스는 공유 cache와 무효화 전파가 필요하다. background 재생성도 요청을 받은 인스턴스의 compute이며 과금 대상일 수 있다.

## 버전 이력과 예제

| 버전 | 변경 |
| --- | --- |
| 9.5 | Pages ISR 안정화 |
| 12.0 | Pages bot-aware fallback |
| 12.2 | Pages on-demand ISR 안정화 |
| 13.0 | App Router 도입 |
| 14.1 | custom cacheHandler 안정화 |
| 16.3 | 위 flag 조건의 미등록 params App Shell 응답 |

공식 Commerce/On-demand ISR/Forms와 partial-fallbacks demo는 별도의 실행 예제다. 이 vault에 그 앱의 실행 결과를 저장했다는 의미는 아니다.

## 출처

- [Next.js, incremental-static-regeneration](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
- [Next.js, incremental-static-regeneration-cache-components](https://nextjs.org/docs/app/guides/incremental-static-regeneration-cache-components)

## 관련 문서

- [[NextJS-Cache-Operations]]
- [[NextJS-Legacy-Cache-Config]]
- [[NextJS-Revalidation-Internals]]
