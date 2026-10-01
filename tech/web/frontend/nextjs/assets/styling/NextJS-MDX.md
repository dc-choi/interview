---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["MDX 컴파일과 콘텐츠 경계", "NextJS MDX"]
---

# MDX 컴파일과 콘텐츠 경계

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## Markdown에서 React까지

Markdown은 문서 구조를 HTML로 표현하는 문법이다. MDX는 JSX/import/export로 React component를 섞는다. 일반 text formatting을 넘어 실행 가능한 콘텐츠이므로 신뢰할 작성 소스와 외부 입력을 구분한다.

@next/mdx는 로컬 파일을 컴파일해 App/Pages route 또는 import로 사용한다. App 기본 Server Component도 지원한다. 서버에서 가져온 remote MDX는 별도 compiler/renderer 선택과 신뢰 경계가 필요하며 plugin 설치만으로 remote fetch가 생기지는 않는다.

~~~bash
npm install @next/mdx @mdx-js/loader @mdx-js/react @types/mdx
~~~

~~~js
// next.config.mjs
import createMDX from '@next/mdx'
const withMDX = createMDX({
  // webpack에서 .md도 컴파일하려면 extension: /\.(md|mdx)$/
})
export default withMDX({
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
})
~~~

pageExtensions에 md가 있어도 기본 @next/mdx는 mdx만 컴파일한다. webpack에서 md까지 다룰 때 extension을 설정한다. App에는 프로젝트 루트 또는 src의 mdx-components.tsx/js가 필수다.

~~~tsx
import type { MDXComponents } from 'mdx/types'
const components: MDXComponents = {}
export function useMDXComponents(): MDXComponents { return components }
~~~

## 파일, import와 동적 콘텐츠

app/posts/page.mdx는 route page다. 임의 위치의 welcome.mdx는 page.tsx에서 default component로 import해 사용할 수 있다. JSX component import를 MDX에 선언하면 글 안에 해당 component를 배치할 수 있다.

동적 route는 params Promise를 await한 뒤 검증된 slug를 콘텐츠에 연결한다. 임의 문자열 경로를 구성하기보다 허용 manifest를 사용하면 모듈 포함 범위와 미작성 글 처리를 명확히 할 수 있다.

~~~tsx
import { notFound } from 'next/navigation'
const posts = {
  welcome: () => import('@/content/welcome.mdx'),
  about: () => import('@/content/about.mdx'),
}
export default async function Page({ params }: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!Object.hasOwn(posts, slug)) notFound()
  const { default: Post } = await posts[slug as keyof typeof posts]()
  return <Post />
}
export function generateStaticParams() {
  return Object.keys(posts).map(slug => ({ slug }))
}
export const dynamicParams = false
~~~

dynamicParams:false는 generateStaticParams에 없는 경로를404로 처리한다. Cache Components 등 상위 프로젝트의 route config 제약은 별도로 확인한다. import에는 mdx 확장자를 포함한다. filesystem 목록 조회는 server에서만 가능하다.

## component mapping과 metadata

Markdown h1/ul/img 등은 HTML 요소에 대응한다. mdx-components의 global mapping은 전체 글, `<Post components={overrides} />`는 해당 글의 global mapping을 override한다. App layout으로 공유 스타일을 적용하고 Tailwind typography의 prose class를 사용할 수 있다.

img를 Image로 바꿀 때 단순 `props as ImageProps`가 width/height나 remotePatterns를 런타임에 채워 주지 않는다. 콘텐츠에서 크기/alt를 제공하거나 별도 변환 단계로 검증한다.

@next/mdx는 YAML frontmatter를 기본 지원하지 않는다. remark-frontmatter는 구문 처리, remark-mdx-frontmatter/gray-matter 등은 원하는 data 추출 방식에 맞게 선택한다. MDX의 JavaScript export로 metadata를 공개하고 다른 페이지에서 named import하는 방식도 있다. 일반 export 객체와 Next metadata 계약은 별도다.

## plugin과 AST 처리

remark는 Markdown AST, rehype는 HTML AST를 다룬다. 일반 HTML pipeline은 remark-parse -> remark-rehype -> rehype-sanitize -> rehype-stringify다. @next/mdx는 내부 변환을 처리하므로 직접 pipeline을 반복 구현할 필요가 없다. HTML sanitize가 임의 MDX JavaScript를 안전하게 실행하는 보장은 아니다.

ESM plugin ecosystem 때문에 next.config.mjs/ts를 사용한다. remark-gfm은 GFM, rehype plugin은 heading/link/code 변환 등에 사용한다.

~~~js
const withMDX = createMDX({
  options: {
    remarkPlugins: ['remark-gfm', ['remark-toc', { heading: 'Contents' }]],
    rehypePlugins: ['rehype-slug'],
  },
})
~~~

Turbopack에는 최신 @next/mdx와 문자열 plugin 이름/serializable options를 사용한다. function option을 Rust에 전달할 수 없으므로 해당 plugin을 지원한다고 가정하지 않는다. webpack에서 함수 import plugin을 전달하는 방식과 구분한다.

Rust compiler의 experimental.mdxRs는 아직 production 권장 경로가 아니다. true 또는 jsxRuntime/jsxImportSource/providerImportSource/mdxType(gfm/commonmark) 객체를 지원하며 option 이름과 타입을 해당 버전에 맞춘다.

## 학습 확인

- md 확장자 허용과 실제 컴파일 설정을 구분한다.
- remote MDX의 실행 신뢰 경계와 HTML sanitization의 범위를 설명한다.
- global/local mapping에서 Image의 필수 크기/alt를 실제로 제공하는지 확인한다.

## 출처

- [Next.js, mdx](https://nextjs.org/docs/app/guides/mdx)

## 관련 문서

- [[NextJS-Styling-and-MDX]]
- [[NextJS-Image]]
- [[NextJS-Pages-Fonts-CSS-MDX]]
