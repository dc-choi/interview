---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["next/root-params와 root layout 파라미터"]
---

# next/root-params와 root layout 파라미터

## root parameter의 범위

root layout 앞까지의 동적 segment는 그 root 아래 route들이 공유하므로 전역 getter로 읽을 수 있다. `app/[lang]/layout.tsx`가 root이고 `app/[lang]/posts/[slug]/page.tsx`가 있으면 lang만 root parameter이며 slug는 일반 params prop이다.

```tsx
import { lang } from 'next/root-params'
export default async function RootLayout(props: LayoutProps<'/[lang]'>) {
  return <html lang={await lang()}><body>{props.children}</body></html>
}
export async function generateStaticParams() {
  return [{ lang: 'ko' }, { lang: 'en' }]
}
```

16.3에서 추가된 API다. 이름은 `[lang]` 등 폴더명에서 생성된다. `[post-slug]`처럼 JavaScript 함수 식별자로 사용할 수 없는 이름은 dev/build 오류다. dev/build/typegen이 export 타입을 생성한다.

## 어디서 호출할 수 있는가

Server Component와 그 서버 utility, nested generateStaticParams에서 사용한다. Client Component, Server Action, Route Handler에서는 현재 지원하지 않는다. Route Handler 지원 계획을 현재 기능으로 취급하지 않는다. import 자체가 client 환경에서 실패하므로 별도 server-only marker를 중복 필수로 추가할 필요는 없다.

Cache Components가 없으면 route를 정의하는 것만으로 root getter를 쓸 수 있다. Cache Components에서는 각 root param에 최소 한 build sample이 필요하다. 여러 root param이면 각각 값이 채워진 조합을 반환한다.

## 캐시 키에 참여하는 방식

```ts
import { lang } from 'next/root-params'
import { cacheLife } from 'next/cache'
export async function getNavigation() {
  'use cache'
  cacheLife('hours')
  const language = await lang()
  return loadNavigation(language)
}
```

실제로 읽은 root parameter만 cache key에 포함된다. 관계없는 param 변경까지 캐시를 나누지 않는다. 일반 params Promise는 cache 바깥에서 await하고 필요한 값을 인자로 전달하는 패턴을 사용한다. root getter는 use cache에서 직접 읽을 수 있는 예외다.

unstable_cache 안에서는 root getter 호출이 runtime 오류다. 오래된 캐시 wrapper에 getter를 넣는 대신 use cache로 전환하거나 필요한 값을 바깥에서 전달한다.

## 반환 타입과 여러 root layout

| segment | 기본 getter Promise 값 |
| --- | --- |
| `[id]` | string |
| `[...path]` | string[] |
| `[[...path]]` | string[] 또는 undefined |

여러 root layout 중 parameter가 없는 root가 있으면 getter 타입에 undefined가 추가된다. `/dashboard/[id]` root와 `/marketing` root를 함께 쓰면 id는 `string | undefined`이며 marketing에서 undefined다. 특정 page에 있다고 전역 타입 전체를 string으로 단언하지 않는다.

root 아래 다른 branch에 같은 `[slug]` 이름이 있어도 의미/타입이 다를 수 있다. 이것이 일반 하위 param을 전역 getter로 노출하지 않는 이유다.

## 여러 root 값과 공유 utility 예제

```tsx
// app/[lang]/[locale]/layout.tsx
export async function generateStaticParams() {
  return [{ lang: 'en', locale: 'us' }, { lang: 'en', locale: 'uk' }]
}
// app/[lang]/posts/[slug]/page.tsx
export async function generateStaticParams() {
  const language = await lang()
  const posts = await fetch(`https://api.example.com/posts?lang=${language}`).then(r => r.json())
  return posts.map(post => ({ slug: post.slug }))
}
```

공유 getTranslations는 `await lang()` 뒤 `import('@/locales/' + language + '.json')`을 호출할 수 있다. lang+locale root도 실제 읽은 getter만 cache key를 나눈다. root 바로 아래 page는 slug를 모르고 blog `[slug]`와 store `[...slug]`는 이름이 같아도 각각 string/string[]이므로 slug를 전역 getter로 만들지 않는다.

catch-all root의 `await path()`는 경로 배열이며 `segments?.join(' / ')`로 nav를 구성할 수 있다. 다른 root에서 path가 없을 수 있으면 optional 접근이 필요하다. `[...path]`를 사용한 원문 예제의 `string[] | undefined` 주석은 multiple root 조건이 있을 때의 타입으로 해석하며 단일 catch-all의 일반 반환 표는 string[]다.

## 이해 확인

1. app/layout이 root인 프로젝트의 app/[lang]에서 lang을 root getter로 읽을 수 있는가?
2. use cache에서 root getter를 읽을 때 모든 route params가 키에 들어가는가?
3. Server Action에서 locale이 필요하면 root getter 대신 어떤 입력/인증 검증 계약을 마련해야 하는가?

## 출처

- [Next.js, next-root-params](https://nextjs.org/docs/app/api-reference/functions/next-root-params)

## 관련 문서

- [[NextJS-App-Layouts]]
- [[NextJS-App-Static-Params]]
- [[NextJS-App-Cache-Functions]]
