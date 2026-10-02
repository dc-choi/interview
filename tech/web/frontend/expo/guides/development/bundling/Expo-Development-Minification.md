---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo minifier 선택과 로그 제거"]
---

# Expo minifier 선택과 로그 제거

## minification의 역할

production export/export:embed와 native build의 JS 처리에서 공백/주석, 상수 연산과 dead branch를 줄인다. comment는 `@preserve`로 보존할 수 있다. 기본 pipeline으로 충분하면 custom minifier를 추가하지 않는다.

## Terser 설정 경계

web Terser customization은 Metro transformer에 전달한다.

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.transformer.minifierConfig = {
  compress: { drop_console: ['log', 'info'] },
};
module.exports = config;
```

`drop_console:true`는 모든 console 호출을 제거하고 array는 지정한 method만 제거한다. warn/error를 보존할지는 운영 logging 방식과 연결해 결정한다. console 인자의 평가 부작용에 의존하는 코드를 만들지 않는다.

`transformer.minifierPath:'metro-minify-terser'`와 minifierConfig로 Terser wrapper/options를 지정할 수 있다. SDK57의 native Hermes bytecode 경로는 web Terser JS minification과 다르므로 이 설정이 native 최종 bytecode를 같은 방식으로 제어한다고 가정하지 않는다.

## 대안과 unsafe 옵션

esbuild wrapper는 minification 속도 대안이며 출력 크기와 engine compatibility를 실측한다. Uglify wrapper는 프로젝트 Metro 버전과 맞아야 하며 legacy option을 새 기본 권장으로 삼지 않는다.

Terser의 unsafe/unsafe_math/unsafe_proto/unsafe_regexp 등의 option은 JS engine과 의미 보존에 관한 추가 가정을 허용한다. 단순 bundle 감소를 위해 전부 활성화하지 않는다. production export 후 실제 native/web runtime의 숫자 연산, property 접근과 library 초기화를 확인한다.

## 출처

- [Expo Documentation, Minifying JavaScript](https://docs.expo.dev/guides/minify)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
