---
tags: [nextjs, app-router, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["서버 계측, client 시작과 Web Vitals"]
---

# 서버 계측, client 시작과 Web Vitals

## 서버 register와 오류 hook

root 또는 src의 instrumentation.ts에서 register를 export하면 새 server instance 초기화 시 한 번 실행된다. async register 완료를 기다린 뒤 서버가 요청을 처리한다. 개발 hot reload와 여러 배포 instance가 있으므로 전체 서비스 생애에 한 번만 실행된다는 의미는 아니다. Node/Edge용 package는 NEXT_RUNTIME에 따라 conditional import한다.

onRequestError(error, request, context)는 Next가 server 오류를 포착할 때 호출된다. async export라면 logging 전송 등을 await한다. React가 처리한 오류는 원래 Error와 다른 형태/digest를 가질 수 있으므로 error를 unknown으로 다룬다. request의 path/method/headers와 context의 routerKind(App/Pages), routePath, routeType(render/route/action/proxy), renderSource, revalidateReason, renderType 등을 함께 사용한다. header/body에 들어 있는 개인정보와 비밀을 로그에 그대로 저장하지 않는다.

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./observe-node')
}
export async function onRequestError(error: unknown, request: any, context: any) {
  await recordSanitizedError(error, request.path, context.routeType)
}
```

실제 구현에서는 framework 제공 type을 사용하여 unknown narrowing과 context field를 검증한다. 단순 logging failure가 원래 오류를 가리지 않도록 reporter 실패 정책을 둔다.

## instrumentation-client의 시작 순서

instrumentation-client.ts는 HTML이 로드된 뒤 hydration과 사용자 상호작용 전의 client setup에 쓴다. top-level synchronous 초기화가 이 순서의 보장 대상이다. 비동기 import나 top-level await가 끝날 때까지 hydration을 무조건 기다리는 보장은 아니다. browser polyfill이 hydration 전에 반드시 필요하면 static import와 동기 feature detection을 사용한다.

analytics, error handler, performance monitor를 여기서 시작할 수 있다. 코드를 작게 유지하며 개발에서는16ms를 넘는 실행에 경고가 날 수 있다. hook의 오류는 격리되지만 관찰 코드가 app의 정상 시작을 막는지 실제로 확인한다. plugin의 instrumentationClientInject 코드는 사용자 파일보다 먼저 삽입될 수 있다.

## router transition hook

onRouterTransitionStart(url, navigationType)는 push/replace/traverse 전환의 시작을 알려준다. experimental.instrumentationClientRouterTransitionEvents를 활성화하면 세 번째 event info를 사용할 수 있다. id는 opaque ID, timestamp는 Unix milliseconds, fromRoutes는 child-first이며 parallel slots의 순서가 결정된 route pattern 배열이다. prefetchIntent는 full/auto/none 또는 연관 Link가 없을 때 null일 수 있다.

route pattern과 실제 사용자 URL/query는 의미가 다르다. analytics dimension에 query와 개인 식별자를 무조건 넣지 않는다. 시작 event만으로 navigation 완료/실패/화면 표시가 검증되지 않으므로 측정 목적에 맞는 종료 관찰을 연결한다.

## useReportWebVitals

next/web-vitals의 useReportWebVitals(callback)는 Client Component에서 metric을 받는다. root layout에 작은 client reporter를 넣으면 server layout 전체를 client로 바꾸지 않아도 된다. callback reference를 안정화하지 않으면 재호출/중복 보고가 생길 수 있어 module 함수나 useCallback을 사용한다.

metric에는 id, name, value, delta, entries, navigationType, rating 등 측정 결과가 들어올 수 있다. 문서는 TTFB/FCP/LCP/FID/CLS/INP를 나열하며 현재 browser/library에서 실제 발생하는 metric과 지원 범위는 별도로 확인한다. 오래된 FID 표기를 현재 Core Web Vitals 목록으로 단정하지 않는다. CLS의 단위와 GA 보고 예시의 scaling을 다른 ms metric과 혼동하지 않는다.

sendBeacon을 우선 쓰고 실패할 때 fetch keepalive fallback을 쓸 수 있다. sample rate, 중복 ID 처리, unload 전달 한계, 수집 동의와 민감 URL 제거를 함께 정한다. 개발 측정과 실제 사용자 production 측정은 같은 결과를 보장하지 않는다.

## 서버 hook의 타입과 runtime별 초기화

```ts
import type { Instrumentation } from 'next'
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const message = err instanceof Error ? err.message : String(err)
  const digest = typeof err === 'object' && err !== null && 'digest' in err
    ? String(err.digest) : undefined
  await sendSanitizedError({ message, digest, path: request.path, context })
}
```

request.path는 `/blog?name=foo`처럼 query를 포함할 수 있다. request.method는 string, headers는 `{[key:string]:string|string[]}`다. context.routerKind는 Pages Router/App Router, routeType은 render/route/action/proxy, renderSource는 react-server-components/react-server-components-payload/server-rendering, revalidateReason은 on-demand/stale/undefined, renderType은 dynamic/dynamic-resume(PPR)다. 반환은 void 또는 Promise<void>다.

register에서 `registerOTel('next-app')`을 호출해 OTel을 초기화할 수 있다. Node/Edge dependency는 NEXT_RUNTIME 조건 뒤 loading하고 모듈이 함수를 export한다면 실제 함수를 호출해야 한다. `return require(...)`만으로 그 모듈의 export hook이 호출된다고 가정하지 않는다. instrumentation은 v13.2 실험 도입, v14.0.4 Turbopack 지원, v15 안정화와 onRequestError 도입이다.

## client 계측과 polyfill의 예제

```ts
performance.mark('app-init')
window.addEventListener('error', event => reportError(event.error))
export function onRouterTransitionStart(url: string, navigationType: 'push'|'replace'|'traverse') {
  analytics.track('page_navigation', { url, type: navigationType, timestamp: Date.now() })
  performance.mark(`nav-start-${url}`)
}
```

Monitor.initialize 후 transition에서 navigation category breadcrumb를 기록할 수도 있다. 각 초기화 실패는 try/catch로 다른 계측에 번지지 않게 한다. 주 코드에는 필수 export가 없고 직접 top-level setup을 쓴다. plugin의 instrumentationClientInject 배열은 지정 순서로 이 파일 전에 실행되며 같은 router hook을 export할 수 있다.

```ts
import ResizeObserverPolyfill from './lib/polyfills/resize-observer'
if (!window.ResizeObserver) window.ResizeObserver = ResizeObserverPolyfill
```

static polyfill은 모든 방문자 bundle에 들어간다. conditional import는 hydration 뒤에 끝날 수 있어 선행보장이 없다. on-demand는 feature를 실제 사용하는 쪽에서 처리한다. fetch/URL/Object.assign 같은 baseline polyfill은 framework가 필요한 browser에 제공하므로 추가 대상만 넣는다.

experimental transition event는 `RouterTransitionStartEvent`, `RouterTransitionType`를 next에서 import한다. fromRoutes의 첫 값은 primary children이고 나머지 parallel slots는 deterministic 순서이며 `/blog/hello` 실제URL 대신 `/blog/[slug]` pattern을 쓴다. programmatic push/replace/back/forward는 Link가 없어 prefetchIntent null이다. hook error는 navigation/다른 hook에 영향을 주지 않도록 격리된다. client instrumentation은 v15.3, experimental third event는 v16.3 도입이다.

PerformanceObserver의 navigation entry에 `loadEventEnd - performance.now()로 잡은 시작값`을 적용한 예제는 초기화부터 load event 끝까지의 경과 관찰이다. 이것을 실제 Time to Interactive metric으로 단정하지 않는다.

## Web Vitals 타입과 전송 예제

| metric field | 계약 |
| --- | --- |
| id | 현재 page load 맥락의 고유 metric 식별자 |
| name | TTFB/FCP/LCP/FID/CLS/INP 등 metric 이름 |
| delta | 이전 측정값과 현재값 차이, metric별 단위 |
| entries | 해당 PerformanceEntry 배열 |
| navigationType | navigate/reload/prerender/back-forward/back-forward-cache/restore |
| rating | good/needs-improvement/poor |
| value | 해당 metric의 값, CLS는 ms로 해석하지 않음 |

`type Callback = Parameters<typeof useReportWebVitals>[0]`로 callback을 추론한다. module-level callback에서 metric.name이 FCP/LCP 등인지 분기하고 작은 `<WebVitals />`만 root layout에서 client로 import한다. 확인한 Next.js hook 구현은 CLS/FID/LCP/INP/FCP/TTFB reporter를 등록한다. 새 callback reference가 들어오면 현재까지의 metric도 다시 보고할 수 있다.

```ts
const postWebVitals = metric => {
  const body = JSON.stringify(metric)
  const url = 'https://example.com/analytics'
  if (!navigator.sendBeacon?.(url, body)) {
    void fetch(url, { body, method: 'POST', keepalive: true })
  }
}
```

GA integer value는 `Math.round(metric.name === 'CLS' ? metric.value*1000 : metric.value)`로 보내고 event_label은 id, non_interaction은 true로 설정하는 예제가 있다. id를 사용하면 분포/percentile을 직접 집계할 수 있다. inline GA callback도 안정된 reference로 분리한다.

## 이해 확인

1. async client instrumentation이 끝날 때까지 hydration이 반드시 대기하는가?
2. register는 모든 server instance를 통틀어 단 한 번 실행되는가?
3. transition 시작 timestamp만으로 LCP가 개선되었다고 말할 수 있는가?

## 출처

- [Next.js, instrumentation](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation)
- [Next.js, instrumentation-client](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client)
- [Next.js, use-report-web-vitals](https://nextjs.org/docs/app/api-reference/functions/use-report-web-vitals)

- [Web Vitals hook 구현 — Next.js 저장소](https://github.com/vercel/next.js/blob/canary/packages/next/src/client/web-vitals.ts)

## 관련 문서

- [[NextJS-App-Request-Proxy]]
- [[NextJS-App-Client-Navigation]]
- [[NextJS-App-Errors]]
