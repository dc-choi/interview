---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Partial Prefetching과 segment prefetch 설정"]
---

# Partial Prefetching과 segment prefetch 설정

## 링크의 의도와 목적지의 비용

링크 prefetch prop은 미리 준비할 의도를 정하고 목적지의 segment export는 허용할 비용의 상한을 정한다. App Shell은 URL-independent한 static/fallback UI와 세션 데이터를 준비하고, per-link prefetch는 params/searchParams/full URL을 알아낸 뒤 그 뒤의 cacheable content까지 준비한다.

Cache Components만 켠 것과 Partial Prefetching을 채택한 것을 같은 설정으로 취급하지 않는다. global partialPrefetching 또는 목적지 `export const prefetch = 'partial'`로 채택한다. 이 export는 cacheComponents가 있어야 하고 Client segment에서는 사용할 수 없다.

## segment 설정

| export | 동작 |
| --- | --- |
| 생략/auto | framework의 partialPrefetching 설정 따름 |
| partial | 해당 목적지를 Partial Prefetching으로 채택 |
| force-disabled | 해당 segment와 아래 segment data를 prefetch에서 제외 |

```tsx
// app/search/page.tsx: 목적지에 선언
export const prefetch = 'partial'
```

`auto`는 생략과 같으므로 불필요하게 명시하지 않는다. 점진 채택 후 scope 전체가 partial이면 global flag로 옮기고 export를 제거한다.

force-disabled라도 route metadata prefetch는 가능하다. 또한 상위 segment에서 per-link prefetch가 실행되면 downstream 전체가 한 response에 들어가므로 아래 force-disabled segment도 그 응답의 일부로 prefetch될 수 있다. 절대적인 모든 상황의 차단으로 해석하지 않는다.

## Link와 서버 비용

- 기본 Link: Partial Prefetching route에서는 per-route App Shell을 준비한다.
- `prefetch={true}`: 목적지 URL을 해석하는 per-link render로 cacheable URL-specific content를 추가한다.
- `prefetch={false}`: 목적지 export와 관계없이 해당 링크 prefetch를 생략한다.

```tsx
<Link href="/search?q=shoes" prefetch={true}>신발 검색</Link>
```

q를 cache 함수에 넘긴 검색 결과는 per-link prefetch에 포함될 수 있지만 uncached read는 fallback으로 남는다. private cache도 runtime request API를 직접 읽고 browser prefetch에 결과를 둘 수 있다. static-only response는 static cache/CDN에서, cookies/header 같은 non-static read가 있으면 fresh server render에서 준비한다. 후자는 CPU와 invocation 비용이 발생한다.

일반 use cache도 session 값을 인자로 받아 만든 결과를 prefetch할 수 있다. serverless에서 server memory hit가 낮아도 browser stale window 안의 이동에는 도움이 된다. 반대로 모두 unique한 query를 remote-cache하면 miss와 저장 비용이 커진다.

## 설정 타입과 도입 범위

```ts
type Prefetch = 'auto' | 'partial' | 'force-disabled'
export const prefetch: Prefetch = 'partial'
```

16.x에서 Cache Components용 export가 도입됐다. force-disabled는 드물게 방문하는 인증 화면처럼 미리 가져오는 비용이 큰 목적지에 둘 수 있으나 authorization을 대신하지 않는다. static cache/CDN으로 처리할 수 없는 cookie/header 기반 per-link prefetch는 매 prefetch마다 fresh server CPU를 소비한다. instant navigation의 validation은 [[NextJS-App-Instant-Validation]]과 연결한다.

## 이해 확인

1. prefetch partial export를 Link 자체와 목적지 page 중 어디에 두는가?
2. force-disabled가 route metadata와 상위 per-link response까지 모두 차단하는가?
3. 1,000개의 검색 링크를 true prefetch하면 server invocation 비용이 어떻게 달라지는가?

## 출처

- [Next.js, prefetch](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/prefetch)

## 관련 문서

- [[NextJS-App-Client-Navigation]]
- [[NextJS-App-Cache-Variants]]
- [[NextJS-App-Instant-Validation]]
