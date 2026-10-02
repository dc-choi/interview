---
tags: [expo, expo-router, navigation]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 인증과 보호 경로"]
---

# Expo Router 인증과 보호 경로

## session과 loading

인증 session을 Context/store에서 제공하고 복원 중인 loading 상태와 로그인하지 않은 상태를 구분한다. 네이티브 저장 예시는 `expo-secure-store`, 웹 예시는 localStorage를 쓰지만 실제 인증, token 검증과 서버 권한 판정은 앱이 구현해야 한다. 예시의 `setSession('xxx')`는 mock sign-in이며 인증 구현이 아니다.

초기 session 복원 동안 splash를 유지하면 잘못된 로그인 화면이 먼저 나타나는 것을 줄일 수 있다. SessionProvider 안에서 splash controller와 navigator를 렌더링하고 실제 sign-in 성공 후 이동한다. 저장 실패와 token 만료를 session 존재만으로 통과시키지 않는다.

## Protected의 계약

SDK 53부터 client 탐색을 제한하는 `Stack.Protected`, `Tabs.Protected`, `Drawer.Protected`를 사용할 수 있다. `guard`가 false인 screen으로 이동하거나 현재 screen의 guard가 false로 바뀌면 anchor 또는 첫 사용 가능한 screen으로 이동한다. true에서 false가 되면 해당 screen의 history entry가 제거된다.

```tsx
import { Stack } from 'expo-router';
function RootNavigator() {
  const { session, isAdmin } = useSession();
  return <Stack>
    <Stack.Protected guard={!!session}>
      <Stack.Screen name="(app)" />
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack.Protected>
    <Stack.Protected guard={!session}>
      <Stack.Screen name="sign-in" />
    </Stack.Protected>
  </Stack>;
}
```

중첩 guard는 모두 통과해야 안쪽 화면에 접근한다. screen은 하나의 활성 group에 한 번만 선언하고 같은 name을 protected 안팎에서 중복 선언하지 않는다. 미선언 route는 기본 포함되므로 보호하려는 screen을 실제 guard 안에 넣었는지 확인한다.

Protected는 서버 인증이 아니다. static generation에서는 protected route HTML을 만들지 않지만 URL과 JavaScript에 접근 가능한 경계를 서버가 검증해야 한다. `redirectTo`와 stable custom navigator의 `.Protected` 설명은 SDK 58 이후 기능이며 SDK 57 API로 가정하지 않는다.

## 이전 Redirect 패턴

SDK 52 이전 안내는 nested `(app)/_layout.tsx`에서 loading을 표시하고 session이 없으면 `<Redirect href="/sign-in" />`, 있으면 Stack을 반환한다. root는 Provider와 Slot을 먼저 mount해야 한다. root가 loading UI만 반환하면서 effect에서 router를 호출하면 Root Layout mount 전 탐색 오류가 생긴다. 조건과 redirect를 아래 group으로 옮긴다.

웹 정적 render는 Node에 사용자 session이 없어 로그인 redirect에서 종료할 수 있다. 현재 기준에서는 Protected를 우선 검토하고 이전 Redirect 패턴을 별도 migration 맥락으로 유지한다.

## 로그인 modal

로그인을 배경 route 위의 modal로 띄우면 기존 deep link 맥락을 일부 유지할 수 있다. modal Stack의 anchor를 `(root)`로 두되 배경 route가 비인증 상태에서 mount될 수 있으므로 데이터 로딩도 그 상태를 처리해야 한다. 단순 읽기 UI와 제한된 동작만 필요하면 별도 route 대신 RN Modal을 쓸 수 있다.

인증 guide 말미의 웹에 middleware/serving이 없다는 문장은 최신 server middleware/SSR guide와 충돌한다. 서버 기능의 지원은 [[Expo-Router-Middleware]]와 [[Expo-Router-Server-Rendering]]의 버전, 실험 상태를 기준으로 판단한다.

## 출처

- [Expo Documentation, Authentication in Expo Router](https://docs.expo.dev/router/advanced/authentication)
- [Expo Documentation, Authentication in Expo Router using redirects](https://docs.expo.dev/router/advanced/authentication-rewrites)
- [Expo Documentation, Protected routes](https://docs.expo.dev/router/advanced/protected)

## 관련 문서

- [[Expo-Router-Layouts]]
- [[Expo-Router-Middleware]]
