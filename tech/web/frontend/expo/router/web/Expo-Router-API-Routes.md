---
tags: [expo, expo-router, web]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router API routes와 서버 runtime"]
---

# Expo Router API routes와 서버 runtime

API route는 `src/app/hello+api.ts`처럼 +api 파일로 서버 endpoint를 정의한다. 같은 URL에 HTTP method별 named export를 두며 GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS가 지원된다. 미지원 method는 405, 처리 중 일반 exception은 500이다. 서버는 WinterCG 호환 Request/Response 환경을 사용하고 production에는 배포된 runtime이 필요하다.

```ts
export async function POST(request: Request) {
  const input = await request.json();
  if (typeof input?.title !== 'string') {
    return Response.json({ error: 'title required' }, { status: 400 });
  }
  return Response.json({ title: input.title }, { status: 201 });
}
```

SDK 57은 `web.output: 'server'`로 server bundle을 export한다. SDK 58부터 server는 SSR 의미이며 build-time HTML과 API를 함께 쓰려면 static output + plugin apiRoutes=true를 선택한다. apiRoutes=false는 해당 rendering mode에서 API를 끈다. API filename에는 `.web.ts` 등 플랫폼 확장자를 쓰지 않는다.

## request와 response

handler 첫 인수는 Request, 두 번째는 dynamic route parameter record다. body는 json/text/formData 등의 표준 API, query는 new URL(request.url).searchParams로 읽는다. Response.json, new Response(body,{status,headers}) 또는 Response.redirect로 결과를 만들고 입력/body parsing 실패를 다룬다.

relative fetch는 개발 server origin을 사용한다. production native에서는 Router plugin origin에 HTTPS server를 지정해야 `fetch('/hello')`가 올바른 server를 찾는다. web bundle과 native 앱의 API origin/version 호환성을 함께 유지한다.

## expo-server utilities

SDK 54 이후 `expo-server`를 설치해 server code에서 요청 범위 helper를 사용한다.

| utility | 계약 |
| --- | --- |
| `StatusError(status, message)` | throw하면 `{ error: ... }` JSON HTTP response로 변환 |
| `throw Response` | resolved response 대신 그대로 반환, redirect 등 유연한 제어 |
| `origin()` | 현재 요청의 공개 origin, proxy 내부 URL과 다를 수 있음 |
| `environment()` | runtime의 staging/production 등 환경 이름, 정의되지 않을 수 있음 |
| `runTask(async fn)` | response와 병행, runtime에 background 작업 생존을 알림 |
| `deferTask(async fn)` | route가 Response로 resolve한 이후 실행 |
| `setResponseHeaders(object/callback)` | 아직 만들어지지 않은 response의 header 설정/append |

helper는 현재 요청 중 server code에서만 호출한다. await는 response를 지연하고 단순 fire-and-forget은 serverless 종료로 작업이 중단될 수 있어 runTask/deferTask가 필요하다. 이들은 영속 job queue나 무기한 실행을 보장하는 대체가 아니다.

## bundle과 secret 경계

Metro는 TypeScript, path aliases, Babel와 Node built-in을 사용해 server를 bundle한다. server code에는 EXPO_PUBLIC_ 이외 환경 변수도 제공된다. +api와 loader/server export만의 dependency는 client에서 제거되지만 같은 secret module을 client code가 import하면 노출된다. `src/app`에 그냥 둔 일반 파일은 secret 저장 경계가 아니다. stripping에는 expo/metro-config가 필요하다.

현재 API beta bundle은 Node built-in을 제외해 단일 파일로 묶고 외부 dynamic dependency/native binary library(sharp 등)에는 제약이 있다. 출력은 CommonJS로 변환되며 source는 ESM으로 작성할 수 있어도 ESM-only runtime 계약을 가정하지 않는다.

## 출처

- [Expo Documentation, API Routes](https://docs.expo.dev/router/web/api-routes)

## 관련 문서

- [[Expo-Router-Server-Deployment]]
- [[Expo-Router-Middleware]]
- [[Expo-Router-Data-Loaders]]
