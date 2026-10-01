---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router 9~13 업그레이드의 구체적 변경"]
---

# Pages Router 9~13 업그레이드의 구체적 변경

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 각 major 설치와 타입 정렬

아래는 해당 과거 major로 이동하는 명령이다. `latest`는 실행 시점 최신 버전이므로 역사 재현에는 위의 최소 React와 호환 버전을 명시적으로 고정한다. TypeScript 사용 시 `@types/react`, `@types/react-dom`도 React major에 맞춘다. npm, yarn, pnpm, bun 변형은 같은 의존성을 설치한다.

```bash
npm i next@9
npm i next@10
npm i next@11 react@17 react-dom@17
npm i next@12 react@17 react-dom@17 eslint-config-next@12
npm i next@13 react@18.2 react-dom@18.2 eslint-config-next@13
```

v10 원문은 v9에서 v10 사이 breaking change가 없었다고 명시한다. 이 진술은 그 버전 전환에 한정한다.

## v9의 TypeScript, App와 page config

내장 TypeScript가 `@zeit/next-typescript`를 무시하고 제거 경고를 낸다. `next.config.js`의 plugin과 fork-ts-checker-webpack-plugin, `.babelrc`의 `@zeit/next-typescript/babel`, 충돌하는 `@types/next`를 제거한다. 타입 변경은 다음과 같다. 당시 커뮤니티 목록이므로 모든 타입 차이의 완전한 목록은 아니다.

```tsx
// 이전
import { NextContext } from 'next'
import { NextAppContext, DefaultAppIProps } from 'next/app'
import { NextDocumentContext, DefaultDocumentIProps } from 'next/document'
// 이후
import { NextPageContext } from 'next'
import { AppContext, AppInitialProps } from 'next/app'
import { DocumentContext, DocumentInitialProps } from 'next/document'
```

`_app.getInitialProps`가 단지 page의 함수를 호출하고 `{pageProps}`만 반환한다면 기본 App 동작과 같다. 아래 override를 삭제할 수 있다. 자체 데이터 작업이 있으면 삭제할 수 있는지 별도로 판단한다. 제거는 automatic static optimization을 회복하는 조건이다.

```jsx
class MyApp extends App {
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {}
    if (Component.getInitialProps) pageProps = await Component.getInitialProps(ctx)
    return { pageProps }
  }
}
```

page에서 `config` export는 AMP/API Route 등 Next 설정용으로 예약된다. 업무용 `export const config`를 다른 이름으로 바꾼다. `pages/api`는 API Route이며 client bundle을 만들지 않는다. export output은 `out/about/index.html`에서 `out/about.html`로 변경됐다. 당시 `trailingSlash: true`로 이전 디렉터리 출력을 선택할 수 있었다.

## v9 dynamic과 AMP 예제

dynamic component는 loading 중 기본으로 아무것도 표시하지 않는다. 이전 기본 `loading...`가 필요하면 직접 설정한다.

```tsx
import dynamic from 'next/dynamic'
const Hello1 = dynamic(() => import('../components/hello1'), {
  loading: () => <p>Loading</p>,
})
const Hello2 = dynamic(() => import('../components/hello2'))
export default function HelloBundle({ title }: { title: string }) {
  return <div><h1>{title}</h1><Hello1 /><Hello2 /></div>
}
```

이 코드는 이전 `dynamic({modules: () => ({Hello1: () => import(...), Hello2: () => import(...)}), render: (props, modules) => ...})`를 각각의 dynamic import와 보통 component 조합으로 바꾼다. `modules/render`는 React.lazy/Suspense에 가까워지기 위해 deprecated 되었고 v11에서 제거됐다.

`withAmp(Home)` 또는 `withAmp(Home, {hybrid: true})` HOC는 보통 `export default Home`과 `export const config = {amp: true}` 또는 `{amp: 'hybrid'}`로 이동했다. 원문의 archive 다운로드와 jscodeshift 명령은 한 줄에 합쳐져 실행 불가능하므로 복제하지 않는다. 역사적 변환 명령은 `npx @next/codemod withamp-to-config pages/`이고 diff를 검토한다. AMP는 v16에서 제거되었으므로 현재 앱에는 이 설정을 새로 도입하지 않는다.

## v11 Webpack, port와 정적 image

Webpack 5가 기본이며 custom Webpack 설정은 별도 migration 검토가 필요하다. build는 `.next` 등 `distDir`에서 cache를 제외한 이전 출력을 지운다. 이를 의존하던 과거 앱은 `cleanDistDir: false`로 opt-out할 수 있었다.

```js
// v11 next.config.js 예시
module.exports = {
  cleanDistDir: false,
  images: { disableStaticImages: true },
  excludeDefaultMomentLocales: false,
}
```

`disableStaticImages`는 next-images/next-optimized-images 등과 충돌하는 정적 import 처리를 끈다. 가능하면 내장 Image로 이동한다. `PORT=4000 next start`와 `PORT=4000 next dev`가 지원되지만 `next start -p 4000` 또는 `--port`를 권장했다.

Moment의 모든 locale은 bundle 감소를 위해 기본 제외됐다. 필요한 것만 다음처럼 포함한다. `excludeDefaultMomentLocales: false`는 모든 locale을 유지하여 크기 절감 효과를 잃는다.

```js
import moment from 'moment'
import 'moment/locale/ja'
moment.locale('ja')
```

## v11 제거 계약과 router event

| 제거 항목 | 전환과 이전 이력 |
| --- | --- |
| `super.componentDidCatch()` | next/app의 구현은 v9부터 no-op, override에서 super 호출 제거 |
| next/app `Container` | v9부터 개발 경고가 있는 no-op, import와 wrapper 제거 |
| page `props.url` | v4부터 경고, Static/ServerSideProps가 이미 금지, router API 사용 |
| Image `unsized` | 10.0.1부터 deprecated, 당시 `layout="fill"`; 현재는 `fill` |
| dynamic `modules/render` | 9.5부터 deprecated, component별 import |
| `Head.rewind` | 9.5부터 no-op, 호출 삭제 |

prerender 중 `router.events`는 제공되지 않는다. 공개 API를 Effect 안에서 구독하고 같은 handler를 해제한다. 내부 `router.router.events`를 사용하지 않는다.

```tsx
const router = useRouter()
useEffect(() => {
  const handleRouteChange = (url: string, { shallow }: { shallow: boolean }) => {
    console.log(`Changing to ${url}, shallow=${shallow}`)
  }
  router.events.on('routeChangeStart', handleRouteChange)
  return () => router.events.off('routeChangeStart', handleRouteChange)
}, [router])
```

v11의 최소 React는 17.0.2다. 새 JSX transform은 JSX만 사용할 때 React import를 생략할 수 있게 하지만 `React` 변수를 전역으로 만들지 않는다. `React.useState` 등 사용은 명시 import하거나 add-missing-react-import codemod로 수정한다.

## v12 compiler와 image selector

최소 Node가 12.0.0에서 native ESM이 있는 12.22.0, React는 17.0.2로 바뀌었다. Rust SWC가 JS/TS compile, styled-jsx, 데이터 함수 tree-shaking을 담당한다. custom Babel config는 당시 SWC compile을 opt-out하고 v11의 Babel 경로로 돌아갔다. Styled Components/Emotion/Relay transform은 당시 향후 port 계획으로 제시되었으며 현재 지원 판정은 현재 compiler 문서를 따른다. 공식 안내의 최대 17배 파일 compile, 최대 5배 Fast Refresh는 당시 비교 수치로 모든 앱의 성능 보장이 아니다.

v12는 `swcMinify: true`로 Terser 대신 SWC minify를 opt-in했다. 최대 7배라는 당시 비교 수치와 default 전환 계획이 있었고 실제 v13 안내에서 true 기본을 확인한다. 이 과거 flag를 현재 설정에 추가하지 않는다. styled-jsx parser는 이전에 통과하던 잘못된 CSS를 dev와 build 모두에서 오류로 처리한다.

Image wrapper가 div에서 span으로 바뀌어 `.container span`은 Image wrapper까지 선택할 수 있다. `.container span.item`으로 범위를 좁히고 실제 span에 class를 준다. 이전 `.container div`는 더 이상 wrapper에 매칭되지 않으므로 직접 `<div className="wrapper"><Image ... /></div>`를 추가하고 `.container .wrapper`로 제어한다. Image `className`은 계속 img로 전달된다.

Webpack 4 opt-out 앱은 v12에서 지원 제거 오류를 받는다. `target: 'serverless'`는 deprecated되어 `next build`가 page별 dependency를 추적하는 output file tracing으로 이동한다. 12.2 이전 Middleware는 별도 [migration guide](https://nextjs.org/docs/messages/middleware-upgrade-guide)를 확인한다.

## v13 공유 기능의 전환

최소 Node16.14/React18.2, IE 지원 제거와 modern browser 대상, SWC minify true 기본, `target` 제거가 변경점이다. App 도입은 선택이고 Pages에서도 Image/Link/Script/font 개선을 사용할 수 있다.

```tsx
// v12
<Link href="/about"><a>About</a></Link>
// v13: Link가 anchor를 생성하고 HTML anchor props도 전달
<Link href="/about">About</Link>
```

new-link codemod로 anchor 중첩을 제거한다. v13 당시 `legacyBehavior`는 임시 호환 수단이었으므로 현재 API 지원으로 일반화하지 않는다. next/future/image가 next/image로 바뀌어 JS 감소, native lazy loading, 스타일과 접근성 개선이 기본이 됐다. next-image-to-legacy-image는 import만 변경해 v12 동작을 보존하고, next-image-experimental은 props 제거와 inline style을 바꾸지만 static usage만 처리한다. `<Image {...props}/>`는 수동 검토한다. next/script는 두 Router를 지원하고 next/font는 기존 CSS inline 최적화에 더해 loading, 성능, privacy를 제어하는 module이다.

## 출처

- [Next.js, version 9](https://nextjs.org/docs/pages/guides/upgrading/version-9)
- [Next.js, version 10](https://nextjs.org/docs/pages/guides/upgrading/version-10)
- [Next.js, version 11](https://nextjs.org/docs/pages/guides/upgrading/version-11)
- [Next.js, version 12](https://nextjs.org/docs/pages/guides/upgrading/version-12)
- [Next.js, version 13](https://nextjs.org/docs/pages/guides/upgrading/version-13)

## 관련 문서

- [[NextJS-Pages-Upgrades]]
- [[NextJS-Pages-Upgrade-12-HMR]]
- [[NextJS-Codemod-Examples]]
