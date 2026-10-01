---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 캐시 수명 설정", "NextJS-Config-Cache-Policy"]
---

# Next.js 캐시 수명 설정

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## cacheLife

`cacheLife` object는 `use cache` 범위에서 쓰는 cache profile을 정의한다. `cacheComponents: true`와 함께 설정하고 `cacheLife('blog')`처럼 호출한다. 기본 profile 이름 default, seconds, minutes, hours, days, weeks, max를 같은 key로 덮어쓸 수도 있다.

```ts
export default {
  cacheComponents: true,
  cacheLife: { blog: { stale: 3600, revalidate: 900, expire: 86400 } },
}
```

```ts
import { cacheLife } from 'next/cache'

export async function getArticle() {
  'use cache'
  cacheLife('blog')
  return fetch('https://api.example.com/article').then((r) => r.json())
}
```

stale은 client가 server를 확인하지 않고 값을 재사용하는 초, revalidate는 server background refresh 주기, expire는 stale 사용의 최종 허용 기간이다. 각 numeric field는 선택적이며 expire는 revalidate보다 길어야 한다. client stale과 server revalidate를 같은 TTL로 설명하지 않는다.

## cacheMaxMemorySize

숫자 bytes 기본 `50 * 1024 * 1024`다. 각 server instance의 prerender/route-handler/image server cache와 built-in use cache handler의 메모리 상한을 조절한다. 0이면 두 in-memory cache를 비활성화한다. custom cacheHandlers는 자체 메모리를 관리하므로 이 상한이 자동 적용되지 않는다.

custom cacheHandler를 사용하는 distributed deployment에서는 0으로 두어 per-instance copy 대신 shared store를 조회하도록 할 수 있다. `next dev`는 자체 memory cache를 유지하므로 production처럼 그대로 적용되지 않는다. serverless에서 request 사이 cache가 잘 살아남지 않는 상황을 흉내 내는 데도 쓸 수 있다.

## expireTime

숫자 seconds로 ISR response의 CDN stale-while-revalidate window를 조절한다. 예를 들어 revalidate 900초, expireTime 3600초이면 `s-maxage=900, stale-while-revalidate=2700`이 된다. 전체 허용 기간에서 fresh period를 뺀 값이 SWR window다. component/function cacheLife profile과 다른 HTTP/CDN 설정이다.

## staleTimes

실험 `{ dynamic: number, static: number }`는 client page segment cache의 재사용 시간을 seconds로 설정한다. dynamic은 정적 생성/완전 prefetch가 아닌 page, static은 정적 page 또는 Link prefetch true/router.prefetch다. 현재 기본 dynamic 0초, static 300초이며 dynamic 기본값은 15.0에서 30초에서 0으로 바뀌었다.

Loading boundary는 static 기간 동안 재사용한다. shared layout partial rendering과 browser back/forward cache behavior를 바꾸지 않는다. 서버 data freshness나 mutation 후 재검증의 대체물로 사용하지 않는다.

## 체크포인트

값이 오래 보일 때 client segment, use cache result, server response/ISR, CDN 중 어디에 남았는지 먼저 분리한다. 메모리 크기와 expiration은 다른 축이다. mutation 이후 단일 인스턴스에서 최신 값을 봐도 다른 인스턴스와 CDN에서 갱신되었는지 별도로 확인한다.

## staleTimes 도입

staleTimes는 14.2에 실험 도입됐고 15.0에서 dynamic 기본이 30초에서 0초로 바뀌었다. dynamic:30/static:180 예시는 사용자 설정이며 현재 기본 0/300과 구분한다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/cacheLife](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheLife)
- [Next.js, app/api-reference/config/next-config-js/cacheMaxMemorySize](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheMaxMemorySize)
- [Next.js, app/api-reference/config/next-config-js/expireTime](https://nextjs.org/docs/app/api-reference/config/next-config-js/expireTime)
- [Next.js, app/api-reference/config/next-config-js/staleTimes](https://nextjs.org/docs/app/api-reference/config/next-config-js/staleTimes)

## 관련 문서

- [[NextJS-Config-Cache-Handlers]]
- [[NextJS-Config-Server-Cache]]
- [[NextJS-Config-Prefetch]]
