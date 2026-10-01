---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 패키지 변환과 번들 경계", "NextJS-Config-Dependencies"]
---

# Next.js 패키지 변환과 번들 경계

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## transpilePackages

`transpilePackages: string[]`는 workspace와 node_modules 패키지의 TS, JSX, 현대 문법을 변환하고 번들에 포함한다. 13.0에서 도입됐으며 `next-transpile-modules` 대신 내장 설정을 사용한다. 앱이 소비하는 패키지의 배포 문법이 browser/runtime target에 맞지 않거나 monorepo의 소스 패키지를 직접 쓸 때 필요하다.

```js
export default { transpilePackages: ['@acme/ui'] }
```

패키지가 `transpilePackages`와 `serverExternalPackages` 양쪽에 있으면 build 시작 시 오류가 난다. optimizePackageImports에 지정된 패키지와 기본 transpiled 목록은 자동 추가되므로 중복 설정이 필요하지 않다.

## serverExternalPackages

App Router의 Server Components와 Route Handlers는 의존성을 자동 번들링한다. `serverExternalPackages: string[]`로 특정 패키지를 제외하면 Node.js의 native require로 런타임에 해석한다. native addon이나 Node.js 고유 동작에 의존할 때 사용할 수 있다. 15.0에서 안정화되며 `experimental.serverComponentsExternalPackages`에서 이름이 바뀌었다.

기본 자동 제외 목록에는 Prisma, sharp, bcrypt, better-sqlite3, pg, pino, Playwright/Puppeteer, 일부 observability agent 등이 있다. 목록은 설치 버전의 source와 레퍼런스를 확인한다. 외부화는 패키지를 없애는 기능이 아니므로 배포에 실제 패키지와 native binary를 포함해야 한다. Node.js API 의존성을 Edge에서 실행 가능하게 만들어 주지도 않는다.

## bundlePagesRouterDependencies

Pages Router에서는 `bundlePagesRouterDependencies: true`로 server dependency 자동 bundling을 활성화할 수 있다. 제외가 필요하면 같은 top-level `serverExternalPackages`를 사용한다. App의 기본 bundling과 Pages의 이 설정을 구분한다. boolean 설정으로 기존 서버 패키징을 바꾸므로 native addon과 runtime resolution을 확인한다.

## optimizePackageImports

실험 옵션 `experimental.optimizePackageImports: string[]`는 수백 개 named export가 있는 barrel 패키지에서 실제 사용하는 module을 로드하도록 최적화한다. named import 문법을 유지하면서 과한 개발/production 작업을 줄인다. lodash-es, date-fns, lucide-react, antd, MUI, rxjs, react-icons, effect 계열 등은 기본 최적화 목록에 포함된다.

```js
export default {
  experimental: { optimizePackageImports: ['large-icon-library'] },
}
```

13.5부터 수동 경로 매핑이 필요한 modularizeImports의 대안으로 권장된다. export side effect, server/client 경계와 bundle 분석으로 효과를 확인한다. 패키지 이름만 추가했다고 모든 앱이 빨라진다고 단정하지 않는다.

## pageExtensions

`pageExtensions: string[]`의 기본 확장자는 `tsx`, `ts`, `jsx`, `js`다. MDX 지원 또는 Pages 파일 suffix 규칙에 맞춰 배열을 교체한다. 새 확장자만 추가하고 기본 확장자를 빼면 기존 route가 사라질 수 있다.

```js
export default { pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mdx'] }
```

Pages Router에서는 `_app`, `_document`, API routes와 `proxy`, `instrumentation`에도 이 규칙이 적용된다. `['page.tsx', 'page.ts']`를 쓰면 `_app.page.tsx`, `proxy.page.ts`, `instrumentation.page.ts` 등 special file 이름도 맞춘다. App file convention과 Pages suffix 전략을 같은 것으로 취급하지 않는다.

## webpack

webpack을 선택한 경우 `webpack(config, context)`가 수정된 config를 반환해야 한다. context는 `buildId`, `dev`, `isServer`, `nextRuntime`, `defaultLoaders`, `webpack`을 제공한다. client 한 번, nodejs/edge server 두 번 호출되므로 `isServer`만으로 target을 하나로 취급하지 않는다. client의 nextRuntime은 undefined다.

```js
export default {
  webpack: (config, { isServer }) => {
    if (!isServer) config.resolve.alias['server-only-package'] = false
    return config
  },
}
```

Next.js가 내장 지원하는 CSS/Sass에 loader를 다시 추가하지 않는다. webpack config 내부 변경은 semver 보장 대상이 아니며 Turbopack은 이 함수를 읽지 않는다. compiler와 loader의 차이는 [[NextJS-Turbopack-Configuration]]에서 확인한다.

## optimizePackageImports 기본 대상

experimental.optimizePackageImports는 수백/수천 named export의 barrel에서 실제 쓰는 modules만 로드하도록 최적화한다. 기본 목록에는 lucide-react, date-fns, lodash-es, ramda, antd, react-bootstrap, ahooks, @ant-design/icons, @headlessui/react, @headlessui-float/react, @heroicons/react/20/solid, @heroicons/react/24/solid, @heroicons/react/24/outline이 있다.

또한 @visx/visx, @tremor/react, rxjs, @mui/material, @mui/icons-material, recharts, react-use, @material-ui/core, @material-ui/icons, @tabler/icons-react, mui-core, react-icons/*, effect, @effect/*가 기본 최적화된다. 현재 목록을 모든 이후 버전의 고정 목록으로 취급하지 않는다. 필요한 package는 string[]에 추가한다.

## 자동 외부화 상세

16.3.8의 전체 기본 package 이름은 [[NextJS-Config-External-Packages]]에 보존한다. App/Pages 옵션의 bundling 기본 차이를 확인한 뒤 같은 목록을 재사용한다.

## transpilePackages의 이름과 자동 처리 범위

transpilePackages는 ['package-name', '@scope/pkg']처럼 package name 배열이다. filesystem path나 glob은 지원하지 않는다. 기존 next-transpile-modules의 역할을 내장 기능으로 옮겼으며 13.0에 도입됐다.

| 상황 | 기본 처리 / 명시가 필요한 이유 |
| --- | --- |
| Turbopack의 workspace import | App/Pages 모두 자동 transpile |
| webpack의 App workspace import | 자동 transpile |
| webpack의 Pages workspace import | apps/web 밖 packages/ui 같은 의존성은 명시 |
| node_modules의 raw TS/JSX | 기본 compile 대상이 아니므로 명시 |
| 이미 plain JS로 빌드한 package | main/exports가 빌드 결과를 가리키면 대개 추가 불필요 |

Pages의 node_modules server dependency는 기본적으로 Node require로 실행한다. transpilePackages에 넣으면 해당 package를 bundle에 포함한다. App server dependency는 기본 bundle하되 serverExternalPackages가 opt out한다. 같은 이름을 두 배열에 넣으면 external과 transpile 요구가 충돌해 build 시작 시 오류가 난다. optimizePackageImports 대상과 Next.js의 기본 transpile 목록은 자동으로 transpile 대상에 추가된다.

## Pages server bundling과 external

bundlePagesRouterDependencies:true는 Pages server dependency를 App처럼 자동 bundle한다. 15.0에 experimental.bundlePagesExternals에서 stable top-level 이름으로 바뀌었다. serverExternalPackages는 이 bundling에서 package를 제외하고 native Node require로 실행하게 한다. App의 기본 bundling과 달리 Pages는 이 선택이 전제다. transpilePackages와 external에 같은 package를 지정하면 충돌한다. 기본 opt-out package 목록은 [[NextJS-Config-External-Packages]]에 둔다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)
- [Next.js, pages/api-reference/config/next-config-js/transpilePackages](https://nextjs.org/docs/pages/api-reference/config/next-config-js/transpilePackages)
- [Next.js, app/api-reference/config/next-config-js/serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
- [Next.js, pages/api-reference/config/next-config-js/serverExternalPackages](https://nextjs.org/docs/pages/api-reference/config/next-config-js/serverExternalPackages)
- [Next.js, pages/api-reference/config/next-config-js/bundlePagesRouterDependencies](https://nextjs.org/docs/pages/api-reference/config/next-config-js/bundlePagesRouterDependencies)
- [Next.js, app/api-reference/config/next-config-js/optimizePackageImports](https://nextjs.org/docs/app/api-reference/config/next-config-js/optimizePackageImports)
- [Next.js, pages/api-reference/config/next-config-js/optimizePackageImports](https://nextjs.org/docs/pages/api-reference/config/next-config-js/optimizePackageImports)
- [Next.js, app/api-reference/config/next-config-js/pageExtensions](https://nextjs.org/docs/app/api-reference/config/next-config-js/pageExtensions)
- [Next.js, pages/api-reference/config/next-config-js/pageExtensions](https://nextjs.org/docs/pages/api-reference/config/next-config-js/pageExtensions)
- [Next.js, app/api-reference/config/next-config-js/webpack](https://nextjs.org/docs/app/api-reference/config/next-config-js/webpack)
- [Next.js, pages/api-reference/config/next-config-js/webpack](https://nextjs.org/docs/pages/api-reference/config/next-config-js/webpack)

## 관련 문서

- [[NextJS-Turbopack-Configuration]]
- [[NextJS-Compiler]]
