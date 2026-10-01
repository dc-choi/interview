---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 클라이언트 데이터와 캐시 동기화"]
---

# Next.js 클라이언트 데이터와 캐시 동기화

## 서버 초기값과 브라우저 소유권

한 번 읽는 서버 데이터라면 Promise를 Client Component에 전달하고 use로 해석할 수 있다. focus 재검증, polling, 여러 컴포넌트의 공유 browser cache와 optimistic mutation이 필요할 때 SWR/TanStack Query 같은 라이브러리를 검토한다. 서버 초기값 제공과 서버 캐시는 독립된 선택이다.

| 패턴 | 첫 데이터 준비 | 로딩 표현 |
|---|---|---|
| client inline fetching | hydration 뒤 브라우저 요청 | Hook의 loading/error 분기 |
| client Suspense fetching | 브라우저 상호작용과 query 시작 | 가까운 Suspense/Error Boundary |
| 서버 초기값 전달 | 서버 렌더/stream | fallback 또는 dehydrated state로 client cache 초기화 |

Suspense는 표시 경계를 조정한다. 여러 읽기를 한 컴포넌트에서 순서대로 suspend하면 waterfall이 생길 수 있으므로 독립 자식 또는 라이브러리의 병렬 query API를 쓴다.

## SWR

conditional key를 null로 두면 아직 입력이 없는 자동완성 요청을 미룰 수 있다. isLoading은 초기 데이터 없음, isValidating은 background 재검증까지 포함한다. suspense:true는 초기 대기를 boundary로 보내고 같은 key의 후속 재검증은 기존 데이터를 유지할 수 있다.

SWR 2.3와 React 19 패턴에서는 Server Component가 SWRConfig fallback에 Promise를 넘길 수 있다. provider는 해당 데이터가 필요한 segment에 가깝게 두고 fallback key와 useSWR key를 정확히 맞춘다. 브라우저 재조회 URL은 Route Handler로, 서버 초기값은 같은 DAL로 연결할 수 있다.

fallback은 기본적으로 stale로 취급되어 hydration 뒤 재검증할 수 있다. revalidateIfStale:false는 mount 정책이며 TanStack의 시간 기반 staleTime과 다르다. focus/reconnect/polling/mutate 정책은 별도로 남는다.

mutation에는 같은 key의 mutate, optimisticData와 rollbackOnError를 연결한다. 서버가 확정한 값이 알려진 경우에만 revalidate:false로 유지하고, 동시 변경이 가능한 값은 실제 결과와 다시 맞춘다.

## TanStack Query

서버는 요청별 QueryClient를 만들고 브라우저는 안정적인 client를 재사용한다. 서버 전역 singleton에 사용자 데이터를 섞지 않는다. useQuery의 enabled로 지연하거나 useSuspenseQuery와 boundary를 사용할 수 있다. 같은 query에 데이터가 있는 후속 refetch는 isFetching으로 별도 표시한다.

5.40 이상 pending-query dehydration 패턴에서는 서버 prefetchQuery를 시작하고 await 없이 pending도 dehydrate해 HydrationBoundary에 넘길 수 있다. 서버 queryFn은 직접 DAL을 쓰고 browser queryFn의 상대 URL을 서버에서 그대로 호출하지 않는다. queryKey를 양쪽에서 일치시키고 staleTime으로 불필요한 즉시 refetch를 조정한다.

useMutation의 onMutate에서 진행 중 query 취소, 이전 snapshot 저장과 optimistic 값을 적용하고 onError에서 복구한다. concurrent mutation의 rollback이 더 최신 값을 덮지 않는지도 검토한다.

## 세 가지 캐시를 함께 갱신하기

Next 서버 캐시, Next client router cache, SWR/Query의 browser cache는 독립적이다. 라이브러리의 key와 서버 tag를 공통 계약으로 정의할 수 있지만 lifetime을 숫자까지 같게 맞출 필요는 없다.

Action이 cached read를 바꾸면 서버 인가/저장 후 updateTag를 사용해 read-your-own-writes를 연결한다. passive 갱신은 revalidateTag(tag, 'max'), webhook의 즉시 만료는 적절한 expire:0 profile을 검토한다. uncached read에는 지울 server tag가 없다. 로그인 사용자가 바뀌면 사용자별 key 또는 cache reset도 필요하다.

## Cache Components와 hydration timestamp

QueryClient/dehydrate가 내부에서 현재 시간을 읽으면 prerender의 비결정성 검증에 걸릴 수 있다. client active query는 적절한 Suspense 아래에 두고, 서버 hydration data는 실제 데이터 snapshot과 updatedAt을 함께 관리한다.

태그 기반 데이터에서는 같은 tag로 갱신되는 cached timestamp를 사용해 hydration state를 구성할 수 있다. 시간 기반 데이터는 데이터와 timestamp를 같은 cached snapshot에서 얻어야 한다. 낡은 timestamp가 새 데이터를 덮어쓰지 못하게 하거나 반대로 오래된 서버 값이 최신 browser 값을 덮는 문제가 없는지 확인한다. 수동 dehydration 구조는 설치한 라이브러리 버전의 계약에 의존한다.

## SPA 구성

Next.js는 client navigation과 fetching을 유지하면서 route별 HTML/code splitting과 서버 기능을 점진 적용할 수 있다. Promise를 context로 공유할 때 필요한 subtree에 provider를 두고 해결 값의 DTO를 제한한다. 요청 데이터를 읽는 Promise는 Cache Components의 적절한 경계 안에서 시작한다.

browser-only 라이브러리는 Client 경계의 dynamic ssr:false를 검토한다. native history pushState/replaceState는 URL Hook과 연동할 수 있지만 서버 데이터를 다시 읽는 router navigation과 목적이 다르다. 공유 reducer로 optimistic UI를 계산할 수 있어도 클라이언트가 보낸 전체 목록을 서버의 권한과 실제 저장 상태로 신뢰하지 않는다.

## 패턴별 API와 구현 연결

| 첫 데이터와 로딩 | SWR | TanStack Query |
| --- | --- | --- |
| hydration 후 inline | useSWR의 isLoading/error | useQuery의 isPending/error |
| hydration 후 Suspense | useSWR의 suspense true | useSuspenseQuery |
| 서버 초기값 또는 stream | SWRConfig fallback | HydrationBoundary |

초기 데이터 제공은 서버 캐시와 독립적이다. Next prefetch는 route의 RSC Payload를 navigation 전에 Next client cache에 둘 수 있고, 라이브러리 browser cache와 자동으로 하나가 되지는 않는다. 서버 tag 무효화와 browser key 변경을 함께 설계한다. 실패한 optimistic write는 이전 browser 값을 복구한다. Apollo Client도 shared browser cache가 필요한 GraphQL 사용의 선택지다.

- [[NextJS-SWR-Patterns]]: conditional key, fallback Promise, freshness와 mutate.
- [[NextJS-Query-Patterns]]: Provider 수명, enabled/Suspense, pending dehydration과 mutation.
- [[NextJS-Query-Hydration]]: Cache Components와 시간/tag 일치.
- [[NextJS-SPA-Patterns]]: Promise Context, browser-only와 URL 상태, 공유 reducer.

## 출처

- [Next.js, client-side-data-fetching](https://nextjs.org/docs/app/guides/client-side-data-fetching)
- [Next.js, swr](https://nextjs.org/docs/app/guides/client-side-data-fetching/swr)
- [Next.js, tanstack-query](https://nextjs.org/docs/app/guides/client-side-data-fetching/tanstack-query)
- [Next.js, single-page-applications](https://nextjs.org/docs/app/guides/single-page-applications)

## 관련 문서

- [[NextJS-Actions-and-Forms]]
- [[NextJS-Cache-Operations]]
- [[NextJS-Authentication]]
