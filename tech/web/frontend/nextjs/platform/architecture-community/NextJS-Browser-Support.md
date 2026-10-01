---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js browser target와 polyfill", "NextJS-Browser-Support"]
---

# Next.js browser target와 polyfill

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## supported browsers

16.3.x의 zero-config baseline은 Chrome/Edge/Firefox 111+, Safari 16.4+다. target browser를 바꾸려면 package.json browserslist를 설정한다. syntax downlevel과 runtime API polyfill은 다른 작업이며 browserslist만으로 어떤 구형 browser든 전체 Next runtime이 지원되는 것은 아니다.

## built-in polyfills

fetch, URL과 Object.assign 등 널리 쓰이는 API polyfill을 제공하고 중복 dependency polyfill을 production에서 제거할 수 있다. 필요한 browser에만 load해 bundle을 줄인다. 지원 browser에 없는 application/dependency feature는 별도 specific polyfill이 필요하다.

App은 instrumentation-client에서, Pages는 _app 또는 필요한 component의 top-level import로 추가할 수 있다. 모든 polyfills를 bundle에 넣기보다 필요한 UI feature를 분리하고 feature detection 뒤 조건부 load를 검토한다.

```ts
if (!('IntersectionObserver' in window)) {
  await import('intersection-observer')
}
```

이 예시는 해당 polyfill package가 설치된 client context에서 사용한다. server module top level에서 window를 접근하지 않는다. target browser에 맞는 package compatibility와 licensing을 확인한다.

## language와 CSS

async/await, object rest/spread, dynamic import, optional chaining, nullish coalescing, class fields/static properties 등을 사용하고 compiler가 대상에 맞게 처리한다. Babel custom setup과 SWC/Turbopack behavior는 별도 확인한다. CSS는 Lightning CSS/PostCSS와 browserslist targets, explicit feature include/exclude를 함께 확인한다.

## 확인

minimum Safari/Chromium/Firefox target에서 page load, navigation, forms, image/font와 modern API feature를 실행한다. syntax error 없는 build가 missing runtime API까지 증명하지 않는다. initial polyfill loading order를 hydration 전에 맞추고 size와 network requests를 측정한다.

## polyfill 대체와 조건부 structuredClone

내장 fetch는 whatwg-fetch/unfetch, URL은 url package, Object.assign은 object-assign/object.assign/core-js/object/assign 중복을 production에서 제거하는 대응이다. package.json 기본 browserslist는 chrome 111, edge 111, firefox 111, safari 16.4다. analytics callback에서 !("structuredClone" in globalThis)일 때 await import("polyfills/structured-clone")의 default를 globalThis.structuredClone에 할당한 뒤 작업하면 unsupported feature를 필요한 UI에서만 load할 수 있다. 이는 실제 해당 package를 준비한 client callback 예시다. 언어 도입 연도는 async/await ES2017, rest/spread ES2018, dynamic import/optional chaining/nullish coalescing ES2020, class fields/static properties ES2022다.

## 출처

- [Next.js, architecture/supported-browsers](https://nextjs.org/docs/architecture/supported-browsers)

## 관련 문서

- [[NextJS-Compiler]]
- [[NextJS-Config-CSS-Images]]
- [[NextJS-Config-Development]]
