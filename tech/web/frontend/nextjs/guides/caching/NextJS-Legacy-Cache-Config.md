---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Cache Components 없는 캐시 설정"]
---

# Next.js Cache Components 없는 캐시 설정

## 적용 모델과 fetch

이 문서는 v16의 cacheComponents flag를 켜지 않은 App Router 모델이다. 기본 fetch의 요청 간 Data Cache 저장은 opt-in이며, build에서 정적 route를 prerender하는 과정의 조회와는 다르다. `fetch(url, { cache: 'force-cache' })`로 저장하고 `next: { revalidate: 3600, tags: ['posts'] }`로 주기와 무효화 식별자를 정할 수 있다. tag만으로 저장 정책을 의도한 대로 설정했다고 가정하지 않는다.

```ts
import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
export const getUser = unstable_cache(
  async (id: string) => db.user.findUnique({ where: { id } }),
  ['user'],
  { tags: ['user'], revalidate: 3600 },
)
```

unstable_cache는 DB 같은 비-fetch 함수의 결과를 저장한다. 인자는 cache identity에 참여하고 두 번째 keyParts는 추가 식별자다. tags는 on-demand invalidation, revalidate는 초 단위 시간 정책이다. 사용자 데이터라면 해당 캐시를 읽기 전에 현재 세션 인가와 반환 DTO를 제한한다.

## dynamic의 네 값

Page/Layout/Route Handler에서 정적 분석 가능한 export로 지정한다.

| 값 | 동작 |
| --- | --- |
| auto(기본) | 동적 사용을 허용하면서 가능한 정적 출력을 활용 |
| force-dynamic | 요청마다 렌더, fetch no-store/revalidate 0 및 fetchCache force-no-store에 해당 |
| error | request-time API나 uncached 접근을 오류로 처리하는 정적 보장. fetch force-cache/only-cache와 연결 |
| force-static | cookies/headers/useSearchParams를 빈 값으로 만들어 정적 처리. 시간/path/tag 재검증 가능 |

force-static은 개인화 데이터를 정적으로 안전하게 만드는 방법이 아니다. error는 Pages의 getStaticProps와 유사한 정적 경계 선택이며 App Router의 API 자체가 바뀌는 것은 아니다.

## fetchCache의 일곱 값

명시 cache 옵션이 없는 fetch는 request-time API 이전의 prerender에서 build 때 실행될 수 있고 이후에는 요청마다 실행될 수 있다. 다음은 route 전체 fetch 정책을 조정하는 고급 옵션이다.

| 값 | 기본값 또는 강제 동작 |
| --- | --- |
| auto | 개별 옵션과 request-time API 발견 위치의 기본 규칙 |
| default-cache | 미지정 fetch만 force-cache, 명시 no-store 허용 |
| only-cache | 미지정 fetch를 force-cache, 명시 no-store는 오류 |
| force-cache | 명시 no-store도 force-cache로 강제 |
| default-no-store | 미지정 fetch만 no-store, 명시 cache 허용 |
| only-no-store | 미지정 fetch를 no-store, 명시 force-cache는 오류 |
| force-no-store | 모든 fetch를 no-store로 강제 |

같은 route의 layout/page 설정은 호환되어야 한다. only-cache+force-cache는 force-cache, only-no-store+force-no-store는 force-no-store가 우선해 only 규칙의 오류를 막는다. only-cache와 only-no-store의 혼용, force-cache와 force-no-store의 혼용은 금지된다. parent default-no-store 아래 child auto 또는 cache 계열도 동일 fetch의 해석이 달라져 허용되지 않는다. 공통 parent는 auto로 두고 필요한 child에서 정책을 정한다.

## revalidate와 route 주기

| 값 | 의미 |
| --- | --- |
| false(기본) | 명시 cache 등 기본 휴리스틱, 시간 만료 없음에 해당. 개별 no-store/0은 동적화 가능 |
| 0 | route를 동적으로 만들고 미지정 fetch 기본을 no-store로 변경. 명시 force-cache/양의 revalidate는 유지 |
| 양의 number | 초 단위 기본 갱신 주기 |

route의 layout/page 중 가장 짧은 revalidate가 전체 ISR 주기를 결정하고 개별 fetch의 더 짧은 값도 주기를 줄일 수 있다. 개별 데이터의 정책과 route 출력 주기를 구분한다. `export const revalidate = 600`은 가능하지만 `60 * 10` 같은 표현식은 정적 분석 계약을 충족하지 않는다. deprecated edge runtime에서는 이 segment 옵션이 제공되지 않는다. next dev의 on-demand 렌더를 production 캐시 검증으로 쓰지 않는다.

## on-demand와 요청 내 중복 제거

cached fetch의 next.tags 또는 unstable_cache의 tags를 지정한 뒤 Server Action/Route Handler에서 `revalidateTag('posts', 'max')`로 SWR 만료를 요청한다. 한 경로라면 `revalidatePath('/profile')`을 선택한다. 인가/실제 변경이 성공한 다음 호출하며 fresh UI가 즉시 필요한 Action은 updateTag 계약을 비교한다.

React cache는 동일 서버 렌더 안의 중복 읽기를 합친다. 요청 간 저장인 unstable_cache와 다르다. 자동 memoized fetch의 적용 조건도 별도 API 계약을 따른다.

```ts
import 'server-only'
import { cache } from 'react'
import { db } from '@/lib/db'
export const getItem = cache(async (id: string) =>
  db.item.findUnique({ where: { id } }))
export const preload = (id: string) => { void getItem(id) }
```

params를 얻은 parent에서 `preload(id)`를 먼저 호출하고 별도의 `await checkIsAvailable()` 뒤 `<Item id={id} />`를 렌더하면 Item의 await getItem(id)가 이미 시작한 같은 읽기를 재사용한다. 사용할 가능성이 없는 민감 데이터를 먼저 읽지 않게 권한과 실패 처리를 설계한다. DB getter는 조회 결과를 return해야 한다. 누락된 return이 있는 짧은 예제를 그대로 옮기면 Promise<void>가 된다.

동적 경로의 사전 생성과 ISR은 generateStaticParams에 연결하며 [[NextJS-ISR-Patterns]]에서 다룬다.

## 출처

- [Next.js, caching-without-cache-components](https://nextjs.org/docs/app/guides/caching-without-cache-components)

## 관련 문서

- [[NextJS-Cache-Operations]]
- [[NextJS-ISR-Patterns]]
