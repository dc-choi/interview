---
tags: [nextjs, app-router, rendering]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["loading과 Suspense 스트리밍의 HTTP 계약"]
---

# loading과 Suspense 스트리밍의 HTTP 계약

## fallback 위치가 기다림의 범위다

서버 데이터 작업이 전부 끝날 때까지 기다리지 않고 ready chunk를 전송한다. route loading.tsx는 layout 안에서 page/child subtree를 Suspense로 감싼다. loading은 props를 받지 않으며 기본 Server Component지만 client로 지정할 수도 있다.

```tsx
import { Suspense } from 'react'
export default function Page() {
  return <><h1>Dashboard</h1>
    <Suspense fallback={<p>피드 준비 중</p>}><PostFeed /></Suspense>
    <Suspense fallback={<p>날씨 준비 중</p>}><Weather /></Suspense>
  </>
}
```

loading은 같은 segment layout/template/error를 감싸지 않는다. layout의 uncached read에는 가까운 별도 Suspense를 둔다. 경계 밖에서 먼저 await한 데이터는 그 아래 fallback을 막는다. Cache Components는 잘못된 blocking read를 validation으로 드러낸다.

fallback은 spinner만 필요하지 않다. skeleton/title/cover 등 실제 UI와 공간을 공유하는 의미 있는 상태를 만든다. navigation은 interruptible하고 shared layout은 interactive하다. 다만 prefetch가 끝나지 않았으면 fallback도 늦게 도착할 수 있다.

## HTTP status와 오류

streaming이 시작되면 headers/status는 이미 전송되어 뒤늦은 notFound/forbidden/redirect가 HTTP status를 바꿀 수 없다. streamed page는 200을 유지하면서 오류 UI 또는 client redirect signal을 보내며 notFound 등은 noindex를 포함한다. non-streamed notFound는 404다.

리소스 확인을 await하며 Suspense fallback이 먼저 나갔다면 status가 고정된다. 실제 404/401/403이 요구되면 body 전송 전에 빠른 existence/auth check를 하고 필요한 response를 만든다. Cache Components의 dynamic UI는 shell을 먼저 보내므로 Proxy에서 빠른 사전 판정을 할 수 있지만 DAL/Action 권한 검증을 대신하지 않는다.

streamed soft404의 noindex와 로그/분석의 실제 status는 별개다. HTTP status만 보고 missing resource를 성공으로 집계하지 않도록 기록한다.

## crawler와 browser

HTML-limited bot은 metadata를 head에서 읽어야 해 metadata 완료까지 기다리는 path가 있다. Cache Components의 bot/crawler rendering은 완성 문서를 request time에 생성할 수 있어 browser static shell과 데이터 접근 시점이 달라진다. build에서만 존재하는 자원을 shell이 참조하면 browser에서는 보이지만 crawler request에서 실패할 수 있다.

일부 browser는 1,024 bytes보다 작은 응답을 buffer하여 작은 데모에서 streaming이 눈에 안 보인다. 작은 예제 하나의 체감으로 streaming이 작동하지 않는다고 결론 내리지 않는다. CDN/reverse proxy buffering과 배포 adapter도 확인한다. static export는 서버 streaming을 지원하지 않는다.

## 로딩 확인과 배포 지원

feed/loading.tsx의 가벼운 p 또는 dashboard의 LoadingSkeleton은 segment content가 준비되면 자동 교체된다. React DevTools로 Suspense 상태를 직접 전환해 skeleton을 확인한다. 별도 PostFeed/Weather 경계는 두 결과를 각각 준비되는 순서로 스트리밍한다. React의 selective hydration은 사용자 상호작용에 따라 먼저 interactive하게 만들 컴포넌트를 우선한다.

Cache Components를 쓰지 않는 layout의 runtime/uncached 읽기는 완료까지 navigation을 막는다. 사용하는 경우 같은 읽기를 명시적인 Suspense로 감싸지 않으면 build validation 오류가 난다. 읽기를 page로 옮기거나 layout 내부에 독립 경계를 두는 두 대안을 적용한다.

Twitterbot처럼 JS를 실행하지 않는 crawler는 generateMetadata를 기다려 initial head를 받는다. 다른 user agent에는 metadata streaming을 사용할 수 있으며 UA를 자동 판별한다. server-rendered stream의 SEO는 Google Rich Results Test의 직렬화HTML에서도 확인한다. body streaming은 fallback을 렌더하거나 Suspense 아래 Server Component가 suspend할 때 시작한다. 실제404는 해당 경계와 suspend할 수 있는 await 전에 확인해야 한다. Proxy에서는 full content 대신 빠른 slug 존재 검사나404 response를 사용한다.

| 배포 | 서버 streaming |
| --- | --- |
| Node.js server | 지원 |
| Docker | 지원 |
| Static export | 미지원 |
| Adapter | 플랫폼별 확인 |

loading 파일은13.0에 도입됐다.

## 이해 확인

1. Suspense 안의 404가 HTTP 200으로 기록되는 이유와 noindex의 역할은?
2. layout의 cookie await에 page loading이 반응하지 않는 이유는?
3. devtools에서 fallback을 강제로 보고 실제 production 느린 네트워크에서도 비교해야 하는 이유는?

## 출처

- [Next.js, loading](https://nextjs.org/docs/app/api-reference/file-conventions/loading)

## 관련 문서

- [[React-Suspense-and-Lazy]]
- [[React-DOM-Streaming-SSR]]
- [[NextJS-App-Errors]]
