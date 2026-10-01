---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 메모리 진단"]
---

# Next.js 메모리 진단

## 측정과 의존성

앱의 기능/의존성이 늘면 개발과 production build의 메모리 요구도 커진다.
bundle analyzer로 제거 가능한 큰 의존성을 먼저 찾되 빌드 peak, steady-state 서버 heap, 프로세스 수를 구분한다.
메모리 최적화는 compile 시간, cold response 지연과 교환 관계가 있다. 변경 전후 같은 작업으로 측정한다.

## 빌드 진단 방법

14.2 이후 next build --experimental-debug-memory-usage는 heap와 GC 통계를 계속 출력하고 한계에 가까우면 heap snapshot을 자동 저장한다.
이 모드는 Webpack build worker와 호환되지 않는다. custom webpack 설정이 없으면 worker가 기본 켜질 수 있으므로 실제 구성 확인이 필요하다.
이 모드에 SIGUSR2를 보내면 원하는 시점 snapshot이 프로젝트 root에 저장된다. Chrome DevTools 같은 analyzer로 retained 객체를 본다.
node --heap-prof node_modules/next/dist/bin/next build는 종료 때 .heapprofile을 만든다. DevTools Memory의 Load Profile로 읽는다.
profile의 할당 분포와 snapshot의 현재 retained 객체를 서로 다른 증거로 사용한다.
NODE_OPTIONS=--inspect next build 또는 next dev로 inspector에 연결해 snapshot을 찍는다. --inspect-brk는 사용자 코드 전 일시 중단한다.
디버깅 port와 앱 HTTP port는 다르며 inspector는 신뢰할 연결에서만 연다.

## Webpack 옵션과 상충 관계

15 이후 experimental.webpackMemoryOptimizations: true는 peak 메모리를 낮추는 실험 변경이며 compile 시간이 조금 늘 수 있다.
원문은 낮은 위험으로 설명하지만 실제 plugin과 build 결과는 앱에서 확인한다.
14.1 이후 custom Webpack 설정이 없으면 별도 Node worker의 Webpack compilation이 기본 활성이다.
구버전/사용자 설정은 experimental.webpackBuildWorker: true로 선택할 수 있지만 모든 custom plugin과 호환되지는 않는다.
이 두 설정은 Turbopack 최적화 옵션이 아니다.

Webpack cache는 모듈을 memory/disk에 보관해 속도를 높이고 메모리도 쓴다.
원문은 cache disable 절에서 production config.cache를 Object.freeze({type: 'memory'})로 바꾸고 config를 반환한다.
이 예는 캐시 전체 비활성화가 아니라 memory cache 선택이다. 전체 비활성화가 목적이면 Webpack cache: false 계약을 따로 적용하고 측정한다.
webpack callback의 buildId/dev/isServer/defaultLoaders/nextRuntime/webpack 인자 중 예제는 dev와 config.cache 조건을 사용한다.

## 타입 검사와 sourcemap

Running TypeScript 단계의 OOM은 typescript.ignoreBuildErrors: true로 build 내 검사를 생략할 수 있다.
타입 오류가 있는 production build도 통과하게 하므로 별도 CI 검사를 완료한 결과만 배포 승격하는 조건이 필요하다.
productionBrowserSourceMaps: false와 experimental.serverSourceMaps: false는 해당 source map 생성 비용을 줄이는 선택이다.
prerender 단계는 기본 source map을 쓸 수 있다. Generating static pages 뒤 OOM이면 enablePrerenderSourceMaps: false를 실험해 본다.
plugin이 source map을 다시 켤 수 있어 plugin 설정도 확인한다. 진단 가능성이 줄어드는 대가를 기록한다.

## 런타임 메모리와 버전

14.1.3은 Edge runtime 메모리 문제를 수정한 버전이다. 과거 이슈를 현재 모든 Edge 문제의 동일 원인으로 간주하지 않는다.
기본 entry preloading은 서버 시작 시 페이지 JavaScript를 미리 메모리에 올려 초기 응답을 빠르게 한다.
experimental.preloadEntriesOnStart: false는 초기 사용량을 낮추고 최초 경로 요청 비용을 늘리는 선택이다.
로드한 모듈을 unload하지 않으므로 결국 모든 경로가 요청되면 총 footprint가 같아질 수 있다.
빌드 OOM과 이 서버 시작 시 메모리 계약은 서로 다른 수명이다.

## 이해 확인

- memory cache로 바꾸는 설정이 cache: false와 같은 의미가 아닌 이유는 무엇인가?
- preloadEntriesOnStart를 꺼도 장기 서버 메모리가 줄지 않을 수 있는 이유는 무엇인가?

## Webpack memory cache 예제

~~~js
// next.config.mjs, Webpack 전용: 전체 cache off가 아니다.
export default {
  webpack(config, { dev }) {
    if (config.cache && !dev) {
      config.cache = Object.freeze({ type: 'memory' })
    }
    return config
  },
}
~~~

## 출처

- [Next.js, memory-usage](https://nextjs.org/docs/app/guides/memory-usage)

## 관련 문서

- [[NextJS-Package-Bundling]]
- [[NextJS-Debugging]]
- [[NextJS-Config-Dependencies]]
