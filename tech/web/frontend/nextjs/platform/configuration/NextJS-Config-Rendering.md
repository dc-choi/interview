---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 렌더링 동작과 실험 기능", "NextJS-Config-Rendering"]
---

# Next.js 렌더링 동작과 실험 기능

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## cacheComponents

16.0의 top-level boolean `cacheComponents: true`는 component/function cache를 선택적으로 적용하고 static shell과 request-time dynamic streaming을 결합한다. `use cache`, `cacheLife`, `cacheTag`를 함께 쓴다. 기존 `experimental.useCache`, `dynamicIO`, `ppr`와 route의 experimental_ppr는 새 설정으로 통합됐으며 이전 플래그를 그대로 추가하지 않는다.

Node.js runtime이 필요하다. deprecated `runtime = 'edge'`를 유지한 채 활성화하지 않는다. 기본적으로 dynamic fetching을 두고 cache boundary를 선택하므로 기존 route segment caching 설정의 migration을 먼저 확인한다.

### Activity와 navigation

Cache Components에서 Next.js는 최근 route를 React Activity의 hidden 상태로 보존할 수 있다. state는 유지되지만 hidden일 때 effects는 정리되고 visible이면 재실행된다. 몇 개 최근 route만 보존하는 heuristic이며 영구 DOM 보존 보장이 아니다. unmount에 의존한 dialog, form, 테스트 cleanup은 hidden navigation에서도 확인한다.

## reactStrictMode

개발에서 unsafe lifecycle와 effects 문제를 드러내는 boolean이다. App Router는 13.5.1부터 기본 true이고 Pages는 `reactStrictMode: true`로 활성화한다. false로 전체 비활성화하거나 `<React.StrictMode>`로 일부 적용할 수 있다. production에서 같은 이중 실행을 하는 기능으로 설명하지 않는다.

## reactCompiler

top-level boolean 또는 compiler option object다. `babel-plugin-react-compiler`를 설치하고 true로 활성화한다. SWC가 JSX/hooks 등이 있는 관련 파일을 골라 Babel React Compiler를 실행해 전체 파일에 plugin을 거는 비용을 줄인다. build overhead는 발생할 수 있으며 실제 렌더 성능은 profile로 판단한다.

```js
export default {
  reactCompiler: { compilationMode: 'annotation' },
}
```

annotation mode에서는 React의 `'use memo'`로 opt in하고 `'use no memo'`로 opt out한다. memoization과 컴파일 원리는 [[React-Compiler]]에 둔다. [[NextJS-Turbopack-Tuning]]의 Rust compiler 실험은 이 활성화 설정을 대신하지 않는다.

## reactMaxHeadersLength

App Router prerender 시 React가 방출하는 preload response headers의 상한이다. 숫자 기본 `6000`이며 reverse proxy가 작은 header 제한을 쓰면 낮출 수 있다. JavaScript body size나 Server Action payload 제한이 아니다. CDN/LB와 Next.js 모두의 응답 header 제한 및 잘림 여부를 측정한다.

## htmlLimitedBots

User-Agent를 매칭하는 RegExp로 metadata streaming 대신 blocking metadata를 받을 crawler를 선택한다. 기본에는 일부 Google crawlers, Bingbot, Twitterbot, Slackbot 등이 포함된다. 사용자 RegExp는 기본 목록에 추가하는 것이 아니라 덮어쓴다. `/.*/`는 모든 UA에 blocking metadata를 적용하므로 TTFB와 bot 요구를 함께 판단한다. 15.2에서 도입됐다.

## authInterrupts

canary에 있는 실험 `experimental.authInterrupts: true`는 `forbidden()`, `unauthorized()`와 해당 special error UI를 사용하게 한다. 정식 production 보장으로 취급하지 않는다. 이 설정은 인증, 세션 검증과 권한 체크를 구현하지 않으며 각 서버 entry에서 검증한 결과에 맞게 호출한다.

## staticGeneration

실험 numeric options는 failed page generation 재시도(`staticGenerationRetryCount`), worker별 동시 page 수(`staticGenerationMaxConcurrency`), 추가 worker를 시작하기 위한 최소 page 수(`staticGenerationMinPagesPerWorker`)를 조절한다. 공식 예시의 값은 1, 8, 25이며 예시를 명시된 기본값으로 오인하지 않는다.

```js
export default {
  experimental: {
    staticGenerationRetryCount: 1,
    staticGenerationMaxConcurrency: 8,
    staticGenerationMinPagesPerWorker: 25,
  },
}
```

공유 API rate limit과 worker 메모리가 제한이면 concurrency 증가가 오히려 build 실패를 늘릴 수 있다. 평균 build 시간뿐 아니라 upstream 오류, 최대 RSS와 retry의 부작용을 확인한다.

## useOffline

실험 `experimental.useOffline: true`는 framework navigation, prefetch, Server Action의 연결 실패를 감지하고 온라인 복귀 후 재시도한다. `next/offline`의 hook으로 offline UI를 만들 수 있다. Service Worker, 저장된 페이지와 PWA offline content를 제공하는 기능과는 구분한다.

browser offline event 또는 abort/timeout이 아닌 fetch network rejection으로 offline 진입한다. 현재 페이지 URL에 RSC header를 붙인 HEAD check를 200ms 후 abort한다. 정상 응답과 200ms까지 pending인 요청 모두 online으로 판정하는 현재 heuristic이다. check 지연은 500ms, 1s, 2s, 이후 최대 3s이며 page unload까지 계속한다. online event는 즉시 check를 당긴다.

온라인 확인 후 pending framework 요청을 한 번 실행하며 실패하면 다시 offline으로 돌아간다. 마지막 navigation만 보존하고 prefetch는 기존 queue를 사용한다. 사업적으로 중복 실행이 위험한 mutation은 request id와 서버 측 idempotency를 따로 설계한다. 네트워크 상태 감지와 write success 확인은 다른 문제다.

## htmlLimitedBots 기본 그룹

예시 기본 Google crawlers는 Mediapartners-Google, AdsBot-Google, Google-PageRenderer이고 Bingbot/Twitterbot/Slackbot도 포함된다. 사용자 RegExp는 기본 목록 전체를 대체하므로 특정 bot 하나를 추가하려고 기존 crawler 보호를 없애지 않게 확인한다.

## offline 재연결의 대기와 origin traffic

navigator.onLine이 true여도 captive portal, DNS 오류나 upstream 장애로 fetch가 reject하면 offline에 진입할 수 있다. online browser event는 대기 중 timer를 단축해 즉시 확인하고 offline 중 성공한 navigation/prefetch/Action도 online으로 바꾼다. pending 요청은 확인 성공 뒤 추가 backoff 없이 한 번 실행한다. 실패한 offline fetch는 browser network layer에서 끝나 origin에 도달하지 않고 HEAD 한 개씩만 polling한다. 재연결 시 마지막 navigation과 각 pending Action만 한 번, prefetch는 기존 queue로 실행한다. polling은 자체 포기하지 않아 오랜 단절 후에도 page가 남아 있으면 다시 확인한다. 문서의 도입 버전은 구체적 minor가 없는 v16.x.0 표기이므로 이를 16.0 확정 이력으로 바꾸지 않는다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [Next.js, app/api-reference/config/next-config-js/reactStrictMode](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactStrictMode)
- [Next.js, pages/api-reference/config/next-config-js/reactStrictMode](https://nextjs.org/docs/pages/api-reference/config/next-config-js/reactStrictMode)
- [Next.js, app/api-reference/config/next-config-js/reactCompiler](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler)
- [Next.js, app/api-reference/config/next-config-js/reactMaxHeadersLength](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactMaxHeadersLength)
- [Next.js, app/api-reference/config/next-config-js/htmlLimitedBots](https://nextjs.org/docs/app/api-reference/config/next-config-js/htmlLimitedBots)
- [Next.js, app/api-reference/config/next-config-js/authInterrupts](https://nextjs.org/docs/app/api-reference/config/next-config-js/authInterrupts)
- [Next.js, app/api-reference/config/next-config-js/staticGeneration](https://nextjs.org/docs/app/api-reference/config/next-config-js/staticGeneration)
- [Next.js, app/api-reference/config/next-config-js/useOffline](https://nextjs.org/docs/app/api-reference/config/next-config-js/useOffline)

## 관련 문서

- [[React-Compiler]]
- [[NextJS-Turbopack-Tuning]]
- [[NextJS-Edge-Runtime]]
