---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Script의 로딩 순서와 실행 수명", "NextJS Scripts and Third Party"]
---

# Script의 로딩 순서와 실행 수명

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 범위와 실행 수명

next/script는 외부/inline JavaScript를 언제 가져오고 실행할지 관리한다. 특정 page 또는 layout에 두면 그 경로 그룹에서 로드하고 root layout에 두면 전체 경로에서 로드한다. 같은 script는 공유 layout을 오가는 client navigation에서도 한 번 로드되도록 관리한다.

전역 배치가 필요한 script인지 먼저 판단한다. analytics/채팅/widget을 전 페이지에 두면 불필요한 다운로드와 main thread 실행이 늘어난다. 문서 load, component mount, 경로 변경을 별도 수명으로 구분한다.

## strategy 선택

| strategy | 시점과 제약 |
| --- | --- |
| beforeInteractive | 초기 서버 HTML에 포함, Next 모듈보다 먼저 fetch, 배치 순서 실행 |
| afterInteractive(기본) | 일부 hydration 이후 client에서 로드 |
| lazyOnload | 페이지 자원 로드 후 browser idle |
| worker | 실험적 worker/Partytown, App Router 미지원 |

beforeInteractive는 App root layout에 두고 head에 주입된다. bot detection/consent bootstrap 등 초기 필수 script에 제한한다. preloaded/fetched early이지만 실행이 hydration을 차단한다는 계약은 아니다. 문서 load마다 한 번 실행하며 /en에서 /fi처럼 root param만 바뀐 client navigation도 다시 실행하지 않는다.

afterInteractive는 analytics/tag manager처럼 일찍 필요하되 초기 Next 실행을 앞설 필요가 없는 script다. lazyOnload는 chat/social widget 같은 낮은 우선순위다. 자동 consent/보안 검증을 해 주는 기능은 아니다.

~~~tsx
import Script from 'next/script'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body>{children}
    <Script src="https://widgets.example.com/chat.js" strategy="lazyOnload" />
  </body></html>
}
~~~

worker는 experimental.nextScriptWorkers와 Partytown 설정이 필요하고 현재 pages/에서만 가능하다. third-party의 DOM/동기 API 가정 때문에 호환성과 bridge 비용을 확인한다. App Router에서 지원된다고 기록하지 않는다.

## callback과 재초기화

onLoad는 최초 로드 후 작업, onReady는 최초 로드 후와 컴포넌트 remount마다 작업, onError는 로드 실패 처리다. 모두 Client Component에 둔다. onLoad/onError는 beforeInteractive에 사용할 수 없으며 재mount UI는 onReady를 검토한다.

~~~tsx
'use client'
import { useRef } from 'react'
import Script from 'next/script'
export default function Widget() {
  const container = useRef<HTMLDivElement>(null)
  return <>
    <div ref={container} />
    <Script id="widget" src="https://widgets.example.com/sdk.js"
      onReady={() => { /* SDK로 container.current에 UI 초기화 */ }}
      onError={() => { /* 대체 UI 또는 재시도 안내 */ }} />
  </>
}
~~~

SDK resource는 한 번 로드해도 UI container는 remount 때 새로 생긴다. onReady에서는 중복 초기화/cleanup을 SDK 계약에 맞게 처리한다. script error와 SDK 내부 runtime error는 같지 않으므로 onError가 모든 SDK 실패를 포착한다고 가정하지 않는다.

## inline과 추가 속성

inline에는 id가 필수다. children 문자열 또는 dangerouslySetInnerHTML을 사용한다. 추적용 id가 sanitizer가 되는 것은 아니므로 외부 입력을 실행 코드에 직접 섞지 않는다.

~~~tsx
<Script id="init-banner">
  {"document.getElementById('banner')?.classList.remove('hidden')"}
</Script>
~~~

nonce와 data-* 속성은 최종 script에 전달된다. nonce는 응답 CSP와 일치하는 값이어야 하며 고정 예시 문자열을 운영 정책으로 쓰지 않는다. JSON-LD는 실행 script가 아니라 데이터이므로 native script를 사용한다.

11에서 Script 도입,12.2.4 onReady 추가,13부터 App의 before/afterInteractive 지원이다. Pages beforeInteractive 위치는 _document이며 App root layout과 다르다.

## prop 계약과 실제 지도 초기화

| prop | 타입과 요구 사항 |
| --- | --- |
| src | string, 외부 URL 또는 내부 경로. inline을 제외하면 필수 |
| strategy | beforeInteractive/afterInteractive/lazyOnload/worker, 기본 afterInteractive |
| onLoad | 로드 완료 callback, beforeInteractive 미지원 |
| onReady | 최초 로드 완료와 이후 mount callback |
| onError | 로드 오류 callback, beforeInteractive 미지원 |

App Router callback은 Client Component에 둔다. Pages에는 Server Component 경계가 없어 callback 때문에 use client가 필요하지 않다.

```tsx
'use client'
import { useRef } from 'react'
import Script from 'next/script'
declare global {
  interface Window {
    google: { maps: { Map: new (
      element: HTMLElement,
      options: { center: { lat: number; lng: number }; zoom: number },
    ) => unknown } }
  }
}
export default function MapWidget() {
  const map = useRef<HTMLDivElement>(null)
  return <>
    <div ref={map} style={{ height: 400 }} />
    <Script id="google-maps" src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY"
      onReady={() => {
        if (map.current) new window.google.maps.Map(map.current, {
          center: { lat: -34.397, lng: 150.644 }, zoom: 8,
        })
      }} onError={(error) => console.error('지도 SDK 로드 실패', error)} />
  </>
}
```

YOUR_KEY에는 허용 referrer와 API 범위를 제한한 실제 key를 넣는다. onLoad에서 SDK 함수를 호출하는 경우에도 script 제공자의 전역 API가 준비됐는지 확인한다. 예를 들어 배열에서 값을 뽑는 library가 로드된 다음 `sample([1, 2, 3, 4])`를 호출할 수 있다. onReady는 다운로드 완료만 기다리는 코드와 mount별 DOM 초기화를 구분한다.

```tsx
<Script id="init-banner-html" dangerouslySetInnerHTML={{
  __html: "document.getElementById('banner')?.classList.remove('hidden')",
}} />
<Script src="https://widgets.example.com/sdk.js" nonce={nonce} data-widget="chat" />
```

nonce는 서버 응답별 값이며 이 예제에서는 props로 전달받는다. 12.2.2부터 Pages _document에 beforeInteractive 배치가 허용되었고, 12.2.4에서 onReady, 13에서 App Router before/afterInteractive 지원이 추가됐다.

## 학습 확인

- SDK 다운로드1회와 UI mount별 초기화의 차이를 설명한다.
- beforeInteractive가 hydration을 막는다는 주장을 검토한다.
- Script strategy로 third-party 비용이 사라지는지 실제 main thread 기록을 확인한다.

## 출처

- [Next.js, script](https://nextjs.org/docs/app/api-reference/components/script)
- [Next.js, scripts](https://nextjs.org/docs/app/guides/scripts)

## 관련 문서

- [[NextJS-Third-Party-Integrations]]
- [[NextJS-Content-Security-Policy]]
- [[NextJS-Pages-Scripts]]
- [[NextJS-Structured-Data]]
