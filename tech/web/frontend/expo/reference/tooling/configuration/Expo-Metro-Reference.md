---
tags: [expo, react-native, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Metro 설정과 모듈 해석"]
---

# Expo Metro 설정과 모듈 해석

## 기본 구성

Expo의 Metro 설정은 `expo/metro-config`의 `getDefaultConfig(__dirname)`를 확장한다. resolver와 transformer를 통째로 바꾸면 웹, 서버, alias와 플랫폼 구분 기능을 잃을 수 있다.

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.resolveRequest = (context, name, platform) => {
  if (platform === 'web' && name === 'native-only-feature') {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, name, platform);
};
module.exports = config;
```

예제는 특정 웹 import를 빈 모듈로 바꾼다. 실제 호출부가 그 모듈의 값을 필요로 하면 실패하므로 플랫폼 경계를 함께 설계한다. 해결하지 못한 import는 원래 resolver로 넘긴다. import 재지정만 필요하면 캐시가 복잡한 소스 변환보다 resolver를 먼저 사용한다.

## Transformer

커스텀 transformer는 `@expo/metro-config/babel-transformer`를 upstream으로 사용한다. Babel caller의 `platform`, `engine`, `isServer`, `isDev` 등은 플랫폼/엔진/서버별 변환에 쓰인다. caller에 따라 설정이 달라지면 하나의 영구 캐시 값으로 고정하지 않는다. `babel-preset-expo`를 유지하고 변환 설정 변경 뒤 `--clear`로 확인한다.

Metro는 직접적인 virtual module을 지원하지 않는다. 필요하면 node_modules/.cache 등에 실제 파일을 생성하고 resolver를 그 파일로 연결할 수 있다. 파일 생성과 캐시 수명까지 직접 책임지는 우회 방식이다.

## ES module과 package exports

`import`와 `require`는 exports map의 서로 다른 condition을 선택할 수 있다. native에는 react-native, 웹에는 browser, 서버에는 node/react-server/workerd 등의 조건이 적용된다. 우선순위는 단순히 조건 이름 목록 순서가 아니라 package.json exports의 property 순서에 영향을 받는다.

TypeScript도 exports를 독립적으로 해석한다. `moduleResolution: bundler`가 Metro에 가깝고 node16/nodenext도 map을 사용한다. types condition을 적절한 앞 순서에 둬야 타입과 runtime 해석이 어긋나지 않는다.

문제가 있는 패키지는 exports를 수정하거나 patch하는 방법을 먼저 검토한다. `resolver.unstable_enablePackageExports = false`로 전체 해석을 되돌리는 것은 영향 범위가 더 크다. 단일 import 오류 해결과 프로젝트 전체의 exports 해제는 구분한다.

## 파일 탐색과 Node built-in

On-demand filesystem은 watchFolders 밖 파일과 symlink도 요청 시 읽을 수 있게 한다. SDK 57 reference에서는 기본 활성화이며 `experiments.onDemandFilesystem: false`로 끈다. watcher 범위를 줄이면 시작 비용과 파일 변경 감시 범위가 바뀌므로 import 성공만 보고 hot reload까지 확인했다고 판단하지 않는다.

서버 bundle에서는 Node built-in을 external로 처리한다. 브라우저에서는 로컬 설치된 대응 모듈을 찾고 없으면 빈 shim으로 대체할 수 있다. fs 등 서버 기능이 브라우저에서도 실행된다는 뜻은 아니다.

환경 변수, CSS와 export 동작은 [[Expo-Metro-CSS-Environment]], [[Expo-Metro-Bundles-Assets]]에서 이어진다.

## 출처

- [Expo Documentation, metro.config.js](https://docs.expo.dev/versions/latest/config/metro)

## 관련 문서

- [[Expo-Configuration-Reference]]

- [[Expo]]
