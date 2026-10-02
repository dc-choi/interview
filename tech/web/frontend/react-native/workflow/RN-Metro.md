---
tags: [react-native, workflow]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native Metro 설정"]
---

# React Native Metro 설정

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## Metro의 역할

Metro는 React Native의 JavaScript 코드와 에셋을 빌드한다. 프로젝트의 `metro.config.js`에서 설정을 변경한다. React Native 앱의 config는 `@react-native/metro-config` 또는 Expo의 `@expo/metro-config`를 확장해야 실행에 필요한 기본값을 유지할 수 있다.

## 기본 object export

```js
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {};
module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

object export는 권장 방식이다. Metro 내부 기본값 위에 설정이 병합된다. React Native 기본값까지 불러온 후 프로젝트에서 필요한 override만 적용한다. 일반적인 설정 변경 때문에 function export로 옮길 필요는 없다.

## function export의 책임

function을 export하면 Metro가 전달한 base config를 받고 **최종 설정을 직접 구성하는 책임**을 가진다. Metro가 내부 기본값을 자동으로 적용해 주는 형태가 아니므로 필요한 defaults를 명시적으로 병합한다.

```js
module.exports = baseConfig => {
  const defaults = mergeConfig(baseConfig, getDefaultConfig(__dirname));
  return mergeConfig(defaults, {
    resolver: {
      assetExts: defaults.resolver.assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...defaults.resolver.sourceExts, 'svg'],
    },
  });
};
```

이 예제는 SVG를 source extension 쪽으로 분류하는 설정 예다. 이 변경만으로 SVG를 React component로 변환하는 transformer까지 제공한다는 뜻은 아니다.

0.72.1부터 완전한 기본값을 읽기 위해 function export가 필수는 아니다. `getDefaultConfig(__dirname)`로 기본값을 읽어 object config를 병합할 수 있다.

## 확장자 override를 관리하기

기본값에 source extension을 추가할 수 있고, 현재 요구하는 확장자 목록을 config에 명시해 해당 파일을 source of truth로 삼을 수도 있다.

```js
const config = {
  resolver: {
    sourceExts: ['js', 'ts', 'tsx', 'svg'],
  },
};
```

직접 목록을 지정하면 포함하지 않은 확장자가 빠질 수 있으므로 예제 목록을 그대로 복사하기 전에 실제 프로젝트 파일 형식을 확인한다. 기본값을 확장할지 명시 목록을 유지할지는 누가 resolver의 전체 계약을 소유하는지에 따른다.

## 설정 변경 검증

선택한 config package, source/asset 분류와 transformer 역할을 구분한다. 개발 번들뿐 아니라 release 번들에서도 변경한 파일이 해석되는지 확인한다. 모든 설정 옵션은 Metro 공식 설정 문서를 추가로 확인하며 Expo 프로젝트에서는 Expo의 defaults를 유지한다.

## 출처

- [React Native, Metro](https://reactnative.dev/docs/metro)

## 관련 문서

- [[RN-TypeScript]]
- [[RN-Platform-Code]]
- [[RN-Device-Execution]]
