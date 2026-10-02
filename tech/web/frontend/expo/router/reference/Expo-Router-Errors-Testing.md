---
tags: [expo, expo-router, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Router 오류 경계와 통합 테스트"]
---

# Expo Router 오류 경계와 통합 테스트

## unmatched와 오류

+not-found.tsx에서 Unmatched를 default export하거나 홈 Link가 있는 custom UI를 반환한다. native의 missing route는 서버 HTTP 404 자체가 아니지만 웹 not-found response는 404다. 웹 우선순위는 public static file → 일반/dynamic route → API route → not-found다.

route의 `ErrorBoundary({ error, retry })` named export는 해당 screen error를 처리하고 없으면 가장 가까운 parent로 올라간다. screen error boundary는 header/tab bar navigator UI를 유지할 수 있다. 현재 guide의 적용 우선순위는 route ErrorBoundary → navigator unstable_screenErrorBoundary → layout unstable_settings.screenErrorBoundary다. nested layout은 설정을 상속하며 null로 중단한다. SDK 57에서 사용할 때는 해당 package가 이 새 guide의 option을 노출하는지도 확인한다.

custom `SuspenseFallback({ route, params })`는 SDK 56 이후 layout export이며 가까운 parent의 fallback이 우선한다. asyncRoutes와는 동시 사용하지 못한다. loader/Suspense 오류, navigation missing route와 handler HTTP error는 서로 다른 경계다.

## 테스트 설정

`expo-router/testing-library`는 React Native Testing Library 위에 in-memory file router를 만든다. jest-expo와 @testing-library/react-native 설정이 필요하다. test 파일은 app/src/app 밖에 둔다.

```tsx
import { renderRouter, screen } from 'expo-router/testing-library';
renderRouter({ index: Home, 'users/[id]': User }, { initialUrl: '/users/123' });
expect(screen).toHavePathname('/users/123');
expect(screen).useLocalSearchParams({ id: '123' });
```

inline key에는 앞 `/`나 `./`, extension을 쓰지 않는다. `renderRouter(['index', 'users/[id]'])`는 null route component를 만드는 navigation-only fixture다. 문자열 fixture path는 test file 기준 실제 directory를 읽고 `{ appDir, overrides }`는 일부 route만 inline으로 바꾼다. return은 render와 같은 query API이고 screen에도 연결된다. RenderOptions에 initialUrl을 더해 cold deep link를 재현한다.

| matcher | 검사값 |
| --- | --- |
| `toHavePathname` | usePathname 결과 |
| `toHavePathnameWithParams` | query를 포함한 URL |
| `toHaveSegments` | route 파일 segment, dynamic 표기 유지 |
| `useLocalSearchParams` | current component의 local params |
| `useGlobalSearchParams` | active URL global params |
| `toHaveRouterState` | routes 등 navigation state object |

test fixture가 동작해도 native back gesture, OS tab 표현, actual HTTPS deep link association과 배포 runtime을 검증한 것은 아니다. 이 문서 작업에서는 앱 test를 실행하지 않았다.

## 출처

- [Expo Documentation, Error handling and loading states](https://docs.expo.dev/router/error-handling)
- [Expo Documentation, Testing configuration for Expo Router](https://docs.expo.dev/router/reference/testing)

## 관련 문서

- [[Expo-Router]]
