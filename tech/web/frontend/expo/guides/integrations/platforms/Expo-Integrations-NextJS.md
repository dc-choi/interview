---
tags: [expo, expo-integrations, platforms]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo component와 Next.js 웹 integration"]
---

# Expo component와 Next.js 웹 integration

Next.js integration은 Expo의 공식 universal workflow가 아니다. mobile은 Expo CLI, web은 Next CLI로 시작하며 Next SSR은 웹 전용이다. @expo/next-adapter는 RN web alias/config를 연결하고 universal navigation을 자동 통합하는 Expo Router의 대체가 아니다.

## Adapter와 bundling

with-nextjs template 또는 expo/next/@expo/next-adapter를 설치한다. withExpo(nextConfig)와 transpilePackages에 react-native/react-native-web/expo 및 failing RN package를 넣어 browser가 못 읽는 source를 transpile한다. react-native는 alias 때문에 실제 native package가 web에서 실행되지 않더라도 list에 넣는다.

```js
const { withExpo } = require('@expo/next-adapter');
module.exports = withExpo({
  transpilePackages:['react-native','react-native-web','expo'],
});
```

원문에는 root transpilePackages와 experimental.transpilePackages 두 위치가 혼재한다. Next13.1+ 계약은 root를 사용하며 current Next version의 supported option을 확인한다. forceSwcTransforms/swcMinify와 babel-loader caller 이름은 오래된 Next config 예제라 최신 option으로 보장하지 않는다. 원문 SWC 권장 방향은 native Babel preset을 분리하고 web에서 native transform을 잘못 적용하지 않는다는 뜻이다.

Babel 방식을 쓴다면 caller.name에 따라 next/babel을 web에만 적용한다. next/babel을 native에 항상 넣으면 mobile bundling이 깨질 수 있다. Cannot use import statement 오류는 해당 package의 transpilation 누락부터 확인한다.

## RN Web styling과 deployment

Pages Router의 _document는 AppRegistry.registerComponent/getApplication().getStyleElement로 RN Web stylesheet를 수집해 HTML head에 넣는다. html/body/#__next 높이와 flex/scroll/text reset을 구성하고 _app은 viewport metadata를 넣는다. body scrolling 정책은 native parity와 mobile web usability의 선택이다.

Expo adapter source는 experimental app directory 미지원이라고 명시한다. 이것을 Next.js 자체의 App Router 미지원으로 일반화하지 않는다. App Router로 도입하려면 adapter 현재 지원과 별 integration을 확인한다. web build script는 next build, hosting은 Next artifact를 배포하며 Expo export의 dist로 대체하지 않는다. native file routing은 Router를 따로 사용한다. 이 문서는 Next build나 Vercel deployment를 실행하지 않았다.

## 출처

- [Expo Documentation, Using Next.js with Expo for web](https://docs.expo.dev/guides/using-nextjs)

## 관련 문서

- [[Expo-Router-Migration-Webpack]]
- [[Expo-Router-Server-Rendering]]
- [[Expo-Integrations-TypeScript-Lint]]
