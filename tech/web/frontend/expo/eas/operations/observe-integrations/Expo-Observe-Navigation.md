---
tags: [expo, eas, operations]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Observe Router와 React Navigation 통합"]
---

# Observe Router와 React Navigation 통합

## 화면별 시간 측정

SDK 56 이상에서 navigation integration을 켠다. cold_ttr은 navigation action부터 대상 focus까지, warm_ttr은 이전에 렌더된 화면의 같은 구간, tti는 대상 화면이 markInteractive를 호출할 때까지다. 첫 launch의 화면 timer는 JS bundle loaded 기준이라는 integration 설명을 따른다. 앱 native 시작 metric과 같은 시작점으로 합산하지 않는다.

Prefetch는 화면을 미리 렌더해도 실제 navigation event를 만들지 않는다. 실제 focus 때 warm으로 분류될 수 있다. Lazy tab 첫 focus와 뒤로 가기/preload 복귀의 차이를 고려한다.

## Expo Router

Observe.configure의 `integrations: { 'expo-router': true }`를 root mount 전에 설정한다. useObserve().markInteractive는 화면 컴포넌트의 useEffect 안에서 준비 후 호출한다. 화면 컴포넌트 밖이나 unmounted screen에서 호출하면 경고하고 정상 화면 지표로 처리하지 않는다. expo-router가 없는 앱에서는 해당 integration이 동작하지 않는다.

SDK 57의 filteredParams로 민감한 route param을 제외한다. 기본은 serializable params를 포함한다. 필터가 있으면 실제 resolved URL도 숨기고 urlHidden=true를 기록하지만 routeName pattern은 유지한다.

## React Navigation

React Navigation 7 이상이 필요하며 `integrations: { 'react-navigation': true }`로 활성화한다. Dynamic API는 NavigationContainer 대신 ObserveNavigationContainer를 사용하며 props/ref 계약을 유지한다. Static API는 ObserveNavigationProvider와 createStaticNavigation으로 만든 navigation에 같은 navigationRef를 연결한다. provider가 모든 screen의 ancestor여야 하며 별도 NavigationContainer를 중복 추가하지 않는다.

Package가 없으면 설정 integration은 no-op이지만 ObserveNavigationContainer/Provider를 실제 렌더하면 오류다. filteredParams는 focused route param을 대상으로 한다. native stack의 focus 시간과 transition이 시각적으로 완전히 끝난 시각을 동일시하지 않는다.

## 조회 시 이름

Event payload는 cold_ttr/warm_ttr/tti지만 CLI route metric은 nav_cold_ttr/nav_warm_ttr/nav_tti다. 원문의 일부 CLI 예시에 prefix가 빠져 있으므로 CLI reference 계약을 따른다.

## 출처

- [Expo Documentation, Expo Router integration](https://docs.expo.dev/eas/observe/integrations/expo-router)
- [Expo Documentation, React Navigation integration](https://docs.expo.dev/eas/observe/integrations/react-navigation)

## 관련 문서

- [[Expo-Observe-Integrations]]

- [[Expo]]
