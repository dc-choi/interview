---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 캐시 운영과 ISR"]
---

# Next.js 캐시 운영과 ISR

## 캐시 계층을 먼저 구분한다

React 요청 메모이제이션, 서버 데이터 캐시, route 출력 캐시, 브라우저 router cache, 외부 CDN은 서로 다른 수명과 무효화 경계를 갖는다. 한 계층의 hit나 invalidate가 모든 계층의 최신성을 증명하지 않는다. `cacheHandler`는 기존 서버/ISR cache, `cacheHandlers`는 `use cache` 지시자의 handler 설정이다.

## Cache Components를 끈 모델

기본 fetch의 Data Cache 저장 여부와 정적 route 출력 재사용을 구분한다. 명시적 데이터 캐시는 `fetch(url, { cache: 'force-cache' })`, `next.revalidate`, `next.tags`로 지정하고 DB 함수는 `unstable_cache`를 사용할 수 있다. 태그만 붙이는 것과 명시적인 저장 정책은 구분한다.

`dynamic = 'force-dynamic'`은 요청마다 렌더하고 fetch를 no-store로 강제한다. `revalidate = 0`은 route를 동적으로 만들지만 개별 fetch의 명시적 캐시는 유지할 수 있다. `force-static`은 cookies/headers 등 요청 API를 빈 값으로 처리하므로 개인화 요구가 있는 곳에 기계적으로 쓰지 않는다. `error`는 동적 접근을 오류로 드러내는 정적 보장 용도다.

`fetchCache`의 default-*는 기본값, only-*는 반대 선택의 오류, force-*는 강제 정책이다. 같은 route의 layout/page 설정은 호환되어야 하며 only-cache와 only-no-store 또는 force-cache와 force-no-store를 함께 쓰지 않는다. 공통 layout은 auto로 두고 필요한 leaf에서 분기하는 편이 단순하다.

정적 route의 revalidate는 해당 경로에서 가장 짧은 값을 따른다. 양의 literal 초 값을 사용하며 개발 서버 동작을 생산 캐시의 증거로 쓰지 않는다. React `cache()`와 fetch의 요청 내 중복 제거는 요청 간 저장과 다르다. preload helper는 소비 전에 일을 시작하는 수단이며 실패 처리와 과도한 선행 조회를 고려한다.

## 기존 ISR의 시간과 실패 처리

`generateStaticParams`로 일부 경로를 미리 만들고 `revalidate`로 갱신 주기를 정할 수 있다. 시간이 지났다고 백그라운드 타이머가 즉시 모든 경로를 갱신하지는 않는다. 다음 요청이 stale 결과를 받고 재생성을 시작하며 성공 후 새 결과로 교체한다. 재생성 실패 시 마지막 성공 결과가 남고 후속 요청에서 다시 시도한다.

on-demand revalidation은 이벤트 기반 갱신이다. App Router의 invalidate와 Pages Router의 `res.revalidate()` eager regeneration을 같은 시점 계약으로 취급하지 않는다. 존재하지 않는 레코드는 명시적으로 notFound 처리하며 API가 자동으로 404를 추론한다고 가정하지 않는다. Node runtime과 서버 실행이 필요하고 정적 export는 ISR을 실행하지 않는다.

## Cache Components와 미등록 URL

이 절의 16.3 동작은 `cacheComponents: true`와 Partial Prefetching을 전제로 한다. 알려진 params 조합은 빌드 때 생성하고 그 외 URL은 공통 App Shell과 Suspense fallback을 먼저 제공할 수 있다. 첫 방문 또는 prefetch가 알려진 params로 background upgrade를 시작한다.

모든 접근이 캐시 가능하면 전체 정적 결과로, 요청 API가 남아 있으면 해당 fallback을 포함한 출력으로 확장된다. 부모부터 params를 해결하며 남은 미해결 단계가 하위 확장을 제한할 수 있다. runtime/개인화 부분까지 첫 방문 이후 영구 정적 결과가 된다는 뜻은 아니다.

인기 경로만 GSP에 넣어 빌드 작업과 저장량을 줄일 수 있다. Cache Components의 GSP는 최소 하나의 실제 params가 필요하며, 삭제하면 해당 동적 route의 ISR을 포기하는 결과가 된다. 이 모델의 fallback을 Pages Router `router.isFallback` 코드로 구현하지 않는다.

## 분산 무효화와 일관성

App Router의 HTML과 RSC는 같은 렌더 버전으로 취급하고 같은 TTL/무효화 정책을 적용한다. Pages Router는 RSC를 생성하지 않으므로 이 설명을 그대로 적용하지 않는다. PPR shell와 postponed state의 쌍도 일치해야 한다.

개발자가 붙인 explicit tag와 경로에서 유도한 soft tag는 역할이 다르다. handler는 entry 생성 시각과 무효화 시각을 비교한다. 다중 인스턴스는 invalidation timestamp를 공유하고 `updateTags`로 기록, `refreshTags`로 읽어 로컬 상태를 동기화한다. 저장소만 공유해도 모든 로컬 태그 상태가 자동으로 최신이 되는 것은 아니다.

custom handler의 read 실패를 miss로 처리하려면 계약대로 undefined를 반환한다. 던진 오류는 render 오류가 될 수 있다. refreshTags 장애를 잡아 오래된 상태로 진행할지 실패시킬지는 최신성과 가용성 요구에 따라 정한다. 데이터 원천까지 장애라면 모든 cache failure가 무해하게 끝나는 것도 아니다.

## 검증

생산 build/start에서 최초 miss, hit, 시간 만료, Action 즉시 갱신, webhook SWR, 재생성 실패, 서로 다른 인스턴스와 CDN을 통한 재조회까지 확인한다. `x-nextjs-cache`의 HIT/STALE/MISS/REVALIDATED와 debug 로그는 단서이며 최종 화면/데이터도 대조한다. 로그에 전체 URL을 남길 때 query의 비밀 정보를 주의한다.

## 세부 설정과 운영 계약

- [[NextJS-Legacy-Cache-Config]]: dynamic/fetchCache/revalidate 전체 값과 조합, preload.
- [[NextJS-ISR-Patterns]]: 기존 ISR과 16.3 shell-first 모델, 장애/지원/이력.
- [[NextJS-Revalidation-Internals]]: HTML/RSC, soft tag, 분산 전파와 실패 계약.

## 출처

- [Next.js, caching-without-cache-components](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Next.js, incremental-static-regeneration](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
- [Next.js, incremental-static-regeneration-cache-components](https://nextjs.org/docs/app/guides/incremental-static-regeneration-cache-components)
- [Next.js, how-revalidation-works](https://nextjs.org/docs/app/guides/how-revalidation-works)

## 관련 문서

- [[NextJS-Cache-Migration]]
- [[NextJS-CDN-and-PPR]]
- [[NextJS-Actions-and-Forms]]
