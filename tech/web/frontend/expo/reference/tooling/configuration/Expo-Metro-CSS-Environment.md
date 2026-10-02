---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Metro 환경 변수와 CSS"]
---

# Expo Metro 환경 변수와 CSS

## 환경 변수

Expo CLI는 dotenv 파일을 읽고 `EXPO_PUBLIC_` 접두사의 변수를 bundle에 inline한다. 이 값은 앱에서 읽을 수 있으므로 비밀값을 넣지 않는다. `EXPO_NO_DOTENV=1`은 파일 로딩, `EXPO_NO_CLIENT_ENV_VARS=1`은 public 변수 inlining을 각각 끈다. EAS CLI의 환경 변수 처리와 Expo CLI 번들링 과정은 구분한다.

`process.env.EXPO_BASE_URL`처럼 빌드 설정도 정적으로 inline된다. `process.env['EXPO_BASE_URL']` 같은 동적 접근은 동일하게 처리되지 않으며 테스트 환경에 자동 정의된다고 가정하지 않는다.

## CSS와 CSS Modules

CSS는 현재 웹용이다. global CSS는 native에서 무시되므로 universal 화면의 style과 같다고 가정하지 않는다. Router에서는 root _layout.tsx에서 global CSS를 import해 의존성 CSS와 사용자 CSS 순서를 안정시킨다. `getDefaultConfig`의 `isCSSEnabled: false`로 끌 수 있다.

`.module.css`는 class 이름을 scope로 분리한다. DOM에는 className을 사용하고 React Native Web 컴포넌트에는 style을 사용한다. `unstable_styles`로 RN Web용 style을 가져올 수 있다. 플랫폼 확장자는 `App.module.ios.css` 형태이며 `App.ios.module.css`와 다르다. native CSS Modules 지원은 아직 완성된 기능이 아니다.

## 후처리와 지원 범위

PostCSS는 postcss.config.json 또는 .js로 구성한다. JSON 구성은 cache에 유리하다. browserslist는 package.json에서 목표 브라우저를 지정하며 현재 Expo CLI의 내장 CSS prefix 처리를 사용한다. CSS Modules 절에 남은 autoprefixer 안내와 중복되므로 무조건 plugin을 추가하지 않는다.

PostCSS/browserslist 변경 뒤 `expo start --clear` 또는 `expo export --clear`로 cache를 비운다. SASS/SCSS는 sass 설치 후 제한적으로 지원한다. 확장자 없는 탐색은 scss/sass/css 순서이며 sass/scss 내부의 다른 파일 import는 현재 지원하지 않는다.

일반 Tailwind CSS는 웹용이다. native까지 같은 사용 방식을 원하면 NativeWind/Uniwind 등 별도 라이브러리의 지원 범위와 설정을 확인한다. CSS 파일이 bundler에서 읽힌다는 사실과 native 렌더러에서 표현된다는 사실을 구분한다.

## 출처

- [Expo Documentation, metro.config.js](https://docs.expo.dev/versions/latest/config/metro)

## 관련 문서

- [[Expo-Configuration-Reference]]

- [[Expo]]
