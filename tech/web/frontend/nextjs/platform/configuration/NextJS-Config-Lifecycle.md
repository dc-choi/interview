---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 설정 로딩과 생명주기", "NextJS-Config-Lifecycle"]
---

# Next.js 설정 로딩과 생명주기

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## next.config.js

`next.config.js`는 프로젝트 루트에서 Node.js가 읽는 실행 가능한 모듈이다. JSON이 아니고 브라우저에 설정 파일 자체를 번들링하지 않는다. 서버와 빌드가 사용하므로 설치된 Node.js가 지원하는 문법과 의존성으로 작성한다. 개별 옵션이나 `env`의 값은 클라이언트 산출물에 포함될 수 있다.

CommonJS에서는 `module.exports`, ESM에서는 `next.config.mjs`의 `export default`, TypeScript에서는 `next.config.ts`와 `NextConfig` 타입을 쓴다. 일반 로더에서 `.cjs`, `.cts` 확장자의 `next.config`는 지원하지 않는다. Node.js native TypeScript resolver와 `.mts`의 조건은 [[NextJS-TypeScript]]에서 구분한다.

```ts
import type { NextConfig } from 'next'

const config: NextConfig = { reactStrictMode: true }
export default config
```

설정은 객체 또는 `(phase, { defaultConfig }) => NextConfig` 함수로 내보낼 수 있다. 12.1부터 비동기 함수도 지원한다. `defaultConfig`는 전달된 기본 설정이며, 단계별 분기를 애플리케이션 런타임 분기와 혼동하지 않는다.

## phase

`next/constants`에서 phase 상수를 가져와 개발 서버와 production build 등을 구분한다. 설정을 읽는 다른 CLI도 있으므로 `next build` 때만 실행된다고 가정하면 안 된다. `next typegen`은 production build phase로 설정을 로드한다. 설정에서 환경 변수나 외부 모듈을 요구하면 typegen에도 제공해야 한다.

```js
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'

export default (phase) => ({
  assetPrefix: phase === PHASE_DEVELOPMENT_SERVER
    ? undefined
    : 'https://cdn.example.com',
})
```

## 설정 검증

15.1부터 실험 유틸리티 `unstable_getResponseFromNextConfig`에 URL과 nextConfig를 넘겨 headers, redirects, rewrites의 결과 `NextResponse`를 확인할 수 있다. `getRedirectUrl`로 목적지도 검사한다. 이 검사는 Proxy와 파일시스템 라우트를 실행하지 않으므로 실제 라우팅 결과는 production 요청으로 다시 확인한다.

```ts
import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from 'next/experimental/testing/server'

const result = await unstable_getResponseFromNextConfig({
  url: 'https://example.com/old',
  nextConfig: {
    redirects: async () => [
      { source: '/old', destination: '/new', permanent: false },
    ],
  },
})
console.assert(result.status === 307)
console.assert(getRedirectUrl(result) === 'https://example.com/new')
```

## appDir

`experimental.appDir`는 App Router 도입 당시의 레거시 설정이다. 13.4부터 App Router가 안정화되어 새 애플리케이션에 이 플래그가 필요하지 않다. `app/`의 존재로 layouts, Server Components, streaming과 colocated fetching을 사용한다.

## adapterPath

문자열 경로 `adapterPath: require.resolve('./adapter.js')`로 빌드 adapter를 등록하거나 플랫폼이 `NEXT_ADAPTER_PATH`를 주입할 수 있다. Adapter는 설정 수정과 빌드 결과 패키징의 확장 지점이다. HTTP 서버나 캐시 저장소를 이 설정만으로 구현하는 것은 아니다. 계약과 호출 단계는 [[NextJS-Adapter-Lifecycle]]에 둔다.

## 운영 확인

설정 변경 후 `next dev`와 `next build`를 모두 확인한다. 개발 분기에만 넣은 값을 production에 기대하지 않는다. 빌드 시 인라인되는 `basePath`, 환경 변수와 asset hash를 바꾸려면 재빌드한다. 실험 옵션 이름과 안정화 여부는 설치 버전별로 확인한다.

## appDir와 Strict Mode

App 디렉터리는 React Strict Mode를 자동 활성화한다. experimental.appDir은 13.4부터 불필요한 레거시 flag이며 유지되는 호환 API를 신규 설정으로 권하지 않는다.

## webpack callback 계약

custom webpack 설정은 semver 보장 밖이며 built-in CSS/Modules/Sass 기능과 @next/mdx, @next/bundle-analyzer로 해결되는지 먼저 확인한다. Turbopack에서는 webpack callback을 사용하지 않는다.

~~~js
webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
  // 필요한 rule/plugin을 추가한 뒤 반드시 반환한다.
  return config
}
~~~

callback은 Node server, Edge server, client의 세 compilation에서 실행된다. buildId는 build 식별 문자열, dev/isServer는 boolean이다. nextRuntime은 server의 nodejs 또는 edge, client에서는 undefined이며 두 server 모두 isServer true다. defaultLoaders.babel은 Next.js의 기본 babel-loader 설정이다. MDX 예시는 config.module.rules.push({test:/\.mdx/,use:[options.defaultLoaders.babel,{loader:'@mdx-js/loader',options:pluginOptions.options}]})로 Babel 의존 loader를 연결한다. 이는 plugin 내부 맥락을 설명하는 예시이며 pluginOptions를 정의하지 않은 채 독립 설정으로 복사하지 않는다.

App 문서는 Edge 대상을 Proxy/Edge Server Components라고 적지만 현재 Node Proxy 조건과 충돌하는 오래된 설명일 수 있다. callback의 nextRuntime 값으로 실제 compile 대상을 판별하고 Proxy는 설치 버전의 runtime 계약을 별도로 따른다.

## 출처

- [Next.js, app/api-reference/config/next-config-js](https://nextjs.org/docs/app/api-reference/config/next-config-js)
- [Next.js, pages/api-reference/config/next-config-js](https://nextjs.org/docs/pages/api-reference/config/next-config-js)
- [Next.js, app/api-reference/config/next-config-js/appDir](https://nextjs.org/docs/app/api-reference/config/next-config-js/appDir)
- [Next.js, app/api-reference/config/next-config-js/adapterPath](https://nextjs.org/docs/app/api-reference/config/next-config-js/adapterPath)
- [Next.js, pages/api-reference/config/next-config-js/adapterPath](https://nextjs.org/docs/pages/api-reference/config/next-config-js/adapterPath)

- [Next.js, webpack](https://nextjs.org/docs/app/api-reference/config/next-config-js/webpack)

- [Next.js, webpack](https://nextjs.org/docs/pages/api-reference/config/next-config-js/webpack)

## 관련 문서

- [[NextJS-TypeScript]]
- [[NextJS-Adapter-Lifecycle]]
