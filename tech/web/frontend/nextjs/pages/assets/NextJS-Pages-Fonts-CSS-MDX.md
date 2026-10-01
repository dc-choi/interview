---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 폰트, CSS와 MDX 구성", "NextJS Pages Fonts CSS MDX"]
---

# Pages Router의 폰트, CSS와 MDX 구성

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 폰트 적용 위치가 preload 범위다

`next/font/google`과 `next/font/local`은 font file을 자체 host하며 browser의 Google 요청을 없앤다. 함수는 module scope에서 호출하고 반환된 className/style/variable을 적용한다. `_app`에서 사용하면 Pages 전체, 특정 page에서는 그 route에 preload한다. App layout 계층과 같은 범위를 가정하지 않는다.

```tsx
import { Geist } from 'next/font/google'
const font = Geist({ subsets: ['latin'], variable: '--font-body' })

export default function App({ Component, pageProps }) {
  return <main className={font.className}><Component {...pageProps} /></main>
}
```

wrapper 없이 html에 적용하려면 App의 global styled-jsx에 `font.style.fontFamily`를 넣을 수 있다. local src는 import 파일 상대 경로 또는 여러 `{ path, weight, style }`의 배열이다. variable font는 weight 범위를 쓰고 static font는 weight를 지정한다. subsets/preload, display, fallback, adjustFontFallback과 axes의 공통 API는 [[NextJS-Font]]에 연결한다. 같은 폰트 함수 반복 호출 대신 한 정의를 공유한다.

## CSS import 위치와 cascade

global CSS와 global node_modules stylesheet는 `_app`에서 import한다. `.module.css`는 component-local class를 만들고 어디서든 컴포넌트에 import할 수 있다. third-party component용 stylesheet는 해당 컴포넌트에 import할 수 있다.

```tsx
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
```

production은 CSS를 minify/chunk하며 import 순서가 cascade 순서에 영향을 준다. formatter의 자동 import 정렬로 의미가 바뀌지 않게 한다. `next dev`와 build의 최종 순서가 다를 수 있어 production에서 확인한다. production CSS는 JS를 꺼도 로드하고 development Fast Refresh에는 JS가 필요하다.

Tailwind 현재 방식은 `@tailwindcss/postcss` plugin과 global CSS의 `@import 'tailwindcss'`다. v3 guide는 `tailwindcss@3`, postcss/autoprefixer, content globs와 `@tailwind base/components/utilities`를 사용하는 별도 기존 설정이다. src를 쓰면 globs도 src 경로를 포함한다. 두 major 설정을 혼합하지 않는다.

Sass는 package 설치 뒤 .scss/.sass와 .module.scss/.module.sass를 지원한다. sassOptions의 additionalData, implementation 같은 설정은 선택한 bundler 지원과 맞춘다. Sass variable을 `:export`하면 JS에서 읽어 Layout prop으로 전달할 수 있다.

## styled-jsx, PostCSS와 Babel

built-in styled-jsx의 `<style jsx>`는 scoped CSS, `<style jsx global>`은 전역 CSS다. 다른 CSS-in-JS SSR은 library별 Document integration이 필요할 수 있다. inline style만으로 가능한 표현에 registry를 먼저 만들지 않는다.

custom PostCSS config를 만들면 Next default transformation이 제거된다. 필요한 autoprefixer/preset/env/flexbug plugin을 직접 설치하고 선언한다. plugin은 require 함수가 아니라 문자열 또는 interoperable object 형태로 지정한다. Browserslist는 target을 정하지만 과거 PostCSS의 IE11 변환 설명이 Next 16의 전체 IE11 지원을 뜻하지 않는다. CSS variable은 안전하게 정적 치환하지 못하므로 기본 transpile 대상이 아니다.

`.babelrc`/babel.config는 source of truth이므로 `next/babel` preset을 포함한다. preset-env의 modules:false를 유지해야 code splitting을 보존한다. 기존 커스텀 변환이 정말 필요한지 확인하고 현재 compiler/bundler 지원과 비교한다.

## MDX의 Pages 파일 경계

MDX는 Markdown에 JSX/import를 결합한다. `@next/mdx` 설정과 pageExtensions에 md/mdx를 등록하면 `pages/mdx-page.mdx`가 URL이 된다. 문서 파일을 별도 폴더에서 import해 `pages/mdx-page.tsx`로 렌더링할 수도 있다.

Pages shared MDX layout은 일반 Layout component와 MDX default wrapper 또는 `_app`의 getLayout 패턴으로 만든다. App의 nested layout.tsx 자동 적용과 다르다. custom components, syntax highlighting, frontmatter parsing과 plugins는 [[NextJS-Styling-and-MDX]]에서 공통 처리한다. metadata export를 Pages SEO 자동 API로 가정하지 않고 next/head를 사용한다.

remote MDX는 실행 가능한 코드를 포함할 수 있어 신뢰한 출처만 컴파일한다. 사용자 임의 본문을 React 코드로 실행하는 renderer로 만들지 않는다.

## lazy loading

`next/dynamic(() => import('./Widget'), { loading, ssr: false })`는 React lazy/Suspense와 연결한다. module top-level에서 호출하고 import 경로는 literal이어야 preload 추적이 된다. named export는 `.then(mod => mod.Widget)`로 선택한다. ssr:false는 window 의존 라이브러리의 browser-only 렌더에 사용할 수 있다. 일반 library는 사용자 이벤트 안에서 import해 초기 bundle을 줄인다.

## Pages 폰트 전역 head 적용 예제

```tsx
// pages/_app.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
export default function App({ Component, pageProps }) {
  return <>
    <style jsx global>{`html { font-family: ${inter.style.fontFamily}; }`}</style>
    <Component {...pageProps} />
  </>
}
```

개별 page는 module scope에서 font를 정의하고 해당 page wrapper에 className을 붙인다. `_app` 폰트는 Pages 전 route, page 폰트는 해당 route만 preload한다. 여러 font는 한 definition 파일에서 export하고 개별 텍스트 class/style로 적용하거나 variable class와 CSS/Tailwind mapping을 연결한다. Google/local 각 option의 필수 여부, default, 다중파일/weight/style/metric descriptor와 별도 예제는 [[NextJS-Font#옵션별 구체 값과 조합]]을 따른다.

## Tailwind4와 Module 및 외부 CSS 실제 구성

```bash
npm install -D tailwindcss @tailwindcss/postcss
```

```js
// postcss.config.mjs
export default { plugins: { '@tailwindcss/postcss': {} } }
```

```css
/* styles/globals.css */
@import 'tailwindcss';
```

_app에서 globals.css를 import한 뒤 page에서 `className="flex min-h-screen flex-col items-center justify-between p-24"`와 h1 `text-4xl font-bold`를 사용할 수 있다. 오래된 browser 목표라면 v3 설치를 선택한다.

```css
/* styles/blog.module.css */
.blog { padding: 24px; }
```

```tsx
import styles from '@/styles/blog.module.css'
export default function Page() { return <main className={styles.blog}>블로그</main> }
```

9.5.4부터 node_modules CSS import가 가능하다. Bootstrap 전역은 _app에서 `import 'bootstrap/dist/css/bootstrap.css'`, @reach/dialog 등 component-required CSS는 해당 component에서 import한다.

```tsx
import { useState } from 'react'
import { Dialog } from '@reach/dialog'
import VisuallyHidden from '@reach/visually-hidden'
import '@reach/dialog/styles.css'
export function ExampleDialog() {
  const [open, setOpen] = useState(false)
  return <><button onClick={() => setOpen(true)}>Open Dialog</button>
    <Dialog isOpen={open} onDismiss={() => setOpen(false)}>
      <button onClick={() => setOpen(false)}>
        <VisuallyHidden>Close</VisuallyHidden><span aria-hidden>×</span>
      </button><p>Hello there. I am a dialog</p>
    </Dialog></>
}
```

package를 별도 설치한다. CSS import 순서는 base-button.module.css를 가진 BaseButton import 다음 page.module.css를 import하면 그 순서다. BaseButton이 page class를 받아야 하므로 `export function BaseButton({className}:{className?:string}) { return <button className={[styles.primary,className].filter(Boolean).join(' ')} /> }`로 구현한다. 원문은 className을 넘기면서 BaseButton이 인자를 받지 않아 page style이 누락되므로 교정했다.

예측 가능한 CSS 순서를 위해 import 진입점을 모으고 root에 global/Tailwind를 둔다. 공유 style은 shared component로 옮기고 module 이름은 <name>.module.css로 통일한다. source는 일반 요구에 Tailwind, 추가 local style에 Modules를 제안한다. cssChunking config로 chunking을 제어할 수 있고 auto-sort import를 꺼 cascade 변경을 막는다. dev Fast Refresh와 production minified/code-split CSS의 실제 순서는 production build에서 확인한다.

## 학습 확인

- App 폰트와 페이지 폰트의 preload 범위를 network에서 확인한다.
- global CSS를 import하는 위치와 production 순서를 확인한다.
- App MDX layout 자동 적용을 Pages로 복사하면 빠지는 부분을 설명한다.

## 출처

- [Next.js, fonts](https://nextjs.org/docs/pages/getting-started/fonts)
- [Next.js, css](https://nextjs.org/docs/pages/getting-started/css)
- [Next.js, babel](https://nextjs.org/docs/pages/guides/babel)
- [Next.js, css-in-js](https://nextjs.org/docs/pages/guides/css-in-js)
- [Next.js, lazy-loading](https://nextjs.org/docs/pages/guides/lazy-loading)
- [Next.js, mdx](https://nextjs.org/docs/pages/guides/mdx)
- [Next.js, post-css](https://nextjs.org/docs/pages/guides/post-css)
- [Next.js, sass](https://nextjs.org/docs/pages/guides/sass)
- [Next.js, tailwind-v3-css](https://nextjs.org/docs/pages/guides/tailwind-v3-css)
- [Next.js, font](https://nextjs.org/docs/pages/api-reference/components/font)

## 관련 문서

- [[NextJS-Font]]
- [[NextJS-Styling-and-MDX]]
- [[NextJS-Pages-Layouts]]
