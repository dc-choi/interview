---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["동적 URL segment와 런타임 파라미터"]
---

# 동적 URL segment와 런타임 파라미터

## path params의 모양

| 폴더 | URL 예 | 값 |
| --- | --- | --- |
| `[slug]` | `/blog/a` | `slug: 'a'` |
| `[...slug]` | `/shop/a/b` | `slug: ['a','b']` |
| `[[...slug]]` | `/shop` | `slug: undefined` |
| `[category]/[id]` | `/shop/books/1` | 두 string |

catch-all은 최소 한 segment, optional catch-all은 부모 URL 자체도 받는다. 동적 폴더가 존재한다는 사실과 요청마다 동적 렌더링한다는 사실을 구분한다. 데이터가 미리 알려지면 generateStaticParams로 prerender할 수 있다.

path 값은 page/layout/route/generateMetadata에서 전달된다. 일반 route params Promise는 await 또는 Client page의 use로 읽고, client tree에서는 useParams도 가능하다. TypeScript generic이나 route literal은 실제 URL의 유효성을 검증하지 않으므로 locale/id를 사용하기 전에 런타임 검증을 한다.

```tsx
import { notFound } from 'next/navigation'
const supported = new Set(['ko', 'en'])
export default async function Page(props: PageProps<'/[locale]'>) {
  const { locale } = await props.params
  if (!supported.has(locale)) notFound()
  return <p>{locale}</p>
}
```

## Cache Components에서 params 읽기

generateStaticParams가 없으면 params는 build 때 모르는 runtime data다. params를 읽는 subtree를 Suspense/loading으로 감싸고 나머지를 App Shell로 만든다. layout에서 먼저 await하면 해당 layout 전체가 막히므로 Promise를 필요한 child로 전달한다.

```tsx
import { Suspense } from 'react'
export default function Page(props: PageProps<'/blog/[slug]'>) {
  return <><h1>Blog</h1><Suspense fallback={<p>Loading...</p>}>
    {props.params.then(({ slug }) => <Article slug={slug} />)}
  </Suspense></>
}
async function Article({ slug }: { slug: string }) {
  const post = await getPost(slug)
  return <h2>{post.title}</h2>
}
```

generateStaticParams가 있으면 반환 sample별 코드가 build에서 실행되고 static HTML이 생성된다. Next.js 16.3에서 `cacheComponents`와 `partialPrefetching`을 함께 켜면 목록 밖 값은 App Shell을 우선 받고 구체적인 route 버전이 첫 성공 요청 후 저장될 수 있다. 이 조건은 shell 우선/background upgrade 흐름에 관한 것이며, 일반적인 첫 요청 후 결과 저장 자체의 필수 조건으로 확대하지 않는다. 아직 실행하지 않은 조건 분기의 runtime API 오류는 build 성공으로 배제되지 않는다.

예를 들어 sample이 public slug뿐인데 `private-*` 분기에서 Suspense 없이 cookies를 읽으면 실제 private URL 첫 요청에서 실패한다. conditional 데이터 read 각각의 경계를 확인한다.

## TypeScript의 넓은 타입과 검증 후 좁히기

`PageProps`, `LayoutProps`, `RouteContext`는 URL 문법을 추론하지만 `[locale]` 값은 여전히 string이다. single은 string, catch-all은 string[], optional catch-all은 `slug?: string[]`, 두 segment는 두 string으로 표현한다. root layout 앞 dynamic segment는 next/root-params로 모든 Server Component에서 읽는 root parameter다.

```ts
function assertValidLocale(value: string): asserts value is Locale {
  if (!isValidLocale(value)) notFound()
}
```

await params 후 위 assertion을 호출하면 사용자 입력을 runtime에서 거부하고 이후 코드를 Locale 타입으로 좁힌다. 단순 `as Locale`은 같은 보장을 주지 않는다.

## sample과 runtime branch의 실제 차이

sample `[{slug:'1'},{slug:'2'},{slug:'3'}]`과 `use cache` getPost를 함께 쓰면 sample route의 post data가 build HTML에 포함된다. sample 밖 public slug도 정상 첫 요청 뒤 저장될 수 있지만 `private-*` 분기의 cookies는 build에서 실행되지 않았다면 첫 요청 때 검사된다.

```tsx
if (slug.startsWith('private-')) {
  return <Suspense fallback={<p>Loading...</p>}>
    <PrivatePost slug={slug} />
  </Suspense>
}
```

API `app/api/posts/[id]/route.ts`도 generateStaticParams를 쓸 수 있다. id는 `String(post.id)`로 생성하고 GET에서 `(await params).id`로 fetch한다. upstream `!res.ok`는 `Response.json({error:'Post not found'},{status:404})`로 처리한다. 목록 밖 id는 dynamic 처리하는 기존 모델과 Cache Components의 경계 조건을 구분한다.

## 이해 확인

1. `/shop`을 매칭하려면 `[...slug]`와 `[[...slug]]` 중 무엇을 사용해야 하는가?
2. valid locale 목록을 타입으로 선언했어도 URL runtime 검증이 필요한 이유는?
3. generateStaticParams sample에 없는 분기의 cookies 오류를 build가 놓칠 수 있는 이유는?

## 출처

- [Next.js, dynamic-routes](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)

- [Next.js, ISR with Cache Components](https://nextjs.org/docs/app/guides/incremental-static-regeneration-cache-components)

## 관련 문서

- [[NextJS-App-Static-Params]]
- [[NextJS-App-Root-Params]]
- [[NextJS-App-Cache-Components]]
- [[NextJS-Cache-Operations]]
