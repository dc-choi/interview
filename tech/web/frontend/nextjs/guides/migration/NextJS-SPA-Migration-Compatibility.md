---
tags: [nextjs, migration, upgrade]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["SPA migration의 env, TypeScript와 bundler 호환"]
---

# SPA migration의 env, TypeScript와 bundler 호환

## 환경 변수와 공개 범위

CRA의 REACT_APP_, Vite의 VITE_로 browser에 공개하던 값은 Next의 NEXT_PUBLIC_로 옮긴다. prefix 변경은 secret 보호의 수단이 아니라 명시적인 browser 공개 선언이다. 기존 client 공개값인지 확인하고 database credential 같은 server secret에 무조건 prefix를 붙이지 않는다. .env file loading과 실제 process.env reference를 함께 옮긴다.

현재 Turbopack은 Vite의 import.meta.env.MODE/DEV/PROD/BASE_URL/SSR를 지원한다. BASE_URL은 Next basePath를 반영하며 Vite처럼 trailing slash를 포함한다. 이 지원을 임의 user-defined import.meta.env.VITE_X 또는 Webpack의 같은 지원으로 확대하지 않는다. VITE_X 사용 위치는 NEXT_PUBLIC_X의 process.env 접근으로 실제 변환한다.

Turbopack은 import.meta.glob도 지원한다. Vite5에서 deprecated된 as:'raw'는 query:'?raw'로 바꾼다. glob의 lazy/eager/key와 default import 설정이 기존 동작을 유지하는지 확인한다. 모든 Vite plugin API가 지원된다는 의미는 아니다.

```js
const modules = import.meta.glob('./content/*.txt', { query: '?raw' })
```

## basePath, backend와 worker

CRA package.homepage 또는 Vite base의 subpath는 next.config basePath로 대응한다. router basename, asset URL, links, manifest/start_url, backend path도 같이 검증한다. `%PUBLIC_URL%`와 absolute slash asset을 두면 subpath deployment에서 깨질 수 있다.

CRA package.proxy의 backend forwarding은 server mode의 next.config rewrites로 옮길 수 있다. output export에는 server rewrite 실행이 없으므로 static host/CDN/backend CORS에서 같은 요구를 해결해야 한다. Proxy file과 rewrite config는 서로 다른 기능이다.

기존 service worker는 필요한 script 위치와 browser-only 등록 시점을 보존한다. official CRA 예시는 new URL(..., import.meta.url) registration을 안내하지만 build 산출물의 실제 URL/worker scope/cache/version-update를 검사한다. 기존 stale asset cache가 새 Next deploy 파일을 덮지 않도록 upgrade/cleanup 정책을 정한다.

## TypeScript의 생성 파일

next-env.d.ts는 Next가 생성하며 include하고 직접 custom type을 덧붙이지 않는다. Vite tsconfig.node reference를 제거하더라도 다른 tooling이 그 config를 쓰는지 확인한다. generated route types는 distDir에 따른 types path를 include한다.

Vite 예시 변경은 plugins의 next, esModuleInterop, jsx=react-jsx, allowJs, forceConsistentCasingInFileNames, incremental과 noEmit 등 Next-compatible 옵션을 맞춘다. target/lib/moduleResolution과 기존 strict/noUnused 설정은 project 요구에 맞춰 유지한다. .src 오류를 무조건 suppress하지 말고 generated declaration이 실제로 포함되는지 확인한다.

## bundler와 명령

Next16의 dev/build 기본은 Turbopack이다. CRA의 custom Webpack/Babel 설정을 유지하려면 사용하는 명령에 --webpack을 적용하거나 지원되는 Turbopack options로 옮긴다. dev만 --webpack이고 build는 Turbopack이면 검증 환경이 다르다. custom plugin이 webpack config를 주입하는 경우도 확인한다.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "serve ./dist"
  }
}
```

위 start는 Vite 예시와 같은 static export 산출물을 제공하는 역할의 예시이며 serve를 실제 project dependency/host에 맞게 선택한다. server output을 사용하면 next start로 production server를 실행한다. source의 Vite guide는 export 설정 옆에 next start를 보여 주지만 두 배포 계약을 함께 지원한다는 의미로 받아들이지 않는다.

CRA의 test configuration/manifest/icon/reportWebVitals는 Next가 자동으로 같은 setup으로 이식하지 않는다. test runner와 instrumentation을 명시적으로 연결한다. build output, .next/dev, next-env.d.ts, custom distDir generated files의 ignore/CI cache도 점검한다.

## Vite TypeScript와 CRA custom 구성 전체 예제

```json
{
  "compilerOptions": {
    "target": "ES2020", "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"], "module": "ESNext",
    "esModuleInterop": true, "skipLibCheck": true, "moduleResolution": "bundler",
    "allowImportingTsExtensions": true, "resolveJsonModule": true,
    "isolatedModules": true, "noEmit": true, "jsx": "react-jsx", "strict": true,
    "noUnusedLocals": true, "noUnusedParameters": true, "noFallthroughCasesInSwitch": true,
    "allowJs": true, "forceConsistentCasingInFileNames": true, "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["./src", "./dist/types/**/*.ts", "./next-env.d.ts"],
  "exclude": ["./node_modules"]
}
```

Vite의 tsconfig.node.json project reference는 제거하고 위 generated declaration과 plugin을 추가한다. CRA의 include는 `['next-env.d.ts','app/**/*','src/**/*']` 형태로 실제 위치를 맞춘다. TS를 쓰지 않으면 이 단계는 생략한다. next-env.d.ts는 dev 실행 때 생성된다. 이미지 .src type 오류를 그냥 suppress하기보다 include/생성 여부를 고친다.

```ts
// next.config.ts: CRA homepage/proxy/custom webpack 대응
import type { NextConfig } from 'next'
const config: NextConfig = {
  basePath: '/my-subpath',
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'https://your-backend.com/:path*' }]
  },
  webpack(configuration, { isServer }) {
    // 필요한 기존 변환을 server/client 조건에 맞게 추가한다.
    return configuration
  },
}
export default config
```

rewrites는 output export의 static host에서 실행되지 않는다. custom webpack은 next dev/build --webpack을 적용한다. Vite base는 basePath:'/some-base-path'로 대응하고 BASE_URL에는 trailing slash가 있다. import.meta.env MODE/DEV/PROD/BASE_URL/SSR와 import.meta.glob 지원은 Turbopack 범위다. `glob('./dir/*.txt',{as:'raw'})`는 `glob('./dir/*.txt',{query:'?raw'})`로 바꾼다. 공개 env prefix만 CRA REACT_APP_ 또는 Vite VITE_→NEXT_PUBLIC_로 옮기고 사용 코드도 process.env.NEXT_PUBLIC_*로 바꾼다.

```ts
// browser-only 실행 위치, public/serviceWorker.js가 있는 예
if ('serviceWorker' in navigator) {
  await navigator.serviceWorker.register('/serviceWorker.js')
}
```

원문 new URL('../serviceWorker.js',import.meta.url) 방식은 실제 emitted worker URL이 올바를 때 사용할 수 있고 두 번째 옵션은 구체 객체여야 한다. 생략부 `...`는 실행 가능한 JS가 아니다. service worker의 scope와 basePath, 새 asset cache 정리를 함께 맞춘다.

CRA cleanup은 public/index.html/src/index.tsx/src/react-app-env.d.ts/reportWebVitals/react-scripts다. Vite cleanup은 main.tsx/index.html/vite-env.d.ts/tsconfig.node.json/vite.config.ts와 Vite 의존성이다. 다른 tooling caller가 남지 않았는지 확인한다. CRA custom homepage/service worker/Babel/webpack/시험 설정은 별도 이식 후 삭제한다. React Router를 남긴 SPA에서 useParams는 그 router hook과 Next hook을 구분한다. 원문 static export useParams 전면 미지원 주장은 현재 모든 정적 Next route의 제한으로 확대하지 않는다.

## 이해 확인

1. VITE_ prefix를 NEXT_PUBLIC_로 바꾸면 그 값이 secret이 되는가?
2. Turbopack에서 지원하는 glob이 Webpack에서도 자동 지원된다고 말할 수 있는가?
3. output export 프로젝트의 API proxy rewrite는 어느 host에서 실행해야 하는가?

## 출처

- [Next.js, from-create-react-app](https://nextjs.org/docs/app/guides/migrating/from-create-react-app)
- [Next.js, from-vite](https://nextjs.org/docs/app/guides/migrating/from-vite)

## 관련 문서

- [[NextJS-SPA-to-App-Migration]]
- [[NextJS-Upgrade-16-Build-and-Assets]]
- [[NextJS-App-Instrumentation]]
- [[NextJS-App-Request-Proxy]]
