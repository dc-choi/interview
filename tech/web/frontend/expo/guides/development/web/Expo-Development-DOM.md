---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo DOM component의 bridge와 native 경계"]
---

# Expo DOM component의 bridge와 native 경계

## use dom과 실행 엔진

파일 첫 줄의 `'use dom'`은 React DOM 코드를 native 앱의 WebView에서 실행하도록 bundler가 proxy로 바꾸는 경계다. web이나 다른 DOM component 내부에서는 보통 React component로 렌더링하며 iframe을 만들지 않고 `dom` prop도 무시한다. native에서는 별도 JS engine이므로 전역 state/context를 native tree와 공유하지 않는다.

SDK56 이후 기본 엔진은 `@expo/dom-webview`이며 추가 설치가 필요 없다. `react-native-webview`로 바꾸려면 설치하고 `dom={{useExpoDOMWebView:false}}`를 전달한다. SDK55 이전 설치 지침을 현재 SDK57의 필수 조건으로 적용하지 않는다.

Expo CLI/Metro config가 필요하며 Router/web을 이미 쓰지 않는 앱은 `@expo/metro-runtime`, `react-dom`, `react-native-web`도 구성한다.

```tsx
'use dom';
import type { DOMProps } from 'expo/dom';

export default function Article({
  text, onSave,
}: { text: string; onSave: (text: string) => Promise<void>; dom?: DOMProps }) {
  return <button onClick={() => onSave(text)}>{text}</button>;
}
```

## props와 native actions

문자열, 숫자, boolean, null/undefined, array/object 등 직렬화 가능한 props는 비동기 bridge로 전달된다. 변경은 동기 참조 공유가 아니며 DOM React root를 다시 렌더링한다. 함수는 top-level native action prop으로만 보낼 수 있다. nested function prop과 비직렬화 인자는 지원하지 않는다.

native action은 비동기로 실행되고 직렬화 가능한 결과를 반환할 수 있다. DOM이 device API를 직접 import하는 대신 native action에서 호출하고 props로 결과를 전달한다. native module을 DOM engine에 자동 공유하는 최적화는 구현돼 있지 않다.

## ref와 feature detection

`useDOMImperativeHandle(ref, factory, deps)`로 native에서 DOM input focus 같은 imperative action을 호출할 수 있다. React19/SDK53 이후에는 ref를 prop으로 받는다. `DOMImperativeFactory`를 확장해 handle 타입을 선언한다. ref는 데이터 동기화의 기본 통로가 아니라 제한된 imperative 제어에 쓴다.

`IS_DOM`은 DOM engine 여부를 나타낸다. DOM 안의 `process.env.EXPO_OS`는 web이며 상위 native OS는 `process.env.EXPO_DOM_HOST_OS`의 ios/android로 확인한다. 일반 web에서는 host OS가 undefined다.

## navigation과 layout

Router `Link`/`useRouter`로 navigation을 보낼 수 있다. `useLocalSearchParams`, `useGlobalSearchParams`, `usePathname`, `useSegments`, `useRootNavigation`, `useRootNavigationState`와 동기 `canGoBack/canDismiss`는 자동 지원하지 않으므로 native에서 읽어 prop/action으로 전달한다.

DOM 안의 일반 anchor로 앱 내부 이동을 처리하면 WebView origin이 바뀌고 복귀가 어려워질 수 있다. 외부 사이트는 WebBrowser로 연다. DOM component는 native children을 렌더링할 수 없어 `_layout` 자체로 사용할 수 없다. native layout 안에서 header/background로 렌더링하는 것은 가능하다.

## 크기와 asset

`dom={{matchContents:true}}`는 콘텐츠 측정에 따라 native view를 맞춘다. 고정 크기는 `dom.style`로 지정한다. `ResizeObserver`의 body 크기를 native action에 보고하고 native state/containerStyle에 적용할 때 동일 크기 변경을 걸러 render loop를 줄인다. observer는 unmount 시 disconnect한다.

`public/` asset은 native binary에 복사되며 URL에는 `process.env.EXPO_BASE_URL`을 붙인다. 이 경로는 EAS Update에 포함되지 않으므로 OTA asset은 `require()`를 사용한다. Fast Refresh, CSS, terminal log forwarding과 Safari/Chrome WebView inspector를 사용할 수 있다.

## 성능과 기능 한계

DOM은 embedded SPA이며 SSR/SSG가 없다. native Hermes bytecode보다 일반 JS parsing/start 비용이 크고 engine 간 JSON transport가 필요하다. children, native view 중첩, instance 간 자동 state 공유와 동기 function return은 지원하지 않는다. nested URL과 Router state의 완전한 reconciliation도 기대하지 않는다.

rich text/Markdown, WebGL과 기존 web 기능의 점진 이관에 적합하지만 low-power 기기의 web frame throttling을 고려한다. 일반 화면은 native primitives를 우선 검토한다.

RSC 프로젝트에서 `'use dom'`은 `'use client'`와 같은 경계를 가지며 native runtime용 RSC payload를 DOM에서 올바르게 hydrate할 수 없다. DOM production의 Server Functions도 현재 지원 한계가 있다.

secure-context API는 release의 file scheme와 debug HTTPS tunnel 조건을 확인한다. HTTP dev server에서 unavailable인 Clipboard 등을 기능 미지원으로 성급히 판단하지 않는다.

## 출처

- [Expo Documentation, Using React DOM in Expo native apps](https://docs.expo.dev/guides/dom-components)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
