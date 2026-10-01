---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Google 태그와 embed 통합", "NextJS Third Party Integrations"]
---

# Google 태그와 embed 통합

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 통합 helper의 책임

`@next/third-parties`는 많이 쓰는 third-party 서비스의 component/helper를 제공한다. 현재 experimental이며 API/버전 호환성을 확인한다. 공식 설치 예시는 next와 package를 latest로 맞추지만 기존 앱을 무조건 업그레이드하는 운영 지시로 해석하지 않는다.

지원 Google 통합은 `@next/third-parties/google`에서 import한다. 성능을 돕는 wrapper여도 외부 스크립트의 처리 시간, 개인정보 동의, 네트워크 요청, 서비스 설정을 대신 관리하지는 않는다.

## GTM과 GA의 계측 경계

GoogleTagManager는 hydration 후 기본 script를 가져온다. root layout이면 전체 경로, page이면 단일 경로다. gtmId는 보통 GTM- prefix이며 custom gtmScriptUrl이 있으면 ID를 생략할 수 있다.

| GTM 옵션 | 의미 |
| --- | --- |
| gtmScriptUrl | tagging server 또는 기본 Google script URL |
| dataLayer | 초기 container data |
| dataLayerName | 기본dataLayer |
| auth, preview | 환경 snippet 인증/preview parameter |

`sendGTMEvent({event:'buttonClicked', value:'example'})`처럼 dataLayer event를 보낸다. 부모 layout/page/component 또는 같은 파일에 GoogleTagManager가 포함되어야 한다. 값에는 실제 제품 event schema를 사용한다.

GoogleAnalytics는 gaId(G- prefix)로 GA4 Google tag를 hydration 후 로드한다. GTM이 이미 있으면 GTM 안에서 GA를 구성해 중복 초기화를 피한다. GA options는 dataLayerName, debugMode, nonce를 포함한다.

~~~tsx
'use client'
import { sendGAEvent } from '@next/third-parties/google'
export default function EventButton() {
  return <button onClick={() =>
    sendGAEvent('event', 'checkout_started', { source: 'cart' })
  }>결제 시작</button>
}
~~~

GoogleAnalytics가 상위에 포함되어 있어야 helper가 작동한다. 자동 pageview는 browser history 변경을 추적한다. GA Enhanced Measurement의 history event 기반 page change 옵션이 켜져 있는지 확인한다. 직접 pageview를 보내면 기본 measurement를 꺼 중복 집계를 막는다.

태그 로딩 시점과 사용자 동의 시점은 별개다. consent가 필요한 정책에서는 로드/전송을 실제 동의 흐름에 연결한다. 테스트에서 route transition마다 count가 하나인지 네트워크/event debugger로 확인한다.

## Maps와 YouTube embed

GoogleMapsEmbed는 iframe을 쓰고 기본 loading lazy다. apiKey와 mode가 필수며 q는 mode에 따라 필요하다. center/zoom/maptype/language/region으로 초기 위치와 언어/경계를 정한다. height/width 기본auto이므로 실제 layout에 치수 또는 aspect-ratio를 지정해 CLS를 막는다.

~~~tsx
import { GoogleMapsEmbed, YouTubeEmbed } from '@next/third-parties/google'
export default function Embeds() {
  return <>
    <GoogleMapsEmbed apiKey="PUBLIC_RESTRICTED_KEY" mode="place"
      q="Seoul" width="100%" height={300} />
    <YouTubeEmbed videoid="VIDEO_ID" height={400}
      playlabel="소개 영상 재생" params="controls=1" />
  </>
}
~~~

embed API key는 브라우저에 전달되므로 secret으로 취급하는 서버 token과 다르다. provider의 referrer/API 제한을 별도로 설정한다. Maps의 style/allowfullscreen/loading도 조절할 수 있고 fold 위면 lazy가 적절한지 확인한다.

YouTubeEmbed는 lite-youtube-embed로 초기 무거운 player 비용을 줄인다. videoid 필수, width/height/style, 접근성 playlabel, player query 문자열 params를 제공한다. 사용자 재생 후 외부 player/네트워크 비용은 남는다.

## 모든 옵션과 Router별 배치 예제

```bash
npm install @next/third-parties@latest next@latest
```

공식 설치 절은 실험적 개발 중인 package에 latest 또는 canary를 사용하도록 안내한다. package manager만 다른 명령은 같은 dependency 설치이며, canary는 preview 버전이다.

| GTM prop | 필수 여부/기본값 |
| --- | --- |
| gtmId | 필수, gtmScriptUrl을 제공하는 Google tag gateway 구성은 생략 가능 |
| gtmScriptUrl | 선택, https://www.googletagmanager.com/gtm.js |
| dataLayer | 선택, container의 초기 data layer 객체 |
| dataLayerName | 선택, dataLayer |
| auth | 선택, 환경 snippet의 gtm_auth |
| preview | 선택, 환경 snippet의 gtm_preview |

| GA prop | 필수 여부/기본값 |
| --- | --- |
| gaId | 필수, G- measurement ID |
| dataLayerName | 선택, dataLayer |
| debugMode | 선택, GA debug mode |
| nonce | 선택, 응답 CSP nonce |

| Maps prop | 필수 여부/기본값 |
| --- | --- |
| apiKey, mode | 필수, 허용된 API key와 map mode |
| height, width | 선택, auto |
| style, allowfullscreen | 선택, iframe 스타일/전체 화면 허용 |
| loading | 선택, lazy |
| q | 선택, mode에 따라 필수인 marker 위치 |
| center, zoom, maptype | 선택, 초기 중심/확대/지도 tile 종류 |
| language, region | 선택, UI/지도 label 언어와 경계/label 기준 지역 |

| YouTube prop | 필수 여부/기본값 |
| --- | --- |
| videoid | 필수, video ID |
| width, height | 선택, auto |
| playlabel | 선택, 시각적으로 숨겨진 접근성 재생 label |
| params | 선택, `controls=0&start=10&end=30` 같은 player query 문자열 |
| style | 선택, container style |

```tsx
// Pages 전체 경로: pages/_app.tsx
import type { AppProps } from 'next/app'
import { GoogleTagManager } from '@next/third-parties/google'
export default function MyApp({ Component, pageProps }: AppProps) {
  return <><Component {...pageProps} /><GoogleTagManager gtmId="GTM-XYZ" /></>
}
```

App 전체 경로는 root layout의 html/body 내부에 GoogleTagManager를 둔다. GoogleAnalytics를 선택했다면 같은 위치에 `gaId="G-XYZ"`로 대체한다. 특정 page에서만 사용하려면 해당 page가 그 component를 반환하도록 둔다. GTM과 GA를 함께 붙이는 코드로 대체하지 않는다.

```tsx
'use client'
import { sendGTMEvent } from '@next/third-parties/google'
export function GTMButton() {
  return <button onClick={() => sendGTMEvent({ event: 'buttonClicked', value: 'xyz' })}>
    이벤트 전송
  </button>
}
```

App 이벤트 버튼에 use client가 필요하며 Pages는 해당 지시문 없이 같은 helper를 사용할 수 있다. Maps place 예의 `q="Brooklyn+Bridge,New+York,NY"`는 marker query 형식이며 YouTube `params="controls=0"`는 player control 숨김 예다. 제품 위치/영상에 맞게 값을 바꾼다.

## 학습 확인

- GTM 안의 GA와 직접 GA component를 동시에 둘 때 중복을 탐지한다.
- 자동 pageview와 수동 전송을 한 제품 기준으로 선택한다.
- iframe lazy loading과 예약 layout 치수의 책임을 나눈다.

## 출처

- [Next.js, third-party-libraries](https://nextjs.org/docs/app/guides/third-party-libraries)

## 관련 문서

- [[NextJS-Scripts-and-Third-Party]]
- [[NextJS-Videos]]
- [[NextJS-Pages-Observability]]
