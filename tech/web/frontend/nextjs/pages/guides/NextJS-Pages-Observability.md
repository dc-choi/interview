---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 성능 계측과 번들 진단", "NextJS Pages Observability"]
---

# Pages Router의 성능 계측과 번들 진단

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 사용자 성능과 서버 trace를 구분한다

`useReportWebVitals`는 browser metric을 보고하고 OpenTelemetry는 server 작업 trace를 연결한다. Lighthouse simulated 결과와 field metric을 함께 읽으며 한 번의 build 성공으로 사용자 성능을 단정하지 않는다.

```tsx
import { useReportWebVitals } from 'next/web-vitals'

const report = (metric) => {
  const body = JSON.stringify(metric)
  if (navigator.sendBeacon) navigator.sendBeacon('/analytics', body)
  else void fetch('/analytics', { method: 'POST', body, keepalive: true })
}

export default function App({ Component, pageProps }) {
  useReportWebVitals(report)
  return <Component {...pageProps} />
}
```

callback reference를 module scope 또는 useCallback으로 유지한다. 새 함수로 바뀔 때 이미 수집한 metrics가 다시 전달되어 중복 보고할 수 있다. sendBeacon이 false를 반환하는 실패까지 관측하려면 실제 수집 서비스 요구에 맞춰 보완한다.

## metric의 의미

metric에는 `id`, `name`, `value`, `delta`, `entries`, `navigationType`, `rating`이 있다. id는 현재 page load 문맥의 식별자, delta는 이전 값 대비 변화다. time metric은 보통 ms이고 CLS는 단위 없는 score이므로 모두 ms로 저장하지 않는다. name별 단위를 구분한다.

TTFB/FCP/LCP/CLS/INP를 보고 실제 사용 환경을 분류한다. 기존 문서의 FID는 과거 지표 이력도 포함하므로 현재 Core Web Vitals의 interaction 기준으로 INP를 구분한다. rating은 good/needs-improvement/poor이며 navigationType은 navigate/reload/prerender/back-forward/BFCache restore/restore 등이다.

Pages custom metrics는 `Next.js-hydration`, `Next.js-route-change-to-render`, `Next.js-render`다. User Timing API 지원 browser에서 hydration과 route 이동 렌더 시간을 구분한다. GA 정수 값 전송 때 CLS는 1000배 등 명시적 변환을 하고 metric.id로 중복과 분포 계산을 관리한다.

## instrumentation과 trace

root 또는 src의 `instrumentation.ts`에 `register()`를 export해 server instance 시작 때 계측을 등록한다. runtime별 import는 NEXT_RUNTIME으로 분기할 수 있다. top-level side effect보다 register 안에서 필요한 초기화를 수행한다. `onRequestError`는 request/context와 오류를 보고할 수 있고 비동기 전송은 완료를 기다린다.

Pages context의 routerKind는 Pages Router이고 App만 있는 route/render/action 분류를 현재 요청 종류와 대조한다. OpenTelemetry는 getStaticProps 같은 작업에 span을 추가할 수 있다. 사용자 정의 span, exporter/collector와 propagation 계약은 [[NextJS-Observability]]에 연결한다.

client 시작 전 global error/analytics 초기화는 `instrumentation-client.ts`로 분리한다. server instrumentation과 window 접근을 섞지 않는다. route 변화는 Pages router.events로 추가 관측할 수 있다.

## bundle과 debugging

route code splitting은 기본이고 무거운 선택 기능은 dynamic import로 줄인다. webpack은 `@next/bundle-analyzer`, Turbopack은 현재 analyzer 기능으로 실제 큰 module/import chain을 찾는다. dependency를 바꾸기 전에 bundle 경로와 사용량을 확인한다.

Pages server dependency bundling은 App의 default와 다르다. `bundlePagesRouterDependencies` 기본 false, `transpilePackages`는 특정 외부/monorepo package 변환, `serverExternalPackages`는 bundle 대상에서 제외한다. native package와 runtime import는 배포 환경에서 검증한다.

debugging은 VS Code/Chrome/Firefox source map으로 client와 Node server를 구분한다. --inspect는 Node process에, browser debugging은 실제 port URL에 연결한다. main Next CLI와 child server가 다른 inspector port를 쓸 수 있다. dev HMR proxy는 v16의 `/_next/hmr` WebSocket upgrade를 전달해야 한다.

CI build cache는 `.next/cache`를 보존하고 lockfile/source 변화에 맞는 cache key로 재사용한다. ISR runtime cache와 build cache는 서로 다른 것이다. 호스트별 캐시 설정은 [[NextJS-Environment-and-Deployment]]에서 확인한다.

## Web Vitals 분기와 GA 전달 코드

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app'
import { useReportWebVitals } from 'next/web-vitals'
const report: Parameters<typeof useReportWebVitals>[0] = metric => {
  switch (metric.name) {
    case 'FCP': console.log('첫 콘텐츠', metric.value); break
    case 'LCP': console.log('최대 콘텐츠', metric.value); break
    case 'Next.js-hydration': console.log('hydration', metric.value); break
    case 'Next.js-route-change-to-render': console.log('이동 후 시작', metric.value); break
    case 'Next.js-render': console.log('이동 후 완료', metric.value); break
    default: break
  }
  const body = JSON.stringify(metric)
  if (!navigator.sendBeacon?.('/analytics', body))
    void fetch('/analytics', { body, method: 'POST', keepalive: true })
}
export default function App({ Component, pageProps }: AppProps) {
  useReportWebVitals(report)
  return <Component {...pageProps} />
}
```

원문의 FCP/LCP switch 예는 break가 없어 다음 case로 흘러가므로 독립 분기로 고쳤다. custom name은 해당 Pages 계측 계약과 설치된 Next 타입을 맞춘다. log-only 예도 module scope callback에 console.log(metric)을 두면 된다. callback reference가 바뀌면 이미 사용 가능한 metrics가 새 callback에도 전달되어 중복될 수 있다.

GA가 초기화된 환경은 `gtag('event', metric.name, { value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value), event_label: metric.id, non_interaction: true })`처럼 정수화한다. id는 current page load metric 식별자여서 분포/percentile을 수집기에서 계산할 수 있다. 이 snippet은 GA 초기화를 대신하지 않는다.

navigationType 전체 값은 navigate/reload/prerender/back-forward(normalized back_forward)/back-forward-cache(BFCache restore)/restore(discard후 복구)다. entries는 관련 PerformanceEntry 배열이며 value는 metric 실제 값, delta는 이전 값과 차이다. rating은 good/needs-improvement/poor다. 이름은 TTFB/FCP/LCP/FID/CLS/INP, custom metrics는 hydration/render 시간(ms)이다. CLS는 dimensionless이므로 모든 값을 ms로 해석하지 않는다. server register/onRequestError 전체 타입과 runtime 분기는 [[NextJS-Pages-Instrumentation]]에 있다.

## 학습 확인

- callback identity 변화로 metric 중복이 생기는지 확인한다.
- browser render 지연과 server 조회 span 지연을 각각 찾는다.
- build cache와 runtime ISR cache의 저장 위치와 무효화 조건을 구분한다.

## 출처

- [Next.js, analytics](https://nextjs.org/docs/pages/guides/analytics)
- [Next.js, ci-build-caching](https://nextjs.org/docs/pages/guides/ci-build-caching)
- [Next.js, debugging](https://nextjs.org/docs/pages/guides/debugging)
- [Next.js, instrumentation](https://nextjs.org/docs/pages/guides/instrumentation)
- [Next.js, open-telemetry](https://nextjs.org/docs/pages/guides/open-telemetry)
- [Next.js, package-bundling](https://nextjs.org/docs/pages/guides/package-bundling)
- [Next.js, instrumentation](https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation)
- [Next.js, use-report-web-vitals](https://nextjs.org/docs/pages/api-reference/functions/use-report-web-vitals)

## 관련 문서

- [[NextJS-Observability]]
- [[NextJS-Pages-Router-API]]
- [[NextJS-Pages-ISR]]
