---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Hosting cache 계약"]
---

# EAS Hosting cache 계약

API route의 Cache-Control은 browser와 EAS CDN의 cache lifetime을 제어한다. GET/HEAD는 기본 URL, POST는 URL+body가 key이며 Vary로 request headers를 key에 더한다. Authorization 없는 GET/HEAD는 기본적으로 public cache 대상이므로 개인별 응답의 private/no-store를 명시한다.

## Response directives

public은 shared cache, private은 browser에 한정한다. max-age는 fresh seconds, s-maxage는 shared cache lifetime이다. CDN-Cache-Control은 browser 정책과 CDN 정책을 분리하고 public을 암묵적으로 더한다.

```ts
return Response.json(publicData, {headers:{
  'Cache-Control':'no-store',
  'CDN-Cache-Control':'max-age=3600'
}});
```

이 예제는 browser 저장을 막으면서 CDN에 publicData를 저장한다. 사용자별 응답에 그대로 적용하지 않는다. no-store는 저장 금지다. 원문은 no-cache를 저장 금지와 max-age=0 양쪽으로 설명하므로 두 지시어를 동일 의미로 단정하지 않는다. no-cache는 재검증 없이 재사용하지 않는 HTTP 계약과 구분해 설계하고 민감한 값에는 no-store를 명시한다. immutable도 내용의 무한 보존 보장이 아니라 변경하지 않는 resource의 freshness 전략으로 다룬다.

stale-while-revalidate=3600은 stale 이후 해당 기간 동안 응답을 주고 background에서 재검증한다. stale-if-error는 route crash 또는 500/502/503/504일 때 stale을 대신 준다. max-age=1800와 두 지시어의 기간을 혼동하지 않는다. Expires는 HTTP date까지 fresh로 표시하지만 public을 암묵적으로 추가하지 않는다.

## Request, POST와 CORS

only-if-cached는 cache가 없으면 504, no-store/no-cache/max-age=0은 cache를 건너뛴다. min-fresh는 원문 Hosting 설명상 지정 시간보다 오래된 응답을 제외한다. max-stale/stale-if-error는 server가 허용한 stale 기간을 줄일 수 있지만 늘리지 못한다. 표준 directive의 일반 의미와 Hosting 구현 설명이 다른 부분은 실제 응답과 정책을 확인한다.

POST body가 1MB 미만이며 response가 public을 선언하면 POST도 cache할 수 있다. mutating write의 결과를 무분별하게 cache하지 않는다. Vary: custom-header는 해당 값이 같은 request에서만 reuse한다. Origin에 따라 CORS가 다르면 Vary를 유지한다. OPTIONS의 Access-Control-Max-Age=3600은 browser와 Hosting preflight cache에 적용된다.

## Asset, alias와 비용

static assets의 browser cache는 기본3600초, 배포별 내부 cache는 indefinitely다. immutable 배포가 alias에 재할당되면 Hosting의 이전 asset cache는 무시되어 새 배포를 사용한다. 이미 열린 browser state와 사용자 cache까지 모두 즉시 삭제된다는 뜻은 아니다.

CDN cache hit도 request quota/과금과 metrics에 포함된다. cache는 compute/load를 줄이지만 request 수 자체를 제거하지 않는다.

## 출처

- [Expo Documentation, Caching with EAS Hosting deployments](https://docs.expo.dev/eas/hosting/reference/caching)

## 관련 문서

- [[Expo-EAS-Hosting-Headers]]
- [[Expo-EAS-Hosting-Observability]]
