---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js SWC compiler와 build hook", "NextJS-Compiler"]
---

# Next.js SWC compiler와 build hook

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## Next.js Compiler

Rust/SWC 기반 compiler는 JS/TS를 transform하고 production output을 minify한다. 12부터 기본 도입됐고 SWC minify는 13부터 기본, 15부터 swcMinify config를 제거했다. 공식 과거 benchmark 배수는 특정 workload 결과이며 현재 앱 속도 보장으로 취급하지 않는다.

webpack에 custom Babel config가 있으면 개별 file transform을 Babel로 fallback한다. Turbopack 16은 Babel config와 SWC internal/downlevel transform을 함께 쓰므로 오래된 compiler 설명을 두 bundler의 동일한 fallback 계약으로 적용하지 않는다.

## styledComponents

compiler.styledComponents는 boolean 또는 object다. ssr/displayName transform이 Next.js 사용의 핵심이다. displayName은 dev true/production false, ssr/fileName/minify/transpileTemplateLiterals/cssProp은 기본 true, pure는 false다. topLevelImportPaths는 empty, meaninglessFileNames는 ['index'], namespace는 empty다. styled-components Babel tooling의 각 option 의미와 SSR registry를 함께 확인한다.

## emotion

compiler.emotion boolean/object는 sourceMap(dev true/production off), autoLabel(default dev-only, never/always 가능), labelFormat(default [local], [filename]/[dirname] 가능), importMap을 제공한다. re-export한 Emotion entry가 있다면 importMap의 canonicalImport/styledBaseImport를 mapping한다. compiler option만으로 App SSR style collection과 client boundary가 해결되지는 않는다.

## Jest

next/jest({ dir: './' })가 createJestConfig wrapper를 만들고 async next.config/.env를 읽는다. SWC transform, CSS/module/Sass/image mock, node_modules/.next resolving 제외를 구성한다. custom setupFilesAfterEnv는 함께 전달한다. integration에서는 실제 browser/RSC runtime과의 차이를 남긴다.

## Relay

compiler.relay object에는 src, artifactDirectory, language와 eagerEsModules를 설정한다. relay.config와 맞춘다. Pages의 generated artifacts를 pages 아래에 두면 route로 인식하므로 바깥 디렉터리에 생성한다.

## reactRemoveProperties와 removeConsole

reactRemoveProperties true는 기본 ^data-test props를 제거하고 `{ properties: ['^data-custom$'] }`로 Rust regex를 지정할 수 있다. JS RegExp와 syntax가 같다고 가정하지 않는다. removeConsole true는 app code의 console.*를 제거하되 node_modules에는 적용하지 않는다. `{ exclude: ['error'] }`로 필요한 diagnostics를 남길 수 있다.

```js
export default {
  compiler: {
    removeConsole: { exclude: ['error'] },
    reactRemoveProperties: { properties: ['^data-test'] },
  },
}
```

production에서 필요한 감사/운영 로그까지 console 제거 대상으로 섞지 않는다. test selectors를 production에서도 쓸 필요가 있는지 먼저 판단한다.

## decorators와 jsxImportSource

tsconfig/jsconfig experimentalDecorators를 자동 감지해 legacy decorator를 지원한다. 기존 MobX 등 호환성 목적이며 새 앱의 기본 선택으로 권장되지 않는다. jsxImportSource도 자동 감지해 Theme UI 같은 JSX runtime source에 적용한다.

## define와 defineServer

compiler.define는 모든 server/edge/client target, defineServer는 server/edge만 build-time 변수 치환을 한다. value는 치환할 표현식에 맞는 문자열이므로 string literal은 quoting을 포함하도록 JSON.stringify 등으로 작성한다. public/server secret 노출과 runtime 설정의 차이를 확인한다.

```js
export default {
  compiler: {
    define: { FEATURE_BANNER: JSON.stringify('new') },
    defineServer: { SERVER_REGION: JSON.stringify('ap-northeast') },
  },
}
```

## runAfterProductionCompile

compiler.runAfterProductionCompile async hook은 compilation이 끝난 뒤 type checking/static generation 전에 실행된다. `{ distDir, projectDir }`를 받아 sourcemap 업로드나 compile result 처리에 사용한다. adapter onBuildComplete처럼 전체 generation 완료 후 output contract를 받는 hook과 다르다. 여기서 compile 성공을 전체 build 성공으로 보고하면 안 된다.

## 실험 trace와 SWC plugins

experimental.swcTraceProfiling true는 .next에 swc-trace-profile timestamp JSON을 생성하며 Perfetto/Chromium trace viewer 등으로 볼 수 있다. experimental.swcPlugins는 `[plugin path/name, config object]` tuples로 WASM transforms를 등록한다. native compiler version/plugin ABI compatibility와 build output correctness를 확인한다.

## 관련 변환 선택

transpilePackages는 모듈 문법 변환, optimizePackageImports는 barrel import 최적화, React Compiler는 render memoization을 다룬다. 각각 다른 비용과 contract를 바꾸므로 같은 최적화 설정으로 묶지 않는다. [[React-Compiler]]에 memoization 개념을 연결한다.

## option 타입과 compiler 변경 이력

styledComponents object의 모든 field는 선택적이다. displayName/ssr/fileName/minify/transpileTemplateLiterals/pure/cssProp은 boolean, topLevelImportPaths/meaninglessFileNames는 string[], namespace는 string이다. displayName을 명시하면 모든 환경에 같은 값을 적용한다. Emotion labelFormat은 autoLabel이 dev-only/always일 때만 작동한다. importMap은 packageName -> exportName -> {canonicalImport?:[string,string],styledBaseImport?:[string,string]}이며 기본 undefined다.

Relay 예시 src:'./', artifactDirectory:'./__generated__', language:'typescript', eagerEsModules:false는 relay.config와 맞춘다. next/jest는 env 전체 변종을 process.env에 읽고 custom setupFilesAfterEnv:['<rootDir>/jest.setup.js']를 createJestConfig에 전달한다. async config loading을 위해 wrapper 결과를 export한다.

| 버전 | 변경 |
| --- | --- |
| 12.0 | Next Compiler 도입 |
| 12.1 | styled-components, Jest, Relay, props/console 제거, decorators, jsxImportSource |
| 12.2 | SWC WASM plugin 실험 |
| 12.3 | SWC minifier stable |
| 13.0 | SWC minifier 기본 |
| 13.1 | transpilation와 modularizeImports stable |
| 13.5 | modularizeImports 대신 자동 optimizePackageImports 권장 |
| 15.0 | swcMinify 설정 제거 |

과거 문서의 transform 17배, Fast Refresh 약 3배, build 약 5배, minify 7배는 도입 당시 특정 측정치다. SWC는 Rust crate로 embedding/확장 가능하고 WASM fallback으로 플랫폼 범위를 넓히는 선택이었다. 실험 swcPlugins path는 npm package name 또는 absolute .wasm binary이며 pluginOptions object를 tuple에 넣는다. trace 파일은 swc-trace-profile-<timestamp>.json이고 chrome://tracing, Perfetto, Speedscope에서 볼 수 있다.

## 출처

- [Next.js, architecture/nextjs-compiler](https://nextjs.org/docs/architecture/nextjs-compiler)

## 관련 문서

- [[NextJS-Config-Dependencies]]
- [[NextJS-Turbopack]]
- [[React-Compiler]]
