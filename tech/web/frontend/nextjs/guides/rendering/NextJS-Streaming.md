---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Streaming과 Suspense 배치"]
---

# Next.js Streaming과 Suspense 배치

## 응답이 도착하는 방식

Streaming은 느린 작업이 모두 끝나기 전에 준비된 응답 일부를 보내는 방식이다. 초기 방문에서는 shell HTML과 fallback을 보내고 준비된 경계의 HTML, 교체 지시와 RSC 데이터를 이어 보낼 수 있다. client navigation은 주로 RSC stream을 사용한다. HTTP/1.1 chunked encoding만을 전제로 하는 기능이 아니다.

Cache Components에서는 사전 생성한 shell와 요청 시점 영역을 조합한다. 이 기능을 끈 앱에서도 Suspense streaming은 사용할 수 있지만 사전 생성 범위와 동적 렌더링 판정은 다르다.

## 경계와 await의 위치

`loading.tsx`는 해당 segment의 page와 그 아래에 자동 Suspense 경계를 만든다. 같은 segment의 layout 자체가 먼저 await하는 작업까지 자동으로 분리하지는 않는다. 재사용되는 nav 안의 사용자 메뉴만 느리다면 사용자 메뉴를 별도 Server Component와 Suspense로 감싼다.

```tsx
import { Suspense } from 'react'

export default function Page() {
  return (
    <main>
      <h1>대시보드</h1>
      <Suspense fallback={<SummarySkeleton />}><Summary /></Suspense>
      <Suspense fallback={<ActivitySkeleton />}><Activity /></Suspense>
    </main>
  )
}
```

독립 경계는 각자 준비되는 대로 드러나고, 중첩 경계는 바깥 내용을 먼저 보여 준 뒤 안쪽 상세를 이어 보여 줄 수 있다. 독립 조회를 상위에서 순차 await하면 waterfall이 생긴다. Promise를 먼저 시작하고 소비 지점을 분리하는 방법도 있다. 요청 params나 cookies의 해석 역시 이를 필요로 하는 경계 안으로 내린다.

Cache Components에서 캐시되지 않은 요청 데이터가 적절한 경계 밖에서 렌더링을 막으면 빌드/개발 검증 오류가 날 수 있다. 모든 params가 언제나 동적이라는 뜻은 아니며 사전 생성한 params와 실제 접근 조건을 구분한다.

## 오류와 HTTP 상태

응답이 이미 시작되면 HTTP status와 headers를 바꿀 수 없다. 늦은 notFound는 UI와 noindex를 처리할 수 있지만 이미 전송한 200을 404로 바꾸지는 못한다. redirect도 stream 안의 클라이언트 이동으로 처리될 수 있다.

정확한 HTTP 상태가 필요하면 첫 응답이 commit되기 전에 존재/권한을 확인하거나 Proxy와 라우팅 설정으로 진입을 제어한다. 단순히 현재 컴포넌트의 첫 await 앞에 검사를 둔다고 상위 loading이 시작한 응답까지 되돌릴 수는 없다.

## 메타데이터와 봇

HTML-limited bot은 metadata가 head에 들어가도록 `generateMetadata` 완료를 기다리는 별도 처리 대상이다. DOM을 처리하는 방문자는 metadata도 stream으로 받을 수 있다. `htmlLimitedBots`를 바꾸면 검색과 공유 미리보기 결과를 확인한다.

Cache Components에서 HTML-limited bot은 사전 생성 shell를 그대로 쓰는 방문자와 다른 동적 렌더 경로를 탈 수 있다. shell를 만들 때만 존재한 데이터가 runtime에는 없어 봇 요청이 실패하는지 점검한다. 모든 bot 응답이 항상 단일 chunk라는 보장은 아니다. bot 종류, 렌더 모드와 metadata 처리 조건을 나누어 관찰한다.

## 실제 배포에서 streaming 확인

중간 reverse proxy/CDN이 응답 전체를 버퍼링하면 서버의 경계가 잘 나뉘어 있어도 화면은 늦게 한 번에 나타난다. Nginx buffering 설정, CDN 전달 방식, serverless response streaming 지원, compression flush를 확인한다. 정적 export에는 runtime streaming이 없다.

작은 응답은 브라우저 내부 buffering 때문에 한 번에 보일 수 있다. DevTools의 이른 TTFB와 긴 다운로드 구간만으로 의미 있는 화면 진전을 단정하지 않는다. 실제 chunk 도착 시각과 첫 화면, fallback 교체 시점을 함께 관찰한다. 압축 영향을 분리할 때는 `Accept-Encoding: identity`를 사용한다.

TTFB/FCP가 줄어도 LCP 요소를 느린 경계에 넣으면 LCP는 늦을 수 있다. skeleton 크기를 최종 UI와 맞춰 CLS를 줄이고, 클라이언트 JS와 hydration 비용은 별도로 줄인다. 데이터 preload는 작업을 시작하는 것이며 해당 UI를 먼저 paint한다는 뜻이 아니다.

## HTML, RSC와 shell의 구체적 역할

첫 load는 HTML stream과 component payload가 함께 작동한다. 서버는 layout/nav/fallback의 HTML을 먼저 보내며 경계가 준비되면 완성 HTML과 fallback DOM 교체 inline script, hydration용 RSC payload를 이어 보낸다. 교체 script는 전체 page JS와 hydration 완료를 기다리지 않고 준비된 HTML을 표시할 수 있다. 이후 client navigation은 rsc:1 request의 component payload를 가져와 tree를 갱신한다.

shell은 빨리 보여 줄 layout/nav/fallback이며 Cache Components에서는 build의 사전 생성 결과도 포함한다. async 작업이 있었다고 전부 shell 밖인 것은 아니다. 사전 생성 params와 use cache로 resolve되는 데이터도 shell에 들어갈 수 있다. edge 즉시 제공 여부는 호스트의 실제 CDN 구성에 따른다.

공식 demo는 loading.tsx의 약 2초 page skeleton, 형제 Suspense, 단일/분할 hydration, raw HTML Handler의 초기 CSS 발견, chunk 크기와 buffering 조절 endpoint를 비교한다. [streaming demo](https://streaming-demo.labs.vercel.dev/)와 [source](https://github.com/vercel-labs/streaming-demo)를 사용해 타이밍을 관찰할 수 있다.

## page, 형제와 중첩 경계의 예

loading.tsx는 animate-pulse와 제목/본문 너비별 회색 skeleton을 export한다. layout 안에서 page를 감싸는 fallback이므로 layout은 남고 page 준비 후 skeleton을 교체한다. 데이터 없이는 아무것도 의미 있게 표시할 수 없는 page에 적합하다.

형제 dashboard의 Revenue 200ms, RecentOrders 1초, Recommendations 3초가 각각 별도 Suspense이면 각자 준비된 순서로 표시된다. 위의 실제 h1은 shell에 둔다. 하나의 바깥 경계로 모두 묶어 가장 느린 recommendations를 기다리게 할 필요가 없다.

Product 예는 generateStaticParams가 인기 product id를 반환하고, outer가 ProductDetails, inner가 Reviews를 감싼다. outer의 detail 준비 뒤 inner review fallback이 드러나고 나중에 review만 바뀐다. nested boundary는 안쪽 값이 먼저 준비되어도 바깥이 열려야 사용자에게 드러난다.

| 조건 | loading.js | 직접 Suspense |
| --- | --- | --- |
| 범위 | segment page 전체 | 필요한 component |
| 설정 | 파일 추가 | 명시적으로 감싸기 |
| 이동 fallback | loading은 prefetch 가능 | 일반 fallback의 prefetch는 cache/prefetch 구성에 따름 |
| 적합한 화면 | 데이터 전에는 의미 있는 content 없음 | 대부분의 page에서 세부 영역 분리 |

Cache Components prerenderer는 dynamic 작업에서 가장 가까운 Suspense까지 올라간다. 경계가 없으면 blocking route 오류다. 높은 loading도 유효하지만 page 전체를 skeleton으로 만들 수 있어 실제 dynamic 접근 가까이에 경계를 둔다.

## Promise 전달과 소비

DashboardLayout은 cookies()를 시작만 하고 await하지 않은 cookiePromise를 Nav 안의 Suspense/UserMenu로 넘긴다. UserMenu만 await하면 Nav와 나머지 children의 작업을 불필요하게 막지 않는다. Shop의 generateStaticParams로 category를 제공하고 ProductGrid에 paramsPromise를 넘기면 Hero는 먼저 표시된다. 해당 경계 안의 params.then에서 category:string을 child로 넘겨도 같다.

```tsx
const statsPromise = getStats() // revenue:number, orders:number를 조회
return <Suspense fallback={<p>Loading chart...</p>}>
  <StatsChart dataPromise={statsPromise} />
</Suspense>
// client StatsChart: const stats = use(dataPromise)
```

서버에서 시작한 미해결 Promise는 여러 층을 통과할 수 있고 실제 use로 읽는 component를 Suspense로 감싼다. 같은 getUser Promise는 Client UserProvider의 context에 저장해 subtree 여러 consumer가 use로 읽을 수 있다. provider를 만들기 위해 서버 layout에서 먼저 await할 필요는 없다.

## streaming 오류와 정확한 status의 조건

늦게 실패하면 nearest error.js가 담당하는 subtree를 대체하고 나머지 경계는 유지할 수 있다. 단순 sibling component마다 error.js 경계가 자동 생기는 것은 아니므로 실제 segment 경계를 확인한다. 이미 200을 보낸 뒤 4xx/5xx로 바꿀 수 없으며 notFound는 noindex meta, redirect는 stream 내 client 이동을 사용할 수 있다.

원문의 PostPage는 params와 빠른 checkSlugExists를 await한 뒤 notFound를 호출하고 나중에 PostContent의 Suspense를 만든다. 이는 해당 경계가 시작하기 전 검사 예다. 원문 prose의 모든 await 앞이라는 설명과 예제의 await는 일치하지 않으며, 상위 loading이나 다른 경계가 먼저 commit했다면 이 배치만으로 404를 보장하지 못한다. Proxy 응답과 next.config redirects는 page render 전에 수행하는 진입 제어다.

HTML-limited bot은 metadata가 완료될 때까지 head를 기다리며 이후 content가 stream할 수도 있다. Cache Components에서는 사전 생성 shell 대신 runtime render하므로 build 환경 전용 데이터가 요청 환경에서도 접근 가능한지 확인한다. 관찰 demo의 Twitterbot 단일 burst를 모든 bot의 단일 chunk 보장으로 일반화하지 않는다.

## 성능 지표와 resource 발견

일반 SSR은 조회와 렌더가 끝난 후 첫 byte를 보내지만 streaming은 layout/fallback 준비 뒤 먼저 보낼 수 있어 TTFB/FCP를 줄인다. TTFB가 정확히 가장 느린 query 시간과 같은 것은 아니다. 네트워크, 직렬 조회, 계산과 렌더 시간도 포함된다.

LCP hero/photo/heading을 느린 경계 안에 두면 data와 HTML 전송, 교체 script 실행까지 기다린다. 큰 boundary와 바쁜 CPU/느린 network도 reveal을 늦출 수 있다. 불필요한 경계를 추가하지 않고 주요 heading을 shell에 둔다. next/image preload는 첫 head에서 이미지를 미리 가져오지만 경계 안 image의 paint를 앞당기는 보장은 아니다.

CLS는 fallback과 최종 grid/card의 dimension을 맞추고 fixed/min-height 공간을 예약해 줄인다. Suspense는 selective hydration의 단위여서 사용자 상호작용한 영역을 우선 hydrate하고 작업을 나눌 수 있다. 경계가 없다는 이유만으로 모든 React hydration이 항상 단일 blocking 작업인 것으로 단정하지 않는다.

첫 shell의 link/script는 CSS/JS/font를 서버의 나머지 작업 중에 발견하게 한다. dashboard의 h1은 LCP, 개별 data 경계는 hydration/INP, 같은 크기의 skeleton은 CLS에 대응한다. 세 지표는 각각 측정한다.

배포 계층과 raw chunk 확인, Web Streams Handler 예제는 [[NextJS-Streaming-Transport]]에서 다룬다.

## 출처

- [Next.js, streaming](https://nextjs.org/docs/app/guides/streaming)

## 관련 문서

- [[NextJS-Rendering-Strategy]]
- [[NextJS-Self-Hosting]]
