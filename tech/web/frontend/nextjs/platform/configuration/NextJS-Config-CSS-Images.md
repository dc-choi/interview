---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js CSS 처리와 이미지 로더", "NextJS-Config-CSS-Images"]
---

# Next.js CSS 처리와 이미지 로더

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## images

`images` object는 내장 `next/image` optimizer 또는 외부 image CDN loader를 선택한다. `loader: 'custom'`, `loaderFile: './image-loader.ts'`를 설정하고 default export function이 `{ src, width, quality }`를 받아 URL 문자열을 반환하도록 작성한다. 파일 경로는 앱 루트 기준이다. 개별 Image의 loader prop으로도 지정할 수 있다. 함수 serialization 때문에 custom loader module은 Client Component 경계를 고려한다.

```ts
'use client'

import type { ImageLoaderProps } from 'next/image'

export default function loader({ src, width, quality = 75 }: ImageLoaderProps) {
  const url = new URL(src, 'https://images.example.com')
  url.searchParams.set('width', String(width))
  url.searchParams.set('quality', String(quality))
  return url.href
}
```

공식 예시는 Akamai, CloudFront, Cloudinary, Cloudflare, Contentful, Fastly, Gumlet, ImageEngine, Imgix, PixelBin, Sanity, Sirv, Supabase, Thumbor, ImageKit, Nitrogen AIO의 URL 변환 패턴을 제공한다. provider마다 path/query encoding, width/quality parameter와 기본 format이 다르므로 위 일반 예시를 그대로 모든 provider에 쓰지 않는다. URL 생성은 실제 binary resize와 같지 않으며 외부 서비스에서 최적화를 수행해야 한다.

## sassOptions

Sass compiler 옵션 object다. `additionalData`, `implementation: 'sass-embedded'` 등을 설정할 수 있다. Next.js가 유지하는 타입은 implementation 중심이므로 모든 Sass 속성의 타입 보장을 기대하지 않는다. `sassOptions.functions`의 JavaScript custom functions는 webpack에서만 지원한다. Turbopack은 Rust architecture 때문에 해당 JS 함수 실행을 지원하지 않는다.

## mdxRs

실험 `experimental.mdxRs: true`는 `@next/mdx`와 함께 Rust MDX compiler를 사용한다. MDX 설치와 route pageExtensions를 자동 대체하는 설정이 아니다. custom remark/rehype 동작과 빌드 환경을 확인하며 production 사용 권장 상태로 표현하지 않는다.

## inlineCss

실험 `experimental.inlineCss: true`는 production의 CSS를 `<style>`로 inline해 추가 stylesheet round trip을 줄인다. 최초 방문이 많은 작은 앱은 이점이 있을 수 있으나 큰 CSS는 HTML 크기를 늘리고 여러 페이지의 shared stylesheet browser cache 이점을 줄인다.

global 설정이며 page별 제어가 없다. initial SSR style과 RSC payload에 CSS가 중복될 수 있고 prerendered page navigation은 중복을 피하기 위해 link tags를 사용한다. development에서는 작동하지 않는다. HTML gzip size와 initial/navigation 성능을 각각 측정한다.

## cssChunking

실험 `experimental.cssChunking`은 route별 CSS chunk와 순서를 조절한다. 기본 true는 webpack/Turbopack에서 import dependency를 이용해 합치고 요청 수를 줄인다. webpack 전용 false는 재배열/merge를 끄고, `'strict'`는 import 순서를 지켜 순서 의존 문제를 줄이지만 요청이 증가한다. Turbopack 전용 `'graph'`는 route download bytes와 request cost를 함께 최적화한다.

graph object는 `{ type: 'graph', requestCost, weightDistribution }`다. 기본 requestCost 20000 bytes, weightDistribution 0.1이다. requestCost를 높이면 불필요 CSS를 일부 함께 받더라도 요청 수를 줄이고, 낮추면 더 나눈다. weightDistribution 0은 route를 균등 가중하고 높일수록 CSS가 적은 route의 낭비를 더 중시한다.

```js
export default {
  experimental: {
    cssChunking: { type: 'graph', requestCost: 20000, weightDistribution: 0.1 },
  },
}
```

`/a`가 shared.css와 only-a.css, `/b`가 shared.css만 쓸 때 merge는 `/a` 요청을 줄이지만 `/b`에 only-a.css를 전송한다. graph는 이런 전체 비용을 조정하며 모든 route의 최적을 동시에 보장하지 않는다. DevTools Coverage에서 메뉴/hover/focus를 실행하기 전 unused 판정과 실제 dead CSS를 구분한다.

## useLightningcss

실험 `experimental.useLightningcss: true`는 webpack의 PostCSS 기본 변환 대신 Rust Lightning CSS를 사용한다. Turbopack은 14.2부터 이미 Lightning CSS를 쓰므로 이 flag가 효과가 없다.

16.2의 `experimental.lightningCssFeatures`는 `{ include: string[], exclude: string[] }`로 browserslist 결정과 별개로 특정 CSS 변환을 강제하거나 제외한다. webpack에서 useLightningcss가 켜진 경우와 Turbopack 모두에 적용된다. 개별 feature는 nesting, selector/list, media range/custom media, clamp, 현대 color, system-ui, gradients, vendor-prefixes, logical-properties, light-dark 등을 지원한다. group shorthand는 `selectors`, `media-queries`, `colors`다. 제외한 변환이 실제 대상 browser에서 필요한지 확인한다.

## CSS graph의 비용 모델

graph는 각 route의 ordered CSS import 목록으로 파일 간 동시/동일 순서 사용 가중 그래프를 만들고 자주 함께 쓰는 파일을 인접한 선으로 펼친다. 그 선을 chunk로 잘라 전체 route의 bytes와 requests 비용을 최소화한다. route는 자신이 import한 파일을 포함한 모든 chunk를 받으므로 작은 /login도 reset과 함께 묶인 theme/layout을 받을 수 있다.

requestCost는 추가 요청 하나를 몇 bytes의 낭비와 맞바꿀지 정한다. 기본 20000이면 only-a가 대략 20KB를 넘기 전에는 공유 chunk에 남을 수 있다. 높은 weightDistribution은 CSS가 작은 route의 추가 bytes를 더 크게 취급한다. 두 값은 object에서 각각 선택적이며 'graph' 문자열은 기본 tuning을 사용한다.

webpack의 strict는 a/b를 반대 순서로 import한 곳에서 합칠 수 있다는 기본 가정을 피하고 import 순서를 지킨다. false는 merge/reorder 자체를 끈다. Coverage의 회색은 interaction 전 상태일 수 있고, dead source rule은 제거/사용 route로 이동하며 shared chunk 낭비는 chunk strategy로 구분해 해결한다.

## provider 상세 loader

각 CDN의 format/width/quality 이름, 기존 query 보존, ImageEngine compression 변환과 SSR window 주의사항은 [[NextJS-Config-Image-CDN-Loaders]]에 둔다.

## inline CSS 측정 기준

작은 atomic/Tailwind CSS와 신규 방문자의 고지연 연결에서는 HTML 발견 후 CSS 요청 waterfall 제거로 FCP/LCP를 줄일 수 있다. 재방문/shared stylesheet의 독립 cache 이득을 잃고 큰 Bootstrap/MUI류 CSS는 HTML 및 TTFB 부담이 커진다. 프레임워크 이름만으로 CSS 크기가 작다고 가정하지 않고 실제 gzip bytes와 첫 화면/후속 navigation을 측정한다.

## Lightning CSS feature 전체 목록

include/exclude는 string[]이며 browserslist가 정한 필요성과 관계없이 항상 변환/절대 변환하지 않도록 지정한다. useLightningcss는 webpack 기본 false이고 PostCSS와 postcss-preset-env가 기본 경로다. Turbopack에서는 flag를 무시하고 항상 Lightning CSS를 쓴다.

| feature | 변환 대상 |
| --- | --- |
| nesting | CSS nesting |
| not-selector-list | :not의 여러 selector |
| dir-selector | :dir() |
| lang-selector-list | :lang()의 여러 language |
| is-selector | :is() |
| text-decoration-thickness-percent | thickness percentage |
| media-interval-syntax | media interval |
| media-range-syntax | width >= 600px 등 range |
| custom-media-queries | @custom-media |
| clamp-function | clamp() |
| color-function | color() |
| oklab-colors | oklab()/oklch() |
| lab-colors | lab()/lch() |
| p3-colors | Display P3 |
| hex-alpha-colors | 4/8자리 alpha hex |
| space-separated-color-notation | rgb(0 0 0) |
| font-family-system-ui | system-ui |
| double-position-gradients | 두 위치 gradient stop |
| vendor-prefixes | prefix 속성/값 |
| logical-properties | logical 속성/값 |
| light-dark | light-dark() |

selectors는 nesting/not-selector-list/dir-selector/lang-selector-list/is-selector, media-queries는 media-interval-syntax/media-range-syntax/custom-media-queries, colors는 color-function/oklab-colors/lab-colors/p3-colors/hex-alpha-colors/space-separated-color-notation/light-dark 묶음이다. include:['light-dark','oklab-colors'], exclude:['nesting']처럼 조합한다. 14.2에 Turbopack processor가 @swc/css에서 Lightning CSS로 바뀌고 옛 experimental.turbo.useSwcCss가 생겼으며 15.1에 그 지원이 제거됐다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/images](https://nextjs.org/docs/app/api-reference/config/next-config-js/images)
- [Next.js, pages/api-reference/config/next-config-js/images](https://nextjs.org/docs/pages/api-reference/config/next-config-js/images)
- [Next.js, app/api-reference/config/next-config-js/sassOptions](https://nextjs.org/docs/app/api-reference/config/next-config-js/sassOptions)
- [Next.js, app/api-reference/config/next-config-js/mdxRs](https://nextjs.org/docs/app/api-reference/config/next-config-js/mdxRs)
- [Next.js, app/api-reference/config/next-config-js/inlineCss](https://nextjs.org/docs/app/api-reference/config/next-config-js/inlineCss)
- [Next.js, app/api-reference/config/next-config-js/cssChunking](https://nextjs.org/docs/app/api-reference/config/next-config-js/cssChunking)
- [Next.js, app/api-reference/config/next-config-js/useLightningcss](https://nextjs.org/docs/app/api-reference/config/next-config-js/useLightningcss)
- [Next.js, pages/api-reference/config/next-config-js/useLightningcss](https://nextjs.org/docs/pages/api-reference/config/next-config-js/useLightningcss)

## 관련 문서

- [[NextJS-Turbopack]]
- [[NextJS-Browser-Support]]
