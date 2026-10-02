---
tags: [expo, react-native, app]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router의 Stack과 탭 구성 예제"]
---

# Expo Router의 Stack과 탭 구성 예제

## File route 계약

`src/app`에는 route와 layout만 둔다. route는 `.js/.jsx/.ts/.tsx`의 default React component export이며 `index`는 부모 경로와 매칭한다. `src/app/index.tsx`는 `/`, `about.tsx`는 `/about`이다. `_layout.tsx`는 공통 navigator/header 등의 구성이다.

```tsx
import { Stack } from 'expo-router';

export default function Layout() {
  return <Stack>
    <Stack.Screen name="index" options={{ title: 'Home' }} />
    <Stack.Screen name="about" options={{ title: 'About' }} />
  </Stack>;
}
```

Stack은 current screen 위에 다음 route를 쌓아 native animation/back navigation을 제공한다. platform에 따라 transition 방향과 gesture가 다를 수 있다. screen option은 route file의 존재를 대신 생성하지 않는다.

## Link와 not-found

```tsx
import { Link } from 'expo-router';

export const AboutLink = () => <Link href="/about" style={{ color: '#fff', fontSize: 20 }}>소개 화면</Link>;
```

기본 Link는 Text를 렌더링하고 href로 mobile/web 경로를 통합한다. `+not-found.tsx`에는 fallback component와 필요하면 `<Stack.Screen options={{title: 'Not Found'}} />`, `/`로 돌아가는 Link를 둔다. web에서 `http://localhost:8081/123` 같은 미등록 URL로 확인한다. tutorial의 `http:localhost` 표기는 정상 URL 예제로 복제하지 않는다.

## Route group과 tabs

```text
src/app/_layout.tsx
src/app/+not-found.tsx
src/app/(tabs)/_layout.tsx
src/app/(tabs)/index.tsx
src/app/(tabs)/about.tsx
```

`(tabs)`는 routes를 묶는 group이며 URL segment를 추가하지 않는다. root Stack에서 `(tabs)`의 `headerShown: false`를 설정하고 group layout에서 Tabs를 렌더링해 header 중복을 피한다. not-found는 root Stack에서 nested navigation 위에 표시한다.

```tsx
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  return <Tabs screenOptions={{
    tabBarActiveTintColor: '#ffd33d',
    headerStyle: { backgroundColor: '#25292e' },
    headerShadowVisible: false,
    headerTintColor: '#fff',
    tabBarStyle: { backgroundColor: '#25292e' },
  }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) =>
      <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} /> }} />
    <Tabs.Screen name="about" options={{ title: 'About' }} />
  </Tabs>;
}
```

아이콘 package가 없으면 `npx expo install @expo/vector-icons`로 SDK에 맞춘다. tabBarIcon은 focused/color에 맞춰 icon을 반환한다. active tint는 label과 icon, headerTintColor는 header text/icon에 적용된다. fixed 색 예제는 dark UI이며 system theme 요구가 있으면 theme tokens로 연결한다.

## 출처

- [Expo Documentation, Add navigation](https://docs.expo.dev/tutorial/add-navigation)

## 관련 문서

- [[Expo-Learn-App-Screen]]
- [[Expo-Home-Tools-Navigation]]
