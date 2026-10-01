---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["getStaticPaths와 fallback 선택", "NextJS Pages Static Paths"]
---

# getStaticPaths와 fallback 선택

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 경로 목록과 경로 밖 정책

동적 페이지가 `getStaticProps`를 사용하면 `getStaticPaths()`가 `{ paths, fallback }`을 반환한다. `getServerSideProps`와 함께 사용할 수 없고 페이지 파일에서 독립 export해야 한다. production에서는 build 때만 실행하고 `next dev`에서는 요청마다 실행한다.

```tsx
import type { GetStaticPaths } from 'next'

export const getStaticPaths = (async () => ({
  paths: [{ params: { id: '1' }, locale: 'ko' }],
  fallback: 'blocking',
})) satisfies GetStaticPaths
```

`paths`는 URL 문자열 또는 `{ params, locale? }` 객체의 배열이다. `params` 키는 파일의 동적 segment 이름과 일치해야 한다. catch-all은 문자열 배열, optional catch-all의 루트는 `null`, `[]`, `undefined`, `false`로 지정할 수 있다. 문자열은 대소문자를 구분한다. 정규화 정책 없이 `WoRLD`를 생성해 `world`에서 접근하려 하지 않는다.

## 동적 segment의 값 형태

`pages/blog/[slug].tsx`는 `/blog/a`에서 `{ slug: 'a' }`, `pages/shop/[...slug].tsx`는 `/shop/a/b`에서 `{ slug: ['a', 'b'] }`를 받는다. catch-all은 `/shop` 자체를 포함하지 않는다. `pages/shop/[[...slug]].tsx`는 `/shop`도 포함하며 이때 slug가 undefined일 수 있다. 파일 구조와 params 형식을 함께 맞춘다.

## false, true, blocking 비교

| fallback | build 목록 밖 첫 요청 | 이후 요청 | 적합한 경우 |
| --- | --- | --- | --- |
| `false` | 404 | 여전히 404, 새 build 필요 | 적은 수의 고정 경로 |
| `true` | 일반 직접 방문은 빈 props의 fallback UI 후 JSON 반영 | 생성된 HTML/JSON cache | 대규모 경로, skeleton 허용 |
| `'blocking'` | 생성 완료를 기다려 완성 HTML 응답 | 생성된 HTML/JSON cache | 첫 응답 지연은 허용, 중간 UI는 피함 |

`true`라도 crawler와 Link/router를 통한 client-side 방문은 blocking 방식으로 처리한다. 모든 첫 방문에 skeleton이 보인다고 가정하지 않는다. `true`와 `'blocking'`은 static export에서 지원하지 않는다.

fallback은 **아직 없는 경로의 생성 정책**이다. 이미 생성한 페이지 갱신 정책이 아니며 변경 내용 반영에는 ISR `revalidate`/`res.revalidate`가 필요하다.

```tsx
import { useRouter } from 'next/router'

export default function Post({ post }) {
  const { isFallback } = useRouter()
  if (isFallback) return <p>본문을 생성하는 중...</p>
  return <h1>{post.title}</h1>
}
```

fallback 중 props가 비어 있으므로 guard 전에 `post.title`에 접근하지 않는다. 경로가 목록 밖이라는 사실과 콘텐츠가 없다는 사실은 다르다. `getStaticProps`에서 실제 조회 후 `notFound`를 판단한다.

## build 시간과 첫 요청 비용

인기 경로만 `paths`에 넣고 나머지를 on-demand 생성하면 빌드 시간이 줄어든다. preview 배포에서 `paths: []`, `fallback: 'blocking'`으로 모두 요청 시 생성할 수도 있다. 첫 요청 지연과 origin 부하를 대신 부담한다. production에서 어느 경로를 미리 만들지는 트래픽과 콘텐츠 수로 정한다.

버전 이력에서 SSG API는 v9.3, ISR은 v9.5, blocking은 v10, bot-aware fallback은 v12, on-demand ISR 안정화는 v12.2다. 현재 Pages 계약을 이해하기 위한 이력이며 과거 버전을 설치하라는 권장이 아니다.

## 환경별 사전 생성과 완결된 fallback 페이지

```tsx
// pages/posts/[id].tsx
import { useRouter } from 'next/router'

export const getStaticPaths = async () => {
  if (process.env.SKIP_BUILD_STATIC_GENERATION) {
    return { paths: [], fallback: 'blocking' }
  }
  const response = await fetch('https://api.example.com/posts')
  if (!response.ok) throw new Error('경로 조회 실패')
  const posts: { id: string }[] = await response.json()
  return {
    paths: posts.map(({ id }) => ({ params: { id: String(id) } })),
    fallback: true,
  }
}

export const getStaticProps = async ({ params }) => {
  const response = await fetch(`https://api.example.com/posts/${params.id}`)
  if (response.status === 404) return { notFound: true, revalidate: 60 }
  if (!response.ok) throw new Error('본문 조회 실패')
  return { props: { post: await response.json() }, revalidate: 60 }
}

export default function Post({ post }) {
  const router = useRouter()
  if (router.isFallback) return <p>생성 중...</p>
  return <h1>{post.title}</h1>
}
```

환경 변수는 문자열이므로 위 예제는 설정 존재 여부를 검사한다. `SKIP_BUILD_STATIC_GENERATION=false` 문자열도 truthy다. 실제 flag 계약이 true/false라면 `=== 'true'`로 비교한다. preview 배포에서만 건너뛰려면 해당 환경에만 변수를 제공한다.

`paths`의 복합 동적 경로도 각 key를 함께 지정한다. `pages/posts/[postId]/[commentId]`에는 `{ params: { postId: '1', commentId: '2' } }`가 필요하다. fallback 없는 경로는 목록 밖에서 404이므로 그 경로를 생성하기 위한 `notFound` 반환은 필요하지 않다. 목록 안 콘텐츠가 실제 삭제된 상황은 `getStaticProps`가 판단한다.

## 학습 확인

- 새 상품 ID를 추가하고 세 fallback 값의 첫 방문 결과를 비교한다.
- 직접 URL, Link 이동, crawler 방문에서 `true`의 차이를 설명한다.
- 생성된 페이지의 수정과 신규 경로 생성을 다른 정책으로 설계한다.

## 출처

- [Next.js, dynamic-routes](https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes)
- [Next.js, get-static-paths](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-static-paths)
- [Next.js, get-static-paths](https://nextjs.org/docs/pages/api-reference/functions/get-static-paths)

## 관련 문서

- [[NextJS-Pages-Static-Props]]
- [[NextJS-Pages-ISR]]
- [[NextJS-Pages-Navigation]]
