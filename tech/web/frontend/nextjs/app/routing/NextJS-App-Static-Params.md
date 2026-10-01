---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["generateStaticParams와 정적 URL 생성"]
---

# generateStaticParams와 정적 URL 생성

## 함수 계약과 실행 시점

generateStaticParams는 page/layout/Route Handler에서 동적 segment 값을 배열로 반환한다. 단일 `{ id: string }[]`, 복합 `{ category: string, product: string }[]`, catch-all `{ slug: string[] }[]`처럼 폴더명과 키를 맞춘다.

```tsx
export async function generateStaticParams() {
  const products = await getProducts()
  return products.map(({ id }) => ({ id: String(id) }))
}
export default async function Page(props: PageProps<'/product/[id]'>) {
  const { id } = await props.params
  return <Product id={id} />
}
```

dev에서는 route 방문 때, build에서는 해당 layout/page 생성 전에 실행된다. ISR 재검증이 이 함수를 다시 호출해 path 목록을 갱신하지는 않는다. fetch는 다른 generate 계열/layout/page와 request memoization으로 중복을 줄일 수 있고 ORM은 React.cache를 고려한다.

## 알려진 경로와 미지 경로

이전 모델에서 전체 path, 인기 path subset, 빈 배열을 반환해 최초 방문 시 생성하는 방식을 구분한다. `dynamicParams = true`는 목록 밖 값을 요청 시 생성하고 false는 404다. 기존 `getStaticPaths`의 fallback 계약과 역할이 비슷하지만 API는 다르다.

Cache Components에서는 dynamicParams가 지원되지 않으며, generateStaticParams를 선언했다면 최소 하나의 param을 반환해야 한다. 빈 배열은 build 오류다. 알려지지 않은 일반 segment는 함수를 생략하고 Suspense로 처리하는 방식과 구분한다. 함수를 생략한 dynamic route에는 route 수준 ISR이 자동 생기는 것이 아니며 cached helper의 결과 수명과 route prerender를 구분한다. root parameter는 모든 root param의 값을 최소 하나씩 선언해야 한다.

가짜 placeholder를 만들고 notFound로 조기 종료하면 실제 branch가 build에서 검증되지 않으므로 validation을 우회하는 효과가 생긴다. sample은 실제 렌더링 경로를 실행할 수 있게 선택한다.

## 여러 segment의 조합

아래 segment에서 상위 segment까지 한 번에 만들 수 있지만 상위 layout이 자신보다 아래 param을 생성할 수는 없다.

- Bottom-up: leaf `/products/[category]/[product]`가 category/product 조합을 함께 반환한다.
- Top-down: category layout이 category 목록을 반환하고 child는 parent 조합마다 한 번 실행되어 product 목록을 만든다.

```tsx
export async function generateStaticParams({ params }: {
  params: { category: string }
}) {
  const products = await getCategoryProducts(params.category)
  return products.map(({ id }) => ({ product: String(id) }))
}
```

이 함수의 `options.params`는 이미 생성된 부모 값의 **동기 객체**다. page/layout이 받는 params Promise와 혼동하지 않는다. root getter도 nested generateStaticParams에서 사용할 수 있다.

## Route Handler 적용

```ts
export async function generateStaticParams() { return [{ id: '1' }] }
export async function GET(_request: Request, ctx: RouteContext<'/api/posts/[id]'>) {
  const { id } = await ctx.params
  return Response.json({ id, title: `Post ${id}` })
}
```

GET 응답을 지정 path별로 build할 수 있다. Cache Components의 DB/network 결과는 별도 use cache helper로 캐시하면 static response에 포함할 수 있다. handler 자체에 cache directive를 넣지 않는다. 일반 params를 캐시에 전달할 때는 요청 밖 Promise를 무심코 await하는 cache timeout도 함께 검토한다.

## 전체, subset과 runtime 생성의 구체적 모양

single id는 `[{id:'1'},{id:'2'},{id:'3'}]`, 복합은 `[{category:'a',product:'1'}]`, catch-all은 `[{slug:['a','1']}]`처럼 반환한다. catch-all 한 object는 `/product/a/1` 한 경로를 만든다. 전체 목록은 posts.map으로, 인기 subset은 posts.slice(0,10).map으로 생성한다. 기존 모델의 subset에 dynamicParams false를 더하면 나머지는 404이며 catch-all 경로는 다른 match가 있을 수 있다.

Cache Components를 끈 runtime ISR은 빈 배열 반환 또는 기존 `dynamic = 'force-static'` 설정을 사용한다. undefined/비배열 반환은 같은 계약이 아니며 dynamic rendering으로 간다. 이 설정을 Cache Components에 그대로 적용하지 않는다.

```tsx
export async function generateStaticParams({ params: { category } }: {
  params: Awaited<LayoutProps<'/products/[category]'>['params']>
}) {
  const products = await getCategoryProducts(category)
  return products.map(({ id }) => ({ product: String(id) }))
}
```

parent category 조합마다 child 함수가 호출된다. bottom-up에서는 leaf가 product.category.slug와 product.id를 함께 반환한다. nested generator에서 root getter를 쓰는 경우도 부모 root 값의 현재 조합을 따른다.

```ts
async function getPost(id: Promise<string>) {
  'use cache'
  const resolvedId = await id
  return fetch(`https://api.example.com/posts/${resolvedId}`).then(r => r.json())
}
export async function GET(_request: Request, ctx: RouteContext<'/api/posts/[id]'>) {
  return Response.json(await getPost(ctx.params.then(p => p.id)))
}
```

위 예제는 known params Promise를 cached helper에 넘기는 형태다. unresolved runtime Promise를 cache scope 안에서 await하면 별도 runtime/cache 경계 제약이 적용된다. generateStaticParams는 v13.0.0에 도입됐고 Pages의 getStaticPaths를 대체한다.

## 이해 확인

1. ISR 때 새 slug가 생겨도 generateStaticParams가 다시 호출되지 않는 의미는?
2. top-down child params가 Promise가 아닌 이유는?
3. Cache Components에서 빈 배열과 함수 미선언의 차이를 설명한다.

## 출처

- [Next.js, generate-static-params](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [Next.js, dynamicParams](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/dynamicParams)

## 관련 문서

- [[NextJS-App-Dynamic-Segments]]
- [[NextJS-App-Route-Handlers]]
- [[NextJS-App-Root-Params]]
