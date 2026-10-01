---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["App Router 클라이언트 이동과 history"]
---

# App Router 클라이언트 이동과 history

## HTML, RSC와 공유 layout

첫 방문은 server HTML로 빠르게 UI를 보여 주고 RSC로 tree를 reconcile하며 Client Component를 hydrate한다. 이후 Link navigation은 RSC를 받아 공유 layout/state를 유지하고 변경된 page 부분을 교체한다. Link는 기본 선택이고 button/event 기반 이동이 필요할 때 useRouter를 쓴다.

기존 prefetch 모델은 static route 전체를 가져오고 dynamic route는 생략하거나 loading까지 부분 prefetch한다. Partial Prefetching에서는 App Shell/per-link 동작이 달라지므로 [[NextJS-App-Prefetch-Config]]의 옵션 조건을 따른다.

prefetch는 링크가 viewport에 보일 때 시작한다. hydration이 늦거나 네트워크가 느리면 클릭 전에 완료되지 않아 fallback도 즉시 준비되지 않을 수 있다. 불필요한 client JS를 줄이고 dynamic 경로에는 의미 있는 fallback을 둔다. 링크가 매우 많은 목록은 false 또는 hover 이후 `prefetch={null}`로 기본 동작을 다시 활성화하는 방법을 고려한다.

## useRouter 계약

App Router는 `next/navigation`에서 import한다. Pages의 next/router와 섞지 않는다.

| API | 효과 |
| --- | --- |
| push(href, options) | history 새 entry로 이동 |
| replace(href, options) | 현재 entry 교체 |
| refresh() | current Client Cache를 비우고 RSC 새 요청/병합 |
| prefetch(href, {onInvalidate}) | 목적지 preload, stale 때 callback 최대 한 번 |
| back()/forward() | history 이전/다음 |
| bfcacheId | 해당 segment의 opaque 식별자 |

push/replace options의 `scroll: false`는 자동 scroll을 억제하고 `transitionTypes: string[]`는 navigation Transition의 React.addTransitionType에 전달된다. trusted destination을 사용한다. untrusted `javascript:` URL은 페이지 안에서 실행될 수 있으므로 입력을 검증한다.

refresh는 Server Component를 다시 읽어 unaffected client state/scroll을 보존하며 서버 데이터 캐시를 invalidate하지 않는다. 같은 force-cache 데이터면 결과도 같을 수 있다. 서버 cache를 바꾸려면 revalidatePath/revalidateTag/updateTag를 사용한다.

## URL 관찰과 native history

router.pathname/query/events 대신 usePathname/useSearchParams와 Effect를 조합한다. navigation 시작 시점의 계측은 instrumentation-client hook도 제공한다. URL observer의 useSearchParams는 prerender에서 suspend하므로 Suspense 안에 둔다.

```tsx
const next = new URLSearchParams(searchParams.toString())
next.set('sort', 'asc')
window.history.pushState(null, '', `?${next.toString()}`)
```

native pushState/replaceState도 Next router와 통합되어 usePathname/useSearchParams를 동기화한다. push는 뒤로 돌아갈 entry를 만들고 replace는 현재 entry를 대체한다. 단순 client query 변경과 서버 데이터 재조회가 필요한 navigation을 구분한다.

## state 보존과 bfcacheId

Cache Components는 React Activity로 navigation 간 client state를 보존한다. bfcacheId는 fresh push/replace로 주변 segment가 새로 생성될 때 바뀌고 back/forward, refresh, query/hash만 바뀐 navigation에서는 유지된다.

```tsx
'use client'
import { useRouter } from 'next/navigation'
export default function Page() {
  const { bfcacheId } = useRouter()
  return <form key={bfcacheId}><input name="draft" /></form>
}
```

새 방문만 reset하고 back/forward에서는 복원하고 싶을 때 쓸 수 있다. 명시적 submit reset이나 draft id 기반 key가 우선이고 bfcacheId는 기존 코드 migration 같은 마지막 수단이다. template key reset과 적용 범위를 비교한다.

## useLinkStatus 피드백

next/link의 useLinkStatus는 Link descendant에서 `{pending}`을 반환한다. history update 전 true, 후 false이며 모든 dynamic content 완료를 나타내지는 않는다. 이미 prefetch된 링크는 pending이 생략되고 여러 링크를 빠르게 클릭하면 마지막 링크만 pending이다. Pages에서는 false다.

hint는 고정 크기를 유지하고 opacity를 바꿔 layout shift를 막는다. 100ms 정도 CSS delay로 빠른 이동에서 깜박임을 줄인다. indicator만 추가해 실제 waterfall이나 prefetch 문제를 해결했다고 보지 않는다.

## 전환 지연의 원인별 조치

서버 prerender는 build/revalidation 때 결과를 cache하고 dynamic render는 실제 요청 때 실행한다. RSC payload는 첫 방문과 후속 이동 모두 server에서 만들고 첫 방문에는 HTML도 보낸다. dynamic route에 loading이 있으면 공유 layout/skeleton을 먼저 가져와 즉시 피드백을 주며 shared layout은 interactive하고 이동을 중단할 수 있다. 이 구조는 TTFB/FCP/TTI 개선에 도움이 된다.

정적으로 만들 수 있는 `[slug]` route에는 `generateStaticParams`에서 post 목록을 `{slug}` 배열로 반환해 요청 때 rendering으로 떨어지지 않게 한다. devtools의 route indicator로 static/dynamic을 구분한다. hydration 완료 전에는 Link prefetch가 시작되지 않으므로 큰 dependency를 bundle analyzer로 찾고 가능한 로직을 server로 이동한다.

prefetch false는 static route도 클릭 후 가져오고 dynamic route는 server 응답을 기다리게 한다. hover에서 active 상태를 켜 `prefetch={active ? null : false}`로 복원하면 긴 목록의 viewport prefetch를 줄인다. 느린 네트워크에서는 prefetched loading 자체도 늦을 수 있으므로 Link 안의 useLinkStatus hint나 progress bar를 별도로 둔다. experimental useOffline은 [[NextJS-App-Offline]]에서 connectivity 조건을 확인한다.

sticky/fixed header 뒤에 목적지 제목이 가려지면 `html { scroll-padding-top: 80px; }`처럼 scroll offset을 둔다. history로 locale을 바꿀 때는 현재 locale prefix를 교체한 새 경로를 replace한다. 현재 pathname 앞에 locale을 무조건 덧붙이면 prefix가 중복될 수 있다.

## pending hint 구현과 API 도입

```tsx
function Hint() {
  const { pending } = useLinkStatus()
  return <span aria-hidden className={`link-hint ${pending ? 'is-pending' : ''}`} />
}
// Link 안에서만 hook을 실행한다.
<Link href="/dashboard" prefetch={false}>대시보드<Hint /></Link>
```

```css
.link-hint { display:inline-block; width:.6em; height:.6em; margin-left:.25rem;
  border-radius:9999px; background:currentColor; opacity:0; visibility:hidden; }
.link-hint.is-pending { visibility:visible; animation:fadeIn 200ms ease 100ms forwards,
  pulse 1s ease-in-out 100ms infinite; }
@keyframes fadeIn { to { opacity:.35; } }
@keyframes pulse { 50% { opacity:.15; } }
```

static prefetch가 완료됐거나 route loading으로 즉시 전환하면 hint가 필요하지 않을 수 있다. 각 shop category Link에 고정 크기 hint를 넣어도 마지막 클릭한 Link만 pending이다. useLinkStatus는 인자 없고 `{pending:boolean}` 반환이며 v15.3.0 도입이다. App useRouter는 v13.0.0, prefetch onInvalidate는 v15.4.0에 도입됐다. refresh 시 cookie/header가 달라지면 cache된 fetch를 재사용해도 결과 일부가 달라질 수 있다.

## 이해 확인

1. router.refresh 뒤 상품 가격이 같은 값이면 어느 cache를 확인해야 하는가?
2. useLinkStatus의 pending false가 page 전체 데이터 완료를 뜻하는가?
3. 뒤로 가기에서는 draft를 유지하고 fresh 방문에서 reset하려면 어떤 key가 적합한가?

## 출처

- [Next.js, linking-and-navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating)
- [Next.js, use-link-status](https://nextjs.org/docs/app/api-reference/functions/use-link-status)
- [Next.js, use-router](https://nextjs.org/docs/app/api-reference/functions/use-router)

## 관련 문서

- [[NextJS-App-URL-Hooks]]
- [[NextJS-App-Prefetch-Config]]
- [[React-Activity]]
