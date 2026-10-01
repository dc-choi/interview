---
tags: [nextjs, app-router, rendering]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["CSS, 이미지, font와 MDX의 경계"]
---

# CSS, 이미지, font와 MDX의 경계

## CSS의 범위와 순서

CSS Modules는 .module.css 파일의 class를 local scope로 만들어 component styles가 이름 충돌하지 않게 한다. global CSS는 App Router 여러 위치에서 import할 수 있지만 navigation 때 이전 style이 자동으로 제거되는 것은 아니다. 전역 reset/theme처럼 실제 전역인 CSS는 root layout에서 일관되게 적용하고 특정 route style은 module로 좁힌다.

Tailwind4는 tailwindcss와 @tailwindcss/postcss를 설치하고 postcss.config.mjs의 plugin 설정과 global CSS의 @import 'tailwindcss'로 연결한다. browser 지원 때문에 Tailwind3이 필요한 project에는3용 설정을 따르며 버전별 setup을 섞지 않는다. external package의 CSS도 app에서 import할 수 있고 React19의 stylesheet link 처리를 사용할 수 있다.

production CSS는 import 순서에 따라 chunk/merge/minify된다. 모든 CSS가 항상 한 파일로 합쳐진다고 가정하지 않는다. next.config cssChunking과 dependency 순서가 cascade에 영향을 준다. import 자동 정렬이 CSS 우선순위를 바꿀 수 있다. 개발 HMR과 production build의 순서 차이를 검사하고 production에서 JavaScript를 꺼도 필요한 CSS가 로드되는지 확인한다.

```tsx
import './globals.css'
import styles from './card.module.css'
export function Card() { return <article className={styles.card}>본문</article> }
```

## 이미지 시작 규칙

public의 local image는 root-relative URL로 사용한다. Image의 width/height는 intrinsic ratio와 layout shift 방지에 필요하다. static import는 원본 dimension과 지원 format의 blur data를 자동으로 파악할 수 있다. 서버의 template dynamic import는 고정 prefix 아래 파일을 bundle에 포함할 수 있어 외부 path로 자유롭게 읽는 file loader가 아니다.

remote image는 width/height 또는 fill과 안정적인 parent layout을 정한다. blur placeholder는 필요한 blurDataURL을 직접 제공해야 한다. remotePatterns는 protocol/hostname/port/pathname/search까지 목적에 맞게 제한한다. 임의 외부 URL을 최적화 proxy로 열지 않는다. sizes, responsive choice, loader/security/caching의 전체 API는 Image component 문서에서 더 확인한다.

## font의 배포와 scope

next/font/google는 font를 build 시 내려받아 self-host하고 browser는 같은 origin asset을 요청한다. browser가 Google에 font 요청을 계속한다는 뜻은 아니다. font.className을 root layout에 적용하면 전체 subtree에, 특정 component에 적용하면 그 scope에 쓰인다.

variable font는 weight 범위를 자동으로 사용할 수 있는 선택이다. static font는 필요한 weight를 명시한다. next/font/local의 src는 호출 파일 기준 상대 경로이고 단일 string 또는 path/weight/style object 배열을 지원한다. font 파일은 app/public 어디든 적절한 위치에 둘 수 있다. build의 download 실패와 실제 browser preload/render를 따로 확인한다.

## MDX component convention

App Router에서 @next/mdx를 쓰면 root 또는 src의 mdx-components.tsx가 필요하다. useMDXComponents는 인자 없이 MDXComponents map을 반환하여 heading, image 같은 element의 renderer를 정의한다. mdx-components는 일반 component 파일과 같은 route를 만들지 않는다.

```tsx
import type { MDXComponents } from 'mdx/types'
export function useMDXComponents(): MDXComponents {
  return { h1: ({ children }) => <h1 className="article-title">{children}</h1> }
}
```

global map을 과하게 바꾸면 모든 MDX의 semantic markup과 스타일이 달라진다. code block, heading anchor, image alt와 link를 확인한다. remote MDX의 실행 신뢰 경계와 plugin/setup은 MDX guide의 별도 계약을 따른다.

## CSS 연결 예와 production 차이

대표 설치는 `npm install -D tailwindcss @tailwindcss/postcss`, postcss.config.mjs의 `plugins: {'@tailwindcss/postcss': {}}`, globals.css의 `@import 'tailwindcss'`, root layout의 CSS import 순서다. Page에서 flex/min-h-screen/items-center/padding과 text-4xl/font-bold 같은 utility를 사용한다. CSS Module 예는 blog.module.css의 `.blog {padding: 24px}`와 Page의 `className={styles.blog}`다. global.css 예는 body에 padding 20px 20px 60px, max-width 680px, margin 0 auto를 적용한다. external 예는 bootstrap CSS를 root에서 import하고 body.container를 쓴다. React 19 stylesheet link도 가능하다.

BaseButton을 먼저 import하고 page.module.css를 나중에 import하면 base-button.module.css가 앞에 온다. 공유 button은 실제로 className prop을 받아 자체 class와 합쳐야 Page의 primary가 적용된다. entry 한 곳에 CSS import를 모으고 global/Tailwind는 root, custom은 module로 둔다. 같은 name.module.css 명명과 공유 component로 중복 import를 줄인다. sort-imports 자동 정렬을 끄고 cssChunking 옵션을 확인한다. dev는 JS Fast Refresh로 즉시 갱신하며 production은 minified/code-split CSS를 로드해 JS 없이도 스타일을 받는다. 최종 순서는 build에서 검사한다.

## 이미지와 font의 실제 입력

next/image는 기기에 맞는 size와 WebP, 비율 유지로 CLS 예방, viewport 기반 native lazy loading과 선택적 blur, remote image의 요청 시 resize를 제공한다. `public/profile.png`는 src='/profile.png', alt와 width/height 500으로 사용한다. static import한 ProfileImage는 dimension/blurDataURL을 자동 제공하며 placeholder='blur'는 선택 사항이다. 서버 PostImage는 dynamic import로 이미지를 받아 Image에 넘긴다. 예를 들면 `await import('../content/blog/images/' + imageFilename)`이다. @/ alias도 가능하지만 static prefix가 필요하며 matching directory 파일이 모두 bundle되므로 prefix를 최대한 좁힌다. 외부 입력으로 디렉터리 밖까지 탐색하는 loader가 아니다.

S3 remote 예는 500x500 비율과 수동 blur 또는 fill을 사용한다. remotePatterns는 protocol:'https', hostname:'s3.amazonaws.com', port:'', pathname:'/my-bucket/**', search:''로 해당 bucket에서 query가 없는 URL만 허용한다.

Geist({subsets:['latin']})의 className을 html에 적용하면 root font가 된다. variable font가 권장되며 static Roboto는 weight:'400'을 명시한다. localFont({src:'./my-font.woff2'})는 호출 파일의 상대 경로다. 같은 family의 array 예는 Roboto Regular(400, normal), Italic(400, italic), Bold(700, normal), Bold Italic(700, italic)의 네 woff2 path를 넣는다. public 또는 app에 colocate할 수 있지만 src는 실제 위치에 맞춘다. 브라우저는 Google 대신 배포 origin의 font asset을 받아 privacy/network와 layout shift를 개선한다.

mdx-components는app/pages와동급root또는src에두고인자없는단일함수 useMDXComponents():MDXComponents를export한다. 빈constcomponents map부터사용할수있으며AppRouter@next/mdx에는필수다.13.1.2도입이다.

## 이해 확인

1. route를 떠나면 import했던 global CSS가 반드시 제거되는가?
2. remote Image에 width/height 또는 fill의 parent 크기가 필요한 이유는?
3. next/font/google의 build download와 browser의 font network 요청은 어떻게 다른가?

## 출처

- [Next.js, css](https://nextjs.org/docs/app/getting-started/css)
- [Next.js, images](https://nextjs.org/docs/app/getting-started/images)
- [Next.js, fonts](https://nextjs.org/docs/app/getting-started/fonts)
- [Next.js, mdx-components](https://nextjs.org/docs/app/api-reference/file-conventions/mdx-components)

## 관련 문서

- [[NextJS-App-Structure]]
- [[NextJS-App-Layouts]]
- [[React-DOM-Resource-Hints]]
