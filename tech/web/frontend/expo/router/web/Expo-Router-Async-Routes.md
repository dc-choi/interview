---
tags: [expo, expo-router, web]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router async bundle과 loading"]
---

# Expo Router async bundle과 loading

SDK 57까지는 모든 platform에서 asyncRoutes opt-in이 필요하다. SDK 58은 web development/production 기본 활성 stable, native는 여전히 development 전용 experimental이며 production native에서는 synchronous load다.

```json
{ "expo": { "plugins": [["expo-router", { "asyncRoutes": {
  "web": true, "android": false, "default": "development"
} }]] } }
```

boolean 또는 development/production mode string과 default/android/ios/web object를 받는다. platform 값은 default보다 우선한다. SDK 58에서는 native만 지정해도 web default가 유지되지만 default:false는 명시 web:true가 없으면 web도 끈다. 변경 후 start/export --clear로 cache를 지운다.

## 동작과 성능

route별 Suspense, bundle splitting과 development lazy bundling을 결합한다. 최초 방문에 bundle/loading 비용이 생기고 이후 cache된다. Hermes bytecode는 이미 memory-mapped라 native bundle splitting 이점이 상대적으로 작다. 개선 목적은 초기 web chunk, 개발 bundling 속도와 관련 server/update 흐름이며 native production splitting을 지원한다고 확대하지 않는다.

개발에서는 async route를 미리 정적 분석하지 못해 default export 없는 파일도 route로 분류될 수 있다. load 후 invalid route warning을 표시하고 loading error는 parent ErrorBoundary로 전파한다.

## 정적 render와 fallback 제한

production web SSG는 Node에서 Suspense를 동기 resolve하고 해당 leaf까지 layout, anchor와 chunk를 HTML에 연결한다. cold load의 waterfall을 줄이고 이후 탐색에서 missing chunk를 recursive load한다. 개발은 lazy JS와 HTML이 일시적으로 어긋날 수 있다.

custom `SuspenseFallback` export는 asyncRoutes와 함께 지원되지 않는다. SDK 58 web에서 custom fallback을 쓰려면 asyncRoutes.web=false로 synchronous route loading을 선택한다. router settings guide의 unstable_settings가 development async와 안 맞는다는 경고는 production SSG의 anchor 포함 설명과 실행 시점을 구분해 읽는다.

## 출처

- [Expo Documentation, Async routes](https://docs.expo.dev/router/web/async-routes)

## 관련 문서

- [[Expo-Router-Errors-Testing]]
- [[Expo-Router-Static-Rendering]]
