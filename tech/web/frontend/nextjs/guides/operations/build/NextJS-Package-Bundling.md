---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 번들 분석과 의존성 경계"]
---

# Next.js 번들 분석과 의존성 경계

## 분석 모델

번들은 앱과 의존성을 client/server 출력 파일로 묶는다. 작은 client 출력은 전송과 실행, Core Web Vitals에, 작은 server 출력은 cold start에 도움이 된다.
자동 code splitting/tree shaking 뒤에도 import 경계와 무거운 의존성을 분석할 필요가 있다.
Turbopack 모듈 그래프용 실험 분석기와 Webpack의 @next/bundle-analyzer를 구분한다.

## Turbopack 분석기

16.1 이후 next experimental-analyze를 실행하면 브라우저의 interactive view가 열린다.
route, client/server 환경, JavaScript/CSS/JSON 타입으로 필터하고 파일을 검색한다.
treemap의 사각형 면적은 모듈 크기를 표현한다. 모듈을 누르면 크기와 전체 import chain, 앱 안의 사용 위치를 추적할 수 있다.
--output을 붙이면 interactive view 대신 .next/diagnostics/analyze에 공유/비교 가능한 정적 결과를 쓴다.
결과 디렉터리를 analyze-before-refactor 등으로 복사해 변경 전후를 비교한다. 다른 CLI 옵션은 별도 reference를 확인한다.
npx/pnpm/yarn/bunx는 같은 next 하위 명령의 실행 도구이며 분석 기능은 같다.

## Webpack 플러그인

@next/bundle-analyzer를 설치하고 withBundleAnalyzer(nextConfig)로 설정을 감싼다.
enabled를 process.env.ANALYZE === 'true'로 두면 필요할 때만 분석한다.
ANALYZE=true npm run build 등으로 실행하면 서버/클라이언트 등 세 개 보고서 탭을 볼 수 있다.
현재 기본 Turbopack 프로젝트에서 플러그인만 설치해 이 Webpack 보고서를 기대하지 않는다. 실제 bundler와 build 명령을 맞춘다.
보고서는 큰 패키지를 제거하거나 코드 split/lazy load할 근거다. 크기만 보고 필요한 기능을 제거하지 않는다.

## 많은 export와 서버 전용 패키지

icon/utility처럼 수백 모듈을 export하는 패키지는 experimental.optimizePackageImports 배열에 패키지명을 넣어 실제 쓰는 모듈을 해석하도록 한다.
named import 작성 편의와 적은 포함 범위를 함께 얻는 설정이다. 이미 자동 최적화되는 패키지는 목록에 추가할 필요가 없다.
Server Component/Route Handler에서 import한 패키지는 기본적으로 서버 빌드에 묶인다.
serverExternalPackages: ['package-name']은 해당 패키지를 bundle에서 빼고 런타임 Node 해석에 맡긴다.
외부화는 클라이언트의 큰 라이브러리를 없애는 옵션이 아니다. 배포 런타임에 패키지와 필요한 파일을 제공해야 한다.

## 렌더 작업의 위치

브라우저 API나 상호작용이 없는 syntax highlighting, chart의 정적 출력, markdown parsing은 Server Component에서 실행할 수 있다.
client prism-react-renderer 예는 code/language/theme을 넘기고 tokens를 line/token span으로 렌더하지만 tokenizer와 라이브러리도 브라우저에 보낸다.
server Shiki 예는 codeToHtml(code, {lang: 'tsx', theme: 'github-dark'})를 await하고 결과 markup을 전달한다. 라이브러리는 client bundle에 포함되지 않는다.
원문의 Shiki codeToHtml 결과는 pre/code까지 포함할 수 있으므로 그대로 또 pre/code에 중첩하지 않고 반환 HTML 구조에 맞춰 wrapper를 둔다.
dangerouslySetInnerHTML에는 신뢰하고 검증한 변환 결과를 사용한다. 사용자 입력을 직접 HTML로 출력하는 예로 확장하지 않는다.
동적인 client 기능이 필요하면 서버 정적 결과와 작은 상호작용 컴포넌트를 분리한다.

## 이해 확인

- import chain에서 큰 의존성의 최초 client 경계를 찾으면 어떤 개선 선택이 생기는가?
- serverExternalPackages와 Server Component 이동은 서로 어떤 비용을 줄이는가?

## Webpack 분석 설정 예제

~~~js
// next.config.js: CommonJS 프로젝트 예제이며 next.config.cjs는 지원되지 않는다.
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({
  experimental: { optimizePackageImports: ['icon-library'] },
  serverExternalPackages: ['package-name'],
})
~~~

~~~sh
npm install @next/bundle-analyzer
ANALYZE=true npm run build -- --webpack
npx next experimental-analyze --output
~~~

패키지명 두 개는 앱의 실제 패키지로 바꾼다. Webpack 보고서와 Turbopack graph는 다른 명령이다.

## 출처

- [Next.js, package-bundling](https://nextjs.org/docs/app/guides/package-bundling)

## 관련 문서

- [[NextJS-CLI]]
- [[NextJS-Config-External-Packages]]
- [[NextJS-Config-Dependencies]]
