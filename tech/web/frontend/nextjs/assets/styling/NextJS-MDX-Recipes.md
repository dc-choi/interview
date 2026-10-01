---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["MDX의 mapping, metadata와 compiler 구성 예제"]
---

# MDX의 mapping, metadata와 compiler 구성 예제

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## 글과 Router별 파일 배치

Markdown `I **love** using [Next.js](https://nextjs.org/)`는 `<p>I <strong>love</strong> using <a href="https://nextjs.org/">Next.js</a></p>`로 변환된다. `## 제목`은 h2, 문단은 p, `- One` 목록은 ul/li다. MDX는 여기에 JSX/import를 추가한다.

```mdx
// markdown/welcome.mdx
import { MyComponent } from '@/components/my-component'

# Welcome to my MDX page!

This is **bold** and _italics_ text.

- One
- Two
- Three

<MyComponent />
```

components/my-component.tsx에서 `export function MyComponent() { return <p>React 내용</p> }`를 구현한다. MDX 파일 안에서는 `// filename`이 Markdown 내용이 될 수 있으므로 첫 주석 줄은 파일 표시 설명으로만 보고 실제 글에서는 제거한다.

Pages file route는 pages/mdx-page.mdx, App은 app/mdx-page/page.mdx로 둔다. 별도 markdown/welcome.mdx를 사용하는 page의 본문은 같다.

```tsx
import Welcome from '@/markdown/welcome.mdx'
export default function Page() { return <Welcome /> }
```

이 page를 Pages는 pages/mdx-page.tsx, App은 app/mdx-page/page.tsx에 둔다. 두 방법 모두 /mdx-page로 접근한다. 루트 또는 src의 mdx-components.tsx는 App에서 필수이며 JSX/TSX, md/mdx를 next.config pageExtensions와 컴파일 extension에 등록하는 설정은 [[NextJS-MDX#Markdown에서 React까지]]를 따른다.

## global/local component와 layout

```tsx
// mdx-components.tsx
import type { MDXComponents } from 'mdx/types'
import Image from 'next/image'
const components = {
  h1: ({ children }) => <h1 style={{ color: 'red', fontSize: '48px' }}>{children}</h1>,
  img: props => {
    const { src, alt, width, height } = props
    if (typeof src !== 'string' || !width || !height) return <img {...props} />
    return <Image src={src} alt={alt ?? ''} width={Number(width)} height={Number(height)}
      sizes="100vw" style={{ width: '100%', height: 'auto' }} />
  },
} satisfies MDXComponents
export function useMDXComponents(): MDXComponents { return components }
```

원문의 ImageProps 단언은 필수 width/height를 만들지 않는다. 여기서는 확인한 치수만 Image로 렌더하며 일반 Markdown 이미지에도 Next 최적화가 필요하면 compile 단계에서 치수를 공급한다. 외부 src는 remotePatterns를 허용한다. alt 빈 값은 장식 이미지일 때만 사용한다.

```tsx
import Welcome from '@/markdown/welcome.mdx'
import type { ReactNode } from 'react'
const override = { h1: ({ children }: { children?: ReactNode }) =>
  <h1 style={{ color: 'blue', fontSize: '100px' }}>{children}</h1> }
export default function Page() { return <Welcome components={override} /> }
```

local mapping이 global을 병합하고 같은 key를 덮는다. App 공유 wrapper는 app/mdx-page/layout.tsx에 둔다. Pages는 components/mdx-layout.tsx를 MDX에서 import해 default wrapper로 사용한다.

```tsx
export default function MdxLayout({ children }: { children: React.ReactNode }) {
  return <div className="prose prose-headings:mt-8 prose-headings:font-semibold prose-headings:text-black prose-h1:text-5xl prose-h2:text-4xl prose-h3:text-3xl prose-h4:text-2xl prose-h5:text-xl prose-h6:text-lg dark:prose-headings:text-white">
    {children}
  </div>
}
```

`@tailwindcss/typography`를 해당 Tailwind 버전 절차로 설치한다. 기본 shared layout 예는 className 대신 `style={{ color: 'blue' }}`도 가능하다.

```mdx
import MdxLayout from '../components/mdx-layout'

# Welcome

export default function MDXPage({ children }) {
  return <MdxLayout>{children}</MdxLayout>
}
```

App은 framework layout이 자동 감싸고 위 Pages default wrapper export는 직접 감싼다. route 파일에서 metadata를 쓰는 것은 App metadata API이며 Pages SEO는 next/head를 사용한다.

## metadata export와 frontmatter

```mdx
// content/blog-post.mdx
export const metadata = { author: '문서 작성자' }

# Blog post
```

```tsx
import BlogPost, { metadata } from '@/content/blog-post.mdx'
export default function Page() {
  console.log(metadata.author)
  return <BlogPost />
}
```

fs/globby로 글 directory를 읽어 export metadata를 추출하는 blog index는 서버에서만 처리한다. @next/mdx는 YAML frontmatter를 기본 지원하지 않는다. remark-frontmatter/remark-mdx-frontmatter/gray-matter 중 구문 인식과 metadata 추출 역할에 맞는 도구를 선택한다.

## webpack과 Turbopack plugin

```js
// next.config.mjs: webpack ESM plugin
import createMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'
export default createMDX({ options: {
  remarkPlugins: [remarkGfm], rehypePlugins: [],
}})({ pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'] })
```

```js
// Turbopack에는 plugin 이름과 직렬화 가능한 옵션
const withMDX = createMDX({ options: {
  remarkPlugins: ['remark-gfm', ['remark-toc', { heading: 'The Table' }]],
  rehypePlugins: ['rehype-slug', ['rehype-katex', { strict: true, throwOnError: true }]],
}})
```

각 plugin을 설치하고 최신 @next/mdx를 사용한다. function option은 Rust로 전달할 수 없어 아직 지원하지 않는다. remark/rehype 생태계는 syntax highlighting, heading 자동 link와 TOC 생성 등을 제공한다.

```js
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
const file = await unified().use(remarkParse).use(remarkRehype)
  .use(rehypeSanitize).use(rehypeStringify).process('Hello, Next.js!')
console.log(String(file)) // <p>Hello, Next.js!</p>
```

이는 Markdown AST에서 HTML AST, sanitize, HTML 직렬화까지의 설명 예제다. @next/mdx 사용자가 이 pipeline을 직접 중복 구현할 필요는 없다. MDX 실행 코드 신뢰와 HTML sanitize는 다른 경계다.

## 실험적 Rust compiler

```js
import createMDX from '@next/mdx'
const withMDX = createMDX({})
export default withMDX({ experimental: { mdxRs: true } })
```

mdxRs 객체 옵션은 jsxRuntime string, jsxImportSource string, providerImportSource string(useMDXComponents context module), mdxType gfm/commonmark다. 원문 `jsxRuntime?: string` 같은 코드는 타입 설명으로 실제 JS가 아니므로 값이 필요한 옵션만 실제 string으로 넣는다. 아직 실험적이며 production 권장 기능이 아니다. Portfolio Starter Kit는 통합 예제이고 MDX/@next/mdx/remark/rehype/Markdoc 자료는 별도 참고 도구다.

## 출처

- [Next.js, MDX Pages](https://nextjs.org/docs/pages/guides/mdx)
- [Next.js, MDX App](https://nextjs.org/docs/app/guides/mdx)

## 관련 문서

- [[NextJS-MDX]]
- [[NextJS-Pages-Fonts-CSS-MDX]]
