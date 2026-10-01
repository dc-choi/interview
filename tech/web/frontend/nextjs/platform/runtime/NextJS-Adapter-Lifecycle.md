---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 배포 adapter 생명주기", "NextJS-Adapter-Lifecycle"]
---

# Next.js 배포 adapter 생명주기

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## Deployment Adapter

adapter는 build-time integration surface다. 설정을 조정하고 생성 outputs/routing을 플랫폼의 artifact와 infrastructure로 바꾼다. HTTP 요청 handling, streaming과 runtime cache는 Next.js handler 및 cacheHandler/cacheHandlers가 담당한다. 일반 self-hosted next start 앱은 custom adapter 없이 실행할 수 있다.

module이 next의 NextAdapter interface를 구현하는 object를 export하고 required name, optional modifyConfig/onBuildComplete hooks를 제공한다. config adapterPath 또는 NEXT_ADAPTER_PATH로 로드한다.

```js
const adapter = {
  name: 'example-platform',
  async modifyConfig(config, { phase }) {
    if (phase !== 'phase-production-build') return config
    return { ...config }
  },
  async onBuildComplete({ outputs, routing, distDir }) {
    await packageForPlatform({ outputs, routing, distDir })
  },
}
module.exports = adapter
```

packageForPlatform은 플랫폼이 구현하는 지점이며 위 코드는 hook 위치를 설명하는 skeleton이다. 실제 provider implementation은 output types와 path/headers/caching 계약을 처리해야 한다.

## modifyConfig

`modifyConfig(config: NextConfigComplete, ctx)`는 수정된 complete config 또는 Promise를 반환한다. ctx는 phase, nextVersion, projectDir absolute path를 제공한다. config를 읽는 CLI commands 전반에서 호출할 수 있으므로 build 전용 side effect는 phase로 제한한다. 사용자가 명시한 opt out을 덮어쓰지 않는다.

## onBuildComplete

generation까지 완료된 후 context를 받는다. routing, outputs, projectDir, repoRoot, distDir, final config(modifyConfig 적용), nextVersion과 buildId가 있다. sync void/Promise<void>를 반환한다. projectDir와 detected repoRoot를 혼동하면 assets relative paths가 깨질 수 있다. config를 임의로 재추론하지 않고 final config를 사용한다.

## use cases

provider별 output packaging, assets processing, build metrics, custom bundles, output validation과 processed route config generation에 사용한다. assets 복사와 runtime serve URL mapping을 같은 식별자로 연결한다. shared store/proxy/permissions는 플랫폼 별 작업이며 adapter hook의 존재만으로 생기지 않는다.

## runtime context

ctx.waitUntil(Promise<void>)는 response 이후 revalidation/cache write가 끝날 때까지 serverless lifetime을 유지하도록 platform에 연결한다. requestMeta.onCacheEntryV2는 cache lookup/generation 때 실행 instance에서 호출되므로 shared storage에 전파해야 한다. legacy onCacheEntry는 deprecated다.

## Node.js entrypoint

`handler(req: IncomingMessage, res: ServerResponse, ctx): Promise<void>`는 mutable Node response를 쓴다. ctx의 requestMeta에는 relativeProjectDir(process.cwd 기준), hostname, revalidate({ urlPath, headers, opts }), Pages notFound용 render404 등을 넘길 수 있다. Next internals에서 filename을 추론하는 대신 지원된 metadata contract를 사용한다.

## deprecated Edge entrypoint

`handler(request: Request, ctx): Promise<Response>`는 Web Request/Response와 optional signal/waitUntil/requestMeta를 쓴다. output.edgeRuntime.modulePath chunks를 평가한 뒤 globalThis._ENTRIES의 entryKey를 읽고 handlerExport를 invoke한다. canonical metadata의 현재 export는 handler다. filename에서 registry key를 만들지 않는다.

## 보안과 운영

source metadata/env/secrets를 public asset upload에서 제외하고 build artifact permissions를 제한한다. response 이후 work가 실제 완료되는지, stale background job이 과거 deployment cache를 오염시키지 않는지 확인한다. adapter는 고정 Next version과 compatibility tests를 함께 운영한다.

## NextAdapter의 output container와 타입

NextAdapter.name은 string이다. AdapterOutputs는 pages(PAGES[]), optional middleware(MIDDLEWARE), appPages(APP_PAGE[]), pagesApi(PAGES_API[]), appRoutes(APP_ROUTE[]), prerenders(PRERENDER[]), staticFiles(STATIC_FILE[])를 가진다. modifyConfig의 ctx.phase는 PHASE_TYPE, nextVersion/projectDir는 string이며 NextConfigComplete 또는 Promise<NextConfigComplete>를 반환한다. onBuildComplete는 void 또는 Promise<void>다. Route는 sourceRegex:string 필수, source/destination:string, headers:Record<string,string>, has/missing:RouteHas[], status:number, priority:boolean이 선택적이다. minimal 예시는 phase-production-build에서만 config를 변경하고 outputs 각 배열의 pathname/filePath와 buildId, dynamicRoutes.length를 읽는다.

## handler의 선택적 context와 반환 타입

Node ctx는 optional waitUntil:(Promise<void>)=>void와 requestMeta이며 반환 Promise<void>다. requestMeta.relativeProjectDir는 process.cwd()에서 Next project까지 상대경로, hostname은 Route Handler absolute URL 생성용 선택값이다. revalidate({urlPath,headers,opts})는 network를 통하지 않는 플랫폼 내부 revalidation, render404(req,res,parsedUrl,setHeaders)는 Pages notFound:true rendering helper다. Edge ctx는 여기에 optional signal:AbortSignal을 더하고 Promise<Response>를 반환한다. entryKey에서 읽은 globalThis._ENTRIES 값이 promise일 수 있어 await 후 handlerExport를 조회한다. Edge metadata 세 값은 모두 string이며 modulePath는 absolute다. 신규 route는 deprecated Edge 대신 Node runtime을 사용한다.

## 출처

- [Next.js, app/api-reference/adapters/configuration](https://nextjs.org/docs/app/api-reference/adapters/configuration)
- [Next.js, pages/api-reference/adapters/configuration](https://nextjs.org/docs/pages/api-reference/adapters/configuration)
- [Next.js, app/api-reference/adapters/creating-an-adapter](https://nextjs.org/docs/app/api-reference/adapters/creating-an-adapter)
- [Next.js, pages/api-reference/adapters/creating-an-adapter](https://nextjs.org/docs/pages/api-reference/adapters/creating-an-adapter)
- [Next.js, app/api-reference/adapters/api-reference](https://nextjs.org/docs/app/api-reference/adapters/api-reference)
- [Next.js, pages/api-reference/adapters/api-reference](https://nextjs.org/docs/pages/api-reference/adapters/api-reference)
- [Next.js, app/api-reference/adapters/runtime-integration](https://nextjs.org/docs/app/api-reference/adapters/runtime-integration)
- [Next.js, pages/api-reference/adapters/runtime-integration](https://nextjs.org/docs/pages/api-reference/adapters/runtime-integration)
- [Next.js, app/api-reference/adapters/invoking-entrypoints](https://nextjs.org/docs/app/api-reference/adapters/invoking-entrypoints)
- [Next.js, pages/api-reference/adapters/invoking-entrypoints](https://nextjs.org/docs/pages/api-reference/adapters/invoking-entrypoints)
- [Next.js, app/api-reference/adapters/use-cases](https://nextjs.org/docs/app/api-reference/adapters/use-cases)
- [Next.js, pages/api-reference/adapters/use-cases](https://nextjs.org/docs/pages/api-reference/adapters/use-cases)

## 관련 문서

- [[NextJS-Adapter-Outputs]]
- [[NextJS-Adapter-Validation]]
- [[NextJS-Config-Server-Cache]]
- [[NextJS-Config-Cache-Handlers]]
