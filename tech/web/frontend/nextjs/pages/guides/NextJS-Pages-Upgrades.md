---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 기존 버전 변화와 codemod", "NextJS Pages Upgrades"]
---

# Pages Router의 기존 버전 변화와 codemod

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 현재 설치 버전에서 목표 버전까지 읽는다

v9~14 guide는 해당 버전 전환의 이력이다. 이 문서의 과거 최소 Node/React나 compiler flag를 현재 요구로 적용하지 않는다. Next.js 16.3.8의 설치 기준은 [[NextJS-Pages-Foundation]]에 따르고 최신 major 변경/codemod는 [[NextJS-Upgrades]]에서 확인한다.

codemod는 AST transformation이며 migration 전체 correctness를 보장하지 않는다. clean working tree, version control과 diff review 뒤 build/type/lint/behavior check를 한다. dry-run/print 옵션으로 변경을 확인하고 target scope를 제한한다. canary codemod는 stable app version과 다른 배포 채널이므로 명령의 범위를 확인한다.

## v8에서 v9

built-in TypeScript 도입으로 @zeit/next-typescript, Babel TypeScript plugin, @types/next와 불필요한 fork checker를 제거한다. 타입 이름은 NextPageContext, AppContext/AppInitialProps, DocumentContext/DocumentInitialProps로 바뀌었다.

page의 `config` export는 Next page config용으로 예약되어 업무 변수를 개명한다. 의미 없는 `_app.getInitialProps`를 제거해 automatic static optimization을 회복한다. dynamic loading UI는 명시적으로 지정한다. withAmp에서 config.amp로 바꾼 것은 역사적 AMP migration이고 현재 feature 도입 권장이 아니다.

export의 about output은 about.html로 바뀌었고 trailingSlash로 index.html 구조를 선택한다. pages/api는 서버 endpoint가 됐다. multi-module next/dynamic은 각 component의 dynamic import로 나눈다.

## v9에서 v10, v10에서 v11

v10 guide는 v9와 v10 사이 breaking change가 없었다고 명시하고 설치와 React 타입 정렬을 안내한다. 이는 그 과거 버전 관계의 계약으로 이후 major 호환성을 보장하지 않는다.

v11은 Webpack 5를 기본으로 하고 distDir을 cache 이외에는 정리한다. PORT 지원, static image import 지원이 추가됐다. 기존 image plugin과 충돌하면 disableStaticImages를 검토한다.

제거된 항목은 App Container, super.componentDidCatch, props.url, image.unsized, dynamic modules/render, Head.rewind다. unsized를 layout:fill로 바꾸는 것은 당시 legacy image 기준이며 현재 Image에서는 fill을 사용한다. Moment locales는 제외가 기본이 되어 필요한 locale을 명시 import한다.

router.events는 prerender 중 읽지 않고 Effect에서 subscribe/cleanup한다. 내부 router.router.events를 쓰지 않는다. React 17 JSX transform은 JSX만 쓸 때 React import를 생략하게 하지만 `React.*` 변수까지 전역으로 만들지 않는다.

## v11에서 v12

SWC compiler가 도입됐고 custom Babel config는 기존 transform 경로를 유지했다. swcMinify opt-in은 당시 설정이며 현재 config에 다시 추가할 근거가 아니다. styled-jsx의 잘못된 CSS가 오류로 드러날 수 있다.

image wrapper는 div에서 span으로 바뀌었으므로 넓은 element selector가 의도치 않게 image에 적용되는지 확인한다. 현재 Image 전환 때는 wrapper 자체가 제거된다.

HMR은 SSE에서 WebSocket으로 바뀌었다. 당시 `/_next/webpack-hmr` 경로 예시는 Next 16의 `/_next/hmr`와 다르다. proxy의 Upgrade/Connection 처리를 맞춘다. Webpack 4 제거와 target:serverless deprecation은 output tracing 전환 배경이다. v12.2 이전 Middleware는 당시 migration guide의 별도 제약을 확인한다.

## v12에서 v13

당시 최소 Node16.14/React18.2, 현대 browser 지원과 SWC minify default가 변경됐다. App 도입은 선택이었고 Pages를 계속 사용할 수 있었다.

이전 next/image는 next/legacy/image, next/future/image는 next/image가 됐다. next-image-to-legacy-image는 **기존 동작 보존** import 변경이고 next-image-experimental은 새 props/style 전환이다. 후자는 static usage만 다루며 props spread를 검토한다.

new-link는 중첩 anchor를 제거한다. legacyBehavior는 당시 호환 bridge이지 현재 사용 권장이 아니다. target config는 제거됐고 output file tracing으로 대체됐다. next/font는 폰트 최적화의 새 module 경계다.

## v13에서 v14 이후

v14 당시 Node18.17 요구, next export 제거, ImageResponse의 next/og 이동, @next/font 제거와 next/font 전환, next-swc WASM target 제거가 있었다. package/version/type dependency는 목표 major와 같이 업데이트한다.

주요 codemod 대응은 next-og-import, built-in-next-font, new-link, image 변환, next-lint-to-eslint-cli, middleware-to-proxy 등이다. async request API와 App dynamic props codemod가 Pages 데이터 함수 context까지 같은 방식으로 바꿀 필요가 있는지 검토한다.

상세 설치 명령과 9~13 예제는 [[NextJS-Pages-Upgrade-History]], WebSocket proxy 설정은 [[NextJS-Pages-Upgrade-12-HMR]]에서 확인한다.

## 학습 확인

- 과거 flag가 현재 config에 남아 있어도 지원되는지 별도로 확인한다.
- codemod 후 props spread와 custom wrapper를 수동 검토한다.
- Next 버전 upgrade와 App migration을 독립 단계로 계획한다.

## 출처

- [Next.js, upgrading](https://nextjs.org/docs/pages/guides/upgrading)
- [Next.js, codemods](https://nextjs.org/docs/pages/guides/upgrading/codemods)
- [Next.js, version-10](https://nextjs.org/docs/pages/guides/upgrading/version-10)
- [Next.js, version-11](https://nextjs.org/docs/pages/guides/upgrading/version-11)
- [Next.js, version-12](https://nextjs.org/docs/pages/guides/upgrading/version-12)
- [Next.js, version-13](https://nextjs.org/docs/pages/guides/upgrading/version-13)
- [Next.js, version-14](https://nextjs.org/docs/pages/guides/upgrading/version-14)
- [Next.js, version-9](https://nextjs.org/docs/pages/guides/upgrading/version-9)

## 관련 문서

- [[NextJS-Upgrades]]
- [[NextJS-Pages-Legacy-Images]]
- [[NextJS-Pages-Migration]]
