---
tags: [expo, expo-router, basics]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 레이아웃과 중첩 탐색"]
---

# Expo Router 레이아웃과 중첩 탐색

`_layout.tsx`는 같은 디렉터리의 화면들이 함께 유지되는 방식과 헤더, 탭 등의 공통 UI를 정의한다. route 컴포넌트를 직접 import해 Screen에 주입하지 않는다. 파일이 이미 화면을 등록하고 `Screen name`은 옵션을 연결한다.

```tsx
import { Stack } from 'expo-router';
export const unstable_settings = { anchor: 'index' };
export default function Layout() {
  return <Stack>
    <Stack.Screen name="[productId]" options={{ headerShown: false }} />
  </Stack>;
}
```

Stack은 push된 이전 화면을 유지한다. 디렉터리가 URL 정리만 위한 것이라면 그 안에 Stack을 추가할 필요가 없다. Tabs는 직접 자식 화면을 탭으로 사용하고 `Tabs.Screen` 선언 순서, title과 icon으로 탭바를 조정한다. `Slot`은 현재 자식 화면의 자리다. navigator 없이 공통 Header/Slot/Footer를 구성할 때 사용한다.

## 중첩 navigator의 목적

탭마다 독립 history가 필요하면 탭 내부에 Stack을 둔다. 루트 Stack 안에 탭 그룹을 두면 detail과 modal을 탭바 위로 띄울 수 있다. 같은 구조라도 detail 위치에 따라 뒤로가기 목적지가 다르다.

- Settings 탭에서 Feed 탭 내부 `/feed/123`을 열면 탭이 Feed로 바뀌고 back은 Feed의 stack을 pop한다.
- Settings로 돌아와야 한다면 detail route를 탭 그룹 밖의 루트 Stack에 둔다. 루트에 push된 detail을 닫으면 원래 선택된 탭이 남는다.
- 네이티브 탭은 mount 때 모든 탭을 로드하므로 각 탭 stack의 첫 화면이 이미 있다. 이 경우 detail 아래의 첫 화면 존재를 `withAnchor`만의 효과로 해석하지 않는다.

중첩 목적지는 React Navigation의 `screen/params` 중첩 객체 대신 `router.push('/root/settings/media')`로 주소를 지정한다. 플랫폼별 AppTabs 컴포넌트는 `.native.tsx`에서 NativeTabs, 일반 `.tsx`에서 `expo-router/ui` 탭으로 바꿀 수 있다.

## deep link의 anchor

`unstable_settings = { anchor: 'index' }`는 cold deep link에 detail보다 먼저 둘 화면을 지정한다. 확장자를 제외한 실제 route name이어야 한다. 일반 앱 내부 탐색에서는 anchor가 자동 삽입되지 않으므로 `<Link withAnchor>` 또는 `router.push(href, { withAnchor: true })`를 사용한다. `initialRouteName`은 deprecated되어 anchor로 대체한다.

`unstable_settings`는 개발용 async routes와 함께 동작하지 않는다고 문서화되어 있다. 그룹 배열에는 기본 anchor와 `search: { anchor: 'search' }`처럼 그룹별 anchor를 지정한다.

## 같은 URL을 공유하는 route

`(home)/[user].tsx`와 `(search)/[user].tsx`는 모두 `/123`일 수 있다. 앱 내부에서는 현재 group을 유지하지만 bookmark, refresh와 외부 deep link에는 현재 group이 없어 알파벳순 첫 match가 선택된다. 반드시 Search에 열려야 하면 `/(search)/123`처럼 group을 지정한다.

`(home,search)/[user].tsx` 배열 표기는 자식을 두 group에 메모리상 복제한다. layout의 `segment` prop으로 현재 group을 구분할 수 있다. 현재 navigator의 group만 제공하고 중첩 group match에는 마지막 group segment를 사용한다. 여러 anchor에 기본값이 없으면 첫 group의 anchor가 기본이 된다.

공유 route를 사용자 role별 다른 화면 선택으로 쓰면 cold URL이 role을 표현하지 못한다. 화면은 한 번 선언하고 접근은 Protected로 제어한다.

## 출처

- [Expo Documentation, Navigation layouts in Expo Router](https://docs.expo.dev/router/basics/navigation-layouts)
- [Expo Documentation, Common navigation patterns in Expo Router](https://docs.expo.dev/router/basics/common-navigation-patterns)
- [Expo Documentation, Nesting navigators](https://docs.expo.dev/router/advanced/nesting-navigators)
- [Expo Documentation, Router settings](https://docs.expo.dev/router/advanced/router-settings)
- [Expo Documentation, Shared routes](https://docs.expo.dev/router/advanced/shared-routes)

## 관련 문서

- [[Expo-Router-Architecture]]
- [[Expo-Router-Stack]]
- [[Expo-Router-Authentication]]
