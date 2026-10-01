---
tags: [nextjs, app-router, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["use cache의 키, 직렬화와 격리 계약"]
---

# use cache의 키, 직렬화와 격리 계약

## 무엇을 cache하는가

use cache는 async function/component의 return output을 cache한다. data function에 두면 데이터만, component에 두면 계산/query와 UI output까지 포함한다. 파일 처음에 두면 모든 export에 적용되어 async가 필요하다. placement는 expensive work가 실제 있는 범위에 맞춘다.

```ts
import { cacheLife, cacheTag } from 'next/cache'
export async function getProducts(category: string) {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  return loadProducts(category)
}
```

Cache Components 설정이 필요하다. file-level cache exports는 client에서 reference로 호출할 수도 있지만 server에서 호출한 결과를 props로 전달하는 방식이 우선이다.

## 키와 배포 scope

key는 buildId(설정 시 deploymentId), 함수 위치/서명의 secure function ID, serializable argument, dev HMR refresh hash로 구성된다. closure로 참조한 값도 자동 argument가 된다. root getter는 실제 읽은 root param만 key에 들어간다.

첫 호출이 output을 채우고 같은 input 호출은 lifetime 안에서 재사용한다. inner cached 함수는 별도 entry를 가지지만 uncached helper도 outer cached output에 포함되면 outer가 실행될 때만 query한다. 함수가 export돼 있다는 사실이 그 내부 호출의 fresh read를 보장하지 않는다.

## 직렬화와 pass-through

argument와 return은 React의 서로 다른 serialization 시스템을 사용한다. primitive/plain object/array/Date/Map/Set/TypedArray/ArrayBuffer는 지원하고 class instance/function/symbol/WeakMap/WeakSet/URL instance는 지원하지 않는다. return은 JSX도 가능하다. JSX argument는 pass-through로만 허용한다.

```tsx
async function CachedFrame({ children }: { children: React.ReactNode }) {
  'use cache'
  return <section><h2>공유 frame</h2>{children}</section>
}
```

children/Server Action 같은 non-serializable 값을 introspect/변경/호출하지 않고 slot으로 전달하면 cache entry에 포함하지 않는다. cached layout이 children 전체를 cache한다고 가정하지 않는다. 전체 route를 cache하려면 독립 entry인 page/layout/parallel slot 각각의 실제 work를 검토한다.

## request API와 격리

cookies/headers/searchParams 직접 호출은 금지며 nested helper call stack에도 제한이 적용된다. build가 실행하지 않은 dynamic route branch는 build를 통과하고 start에서 next-request-in-use-cache 오류가 날 수 있다. 필요한 값은 바깥에서 await해 serializable argument로 전달한다.

React.cache는 use cache 내부에 별도 scope가 있다. 바깥 React.cache로 만든 mutable store를 내부에서 읽어 전달하는 패턴은 같은 값을 보지 못한다. 함수 argument를 사용한다.

Draft Mode에서는 cached work가 매 요청 다시 실행되고 저장하지 않는다. draftMode.isEnabled 읽기는 예외적으로 허용되지만 cookies/header 제한은 남고 enable/disable은 cache scope에서 금지다.

## runtime store와 최소 stale

default handler는 memory LRU다. self-host memory는 다음 요청에 살아남을 수 있고 cacheMaxMemorySize로 조정한다. serverless는 instance마다 분리/소멸할 수 있어 cross-request reuse를 보장하지 않는다. remote handler는 network latency/storage 비용과 hit rate를 비교한다. static export는 use cache를 지원하지 않는다.

server는 revalidate/expire, browser memory는 stale을 따른다. x-nextjs-stale-time으로 전달하고 client time expiry에는 최소 30초를 적용한다. on-demand Action invalidation은 그 stale window를 우회한다.

## cache timeout 진단

외부에서 생성된 runtime Promise를 cache argument/closure/Map에서 await하면 prerender에서 resolve할 수 없어 약50초 cache-fill timeout이 발생할 수 있다. 직접 cookies/header 호출의 즉시 오류와 다르다. runtime 바깥 scope에서 값으로 await하고 전달한다. cached/uncached Promise를 module Map 하나에 섞지 말고 framework fetch dedup을 활용한다.

NEXT_PRIVATE_DEBUG_CACHE=1로 cache/ISR 로그를 확인하고 dev cache log의 Cache prefix를 읽는다. HMR의 성공만 보지 말고 start에서 request branch도 검증한다.

## 캐시 예제와 구성 세부

closure 예는 outer userId와 inner getData(filter)의 filter='active'를 함께 key로 쓴다. OrderSummary(accountId)는 hours 수명으로 `{orders, totals}`를 보관한다. inner getOrders도 hours의 독립 entry라 DB findMany를 공유하지만, uncached getOrderTotals의 aggregate는 outer가 실행될 때만 갱신된다. 다른 uncached caller가 직접 호출하면 fresh query다. 짧은 수명의 entry는 shell에서 제외된다.

UserCard의 id:string과 config:{theme:string}은 지원하지만 UserClass instance는 실패한다. CachedWrapper는 고정 header와 dynamic children을 배치하고 header/children slot을 내용 검사 없이 그대로 출력한다. CachedForm은 `action: () => Promise<void>`를 호출하지 않고 form.action으로 넘긴다. 서버 performUpdate를 CachedComponent가 ClientComponent.action으로 통과시키고 client button의 onClick이 실행하는 구성도 가능하다. 부모 Page의 uncached data와 header JSX도 slot으로 통과하며 wrapper 안의 query만 cached다.

module-level reports 예는 monthlyTotals의 accountId별 aggregate와 getTopProducts의 sales desc/take 10을 async export로 cache한다. page/layout과 parallel slot은 별도 entry다. cached layout의 children은 통과하므로 page와 각 slot의 실제 작업을 따로 검토한다. framework export인 generateMetadata/generateStaticParams도 async가 필요하다.

Draft Mode content는 isEnabled에 따라 draft/production endpoint를 선택하고 query하되 draft에서는 매 요청마다 다시 실행하고 저장하지 않는다. React.cache로 만든 `{current: null}` store를 parent가 수정해도 cached Child의 분리 scope에서는 null이다. 필요한 값은 argument로 전달한다. runtime cache의 serverless 휘발성은 build cache의 정상 작동과 다르며 같은 helper를 쓰는 두 shell도 재검증 시 각각 query할 수 있다. 배포 사이에도 지속되어야 하는 non-fetch는 unstable_cache, fetch는 기존 fetch cache를 검토한다.

각 use cache에 cacheLife를 명시하는 것이 권장된다. 생략하면 default는 stale 5분/revalidate 15분/expire 무기한이다. inner short-lived cache를 implicit default outer 안에 두면 build에 실패하므로 수명을 명시한다. 수정할 때만 바뀌는 post는 max와 tag/on-demand, 최근 목록은 hours와 시간 기반 갱신을 선택한다. cacheLife/tag 계약은 server와 client cache 층에 함께 적용된다.

timeout 재현 예는 Dynamic이 아직 await하지 않은 cookies Promise를 Cached.prop으로 넘기거나 module Map<string, Promise<string>>에 dynamic fetch를 저장해 cached 함수가 읽는 경우다. Dynamic에서 cookie 값을 await한 뒤 전달한다. Map은 cached/uncached별로 분리하거나 fetch dedup을 쓴다. `NEXT_PRIVATE_DEBUG_CACHE=1 npm run dev` 또는 `npm run start`는 ISR을 포함한 verbose 로그를 표시한다. 개발 중 Cache prefix는 cached function의 replay다.

| 배포 | use cache |
| --- | --- |
| Node.js/Docker | 지원 |
| Static export | 미지원 |
| Adapter | 플랫폼별 |

15.0에experimental도입,16.0에CacheComponents로활성화됐다.

## 이해 확인

1. cached layout의 children에서 fresh query가 가능한 이유는?
2. cache 안에 URL 객체를 return하면 왜 실패하는가?
3. 동일 session Promise를 cache 안에서 await할 때 즉시 API 오류와 timeout 중 어느 조건이 생기는가?

## 출처

- [Next.js, use-cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)

## 관련 문서

- [[React-Server-Cache-and-Taint]]
- [[NextJS-App-Cache-Life]]
- [[NextJS-App-Cache-Variants]]
