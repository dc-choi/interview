---
tags: [nextjs, app-router, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["cacheLife의 세 시간과 prerender 임계값"]
---

# cacheLife의 세 시간과 prerender 임계값

## stale, revalidate와 expire

cacheLife는 cache directive scope 안에서 async function/component output의 lifetime을 설정한다. module top-level에서 호출하면 오류다. 해당 cache 함수에 명시하고 한 invocation에 한 call만 실행되게 한다. 조건 branch별 다른 call은 가능하다.

| 값 | 동작 |
| --- | --- |
| stale | browser Client Cache가 server 확인 없이 재사용할 시간 |
| revalidate | 시간이 지난 뒤 **다음 요청**이 stale을 받고 background regenerate |
| expire | 이 기간 동안 갱신 없이 오래된 경우 다음 요청이 fresh 결과를 기다림 |

둘 다 명시하면 expire > revalidate여야 한다. timer가 시간에 맞춰 미리 query하는 cron은 아니다. stale은 HTTP Cache-Control이 아니라 x-nextjs-stale-time/client router 계약이다.

## 기본 프로필

| 이름 | stale | revalidate | expire |
| --- | --- | --- | --- |
| default |5분|15분|시간으로 만료 없음|
| seconds |30초|1초|1분|
| minutes |5분|1분|1시간|
| hours |5분|1시간|1일|
| days |5분|1일|1주|
| weeks |5분|1주|30일|
| max |5분|30일|1년|

```ts
async function getCachedCatalog() {
  'use cache'
  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })
  return loadCatalog()
}
```

생략한 필드는 default에서 채워지고 `{}`도 default를 적용한다. next.config.cacheLife에 custom profile을 정의하거나 기존 profile을 override할 수 있다. hours를 하루로 바꾸면 이름이 주는 기대와 달라지므로 프로젝트에 명시한다. generated type/JSDoc은 실제 config를 반영한다. staleTimes.static 변경은 default stale에도 영향을 준다.

## prerender 참여 조건

| 조건 | 결과 |
| --- | --- |
| revalidate=0 또는 expire<5분 | prerender에서 제외, dynamic hole |
| stale<30초 | prerender 제외 |
|30초≤stale<5분 | prerender 가능하지만 route App Shell에서는 제외 |
| 충분한 expire/revalidate와 stale≥5분 | App Shell 참여 가능 |

seconds는 expire가1분이라 prerender 밖이다. dynamic hole은 Suspense fallback으로 감싸야 한다. browser time-based expiry는 최소30초를 적용하지만 Action의 refresh/revalidatePath/revalidateTag/updateTag는 전체 client cache를 즉시 clear하여 stale을 우회한다. route stale과 HTTP cache header를 같은 값으로 관리하지 않는다.

## nested lifetime의 실제 의미

explicit outer cacheLife가 있으면 outer lifetime이 짧든 길든 우선한다. outer hit는 inner query를 실행하지 않고 포함된 complete output을 반환한다. inner minutes가 outer hours를 자동 fresh하게 만들지 않는다.

outer에 명시 cacheLife가 없으면 default를 출발점으로 inner의 더 짧은 lifetime이 줄일 수 있으나 긴 inner가 default를 늘리지 않는다. short-lived inner가 implicit outer를 short로 만들면 prerender 오류다. imported component/dependency 안의 inner도 원인이 된다.

해결은 outer에 `cacheLife('default')` 또는 필요한 짧은 profile을 명시한다. 후자는 intentional dynamic이며 Suspense가 필요하다. cached outer UI와 dynamic slot을 나눠 fresh 요구에 맞게 구조를 정한다.

## 데이터 기반/조건부 lifetime

```ts
async function getPost(slug: string) {
  'use cache'
  const post = await loadPost(slug)
  cacheTag(`post-${slug}`)
  if (!post) { cacheLife('minutes'); return null }
  cacheLife({ revalidate: post.revalidateSeconds ?? 3600 })
  return post
}
```

없는 항목은 곧 게시될 수 있어 짧게, 존재 항목은 CMS 값에 따라 길게 두는 예다. 실제 반환 data에 따라 lifetime을 결정하고 seconds 단위와 expiry 유효성을 검증한다.

## 사용자 정의 프로필과 적용 예

flag를 활성화하고 같은 async cache 함수에 cacheLife를 직접 두며 공통 utility로 숨기지 않는다. seconds는 주가/실시간 점수, minutes는 social/news, hours는 inventory/weather, days는 blog/article, weeks는 podcast/newsletter, max는 legal/archive 같은 갱신 빈도에 대응한다. BlogPost는 days, Product는 hours, settings helper는 max, realtimeStats는 seconds를 사용한다.

next.config.cacheLife의 default를 `{stale: 300, revalidate: 3600, expire: 86400}`로 재정의하면 수명을 생략한 scope의 기본값도 바뀐다. built-in 이름의 autocomplete도 유지되며 next dev/build/typegen이 생성한 signature/JSDoc에 실제 값이 반영된다. custom biweekly는 stale/expire 14일, revalidate 1일로 설정하고 cacheLife('biweekly')로 호출한다. 재사용 profile editorial은 600/3600/86400, marketing은 300/1800/43200(초)이다. inline 3600/900/86400은 해당 함수에만 적용하며 cacheLife({})는 default를 적용한다.

limited-offer GET은 helper의 use cache에서 60/300/3600초를 설정하고 DB에서 type='limited', created_at desc로 findFirst한 결과를 Response.json으로 반환한다. ShortLivedWidget의 seconds가 implicit outer Dashboard 안에 있으면 build 오류다. outer default를 명시하면 정적 완성 출력의 수명을 유지한다. 의도적으로 짧게 하려면 outer도 seconds로 명시하고 Suspense 안에 둔다. serverless runtime에서는 remote, 지속적인 memory가 있는 self-host에서는 regular도 가능하다. explicit outer가 inner보다 길어도 outer hit는 완성 출력을 반환한다. implicit outer는 inner가 5분이면 5분으로 줄지만 inner가 1시간이어도 default 15분을 늘리지 않는다.

조건부 post cache는 post-{slug} tag를 붙인다. missing이면 minutes와 null, published이면 days와 최소 post.data를 반환한다. CMS 기반 예는 revalidateSeconds가 숫자 초인지 확인하고 없으면 3600을 쓴다. stale/expire는 default를 상속하며 한 분기에서 한 번만 호출한다. staleTimes는 전역 route 설정, cacheLife는 함수/route 개별 설정이다. staleTimes.static은 default stale을 바꾼다. Server Action의 갱신 함수들은 시간 기반 최소 30초와 무관하게 client cache를 clear한다.

## 이해 확인

1. revalidate=60은 정확히60초마다 backend 호출을 예약하는가?
2. inner seconds, outer implicit cache가 build에서 실패할 수 있는 이유는?
3. stale=60과 expire=3600인 content의 prerender/App Shell 참여 차이는?

## 출처

- [Next.js, cacheLife](https://nextjs.org/docs/app/api-reference/functions/cacheLife)

## 관련 문서

- [[NextJS-App-Cache-Functions]]
- [[NextJS-App-Revalidation]]
- [[NextJS-App-Prefetch-Config]]
