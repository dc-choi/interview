---
tags: [expo, expo-router, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router hook과 navigator 이벤트"]
---

# Expo Router hook과 navigator 이벤트

hook은 현재 route context에서 URL, focus와 navigator를 읽는다. 화면 props로 navigation/route를 전달받던 패턴 대신 필요한 hook을 호출한다. SDK57 API 계약이며 SDK58의 internal state 변경과 useNavigation 범위 강화는 마이그레이션 문서로 구분한다.

## URL과 current route

| hook | 반환과 용도 |
| --- | --- |
| `usePathname()` | query 없는 normalized path. dynamic `[id]`를 실제 value로 치환 |
| `useSegments<T>()` | 파일 segment 배열, group과 `[id]` 표기를 유지. tuple union generic으로 가능한 shape를 좁힌다 |
| `useLocalSearchParams<T>()` | 현재 component의 route와 일치하는 params |
| `useGlobalSearchParams<T>()` | active URL params. background 화면도 변화에 반응 |
| `useCurrentRouteInfo()` | UrlObject 또는 undefined |
| `useRoute()` | 현재 navigator route object |
| `useRoutePath()` | linking config에서 만든 path 또는 undefined |
| `useSitemap()` | recursive SitemapType 또는 null |

SitemapType은 children/contextKey/filename/href와 isGenerated/isInitial/isInternal 표식을 갖는다. debug filename과 public URL이 같은 값이라고 가정하지 않는다. URL parameter 값의 의미, catch-all array와 reserved name은 [[Expo-Router-Navigation]]을 따른다.

## Focus와 lifecycle

`useIsFocused()`는 화면 focus boolean이다. `useFocusEffect(callback)`는 focus에서 effect를 실행하고 blur와 unmount에서 cleanup한다. React.useCallback으로 callback을 안정화한다. useEffect처럼 dependency array를 두 번째 인수로 전달하지 않는다.

```tsx
useFocusEffect(useCallback(() => {
  const subscription = subscribeToUpdates();
  return () => subscription.remove();
}, []));
```

`useScrollToTop(ref)`는 tab 재선택 등의 scroll-to-top 동작에 scrollable ref를 연결하고 void를 반환한다. preloaded route의 render가 곧 focused lifecycle 실행은 아니다. `useLoaderData`는 해당 route loader 결과를 읽고 실행 중이면 suspend하거나 실패를 throw한다. `useServerDocumentContext`는 ServerDocumentData(htmlAttributes, bodyAttributes, headNodes, bodyNodes)를 반환한다. 요청/응답 context를 반환하는 API가 아니며 [[Expo-Router-Server-Rendering]]의 HTML 구성에 사용한다. 서버 실행과 브라우저 hydration을 구분한다.

## Navigator 접근

`useNavigation(parent?)`은 현재 또는 지정한 ancestor navigator의 navigation object를 반환한다. parent는 absolute/relative string 또는 HrefObject이며 존재하지 않으면 오류를 던진다. 반환 method는 실제 ancestor 종류에 맞춰 drawer, stack 등의 동작을 쓴다. `useNavigationContainerRef()`는 root ref를 반환하며 mount 전 current가 null일 수 있다. `useRootNavigation`은 deprecated다. `useRootNavigationState()`는 root state를 반환하지만 URL만 필요한 코드는 pathname/segments를 우선한다.

`useTheme`는 ThemeProvider의 theme다. DefaultTheme/DarkTheme의 colors/fonts와 navigation appearance는 component의 custom style 전체를 자동으로 바꾸지 않는다.

## Native stack 이벤트와 raw header item

transitionStart/transitionEnd는 closing boolean을 전달하고 gestureCancel은 취소된 gesture를 관찰한다. sheetDetentChange는 index와 stable을 전달한다. Android stable=false는 drag/settling 중이며 iOS는 항상 true다. 화면이 실제 제거된 것과 animation이 시작된 것을 구분한다.

NativeStackHeaderItem은 button/menu/spacing/custom의 tagged union이다. button은 type=button, onPress와 selected 상태, custom은 React element와 hidesSharedBackground, spacing은 간격 number다. menu는 menu.items와 title/layout(default 또는 palette)/multiselectable을 받는다. changesSelectionAsPrimaryAction은 선택 동작을 primary action으로 처리한다. iOS26 header right item이 넘치면 overflow menu로 접히지만 custom view는 제외된다.

menu action은 type=action, label/onPress, description, destructive/disabled/hidden, discoverabilityLabel, icon, keepsMenuPresented, state(on/off/mixed)를 받는다. submenu는 type=submenu, label/items와 inline/layout/multiselectable/destructive/icon을 받는다. UI compose를 원하는 경우 raw union보다 [[Expo-Router-Stack-Toolbar]]의 JSX API가 읽기 쉽다. native item 구성과 lifecycle hook이 실제 기기 presentation을 검증하지는 않는다.

## 출처

- [Expo Documentation, Router](https://docs.expo.dev/versions/latest/sdk/router)

## 관련 문서

- [[Expo-Router-API]]
- [[Expo-Router-Navigation]]
- [[Expo-Router-Data-Loaders]]
- [[Expo-Router-Stack-Toolbar]]
