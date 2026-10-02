---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo universal web 개발과 렌더링"]
---

# Expo universal web 개발과 렌더링

## native와 web의 공통 부분

React Native Web의 `View`, `Text`, `Image` 등은 React DOM primitive를 감싸 native/web의 UI 소스 재사용을 돕는다. web만 만든다면 RNW가 필수는 아니며 `div`, `p` 같은 React DOM을 직접 사용할 수 있다. DOM element는 native renderer에서 그대로 렌더링되지 않으므로 platform-specific module 또는 DOM component 경계를 둔다.

Expo web은 Router의 static rendering으로 SEO용 HTML을 만들거나 SPA로 client rendering할 수 있다. SDK package의 지원은 각각의 platform reference를 확인하며 모든 device API가 server에서도 동작한다고 가정하지 않는다.

## 설치와 실행

```sh
npx expo install react-dom react-native-web @expo/metro-runtime
npx expo start --web
npx expo export --platform web
```

web development는 Metro, Fast Refresh, environment variable과 debugging을 공유한다. production bundle은 platform shaking 등으로 target별 코드를 제거한다.

기존 React Native 앱은 Expo Modules를 먼저 설치하면 SDK까지 연결된다. web target만 필요하면 호환 `expo`와 web dependencies를 설치하고 entry를 `registerRootComponent(App)`로 변경할 수 있지만 이것만으로 SDK native 통합이 완료되지는 않는다.

## 렌더링/배포 결정

화면 URL은 Expo Router, indexed HTML은 static rendering, full-stack/API route는 server output과 hosting 계약을 함께 검토한다. 생성 파일은 `dist/`에 export하고 호스트의 URL rewrite, asset base path와 HTTP header를 맞춘다. browser preview 성공과 production export/host 성공은 별도로 확인한다.

## 출처

- [Expo Documentation, Develop websites with Expo](https://docs.expo.dev/workflow/web)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
