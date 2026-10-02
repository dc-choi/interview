---
tags: [expo, expo-sdk, server]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Server Runtime"]
---

# Expo SDK Server Runtime

expo-server는 Expo Router server export의 API route/SSR runtime이다. npx expo install expo-server와 web.output=server가 필요하다. 아래 request-context API는 server handler의 async context에서만 사용하며 client bundle/general module initialization에서 호출하지 않는다. [[Expo-Router-API-Routes]]와 [[Expo-Router-Data-Loaders]]의 흐름을 연결한다.

## Request와 response context

origin():string|null은 보통 request URL, provider에 따라 origin을 반환한다. development의 untrusted Origin header를 그대로 쓰지 않는다. environment():string|null은 provider environment이며 EAS Hosting alias/deploymentID 또는 production=null이다. 다른 provider의 NODE_ENV 문자열을 무조건 production=null 규칙으로 변환한다고 가정하지 않는다. requestHeaders():ImmutableHeaders는 immutablecopy다.

setResponseHeaders(Headers|record<string, string|string[]>|callback):void는 handler가 Response를 resolve한 뒤 반환 header에 merge한다. callback은 mutable Headers를 수정하거나 새 Headers를 반환할 수 있다. throw/reject/early response에서 적용되는 범위를 별도 확인한다. StatusError(status, body)는 handler 어디서든 throw할 수 있으며 runtime이 해당 status/body Response로 바꾼다.

```ts
import {StatusError,setResponseHeaders} from 'expo-server';
export async function GET(request) {
  if (!authorized(request)) throw new StatusError(401,'Unauthorized');
  setResponseHeaders({'Cache-Control':'private, no-store'});
  return Response.json({ok:true});
}
```

## Concurrent task와 lifecycle

runTask(async()=>...)는 즉시 시작하고 response 작업과 동시에 진행하며 완료까지 runtime을 유지한다. deferTask(()=>void|Promise)는 Response resolve 후 시작하며 handler reject 시 실행되지 않는다. 둘 다 void를 반환이며 detached Promise 대신 runtime에 lifetime을 알려준다. critical database write를 response 이후 best-effort task로 옮기면 성공 응답과 실제 완료시점이 달라지므로 필요한 write는 handler에서 await한다.

## Loaders, middleware와 metadata

createServerLoader(fn(request, params))는 SSR request마다 실행되고 SSG에는 request가 없어 throw한다. createStaticLoader(fn(params))는 SSG/SSR 둘 다 사용 가능다. LoaderFunction의 request는 ImmutableRequest|undefined, params는 record<string, string|string[]>이며 값 또는 Promise<T>를 반환한다. ImmutableRequest는 method/url/readonly headers이며 body 접근 불가다.

MiddlewareFunction(request)→Response|void|Promise는 response 반환 시 short-circuit한다. +middleware.ts의 unstable_settings:MiddlewareSettings.matcher는 methods[]와 patterns(exact/[param]/[...catchall]/RegExp)를 제한하며 미지정이면 모든 request다. experimental Router middleware 조건은 [[Expo-Router-Middleware]]에 있다.

GenerateMetadataFunction(request, params)는 Metadata|null|undefined 또는 Promise를 반환한다. Metadata는 title/description/keywords/authors/applicationName/category/creator/publisher/referrer/robots/icons/manifest/alternates/openGraph/twitter/verification/appleWebApp/appLinks/itunes/formatDetection/facebook/pinterest/archives/assets/bookmarks와 other record를 제공한다. icon descriptor는 url/media/rel/sizes/type, image descriptor는 url/alt/width/height/type/secureUrl이다. 원문 API는 nested metadata 계약 일부만 열거하므로 지원하지 않은 field를 임의 생성하지 않는다. 개인별 metadata/cache와 secret exposure를 server rendering 맥락에서 검토한다.

## Adapters

expo-server/adapter/{bun, express, http, netlify, vercel, workerd}의 createRequestHandler({build,...})로 server output을 실행한다. build는 expo export가 만든 dist/server 경로이며 provider별 runtime context가 필요하다. static dist/client 제공과 server handler 배포는 함께 구성한다. provider마다 기능/lifetime이 같다고 단정하지 않는다.

## 출처

- [Expo Documentation, Server](https://docs.expo.dev/versions/latest/sdk/server)

## 관련 문서

- [[Expo-Router-API-Routes]]
- [[Expo-Router-Data-Loaders]]
- [[Expo-Router-Middleware]]
