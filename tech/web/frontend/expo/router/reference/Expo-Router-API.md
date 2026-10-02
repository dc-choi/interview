---
tags: [expo, expo-router, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 설정과 공용 API"]
---

# Expo Router 설정과 공용 API

SDK57 Reference의 expo-router는 Android, iOS, tvOS와 웹에서 사용하는 file router다. 개별 feature에 다른 플랫폼 제한이 있으므로 package 지원 목록만으로 native toolbar나 iOS zoom 사용을 판단하지 않는다. 설치는 [[Expo-Router-Installation]], URL 탐색은 [[Expo-Router-Navigation]], hook은 [[Expo-Router-Hooks]]로 이어진다.

## Config plugin

app config의 plugins에 `['expo-router', options]`를 선언한다. Metro/HTML generation과 native deep link origin을 구성하는 값이므로 JS object를 바꿨다고 이미 빌드한 binary나 export에 반영되지 않는다.

| option | SDK57 계약과 기본값 |
| --- | --- |
| `root` | app directory, 기본 app. src/app 자동 탐지를 우선하고 custom root는 비권장 |
| `origin` | native API request 등이 사용할 서버 origin. 기본 undefined |
| `headOrigin` | native Head URL origin, 기본 origin |
| `asyncRoutes` | true/false, development/production 또는 platform별 값. 상세는 async 문서 |
| `platformRoutes` | 플랫폼 route extension 분석, 기본 true |
| `sitemap` | 자동 /_sitemap 포함, 기본 true |
| `partialRouteTypes` | 부분 route type 지원, 기본 true |
| `redirects` | source/destination, permanent(기본false), methods 등의 rule array |
| `rewrites` | source/destination, methods rule array. 브라우저 URL을 바꾸지 않고 destination 처리 |
| `headers` | header 이름을 key로 갖는 string 또는 string[] 전역 object. HTML/API 응답에 공통 적용하며 경로별 처리는 middleware/API response에서 한다. |
| `disableSynchronousScreensUpdates` | synchronous screen 업데이트 끄기, 기본 false |
| `unstable_useServerMiddleware` | 기본 false, output server에서 middleware opt in |
| `unstable_useServerDataLoaders` | 기본 false. SDK57 reference는 static에서만 지원한다고 표기 |
| `unstable_useServerRendering` | 기본 false, output server request-time SSR opt in |

현재 data loader guide는 static과 SSR 모두 설명하지만 SDK57 option reference의 static-only 범위와 다르다. SDK57 loader/SSR 조합을 현재 stable guide만으로 보장하지 않는다. SDK58에서 middleware/loaders/SSR 기본화와 `apiRoutes`가 바뀌는 내용은 [[Expo-Router-Migration-SDK58]]에 별도로 둔다.

RedirectConfig의 source/destination은 path pattern이며 destinationContextKey는 route context 식별, external은 외부 목적지, methods는 적용 HTTP method, permanent는 영구 redirect다. client `<Redirect>`의 mount 동작과 export/server rule은 서로 다른 실행 지점이다.

## Component와 공용 utility

`Slot`에는 layout navigator로 자식을 연결하는 구현과 navigator content에서 active route를 렌더링하는 구현이 있다. contextKey를 바꾸는 custom navigator 안에서는 어떤 역할의 Slot인지 구분한다. `Sitemap`은 debug route tree UI다. `useSitemap`의 반환 null을 로딩 중에 처리한다.

`ScrollViewStyleReset`은 `expo-router/html`에서 import하며 HTML body scrolling을 reset해 웹 ScrollView 동작을 native에 가깝게 만든다. mobile web에서 body scroll을 유지하려면 생략한다. `SuspenseFallback`은 layout의 named export이고 contextKey와 route params(string/string[])를 받는다. async route 기본 fallback과 호환 제약이 있다.

Badge/Icon/Label은 native tabs나 toolbar에서 역할을 전달하는 구성 요소다. VectorIcon은 icon family의 getImageSourceAsync와 name으로 image를 만든다. 일반 RN View처럼 arbitrary child 배치를 지원한다는 뜻이 아니다. ThemeProvider와 DarkTheme/DefaultTheme/useTheme는 관리되는 navigation container 바깥에서 app appearance를 공급한다.

## ImperativeRouter와 상태 타입

`useRouter()`와 module router는 navigate/push/replace/back/dismiss(count)/dismissAll/dismissTo(href), canGoBack/canDismiss, setParams, prefetch를 제공한다. navigate는 기존 route로 돌아갈 수 있고 push는 새 entry, replace는 현재 entry 교체다. dismiss는 가까운 stack을 닫으므로 browser back과 항상 같지 않다. type 검증은 path 모양을 확인할 뿐 서버 권한이나 입력 데이터 유효성을 검사하지 않는다.

StackNavigationState의 type은 stack이며 preloadedRoutes가 별도 배열이다. TabNavigationState는 tab type과 history/preloadedRouteKeys를 가진다. TabRouterOptions.backBehavior는 firstRoute/initialRoute/order/history/fullHistory/none이다. history는 중복 방문을 제거하고 fullHistory는 반복 방문을 유지한다. ResultState는 recursive partial state이고 public URL 정보가 충분한데 이 internal state를 저장하는 구조를 먼저 선택하지 않는다. SDK58은 이 구조 자체를 바꾼다.

`StackRouter`와 `TabRouter`의 internal behavior는 버전에 따라 바뀔 수 있다. SDK57의 `withLayoutContext(Navigator, processor?, useOnlyUserDefinedScreens=false)`는 파일 route를 Screen에 주입하고 자식이 없으면 null을 반환한다. 반환에는 Screen/Protected가 있다. `unstable_createStandardRouterNavigator`와 `unstable_integrateWithRouter`는 standard-navigation integration의 실험적 진입점이다. Reference의 외부 @react-navigation import 예제 일부는 SDK56 이후 application import 금지와 맞지 않아 matching expo-router entry로 바꿔야 한다.

## Navigation event 관찰

`unstable_navigationEvents.enable()`로 관찰을 켜고 isEnabled로 상태를 확인한다. addListener(eventType, callback)는 unsubscribe를 반환하며 emit은 event를 전달한다. pagePreloaded는 실제 focus가 아니며 pageFocused/pageBlurred/pageRemoved와 구분한다. actionDispatched에는 actionType, payload, state와 event type이 포함된다. 이 unstable 내부 이벤트를 product analytics의 영구 스키마로 직접 저장하기보다 URL 수준 데이터로 변환한다.

## 출처

- [Expo Documentation, Router](https://docs.expo.dev/versions/latest/sdk/router)

## 관련 문서

- [[Expo-Router-Hooks]]
- [[Expo-Router-Stack]]
- [[Expo-Router-Custom-Navigators]]
- [[Expo-Router-Migration-SDK58]]
