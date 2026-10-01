---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages 데이터 함수에서 App fetch와 params로 옮기는 예제"]
---

# Pages 데이터 함수에서 App fetch와 params로 옮기는 예제

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## fetch cache와 request-time 조회

아래 대응은 legacy non-Cache-Components 설명이며 현재 cache model을 별도로 확인한다. Pages의 props/route cache와 App fetch Data Cache는 같은 층이 아니다.

```tsx
export default async function Page() {
  const [cached, uncached, revalidated] = await Promise.all([
    fetch('https://api.example.com/public', { cache: 'force-cache' }),
    fetch('https://api.example.com/live', { cache: 'no-store' }),
    fetch('https://api.example.com/posts', { next: { revalidate: 10 } }),
  ])
  if (![cached, uncached, revalidated].every(response => response.ok))
    throw new Error('데이터 조회 실패')
  return <p>명시한 정책으로 조회 완료</p>
}
```

force-cache는 Data Cache 재사용, no-store는 요청마다 upstream 조회, next.revalidate는 최대 갱신 간격 초다. 원문 SSG 절의 fetch default force-cache는 현재 fetch 기본과 충돌하므로 명시적 force-cache로 교정한다. cache 옵션만으로 무조건 정적/동적 route 결과를 단정하지 않는다.

```tsx
// Pages: pages/dashboard.tsx
export async function getServerSideProps() {
  const response = await fetch('https://api.example.com/projects')
  if (!response.ok) throw new Error('조회 실패')
  return { props: { projects: await response.json() } }
}
export default function Dashboard({ projects }: {
  projects: { id: string; name: string }[]
}) {
  return <ul>{projects.map(project => <li key={project.id}>{project.name}</li>)}</ul>
}
```

```tsx
// App: app/dashboard/page.tsx
export default async function Dashboard() {
  const response = await fetch('https://api.example.com/projects', { cache: 'no-store' })
  if (!response.ok) throw new Error('조회 실패')
  const projects: { id: string; name: string }[] = await response.json()
  return <ul>{projects.map(project => <li key={project.id}>{project.name}</li>)}</ul>
}
```

App Server Component가 조회와 렌더를 같은 함수에 두어 HTML은 유지하고 client JS를 줄인다. SSG 대응은 Pages getStaticProps를 사용한 같은 list에서 App fetch를 force-cache로 바꾼다. DB/CMS 직접 조회도 가능하며 반환할 client props는 최소화한다. 원문의 key 없는 SSG div 목록은 stable key를 추가한다.

## Node request에서 Web header/cookie로

Pages는 getServerSideProps({req})의 `req.headers.authorization`, `req.cookies.theme`를 읽는다. 원문의 req.getHeaders()는 IncomingMessage에 없는 method라 headers를 사용한다. App의 next/headers functions는 await하는 read API다.

```tsx
import { headers, cookies } from 'next/headers'
export default async function Page() {
  const authHeader = (await headers()).get('authorization')
  const theme = (await cookies()).get('theme')?.value ?? 'light'
  // authHeader는 서버 검증/조회에 사용하고 JSX나 client props로 노출하지 않는다.
  return <main data-theme={theme}>요청별 화면</main>
}
```

Server Component에서 Node res mutation을 하지 않는다. cookie/header 변경은 Route Handler/Action의 쓰기 경계를 사용한다.

## getStaticPaths와 generateStaticParams

```tsx
// Pages: pages/posts/[id].tsx
import type { GetStaticPaths, GetStaticProps } from 'next'
export const getStaticPaths: GetStaticPaths = async () => ({
  paths: [{ params: { id: '1' } }, { params: { id: '2' } }], fallback: false,
})
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const response = await fetch(`https://api.example.com/posts/${params?.id}`)
  if (response.status === 404) return { notFound: true }
  if (!response.ok) throw new Error('조회 실패')
  return { props: { post: await response.json() } }
}
```

원문 getStaticPaths 예에 fallback이 없어 필수 옵션을 추가했다. default page는 props post를 PostLayout 같은 UI에 전달한다.

```tsx
// App: app/posts/[id]/page.tsx
import { notFound } from 'next/navigation'
export async function generateStaticParams() { return [{ id: '1' }, { id: '2' }] }
export const dynamicParams = false
export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await fetch(`https://api.example.com/posts/${encodeURIComponent(id)}`, {
    cache: 'force-cache',
  })
  if (response.status === 404) notFound()
  if (!response.ok) throw new Error('조회 실패')
  const post = await response.json()
  return <article><h1>{post.title}</h1></article>
}
```

GSP는 nested params 객체 대신 segment 배열이며 layout에도 둘 수 있다. dynamicParams true 기본은 목록 밖 값을 on demand, false는404다. Pages fallback true의 shell/false404/blocking 요청대기와 단순 일대일 대응하지 않고 App streaming/loading으로 다시 설계한다. cacheComponents가 켜지면 dynamicParams export 제약 등 최신 모델을 따른다. unknown route가 무조건 cache된다고 단정하지 않는다.

## ISR과 API route 전환

Pages getStaticProps의 revalidate:60은 page 재생성 시간이고 App fetch `next:{revalidate:60}`는 조회 cache 정책이다. Pages Layout/PostList props 패턴을 App server list에 조회 결과를 직접 렌더하도록 옮길 수 있다.

```tsx
export default async function PostList() {
  const response = await fetch('https://api.example.com/posts', { next: { revalidate: 60 } })
  if (!response.ok) throw new Error('조회 실패')
  const posts: { id: string; name: string }[] = await response.json()
  return posts.map(post => <div key={post.id}>{post.name}</div>)
}
```

Pages API Routes는 남겨 둬도 동작하며 App route.ts는 method별 Web Request/Response handler를 export한다.

```ts
// app/api/route.ts
export async function GET(_request: Request) { return Response.json({ available: true }) }
```

외부 client가 API를 사용하면 endpoint 호환성을 유지한다. UI server 조회만을 위해 자신의 API endpoint를 다시 부르던 구조는 직접 service/DB 조회로 옮길 수 있다. GET 빈 함수 예는 응답을 반환하도록 완성했다. SPA까지 함께 전환한다면 [[NextJS-SPA-to-App-Migration]]의 CSR/bootstrap 절차와 Server Component 전환을 나눠 적용한다.

## 출처

- [Next.js, App migration](https://nextjs.org/docs/app/guides/migrating/app-router-migration)

## 관련 문서

- [[NextJS-Pages-to-App-Migration]]
- [[NextJS-Pages-to-App-UI-Examples]]
