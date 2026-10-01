---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["CSS-in-JS의 SSR registry와 streaming", "NextJS CSS in JS"]
---

# CSS-in-JS의 SSR registry와 streaming

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 렌더 중 생성한 CSS를 먼저 보낸다

runtime CSS-in-JS는 컴포넌트 렌더 과정에서 rule을 만든다. SSR/Streaming에서는 해당 markup보다 먼저 스타일을 보내야 FOUC와 순서 문제가 줄어든다. concurrent rendering에서도 렌더별 rule을 올바르게 모으는 library 지원이 필요하다.

App 설정은 registry로 rules 수집, useServerInsertedHTML로 사용 content 전에 주입, Client registry로 초기 SSR tree를 감싸는 세 단계다. Client wrapper의 children으로 Server Component 결과를 전달할 수 있으므로 wrapper가 모든 자식 module을 Client로 바꾼다고 해석하지 않는다.

## styled-jsx registry

Client Components에는 styled-jsx5.1.0 이상 지원을 확인한다. lazy useState로 registry를 해당 instance당 한 번 만들고 chunk styles를 가져온 뒤 flush한다.

~~~tsx
'use client'
import { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { createStyleRegistry, StyleRegistry } from 'styled-jsx'
export default function Registry({ children }: { children: React.ReactNode }) {
  const [registry] = useState(() => createStyleRegistry())
  useServerInsertedHTML(() => {
    const styles = registry.styles()
    registry.flush()
    return <>{styles}</>
  })
  return <StyleRegistry registry={registry}>{children}</StyleRegistry>
}
~~~

root layout에서 body 안의 children을 registry로 감싼다. module-level singleton으로 서로 다른 요청의 styles를 공유하지 않는다. flush는 이전 chunk rules를 반복 보내지 않기 위한 단계다.

## styled-components registry

6 이상 예시이며 compiler.styledComponents를 켠다. ServerStyleSheet를 lazy 생성하고 서버에서는 StyleSheetManager로 수집한다. browser에서는 children을 그대로 반환해 library의 client 처리를 맡긴다.

~~~tsx
'use client'
import { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'
export default function Registry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet())
  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement()
    sheet.instance.clearTag()
    return <>{styles}</>
  })
  if (typeof window !== 'undefined') return <>{children}</>
  return <StyleSheetManager sheet={sheet.instance}>
    {children}
  </StyleSheetManager>
}
~~~

설정은 `compiler: { styledComponents: true }`다. 초기 서버 렌더에서 수집한 styles는 head로 flush되고 stream chunk마다 추가된다. hydration 뒤 동적 styles는 styled-components가 처리한다. compiler flag만으로 registry가 생기지는 않는다.

## 라이브러리 선택과 제약

공식 지원 목록은 Client Components 기준으로 ant-design, chakra-ui, Fluent UI, kuma-ui, MUI material/joy, pandacss, styled-jsx, styled-components, stylex, tamagui, tss-react, vanilla-extract를 포함한다. 이는 모두 동일 runtime 구현이라는 뜻이 아니며 각 integration 문서를 따른다.

Emotion은 이 snapshot에서 App 지원 작업 진행 중 목록이다. 일반 React 지원과 App/RSC/Streaming 지원을 구분하며 해당 버전의 integration이 실제로 해결됐는지 확인한다. library 내부의 현재 지원을 목록만으로 추정하지 않는다.

registry를 Client 경계에 두는 이유는 스타일 추출을 관리하고 Server Component payload에 rules를 중복 보내지 않도록 하기 위해서다. Pages의 styled-jsx 지원과 _document extraction 계약을 App registry에 그대로 적용하지 않는다.

## root layout의 실제 wrapper

```tsx
// app/layout.tsx: 위 registry 구현 중 해당 라이브러리에 맞는 것 사용
import Registry from './registry'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Registry>{children}</Registry></body></html>
}
```

styled-jsx registry 파일은 예시에서 lib/registry.tsx, styled-components는 lib/registry.tsx 등 실제 위치를 정하고 import를 맞춘다. compile-time CSS(CSS Modules/Tailwind/PostCSS)와 runtime CSS-in-JS 중 요구에 맞는 방식을 선택한다.

## 운영 및 학습 확인

- 서버 요청 간 stylesheet가 공유되지 않도록 lazy state와 요청 instance를 확인한다.
- 느린 chunk를 만들어 markup보다 스타일이 먼저 오는지 확인한다.
- 첫 로드, client navigation, hydration 후 동적 theme 변경을 각각 확인한다.

## 출처

- [Next.js, css-in-js](https://nextjs.org/docs/app/guides/css-in-js)

## 관련 문서

- [[NextJS-Styling-and-MDX]]
- [[NextJS-Pages-Fonts-CSS-MDX]]
