---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Metro 확장과 module resolution"]
---

# Expo Metro 확장과 module resolution

## 기본 config 유지

Expo start/export는 Metro로 JS와 asset을 bundle한다. root `metro.config.js`는 `expo/metro-config`를 확장한다. 직접 `@expo/metro-config`를 import하는 것보다 설치된 Expo 버전의 진입점을 사용해 일관성을 유지한다.

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('db');
module.exports = config;
```

`expo customize metro.config.js`로 template를 생성할 수 있다. Expo가 보호하는 upstream option은 임의 변경할 수 없으며 YAML config와 repository 밖 config는 지원하지 않는다.

## source와 asset

sourceExts는 변환할 JS/TS/JSON 등의 확장자, assetExts는 image/font/database 등 변환하지 않을 자원이다. extension은 앞의 점 없이 지정하며 같은 파일을 source와 asset 양쪽에 넣지 않는다. transformer 추가가 필요한 SVG 등은 해당 실제 변환 계약을 대조한다.

## custom resolver alias

```js
config.resolver.resolveRequest = (context, name, platform) => {
  const alias = platform === 'web' && name === 'old-package' ? 'new-package' : name;
  return context.resolveRequest(context, alias, platform);
};
```

alias 처리 뒤 default resolver를 호출해 기본 platform/package 해석을 보존한다. multi-platform bundle을 하나의 Babel string 치환으로 처리하지 않는다. resolver 변경은 dev server 재시작 뒤 반영되며 resolution 자체는 cache하지 않아 clear가 필요 없다. Babel transform alias를 바꿨다면 transform cache를 비워야 한다.

## filesystem과 분할

SDK56부터 on-demand filesystem이 기본 활성화이며 모든 module을 watchFolders에 수동 등록할 필요가 없다. project 밖 symlink dependency도 해석한다. `experiments.onDemandFilesystem`로 동작을 제어한다.

web async import는 bundle splitting을 제공하고 Router async route는 현재 화면의 code부터 load한다. native에 web의 runtime chunk load 계약을 그대로 적용하지 않는다. tree shaking/minification은 production optimization이며 별도 설정과 제한을 확인한다.

## web 파일과 TypeScript

`web.bundler:"metro"`, `expo start --web` 또는 W로 web을 실행한다. `public/` 파일은 dev host에서 제공하고 export 시 dist로 복사한다. single output의 public/index.html로 기본 HTML을 대체할 수 있다. `/assets` 등 reserved path는 피한다. public 파일이 native OTA service까지 동일하게 지원된다고 가정하지 않는다.

tsconfig/jsconfig의 paths/baseUrl alias를 지원한다. 기존 native project는 Expo bundling setup도 필요하다. CSS/PostCSS와 web을 위해 deprecated webpack adapter를 새 기본값으로 도입하지 않는다.

## 출처

- [Expo Documentation, Metro bundler](https://docs.expo.dev/guides/customizing-metro)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
