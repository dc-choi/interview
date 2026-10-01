---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 script 로딩과 외부 서비스", "NextJS Pages Scripts"]
---

# Pages Router의 script 로딩과 외부 서비스

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 스크립트 위치와 실행 시점

`next/script`는 third-party script의 로딩 시점을 관리한다. 모든 route에 필요하면 `_app`, 특정 페이지에 필요하면 해당 page에 둔다. Next.js는 client 이동 사이에서 같은 script가 반복 로드되지 않게 관리한다.

| strategy | Pages 위치와 시점 |
| --- | --- |
| `beforeInteractive` | `_document`, 초기 HTML에서 hydration 전에 로드, 중요 global script |
| `afterInteractive` 기본 | 일부 hydration 이후, analytics/tag manager |
| `lazyOnload` | browser idle, chat/social 같은 낮은 우선순위 |
| `worker` | experimental Partytown worker, Pages만 지원, 호환성 확인 |

beforeInteractive는 JSX 위치와 관계없이 head에 삽입되고 배치 순서대로 실행하며, 실행이 hydration을 block하는 계약은 아니다. 모든 external script를 가장 빠른 단계로 올리지 않는다. 이벤트와 DOM 필요 여부, LCP/INP 비용을 보고 결정한다.

```tsx
import Script from 'next/script'

<Script id="maps" src="https://maps.example.com/sdk.js"
  strategy="afterInteractive"
  onReady={() => initializeMap()}
  onError={() => reportMapLoadFailure()} />
```

`onLoad`는 처음 로드 이후 처리, `onReady`는 로드 이후 및 다시 mount될 때 재초기화, `onError`는 loading 실패를 처리한다. `onLoad`와 `onError`는 beforeInteractive에서 지원하지 않는다. 다시 mount되는 widget 초기화는 interactive 컴포넌트의 `onReady`로 구성한다. Pages callback에 App RSC용 use client 지시문이 필수인 것은 아니다.

inline script는 식별할 id가 필요하고 children 또는 dangerouslySetInnerHTML로 제공한다. 임의 사용자 문자열을 inline JS로 합치지 않는다. nonce 등 추가 script attribute는 underlying script에 전달된다.

## worker와 Partytown 경계

`experimental.nextScriptWorkers`를 켜고 Partytown dependency를 설치해야 한다. main thread 비용을 줄이지만 모든 DOM/외부 library가 호환되는 것은 아니다. analytics event 전달과 worker tradeoff를 확인한다.

custom config는 `_document`의 script에 `data-partytown-config`를 붙이고 `lib: '/_next/static/~partytown/'`를 유지한다. 별도 assetPrefix면 lib 경로에도 prefix를 포함한다. debug/forward 설정은 실제 필요한 library 이벤트에 맞춘다.

## third-party component의 적용 범위

`@next/third-parties`는 experimental library다. GoogleTagManager/GoogleAnalytics는 `_app` 또는 선택한 page에 넣는다. GTM과 GA를 동시에 중복 계측하지 않도록 기존 container 설정을 확인한다. sendGTMEvent/sendGAEvent는 관련 script가 적용된 뒤 client에서 호출한다.

GoogleMapsEmbed는 API key, 지도 mode/query와 width/height, language/region 같은 옵션으로 iframe을 만든다. YouTubeEmbed는 videoid와 player 크기/label/params를 구성해 초기 로딩을 줄인다. nonce/CSP와 외부 domain 허용, 개인정보 수집 정책은 실제 서비스 계약에 맞춰 확인한다. 공통 옵션과 예시는 [[NextJS-Scripts-and-Third-Party]]에 연결한다.

## Partytown 설치와 Document 설정

```bash
npm install @qwik.dev/partytown
```

```js
// next.config.js
module.exports = { experimental: { nextScriptWorkers: true } }
```

```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'
export default function Document() {
  return <Html><Head>
    <script data-partytown-config dangerouslySetInnerHTML={{ __html: 'window.partytown = ' + JSON.stringify({
      lib: '/_next/static/~partytown/', debug: true,
      forward: ['dataLayer.push'],
    }) + ';' }} />
  </Head><body><Main /><NextScript /></body></Html>
}
```

window.partytown에 설정 객체를 할당하는 JavaScript를 넣고, 객체 값은 JSON.stringify로 직렬화한다. 신뢰할 수 없는 입력을 넣지 않는다. forward는 main thread의 함수 호출을 worker로 전달할 API 경로이고 실제 SDK가 dataLayer.push를 쓰는 경우의 예다. debug는 조사 중에만 켜고 배포 목적에 맞춰 끈다. lib는 Next가 배치한 runtime 파일의 위치다. CDN assetPrefix를 쓰면 해당 prefix를 붙인다.

```tsx
import Script from 'next/script'
export default function AnalyticsPage() {
  return <Script src="https://analytics.example.com/sdk.js" strategy="worker" />
}
```

worker는 실험적이며 App Router에서 동작하지 않는다. callback, inline의 두 문법, prop 전체와 지도 SDK의 mount별 초기화는 [[NextJS-Scripts-and-Third-Party#prop 계약과 실제 지도 초기화]]를 따른다.

## 학습 확인

- 페이지 왕복에서 script가 중복 다운로드되거나 widget이 중복 생성되지 않는지 확인한다.
- widget 재mount에는 onLoad/onReady 중 어떤 callback이 필요한지 설명한다.
- worker 변경 후 analytics event가 실제 전달되는지 확인한다.

## 출처

- [Next.js, scripts](https://nextjs.org/docs/pages/guides/scripts)
- [Next.js, third-party-libraries](https://nextjs.org/docs/pages/guides/third-party-libraries)
- [Next.js, script](https://nextjs.org/docs/pages/api-reference/components/script)

- [Partytown, Forwarding Events and Triggers](https://partytown.qwik.dev/forwarding-events/)

## 관련 문서

- [[NextJS-Scripts-and-Third-Party]]
- [[NextJS-Pages-Security-Forms]]
- [[NextJS-Pages-Observability]]
