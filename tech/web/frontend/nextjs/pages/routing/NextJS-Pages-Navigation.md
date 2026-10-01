---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 Link, 검색 Form과 shallow 이동", "NextJS Pages Navigation"]
---

# Pages Router의 Link, 검색 Form과 shallow 이동

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## Link는 anchor와 client 이동을 연결한다

`next/link`는 anchor 속성을 전달하고 client-side 이동과 production prefetch를 제공한다. href는 문자열 또는 `{ pathname, query }` 객체다. 동적 segment를 문자열로 합칠 때 `encodeURIComponent`를 사용하거나 route template과 query 객체를 사용한다.

```tsx
import Link from 'next/link'

<Link href={{ pathname: '/posts/[slug]', query: { slug: 'hello' } }}>본문</Link>
<Link href="/dashboard#settings" scroll={false}>설정</Link>
```

`replace` 기본 false는 history에 추가하고 true는 현재 entry를 교체한다. `as`는 표시 URL이고 `href`는 실제 목적지다. 과거 9.5.3 이전의 dynamic href/as 조합을 현재 필수 규칙으로 삼지 않는다. locale은 현재 값을 기본 사용하고 `locale={false}`는 href에 prefix를 직접 넣을 때 쓴다.

## prefetch의 Pages 계약

viewport에 들어온 Link는 production에서 prefetch한다. SSG는 page code와 JSON data를 미리 가져오고 SSR data는 클릭할 때 가져온다. `prefetch={false}`는 viewport prefetch를 끄지만 **hover prefetch는 남는다**. 완전히 요청을 차단해야 하는 링크는 native anchor 등의 동작으로 설계한다. App Router의 false 계약을 Pages에 복사하지 않는다.

Proxy가 `/dashboard`를 `/auth/dashboard` 또는 `/public/dashboard`로 rewrite하면 `<Link as="/dashboard" href={actualPath}>`로 표시와 prefetch 경로를 알려 불필요한 proxy 조회를 줄인다. 이것은 인증의 최종 보장이 아니다.

## scroll과 navigation event

scroll 기본 true에서도 현재 페이지가 viewport에 보이면 위치를 유지할 수 있다. 새 페이지가 보이지 않을 때 적절한 첫 page element로 scroll한다. fixed/sticky와 보이지 않는 노드는 건너뛴다. hash는 ID로 이동하고 `scroll={false}`는 자동 처리를 끈다. sticky header에 가려지는 문제는 `scroll-padding-top` 또는 대상 `scroll-margin-top`으로 조정한다.

`onClick`은 모든 click이고 `onNavigate`는 같은 origin client navigation에 한정된다. modifier key 새 탭, 외부 URL, download는 onNavigate 대상이 아니다. callback의 `preventDefault()`로 이동을 취소할 수 있다. source의 빈 `transitionTypes` 절만으로 Pages API 계약을 추정하지 않는다.

## shallow는 현재 페이지의 URL 상태를 바꾼다

```tsx
void router.push({ pathname: '/products', query: { page: '2' } }, undefined, {
  shallow: true,
})
```

같은 페이지의 URL/query를 바꾸면서 state를 유지하고 `getStaticProps`, `getServerSideProps`, `getInitialProps`를 다시 실행하지 않는다. 다른 페이지로 이동하면 unload/data fetching을 한다. Proxy는 목적지를 동적으로 rewrite할 수 있어 client가 동일 페이지인지 확인할 수 없으므로 shallow 요청을 shallow로 취급한다.

## next/form은 GET 검색 이동이다

```tsx
import Form from 'next/form'

<Form action="/search" replace>
  <input name="query" />
  <button type="submit">검색</button>
</Form>
```

문자열 action은 GET처럼 input을 URL search params로 인코딩하고 client navigation한다. 빈 action은 현재 route query를 갱신한다. `replace` 기본 false, `scroll` 기본 true다. mutation용 API POST와는 별도다.

`onSubmit`에서 preventDefault하면 기본 navigation을 override한다. `method`, `encType`, `target`이 필요하면 native form을 사용한다. button의 `formMethod`/`formEncType`/`formTarget` override는 native 동작으로 돌아간다. 문자열 action에서 file input은 파일 내용이 아니라 filename을 제출한다. Pages에서 App Server Action 함수 action을 전제로 설계하지 않는다.

## shallow query 관찰과 class 변경 감지

이동은 첫 렌더 뒤 Effect 또는 사용자의 event에서 실행한다. render 본문에서 push하면 반복 렌더와 이동이 이어질 수 있다.

```tsx
useEffect(() => {
  void router.push('/?counter=10', undefined, { shallow: true })
}, [])
useEffect(() => {
  // counter 변경에 필요한 client 작업
}, [router.query.counter])
```

class의 `componentDidUpdate(previousProps)`에서는 `router.query.counter !== previousProps.router.query.counter`를 확인한 뒤 조회한다. 비교 없이 setState/fetch를 반복하면 update loop가 생길 수 있다. `router.push('/?counter=10', '/about?counter=10', { shallow: true })`처럼 다른 page를 as로 지정하면 기존 페이지가 unload되고 새 페이지의 데이터 함수를 기다린다.

## Link 옵션 사례와 버전 이력

```tsx
<Link href={{ pathname: '/about', query: { name: 'test' } }} replace>소개</Link>
<Link href="/dashboard" prefetch={false} shallow={false} locale="fr">대시보드</Link>
<Link href="/dashboard" locale={false}>직접 locale 경로 관리</Link>
<Link href="/dashboard" onNavigate={(event) => {
  if (hasUnsavedChanges) event.preventDefault()
}}>대시보드</Link>
```

`href`는 필수, replace/shallow는 기본 false, scroll/prefetch는 기본 true다. anchor의 className/target도 직접 prop으로 전달된다. 표시 URL과 실제 prefetch 경로가 다르면 `as`와 href를 둘 다 지정한다.

```tsx
// proxy.ts, cookie 존재는 예시 분기이며 인증 검증을 대신하지 않는다.
import { NextRequest, NextResponse } from 'next/server'
export const proxy = (request: NextRequest) => {
  if (request.nextUrl.pathname !== '/dashboard') return NextResponse.next()
  const path = request.cookies.has('authToken') ? '/auth/dashboard' : '/public/dashboard'
  return NextResponse.rewrite(new URL(path, request.url))
}
// page에서 현재 auth 상태로 같은 실제 경로를 선택
<Link as="/dashboard" href={isAuthed ? '/auth/dashboard' : '/public/dashboard'}>이동</Link>
```

동적 표시 경로는 실제 username을 넣은 `as`와 route template/query href를 대응시킨다. 미치환 `/dashboard/[user]` 문자열을 실제 사용자 URL로 간주하지 않는다. sticky header 높이가 64px이면 global CSS `html { scroll-padding-top: 64px; }` 또는 target의 `scroll-margin-top`을 둔다.

v1 Link 도입, v8 prefetch 개선, v10 dynamic href 자동 해석, v13 자식 anchor 불필요, v15.3 onNavigate, v15.4 prefetch auto alias, v16.2 transitionTypes 추가 이력이 있다. 현재 Pages reference의 transitionTypes 본문이 비어 있어 값/효과는 이 문서에서 추측하지 않는다.

## 대규모 redirect의 Pages 조회 API

component의 사용자 이벤트는 `next/router`의 push를 사용하고 보통 링크는 Link를 선택한다. 원문의 `app/page.tsx` filename은 Pages hook과 충돌하므로 `pages/index.tsx`에 작성한다. 설정/Proxy의 status, 순서, map/Bloom 전략은 [[NextJS-Redirect-Strategy]]를 따른다. Pages의 lookup endpoint는 다음 API Route다.

```ts
// pages/api/redirects.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import redirects from '@/redirects/redirects.json'
type Entry = { destination: string; permanent: boolean }
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathname = req.query.pathname
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')) {
    res.status(400).json({ message: 'Bad Request' }); return
  }
  if (!Object.hasOwn(redirects, pathname)) {
    res.status(400).json({ message: 'No redirect' }); return
  }
  const entry = (redirects as Record<string, Entry>)[pathname]
  res.status(200).json(entry)
}
```

Proxy는 `ScalableBloomFilter.fromJSON(generatedFilter)`로 filter를 로드하고 pathname 양성일 때 `new URL('/api/redirects?pathname=' + encodeURIComponent(pathname), request.nextUrl.origin)`을 fetch한다. ok JSON entry를 받으면 permanent에 따라 308/307을 선택하고 `new URL(entry.destination, request.url)`의 origin/path를 검증한다. false positive, non-ok, JSON parse/조회 오류에서는 redirect하지 않는 정책을 선택할 수 있다. API pathname query가 array일 수 있는 원문 타입 오류를 정규화했고 상속 key 조회도 막았다. matcher는 /api/redirects를 제외한다. 큰 map을 Proxy bundle에 import하지 않아 매 요청 비용을 줄인다. 직접 KV를 읽을 때 Global Config의 get(pathname) 값이 string인지 검사하고 JSON schema를 검증한다.

## 학습 확인

- viewport prefetch와 hover 요청을 각각 확인한다.
- 같은 페이지 query 변경과 다른 페이지 이동에 shallow를 적용해 비교한다.
- 검색 GET과 데이터 변경 POST의 endpoint를 구분한다.

## 출처

- [Next.js, redirecting](https://nextjs.org/docs/pages/guides/redirecting)
- [Next.js, linking-and-navigating](https://nextjs.org/docs/pages/building-your-application/routing/linking-and-navigating)
- [Next.js, form](https://nextjs.org/docs/pages/api-reference/components/form)
- [Next.js, link](https://nextjs.org/docs/pages/api-reference/components/link)

## 관련 문서

- [[NextJS-Pages-Router-API]]
- [[NextJS-Pages-Internationalization]]
- [[NextJS-Pages-Security-Forms]]
