---
tags: [expo, expo-integrations, tooling]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo TypeScript, ESLint와 Prettier"]
---

# Expo TypeScript, ESLint와 Prettier

Expo template은 TypeScript와 기본 navigation/config를 포함한다. TypeScript는 compile-time 검사, ESLint는 오류 패턴, Prettier는 format을 관리하며 어떤 도구도 실제 native runtime을 대신 검증하지 않는다.

## TypeScript 설정과 import resolution

JSX file은 tsx, JSX 없는 file은 ts로 바꾸고 typescript/@types/react dev dependency와 tsconfig가 expo/tsconfig.base를 extends하도록 설정한다. strict=true로 nullable/implicit any 등을 검사한다. CLI의 `npm run tsc` 예제는 tsc script가 있어야 하며 없는 기본 script를 자동 생성한다고 이해하지 않는다. tsc --noEmit 같은 type check를 project script에 연결해 사용한다.

```json
{ "extends":"expo/tsconfig.base", "compilerOptions":{
  "strict":true, "baseUrl":".", "paths":{"@/*":["src/*"]}
} }
```

Metro는 tsconfigPaths 기본 true로 alias를 읽고 false로 끌 수 있다. alias/baseUrl 변경 뒤 Expo CLI를 restart하지만 alias만 바뀌면 Metro cache clear가 필수는 아니다. JS project도 jsconfig를 쓸 수 있다. paths는 baseUrl이 있으면 그 기준, 없으면 project root 기준이다. baseUrl은 node_modules보다 먼저 resolve하므로 path.ts 같은 이름이 package를 가릴 수 있다. deprecated Webpack config에는 이 Metro resolution을 적용하지 않는다.

metro.config.js에서 require('tsx/cjs') 후 metro.config.ts를 require하면 TS configuration module을 읽을 수 있다. app.config.ts는 기본 지원하지만 외부 TS module/tsconfig customization에는 tsx hook이 필요하다. type generation은 library별 build/customize 흐름으로 만든다. decorators 같은 language feature는 compiler option과 bundler 지원을 함께 확인한다.

## Flat ESLint와 환경별 globals

SDK53 이후 기본 eslint.config.js는 Flat config며 older legacy도 지원한다. expo lint 최초는 dependency/config를 생성하고 이후 package lint script를 실행한다. metro/babel/app config와 +html은 Node, app route는 Hermes/Node/browser에서도 평가될 수 있어 environment global을 file별로 지정한다.

```js
const { defineConfig, globalIgnores } = require('eslint/config');
const globals = require('globals');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  globalIgnores(['dist/**']), expoConfig,
  { files:['babel.config.js'], languageOptions:{globals:globals.node} }
]);
```

원문 Flat globals 예제는 globals import가 빠져 있어 위처럼 추가한다. Node CJS __dirname을 재선언하거나 import/module.exports를 무분별하게 혼합하는 예제도 실제 config module format에 맞춰 정리한다. legacy는 eslint-env node comment를 사용하지만 Flat에서는 languageOptions를 사용한다.

## Prettier와 migration

prettier/eslint-config-prettier/eslint-plugin-prettier를 dev dependency로 설치하고 Flat은 eslint-plugin-prettier/recommended를 expo config 뒤 적용한다. legacy는 extends expo/prettier, prettier plugin과 prettier/prettier rule(error 또는 warn)을 구성한다. .prettierrc는 formatter preference다. Windows Expo install의 `"--" --dev` argument forwarding 예제를 shell에 맞춰 사용한다.

uncustomized legacy config는 new config로 생성할 수 있지만 custom rule은 ESLint migration에 맞춰 옮긴다. 느린 lint는 generated/node_modules 등을 ignore한다. 원문의 .eslintignore 권장은 legacy 전용이며 Flat config는 globalIgnores/ignores를 사용한다. VS Code stale diagnostic은 ESLint extension/server restart로 확인한다. 이 문서 작업에서는 package 설치나 lint를 실행하지 않았다.

## 출처

- [Expo Documentation, Using ESLint and Prettier](https://docs.expo.dev/guides/using-eslint)
- [Expo Documentation, Using TypeScript](https://docs.expo.dev/guides/typescript)

## 관련 문서

- [[Expo-Router-Typed-Routes]]
- [[Expo-Integrations-Bun-Hermes]]
- [[Expo-Integrations-Troubleshooting]]
