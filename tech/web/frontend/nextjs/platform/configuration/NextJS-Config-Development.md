---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 개발 서버와 진단 설정", "NextJS-Config-Development"]
---

# Next.js 개발 서버와 진단 설정

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## allowedDevOrigins

`allowedDevOrigins: string[]`는 개발 전용 assets/endpoints의 추가 허용 hostnames다. 기본 허용에는 localhost, 그 subdomain과 서버를 시작한 hostname이 포함된다. Origin의 hostname만 비교하며 scheme, port, path, query를 무시한다. Origin이 없는 no-cors 요청은 Referer hostname을 검사한다.

`*.tunnel.example.com`은 한 label, `**.tunnel.example.com`은 한 개 이상 label을 매칭한다. 둘 다 bare `tunnel.example.com`은 매칭하지 않으므로 별도 항목이 필요하다. 부분 wildcard `team-*`는 지원하지 않고 `**`는 패턴 시작에서만 쓴다. production CORS 또는 Server Actions의 allowedOrigins와 별개다.

```js
export default {
  allowedDevOrigins: ['tunnel.example.com', '*.tunnel.example.com'],
}
```

## devIndicators

`devIndicators`는 개발 중 route 정보 overlay의 위치 또는 표시를 정한다. 기본 위치는 `bottom-left`이며 `bottom-right`, `top-left`, `top-right`도 가능하다. `false`는 indicator를 숨긴다. build activity/position으로 조절하던 오래된 하위 옵션은 16에서 제거됐다. indicator를 꺼도 오류 overlay 자체를 끄는 것은 아니다.

static/dynamic 표시는 `next build --debug` 결과와 비교한다. App에서는 request-time API나 uncached fetching이 prerender를 막을 수 있고 Pages에서는 getServerSideProps/getInitialProps가 dynamic 원인이다. 표시만 보고 cache correctness까지 확인했다고 결론 내리지 않는다.

```js
export default { devIndicators: { position: 'bottom-right' } }
```

## onDemandEntries

개발 서버가 빌드한 Pages entry를 메모리에 얼마나 유지할지 조절한다. `maxInactiveAge` 기본 예시는 `25 * 1000` ms, `pagesBufferLength`는 `2`다. 오래 사용하지 않는 페이지의 폐기와 재컴파일을 조정하는 옵션이며 production cache TTL이 아니다.

## logging

개발 terminal 로그를 조정한다. `logging: false`로 개발 logging을 비활성화할 수 있다. `fetches.fullUrl: true`는 전체 fetch URL을 보여주며 query token이 노출될 수 있어 로그 수집 범위를 확인한다. `fetches.hmrRefreshes: true`는 기본 숨김인 HMR cache 복원 fetch도 기록한다.

`serverFunctions`는 기본 true이며 함수 이름, 인자와 duration을 기록한다. `incomingRequests`는 기본 기록, false로 끄거나 `{ ignore: [/\/health/] }`로 일부를 제외한다. `browserToTerminal`은 기본 `'warn'`, `'error'`, true(전체), false를 지원하며 source location을 표시한다. 16.2에서 기존 experimental browser debug flag를 대체했다. 이 설정은 production observability를 구축하지 않는다.

```js
export default {
  logging: {
    fetches: { fullUrl: true, hmrRefreshes: true },
    serverFunctions: false,
    incomingRequests: { ignore: [/\/health/] },
    browserToTerminal: 'error',
  },
}
```

App 전용 fetch/Server Function 정보는 Pages 레퍼런스보다 확장되어 있다. Pages에서도 request/browser forwarding을 사용할 수 있지만 Server Component 동작을 전제하지 않는다.

## serverComponentsHmrCache

실험 boolean, 기본 true다. Server Components의 fetch response를 개발 HMR 사이에 유지해 속도와 유료 API 비용을 줄인다. `cache: 'no-store'`에도 적용되므로 HMR만으로 최신 데이터가 나오지 않을 수 있다. navigation과 full reload는 cache를 지운다.

```js
export default { experimental: { serverComponentsHmrCache: false } }
```

production caching 문제를 개발 HMR cache로 재현한다고 생각하지 않는다. 최신 데이터 확인이 목적이면 비활성화하거나 full reload하고, `logging.fetches`로 원인을 분리한다.

## instrumentationClientInject

16.3의 문자열 module 배열이다. npm package 또는 프로젝트 상대 경로를 받아 side effect를 client에서 실행한다. 설정 배열 순서, 사용자 `instrumentation-client` 파일, React hydration 순으로 실행한다. plugin wrapper가 자체 monitoring 초기화를 주입할 때 쓰고 앱 코드는 직접 file convention을 쓰는 편이 맞다.

각 module이 `onRouterTransitionStart`를 export하면 navigation 때 배열 순서대로 호출한 뒤 사용자 파일 hook을 호출한다. 기존 배열을 덮어쓰지 말고 추가하며, 초기화 side effect의 중복과 hydration 이전 실행 비용을 확인한다.

## productionBrowserSourceMaps

boolean, production 기본 false, development는 기본 source maps가 있다. true면 JS 옆에 source map을 만들고 요청 시 Next.js가 제공한다. 브라우저 오류 추적은 쉬워지지만 build 시간/메모리와 공개 소스 노출이 늘어난다. 에러 추적 도구에 비공개 업로드하는 정책과 공개 serving 여부를 구분한다.

## webVitalsAttribution

실험 `string[]`, 기본 비활성화다. `experimental.webVitalsAttribution: ['CLS', 'LCP']`처럼 metric별 attribution을 활성화하면 shift element, LCP element/resource와 PerformanceEntry 정보를 원인 분석에 사용할 수 있다. 허용 이름은 설치 버전의 `NextWebVitalsMetric` 타입에 맞춘다. 수집은 metric reporting hook에서 처리하며 config만으로 모니터링 backend가 만들어지지 않는다.

## devIndicators 변경 이력과 build 기호

15.0에서 appIsrStatus 정적 표시 도입,15.2에서 position 추가와 appIsrStatus/buildActivity/buildActivityPosition deprecated,16.0에서 세 옵션 제거다. build --debug의 ○는 prerendered static, ƒ는 request-time dynamic이다. App에서 요청 API나 cache되지 않은 ORM 조회를 발견하면 loading/Suspense로 동적 부분 streaming을 검토한다.

## logging 버전과 hook 인자

logging.fetches는14.0 App에서 stable,15.0 logging:false와 hmrRefreshes,15.2 incomingRequests,15.4 experimental.browserDebugInfoInTerminal,16.2 browserToTerminal 이전이다. instrumentationClientInject hook은 onRouterTransitionStart(url,navigationType)이며 hook 없는 module은 탐색 때 건너뛴다. side effect import는 모두 배열 순서로 실행한다.

## Web Vitals attribution

experimental.webVitalsAttribution은 기본 disabled이며 CLS/LCP 등 NextWebVitalsMetric에 속하는 web-vitals metric 이름 배열로 필요한 metric만 선택한다. CLS는 가장 큰 layout shift 시 처음 움직인 element, LCP는 해당 element와 image resource URL 같은 원인을 추적한다. PerformanceEventTiming/PerformanceNavigationTiming/PerformanceResourceTiming entries를 통해 점수의 가장 큰 기여자를 찾는다. 예시 [CLS,LCP]는 모든 metric의 완전한 허용값 목록을 대신하지 않으므로 설치한 web-vitals 타입의 metric 집합을 따른다.

## Pages의 static 표시와 logging

Pages가 getServerSideProps 또는 getInitialProps를 export하면 indicator는 dynamic으로 표시한다. App의 ORM/request API 판별을 Pages에 그대로 대입하지 않는다. Pages logging reference는 incomingRequests, browserToTerminal과 logging:false를 설명하며 App fetch fullUrl/hmrRefreshes 및 serverFunctions 설정을 Pages 원문의 계약으로 확대하지 않는다. Pages button의 console.log는 browserToTerminal:true일 때 [browser] 메시지와 pages/index.tsx의 file:line:column을 보여 주는 동일 source-location 예시다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/allowedDevOrigins](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins)
- [Next.js, pages/api-reference/config/next-config-js/allowedDevOrigins](https://nextjs.org/docs/pages/api-reference/config/next-config-js/allowedDevOrigins)
- [Next.js, app/api-reference/config/next-config-js/devIndicators](https://nextjs.org/docs/app/api-reference/config/next-config-js/devIndicators)
- [Next.js, pages/api-reference/config/next-config-js/devIndicators](https://nextjs.org/docs/pages/api-reference/config/next-config-js/devIndicators)
- [Next.js, app/api-reference/config/next-config-js/onDemandEntries](https://nextjs.org/docs/app/api-reference/config/next-config-js/onDemandEntries)
- [Next.js, pages/api-reference/config/next-config-js/onDemandEntries](https://nextjs.org/docs/pages/api-reference/config/next-config-js/onDemandEntries)
- [Next.js, app/api-reference/config/next-config-js/logging](https://nextjs.org/docs/app/api-reference/config/next-config-js/logging)
- [Next.js, pages/api-reference/config/next-config-js/logging](https://nextjs.org/docs/pages/api-reference/config/next-config-js/logging)
- [Next.js, app/api-reference/config/next-config-js/serverComponentsHmrCache](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverComponentsHmrCache)
- [Next.js, app/api-reference/config/next-config-js/instrumentationClientInject](https://nextjs.org/docs/app/api-reference/config/next-config-js/instrumentationClientInject)
- [Next.js, app/api-reference/config/next-config-js/productionBrowserSourceMaps](https://nextjs.org/docs/app/api-reference/config/next-config-js/productionBrowserSourceMaps)
- [Next.js, pages/api-reference/config/next-config-js/productionBrowserSourceMaps](https://nextjs.org/docs/pages/api-reference/config/next-config-js/productionBrowserSourceMaps)
- [Next.js, app/api-reference/config/next-config-js/webVitalsAttribution](https://nextjs.org/docs/app/api-reference/config/next-config-js/webVitalsAttribution)
- [Next.js, pages/api-reference/config/next-config-js/webVitalsAttribution](https://nextjs.org/docs/pages/api-reference/config/next-config-js/webVitalsAttribution)

## 관련 문서

- [[NextJS-Fast-Refresh]]
- [[NextJS-Config-Server-Actions]]
