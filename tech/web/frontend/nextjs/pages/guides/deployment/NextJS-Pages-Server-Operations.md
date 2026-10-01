---
tags: [nextjs, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router 서버 배포와 번들 운영의 차이"]
---

# Pages Router 서버 배포와 번들 운영의 차이

Next.js 16.3.8 공식 문서를 기준으로 설명한다. 과거 버전 변경은 해당 버전으로 한정한다.

## Pages 서버 dependency bundling

Pages는 외부 dependency의 server bundling이 기본으로 모두 활성화되어 있지 않다. 원문의 기본 미번들 설명은 server 외부 패키지에 대한 것으로 browser dependency까지 그대로 적용하지 않는다.

```js
module.exports = {
  transpilePackages: ['package-name'],
  bundlePagesRouterDependencies: true,
  serverExternalPackages: ['native-package'],
  experimental: { optimizePackageImports: ['icon-library'] },
}
```

transpilePackages는 monorepo/node_modules의 특정 package를 transpile/bundle한다. bundlePagesRouterDependencies의 기본 false를 true로 바꾸면 Pages 서버 dependency를 자동 bundle하고 serverExternalPackages로 일부를 opt-out한다. optimizePackageImports는 hundreds named exports 중 사용한 module로 import 해석을 줄인다. 이미 자동 최적화되는 package는 중복 목록이 필요 없다. Turbopack/webpack 분석 절차는 공통 [[NextJS-Package-Bundling]]에서 따르되 실제 bundler를 맞춘다.

## App highlighter 예제를 Pages SSG로 바꾼다

원문의 `app/blog/[slug]/page.tsx` Client Component Prism 예제는 library/tokenization까지 browser bundle에 포함하는 문제를 설명한다. App의 Shiki Server Component 대안은 Pages에서 그대로 사용할 수 없다. Pages는 getStaticProps에서 변환하고 문자열만 반환한다. 서버 데이터 함수에만 사용한 dependency가 client code에 import되지 않도록 확인한다.

```tsx
// pages/blog/index.tsx
import type { GetStaticProps, InferGetStaticPropsType } from 'next'
export const getStaticProps: GetStaticProps<{ html: string }> = async () => {
  const { codeToHtml } = await import('shiki')
  const code = 'export function hello() { console.log("hi") }'
  const html = await codeToHtml(code, { lang: 'tsx', theme: 'github-dark' })
  return { props: { html } }
}
export default function Blog({ html }: InferGetStaticPropsType<typeof getStaticProps>) {
  return <article><h1>Blog Post Title</h1>
    <div dangerouslySetInnerHTML={{ __html: html }}/>
  </article>
}
```

Shiki가 생성한 전체 HTML을 다시 pre/code로 감싸면 중첩이 잘못될 수 있어 div에 넣는다. 입력은 신뢰 범위를 검증하고 외부 HTML을 그대로 넣지 않는다. syntax highlighting/chart/markdown 변환에 browser API나 사용자 interaction이 필요 없으면 서버에서 처리할 수 있다. 분석 UI의 import chain으로 library가 실제 browser에서 제거됐는지 확인한다.

## SSR runtime env와 ISR cache header

SSR 요청은 getServerSideProps에서 현재 env를 읽고 공개 가능한 결과만 props로 보낸다. static props의 env는 build/ISR 실행 시점에 평가된다. 전체 load 계약은 [[NextJS-Environment-Variables]]에 있다.

ISR의 shared cache는 `s-maxage=<getStaticProps revalidate 초>, stale-while-revalidate`로 설명되며 revalidate false는 1년 cache 기간을 사용한다. immutable hash asset은 `public, max-age=31536000, immutable`이고 override할 수 없다. dynamic/Draft 응답은 `private, no-cache, no-store, max-age=0, must-revalidate`다. public 일반 파일은 이 hash asset과 다르다. CDN은 directive와 variant key를 존중해야 오래된 client data가 섞이지 않는다.

50MB memory와 instance별 disk cache는 ephemeral/container 환경에서 공유가 아니다. `cacheHandler: require.resolve('./cache-handler.js')`, `cacheMaxMemorySize: 0`으로 durable backend를 구성하고 eviction/장애/tag coordination을 구현한다. 예제 Map 하나가 여러 pod 일관성을 보장하지 않는다. Pages ISR은 기존 cacheHandler를 사용하며 App `'use cache: remote'`와 cacheHandlers를 Pages 필수로 적용하지 않는다.

## build와 deployment ID

같은 build output을 여러 container에 사용한다. stage마다 다시 build할 때 generateBuildId의 GIT_HASH를 일관되게 정한다. deploymentId를 설정하면 constant build ID를 사용하며 generateBuildId는 효과가 없다.

```js
module.exports = {
  generateBuildId: async () => process.env.GIT_HASH,
  deploymentId: process.env.DEPLOYMENT_VERSION,
}
```

deploymentId가 있으면 asset의 `?dpl=...`, client navigation의 `x-deployment-id`와 서버 비교로 version skew를 감지하고 mismatch는 hard reload로 처리한다. missing assets, 구버전 prefetched data와 새 서버의 불일치를 방지하는 목적이다. reload는 useState를 잃지만 URL/localStorage 상태는 보존할 수 있다. Server Action ID mismatch/encryption key는 App 서버 기능을 쓰는 경우에 적용하며 Pages API의 필수 구성은 아니다.

## 종료 신호를 Document에서 등록

```json
{"scripts":{"dev":"next dev","build":"next build",
"start":"NEXT_MANUAL_SIG_HANDLE=true next start"}}
```

```js
// pages/_document.js module scope
if (process.env.NEXT_MANUAL_SIG_HANDLE === 'true') {
  const shutdown = async () => {
    await stopBackgroundJobs()
    process.exit(0)
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}
```

stopBackgroundJobs는 앱이 구현하는 정리 함수이고 실패/timeout/중복 신호 정책도 운영에서 정한다. 원문의 즉시 exit는 완료할 작업이 없는 단순 예제이므로 실제 drain 작업을 건너뛰지 않는다. flag는 .env가 아니라 start process env에 직접 지정하고 next dev에서는 지원하지 않는다. hot reload에서 중복 handler를 만들지 않게 production 경로만 적용한다.

## custom server의 Pages filename route 차단

공통 next({}) 옵션, prepare/handle 및 header 순서는 [[NextJS-Custom-Server]]에서 따른다. Pages custom server가 다른 URL로 같은 페이지를 제공하면 중복 content의 SEO/UX 문제가 생길 수 있다.

```js
// next.config.js
module.exports = { useFileSystemPublicRoutes: false }
```

이 옵션은 SSR filename route만 비활성화한다. client router가 접근하는 URL까지 모두 차단하지 않으므로 허용 URL 검사와 [[NextJS-Pages-Router-API]]의 beforePopState도 검토한다. Pages의 전체 Node 서버에서 Proxy는 별도 설정 없이 작동하고 export에서는 요청 처리 기능을 쓸 수 없다. App layout Server Component로 옮기라는 원문 대안은 Pages에는 적용되지 않는다. Pages는 데이터 함수/API/설정 rewrite/redirect 또는 custom server가 대응한다.

## 출처

- [Next.js, package bundling](https://nextjs.org/docs/pages/guides/package-bundling)
- [Next.js, self hosting](https://nextjs.org/docs/pages/guides/self-hosting)
- [Next.js, custom server](https://nextjs.org/docs/pages/guides/custom-server)

## 관련 문서

- [[NextJS-Pages-Deployment]]
- [[NextJS-Package-Bundling]]
- [[NextJS-Self-Hosting]]
- [[NextJS-Custom-Server]]
