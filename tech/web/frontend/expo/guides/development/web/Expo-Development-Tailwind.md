---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Metro Tailwind의 web 설정"]
---

# Expo Metro Tailwind의 web 설정

## 지원 범위

표준 Tailwind CSS는 web 대상이다. React Native Web에는 CSS class를 전달할 수 있지만 Android/iOS native style을 자동 생성하는 기능은 아니다. native universal styling은 NativeWind/Uniwind 같은 별도 compatibility layer를 검토한다. DOM component로 web CSS를 native WebView에 넣는 방식도 가능하지만 native view 변환과 다르다.

app config의 `web.bundler`는 metro여야 한다.

## Tailwind v3

```sh
npx expo install tailwindcss@3 postcss autoprefixer --dev
npx tailwindcss init -p
```

`tailwind.config.js`의 content에 `src/app`, components 등 실제 소스 glob을 넣는다. 누락한 경로의 class는 생성하지 못할 수 있다. global.css는 `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`를 포함한다.

## Tailwind v4

```sh
npx expo install tailwindcss @tailwindcss/postcss postcss --dev
```

```js
// postcss.config.mjs
export default { plugins: { '@tailwindcss/postcss': {} } };
```

global.css는 `@import 'tailwindcss';`를 사용한다. v3의 config/init 절차와 v4 PostCSS plugin을 무작정 혼합하지 않는다.

## import와 적용

Router는 root `src/app/_layout.tsx`, 일반 entry는 index.js에서 global.css를 import한다. nested layout에서 처음 import하면 node_modules CSS와 custom CSS의 순서가 어긋날 수 있다. 각각 독립 engine인 DOM component는 각 `'use dom'` module에서 global.css를 import한다.

DOM element는 `className`을 사용한다. RNW 요소는 `style={{ $$css:true, _: 'rounded-xl bg-slate-100' }}`로 CSS class를 전달할 수 있다. 이 표현을 native inline style로 오해하지 않는다.

## Metro custom cache

PostCSS를 쓰는 custom cacheStores는 `@expo/metro-config/file-store`의 FileStore를 사용한다. 기본 Metro FileStore로 대체하면 CSS 관련 cache 동작이 달라질 수 있다. `getDefaultConfig`의 CSS support를 끄지 않는다. class 미적용은 content 경로, root import 순서, PostCSS version과 Metro CSS/cache를 나누어 조사한다.

## 출처

- [Expo Documentation, Tailwind CSS](https://docs.expo.dev/guides/tailwind)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
