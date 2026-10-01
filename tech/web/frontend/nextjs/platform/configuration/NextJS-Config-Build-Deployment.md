---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 빌드 산출물과 배포 식별자", "NextJS-Config-Build-Deployment"]
---

# Next.js 빌드 산출물과 배포 식별자

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## output

`output: 'standalone'`은 production 배포에 필요한 traced files와 최소 `server.js`를 `.next/standalone`에 복사한다. `@vercel/nft`가 import, require, fs 사용을 분석해 페이지별 `.nft.json`과 서버의 `.next/next-server.js.nft.json`을 만든다. trace에 기록된 경로는 해당 `.nft.json` 파일 기준이다.

standalone에는 `public`과 `.next/static`이 기본 복사되지 않는다. CDN에서 제공하거나 다음과 같이 배포 패키지에 넣는다. 일반 `next start` 대신 최소 서버를 실행한다.

설정은 build 때 읽어 생성된 `server.js`에 serialize한다. build-time 설정을 서버 시작 때 새 config 파일만 교체해 바꿀 수 있다고 가정하지 않는다.

```sh
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/
PORT=8080 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

`output: 'export'`는 정적 export를 선택한다. 서버 산출물을 실행하는 standalone과 목적이 다르다. 서버 런타임이 필요한 기능은 정적 호스팅으로 해결할 수 없다. Docker 레이어 최적화 자체는 [[Multi-Stage-Build]]와 연결한다.

### tracing 범위

monorepo에서는 Next.js 프로젝트 디렉터리가 기본 tracing root다. 외부 workspace 파일이 필요하면 `outputFileTracingRoot`를 넓힌다. `outputFileTracingIncludes`, `outputFileTracingExcludes`는 route glob을 key로, 프로젝트 루트에서 해석되는 file glob 배열을 value로 갖는다. `src/` 사용 여부는 route key의 의미를 바꾸지 않는다. Edge routes와 서버 trace가 없는 정적 페이지에는 적용되지 않는다.

```js
export default {
  output: 'standalone',
  outputFileTracingRoot: '/workspace',
  outputFileTracingIncludes: {
    '/api/report': ['./templates/**/*', './node_modules/sharp/**/*'],
  },
}
```

`/*`로 전체 route를 대상으로 삼을 수 있지만 파일 glob은 필요한 범위로 제한한다. native binary, 동적 fs 접근, 템플릿이 누락되지 않았는지 설치 없이 standalone 패키지만으로 실제 경로를 실행해 확인한다.

## distDir

문자열 `distDir`의 기본값은 `.next`다. `distDir: 'build'`로 변경하면 build 결과 경로가 바뀐다. `../build`처럼 프로젝트 밖으로 나갈 수 없다. CI cache, Docker COPY, 배포 도구와 sourcemap 업로드 경로도 함께 확인한다.

## generateBuildId

`generateBuildId`는 build ID 문자열을 반환하는 함수다. 같은 배포의 여러 인스턴스는 동일한 build artifact를 실행하는 것이 기본이다. 환경별로 다시 빌드해야 한다면 Git SHA처럼 일관된 ID를 반환할 수 있다. `deploymentId`를 설정하면 build ID가 고정되고 이 함수는 효과가 없다.

```js
export default { generateBuildId: async () => process.env.GIT_SHA }
```

## deploymentId

문자열 `deploymentId`는 rolling deployment의 버전 불일치를 식별한다. `NEXT_DEPLOYMENT_ID`도 사용할 수 있으나 config 값이 우선한다. static asset URL의 `?dpl=`, navigation 요청의 `x-deployment-id`, 응답의 `x-nextjs-deployment-id`, HTML의 `data-dpl-id`와 `use cache` key에 반영된다. 클라이언트가 응답 ID 불일치를 감지하면 hard navigation한다.

ID는 같은 배포의 모든 인스턴스에서 같아야 한다. Next.js는 수신 `?dpl=`을 보고 해당 배포로 요청을 라우팅하지 않는다. 버전별 routing은 host/CDN이 제공해야 하며, ID만 넣으면 다른 버전 인스턴스를 만났을 때 reload하는 수준이다. 14.1.4에서 top-level로 안정화됐고 16.2부터 Pages Router도 응답 header로 skew를 판정한다.

## outputHashSalt

16.3부터 문자열 `outputHashSalt`를 content-addressed chunk/asset filename에 섞는다. 값 변경으로 소스 변경 없이 hash를 회전시킬 수 있다. webpack와 Turbopack에 적용된다. `NEXT_HASH_SALT`도 설정하면 우선순위로 하나를 고르는 것이 아니라 `outputHashSalt + NEXT_HASH_SALT`를 이어 붙인다. 매 빌드 무작위 salt는 변하지 않은 asset의 재사용을 없애므로 의도적인 cache rotation에 쓴다.

## supportsImmutableAssets

16.3의 adapter용 boolean이다. 플랫폼이 immutable content-addressed namespace를 지원할 때 adapter가 활성화한다. 앱은 `false`로 opt out할 수 있다. 미지원 adapter에서 `true`만 지정해도 지원이 생기지 않으며 잘못된 활성화는 배포를 깨뜨릴 수 있다. [[NextJS-Immutable-Assets]]에서 보존, 충돌 검사와 이전 deployment 수명 조건을 다룬다.

## exportPathMap

레거시 `async exportPathMap(defaultPathMap, context)`는 pathname을 `{ page, query }`로 매핑한다. context에는 `dev`, `dir`, `outDir`, `distDir`, `buildId`가 있으며 dev에서는 outDir가 null이다. `query` 기본값은 `{}`이고 getInitialProps에 전달되던 설정이다. 자동 정적 최적화와 getStaticProps에서는 빌드 후 추가 query를 전달할 수 없다.

공식 레퍼런스에는 오래된 `next export`, `-o` 예제가 남아 있다. 최신 CLI에서 새 사용법으로 채택하지 않는다. Pages의 `getStaticPaths`, App의 `generateStaticParams`와 `output: 'export'`를 사용한다. getStaticPaths가 exportPathMap보다 우선하므로 함께 의존하지 않는다. `trailingSlash: true`는 `/about/index.html`, 기본은 `/about.html`을 만든다.

## 레거시 exportPathMap 반환과 filename

반환 key는 export pathname, value의 page는 pages 디렉터리의 페이지 문자열이고 query는 getInitialProps에 전달할 object다. /p/hello를 page:/post, query:{title:'hello'}로 연결하는 alias 예시가 있다. dev:true일 때도 정의한 route가 사용된다. dir/outDir/distDir는 절대경로이고 outDir는 dev에서 null이다.

/readme.md 같은 filename도 pathname에 사용할 수 있지만 결과가 HTML이면 호스팅 응답 Content-Type을 text/html로 설정해야 한다.9 이전에는 slash/index.html이 기본이었으며 현재 trailingSlash 선택과 구분한다. next export -o outdir는 제거된 CLI의 역사적 예시로만 설명한다.

## tracing glob과 native 자산

output tracing은 12부터 deprecated serverless target의 중복 패키징을 대신하는 배포 경로다. nft import/require/fs의 정적 분석이므로 동적 native 자산을 누락하거나 불필요 파일을 넣을 수 있다. includes는 누락 파일을 추가하고 excludes는 불필요 파일을 제거한다. 레퍼런스의 respectively 설명 순서는 이 역할과 반대여서 옵션 이름/예시에 맞춰 교정한다.

route key는 picomatch로 요청 route path를 매칭한다. `/api/login/[[...slug]]` 같은 literal bracket 경로는 JS string과 glob 두 단계 escaping을 고려한다. 값은 Next project root(next.config가 있는 packages/web-app)를 기준으로 한다. outputFileTracingRoot를 monorepo root로 넓혔다고 file glob 기준까지 자동으로 바뀌는 것은 아니다.

src/lib/payments/**/* 경로, locale JSON, node_modules/sharp/** 또는 aws-crt/dist/bin/** 등 runtime/native 자료를 좁은 pattern으로 포함한다. cross-platform pattern은 forward slash를 사용하고 repo root **/* 전체 포함으로 trace를 과도하게 키우지 않는다. fully static/Edge처럼 server trace 없는 route에는 적용되지 않는다.

## Pages pageExtensions와 standalone 설정

pageExtensions 기본은 tsx/ts/jsx/js다. mdx/md와 기본 확장자를 모두 넣거나 page.tsx/page.ts/page.jsx/page.js처럼 page suffix를 선택할 수 있다. suffix를 바꾸면 pages UI뿐 아니라 proxy, instrumentation, _document, _app, pages/api도 모두 개명해야 한다. 예를 들어 MyPage.page.tsx, proxy.page.ts, instrumentation.page.ts, _app.page.ts다. 이를 통해 pages 안 tests/component files를 route로 취급하지 않게 할 수 있다. standalone은 next.config를 build 때 읽어 server.js에 직렬화하므로 runtime 원본 파일만 바꿔 설정이 바뀐다고 가정하지 않는다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Next.js, pages/api-reference/config/next-config-js/output](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output)
- [Next.js, app/api-reference/config/next-config-js/distDir](https://nextjs.org/docs/app/api-reference/config/next-config-js/distDir)
- [Next.js, pages/api-reference/config/next-config-js/distDir](https://nextjs.org/docs/pages/api-reference/config/next-config-js/distDir)
- [Next.js, app/api-reference/config/next-config-js/generateBuildId](https://nextjs.org/docs/app/api-reference/config/next-config-js/generateBuildId)
- [Next.js, pages/api-reference/config/next-config-js/generateBuildId](https://nextjs.org/docs/pages/api-reference/config/next-config-js/generateBuildId)
- [Next.js, app/api-reference/config/next-config-js/deploymentId](https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId)
- [Next.js, pages/api-reference/config/next-config-js/deploymentId](https://nextjs.org/docs/pages/api-reference/config/next-config-js/deploymentId)
- [Next.js, app/api-reference/config/next-config-js/outputHashSalt](https://nextjs.org/docs/app/api-reference/config/next-config-js/outputHashSalt)
- [Next.js, app/api-reference/config/next-config-js/supportsImmutableAssets](https://nextjs.org/docs/app/api-reference/config/next-config-js/supportsImmutableAssets)
- [Next.js, app/api-reference/config/next-config-js/exportPathMap](https://nextjs.org/docs/app/api-reference/config/next-config-js/exportPathMap)
- [Next.js, pages/api-reference/config/next-config-js/exportPathMap](https://nextjs.org/docs/pages/api-reference/config/next-config-js/exportPathMap)

- [Next.js, pageExtensions](https://nextjs.org/docs/pages/api-reference/config/next-config-js/pageExtensions)

## 관련 문서

- [[NextJS-Immutable-Assets]]
- [[Multi-Stage-Build]]
