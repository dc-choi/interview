---
tags: [expo, expo-router, migration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Navigation에서 Expo Router로 이전"]
---

# React Navigation에서 Expo Router로 이전

Expo Router로 이전하면 파일에서 deep link, type과 웹 rendering을 구성한다. custom getPathFromState/getStateFromPath로 임의 state와 URL을 변환하는 앱은 바로 대체하기 어렵다. shared route를 위해서만 사용했다면 Router group/shared route로 옮길 수 있다.

## 화면과 매개변수 준비

각 screen을 독립 파일로 분리하고 TypeScript와 `@/*` path alias를 먼저 구성하면 디렉터리 이동을 추적하기 쉽다. launch URL `/`에 대응하는 main 화면은 index.tsx로 바꾼다. 기존 Navigator는 directory와 _layout.tsx, screen name은 파일명, nested screen instruction은 complete href로 옮긴다. 예를 들어 Account→Settings의 nested navigation은 `/account/settings?user=...`다.

parameter는 URL로 serialize 가능한 top-level 값을 사용한다. callback, Object, Map을 params에 넣던 코드는 destination의 hook/context/data fetch로 옮긴다. URL로 저장될 때 숫자와 boolean의 parsing/validation도 destination에서 처리한다. 화면에 전달되던 navigation/route props는 useRouter/useLocalSearchParams로 바꾸고 navigator 고유 method만 useNavigation으로 접근한다.

앱 root가 resource loading 중 null을 반환하면 route mount 전에 navigation할 수 없고 SSG HTML 내용도 비게 된다. splash lifecycle을 사용하거나 개별 UI의 loading 상태를 표시한다. Expo Router가 safe area context를 연결하지만 Drawer 등 native gesture-handler 요구는 별도로 확인한다.

## Container 대체 계약

| 기존 container 기능 | Router 접근 |
| --- | --- |
| linking, children | 파일 경로와 current URL에서 생성 |
| initialState | URL 진입과 redirect. crash route로 반복 복원하지 않는다 |
| onStateChange/state listener | pathname/segments/global params와 effect |
| getCurrentRoute | pathname 또는 segments |
| getRootState | useRootNavigationState |
| ref | useNavigationContainerRef |
| theme | expo-router/react-navigation의 ThemeProvider |
| documentTitle | expo-router/head의 Head |
| fallback/onReady splash | Router SplashScreen wrapper와 mounted route lifecycle |
| onUnhandledAction | dynamic route와 +not-found |
| independent container | Router가 관리하는 단일 tree와 호환되지 않는다 |

가이드의 getCurrentOptions→useLocalSearchParams 항목은 동등한 screen option API가 아니다. query parameter를 읽는 용도만 대체하며 title/header 같은 options는 navigator API로 관리한다. resetRoot를 router.replace('/')로 바꾸면 current entry만 교체하는 것이므로 전체 이력 reset과 의미가 다르다. 전체 reset이 꼭 필요하면 useNavigation과 CommonActions.reset의 state 계약을 확인한다.

Link의 to는 href로 옮기고 custom useLinkProps wrapper는 Link asChild로 줄일 수 있다. 공유 screen은 group/shared route 또는 re-export file로 배치한다. 특정 tab을 선택하려면 `/(home)/settings` 같은 qualified href를 사용한다. ThemeProvider는 root나 subtree에 둘 수 있고 Header/HeaderBackButton 등 Elements는 별도 package 대신 expo-router/react-navigation에서 가져온다.

## SDK55에서56 import 이전

SDK56 이후 application code의 외부 @react-navigation/* import를 matching expo-router entry로 바꾼다. 이 단계는 기본적으로 module specifier 변경이며 runtime API 자체의 재설계와 구분한다.

| 기존 package | 대상 entry |
| --- | --- |
| native/core/elements/routers | expo-router/react-navigation |
| stack | expo-router/js-stack |
| bottom-tabs | expo-router/js-tabs |
| material-top-tabs | expo-router/js-top-tabs |
| native-stack | 직접 대응 없음. Router Stack layout 사용 |
| drawer | 직접 대응 없음. Router Drawer layout 사용 |

`npx expo-codemod sdk-56-expo-router-react-navigation-replace src`는 지정 directory/glob의 import를 바꾸는 도구다. 원문 명령을 이 문서 작업에서 실행하지 않았다. Expo CLI의 node_modules import rewrite는 third-party library를 위한 임시 shim이며 application code에는 적용하지 않는다. `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1`은 shim과 application import 오류 검사를 함께 끄므로 이전을 끝낸 증거로 사용하지 않는다.

SDK57 custom navigator는 unstable_createStandardRouterNavigator/unstable_integrateWithRouter를 사용하고 stable 이름과 새로운 navigation state는 SDK58의 별도 변경이다. 화면 추적, platform extension과 deep link anchor는 해당 상세 문서와 연결한다.

## 출처

- [Expo Documentation, Migrate from React Navigation](https://docs.expo.dev/router/migrate/from-react-navigation)
- [Expo Documentation, Migrate Expo Router from SDK 55 to SDK 56](https://docs.expo.dev/router/migrate/sdk-55-to-56)

## 관련 문서

- [[Expo-Router-Layouts]]
- [[Expo-Router-API]]
- [[Expo-Router-Diagnostics]]
- [[Expo-Router-Migration-SDK58]]
