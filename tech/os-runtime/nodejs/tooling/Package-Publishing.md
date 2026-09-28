---
tags: [runtime, nodejs]
status: note
verified_at: 2026-09-28
category: "OS & Runtime"
aliases: ["패키지 배포"]
---

# 패키지 배포 (Package Publishing)

## 배포 전략 개요

| 전략 | `type` 필드 | 진입점 | 적합 대상 |
|------|------------|--------|---------|
| CJS 전용 | 생략 또는 `"commonjs"` | `"main": "index.js"` | 레거시 호환 필요 |
| ESM 전용 | `"module"` | `"main": "index.js"` | CJS 소비자도 `require(esm)` 지원 Node.js에서 실행될 때 |
| ESM + `module-sync` 폴백 | `"module"` | `module-sync`에 ESM, `default`에 CJS 빌드 | `require(esm)`이 없는 Node.js도 지원 |
| CJS + ESM 듀얼 | `"commonjs"` | `import`, `require` 조건부 | 상태가 없거나 격리됐고 클래스 identity를 공유할 필요가 없는 패키지 |
| ESM 래퍼 | `"commonjs"` | CJS 코어 + ESM 래퍼 | `require(esm)` 이전 방식의 점진적 전환 |

Node.js는 20.x에서 v20.19.0, 22.x에서 v22.12.0, 23 이후는 v23.0.0부터 top-level `await`가 없는 ESM을 플래그 없이 `require()`로 불러온다(`require(esm)`, 2026-09-28 Node.js 문서 기준). 이 범위만 지원하면 ESM 전용 배포 하나로 `import`와 `require()` 소비자가 같은 모듈 인스턴스를 받는다. 두 빌드를 나누는 방식의 위험과 선택 기준은 [[Module-System-ESM#듀얼 패키지 위험 (Dual-Package Hazard)|듀얼 패키지 위험]] 참조.

## CJS 전용 배포
```json
{
  "name": "my-package",
  "type": "commonjs",
  "main": "index.js"
}
```

## ESM 전용 배포
```json
{
  "name": "my-package",
  "type": "module",
  "main": "index.js"
}
```
- `.js` 파일이 ESM으로 해석됨
- CJS가 필요한 경우 `.cjs` 확장자 사용
- `require(esm)` 지원 범위만 받으려면 `"engines": { "node": "^20.19.0 || >=22.12.0" }`로 밝힌다

## CJS + ESM 듀얼 배포

### module-sync 폴백
```json
{
  "name": "my-package",
  "type": "module",
  "exports": {
    ".": {
      "module-sync": "./index.js",
      "default": "./dist/index.cjs"
    }
  }
}
```
- `module-sync`를 인식하는 Node.js(기본 설정에서 20.x는 v20.19.0, 22.x는 v22.12.0, 23 이후는 v23.0.0부터)는 `import`와 `require()` 모두 ESM 빌드를, 인식하지 않는 Node.js는 모두 CJS 빌드를 받아 인스턴스가 하나로 유지된다(Node.js 18.20, 20.19, 22.11, 26.7 확인)

### exports 조건부 설정
`import`와 `require`가 서로 다른 빌드를 가리키므로 한 애플리케이션에서 두 인스턴스가 함께 로드될 수 있다.
```json
{
  "name": "my-package",
  "type": "commonjs",
  "exports": {
    ".": {
      "import": "./esm/index.mjs",
      "require": "./cjs/index.js",
      "default": "./cjs/index.js"
    },
    "./utils": {
      "import": "./esm/utils.mjs",
      "require": "./cjs/utils.js"
    }
  }
}
```

### ESM 래퍼 패턴
CJS에서 구현하고, ESM은 얇은 래퍼만 제공하는 방식. 두 경로가 같은 CJS 인스턴스를 공유해 듀얼 패키지 위험을 피한다. `require(esm)` 이전의 완화책이므로 새 패키지는 ESM 전용이나 `module-sync` 폴백을 먼저 검토한다.
```js
// esm/index.mjs (위 exports의 import 대상)
import cjsModule from '../cjs/index.js';
export const { method1, method2 } = cjsModule;
export default cjsModule;
```

### 조건부 exports 키워드

| 조건 | 설명 |
|------|------|
| `node` | Node.js 환경 |
| `import` | `import`, `import()`와 `import.meta.resolve()` 같은 ESM 로더의 해석 |
| `require` | `require()`로 로드될 때 |
| `module-sync` | `import`, `import()`, `require()` 모두. `require(esm)`이 켜져 있을 때만 인식 |
| `default` | 항상 매칭되는 폴백. 마지막에 둔다 |

`node-addons`를 포함한 전체 조건과 키 순서 규칙은 [[Module-System-ESM#package.json exports 필드|package.json exports 필드]] 참조.

### 서브경로 패턴
```json
{
  "exports": {
    ".": "./index.js",
    "./lib/*": "./lib/*.js",
    "./package.json": "./package.json"
  }
}
```

## 파일 확장자 규칙

| 확장자 | `"type": "module"` 없을 때 | `"type": "module"` 있을 때 |
|--------|-------------------------|-------------------------|
| `.js` | CJS (`type` 필드가 없으면 아래 문법 감지 적용) | ESM |
| `.mjs` | ESM (항상) | ESM (항상) |
| `.cjs` | CJS (항상) | CJS (항상) |

`"type": "commonjs"`면 `.js`는 CJS다. package.json이 없거나 `type` 필드가 없는 `.js`는 먼저 CJS로 실행하고, `import`, `export` 문이나 `import.meta`처럼 CJS로 평가하면 오류가 나는 ES 모듈 문법이 있으면 ESM으로 다시 실행한다. 이 문법 감지는 20.x에서 v20.19.0, 22.x에서 v22.7.0, 23 이후는 v23.0.0부터 기본으로 켜지고 `--no-experimental-detect-module`로 끌 수 있다(2026-09-28 Node.js 문서 기준, Node.js 20.18.3, 20.19.0, 21.7.3, 22.6.0, 22.7.0, 23.0.0, 26.7 확인). 재해석 비용이 들므로 Node.js 문서는 모든 소스가 CJS인 패키지에도 `type` 필드를 명시하라고 권한다.

## 배포 워크플로

### 배포 전 확인
```bash
npm publish --dry-run    # 포함될 파일 목록 미리 확인
npm pack                 # 로컬에서 .tgz 생성하여 검증
npm pack --dry-run       # 패킹될 파일만 확인
```

### files 필드 (허용 목록)
```json
{
  "files": [
    "lib/",
    "esm/",
    "index.js",
    "index.mjs",
    "README.md"
  ]
}
```
- `files` 미지정 시 `.npmignore` 또는 `.gitignore` 기반으로 결정
- `files` 지정 시 허용 목록 방식으로 동작 (더 안전)

## dist-tags와 버전 관리

### dist-tag 기본 개념
```bash
npm publish                    # 자동으로 latest 태그
npm publish --tag beta         # beta 태그로 배포
npm publish --tag next         # next 태그로 배포

npm dist-tag ls my-package     # 태그 목록 확인
npm dist-tag add my-package@2.0.0 latest  # 태그 수동 변경
```

### 사용자 설치 시
```bash
npm install my-package          # latest 태그 (기본)
npm install my-package@beta     # beta 태그
npm install my-package@2.0.0    # 정확한 버전
```

## Node-API 모듈 배포
```
Node-API(구 N-API)를 사용하는 네이티브 애드온은 한 메이저 버전용으로 빌드한 바이너리를 이후 Node.js 메이저 버전에서 재컴파일 없이 쓸 수 있다.
다만 해당 애드온이 Node-API만 사용하고 외부 네이티브 라이브러리와 대상 OS, 아키텍처가 호환될 때의 보장이다.
배포 시 dist-tag를 활용하여 Node-API 버전과 일반 버전을 분리할 수 있다.
```

```bash
# Node-API 버전 배포
npm publish --tag n-api

# 사용자 설치
npm install my-native-addon@n-api
```

## 출처
- [Node.js, Modules: Packages, Conditional exports](https://nodejs.org/api/packages.html#conditional-exports)
- [Node.js, Modules: Packages, Determining module system](https://nodejs.org/api/packages.html#determining-module-system)
- [Node.js, Modules: Packages, Syntax detection](https://nodejs.org/api/packages.html#syntax-detection)
- [Node.js, Command-line API, --no-experimental-detect-module](https://nodejs.org/api/cli.html#--no-experimental-detect-module)
- [Node.js, Node-API, Implications of ABI stability](https://nodejs.org/api/n-api.html#implications-of-abi-stability)
- [Node.js, Modules: CommonJS modules, Loading ECMAScript modules using require()](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)
- [Shipping ESM for CommonJS consumers — Node.js package-examples](https://github.com/nodejs/package-examples/blob/main/guide/04-cjs-esm-interop/shipping-esm-for-cjs/README.md)
- [Dual CommonJS/ESM package distributions — Node.js package-examples](https://github.com/nodejs/package-examples/blob/main/guide/07-dual-packages/README.md)

## 관련 문서
- [[Module-System-ESM|ESM 모듈 시스템]]
- [[Module-System|모듈 시스템]]
- [[Node.js]]
- [[Dependency-Selection|의존성 선택]]
