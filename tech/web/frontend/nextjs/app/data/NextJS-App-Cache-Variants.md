---
tags: [nextjs, app-router, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["shared, remote와 private 캐시 선택"]
---

# shared, remote와 private 캐시 선택

## 캐시의 저장 위치와 사용자 범위

| directive | server reuse | 직접 request read | 비용/용도 |
| --- | --- | --- | --- |
| use cache | instance memory/handler, shared | 불가 | static shell과 기본 runtime cache |
| use cache: remote | instances 공용 remote handler | 불가 | 느린/제한 backend 부하 보호 |
| use cache: private | production 한 요청 dedup, cross-request server 저장 없음 | cookies/headers/query 가능 | 개인화 browser cache |

셋 모두 Cache Components가 필요하다. remote는 cacheHandlers로 구현하며 플랫폼이 제공할 수도 있다. private에는 custom handler를 설정할 수 없다. private browser memory는 reload 후 지속하지 않는다.

## remote가 이득인 조건

memory eviction/restart/serverless 분리 때문에 runtime hit가 낮고 backend가 느리거나 rate-limited/비싸면 remote를 검토한다. remote lookup 자체의 network 비용이 있으므로 이미 data layer KV가 있거나 local query가50ms 미만, key가 거의 unique, 데이터가 초단위로 바뀌면 역효과일 수 있다.

key cardinality를 줄이는 의미 있는 dimension을 선택한다. `getPrices(productId,currency)`는 모든 사용자별 sessionId cache보다 공유하기 좋다. category 결과를 cache한 뒤 price filter를 바깥에서 적용하면 entry 크기는 늘지만 filter별 miss를 줄인다. 민감한 권한별 결과를 무조건 공용으로 합치지는 않는다.

```ts
async function getLocalizedContent(language: string) {
  'use cache: remote'
  cacheLife('hours')
  return cms.getContent(language)
}
```

cookie language는 바깥에서 읽어 전달한다. use cache와 remote 모두 직접 cookies/header를 읽는 scope가 아니다. deployment/build id를 key에 포함하므로 remote도 새 배포에 이전 entry가 자동 carry-over되지 않는다. 배포 사이 persistence가 필요하면 fetch cache/unstable_cache 계약을 별도 검토한다.

## private가 필요한 조건

request read를 외부 argument로 refactor하기 어렵거나 개인 정보가 production cross-request server cache에 저장되면 안 되는 조건에 private를 사용한다.

```ts
async function getRecommendations(productId: string) {
  'use cache: private'
  cacheLife({ stale: 60 })
  const session = (await cookies()).get('session')?.value
  return loadRecommendations(productId, session)
}
```

private work는 request-time이며 build static shell 생성에서 제외된다. production에서 같은 요청 안의 matching 호출은 dedup될 수 있어 preload와 소비자가 재사용한다. client stale이30초 이상이면 per-link prefetch,5분 이상이면 runtime prefetch의 App Shell 참여 조건을 만족한다. 이것을 build 시 개인 데이터를 생성한다는 뜻으로 읽지 않는다.

request-only dedup이 목적이면 stale:Infinity로 route stale을 불필요하게 낮추지 않을 수 있다. route 전체는 가장 짧은 다른 entry/route stale로 결정될 수 있다. Infinity가 private output을 server cross-request에 저장하게 만들지는 않는다.

## 중첩과 금지

remote 안 remote, regular use cache 안 remote는 가능하다. private 안 remote와 remote 안 private는 금지다. private에서 cookies/header/searchParams는 허용하지만 connection은 금지다. io는 cached scope에서 no-op인 별도 계약이다.

공식 remote 예제의 한 backend query/분 보장은 실제 분산 동시 revalidation과 handler가 어떻게 coalesce하는지까지 검증한 운영 보장으로 확대하지 않는다. cache hit/revalidation/log/원본 query 수를 관측해 부하 절감 효과를 확인한다.

## private와 remote의 고유 예제

private 상품 예는 generateStaticParams가 id='1'을 제공하고 ProductDetails와 Recommendations의 Suspense를 분리한다. getRecommendations(productId)는 recommendations-{id} tag와 stale 60초를 설정하며 cookies['session-id']의 기본값 guest로 개인 추천을 읽는다. cookie/header/searchParams는 private에서 허용하지만 regular/remote에서는 밖에서 추출해야 한다. connection은 양쪽 모두 금지다. private는 16.0에서 Cache Components로 활성화되었다.

remote 가격 예는 id 1/2/3을 prerender한다. ProductPrice가 cookies.currency(기본 USD)를 읽어 getProductPrice(productId, currency)에 전달한다. helper는 product-price-{id} tag와 expire 3600초로 DB 가격을 모든 instance 및 같은 currency 사용자에게 공유한다. category 목록 예는 params.category와 searchParams.minPrice를 Suspense child에서 읽고 category만 remote key로 쓴다. 가격은 밖에서 parseFloat(minPrice)로 filter하므로 원본 목록 entry는 커지지만 가격별 unique key를 만들지 않는다. language cookie의 기본값 en을 getCMSContent(language)의 expire 3600초에 전달하면 언어 10~50개 entry로 사용자별 수천 entry를 대체할 수 있다. 사용자 profile은 대부분 원본 또는 기존 KV에서 조회하고 필요하면 짧은 memory cache를 검토한다.

DashboardStats는 connection()을 먼저 await해 request time으로 미룬다. getGlobalStats()의 aggregate(total_users/active_sessions count, revenue sum)를 remote/global-stats/expire 60초로 공유한다. 원문의 분당 원본 요청 한 회 주장은 handler의 동시 miss/revalidation 보장과 구분한다. FeedItems도 connection 뒤 remote feed-items/expire 120초 API를 읽고 각 FeedItem을 렌더한다. Report는 connection 뒤 generateReport()의 transactions 조회와 revenue/topProducts/trends 계산을 remote/expire 3600초로 재사용한다. connection은 auth 검증을 수행하지 않으므로 실제 보안 검사는 별도로 필요하다.

혼합 상품 구성은 regular getProduct(id)의 product-{id}가 shell data, remote getProductPrice(id)의 product-price-{id}/expire 300초가 request 시 공유 가격, private getRecommendations의 session-id/expire 60초가 개인 추천이다. 가격과 추천을 별도 Suspense/skeleton으로 두고 가격 쪽에만 connection을 둔다. remote 안 remote와 regular 안 remote의 허용 예는 outer가 inner helper를 await한다. private/remote 양방향 중첩은 실패한다.

| 차이 | regular | remote | private |
| --- | --- | --- | --- |
| 사용자 범위 | shared | shared | browser별 |
| 서버 재사용 | memory/handler | shared remote handler | 없음 |
| 서버 hit | runtime에서 낮을 수 있음 | instance 공유로 높일 수 있음 | 해당 없음 |
| 추가 비용/지연 | 기본 memory는 없음 | storage/network 및 lookup | 없음 |
| 새 배포에 재사용 | 없음 | 없음 | 서버 저장 없음 |

remote는 Node.js/Docker/adapter를 지원하고 static export는 지원하지 않으며 16.0에서 활성화되었다. self-host는 cacheHandlers를 설정한다. build마다 function identity/return shape/dependency가 바뀔 수 있으므로 새 key는 오래된 값과 shape가 맞지 않는 문제를 막는다. static shell에서도 CMS의 동시 revalidation 부하가 문제라면 remote를 사용할 수 있다.

## 이해 확인

1. remote cache를 sessionId별 검색 결과에 적용하면 어떤 비용이 늘어나는가?
2. private cache는 production server에 요청 사이 개인 데이터를 저장하는가?
3. remote/private를 서로 nested할 수 없을 때 request read와 shared content를 어떻게 분리할 것인가?

## 출처

- [Next.js, use-cache-private](https://nextjs.org/docs/app/api-reference/directives/use-cache-private)
- [Next.js, use-cache-remote](https://nextjs.org/docs/app/api-reference/directives/use-cache-remote)

## 관련 문서

- [[NextJS-App-Cache-Functions]]
- [[NextJS-App-Cache-Life]]
- [[NextJS-App-Fetching]]
