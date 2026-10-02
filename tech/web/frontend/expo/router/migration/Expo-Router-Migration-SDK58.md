---
tags: [expo, expo-router, migration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router SDK57에서58로 이전"]
---

# Expo Router SDK57에서58로 이전

이 문서는 SDK58 변경을 설명한다. 이 지식 묶음의 기본 Reference는 SDK57이며 아래 API와 기본값을 SDK57 기능으로 사용하지 않는다. Stack/Link/useRouter 중심 앱보다 raw state, custom router와 React Navigation compatibility에 의존한 앱에서 변경이 크다.

## 렌더링과 화면 선언 변경

SDK58 output server는 export 때 HTML을 미리 만들지 않고 request마다 SSR한다. SDK57의 prerendered HTML+API server 동작을 유지하려면 output static과 Router plugin apiRoutes=true를 함께 쓰며 API hosting server는 여전히 필요하다. 웹 asyncRoutes는 development/production 모두 기본 true가 되고 native production은 동기 로딩을 유지한다. custom SuspenseFallback이 필요하면 asyncRoutes.web=false를 명시하고 cache를 clear한다.

컴포넌트에서는 렌더링한 Router root에 연결된 useRouter를 사용한다. module router는 첫 render 이전에 throw하고 여러 root를 구분하지 못한다. useNavigation은 navigator options/events/dispatch 용도로 유지한다. screen/params/initial nested instruction은 이제 일반 user parameter라 complete href를 사용한다. ancestor params도 자동 상속되지 않아 destination href에 포함한다.

initialRouteName navigator prop은 제거되고 layout unstable_settings.anchor로 deep-link back destination을 구성한다. anchor는 launch 화면을 정하지 않는다. `/`는 index file로 결정한다. imperative 진입에 anchor를 넣으려면 withAnchor=true를 전달한다. Screen redirect는 route의 Redirect로, initialParams는 useLocalSearchParams의 기본값으로 옮긴다.

JS tabs/top tabs/drawer/headless/native tabs UI는 layout에 선언한 화면만 보여준다. 파일 route 자체는 계속 등록되므로 `href:null`과 UI 누락이 접근 권한 검사는 아니다. Protected는 실패한 route를 tree에서 제거하지 않고 redirect로 렌더링한다. redirectTo를 생략하면 accessible anchor/initial 또는 첫 accessible route로 간다. experimental web modal 구현은 제거되고 custom navigator로 overlay를 만든다.

freezeOnBlur는 효과가 없다. activityEnabled=true는 stack에서 두 화면 위로 쌓였을 때 content를 숨기고 tabs/drawer는 focus를 잃을 때 숨긴다. stack의 positive number는 threshold를 바꾼다. NavigationAwareActivity.hideWhenNestedAtLevel 기본2는 일부 content에 같은 기준을 적용한다. 상태는 유지하되 effect cleanup을 수행한다.

expo-symbols(Android md tab icon), @expo/ui(Android Stack.Toolbar)는 optional peer dependency다. 해당 native 기능을 쓸 때만 설치하고 development binary를 rebuild한다. usePreventRemove의 exact action 재개는 boolean=false와 repeat(), 다른 목적지 이동은 boolean=false와 반환 disablePrevention() 후 navigate다. true가 남으면 warning과 re-enable 제한이 있다.

## Dispatch와 removal 이벤트

navigation.dispatch와 helper action은 React commit 뒤 queue에서 실행한다. dispatch function은 없어져 state를 읽고 action object를 계산해 dispatch한다. 두 단계는 atomic하지 않으며 즉시 적용이 꼭 필요한 integration만 dispatchSync(action)을 사용한다.

navigationKey는 Screen/Group에서 제거되며 직접 대응 API가 없다. route/layout identity, Protected와 href로 원래 목적을 다시 표현한다. beforeRemove/__unsafe_action__는 removed/removePrevented로 바뀐다. removed는 route unmount 뒤 발생하므로 listener cleanup은 queueMicrotask(unsubscribe)로 지연해야 관찰할 수 있다. 이미 사라진 화면 state를 업데이트하지 않는다. useNavigation은 navigator 밖에서 throw하므로 ExpoRoot wrapper 바깥 hook을 route/layout 안으로 옮긴다.

## Complete state와 preload 구조

| SDK57 상태 | SDK58 |
| --- | --- |
| stack.preloadedRoutes | focused index 이후 state.routes entry |
| tab.preloadedRouteKeys | unfocused route의 isPreloaded=true. lazy route는 아직 routes에 없을 수 있다 |
| tab routes iteration | 선언 순서는 routeNames를 순회하고 route 존재를 확인 |
| drawer.default | useDrawerStatus. deprecated getDrawerStatusFromState는 두 번째 default status 필요 |
| state.type, history 강제 가정 | custom router type과 tab/drawer history가 optional |

persisted initial state는 모든 nested level에 state key/route key/routeKeySeq/routeNames/index/stale=false를 갖춰야 한다. incomplete state는 throw한다. CommonActions.reset도 stale=false를 요구하지만 생략한 route key를 생성하고 routeKeySeq를 current state에서 채울 수 있다. reset에서 ...state로 identity를 보존한다. custom extension은 routeKeySeq를 직접 증가시키지 않고 nextKey를 사용한다.

## Custom router와 navigator

getInitialState/getRehydratedState는 제거되고 Router가 complete state를 만든다. getStateForRouteNamesChange 대신 ROUTE_NAMES_CHANGED action을 처리한다. RouterConfigOptions.routeParamList는 제거되고 default parameter는 route code에 둔다. RouterActionOptions는 RouterConfigOptions로 바꾼다.

extendRouter의 getStateForAction은 `{ state: nextState, affectedRouteKey }`를 반환한다. affectedRouteKey는 그 action이 실제 바꾼 route이며 항상 focused route는 아니다. 처리 불가능은 null, 미처리 action은 baseRouter.getStateForAction에 위임한다. extendRouterActions reducer는 undefined로 base에 위임할 수 있다. nextKey와 attachRouteState를 써서 deterministic key와 nested state를 연결한다.

앱 navigator는 createStandardRouterNavigator, reusable library는 standard-navigation의 createStandardNavigator 후 integrateWithRouter를 사용한다. withLayoutContext는 기존 integration에서 유지되나 세 번째 useOnlyUserDefinedScreens는 제거된다. descriptor.routeSource로 layout 선언 여부를 구분하고 declared route의 key가 undefined일 수 있음을 처리한다.

createStackNavigator는 expo-router/js-stack에서 제거되지만 expo-router/native-stack의 createNativeStackNavigator는 남는다. createProps helper는 custom stack/tab의 createBaseStackProps/createBaseTabProps, JS stack/tab/top-tab의 createJSStackProps/createJSTabsProps/createJSTopTabsProps, native stack/tab의 createNativeStackProps/createNativeTabsProps다. base/native stack은 expo-router, 나머지는 matching feature entry에서 import한다.

## Compatibility export 제거

BaseNavigationContainer/NavigationContainer는 Router 또는 ExpoRoot 관리로 옮긴다. root options/documentTitle 관련 API는 Head/title로, onStateChange는 URL hook 또는 ref state event로 바꾼다. React Navigation Link/useLinkProps는 Router Link href로, navigateDeprecated/navigationInChildEnabled/NavigatorScreenParams/getActionFromState는 complete href로 바꾼다.

resetRoot는 replace 또는 complete-state reset으로 바꾼다. PreventRemoveContext/provider는 usePreventRemove로, static navigation API는 file layout로 옮긴다. LinkingOptions.enabled와 UNSTABLE_routeNamesChangeBehavior/useOnlyUserDefinedScreens를 제거한다. UNSTABLE_UnhandledLinkingContext에는 app-level replacement가 없다.

NavigationIndependentTree/useNavigationIndependentTree의 격리된 embedded tree가 필요하면 외부 @react-navigation/native NavigationContainer를 별도로 사용한다. 이는 Router-managed route tree를 분리하는 일반 패턴이 아니라 isolated embed 예외이며 SDK56 application import restriction과 실제 integration을 함께 검토한다. 마이그레이션 guide와 latest SDK57 reference의 차이를 자동 검증하거나 앱 동작을 시험한 것은 아니다.

## 출처

- [Expo Documentation, Migrate Expo Router from SDK 57 to SDK 58](https://docs.expo.dev/router/migrate/sdk-57-to-58)

## 관련 문서

- [[Expo-Router-API]]
- [[Expo-Router-Custom-Navigators]]
- [[Expo-Router-Removal-Prevention]]
- [[Expo-Router-Transitions-Activity]]
