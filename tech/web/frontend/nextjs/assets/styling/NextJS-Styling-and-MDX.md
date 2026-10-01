---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 스타일 방식과 버전 선택", "NextJS Styling and MDX"]
---

# Next.js 스타일 방식과 버전 선택

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## CSS 처리와 React 실행 경계

CSS Module은 class 이름 범위를 나누고 global CSS는 여러 경로에 영향을 준다. Sass는 CSS 생성 단계, Tailwind는 utility 생성 단계, runtime CSS-in-JS는 렌더 중 스타일 수집/주입 단계다. 어떤 단계에서 비용과 scope가 생기는지 먼저 구분한다.

App Router의 Server Component/Streaming에서는 runtime 스타일 라이브러리가 concurrent rendering을 지원해야 한다. 모든 라이브러리를 Client Component로 감싼다고 SSR/streaming 문제가 해결되지는 않는다. registry와 지원 버전을 확인한다.

MDX는 Markdown을 React/JSX로 컴파일하는 콘텐츠 방식이다. 스타일 규칙과 콘텐츠 실행을 한 파일의 책임으로 혼동하지 않고 component mapping/공유 layout에서 디자인을 적용한다.

## Sass 설치와 옵션

sass를 dev dependency로 설치하면 .scss/.sass와 .module.scss/.module.sass를 지원한다. scss는 CSS superset, sass는 indented syntax다. 문법을 처음 선택한다면 기존 CSS를 옮기기 쉬운 scss를 검토한다.

~~~js
export default {
  sassOptions: {
    additionalData: '$brand: #164e63;',
    // 다른 구현을 설치했다면 implementation: 'sass-embedded'
  },
}
~~~

기본 구현은 sass이고 implementation으로 sass-embedded를 선택할 수 있다. additionalData는 compilation에 선행 데이터를 공급하므로 모든 파일에 반복 CSS를 내는 내용인지 검토한다.

~~~scss
// colors.module.scss
$primary: #164e63;
:export { primaryColor: $primary; }
~~~

JS에서는 import한 module의 primaryColor를 inline style 값으로 사용할 수 있다. Sass 변수 export와 runtime CSS custom property는 서로 다른 단계다. 사용자 테마를 런타임에 바꾸려면 CSS 변수와 사용 흐름을 별도로 설계한다.

## Tailwind3는 명시적인 버전 경로다

기본 최신 Tailwind4 구성과 구분한다. v3 가이드는 넓은 browser 지원 등 v3를 유지해야 하는 조건의 설치 경로다.

~~~bash
npm install -D tailwindcss@^3 postcss autoprefixer
npx tailwindcss init -p
~~~

~~~js
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
~~~

~~~css
@tailwind base;
@tailwind components;
@tailwind utilities;
~~~

App root layout에서 global CSS를 import하고 className utility를 쓴다. Pages 전역 CSS는 _app 규칙을 따른다. content 경로에 MDX/custom 콘텐츠 폴더가 빠지면 사용 class가 생성되지 않을 수 있다. Turbopack은13.1부터 Tailwind/PostCSS를 지원한다.

Tailwind4의 @import/@theme 방식과 v3의 init/config/directives를 혼용하지 않는다. next/font 변수 class를 html/body에 적용하고 v3 fontFamily mapping 또는 v4 @theme mapping을 선택한다.

## 선택과 검증

단순 정적 스타일이면 CSS Module/global CSS가 적은 runtime 비용으로 충분할 수 있다. library의 theme/provider/동적 스타일이 필요하면 CSS-in-JS 지원 계약을 확인한다. MDX 콘텐츠의 h1/img mapping은 글마다 중복 스타일을 줄이지만 Image에 필요한 크기까지 타입 단언으로 생성되지는 않는다.

페이지 이동, 첫 SSR, streaming chunk, hydration 후 상태 변경을 각각 확인한다. dev에서 맞는 class 순서만으로 production style 순서가 보장된다고 판단하지 않는다.

## 학습 확인

- Sass 변수와 CSS 변수의 compile/runtime 차이를 설명한다.
- Tailwind3 설정에서 새 content 폴더의 class가 누락되는 원인을 찾는다.
- runtime CSS-in-JS를 선택할 때 RSC/streaming의 추가 계약을 확인한다.

## 출처

- [Next.js, sass](https://nextjs.org/docs/app/guides/sass)
- [Next.js, tailwind-v3-css](https://nextjs.org/docs/app/guides/tailwind-v3-css)

## 관련 문서

- [[NextJS-CSS-in-JS]]
- [[NextJS-MDX]]
- [[NextJS-Font]]
- [[NextJS-Pages-Fonts-CSS-MDX]]
