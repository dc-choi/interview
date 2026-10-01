---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Instant Navigation 검증"]
---

# Next.js Instant Navigation 검증

## instant의 의미와 두 진입 경로

instant는 warm cache 조건에서 클릭 직후 static/cached/fallback UI로 목적지를 시작하고 나머지를 stream할 수 있다는 뜻이다. 모든 데이터의 즉시 완료와 다르다. cold cache는 cached 결과를 처음 계산해야 한다.

직접 방문은 document root부터 static HTML shell을 렌더한다. `/store/shoes`→`/store/hats` client navigation은 공통 `/store` layout 아래만 다시 렌더하므로 root layout의 Suspense가 이 탐색을 덮지 못한다. useSearchParams도 page load에서는 build 시점 URL 부재로 suspend할 수 있지만 client navigation에서는 router가 URL을 알고 있어 동기적으로 해결될 수 있다.

cacheComponents/partialPrefetching 도입 후 route별로 확인한다. use cache 계열은 lifetime을 부여하고 Suspense는 uncached/runtime 읽기의 fallback을 정한다. private cache는 browser에만 저장돼 build static shell에는 들어가지 않는다. fallback 자체가 cookies/headers/URL을 읽으면 상위 경계도 필요하다. 캐시한 timestamp/data는 fallback에 둘 수 있고 URL 값은 per-link 준비 여부에 따라 달라진다.

## 개발 검증과 경계 수정

기본 `validationLevel: 'warning'`은 개발 중 Page/Default segment를 자동 확인한다. `experimental.instantInsights.validationLevel: 'manual-warning'`은 instant를 명시한 segment만 검증한다. page load와 공통 layout 위치별 client navigation을 각각 검사하며 overlay가 blocking component와 Stream/Cache/Block fix card를 제공한다.

```tsx
// URL별 상품 설명과 실시간 재고를 분리하는 구조
import { Suspense } from 'react'
export default function Page(props: PageProps<'/store/[slug]'>) {
  return <>
    <Suspense fallback={<p>상품 조회 중...</p>}>
      <ProductInfo params={props.params} />
    </Suspense>
    <Suspense fallback={<p>재고 조회 중...</p>}>
      <Inventory params={props.params} />
    </Suspense>
  </>
}
```

두 자식은 경계 안에서 params를 await한다. ProductInfo의 드물게 바뀌는 DB 조회는 `async function getProduct(slug) { 'use cache'; ... }`로 캐시하고 Inventory의 최신 재고 조회는 uncached로 유지한다. cached 상품도 URL별이므로 기본 공유 App Shell에는 직접 넣지 않고, 준비된 per-link UI/정적 경로 조건과 구분한다.

다른 예로 page 최상단에서 featured 목록과 params 기반 상품을 모두 await하면 둘 다 blocking 지점이다. 먼저 params+상품 읽기를 Suspense 자식으로 옮기고, URL과 무관한 getFeatured에 use cache를 붙이면 featured는 shell에, 상품은 fallback 뒤에 남는다. serverless의 메모리 cache는 인스턴스 간 지속되지 않으므로 필요한 경우 remote cache를 검토한다.

fully interactive page를 Client Component로 만드는 선택은 SPA 전환 모델에 가깝지만 서버 기능/번들 영향을 바꾼다. 검증 회피를 위해 무조건 use client를 붙이지 않는다. Client page도 static shell 검증과 useSearchParams의 Suspense 요구에서 면제되지 않는다.

## Navigation Inspector

Cache Components를 켜고 Next DevTools의 Navigation Inspector에서 Pause on navigations를 켠다. Awaiting navigation 상태에서 새로고침하면 Page load, Link 클릭이면 Client nav의 source/target URL과 Loading shell을 확인할 수 있다. Resume으로 동적 내용을 풀고 끝나면 pause를 끈다.

cold/warm 방문과 client navigation을 각각 관찰한다. 상품 이름/가격이 미리 보이려면 그 URL 데이터가 정적/캐시/실제로 완료된 per-link prefetch로 준비되어 있어야 한다. 캐시 getter가 있다는 사실만으로 기본 shell에 URL별 이름이 나타난다고 단정하지 않는다.

React DevTools의 Suspense 패널은 boundary별 fallback/resolved 상태를 토글해 어느 영역을 가리는지 보여준다. 전체 화면 skeleton 하나로 validation을 통과하는 것과 좋은 UI는 다르다. header/image/description을 남기고 최신 price/availability만 기다리는 식으로 필요한 경계를 아래로 옮긴다.

## instant E2E

```sh
npm install -D @next/playwright @playwright/test
```

```ts
import { test, expect } from '@playwright/test'
import { instant } from '@next/playwright'

test('첫 방문 shell을 확인한다', async ({ page, baseURL }) => {
  await instant(page, async () => {
    await page.goto('/store/hats')
    await expect(page.getByText('재고 조회 중...')).toBeVisible()
    await expect(page.getByTestId('inventory')).toHaveCount(0)
  }, { baseURL })
  await expect(page.getByTestId('inventory')).toBeVisible()
})

test('클라이언트 목적지 shell을 확인한다', async ({ page }) => {
  await page.goto('/store/shoes')
  await instant(page, async () => {
    await page.locator('a[href="/store/hats"]').click()
    await page.waitForURL((url) => url.pathname === '/store/hats')
    await expect(page.getByText('재고 조회 중...')).toBeVisible()
  })
  await expect(page.getByTestId('inventory')).toBeVisible()
})
```

Inventory의 최종 요소에 data-testid를 붙인 예다. 실제로 미리 보여야 하는 상품 제목도 해당 route의 정적/per-link 준비 조건에 맞춰 assert한다. 첫 goto 전 origin을 알아야 하므로 baseURL을 넘긴다. callback 안에서는 즉시 준비된 UI만 보이고 끝나면 동적 응답을 푼다. client navigation은 URL 도달을 기다린 뒤 assert해야 이전 페이지의 같은 selector를 잘못 통과하지 않는다.

next dev에는 testing API가 자동 활성화된다. 자동 prefetch 자체를 검증하거나 CI production build로 실행하려면 `experimental.exposeTestingApiInProductionBuild: true`를 켠 test build와 next start를 사용한다. 테스트용 노출을 일반 배포 설정에 무심코 남기지 않는다. 핵심 사용자 흐름의 첫 방문과 client navigation을 각각 고른다.

## 에이전트 작업과 opt-out

공식 도입 흐름은 Cache Components 도입 skill 이후 Partial Prefetching skill을 적용하고 next-dev-loop/agent-browser로 실제 렌더를 확인하는 순서다. 먼저 사용자에게 바뀔 의미와 범위를 설명하고 모호한 freshness/분할 선택을 확인하도록 하는 예시 prompt가 제공된다. 현재 vault 작업에서는 이 도입을 실행하지 않고 절차를 기록한다.

한 navigation의 최적화는 현재 정상 UI 확인→원하는 shell assertion을 작성해 실패 확인→Stream/Cache 경계 수정→production 유사 환경 재검사 순서다. 즉시 나와야 할 내용, stream 가능한 내용과 반드시 최신일 내용을 먼저 정한다. cache lifetime이 불명확하면 임의 값을 정하기보다 fresh 조회를 Suspense 안에 유지한다. before/after capture가 같으면 원하는 개선이 실제 적용됐는지 다시 본다. next-cache-components-optimizer는 이 루프와 회귀 검사를 묶은 공식 skill이다.

`export const instant = false`는 해당 page/layout으로 들어오는 검증 feedback을 끈다. `/dashboard` layout을 opt-out해도 그 아래 a↔b sibling navigation은 계속 검증된다. 이 설정이 원래 instant한 구조를 느리게 만드는 뜻은 아니며 실제 blocking 구조가 남으면 서버를 기다린다. 세션 조회에 알려진 lifetime이 있으면 private cache로 shell에 포함하는 대안을 검토하며 해당 shell의 stale 5분 조건을 확인한다.

## 출처

- [Next.js, instant-navigation](https://nextjs.org/docs/app/guides/instant-navigation)

## 관련 문서

- [[NextJS-Prefetching]]
- [[NextJS-Partial-Prefetch-Adoption]]
- [[NextJS-Per-Link-Prefetch]]
