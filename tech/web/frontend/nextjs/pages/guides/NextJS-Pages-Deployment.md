---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 배포, 환경변수와 static export", "NextJS Pages Deployment"]
---

# Pages Router의 배포, 환경변수와 static export

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 서버 기능이 필요한지 먼저 구분한다

Node server와 Docker는 SSR, API Routes, ISR과 기본 image optimizer를 제공할 수 있다. adapter는 각 플랫폼 지원을 확인한다. static export는 HTML/CSS/JS만 배포하므로 server 기능을 포함하지 않는다.

```js
module.exports = { output: 'export', trailingSlash: true }
```

`next build`가 기본 `out`에 생성한다. `next export`는 v14에 제거된 과거 명령이다. `trailingSlash: true`는 `/about/index.html` 형태를 사용하고 false는 `/about.html` 형태다. 정적 host의 try_files/404와 실제 URL을 맞춘다. `skipTrailingSlashRedirect`, `distDir`은 추가 경로 정책이다.

SSG 데이터 함수와 `getStaticPaths`로 동적 경로도 export할 수 있다. 모든 경로를 build에서 결정하고 fallback은 false로 둔다. Link prefetch, dynamic import, CSS와 CSR 조회는 가능하다. CSR이 별도 backend를 호출하는 구조는 export의 API Route가 실행되는 구조와 다르다.

지원하지 않는 기능은 SSR, API Routes, Proxy, ISR, Draft Mode, built-in i18n routing, runtime rewrites/redirects/headers, true/blocking fallback, 기본 image loader다. image는 custom 외부 loader 또는 unoptimized 정책을 선택한다. Node server용 config가 정적 host에도 자동 적용된다고 가정하지 않는다.

## 환경변수의 build와 runtime

`.env*`는 src 안이 아닌 프로젝트 루트에 둔다. 서버 데이터 함수와 API Routes에서 secret을 읽을 수 있으나 반환 props로 전달하면 브라우저에 노출된다. `NEXT_PUBLIC_`은 build에서 browser bundle에 고정되므로 같은 이미지를 승격해도 runtime env 변경이 반영되지 않는다.

runtime env는 `getServerSideProps`/API Route에서 읽는다. `getStaticProps`가 build에서 읽은 값은 생성 결과에 반영된 값이다. 동적 property 접근이나 process.env alias는 public inline 변환과 같은 방식으로 작동하지 않는다. `.env` 파일을 공개 저장소에 넣지 않는다. load 우선순위, test 모드와 외부 도구의 `@next/env`는 [[NextJS-Environment-and-Deployment]]에서 함께 확인한다.

## self-hosting의 cache와 배포 일관성

reverse proxy로 요청 크기, 느린 요청, rate와 외부 exposure를 제어한다. `next start`만으로 전체 ingress 정책이 해결되는 것은 아니다. image optimizer의 cache/disk와 ISR cache의 저장소를 운영에 맞춘다.

immutable hashed asset은 1년 cache, public 파일은 기본 max-age=0, 개인화 dynamic 응답은 private/no-store다. ISR은 revalidate 기반 shared cache 정책을 사용한다. CDN이 cache directives와 변형 key를 실제로 존중하는지 확인한다.

여러 instance에서는 동일 build와 asset을 배포하고 cache 공유, build/deployment ID, rolling version skew를 관리한다. Pages에 Server Actions encryption key나 App cache tag 정책을 필수로 붙이지 않는다. 공유 cache handler와 memory cache 비활성화는 실제 분산 topology의 일관성 요구에서 선택한다.

custom graceful shutdown이 필요하면 `NEXT_MANUAL_SIG_HANDLE=true`를 start 명령의 env에 지정하고 SIGINT/SIGTERM handler를 등록한다. `.env`에서 읽는 변수로 대신하지 않는다. next dev에서는 지원하지 않는다. handler는 작업 종료를 기다린 뒤 종료해야 하며 예제의 즉시 process.exit를 데이터 작업에 그대로 복사하지 않는다.

## custom server와 multi-zone

custom server는 별도 backend를 두는 것과 다르다. `next({ dev, dir, conf, hostname, port, quiet, httpServer, turbopack, webpack })`로 app을 만들고 `prepare()` 후 `getRequestHandler()`에 요청을 위임한다. built-in router가 실제 요구를 처리하지 못할 때 선택한다.

Next handler는 내부에서 응답을 시작하므로 Set-Cookie 등 소유한 header는 **handle 호출 전에** 설정한다. custom server 소스는 Next compiler/bundler가 처리하지 않으므로 Node가 직접 실행할 수 있어야 한다. standalone의 minimal server와 custom server를 결합하지 않는다.

`useFileSystemPublicRoutes: false`는 SSR의 filename routes를 끄지만 client navigation을 모두 차단하지 않는다. 허용 경로와 popstate도 직접 관리해야 한다. 중복 URL은 SEO/UX 문제를 만들 수 있다.

multi-zone은 같은 domain의 경로를 여러 앱으로 나누고 rewrite/proxy로 목적지를 정한다. assetPrefix와 고유 asset 경로를 맞추며 zone 간 이동은 hard navigation이므로 native anchor를 사용한다. 공유 디자인과 feature flag를 관리하되 Pages에 App Server Actions allowedOrigins 설정을 강제로 적용하지 않는다.

## production 확인

build 후 start로 자동 정적/SSR 판정, API 실패, 404/500, ISR, CSP, image/font 로딩과 CSS 순서를 확인한다. Lighthouse의 실험 결과와 실제 사용자 Web Vitals를 함께 본다. 번들 분석에서 큰 dependency를 찾고 route별 lazy loading을 판단한다. JSX accessibility lint와 수동 keyboard 확인도 별도다.

## 실행 모델과 공식 배포 예제

| 모델 | 지원 범위 | 실행과 산출물 |
| --- | --- | --- |
| Node.js | 모든 Next 서버 기능 | build 후 next start |
| Docker | 모든 Next 서버 기능 | Node runtime image와 ingress 운영 |
| static export | server 없는 기능으로 제한 | out의 HTML/CSS/JS, S3/Nginx/Apache 가능 |
| adapter | 플랫폼마다 다름 | adapterPath와 실제 compatibility 검증 |

```json
{"scripts":{"dev":"next dev","build":"next build","start":"next start"}}
```

`npm run build` 뒤 `npm run start`를 실행한다. Node 지원 provider는 사용할 수 있고 integrated router로 요구를 만족하지 못할 때만 custom server를 검토한다. Docker는 Kubernetes 등 orchestration도 가능하다. Mac/Windows 개발은 Docker filesystem overhead보다 로컬 dev가 빠를 수 있으므로 로컬 개발을 권장한다.

공식 container 예제는 [standalone](https://github.com/vercel/next.js/tree/canary/examples/with-docker)의 최소 runtime dependency, [export](https://github.com/vercel/next.js/tree/canary/examples/with-docker-export-output)의 정적 경량 image, [multi-environment](https://github.com/vercel/next.js/tree/canary/examples/with-docker-multi-env)의 dev/staging/production 구성으로 나뉜다. Docker의 [Next.js](https://docs.docker.com/guides/nextjs)/[React](https://docs.docker.com/guides/reactjs) container 지침도 연결한다.

Node template은 Flightcontrol/Railway/Replit/Hostinger, container provider 예제는 DigitalOcean/Fly.io/Google Cloud Run/Render/SST, 정적 template은 GitHub Pages가 있다. 이 목록은 원문의 배포 예제 진입점이며 플랫폼의 최신 지원/가격 추천이 아니다.

공식 문서 snapshot의 verified adapter는 Vercel/Bun이며 open source, Next GitHub organization 호스팅, 전체 compatibility suite 실행과 major 전 테스트 협업 조건을 갖는다. 공개 테스트 결과는 당시 공개 예정이었다. Cloudflare/Netlify는 verified adapter 작업 중이었으나 기존 통합과 구분한다. Appwrite Sites/AWS Amplify Hosting/Cloudflare/Deno Deploy/Firebase App Hosting/Netlify의 기존 통합은 public Adapter API 기반 검증 목록과 다르므로 provider별 기능 지원을 확인한다. 플랫폼 기능별 인프라 계약은 [[NextJS-Platform-Deployment]]에서 본다.

## Pages 데이터 함수에서 환경변수 읽기

공통 로딩/우선순위와 test 계약은 [[NextJS-Environment-Variables]]에 있다. Pages는 서버 데이터 함수/API Route에서 private 값을 읽고 build 또는 request 시점에 해당 작업을 실행한다.

```ts
// 서버 데이터 함수 내부, myDB는 프로젝트 driver
const db = await myDB.connect({
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
})
```

getStaticProps가 이 코드를 실행하면 build/재검증 시점의 값이다. getServerSideProps가 실행하면 요청 시점 값이다. DB 자격 증명이나 connection 자체를 props에 반환하지 않는다. `.env`의 `DB_HOST=localhost`, `DB_USER=myuser`, `DB_PASS=...`는 형식 예일 뿐 실제 비밀번호를 정본에 저장하지 않는다.

```tsx
// pages/index.tsx
import setupAnalyticsService from '../lib/my-analytics-service'
setupAnalyticsService(process.env.NEXT_PUBLIC_ANALYTICS_ID)
export default function Page() { return <h1>Hello World</h1> }
```

`NEXT_PUBLIC_ANALYTICS_ID=abcdefghijk`로 build하면 직접 접근이 해당 문자열로 바뀐다. dynamic key/별칭의 실패 예는 `process.env[varName]`, `const env=process.env; env.NEXT_PUBLIC_ANALYTICS_ID`다. runtime 공개 설정은 검증한 API 응답으로 제공해야 한다.

외부 ORM/test 설정은 먼저 `npm install @next/env`, envConfig.ts에서 `loadEnvConfig(process.cwd())`, orm.config.ts에서 `import './envConfig'` 순서를 지킨다. `defineConfig({dbCredentials:{connectionString:process.env.DATABASE_URL}})`는 ORM별 helper 계약이며 실제 missing secret을 검사해야 한다. test global setup은 async 함수 안에서 같은 loadEnvConfig를 호출한다. startup 작업은 [[NextJS-Pages-Instrumentation]]의 register를 사용한다.

## Pages의 production 확인 차이

Pages는 page 단위 code splitting, viewport Link prefetch와 blocking data requirement가 없을 때 automatic static optimization을 기본 제공한다. App segment layout/RSC의 자동 최적화와 다르다. API Routes에서 backend secret을 보관하고 getStaticProps 및 ISR의 실제 캐시/재검증을 확인한다. 원문의 Pages checklist에 쓰인 Route Handlers는 App 이름이 섞인 것으로 여기서는 API Routes를 사용한다. public 파일은 자동 제공되지만 기본 max-age=0이므로 무조건 장기 캐시라고 읽지 않는다.

404/500 custom error, Link, next/head의 title/description, TS/plugin, font의 자체 호스팅/CLS, Image의 WebP/크기와 Script 전략을 점검한다. Script가 자동으로 모든 main-thread blocking을 없애는 것은 아니다. 지표 측정과 bundle/Import Cost/Package Phobia/Bundle Phobia/bundlejs의 차이는 [[NextJS-Production-Checklist]]에 있다. build/start 실행, Lighthouse incognito와 실제 field Core Web Vitals를 함께 비교한다.

## Pages 정적 export의 지원 목록

Pages export는 getStaticProps와 getStaticPaths로 build할 경로를 열거하고 Link prefetch, JavaScript preload, dynamic import, CSS Modules/styled-jsx 등 모든 styling, client data fetch를 지원한다. getStaticPaths의 true/blocking fallback과 getServerSideProps/API Routes, built-in i18n, request rewrites/redirects/headers/Proxy, ISR/Draft, 기본 image loader는 지원하지 않는다. App의 정적 GET Route Handler 지원을 Pages API 지원으로 일반화하지 않는다.

```js
module.exports = {
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'dist',
}
```

각 옵션은 독립 선택이며 기본 출력은 out다. `/`와 열거한 `/blog/post-1`, `/blog/post-2`는 index.html/404.html/blog/post-1.html/blog/post-2.html을 생성한다. trailingSlash true는 blog/post-1/index.html 형태로 바뀐다. 외부 Cloudinary loader와 host Nginx 매핑은 [[NextJS-Static-Export]]를 따른다. 원문 app/page Image 예제의 내용은 Pages default component에서도 동일하며 파일 위치만 pages로 바꾼다. GitHub Pages template은 public/basePath 경로에 맞춘다.

## 15 이전 zone의 내부 asset rewrite

```js
// 15 이전의 blog zone 설정, 현재는 이 추가 rewrite가 필요 없다.
module.exports = {
  assetPrefix: '/blog-static',
  async rewrites() {
    return { beforeFiles: [{
      source: '/blog-static/_next/:path+', destination: '/_next/:path+',
    }] }
  },
}
```

zone 경계의 일반 rewrites와 feature-flag Proxy는 [[NextJS-Multi-Zones]]의 전체 예제를 따른다. 내부 assetPrefix rewrite와 기본 앱에서 외부 zone으로 보내는 rewrite는 서로 다른 위치의 규칙이다.

## 학습 확인

- static export에서 제거되는 server 기능을 현재 앱 요구와 대조한다.
- 같은 Docker image 승격 시 public env와 runtime server env를 비교한다.
- rolling deploy 중 페이지와 assets의 버전이 일치하는지 확인한다.

## 출처

- [Next.js, deploying](https://nextjs.org/docs/pages/getting-started/deploying)
- [Next.js, custom-server](https://nextjs.org/docs/pages/guides/custom-server)
- [Next.js, environment-variables](https://nextjs.org/docs/pages/guides/environment-variables)
- [Next.js, multi-zones](https://nextjs.org/docs/pages/guides/multi-zones)
- [Next.js, production-checklist](https://nextjs.org/docs/pages/guides/production-checklist)
- [Next.js, self-hosting](https://nextjs.org/docs/pages/guides/self-hosting)
- [Next.js, static-exports](https://nextjs.org/docs/pages/guides/static-exports)

## 관련 문서

- [[NextJS-Pages-ISR]]
- [[NextJS-Pages-Internationalization]]
- [[NextJS-Self-Hosting]]
- [[NextJS-Environment-and-Deployment]]
