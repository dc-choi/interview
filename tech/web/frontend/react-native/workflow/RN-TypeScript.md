---
tags: [react-native, workflow]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["React Native TypeScript 개발 흐름"]
---

# React Native TypeScript 개발 흐름

React Native 0.87 문서 기준이다. 예시는 설명용이며 이 문서 작성에서 네이티브 빌드나 기기 실행을 검증하지 않았다.

## 기본 언어와 빌드 역할

새 React Native 프로젝트는 TypeScript를 기본 대상으로 하지만 JavaScript와 Flow도 지원한다. CLI나 Ignite 등의 template은 TypeScript를 기본 구성하고 Expo는 template 선택 또는 `.ts`/`.tsx` 파일 추가 시 필요한 설정을 안내한다.

Babel이 번들링 중 TypeScript 소스를 변환한다. **TypeScript compiler는 type-check 용도로 사용하는 것이 권장 흐름**이다. 타입 검증이 통과했다고 native build나 bundle 동작까지 검증된 것은 아니다.

## 기존 프로젝트에 추가

```sh
npm install -D typescript @react-native/typescript-config @types/jest @types/react @types/react-test-renderer
```

가이드 명령은 각 의존성의 최신 버전을 설치하므로 기존 React, Jest와 test renderer에 맞는 조합을 확인한다. Upgrade Helper에서 해당 RN 버전의 template dependency를 비교할 수 있다.

```json
{
  "extends": "@react-native/typescript-config"
}
```

root의 tsconfig.json을 작성하고 JSX를 포함하는 JS 파일을 `.tsx`로 바꾼다. production bundling 문제가 생기지 않도록 **루트 index.js entrypoint는 그대로 유지한다**.

```sh
npx tsc
# 또는 yarn tsc
```

`.jsx`는 JavaScript로 처리하며 TypeScript와 같은 type-check를 하지 않는다. JavaScript와 TypeScript module은 서로 import할 수 있으므로 파일별 점진 전환이 가능하다.

## props와 state typing

```tsx
import {useState} from 'react';
import {Button, Text, View} from 'react-native';

interface HelloProps {
  readonly name: string;
  readonly baseLevel?: number;
}

const Hello = ({name, baseLevel = 0}: HelloProps) => {
  const [level, setLevel] = useState(baseLevel);
  return (
    <View>
      <Text>{name}{'!'.repeat(Math.max(0, level))}</Text>
      <Button title="증가" onPress={() => setLevel(level + 1)} />
      <Button title="감소" onPress={() => setLevel(Math.max(0, level - 1))} />
    </View>
  );
};
```

props interface는 JSX 호출을 검사하고 state는 초기값에서 타입을 추론한다. 클래스 컴포넌트에서는 `React.Component<Props, State>`로 같은 입력/상태 계약을 표현할 수 있다. 관련 React/TypeScript 타입 설명은 기존 문서를 이어서 사용한다.

## path alias는 두 해석기를 맞춘다

TypeScript의 `paths`만 추가하면 타입 분석이 성공해도 Babel/runtime resolution이 같은 이름을 찾지 못할 수 있다. 가이드는 `babel-plugin-module-resolver`를 사용해 tsconfig와 babel.config.js에 대응하는 alias를 구성한다.

```json
{
  "extends": "@react-native/typescript-config",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {"@components/*": ["src/components/*"]}
  }
}
```

```js
module.exports = {
  // 기존 프로젝트의 Babel preset은 유지한다.
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
      alias: {'@components': './src/components'},
    }],
  ],
};
```

이 조각은 plugin 설정의 예시이므로 기존 Babel 설정에 병합한다. 페이지에 남아 있는 `module:metro-react-native-babel-preset`은 과거 예제 preset이다. 새 프로젝트의 preset을 해당 문자열로 교체하지 말고 사용 버전 template을 유지한다. alias 변경 후 tsc와 실제 bundling을 각각 확인한다.

0.87의 public API 타입 계약과 ref 변경은 Strict TypeScript API 문서를 추가로 따른다.

## 출처

- [React Native, Typescript](https://reactnative.dev/docs/typescript)

## 관련 문서

- [[TS-React-Type-Contracts]]
- [[RN-Strict-TypeScript-API]]
- [[RN-Metro]]
- [[RN-Platform-Code]]
