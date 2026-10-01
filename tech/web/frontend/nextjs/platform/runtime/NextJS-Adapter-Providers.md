---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js adapter 지원표 해석", "NextJS-Adapter-Providers"]
---

# Next.js adapter 지원표 해석

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## supported providers

official supported-providers 페이지는 provider가 ingest한 최신 compatibility test 결과를 feature별 assertion summaries로 보여준다. supported라는 이름만으로 특정 앱/region/runtime의 production 사용을 보장하지 않는다. live table은 변하므로 provider 선택 전 현재 run/ref와 failed assertions를 확인한다.

## 2026-10-01 확인 snapshot

| provider | passed/total | 표시 percentage | 페이지의 latest run/ref |
| --- | --- | --- | --- |
| bun | 2666/2667 | 100.0% (반올림) | Mar 30 2026, 9:38 PM / 3cfdf479 |
| vercel | 3873/3873 | 100.0% | Oct 1 2026, 1:32 AM / 7a97071d |

표시 time의 timezone을 페이지가 명시하지 않아 한국 시간으로 단정하지 않는다. bun은 Data Fetching & Rendering에서 221/222, 99.5%였고 전체는 반올림 때문에 100.0%로 표시됐다. 두 provider의 assertion totals와 latest run dates가 다르므로 같은 test corpus를 동시에 모두 통과했다고 결론 내릴 수 없다.

## feature별 확인

표는 Navigation/Router, redirects/rewrites, dynamic params, Middleware/Proxy, PPR, Cache Components, segment/use cache/prefetch/revalidation, Route Handlers, parallel/intercepting routes, App/Pages fundamentals, Server Actions, i18n/basePath, metadata, styling, runtime/Edge, observability, image/font/forms, static export 등을 분리한다.

필요 feature만 보기보다 서로 연결된 조합을 확인한다. 예를 들어 PPR 자체 pass와 cache invalidation pass가 별도 항목이어도 rolling deployment에서 함께 올바르게 작동하는지는 app integration을 시험해야 한다. 실패 test 이름/Next ref/adapter version과 환경을 확인할 수 없으면 그 범위는 미검증으로 남긴다.

## 배포 결정

공식 표는 compatibility 조사 entry point다. cost, 지역, latency, custom dependencies, persisted/shared cache, secrets/networking, observability와 rollback 요건을 추가로 검토한다. 자체 adapter를 구현하면 [[NextJS-Adapter-Validation]] harness와 앱 고유 smoke tests를 함께 운영한다.

## snapshot의 feature별 assertion 전체 수

아래는 2026-10-01 원문 ingestion snapshot이며 각 cell은 passed/total이다. bun의 Data Fetching & Rendering만 99.5%, 나머지는 100.0%다. 날짜/ref가 다른 provider끼리 절대 성능이나 같은 corpus를 비교하는 표는 아니다.

| feature | bun | vercel |
| --- | --- | --- |
| Navigation & Router APIs | 214/214 | 316/316 |
| Redirects, Rewrites & Route Matching | 55/55 | 81/81 |
| Dynamic Routes & Params | 37/37 | 71/71 |
| Middleware Core | 139/139 | 155/155 |
| Middleware Rewrites & Redirects | 100/100 | 47/47 |
| Middleware Matchers | 25/25 | 19/19 |
| Middleware Headers & Response | 43/43 | 43/43 |
| Middleware Request Handling | 14/14 | 16/16 |
| Proxy | 29/29 | 42/42 |
| PPR | 26/26 | 45/45 |
| Cache Components | 38/38 | 198/198 |
| Segment Cache | 97/97 | 180/180 |
| use cache API | 32/32 | 48/48 |
| Prefetch | 48/48 | 123/123 |
| Revalidation | 61/61 | 84/84 |
| Route Handlers | 83/83 | 85/85 |
| Parallel & Intercepting Routes | 119/119 | 202/202 |
| App Router Fundamentals | 206/206 | 282/282 |
| App Router Error Boundaries & Not Found | 46/46 | 64/64 |
| App Router Hooks & Params | 22/22 | 22/22 |
| App Router Client Cache & Transitions | 11/11 | 11/11 |
| Pages Router | 32/32 | 53/53 |
| Data Fetching & Rendering | 221/222 | 336/336 |
| Server Actions | 208/208 | 224/224 |
| i18n | 54/54 | 100/100 |
| BasePath & Trailing Slash | 134/134 | 145/145 |
| URL, Query & Hash Handling | 24/24 | 31/31 |
| Metadata, OG & SEO | 125/125 | 159/159 |
| Styling & CSS | 119/119 | 141/141 |
| Configuration, Build & Tooling | 94/94 | 129/129 |
| Runtime, Platform & Compatibility | 57/57 | 62/62 |
| Observability & Diagnostics | 33/33 | 32/32 |
| Edge Runtime | 21/21 | 31/31 |
| next/image | 15/15 | 92/92 |
| next/font | 12/12 | 10/10 |
| Forms | 14/14 | 21/21 |
| Static Export & Deployment | 19/19 | 8/8 |
| Other (catch-all) | 39/39 | 165/165 |

## 출처

- [Next.js, app/api-reference/adapters/supported-providers](https://nextjs.org/docs/app/api-reference/adapters/supported-providers)

## 관련 문서

- [[NextJS-Adapter-Validation]]
- [[NextJS-Adapter-Lifecycle]]
