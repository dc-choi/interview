---
tags: [nextjs, migration, upgrade]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["CRA와 Vite SPA를 Next로 옮기는 단계"]
---

# CRA와 Vite SPA를 Next로 옮기는 단계

## 먼저 SPA 동작을 보존한다

CRA/Vite 기본 React SPA는 browser가 bundle을 받은 뒤 render/effect로 data를 조회해 initial loading과 parent-child fetch waterfall이 생길 수 있다. Next는 route code splitting, server data/streaming과 Image/Font/Script 최적화를 제공한다. 그러나 단순 bundler 교체만으로 이런 효과가 모두 생기지는 않는다.

공식 두 guide는 기존 router를 바로 대체하지 않고 client-only App을 Next shell 안에 넣어 먼저 동작하게 한다. feature 전환을 뒤로 나누면 충돌과 failure cause를 줄일 수 있다. Vite 자체가 모든 경우 CSR만 지원한다는 일반론이 아니라 default React SPA setup을 대상으로 한 경로다.

## static export와 root document

CRA 예시는 output='export', distDir='build', Vite 예시는 output='export', distDir='dist'를 사용한다. static export에는 request-time SSR/API/Action/Proxy 같은 server runtime feature가 없다. 필요하면 output export를 제거하고 server hosting을 사용한다. static 산출물은 static server/CDN으로 제공하며 next start를 static export용 server라고 생각하지 않는다.

기존 index.html의 html/body를 src/app/layout.tsx로 옮기고 root mount script 대신 children을 넣는다. charset/기본 viewport는 Next 제공값이라 중복을 제거한다. favicon/icon/robots/manifest 등은 지원 convention과 metadata로 옮긴다. global CSS는 root layout/page에서 import한다. CRA의 `%PUBLIC_URL%` placeholder가 Next에서 그대로 확장된다고 가정하지 않는다.

## catch-all과 client-only entry

```tsx
// app/[[...slug]]/client.tsx
'use client'
import dynamic from 'next/dynamic'
const App = dynamic(() => import('../../App'), { ssr: false })
export function ClientOnly() { return <App /> }
```

```tsx
// app/[[...slug]]/page.tsx
import { ClientOnly } from './client'
export function generateStaticParams() { return [{ slug: [''] }] }
export default function Page() { return <ClientOnly /> }
```

optional catch-all은 client router가 route를 해석하도록 Next entry를 수용한다. use client만으로 SSR이 꺼지는 것은 아니다. ssr:false dynamic은 Client Component 안에서 선언하여 실제 browser-only App을 만든다. 이 단계에서는 server rendering의 SEO/initial data 장점을 아직 얻지 못한다.

공식 예시는 static root 하나를 생성한다. export 파일만으로 임의 deep URL의 HTML이 자동 존재한다는 뜻은 아니다. host의 SPA fallback/rewrite, direct load/deep link/back/forward를 확인한다. source의 static export에서 useParams 지원 제한 안내는 이 SPA migration mode와 현재 static-export API의 실제 지원 조건을 함께 확인한다.

## 이미지 import를 보존하기

CRA/Vite static image import는 string URL이지만 Next는 dimension/src를 가진 object다. 기존 img를 유지하면 src={image.src}로 옮긴다. public/logo.png는 '/logo.png' URL로 참조하거나 실제 relative file import를 쓴다. '/logo.png' import가 public 파일을 자동 module resolve한다고 가정하지 않는다.

Image로 바꾸면 intrinsic width/height와 optimizer 계약을 따른다. 한 dimension을 CSS로 바꿀 때 다른 dimension auto를 확인하여 왜곡을 피한다. export에서는 default server optimizer를 사용할 수 없으므로 custom loader/unoptimized 등 배포 지원에 맞춘다. next-env.d.ts include가 없으면 .src 타입이 맞지 않을 수 있다.

## 최소 변경 이후 개선

먼저 기존 routing/auth/API/loading/style/asset 동작을 재현한 뒤 route별 App filesystem routing, server fetch, Suspense, next/font/Image/Script를 채택한다. server data를 도입하려면 hosting 형태도 바뀔 수 있다. Proxy에서 auth flash를 줄이는 것과 backend의 최종 authorization은 별개다.

old entry/config/package는 baseline와 새 runtime/production direct-load가 확인된 뒤 제거한다. CRA의 public/index.html/src/index/react-app-env/reportWebVitals/react-scripts, Vite의 main/index.html/vite-env/tsconfig.node/vite.config/package dependencies는 각각 다른 ownership이다. 사용 중인 테스트/service worker/custom bundler 설정을 삭제와 함께 잃지 않게 분리한다.

## root document, config와 asset 실제 코드

```sh
npm install next@latest
```

```ts
// next.config.ts: CRA
import type { NextConfig } from 'next'
const config: NextConfig = { output: 'export', distDir: 'build' }
export default config
```

Vite는 next.config.mjs에 같은 객체를 export하고 distDir:'./dist'로 바꾼다. .js/.mjs config도 가능하다. 기존 React/ReactDOM과 Next 호환을 맞춘다. public/index.html(CRA) 또는 root index.html(Vite)을 JSX root layout으로 옮기는 중간 단계에서는 meta charSet/link/title/description을 head에 복사할 수 있다. Vite의 charset은 JSX charSet으로 고친다. CRA의 body noscript와 Vite의 body script mount를 children container로 바꾼다.

```tsx
// src/app/layout.tsx: 최종 단계
import type { Metadata } from 'next'
import '../index.css'
export const metadata: Metadata = {
  title: 'My App', description: 'Web site created with Next.js.',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div id="root">{children}</div></body></html>
}
```

Next가 charset/viewport를 제공하므로 중복 tags를 제거하고 favicon.ico/icon.png/robots.txt 등 지원 convention 파일을 app 최상위로 옮긴 뒤 해당 수동 link를 제거한다. 최종 title/description도 metadata로 옮긴다. CRA manifest/icon/tests는 자동 복제되지 않으므로 Metadata API와 test runner에 별도 연결한다. 기존 global index.css는 위 root layout 또는 Vite의 catch-all page에서 import하며 CSS Modules는 그대로 지원한다.

```tsx
// src/App.tsx: 기존 img 유지
import logo from '../public/logo.png'
export default function App() { return <img src={logo.src} alt="로고" /> }
```

기존 `/logo.png` absolute module import는 relative로 바꾸거나 `<img src="/logo.png">` URL을 사용한다. CRA/Vite의 string src는 Next object의 src field로 대체한다. `Image src={logo}`는 자동 intrinsic dimensions를 사용하며 width를 CSS로 바꾸면 height:auto도 맞춘다. static export에서 optimizer는 custom loader/unoptimized로 처리한다.

```json
{
  "scripts": {
    "dev": "next dev", "build": "next build",
    "start": "npx serve@latest ./build"
  }
}
```

CRA export start 형태다. Vite ./dist에는 `npx serve@latest ./dist`로 바꾼다. server mode만 next start다. ignore에는 .next/next-env.d.ts, Vite는 dist, CRA custom build 산출물을 추가한다. npm run dev 뒤 localhost3000에서 기존 SPA가 보이는지 확인하고 production deep-link는 static host SPA fallback을 별도로 확인한다.

순수 SPA 첫 단계는 bundle 실행 후 조회와 parent-child waterfall을 유지할 수 있다. 다음 adoption은 route별 code splitting/tree-shaking, CMS build-time SSG/CDN 또는 request-time SSR, Suspense loading 순서, Image/font/Script, Next ESLint 규칙이다. Proxy auth redirect/A-B testing/실험/i18n은 server mode에서 활용한다. streaming만으로 모든 layout shift가 사라지지는 않아 fallback 크기도 예약한다.

## 이해 확인

1. client-only wrapper로 옮긴 즉시 React Server Component data benefit을 얻는가?
2. optional catch-all root export가 모든 deep URL의 static HTML을 생성하는가?
3. use client와 dynamic ssr:false는 무엇이 다른가?

## 출처

- [Next.js, from-create-react-app](https://nextjs.org/docs/app/guides/migrating/from-create-react-app)
- [Next.js, from-vite](https://nextjs.org/docs/app/guides/migrating/from-vite)

## 관련 문서

- [[NextJS-SPA-Migration-Compatibility]]
- [[NextJS-App-Structure]]
- [[NextJS-App-Server-Client]]
- [[NextJS-App-Styling-Assets]]
- [[NextJS-App-Static-Params]]
