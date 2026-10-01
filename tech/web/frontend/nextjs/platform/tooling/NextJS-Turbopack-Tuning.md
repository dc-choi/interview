---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Turbopack 캐시 메모리와 chunk 조절", "NextJS-Turbopack-Tuning"]
---

# Turbopack 캐시 메모리와 chunk 조절

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## turbopackFileSystemCache

experimental.turbopackFileSystemCacheForDev와 ForBuild는 boolean으로 compiler work의 disk persistence를 조절한다. 현재 둘 다 기본 true다. dev cache는 .next/dev/cache/turbopack, build는 .next/cache/turbopack다. dev 기본은 16.1, build 기본은 16.3부터 활성화됐다.

CI/container에서 .next/cache를 복원하지 않으면 다음 build가 warm하지 않다. 재사용하지 않는 환경은 ForBuild false로 쓰기 비용을 줄일 수 있다. runtime data cache와 compiler filesystem cache를 구분한다.

## turbopackMemoryEviction

16.3 실험 옵션으로 dev의 filesystem cache가 켜졌을 때 snapshot 후 memory를 reclaim한다. false는 process lifetime 동안 유지, 기본 auto는 allocation/OS pressure를 보고 필요할 때 evict, full은 snapshot마다 가능한 data를 evict한다. disk에서 demand reload하므로 낮은 memory와 다시 읽는 비용의 tradeoff다. production runtime heap 상한을 설정하는 기능이 아니다.

## turbopackLocalPostcssConfig

16.3 실험 boolean 기본 false다. 기본은 project root postcss config가 local CSS directory보다 우선한다. true는 CSS file directory의 config를 먼저 찾고 root를 fallback으로 사용한다. monorepo/design system의 서로 다른 transform이 필요할 때 선택하며 dev/build Turbopack 모두에 적용된다.

## turbopackRustReactCompiler

16.3 실험 boolean은 React Compiler를 Node/Babel 대신 native Rust port로 실행한다. reactCompiler를 따로 켜야 한다. Turbopack 전용이며 webpack에서는 오류다. 켜면 babel-plugin-react-compiler 설치가 필요 없다. production 권장 상태가 아니며 compilation result와 profile을 확인한다.

## turbopackChunking

실험 production JS chunker object다. 크기는 uncompressed/unminified bytes이며 gzip bundle size와 같지 않다. request 수를 줄이는 merge는 initial load에 유리할 수 있지만 navigation shared cache reuse를 줄일 수 있다.

| 옵션 | 타입/기본 | 효과 |
| --- | --- | --- |
| minChunkSize | number, 50000 | 작은 chunk merge 기준 |
| maxChunkCountPerGroup | number, 40 | route/dynamic import group의 chunk 수 상한 |
| maxMergeChunkSize | number, 200000 | 큰 chunk를 다시 합치는 상한 |
| firstPageLoadPriority | number, 0~1 | initial visit 가중치, 공개 default 미명시 |
| priorityRoutes | RegExp[] | first landing이 많은 routes |
| priorityBoost | number, 1.5 | priority route 확률 multiplier |
| requestCost | number, 200000 | 추가 request의 raw-byte 환산 비용 |
| generateComponentChunks | boolean, false | merged chunk의 constituent chunks 추가 생성 |
| minComponentChunkSize | number, 20000 | component chunk의 최소 분리 기준 |

component chunks는 App 레퍼런스에서 설명하고 Pages chunking 레퍼런스에는 없으므로 Pages에서 같은 지원을 가정하지 않는다. browser는 이미 받은 merged/component chunks를 활용해 필요한 작은 부분만 받을 수 있도록 하는 실험이다. 초기와 subsequent navigation을 둘 다 측정한다.

```js
export default {
  experimental: {
    turbopackChunking: { minChunkSize: 50000, maxChunkCountPerGroup: 40 },
  },
}
```

## 다른 실험 flags

아래 기본값은 16.3.x API 레퍼런스 기준이다. application logic/runtime feature가 아니라 compiler output 전략이다.

| experimental key suffix | dev | build | 조건 |
| --- | --- | --- | --- |
| turbopackMinify | false | true | minification |
| turbopackSourceMaps | true | productionBrowserSourceMaps | source map 공개 정책 |
| turbopackInputSourceMaps | true | true | input maps 추출 |
| turbopackModuleFragments | false | false | module fragment 분할, 개발 중 |
| turbopackRemoveUnusedImports | false | true | RemoveUnusedExports 필요 |
| turbopackRemoveUnusedExports | false | true | tree shaking |
| turbopackInferModuleSideEffects | true | true | local side-effect analysis |
| turbopackScopeHoisting | false | true | dev에서는 비활성화 |
| turbopackClientSideNestedAsyncChunking | false | true | client async chunking |
| turbopackServerSideNestedAsyncChunking | false | false | server async chunking |
| turbopackImportTypeBytes | false | false | with type bytes import |
| turbopackUseBuiltinBabel | true | true | Babel config 자동 loader |
| turbopackUseBuiltinSass | true | true | Sass 자동 loader |
| turbopackModuleIds | named | deterministic | module ID 전략 |
| turbopackWorkerAssetPrefix | undefined | undefined | Web Worker entry/module URL prefix override |

`turbopackWorkerAssetPrefix`는 일반 assetPrefix 대신 Worker URL에만 custom prefix를 적용하며 webpack의 output.workerPublicPath에 대응한다. Worker의 entry뿐 아니라 module chunks도 같은 serving 경로와 CORS 조건으로 확인한다. local PostCSS config의 dev/build 기본값은 모두 false다.

공개 API의 나머지 threshold나 새 실험 flag는 설치 버전 reference에서 확인한다. default를 모두 next.config에 복제하면 새 버전의 개선된 기본값을 고정해 버릴 수 있다. 필요한 override만 두고 변경 전후 production build와 browser trace로 판단한다.

## chunk 비용의 해석과 persistence 이력

maxMergeChunkSize는 그 크기를 넘는 chunk를 추가 merge하지 않는 threshold이며 최종 모든 chunk의 절대 크기 상한은 아니다. 문서의 raw bytes는 압축 결과의 약 5배라는 경험적 비교이지 항상 성립하는 변환식이 아니다. firstPageLoadPriority는 0~1이며 첫 방문에서 떠나는 비율을 initial load 가중치로 삼는다. priorityRoutes는 landing route RegExp 배열, priorityBoost 1.5는 그 경로의 중요도 배수다. component chunk 중 minComponentChunkSize보다 작은 구성 요소는 하나로 묶는다. filesystem cache는 15.5 canary 실험 도입, 16.0 beta와 dev/build flag 분리, 16.1 dev 기본 활성화, 16.3 build 기본 활성화 순서다. container/CI에서 .next/cache를 실제 복원하거나 cache mount로 유지해야 다음 실행이 warm하다.

## 출처

- [Next.js, Turbopack API Reference](https://nextjs.org/docs/app/api-reference/turbopack)
- [Next.js, app/api-reference/config/next-config-js/turbopackFileSystemCache](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache)
- [Next.js, app/api-reference/config/next-config-js/turbopackMemoryEviction](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackMemoryEviction)
- [Next.js, app/api-reference/config/next-config-js/turbopackLocalPostcssConfig](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackLocalPostcssConfig)
- [Next.js, app/api-reference/config/next-config-js/turbopackRustReactCompiler](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackRustReactCompiler)
- [Next.js, app/api-reference/config/next-config-js/turbopackChunking](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackChunking)
- [Next.js, pages/api-reference/config/next-config-js/turbopackChunking](https://nextjs.org/docs/pages/api-reference/config/next-config-js/turbopackChunking)

## 관련 문서

- [[NextJS-Turbopack]]
- [[NextJS-Config-Rendering]]
