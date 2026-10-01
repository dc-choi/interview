---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["next/font의 self-hosting과 범위", "NextJS Font"]
---

# next/font의 self-hosting과 범위

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 빌드와 브라우저 요청의 분리

next/font는 폰트 파일과 CSS를 앱 자산으로 제공한다. Google font는 빌드 시 다운로드해 self-host하므로 사용자 브라우저가 Google에 요청하지 않는다. 빌드 네트워크 의존성이 사라지는 것은 아니다. local은 저장한 파일을 사용한다.

폰트 preload와 fallback metric 조정은 초기 표시/CLS 개선을 돕는다. 모든 폰트와 문자의 layout shift가 자동으로0이 된다고 가정하지 않고 실제 콘텐츠와 fallback을 측정한다. variable font는 여러 weight를 한 자원으로 표현해 유연하지만 실제 파일 크기/지원 문자를 확인한다.

~~~tsx
// app/fonts.ts: 동일 폰트 정의를 한 번 만들고 재사용
import { Inter } from 'next/font/google'
import localFont from 'next/font/local'
export const inter = Inter({ subsets: ['latin'], display: 'swap',
  variable: '--font-inter' })
export const brand = localFont({ src: './brand.woff2',
  weight: '100 900', variable: '--font-brand' })
~~~

loader를 호출할 때마다 폰트 instance가 만들어진다. 여러 컴포넌트에서 다시 호출하지 않고 definition 파일의 객체를 import한다. 두 단어 Google font 이름은 Roboto_Mono처럼 underscore import다.

## 옵션과 반환 객체

| 옵션 | 계약 |
| --- | --- |
| local src | 호출 파일 기준 상대경로 문자열 또는 path/weight/style 객체 배열 |
| weight | 비가변 font 필수, 문자열 또는 Google 비가변 weight 배열 |
| style | 기본normal, Google normal/italic, local 표준 CSS style |
| subsets | Google의 preload할 문자 subset 배열 |
| axes | Google variable 추가축, 기본 weight만 포함 |
| display | 기본swap, auto/block/fallback/optional도 가능 |
| preload | 기본true |
| fallback | fallback font 이름 배열 |
| adjustFontFallback | Google 기본true, local Arial/Times New Roman/false |
| variable | CSS 변수 이름 |
| declarations | local의 추가 @font-face prop/value 배열 |

local 다중 파일은 regular/bold/italic 파일별 weight/style을 선언한다. variable weight 범위는 `'100 900'`처럼 표현한다. Google 비가변은 weight/style 배열로 필요한 조합을 지정한다. 모든 조합을 추가하면 자원도 늘어난다.

Google subsets는 자동 subsetting된 파일 중 미리 로드할 범위를 정한다. preload true인데 subset을 지정하지 않으면 경고가 난다. latin subset만 선택했다고 한국어 glyph 지원을 얻는 것은 아니다. 선택 font의 실제 subset/문자 지원을 확인한다.

반환값 className은 font-family를 적용하는 읽기 전용 class, style은 fontFamily와 fallback을 포함하는 읽기 전용 CSS 객체다. variable은 CSS 변수를 선언하는 class이며 그 class 자체가 font-family를 적용하지는 않는다.

~~~tsx
// app/layout.tsx
import { inter, brand } from './fonts'
import './globals.css'
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ko" className={inter.variable + ' ' + brand.variable}>
    <body>{children}</body>
  </html>
}
~~~

~~~css
body { font-family: var(--font-inter); }
h1 { font-family: var(--font-brand); }
~~~

local의 declarations에는 ascent-override 같은 metric descriptor를 넣을 수 있지만 실제 font metric을 확인해야 한다. axes slnt 같은 추가축은 해당 Google font가 지원할 때만 설정한다.

## preload 범위와 스타일 시스템 연결

page에서 사용하면 해당 경로, layout이면 감싼 경로, root layout이면 전체 경로가 preload 범위다. 공유 definition 파일에 있다는 이유만으로 모든 경로에 자동 적용되지는 않는다. 여러 폰트는 실제 사용하는 페이지에 좁혀 불필요한 전송을 줄인다.

Tailwind4는 위에서 정의한 inter/brand의 CSS 변수 class를 html/body에 붙이고 다음 mapping을 사용한다. `font-sans`, `font-display` utility가 각각 이 폰트를 선택한다.

~~~css
@import 'tailwindcss';
@theme inline {
  --font-sans: var(--font-inter);
  --font-display: var(--font-brand);
}
~~~

Tailwind3는 tailwind.config의 theme.extend.fontFamily에서 `sans:['var(--font-inter)']`처럼 지정한다. 두 버전의 설정을 섞지 않는다. CSS Module에서는 변수 class를 부모에, font-family 규칙 class를 텍스트에 적용한다.

Pages Router의 전역 적용 위치는 _app이고 App root layout과 다르다. @next/font는13.2에서 next/font로 이름이 바뀌어 별도 패키지 설치가 필요 없다.

## 옵션별 구체 값과 조합

local `src`는 필수이고 string 또는 `Array<{ path: string; weight?: string; style?: string }>`다. Google에는 src가 없다. `weight`와 `style`의 배열은 Google 비가변 font만 지원한다. Google weight는 해당 font의 지원값이며 Inter는 `'100'`부터 `'900'` 또는 기본 `'variable'`을 쓸 수 있다. local style은 oblique 등 표준 font-style 값도 전달할 수 있다.

fallback 배열은 기본값이 없고 `['system-ui', 'arial']`처럼 선언한다. 자동 metric fallback과 사용자가 지정한 fallback 목록은 구별한다. local adjustFontFallback의 기본은 `'Arial'`이고 `'Times New Roman'` 또는 false로 바꿀 수 있다. Google은 기본 true이며 false로 끈다.

```tsx
import { Roboto, Roboto_Mono } from 'next/font/google'
import localFont from 'next/font/local'

export const roboto = Roboto({
  weight: ['400', '700'], style: ['normal', 'italic'],
  subsets: ['latin'], display: 'swap',
})
export const mono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono' })
export const local = localFont({
  src: [
    { path: './Regular.woff2', weight: '400', style: 'normal' },
    { path: './Italic.woff2', weight: '400', style: 'italic' },
    { path: './Bold.woff2', weight: '700', style: 'normal' },
    { path: './BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
  declarations: [{ prop: 'ascent-override', value: '90%' }],
  adjustFontFallback: 'Times New Roman',
})
```

위 파일은 폰트 definition module이다. import한 페이지는 `<p className={roboto.className}>...</p>`, `<p style={mono.style}>...</p>`처럼 사용한다. 폰트 파일과 실제 descriptor metric을 확보한 뒤 해당 경로/값을 선택한다. fonts alias를 원하면 tsconfig `paths: { "@/fonts": ["./styles/fonts"] }`와 실제 definition 위치를 맞춘다.

CSS Module은 parent에 variable class를, text에 module class를 둔다. 예를 들어 `<main className={mono.variable}><p className={styles.text}>...</p></main>`와 `.text { font-family: var(--font-mono); font-weight: 200; }`를 함께 사용한다. italic을 지정하려면 해당 font/style 지원도 확보한다.

도입 이력은 v13.0의 @next/font, v13.2의 next/font 통합이다.

## 학습 확인

- Google 폰트에서 빌드 요청과 사용자 브라우저 요청을 구분한다.
- variable class만 적용했는데 글꼴이 바뀌지 않는 이유를 찾는다.
- 페이지 전용 폰트가 전체 사이트 preload로 확대되지 않도록 배치한다.

## 출처

- [Next.js, font](https://nextjs.org/docs/app/api-reference/components/font)

## 관련 문서

- [[NextJS-Styling-and-MDX]]
- [[NextJS-Pages-Fonts-CSS-MDX]]
