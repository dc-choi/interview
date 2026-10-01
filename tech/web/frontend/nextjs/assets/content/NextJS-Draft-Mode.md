---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Draft Mode의 캐시 우회와 CMS 권한", "NextJS Draft Mode"]
---

# Draft Mode의 캐시 우회와 CMS 권한

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## draft cookie와 공유 캐시의 분리

Draft Mode는 콘텐츠 편집자가 최신 미발행 콘텐츠를 볼 때 해당 브라우저 요청의 캐시를 우회하는 기능이다. 일반 방문자는 기존 cache 경로를 사용한다. cookie가 CMS 권한이나 draft endpoint 선택 자체를 대신하지는 않는다.

활성 요청에서는 fetch cache를 건너뛰고 network를 사용한다. use cache 함수는 요청마다 재실행하고 결과를 저장하지 않으며 unstable_cache도 cache read/write를 우회한다. ISR response cache에도 포함되지 않는다. 응답은 private,no-cache,no-store,max-age=0,must-revalidate 정책을 사용한다.

CMS가 같은 URL에서 적절한 draft를 제공하면 조회 코드 변경 없이 우회를 활용할 수 있다. 별도 credentials/endpoint가 필요하면 isEnabled를 보고 server에서 선택한다. draft 전용 secret을 client에 전달하지 않는다.

## enable과 보안 검증

`await draftMode()`는 next/headers의 객체를 반환하고 enable()은 __prerender_bypass cookie를 설정한다. Route Handler에서 응답으로 cookie를 전달한다. public enable 예시는 학습용이며 실제 CMS integration은 shared secret, slug 존재, redirect 목적지를 검증한다.

~~~ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')
  if (!process.env.DRAFT_SECRET || secret !== process.env.DRAFT_SECRET || !slug)
    return new Response('Unauthorized', { status: 401 })
  const post = await getVerifiedCMSPost(slug) // 서버 CMS 조회, 목적지 검증
  if (!post) return new Response('Invalid slug', { status: 401 })
  const draft = await draftMode()
  draft.enable()
  redirect(post.internalPath)
}
~~~

query slug를 그대로 redirect하면 open redirect가 될 수 있다. CMS가 반환한 값도 내부 허용 path인지 service 함수에서 검증한다. env secret이 undefined인 경우 비교만으로 허용되지 않도록 정의 여부를 확인한다.

CMS가 편집 UI에서 secret/slug URL을 새 tab으로 여는 통합은 GET을 사용할 수 있다. cookie 상태를 바꾸는 일반 endpoint는 POST를 우선 고려하고 GET integration에는 secret/인증 및 노출 관리가 필요하다.

## preview 화면과 exit

Page의 async params를 await하고 CMS response status/없는 글을 처리한다. preview 배너는 server에서 isEnabled를 읽어 표시할 수 있다. 배너가 사라졌다는 UI 상태만으로 cookie가 제거됐다고 판단하지 않는다.

~~~tsx
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
const exit = async () => {
  'use server'
  const draft = await draftMode()
  draft.disable()
  redirect('/')
}
export default async function Banner() {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return null
  return <aside role="status">미리보기 중
    <form action={exit}><button type="submit">종료</button></form>
  </aside>
}
~~~

disable은 Server Action 또는 Route Handler의 쓰기 가능한 응답 경계에서 실행한다. POST/action exit를 우선 사용한다. GET exit가 필요하면 native GET form처럼 prefetch되지 않는 제어를 사용한다. exit URL을 Link로 두면 prefetch가 cookie 상태를 먼저 바꿀 수 있다.

## Cache Components와 편집 운영

Cache Components에서는 isEnabled를 use cache scope 안에서도 읽어 banner를 표현할 수 있다. draft에서는 해당 scope가 요청마다 실행되고 저장하지 않기 때문이다. enable/disable을 cache 함수 안에 넣는 것은 허용되지 않는다.

draft 요청이 우회해도 CMS upstream/CDN이 오래된 값을 반환하거나 draft token이 잘못됐으면 최신 콘텐츠가 나오지 않는다. browser cookie, Next cache 우회, CMS publication status, upstream cache를 순서대로 확인한다.

미발행 콘텐츠는 일반 static 결과/공유 client 상태/외부 analytics에 섞이지 않도록 조회/표시 범위를 확인한다. Pages의 res.setPreviewData/res.setDraftMode와 App draftMode의 비동기 API는 구분한다.

## CMS URL과 페이지 조회의 완결된 형태

CMS preview URL은 `https://<your-site>/api/draft?secret=<token>&slug=<path>` 형태다. `<path>` 대신 `/posts/{entry.fields.slug}` 같은 CMS 변수를 넣을 수 있다. custom URL 기능이 없는 CMS도 이 URL을 직접 구성해서 접근할 수 있다. secret은 Next 서버와 CMS만 공유한다. `/api/draft`의 Set-Cookie와 브라우저 저장된 __prerender_bypass로 활성화를 확인한다.

```ts
// lib/cms.ts: enable handler가 호출할 검증 함수
export async function getVerifiedCMSPost(path: string) {
  if (!path.startsWith('/posts/') || path.startsWith('//')) return null
  const slug = path.slice('/posts/'.length)
  const res = await fetch(`https://cms.example.com/preview/posts/${encodeURIComponent(slug)}`, {
    headers: { Authorization: `Bearer ${process.env.CMS_DRAFT_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const post = await res.json()
  if (typeof post.slug !== 'string' || !/^[a-z0-9-]+$/.test(post.slug)) return null
  return { ...post, internalPath: `/posts/${post.slug}` }
}
```

앞 절의 Route Handler에서 이 함수를 import한다. CMS 응답 구조와 slug 규칙은 해당 CMS 계약에 맞춘다. 공개 handler에서 enable만 호출하는 최소 학습 예와 secret 검증을 붙인 운영 예의 차이는 접근 통제다.

```tsx
// app/posts/[slug]/page.tsx: 별도 draft endpoint가 있는 경우
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
export default async function Page({ params }: PageProps<'/posts/[slug]'>) {
  const { slug } = await params
  const { isEnabled } = await draftMode()
  const base = isEnabled ? 'https://cms.example.com/preview' : 'https://cms.example.com/published'
  const res = await fetch(`${base}/posts/${encodeURIComponent(slug)}`)
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error('CMS 조회 실패')
  const post = await res.json()
  return <main><h1>{post.title}</h1><article>{post.content}</article></main>
}
```

동일 endpoint CMS라면 base 분기와 isEnabled 조회를 제거하고 같은 fetch를 사용한다. Draft cookie가 있을 때 cache를 우회한다. Cache Components 예는 다음처럼 banner까지 cache scope에 둘 수 있다.

```tsx
import { draftMode } from 'next/headers'
export async function CachedPost({ slug }: { slug: string }) {
  'use cache'
  const res = await fetch(`https://cms.example.com/posts/${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error('CMS 조회 실패')
  const post = await res.json()
  const { isEnabled } = await draftMode()
  return <article>{isEnabled && <p role="status">미리보기</p>}
    <h1>{post.title}</h1><div>{post.content}</div></article>
}
```

root layout이 Banner를 렌더하면 모든 preview 경로에 표시된다. exit Server Action의 form은 POST이고 cookie 제거 후 `/`로 이동한다. GET exit를 택했다면 form method GET으로 호출해 Link prefetch의 선행 제거를 피한다.

## 학습 확인

- Next cache 우회가 CMS draft 권한을 대신하지 않는 이유를 설명한다.
- exit Link의 prefetch가 만드는 부작용을 재현한다.
- secret 누락/없는 slug/외부 redirect path를 거부하는지 확인한다.

## 출처

- [Next.js, draft-mode](https://nextjs.org/docs/app/guides/draft-mode)

## 관련 문서

- [[NextJS-Pages-Preview-Draft]]
- [[NextJS-Data-Security]]
- [[NextJS-Authentication]]
