---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js adapter output 유형과 prerender 분류", "NextJS-Adapter-Outputs"]
---

# Next.js adapter output 유형과 prerender 분류

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## outputs

onBuildComplete의 outputs는 pages, pagesApi, appPages, appRoutes, prerenders, staticFiles와 optional middleware를 제공한다. middleware는 함수 object이며 다른 route arrays와 같은 배열로 가정하지 않는다. output export에서는 staticFiles만 채워지고 server/page/prerender arrays는 비어 있는 조건을 따른다.

| property | type | 의미 |
| --- | --- | --- |
| pages | PAGES[] | Pages UI entrypoints |
| pagesApi | PAGES_API[] | Pages API handlers |
| appPages | APP_PAGE[] | App UI/RSC entrypoints |
| appRoutes | APP_ROUTE[] | App API/metadata handlers |
| prerenders | PRERENDER[] | 정적/ISR/partial response와 fallback |
| staticFiles | STATIC_FILE[] | static assets/자동 정적 Pages |
| middleware | MIDDLEWARE? | middleware/proxy 함수 |

## server route 공통 fields

id는 output identity, filePath는 built module path, pathname은 serve URL, sourcePage는 original source, runtime은 nodejs 또는 deprecated edge다. App UI의 RSC pathname은 .rsc suffix를 포함할 수 있다.

assets는 repoRoot-relative path를 key, absolute source path를 value로 둔다. assetsHashes는 같은 key의 content hash다. wasmAssets는 name-to-absolute path mapping이다. copy/package할 때 absolute path를 public URL로 노출하지 않고 repo-relative layout을 유지한다.

config는 maxDuration seconds, deprecated preferredRegion string/array, Edge-only env를 포함할 수 있다. Edge에는 modulePath/entryKey/handlerExport canonical metadata가 추가된다. MIDDLEWARE pathname은 /_middleware, sourcePage는 middleware이며 config.matchers는 source/sourceRegex/has/missing을 포함한다.

## PRERENDER 관계

id/pathname, parentOutputId(source route), groupId(revalidation group), route(filesystem dynamic template)를 가진다. 같은 groupId는 함께 revalidate한다. fallback은 filePath, initialStatus/Headers, initialExpiration seconds, initialRevalidate number/false, postponedState를 포함한다. parentFallbackMode false는 추가 URL 없음, null은 blocking, string은 HTML fallback path다.

config allowQuery는 cache key에 허용할 query names, allowHeader는 ISR headers, bypassFor는 조건, renderingMode는 STATIC/PARTIALLY_STATIC, partialFallback은 shell을 완성 route로 background upgrade하는 동작, bypassToken은 prerender bypass 신호다. security-related cache inputs를 packaging 중 제거하면 안 된다.

## routeType response compute

세 field는 prerender group의 primary response에 함께 제공된다. 관련 RSC/data/segment 출력에서는 생략하며 Pages fallback false의 unmatched template도 생략한다. 없다고 정적 완성 response로 단정하지 않는다.

| 축 | 값 | 의미 |
| --- | --- | --- |
| routeType | route | 비UI Route Handler 등 |
| routeType | page | missing prerenderable parameter가 없는 UI URL |
| routeType | shell | URL class의 가장 구체적 reusable shell |
| routeType | fallback | parameter를 채워 더 특수화할 reusable response |
| response | empty | initial response 제공 불가 |
| response | initial | 완성 전 initial UI만 제공 가능 |
| response | complete | 완성 response, 204의 zero bytes도 포함 |
| compute | blocking | request compute 시작 전 initial response 불가, 이후 streaming 가능 |
| compute | resuming | initial response를 보내면서 deferred work 재개 |
| compute | static | request-time server compute 없음 |

htmlSize는 primary App HTML의 bytes이며 0은 empty shell이다. Pages/Route Handler/related RSC에는 생략된다. zero-byte response와 missing output을 같게 처리하지 않는다.

## PPR chain과 static files

prerender pprChain.headers는 next-resume: 1 같은 internal resume header를 제공한다. fallback.postponedState와 함께 runtime protocol에 사용한다. static file은 id, absolute filePath, routable pathname과 optional immutableHash다. full hash로 immutable collision을 확인한다.

## 검증

output.id/sourcePage/parentOutputId/groupId를 유지하고 URL path만으로 owner를 합치지 않는다. 빌드 seed의 cache metadata와 runtime route namespace를 함께 보존한다. static export, App/PPR, Pages API와 dynamic fallback 사례를 각각 packaging해서 실행한다.

## field 타입과 선택성

| 위치 | 필수 타입 | 선택적 타입 |
| --- | --- | --- |
| server output | id/filePath/pathname/sourcePage:string, runtime:nodejs 또는 edge, assets/assetsHashes:Record<string,string>, config:object | wasmAssets:Record<string,string>, edgeRuntime:object |
| route config | 없음 | maxDuration:number, preferredRegion:string 또는 string[], env:Record<string,string> |
| middleware config | route config와 동일 | matchers:Array<{source:string,sourceRegex:string,has:RouteHas[] 또는 undefined,missing:RouteHas[] 또는 undefined}> |
| prerender | id/pathname/parentOutputId/route:string, groupId:number, config:object | routeType/response/compute enum, htmlSize:number, pprChain:{headers:Record<string,string>}, parentFallbackMode:false 또는 null 또는 string, fallback:object |
| fallback | filePath:string 또는 undefined, postponedState:string 또는 undefined | initialStatus/initialExpiration:number, initialHeaders:Record<string,string 또는 string[]>, initialRevalidate:number 또는 false |
| prerender config | 없음 | allowQuery/allowHeader:string[], bypassFor:RouteHas[], renderingMode:STATIC 또는 PARTIALLY_STATIC, partialFallback:boolean, bypassToken:string |
| static | id/filePath/pathname:string, immutableHash:string 또는 undefined | 없음 |

선택적 field가 없는 것과 값이 undefined인 필수 property를 구분해 interface를 구현한다. static immutableHash는 filename에 content hash가 들어갈 때 제공된다. route config의 env는 Edge 전용이고 preferredRegion은 deprecated다.

## 출처

- [Next.js, app/api-reference/adapters/output-types](https://nextjs.org/docs/app/api-reference/adapters/output-types)
- [Next.js, pages/api-reference/adapters/output-types](https://nextjs.org/docs/pages/api-reference/adapters/output-types)

## 관련 문서

- [[NextJS-Adapter-Lifecycle]]
- [[NextJS-Adapter-PPR]]
- [[NextJS-Immutable-Assets]]
- [[NextJS-Config-Server-Cache]]
