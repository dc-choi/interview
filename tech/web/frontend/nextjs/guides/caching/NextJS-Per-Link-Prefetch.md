---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js prefetch 제어와 비용"]
---

# Next.js prefetch 제어와 비용

## 기본 자동 prefetch

Next는 route 단위로 JavaScript를 나누고 navigation 전에 필요한 JS/CSS/RSC를 가져온다. 최초 방문은 HTML/JS/RSC를, 후속 navigation은 Server Component의 RSC와 Client Component bundle을 사용한다. production에서 viewport에 들어온 Link를 대상으로 스케줄링하며 next dev를 자동 prefetch의 기준으로 삼지 않는다.

Cache Components가 꺼진 기본 모델에서는 정적 route를 전체 prefetch하고 기본 client TTL은 staleTimes.static의 5분이다. 동적 route는 loading 경계가 없으면 자동 prefetch를 생략하고, 있으면 layout부터 첫 loading 경계까지 준비한다. 동적 page cache 재사용은 기본 off이며 staleTimes.dynamic 설정을 따로 확인한다. 클릭 후 나머지는 서버 왕복/stream이 필요하다. 이 표준 모델의 수치를 Cache Components/partial에 그대로 적용하지 않는다.

큐는 viewport 링크, hover/touch 등 의도를 고려하고 새 링크가 오래된 작업을 대체하며 화면 밖으로 나간 링크는 버린다. 실험적 offline 지원은 연결 복구 시 이 큐를 통해 대기 prefetch를 재개한다. RSC cache는 메모리의 segment별 값이므로 `/dashboard/settings`에서 analytics로 이동할 때 공통 layout은 재사용한다.

## per-link로 얻는 것과 비용

Cache Components와 partial 모드에서 기본 Link는 route별 shell을 공유한다. true는 params/searchParams/전체 URL의 캐시 가능한 내용을 추가로 해결한다. 먼저 route 자체의 shell을 instant하게 만들어야 하며 true로 구조적 blocking을 가릴 수 없다.

| 구분 | App Shell | true per-link |
| --- | --- | --- |
| 범위 | route 패턴별 공유 | 보이는 true Link별 |
| 내용 | URL별 데이터를 뺀 정적/세션 출력 | shell과 캐시 가능한 URL별 출력 |
| 서버 비용 기준 | route 수 | 링크 수 |
| 목적 | 기본 탐색 UI | 클릭 전 더 많은 목적지 내용 |

정적으로 처리 가능한 페이지의 prefetch는 static cache로 제공할 수 있고 비정적 데이터에 접근하는 per-link prefetch는 서버 호출을 일으킨다. 카드 100개에 true를 붙이면 각 링크가 viewport에 들어올 때 그만큼 작업이 생길 수 있다. URL 의존, 알려진 cache lifetime, 충분한 클릭률이 모두 있을 때 고려한다. URL 의존이 없거나 실시간 uncached 내용뿐이면 더 좋은 UI를 만들지 못한 채 비용만 늘 수 있다.

cold cache, 느린 연결, 많은 링크와 직접 방문에서는 best-effort prefetch가 끝나지 않을 수 있다. 이때 shell과 fallback이 보여도 계약 위반은 아니다.

## session 데이터를 shell에 넣기

쿠키/헤더에 기반한 내용은 URL별 요청과 다르며 session별 client App Shell에 포함될 수 있다. 일반 cache는 runtime API를 내부에서 읽지 못하므로 다음 둘 중 하나를 택한다.

- **추출 후 인자 전달:** cookie/세션을 검증하고 teamId 같은 값을 getTopics(teamId)의 use cache 인자로 넘긴다. 같은 팀은 결과를 공유한다. 직접 방문에서 조회가 미완료이면 fallback, warm navigation에서는 준비된 UI를 보여줄 수 있다.
- **use cache: private:** cookie/header/만료 시각을 읽는 인증 helper를 가까운 private 함수로 묶는다. 브라우저 세션에만 캐시하고 서버 공유 캐시에 저장하지 않는다. 같은 scope 전체에 lifetime이 적용된다.

어느 쪽도 uncached 하위 조회까지 자동으로 shell에 넣지는 않는다. private 값은 build-time static shell에 포함되는 것과 다르다. 인증 cache 예제와 lifetime 조건은 [[NextJS-Auth-Cache-Patterns]]에 있다.

## hover, 수동 prefetch와 비활성화

```tsx
'use client'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
export function IntentLink({ href, children }: { href: string; children: ReactNode }) {
  const [active, setActive] = useState(false)
  return <Link href={href} prefetch={active ? null : false}
    onMouseEnter={() => setActive(true)} onFocus={() => setActive(true)}>
    {children}
  </Link>
}
```

null은 기본 prefetch를 복원한다. URL별 추가 내용까지 의도 기반으로 준비하려는 partial 링크라면 활성화 값을 true로 선택하고 per-link 비용을 받아들인다. false는 viewport/hover 자동 prefetch를 끄며 클릭 때 필요한 요청을 기다리게 한다. footer/무한스크롤처럼 낮은 클릭률의 링크에 활용한다.

`useRouter`를 next/navigation에서 읽고 `router.prefetch('/pricing')`를 카드의 onMouseEnter, 스크롤/분석 신호에서 호출할 수 있다. `NoPrefetchLink` wrapper는 props를 펼친 뒤 마지막에 `prefetch={false}`를 지정해 전달된 prop이 덮지 않도록 한다.

```tsx
// Client Component의 effect, href와 router가 준비된 상태
useEffect(() => {
  let cancelled = false
  const warm = () => {
    if (!cancelled) router.prefetch(href, { onInvalidate: warm })
  }
  warm()
  return () => { cancelled = true }
}, [href, router])
```

onInvalidate는 캐시가 낡았다고 판단할 때 다시 준비하는 신호다. partial 모드의 데이터 무효화는 관련 prefetch의 갱신과 연결된다. Link를 직접 anchor+preventDefault+router.push로 재구현하면 modifier/new-tab/download/접근성도 직접 유지해야 한다. 단순 a는 전체 문서 navigation이다. ForesightJS 같은 cursor 예측 도구도 확장 선택지지만 기본 Link가 충분하면 도입할 이유가 없다.

## prefetch 중 부작용

page/layout 렌더에서 analytics를 호출하면 실제 방문 전 prefetch 때도 실행될 수 있다. 실제 방문 후의 Client Effect나 사용자가 시작한 Server Action으로 옮긴다.

```tsx
'use client'
import { useEffect } from 'react'
import { trackPageView } from '@/lib/analytics'
export function AnalyticsTracker() {
  useEffect(() => { trackPageView() }, [])
  return null
}
```

layout에 tracker와 children을 렌더하는 방식이다. layout이 재사용되므로 모든 URL 변경을 추적하려면 pathname 등 실제 navigation 신호와 연결한다. 개발 Strict Mode의 effect 재실행과 분석 서비스의 중복 집계도 고려한다.

## 출처

- [Next.js, prefetching](https://nextjs.org/docs/app/guides/prefetching)
- [Next.js, optimizing-prefetching](https://nextjs.org/docs/app/guides/optimizing-prefetching)

## 관련 문서

- [[NextJS-Prefetching]]
- [[NextJS-Partial-Prefetch-Adoption]]
- [[NextJS-Instant-Validation]]
