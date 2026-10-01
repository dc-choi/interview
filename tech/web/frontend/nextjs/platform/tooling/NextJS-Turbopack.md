---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Turbopack 모델과 webpack 호환성", "NextJS-Turbopack"]
---

# Turbopack 모델과 webpack 호환성

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## Turbopack

Rust incremental bundler로 App/Pages 모두의 기본 dev/build bundler다. client/server를 unified graph로 처리하고 작업 결과를 function 단위로 cache하며 dev가 요청한 부분을 lazy bundle한다. 작은 앱의 browser native ESM과 달리 bundling으로 request overhead를 줄이는 모델이다. 실제 속도는 project/cache 환경에서 측정한다.

native bindings는 macOS x64/ARM64, Windows x64/ARM64, Linux glibc/musl x64/ARM64를 지원한다. FreeBSD/OpenBSD처럼 WASM fallback만 있는 환경은 SWC transform/minify는 가능해도 Turbopack이 지원되지 않으므로 --webpack을 사용한다.

## language와 styling

SWC로 JS/TS/JSX/TSX를 변환하지만 type checking은 별도다. ESNext, CommonJS, ESM, Fast Refresh/RSC, JSON/static assets와 tsconfig paths/baseUrl를 지원한다. 16부터 Babel config를 감지하면 자동 Babel도 실행하되 내부 Next transforms와 downlevel은 SWC를 계속 쓴다. node_modules에 Babel을 적용하려면 별도 loader rule이 필요하다.

CSS/global modules/nesting/import는 Lightning CSS, PostCSS는 Node worker pool에서 config를 처리한다. Sass/SCSS는 내장 지원하지만 custom JavaScript functions는 지원하지 않는다. Less는 기본 지원이 아니다. App root layout 자동 생성도 지원하지 않아 수동 작성한다.

## import.meta.env

Turbopack 전용 metadata다. DEV는 MODE가 production이 아닌지, PROD는 production인지, MODE는 compile-time NODE_ENV(기본 development), BASE_URL은 basePath의 trailing slash 포함 값(기본 /), SSR은 server bundle 여부다. statically analyzed 값으로 dead branches를 제거한다. VITE_* custom vars, Vite modes/envPrefix/envDir까지 호환되는 기능은 아니다.

```ts
if (import.meta.env.DEV) console.log('개발 모드')
```

## import.meta.glob

Turbopack 전용 Vite-compatible module discovery API다. 기본은 caller-relative path key와 import Promise thunk의 object, eager true는 module object다. import option으로 named export를 골라 lazy/eager 모두 사용할 수 있다.

```ts
const markdown = import.meta.glob('./articles/*.md', {
  import: 'default',
  query: '?raw',
})
const content = await markdown['./articles/intro.md']()
```

query는 string 또는 string/boolean value object로 URL encode한다. pattern 배열과 ! exclusions, base override, caseSensitive 기본 true를 지원한다. deprecated as와 globEager는 지원하지 않으며 query '?raw'/'?url'와 eager option을 사용한다. TS types는 moduleResolution bundler/node16/nodenext 조건에서 제공한다.

## magic comments

webpackIgnore true와 turbopackIgnore true는 bundling을 생략해 dynamic import/require/require.resolve/Worker expression을 유지한다. turbopackOptional true는 resolution 오류를 suppress한다. static import에 같은 방식으로 적용하지 않는다. webpackOptional은 지원하지 않는다. bundle을 건너뛰면 runtime에서 실제 module/URL이 있어야 한다.

## webpack와 차이

webpack plugins와 webpack() config는 지원하지 않는다. loader 호환은 일부 API만이며 [[NextJS-Turbopack-Configuration]]을 따른다. Yarn PnP, experimental.urlImports/esmExternals는 planned 지원이 아니다. nextScriptWorkers/fallbackNodePolyfills는 아직 gap이 있다.

CSS 순서는 JS import order 영향을 받는다. webpack에서 우연한 순서에 기대던 cascade는 Turbopack으로 바꾸면 달라질 수 있다. explicit CSS @import dependency 또는 덜 충돌하는 rules로 수정한다. CSS Modules의 standalone :local/:global, @value, ICSS :import/:export와 global .css를 module로 compose/import하는 레거시 패턴은 지원하지 않는다. 실제 module file은 .module.css로 작성한다.

Sass node_modules import의 ~ prefix는 제거하거나 resolveAlias로 mapping한다. Lightning CSS 숫자 precision은 5digits이고 webpack 출력은 10digits인 경우가 있어 line-height/calculated sizing의 visual 변화도 확인한다.

## 측정과 migration

linked package는 root 밖에서 해석되지 않으므로 filesystem root를 양쪽 공통 parent로 확장한다. webpack plugin, custom Sass function과 CSS order의 dependence를 조사한 뒤 dev와 production build를 모두 확인한다. 기본 cache가 warm인 경우와 clean cache를 나누어 성능을 비교한다. configuration과 experimental options를 다른 bundler의 config로 기계적으로 복사하지 않는다.

`next dev --internal-trace`는 `.next-profiles/trace-turbopack.bin`을 생성해 compiler performance/memory 진단에 사용할 수 있다. V8 CPU profiling의 .cpuprofile과 다른 자료다. 공유하기 전 source paths와 diagnostic 내용의 공개 범위를 확인한다.

## glob의 타입, 기본값과 반환 예제

| option | 타입 | 기본 |
| --- | --- | --- |
| eager | boolean | false |
| import | string | undefined |
| query | string 또는 Record<string,string 또는 boolean> | undefined |
| base | string | undefined |
| caseSensitive | boolean | true |

기본 반환은 Record<string,()=>Promise<unknown>>, eager:true는 Record<string,unknown>이다. import:'default'는 lazy의 Promise<exportValue>, import:'setup', eager:true는 exportValue를 직접 돌려준다. base는 pattern resolution과 result key의 기준을 함께 바꾼다. caseSensitive:false는 ASCII case를 무시한다.

~~~js
const lazy = import.meta.glob(['./src/**/*.js', '!**/*.test.js'])
for (const path in lazy) console.log(path, await lazy[path]())
const eager = import.meta.glob('./dir/*.js', { eager: true })
for (const path in eager) console.log(path, eager[path].default)
const encoded = import.meta.glob('./*.ts', { query: { bar: 'foo', raw: true } })
// query는 ?bar=foo&raw=true로 encode된다.
~~~

import.meta.env 전체 object 읽기, const {MODE,SSR}=import.meta.env destructuring, import.meta.env['BASE_URL']의 static bracket access도 지원한다. DEV/PROD/SSR은 boolean, MODE/BASE_URL은 string이다.

## 지원표의 추가 계약과 migration 예시

PostCSS config는 .js/.mjs/.cjs/.ts/.mts/.cts를 Node worker pool에서 처리한다. JSON은 named/default import, static image import는 Image에 쓰는 object를 반환한다. AMD는 기본 transform만 일부 지원해 고급 AMD 호환을 가정하지 않는다. Babel config가 있을 때 webpack은 SWC를 끄지만 Turbopack은 내부 transforms/downlevel을 계속 SWC로 처리한다. CSS module의 function형 :global(...)은 standalone :global과 달리 지원된다. Sass의 옛 tilde를 고칠 수 없으면 resolveAlias:{'~*':'*'}로 매핑할 수 있다. 25/17 line-height는 webpack 1.4705882353, Turbopack 1.47059 예시이며 letter-spacing 같은 계산 값도 시각 확인한다. 15.0 dev stable, 15.3 build experimental, 15.5 build beta, 16.0 기본 bundler/Babel 자동 처리 순서다.

## 출처

- [Next.js, app/api-reference/turbopack](https://nextjs.org/docs/app/api-reference/turbopack)
- [Next.js, pages/api-reference/turbopack](https://nextjs.org/docs/pages/api-reference/turbopack)

## 관련 문서

- [[NextJS-Turbopack-Configuration]]
- [[NextJS-Turbopack-Tuning]]
- [[NextJS-Compiler]]
