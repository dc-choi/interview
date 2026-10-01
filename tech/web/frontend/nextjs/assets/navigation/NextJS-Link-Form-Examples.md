---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Link의 공유 이동 방지와 Form 실행 예제"]
---

# Link의 공유 이동 방지와 Form 실행 예제

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 공유 Context의 이동 방지

```tsx
// app/contexts/navigation-blocker.tsx
'use client'
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
const Context = createContext({ isBlocked: false, setIsBlocked: (_: boolean) => {} })
export function NavigationBlockerProvider({ children }: { children: ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false)
  return <Context.Provider value={{ isBlocked, setIsBlocked }}>{children}</Context.Provider>
}
export function useNavigationBlocker() { return useContext(Context) }
```

```tsx
// app/components/custom-link.tsx
'use client'
import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useNavigationBlocker } from '../contexts/navigation-blocker'
export function CustomLink({ onNavigate, ...props }: ComponentProps<typeof Link>) {
  const { isBlocked } = useNavigationBlocker()
  return <Link {...props} onNavigate={event => {
    if (isBlocked && !window.confirm('저장하지 않고 이동할까요?')) {
      event.preventDefault()
      return
    }
    onNavigate?.(event)
  }} />
}
```

```tsx
// app/components/edit-form.tsx
'use client'
import { useNavigationBlocker } from '../contexts/navigation-blocker'
export default function EditForm() {
  const { setIsBlocked } = useNavigationBlocker()
  return <form onChange={() => setIsBlocked(true)} onSubmit={event => {
    event.preventDefault()
    setIsBlocked(false) // 학습용 완료 처리, 운영은 저장 성공 뒤 clear
  }}><input name="name" /><button type="submit">저장</button></form>
}
```

root layout의 body 안에서 NavigationBlockerProvider로 children을 감싸고 page에서 CustomLink 기반 nav와 EditForm을 렌더한다. `<CustomLink href="/">홈</CustomLink>`와 `<CustomLink href="/about">소개</CustomLink>`가 같은 dirty state를 읽는다. 원문 wrapper의 마지막 props spread는 caller onNavigate가 guard를 덮을 수 있어 handler를 마지막에 두고 합성했다. 실제 저장 실패 전에 dirty를 false로 만들지 않는다.

## 일반 Link 조합

```tsx
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
export function Navigation({ posts }: { posts: { id: number; slug: string; title: string }[] }) {
  const pathname = usePathname()
  const router = useRouter()
  return <nav>
    <Link href={{ pathname: '/about', query: { name: 'test' } }} replace>소개</Link>
    <Link className={pathname === '/about' ? 'active' : ''} href="/about">현재 메뉴</Link>
    <Link href="/dashboard#settings" scroll={false}>설정</Link>
    <Link href="/about" transitionTypes={['slide-in']}>전환</Link>
    <Link href="/dashboard" prefetch={false}>사전 조회 끄기</Link>
    {posts.map(post => <Link key={post.id} href={`/blog/${encodeURIComponent(post.slug)}`}>
      {post.title}</Link>)}
    <button onClick={() => router.push('/dashboard', { scroll: false })}>이동</button>
  </nav>
}
```

usePathname은 App 활성 메뉴를 판단하고 Pages는 router.pathname/asPath를 용도에 맞게 사용한다. static href 객체, replace, hash, scroll:false, transitionTypes와 동적 목록은 공통 탐색 계약을 따른다. Proxy rewrite와 실제 href/as 조합은 [[NextJS-Pages-Navigation#Link 옵션 사례와 버전 이력]]에 있다. App의 auto/null/true/false prefetch와 Partial Prefetching의 App Shell 동작은 [[NextJS-Link-and-Form#Link 속성과 prefetch]]를 따른다.

## App 검색 Form과 pending

```tsx
// app/ui/search-button.tsx
'use client'
import { useFormStatus } from 'react-dom'
export default function SearchButton() {
  const { pending } = useFormStatus()
  return <button type="submit">{pending ? '검색 중' : '검색'}</button>
}
```

```tsx
// app/page.tsx
import Form from 'next/form'
import SearchButton from './ui/search-button'
export default function Page() {
  return <Form action="/search"><input name="query" /><SearchButton /></Form>
}
```

```tsx
// app/search/page.tsx
export default async function SearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const value = (await searchParams).query
  const query = Array.isArray(value) ? value[0] ?? '' : value ?? ''
  const res = await fetch(`https://search.example.com/?query=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error('검색 실패')
  const results: { id: string; title: string }[] = await res.json()
  return <ul>{results.map(result => <li key={result.id}>{result.title}</li>)}</ul>
}
```

app/search/loading.tsx는 `export default function Loading() { return <p>검색 중</p> }`처럼 결과 조회 fallback을 반환한다. viewport에 Form이 보일 때 `/search` shared layout/loading만 prefetch하고 제출한 query 결과를 기다린다. 즉시 pending feedback은 useFormStatus를 form 자식에서 읽는다. 원문의 default export SearchButton과 named import 불일치는 default import로 고쳤다.

## function action의 mutation과 이동

```ts
// app/posts/actions.ts
'use server'
import { redirect } from 'next/navigation'
export async function createPost(data: FormData) {
  const title = data.get('title')
  if (typeof title !== 'string' || !title.trim()) throw new Error('제목 필요')
  const res = await fetch('https://cms.example.com/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) throw new Error('작성 실패')
  const post: { id: string } = await res.json()
  redirect(`/posts/${encodeURIComponent(post.id)}`)
}
```

해당 Form은 `action={createPost}`와 name title 입력을 사용한다. 실제 Action은 사용자 인증과 권한 검증을 추가하고 CMS token은 서버에 둔다. destination을 실행 후 알기 때문에 shared UI 자동 prefetch가 없고 replace/scroll은 무시된다. `/posts/[id]` page는 `const { id } = await params` 뒤 CMS에서 조회해 title을 렌더한다. 원문의 선언되지 않은 data.id는 조회한 post.id로 고쳤다.

Form string action은 action 필수 URL/string, replace boolean 기본false, scroll boolean 기본true, App prefetch boolean 기본true다. function action은 Server Action 함수 필수다. action 빈 문자열은 현재 route query 갱신이며, key string-action 재렌더는 지원하지 않는다. formAction override에는 basePath를 포함하고 prefetch가 없다. method/encType/target 또는 formMethod/formEncType/formTarget은 native form 동작 경계를 따른다.

## 출처

- [Next.js, Link](https://nextjs.org/docs/app/api-reference/components/link)
- [Next.js, Form](https://nextjs.org/docs/app/api-reference/components/form)

## 관련 문서

- [[NextJS-Link-and-Form]]
- [[NextJS-Pages-Navigation]]
- [[NextJS-Form-Patterns]]
