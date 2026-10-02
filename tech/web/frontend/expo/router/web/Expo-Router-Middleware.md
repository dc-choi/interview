---
tags: [expo, expo-router, web]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router server middleware와 header"]
---

# Expo Router server middleware와 header

## middleware 지원과 실행 범위

SDK 54~57은 Router plugin의 `unstable_useServerMiddleware: true`가 필요하며 SDK 58부터 stable이고 그 flag는 deprecated/no-op이다. production에는 배포 server가 필요하다. SDK 57은 server output, SDK 58은 static+apiRoutes=true에서도 사용할 수 있다.

root `src/app/+middleware.ts`는 하나만 둔다. default export는 immutable Request를 받고 Response를 반환하면 즉시 종료, 아무것도 반환하지 않으면 route로 넘긴다. headers/url/method/query를 읽을 수 있지만 header set/append/delete, body/text/json/formData 소비는 막혀 있다.

```ts
import { setResponseHeaders } from 'expo-server';
export const unstable_settings = {
  matcher: { methods: ['GET'], patterns: ['/api/[...path]'] },
};
export default function middleware(request: Request) {
  setResponseHeaders({ 'X-App-Version': '1.0.0' });
}
```

matcher pattern 중 하나가 맞으면 선택되고 methods와 patterns를 함께 두면 두 조건 모두 통과해야 한다. `/api`는 exact라 `/api/users`를 포함하지 않으며 `[id]`는 한 segment, `[...path]`는 한 개 이상의 segment, RegExp는 복잡한 조건을 표현한다. 작은 matcher로 overhead를 줄인다.

초기 page load, refresh, 직접 URL, API call과 SSR의 실제 HTTP 요청에서 실행된다. Link/router client 이동, native screen transition, prefetch와 image/font static 요청에서는 실행되지 않는다. 서버 middleware 하나로 client route 접근 전체를 통제했다고 주장할 수 없다.

## 인증 예제의 한계

middleware에서 header/cookie를 확인해 401/403 또는 redirect를 반환할 수 있다. guide의 jwtVerify 예시는 async 처리를 누락하고 `Bearer ` 접두사만 확인하는 별도 예제는 token 검증이 아니므로 완성된 인증으로 복제하지 않는다. provider의 검증, 만료와 signature 확인이 필요하다.

CORS header만 붙이려는 middleware가 `new Response()`를 반환하면 route 실행을 끝낸다. 이후 route response에 추가하려면 `setResponseHeaders`를 쓰고 반환하지 않는다. OPTIONS를 실제 처리해야 하는 경우에는 의도적으로 preflight response를 반환한다.

## 전역 server headers

SDK 54 이후 `expo-server`로 serve하는 export에서 plugin headers를 설정한다. 값은 string 또는 string[]이고 Set-Cookie처럼 여러 값을 유지할 수 있다.

```json
{ "expo": { "plugins": [["expo-router", { "headers": {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff"
} }]] } }
```

전역 header는 static/SSR HTML과 API response에 적용하지만 redirect와 JavaScript/image/font static assets에는 적용하지 않는다. static hosting에 파일만 올리는 방식은 expo-server의 header 처리를 보장하지 않는다. API route가 같은 header를 지정하면 route 값이 우선한다.

Cache-Control은 공개/개인 데이터 구분 후 설정하고 route별 no-store가 전역 public cache보다 우선하도록 유지한다. SharedArrayBuffer용 COEP credentialless/COOP same-origin은 embed/resource 정책에 영향을 준다. guide의 X-XSS-Protection 예시를 최신 권장 보안 정책의 전부로 취급하지 않는다. cookie/session 값은 고정 global config보다 요청별 runtime에서 생성해야 한다.

## 출처

- [Expo Documentation, Server middleware](https://docs.expo.dev/router/web/middleware)
- [Expo Documentation, Server headers](https://docs.expo.dev/router/web/server-headers)

## 관련 문서

- [[Expo-Router]]
