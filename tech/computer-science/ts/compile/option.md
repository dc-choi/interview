---
tags: [cs, typescript]
status: done
category: "CS - TypeScript"
aliases: ["컴파일러 옵션", "option"]
verified_at: 2026-09-27
---

# 컴파일러 옵션

`tsconfig.json`은 프로젝트에 포함할 파일과 타입 검사, 모듈 해석, emit 방식을 정의한다. `include`, `exclude`, `files`는 입력 파일 집합을 정하고 `compilerOptions`는 컴파일 동작을 정한다.

## 입력 파일 집합

- `files`는 포함할 파일을 명시적으로 열거한다.
- `include`는 config 위치를 기준으로 glob 패턴을 적용한다.
- `exclude`는 `include`가 찾는 결과만 거른다. import, `types`, `files`로 참조된 파일까지 프로젝트에서 차단하는 옵션은 아니다.
- `extends`로 상속할 때 자식 config의 `files`, `include`, `exclude`는 base 값과 합쳐지지 않고 덮어쓴다.

`rootDir`는 입력을 선택하지 않는다. emit 시 소스 디렉터리 구조를 `outDir` 아래에 어떻게 보존할지 정하고, emit 대상 파일이 `rootDir` 밖에 있으면 오류가 날 수 있다.

## 주요 `compilerOptions`

| 옵션 | 역할 |
|---|---|
| `target` | emit할 ECMAScript 문법 수준 |
| `module` | emit과 해석에 사용할 모듈 체계 |
| `moduleResolution` | import specifier를 실제 파일로 찾는 규칙 |
| `outDir` | emit 결과 디렉터리 |
| `rootDir` | 출력 디렉터리 구조를 계산할 소스 기준점 |
| `strict` | 엄격한 타입 검사 묶음 활성화 |
| `noEmit` | 출력 없이 타입 검사만 수행 |
| `noEmitOnError` | 오류가 있으면 emit하지 않음. 기본값은 `false` |
| `sourceMap` | emit된 JavaScript와 원본 TypeScript 위치를 연결하는 map 생성 |
| `allowJs`, `checkJs` | JavaScript를 프로젝트에 포함하고 선택적으로 타입 오류 보고 |

`target`, `module`, `moduleResolution`은 실행 환경과 bundler에 맞춰 함께 결정한다. 최신 문법을 쓴다는 이유만으로 최신 `target`이 항상 맞는 것은 아니며, 실제 런타임 지원 범위를 기준으로 고른다.

## `target`과 `lib`는 다른 축

`target`은 어떤 JavaScript 문법 수준으로 emit할지를 정한다. `lib`는 타입 검사에서 사용할 런타임 API 선언 묶음을 정한다. `ES2023.Array` 선언을 추가한다고 오래된 런타임에 해당 API가 생기지는 않으므로 polyfill 또는 런타임 지원 여부를 별도로 확인한다.

브라우저 전역이 없는 서버 프로젝트에서는 `DOM`을 관성적으로 포함하지 않는다. 반대로 브라우저 앱은 필요한 ECMAScript와 DOM 선언을 함께 고른다.

## `paths`와 실제 모듈 해석

`paths`는 TypeScript가 import를 타입 검사할 때 찾는 후보를 알려 주지만 emit된 import specifier를 다시 쓰지 않는다.

```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["./src/*"]
    }
  }
}
```

Node, bundler, test runner도 같은 별칭을 이해하도록 각각 설정하거나 package import maps처럼 런타임이 직접 지원하는 계약을 사용해야 한다. `tsconfig-paths`는 런타임 hook, bundler alias와 loader는 빌드 경로이므로 TypeScript 설정만으로 해결됐다고 보지 않는다.

TypeScript 7.0에서는 `baseUrl`이 제거되어 `paths` 대상이 config 파일을 기준으로 해석된다. 이전 프로젝트는 `baseUrl` 의존을 없애고 실행 도구의 해석 규칙도 함께 점검한다.

## `extends`로 config 합성하기

```json
{
  "extends": "@tsconfig/node24/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"]
}
```

상대 경로 옵션은 그 옵션이 처음 선언된 config 파일을 기준으로 해석된다. package의 공유 config를 상속할 수 있지만, 실행 도구가 다른 config를 자동 선택하거나 command-line option으로 덮어쓸 수 있으므로 실제 사용 config를 `tsc --showConfig`로 확인한다.

## TypeScript 7.0 전환

TypeScript 7.0은 Go로 포팅한 네이티브 컴파일러이며 2026-07-08 공개됐다. 7.0은 6.0(2026-03-23)에서 바뀐 기본값을 그대로 따르므로 config에 적지 않은 옵션에는 `strict: true`, `module: esnext`, `noUncheckedSideEffectImports: true`, `rootDir: "./"`, `types: []` 등이 적용된다. 5.x config를 업그레이드할 때 기본값 변화가 진단, 타입 로딩과 출력 경로에 미치는 영향을 확인한다. 예를 들어 소스가 `src` 아래에만 있고 `outDir`만 둔 config는 5.x에서 `outDir/index.js`로 emit했지만, 6.0 이상에서는 `rootDir`를 명시하라는 TS5011 오류와 함께 `outDir/src/index.js`로 emit한다.

다음 과거 옵션과 emit 경로는 7.0에서 무시되는 호환 설정이 아니라 오류가 된다.

- `target: es5`, `downlevelIteration`
- `moduleResolution: node`, `node10`, `classic`
- `module`의 AMD, UMD, SystemJS, `none`
- `baseUrl`
- `esModuleInterop: false`, `allowSyntheticDefaultImports: false`
- `alwaysStrict: false`

6.0은 이 설정을 deprecation 오류(TS5101, TS5107 등)로 보고하고 `ignoreDeprecations: "6.0"`으로 끌 수 있다. 7.0에서는 이 옵션으로도 끌 수 없는 제거 오류가 되므로(예: `target: es5`는 TS5108) `ignoreDeprecations`는 전환 유예로만 쓰고 설정을 먼저 고친다.

7.0은 안정된 compiler API 없이 출시됐고(`typescript/unstable/*`에 실험 API만 있다), 새롭고 다른 API는 7.1에서 예고됐다. 7.0 `typescript` 패키지의 기본 진입점은 버전 정보만 내보내므로 ts-loader, typescript-eslint처럼 `typescript`를 import해 compiler API를 쓰는 도구는 `typescript`가 7.0으로 설치되면 동작하지 않는다(ts-loader 9.6.2는 `Cannot read properties of undefined` 오류로 실패). 2026-09 기준 7.1 nightly의 기본 진입점도 같다. 공식 안내대로 `"typescript": "npm:@typescript/typescript6@^6.0.2"` alias로 6.0 API를 제공하고, 7.0의 `tsc`는 `"@typescript/native": "npm:typescript@^7.0.2"` 같은 별도 alias로 함께 설치한다. language server, linter, transformer 호환성은 도구별로 점검한다.

## webpack과 ts-loader

ts-loader는 `tsconfig.json`에 따라 각 파일을 검사하고 변환한 JavaScript를 webpack에 넘긴다. 번들 위치는 webpack `output.path`가 정하므로 `outDir`를 바꿔도 번들 위치는 그대로다. ts-loader는 compiler API를 쓰므로 7.0에서는 위의 6.0 alias 구성이 필요하다. 6.0 이상에서 소스가 `src` 아래에만 있는 config에 `outDir`만 두면 위의 TS5011이 ts-loader 빌드 오류가 되어 production 모드는 번들을 쓰지 않으므로(`tsc --noEmit`은 통과한다), ts-loader용 config에서는 `outDir`를 지우거나 `rootDir`를 명시한다.

- `module: esnext`(또는 `preserve`)와 `moduleResolution: bundler`를 함께 적는다. 5.x에서 `module: es2015`(`es6`)만 두면 `classic` 해석이 적용되어 webpack처럼 자체 타입을 포함한 패키지의 import가 TS2792로 실패하고(`@types/*`로 타입을 받는 패키지는 찾는다), `@types/node` 안의 `undici-types` import도 같은 오류를 낸다(`tsc` 기준. ts-loader는 tsconfig에 값이 없으면 `skipLibCheck: true`로 실행하므로 이 선언 파일 오류는 보이지 않는다). `skipLibCheck`는 선언 파일의 오류만 가리고 소스의 import 실패는 남기므로 해석 전략부터 고친다. 6.0 이상은 같은 config를 `bundler`로 해석하지만(TSConfig 레퍼런스의 `moduleResolution` 기본값 항목은 2026-09 기준 아직 5.x 규칙인 `Classic otherwise`로 남아 있다) 버전마다 결과가 달라지지 않도록 값을 적는다.
- bundler 프로젝트에 권장되는 `noEmit`이나 `emitDeclarationOnly`는 bundler가 TypeScript를 직접 변환하고 `tsc`는 타입 검사와 선언 파일 출력만 맡는 구성을 전제로 한다. ts-loader가 `transpileOnly: false`(fork-ts-checker-webpack-plugin과 `happyPackMode`를 쓰지 않을 때의 기본값)로 동작하면 TypeScript의 JavaScript 출력을 받아 쓰므로 이 옵션을 켜면 `TypeScript emitted no output` 오류가 난다. `transpileOnly: true`에서는 파일별 `transpileModule`이 두 옵션을 무시하므로 오류 없이 번들링한다.
- 원본 TypeScript 위치로 디버깅하려면 `sourceMap: true`와 webpack `devtool`을 함께 켠다. `devtool`만 켜면 map의 원본이 변환된 JavaScript가 된다.
- `transpileOnly: true`는 빌드를 빠르게 하지만 타입 검사와 선언 파일 출력을 끈다. fork-ts-checker-webpack-plugin이나 별도 `tsc --noEmit`으로 검사를 되살린다.
- webpack `optimization.emitOnErrors` 기본값은 `development`에서 `true`, `production`에서 `false`다. 개발 모드에서는 타입 오류가 있어도 번들이 갱신되므로 성공 여부는 파일 생성이 아니라 webpack 종료 코드와 `tsc --noEmit` 결과로 판단한다. webpack 문서의 CLI 종료 코드 경고와 달리 webpack-cli 7.2.3은 컴파일 오류가 있으면 이 옵션과 관계없이 종료 코드 1로 끝난다. `--watch`처럼 종료하지 않는 모드에서는 출력된 오류로 판단한다.

## 스크립트와 모듈 감지

TypeScript 파일이 모두 전역 스크립트가 되는 것은 아니다. `moduleDetection`이 파일을 스크립트 또는 모듈로 판정하는 방식을 정한다.

- `auto`: 기본값. `import`/`export`를 보고, `module`이 `node16`/`nodenext`이면 `package.json`의 `type`, `jsx`가 `react-jsx`이면 JSX 파일 여부도 고려한다.
- `legacy`: `import`/`export` 문법만으로 판정하는 과거 방식이다.
- `force`: 선언 파일이 아닌 모든 파일을 모듈로 취급한다.

전역 이름 충돌을 피하려고 빈 `export {}`를 넣을 수 있지만, 프로젝트 전체가 모듈이어야 한다면 `force`가 의도를 더 직접적으로 표현한다.

## `skipLibCheck`는 임시 완화책

`skipLibCheck: true`는 모든 `.d.ts` 선언 파일의 타입 검사를 건너뛰어 검사 시간을 줄이거나 라이브러리 전환기의 충돌을 피한다. 애플리케이션 코드에서 사용하는 선언의 표면은 계속 확인하지만, 선언 파일 내부의 불일치는 놓칠 수 있어 정확성을 희생한다.

중복되거나 호환되지 않는 `@types` 버전이 원인이라면 먼저 lockfile, 의존성 중복, 라이브러리와 TypeScript 버전을 정리한다. 특정 `undici-types` 오류를 만났다는 이유만으로 이 옵션을 영구 기본값으로 켜지 않는다.

### strict 계열 세부 옵션
`strict: true` 하나가 아래 엄격 검사 묶음을 한 번에 켠다. 새 TypeScript 버전에서 `strict`가 활성화하는 검사가 늘 수 있으므로 업그레이드 시 릴리스 노트와 새 진단을 확인한다.

`alwaysStrict`를 제외한 아래 옵션의 기본값은 `strict`를 따르고, `strict`의 기본값은 5.x까지 `false`, 6.0부터 `true`다. 그래서 `strict` 없이 `noImplicitAny`만 켠 과거 예제 config도 6.0 이상에서는 초기화하지 않은 클래스 필드(TS2564)와 `find` 결과를 `string`에 바로 대입한 코드(TS2322)가 오류가 된다. `strict: false`로 되돌리기보다 필드 초기화와 `undefined` 처리를 코드에 반영한다.

- `noImplicitAny`: 타입을 추론하지 못해 암묵적으로 `any`가 되는 지점을 오류로 만든다.
- `strictNullChecks`: `null`, `undefined`를 모든 타입에 암묵 포함하지 않는다. 꺼져 있으면 컴파일 타임 타입과 런타임 값이 어긋나기 쉽다. 켜면 옵셔널 체이닝이나 가드로 명시적으로 다뤄야 한다.
- `strictPropertyInitialization`: 클래스 필드가 선언 시 또는 생성자에서 초기화되는지 검사한다(`strictNullChecks` 필요). 확정 할당 단언 `!`은 검사를 우회하므로 남발하지 않는다.
- `strictFunctionTypes`: 함수 타입의 매개변수를 반공변으로 검사한다. 메서드 선언은 일반적인 클래스와 인터페이스 계층 호환성을 위해 예외로 남는다.
- `strictBindCallApply`: `bind`, `call`, `apply` 인자 타입 검사.
- `noImplicitThis`: `this`가 암묵적 `any`가 되는 것을 막는다.
- `alwaysStrict`: 컴파일 결과에 `'use strict'`를 방출. 6.0부터는 `strict: false`여도 켜지고, `false` 설정은 6.0에서 deprecation 오류(TS5107), 7.0에서 제거 오류(TS5108)가 된다.
- `useUnknownInCatchVariables`, `strictBuiltinIteratorReturn`: `catch` 변수를 `unknown`으로, 내장 iterator의 반환 타입을 `any` 대신 `undefined`로 둔다.

### strict 묶음 밖이지만 함께 권장
- `noImplicitReturns`: 함수의 모든 코드 경로가 값을 반환하는지 확인한다. 일부 분기에서 반환을 빠뜨리는 실수를 막는다.
- `noUnusedLocals`, `noUnusedParameters`: 미사용 지역 변수, 매개변수 검출.
- `noFallthroughCasesInSwitch`: switch의 의도치 않은 fall-through 방지.
- `exactOptionalPropertyTypes`: 옵셔널 속성에 `undefined` 명시 대입을 구분.

## 보강 습관

- 공개 API와 긴 함수에는 반환 타입을 명시해 구현이 계약을 바꾸는 것을 잡는다.
- 기존 JavaScript 프로젝트는 `any`를 `unknown`, 타입 가드, 유니온으로 바꾸며 엄격도를 단계적으로 올린다.
- `ts-node`, `tsx`, bundler는 실행 도구이고 `tsconfig`의 모듈 설정과 호환되어야 한다. 특정 Node 버전에 대한 임시 실행법을 프로젝트의 일반 원칙으로 고정하지 않는다.

## 관련 문서
- [[타입스크립트(TS)|TS 개요]]
- [[타입특징|타입 특징 (any/unknown, 추론)]]
- [[TS-Type-Narrowing|Type Narrowing]]
- [[TS-JavaScript-Migration|JavaScript에서 TypeScript로 마이그레이션]]

## 출처
- [TypeScript TSConfig, moduleDetection](https://www.typescriptlang.org/tsconfig/moduleDetection.html)
- [TypeScript TSConfig, skipLibCheck](https://www.typescriptlang.org/tsconfig/skipLibCheck.html)
- [TypeScript TSConfig, strict](https://www.typescriptlang.org/tsconfig/strict.html)
- [TypeScript TSConfig, noImplicitAny](https://www.typescriptlang.org/tsconfig/noImplicitAny.html)
- [TypeScript TSConfig, moduleResolution](https://www.typescriptlang.org/tsconfig/#moduleResolution)
- [TypeScript Handbook, Choosing Compiler Options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [TypeScript TSConfig, noEmitOnError](https://www.typescriptlang.org/tsconfig/noEmitOnError.html)
- [TypeScript TSConfig, allowJs](https://www.typescriptlang.org/tsconfig/allowJs.html)
- [TypeScript TSConfig, checkJs](https://www.typescriptlang.org/tsconfig/checkJs.html)
- [TypeScript TSConfig, sourceMap](https://www.typescriptlang.org/tsconfig/sourceMap.html)
- [TypeScript TSConfig, include](https://www.typescriptlang.org/tsconfig/#include)
- [TypeScript TSConfig, exclude](https://www.typescriptlang.org/tsconfig/#exclude)
- [TypeScript TSConfig, rootDir](https://www.typescriptlang.org/tsconfig/rootDir.html)
- [TypeScript TSConfig, target](https://www.typescriptlang.org/tsconfig/target.html)
- [TypeScript TSConfig, lib](https://www.typescriptlang.org/tsconfig/lib.html)
- [TypeScript TSConfig, paths](https://www.typescriptlang.org/tsconfig/paths.html)
- [TypeScript TSConfig, extends](https://www.typescriptlang.org/tsconfig/extends.html)
- [TypeScript 6.0 발표](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
- [TypeScript 6.0 기본값 변경 PR #62669](https://github.com/microsoft/TypeScript/pull/62669)
- [TypeScript 7.0 발표](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [webpack, TypeScript guide](https://webpack.js.org/guides/typescript/)
- [webpack, optimization.emitOnErrors](https://webpack.js.org/configuration/optimization/#optimizationemitonerrors)
- [ts-loader README](https://github.com/TypeStrong/ts-loader/blob/main/README.md)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 2. 실습환경 구성](https://www.youtube.com/watch?v=g5dRKsBmlpM)
- yongsoocho, [include와 exclude](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136792)
- yongsoocho, [outDir와 rootDir](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136793)
- yongsoocho, [target과 lib](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136794)
- yongsoocho, [baseUrl과 paths](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136795)
- yongsoocho, [tsconfig-paths로 paths 해석하기](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136796)
- yongsoocho, [webpack으로 paths 해석하기](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136797)
- yongsoocho, [ts-loader 도입](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136799)
- yongsoocho, [extends](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=136800)
- [타입스크립트 컴파일러 옵션 설정하기, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=154362)
- [undici-types 관련 오류가 발생한다면, 이정환 Winterlood](https://www.inflearn.com/courses/lecture?courseId=330452&unitId=206093)
