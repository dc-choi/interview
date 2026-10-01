---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Prefetch와 Instant Navigation"]
---

# Next.js Prefetch와 Instant Navigation

## 기본 prefetch

Link는 생산 환경에서 viewport에 들어온 목적지의 코드와 RSC를 미리 가져온다. 개발 서버는 자동 prefetch 검증의 기준이 아니다. 브라우저 router cache는 route segment를 재사용하고 공통 layout 아래에서 바뀌는 영역을 갱신한다.

Cache Components를 끈 모델에서는 정적 route는 전체 prefetch, 동적 route는 loading 경계까지의 제한적 prefetch 또는 클릭 후 요청이 기본이다. 오래된 문서의 고정 TTL을 새 옵션의 모든 조합에 적용하지 말고 staleTimes, cacheLife와 실제 모드를 확인한다.

`prefetch={false}`로 줄이거나 hover/touch 의도에 맞춰 활성화할 수 있다. 직접 anchor를 가로채면 새 탭, modifier click, download와 접근성까지 유지해야 하므로 기본 Link를 우선한다. router.prefetch의 onInvalidate는 무효화된 prefetch를 다시 준비하는 데 쓸 수 있다. 렌더 중 analytics/변경은 실제 방문 전 prefetch에서도 실행되므로 분리한다.

## Partial Prefetching의 단위

`cacheComponents: true`와 전역 `partialPrefetching: true`, 또는 목적지 segment의 `prefetch = 'partial'`이 전제다. 기본 Link는 같은 route 패턴의 여러 URL에서 재사용하는 App Shell을 가져온다. 정적 출력과 캐시 수명이 있는 세션 UI를 포함할 수 있지만 URL별 params/searchParams는 공유 shell에 넣지 않는다.

| Link | Partial Prefetching을 켠 동작 |
|---|---|
| 기본값/auto | route별 App Shell |
| true | App Shell와 캐시 가능한 URL별 내용의 per-link prefetch |
| false | 해당 Link prefetch 비활성화 |

이전 Cache Components의 true는 uncached dynamic content까지 full prefetch했다. 새 모드의 true는 거기까지 진행하지 않는다. flag 전환 전에 true로부터 기대하던 UI를 확인해야 한다.

## URL 데이터와 세션 데이터

URL Promise는 Suspense 안에서 읽고 그 값에 의존하는 조회에 적절한 캐시 lifetime을 둔다. per-link true는 클릭 전에 URL 값을 해결할 수 있지만 uncached 조회에서는 멈춘다. 캐시가 차갑거나 prefetch가 클릭 전에 끝나지 않으면 fallback을 볼 수 있다.

cookies/headers는 URL별이 아닌 세션 의존이다. 검증한 식별자를 일반 cache 인자로 넘기거나 private scope를 사용하면 세션별 App Shell를 준비할 수 있다. cookie의 팀 ID 자체를 인가 증거로 믿지 않는다. 캐시 결과를 공유할 때는 인증과 데이터 격리를 함께 설계한다.

cacheLife는 단순 서버 TTL만이 아니다. 긴 수명의 shell 포함 조건과 최소 prefetch 가능 수명을 구분한다. 현재 문서의 일반 shell 기준 stale 5분, private/per-link prefetch에서의 30초 하한 등은 scope와 모드가 다르므로 API 조건을 확인한다.

per-link 요청은 링크 수에 따라 서버 작업이 늘 수 있다. 대량 목록의 모든 카드에 true를 붙이기 전에 cache 가능 데이터가 실제로 더 드러나는지, 클릭률과 서버 비용이 정당한지 확인한다. 초 단위 최신성이 필요한 데이터는 클릭 뒤 stream하는 편이 맞을 수 있다.

## Instant의 의미와 경계

Instant는 클릭 직후 정적/캐시/fallback UI로 목적지를 시작할 수 있다는 의미다. 모든 데이터가 즉시 최신으로 준비된다는 보장은 아니다. 직접 방문은 전체 tree의 static shell를 사용하고 client navigation은 공통 layout 아래만 교체한다. 공통 layout 위의 Suspense 하나로 모든 sibling navigation을 덮을 수 없다.

검증이 통과해도 전체 화면 spinner만 보이는 shell일 수 있다. 어떤 실제 콘텐츠가 먼저 보여야 하는지를 별도로 정한다. Cache Components의 dev insight는 HTTP 200 응답에 포함되지 않을 수 있으므로 overlay, 서버 로그와 MCP get_errors를 확인한다. 기본 validationLevel warning과 manual-warning/segment instant opt-out의 범위를 구분한다.

## 전환과 검증 절차

기존 true Link의 기대 UI를 생산 build에서 확인한 뒤 목적지별 partial을 켜고 URL 읽기를 경계 안으로 이동한다. 정적/세션 캐시 내용만 필요한 Link는 기본값으로 돌리고 URL별 추가 UI가 가치 있는 곳만 true를 유지한다. 전역 flag를 켠 뒤 중복 partial export를 제거할 수 있다.

Navigation Inspector로 page load와 client nav의 shell를 각각 멈춰 확인한다. `@next/playwright`의 instant scope에서는 동적 영역이 풀리기 전 필요한 UI를 assert한다. client navigation은 목적지 URL에 도달한 다음 assert해야 이전 페이지의 같은 selector를 잘못 통과하지 않는다. 첫 goto에는 baseURL을 전달한다.

생산 build의 해당 검사에는 테스트용 API 노출 설정이 필요하다. 테스트 구성과 사용자 배포 구성을 구분한다. 차가운 cache, 느린 네트워크, no-prefetch와 back/forward도 확인한다.

## 구체적인 전환과 검증

- [[NextJS-Partial-Prefetch-Adoption]]: 기존 true 링크와 URL 읽기 전환, 점진 도입과 codemod.
- [[NextJS-Per-Link-Prefetch]]: 기본 TTL, 스케줄러, hover와 수동 제어, 세션과 비용.
- [[NextJS-Instant-Validation]]: 경계 수정, Inspector와 instant E2E, opt-out 범위.

## 출처

- [Next.js, prefetching](https://nextjs.org/docs/app/guides/prefetching)
- [Next.js, adopting-partial-prefetching](https://nextjs.org/docs/app/guides/adopting-partial-prefetching)
- [Next.js, optimizing-prefetching](https://nextjs.org/docs/app/guides/optimizing-prefetching)
- [Next.js, instant-navigation](https://nextjs.org/docs/app/guides/instant-navigation)

## 관련 문서

- [[NextJS-Cache-Migration]]
- [[NextJS-Streaming]]
- [[NextJS-Link-and-Form]]
