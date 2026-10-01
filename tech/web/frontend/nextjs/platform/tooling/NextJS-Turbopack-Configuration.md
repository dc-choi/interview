---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Turbopack loader와 module 해석 설정", "NextJS-Turbopack-Configuration"]
---

# Turbopack loader와 module 해석 설정

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## turbopack

15.3부터 top-level turbopack object를 사용한다. 13.0~15.2의 experimental.turbo는 옛 이름이며 codemod next-experimental-turbo-to-turbopack으로 옮길 수 있다. built-in JS/CSS 기능에는 loader를 다시 붙이지 않는다.

## root

absolute path로 filesystem resolution/watch/cache 경계를 정한다. 자동으로 pnpm-lock.yaml, package-lock.json, yarn.lock, bun.lock/bun.lockb를 탐색해 root를 결정한다. linked package가 밖에 있으면 프로젝트와 dependency의 공통 parent를 지정한다. 불필요하게 home 전체로 넓히면 watch/cache validation 비용이 커진다.

## rules와 loaders

rules는 glob key와 loader rule object/배열이다. slash가 없는 glob은 filename, slash가 있으면 project-relative path를 matching한다. Windows도 slash로 normalize한다. matching rule은 모두 순서대로 실행된다.

```js
export default {
  turbopack: {
    rules: {
      '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' },
    },
  },
}
```

loaders에는 string name 또는 `{ loader, options }`를 넣는다. options는 primitive/plain object/array만 허용하며 require한 plugin module/함수는 넘길 수 없다. loader output은 JavaScript여야 한다. Babel/Sass는 자동 구성되고 svgr, svg-inline, yaml, raw, string-replace, graphql-tag loader 등이 tested examples다.

loader-runner API는 importModule/loadModule/emitFile, version/mode/target, utils/resolve를 지원하지 않고 fs는 readFile만 일부 지원한다. resolution에는 getResolve를 쓰는 경로를 확인한다. webpack loader가 설치되었다고 Turbopack에서 모든 기능이 호환되는 것은 아니다.

## condition

all/any/not로 logical conditions를 조합한다. path는 glob/string 또는 regex, content는 regex, query는 exact string 또는 regex, contentType은 MIME glob 또는 regex다. 같은 object의 여러 operator는 AND다. built-in browser, foreign, development, production, node, deprecated edge-light를 쓴다. foreign은 node_modules와 일부 internals를 포함한다.

```js
'*.svg': {
  condition: { all: [{ not: 'foreign' }, 'browser'] },
  loaders: ['@svgr/webpack'],
  as: '*.js',
}
```

## module type과 import attributes

rules의 type은 asset, ecmascript, typescript, css, css-module, wasm, raw, bytes다. asset은 emit URL, raw는 string, bytes는 inline bytes를 반환한다. loader가 있으면 먼저 실행하고 지정한 type으로 결과를 처리한다. module type/loader import attributes는 16.2에서 추가됐다.

```ts
import text from './message.txt' with {
  turbopackLoader: 'raw-loader',
  turbopackAs: '*.js',
}
```

per-import에는 turbopackLoader, JSON string turbopackLoaderOptions, turbopackAs와 turbopackModuleType을 준다. with keyword를 사용하며 assert는 대안이 아니다. webpack에서는 이 Turbopack attributes를 지원하지 않는다.

## resolveAlias와 resolveExtensions

alias는 import name을 다른 package/path로 매핑한다. conditional alias는 현재 browser만 지원한다. resolveExtensions 배열은 기본을 추가하는 것이 아니라 전체를 교체하므로 .tsx/.ts/.jsx/.js/.mjs/.json 등 필요한 default extensions를 남긴다.

```js
resolveAlias: { underscore: 'lodash', mocha: { browser: 'mocha/browser-entry.js' } },
resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
```

## debugIds

16.0부터 debugIds true로 bundle와 source map debug ID를 생성한다. polyfill이 들어가며 globalThis._debugIds에서 값을 확인할 수 있다. sourcemap backend와 matching할 때 활용한다. productionBrowserSourceMaps와 source map 공개 정책을 별도 확인한다.

## turbopack.ignoreIssue

16.2의 `ignoreIssue` array는 CLI/overlay의 errors/warnings를 suppress한다. required path는 glob 또는 regex, optional title/description은 exact string 또는 regex다. rule 안에 지정한 필드가 모두 match해야 한다. path만 주면 해당 파일의 모든 issue를 숨긴다.

```js
ignoreIssue: [{ path: '**/lib/optional/**', title: 'Module not found' }],
```

의도적인 optional require같이 runtime-safe한 사례에 좁게 사용한다. title/description은 version에 따라 바뀔 수 있다. 억제는 missing dependency나 runtime error를 고치지 않으며 전체 node_modules warnings를 숨기면 실제 migration 결함도 사라진다.

## loader 설정의 경계와 구체적 조건

검증된 loader 예시는 babel-loader, @svgr/webpack, svg-inline-loader, yaml-loader, string-replace-loader, raw-loader, sass-loader, graphql-tag/loader다. preset-env용 babel-loader, css-loader, postcss-loader를 built-in 처리 위에 중복 추가할 필요는 없다. 13.4.4 이전 turbo.loaders는 .mdx 같은 extension key를 썼고 현재 rules는 *.mdx glob을 쓴다.

path RegExp는 project-relative path의 일부에도 match한다. content RegExp는 파일 내용 어디든 match한다. query string은 전체 query와 정확히 비교하고 RegExp는 일부를 찾는다. contentType은 string glob 또는 RegExp로 MIME를 비교한다. 예를 들어 { all: [{ path: 'icons/**' }, { not: 'foreign' }, 'browser'] }는 로컬 icons의 browser 처리만 제한한다. foreign은 node_modules와 일부 Next.js 내부 파일이어서 not foreign을 먼저 거르면 불필요한 content scan을 줄인다.

rule 배열은 browser와 { not: 'browser' }를 갈라 다른 SVG transform을 적용할 수 있다. 배열의 첫 match로 종료하지 않고 match한 모든 rule을 순서대로 적용하므로 서로 겹치는 변환의 결과를 확인한다. resolveAlias의 조건부 branch는 현재 browser만 지원하며 node/production 등 임의 condition을 추가하는 계약은 아니다.

~~~js
import value from './message.txt' with {
  turbopackLoader: 'string-replace-loader',
  turbopackLoaderOptions: '{"search":"PLACEHOLDER","replace":"value"}',
  turbopackAs: '*.js',
}
~~~

16.0에 conditions/debugIds, 16.2에 query/contentType/type/import attributes가 추가됐다. 15.3 이전 experimental.turbo를 top-level turbopack으로 옮기는 명령은 npx @next/codemod@latest next-experimental-turbo-to-turbopack . 이다. filesystem root 밖 파일은 resolution/watch/cache validation 대상에 들어오지 않으므로 linked package를 포함한 공통 조상을 root로 정한다.

## ignoreIssue의 정확한 match 예시

각 rule은 AND, 배열의 여러 rule은 OR다. path만 있는 { path: '**/vendor/**' }는 그 파일의 모든 issue를 숨긴다. optional dependency를 try/catch require하는 경우 다음처럼 경로, title, description을 모두 좁힐 수 있다.

~~~js
ignoreIssue: [{
  path: /node_modules\/legacy-package\//,
  title: 'Module not found',
  description: /Cannot find module 'optional-dependency'/,
}]
~~~

description/title의 string은 substring이 아닌 exact match다. 경로가 상대적으로 안정적이지만 release 간 고정이 보장되지는 않으므로 업그레이드 후 필터를 재확인한다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/turbopack](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)
- [Next.js, pages/api-reference/config/next-config-js/turbopack](https://nextjs.org/docs/pages/api-reference/config/next-config-js/turbopack)
- [Next.js, app/api-reference/config/next-config-js/turbopackIgnoreIssue](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackIgnoreIssue)

## 관련 문서

- [[NextJS-Turbopack]]
- [[NextJS-Turbopack-Tuning]]
