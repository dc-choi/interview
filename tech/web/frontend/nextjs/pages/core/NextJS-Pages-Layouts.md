---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 App, Document와 레이아웃", "NextJS Pages Layouts"]
---

# Pages Router의 App, Document와 레이아웃

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## App은 React 트리를 유지한다

`pages/_app.tsx`는 `{ Component, pageProps }`를 받는다. `Component`는 현재 페이지이고 `pageProps`는 데이터 함수의 초기 결과다. 페이지에 props를 전달하지 않으면 서버 데이터가 사라진다. `_app`에 새 파일을 처음 추가했다면 개발 서버를 재시작한다.

```tsx
import type { AppProps } from 'next/app'
import Layout from '../components/layout'

export default function App({ Component, pageProps }: AppProps) {
  return <Layout><Component {...pageProps} /></Layout>
}
```

같은 위치의 Layout이 유지되면 입력값 같은 상태도 유지된다. 페이지마다 다르게 구성하려면 `Page.getLayout(page)`를 정의하고 App에서 호출한다. 여러 레이아웃을 중첩할 수도 있다.

```tsx
import type { ReactElement, ReactNode } from 'react'
import type { NextPage } from 'next'
import type { AppProps } from 'next/app'

type PageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode
}
type Props = AppProps & { Component: PageWithLayout }

export default function App({ Component, pageProps }: Props) {
  const getLayout = Component.getLayout ?? ((page) => page)
  return getLayout(<Component {...pageProps} />)
}
```

일반 Layout 컴포넌트와 `_app`에는 `getStaticProps`/`getServerSideProps`를 export할 수 없다. 필요한 공통 데이터는 페이지 props를 구성하거나 Layout에서 SWR/Effect로 가져온다. `_app.getInitialProps`는 `getStaticProps`가 없는 페이지의 자동 정적 최적화를 해제한다. 기존 코드를 이해할 때만 다루며 신규 공통 데이터 처리의 기본값으로 삼지 않는다.

## Document는 HTML 외곽 구조다

`pages/_document.tsx`는 서버에서만 렌더링된다. 이벤트 핸들러와 상호작용하는 공통 UI를 두지 않는다. `<Main />` 밖 React 컴포넌트는 브라우저에서 초기화되지 않는다.

```tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ko">
      <Head />
      <body><Main /><NextScript /></body>
    </Html>
  )
}
```

네 구성요소는 필요하다. Document의 Head는 모든 페이지 공통 head 코드용이고 `next/head`와 다른 API다. 페이지 title, meta는 `next/head`에 둔다. `_document`도 페이지 데이터 함수를 지원하지 않는다.

CSS-in-JS SSR 때문에 `ctx.renderPage`를 감쌀 때는 `enhanceApp`/`enhanceComponent`로 렌더링을 확장한 뒤 `Document.getInitialProps(ctx)`를 호출한다. built-in styled-jsx에는 이 과정이 필요 없다. Document의 `getInitialProps`는 클라이언트 이동에서 호출되지 않는다. 정적 생성 시 `ctx.req`가 없을 수 있으므로 SSR이라고 가정하지 않는다.

## 페이지 head의 수명

```tsx
import Head from 'next/head'

export default function Page() {
  return <Head>
    <title>상품 목록</title>
    <meta property="og:title" content="상품 목록" key="og-title" />
  </Head>
}
```

같은 `key`의 meta는 뒤의 정의가 대체한다. title과 base는 자동 중복 제거 대상이다. Head가 unmount되면 내용이 제거되므로 각 페이지가 필요한 metadata를 완결되게 정의한다. 태그는 직접 자식 또는 Fragment/배열 한 단계 안에 둔다. 깊게 감싸면 클라이언트 이동에서 인식되지 않을 수 있다.

`next/head`로 html/body 속성을 설정하면 `next-head-count is missing` 오류를 유발할 수 있다. Document에서 설정한다. script 로딩은 `next/script`로 관리한다.

## 페이지별 중첩 레이아웃과 legacy App 예제

페이지가 서로 다른 레이아웃을 원하면 페이지 자체에 `getLayout`을 지정한다. `_app`의 앞선 `Props` 타입과 연결할 페이지 타입을 export한다.

```tsx
// pages/_app.tsx에서 export
export type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode
}
```

```tsx
// pages/index.tsx
import type { NextPageWithLayout } from './_app'
import Layout from '../components/layout'
import NestedLayout from '../components/nested-layout'

const Page: NextPageWithLayout = () => <p>대시보드</p>
Page.getLayout = (page) => <Layout><NestedLayout>{page}</NestedLayout></Layout>
export default Page
```

레이아웃에서 `/api/navigation`을 SWR로 읽으면 `error`, 데이터 미도착, 정상 상태를 구분하고 성공 후 Navbar에 `data.links`를 전달한다. 외곽 트리가 유지돼도 fetch 실패 UI를 반환하며 레이아웃 전체를 제거하면 그 하위 상태는 잃을 수 있다.

기존 App의 `getInitialProps`를 유지할 때는 `App.getInitialProps(context)`의 결과를 spread해 `pageProps`를 보존한다.

```tsx
import App, { type AppContext } from 'next/app'
MyApp.getInitialProps = async (context: AppContext) => {
  const initial = await App.getInitialProps(context)
  return { ...initial, example: '공유 초기 데이터' }
}
```

`MyApp`은 `AppProps & { example: string }`을 받고 별도 UI에서 `example`을 표시한다. 페이지별 초기 props를 덮어쓰지 않는다. 이 코드는 기존 앱 유지 계약이며 새 데이터 구조에서는 페이지 함수 또는 App Router 점진 도입을 비교한다.

## Document 렌더 확장 예제

CSS-in-JS library가 SSR 추출을 요구할 때만 기존 render 함수를 보존해 확장한다. 다음 `enhanceApp`/`enhanceComponent`의 identity wrapper 자리에 해당 library wrapper가 들어간다.

```tsx
import Document, { type DocumentContext } from 'next/document'

class CustomDocument extends Document {
  static async getInitialProps(context: DocumentContext) {
    const original = context.renderPage
    context.renderPage = () => original({
      enhanceApp: (App) => App,
      enhanceComponent: (Component) => Component,
    })
    return Document.getInitialProps(context)
  }
}
export default CustomDocument
```

상속한 기본 `render()`를 그대로 사용할 수 있다. 직접 교체하면 Html, Head, Main, NextScript 네 구성요소를 유지한다. `context`는 페이지 getInitialProps context에 `renderPage`를 더한 구조다. 브라우저 이동에서 이 함수를 재실행해 theme나 data를 갱신하려고 하지 않는다.

## 학습 확인

- 상단 메뉴는 App에, `lang` 속성은 Document에 두는 이유를 설명한다.
- 공유 레이아웃 상태가 유지되는지 두 페이지를 왕복해 확인한다.
- 첫 진입과 클라이언트 이동 모두에서 title이 바뀌는지 확인한다.

## 출처

- [Next.js, pages-and-layouts](https://nextjs.org/docs/pages/building-your-application/routing/pages-and-layouts)
- [Next.js, custom-app](https://nextjs.org/docs/pages/building-your-application/routing/custom-app)
- [Next.js, custom-document](https://nextjs.org/docs/pages/building-your-application/routing/custom-document)
- [Next.js, head](https://nextjs.org/docs/pages/api-reference/components/head)

## 관련 문서

- [[NextJS-Pages-Foundation]]
- [[NextJS-Pages-Errors]]
